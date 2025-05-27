import { useEffect, useState } from "react";

type AsyncResult<E, T> =
  | { error: E; data: null; loading: false }
  | { error: null; data: T; loading: false }
  | { error: null; data: null; loading: true };

export function useAsyncResult<E, T>(
  fn: () => Promise<[E, null] | [null, T]>,
  deps: any[] = []
): AsyncResult<E, T> {
  const [state, setState] = useState<AsyncResult<E, T>>({
    error: null,
    data: null,
    loading: true,
  });

  useEffect(() => {
    setState({ error: null, data: null, loading: true });
    fn().then(([error, data]) => {
      if (error) setState({ error, data: null, loading: false });
      else setState({ error: null, data: data as T, loading: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}