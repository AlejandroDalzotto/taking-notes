use std::ffi::OsString;
use std::path::Path;
use std::sync::Mutex;

/// Pending paths from every launch, not just cold startup. Events only notify
/// the frontend to drain this queue; they are not the source of truth.
#[derive(Default)]
pub struct CliFilePaths(Mutex<Vec<String>>);

impl CliFilePaths {
    pub fn enqueue(&self, paths: Vec<String>) -> bool {
        if paths.is_empty() {
            return false;
        }
        self.0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .extend(paths);
        true
    }

    pub fn take(&self) -> Vec<String> {
        std::mem::take(&mut *self.0.lock().unwrap_or_else(|e| e.into_inner()))
    }
}

/// Accept positional file paths, ignoring option tokens until `--`. There are
/// no value-taking application options. Do not canonicalize: a requested file
/// may not exist yet, and resolving symlinks would change its displayed name.
pub fn file_paths(args: impl IntoIterator<Item = OsString>, cwd: Option<&Path>) -> Vec<String> {
    let mut positional_only = false;
    args.into_iter()
        .skip(1) // executable
        .filter_map(|arg| {
            if !positional_only && arg == "--" {
                positional_only = true;
                return None;
            }
            if arg.is_empty() || (!positional_only && arg.to_string_lossy().starts_with('-')) {
                return None;
            }

            let path = Path::new(&arg);
            let resolved = if path.is_absolute() {
                path.to_path_buf()
            } else {
                let Some(cwd) = cwd.filter(|cwd| cwd.is_absolute()) else {
                    log::warn!("Ignoring relative launch path without an invoking cwd: {arg:?}");
                    return None;
                };
                cwd.join(path)
            };

            // In particular, don't guess a different drive's cwd on Windows
            // for ambiguous drive-relative paths such as `D:note.txt`.
            if !resolved.is_absolute() {
                log::warn!("Ignoring ambiguous launch path: {arg:?}");
                return None;
            }
            match resolved.into_os_string().into_string() {
                Ok(path) => Some(path),
                Err(path) => {
                    log::warn!(
                        "Ignoring launch path not representable in frontend UTF-8: {path:?}"
                    );
                    None
                }
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(args: &[&str], cwd: Option<&Path>) -> Vec<String> {
        file_paths(args.iter().map(OsString::from), cwd)
    }

    #[test]
    fn resolves_paths_and_filters_flags_without_requiring_files_to_exist() {
        let dir = tempfile::tempdir().unwrap();
        let absolute = dir.path().join("absolute.md");
        let paths = parse(
            &[
                "app",
                "--flag",
                "-x",
                "--option=value",
                "",
                "notes with spaces.txt",
                absolute.to_str().unwrap(),
                "../missing.md",
                "--",
                "-draft.txt",
                "--",
            ],
            Some(dir.path()),
        );
        assert_eq!(
            paths,
            vec![
                dir.path().join("notes with spaces.txt").to_str().unwrap(),
                absolute.to_str().unwrap(),
                dir.path().join("../missing.md").to_str().unwrap(),
                dir.path().join("-draft.txt").to_str().unwrap(),
                dir.path().join("--").to_str().unwrap(),
            ]
        );
    }

    #[test]
    fn second_launch_uses_its_own_cwd() {
        let first = tempfile::tempdir().unwrap();
        let second = tempfile::tempdir().unwrap();
        let queue = CliFilePaths::default();
        queue.enqueue(parse(&["app", "first.txt"], Some(first.path())));
        queue.enqueue(parse(&["app", "second.txt"], Some(second.path())));
        queue.enqueue(parse(&["app", "third.txt"], Some(second.path())));
        assert_eq!(
            queue.take(),
            vec![
                first.path().join("first.txt").to_str().unwrap(),
                second.path().join("second.txt").to_str().unwrap(),
                second.path().join("third.txt").to_str().unwrap(),
            ]
        );
        assert!(queue.take().is_empty());
        assert!(!queue.enqueue(Vec::new()));
        queue.enqueue(vec!["later.txt".into()]);
        assert_eq!(queue.take(), vec!["later.txt"]);
    }

    #[test]
    fn missing_cwd_does_not_resolve_against_the_running_instance() {
        let dir = tempfile::tempdir().unwrap();
        let absolute = dir.path().join("note.txt");
        assert_eq!(
            parse(&["app", "relative.txt", absolute.to_str().unwrap()], None),
            vec![absolute.to_str().unwrap()]
        );
        assert!(parse(&["app", "relative.txt"], Some(Path::new("relative-cwd"))).is_empty());
    }

    #[test]
    fn poisoned_queue_still_preserves_pending_paths() {
        let queue = std::sync::Arc::new(CliFilePaths::default());
        queue.enqueue(vec!["first".into()]);
        let worker_queue = queue.clone();
        let worker = std::thread::spawn(move || {
            let _guard = worker_queue.0.lock().unwrap();
            panic!("poison queue for regression test");
        });
        assert!(worker.join().is_err());
        assert!(queue.enqueue(vec!["second".into()]));
        assert_eq!(queue.take(), vec!["first", "second"]);
        assert!(queue.take().is_empty());
    }

    #[test]
    fn concurrent_enqueues_and_drains_do_not_lose_paths() {
        let queue = std::sync::Arc::new(CliFilePaths::default());
        let workers: Vec<_> = (0..16)
            .map(|i| {
                let queue = queue.clone();
                std::thread::spawn(move || queue.enqueue(vec![i.to_string()]))
            })
            .collect();
        let mut paths = queue.take();
        for worker in workers {
            assert!(worker.join().unwrap());
        }
        paths.extend(queue.take());
        paths.sort();
        let mut expected: Vec<_> = (0..16).map(|i| i.to_string()).collect();
        expected.sort();
        assert_eq!(paths, expected);
    }

    #[cfg(unix)]
    #[test]
    fn non_utf8_paths_are_not_silently_changed() {
        use std::os::unix::ffi::OsStringExt;
        let dir = tempfile::tempdir().unwrap();
        assert!(
            file_paths(
                [OsString::from("app"), OsString::from_vec(vec![0xff])],
                Some(dir.path())
            )
            .is_empty()
        );
    }

    #[cfg(windows)]
    #[test]
    fn accepts_rooted_windows_paths_but_not_another_drives_relative_path() {
        let paths = parse(
            &["app", r"\notes.txt", r"D:\notes.txt", r"D:relative.txt"],
            Some(Path::new(r"C:\invoker")),
        );
        assert_eq!(paths, vec![r"C:\notes.txt", r"D:\notes.txt"]);
    }
}
