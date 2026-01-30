import Link from "next/link";

export default function MenuBar() {
  const a = ({ text, url }: { text: string; url: string }) => {
    return (
      <Link
        href={url}
        className="text-neutral-50 cursor-pointer relative text-sm before:transition-transform hover:before:scale-100 before:origin-bottom-right hover:before:origin-bottom-left before:content-[''] before:bg-white before:scale-0 before:h-px before:left-0 before:absolute before:bottom-0 before:w-full"
      >
        {text}
      </Link>
    );
  };

  return (
    <div className="h-8 bg-transparent border-y border-neutral-800 px-2 select-none flex items-center gap-x-4">
      {a({ text: "file", url: "/" })}
      {a({ text: "edit", url: "/" })}
      {a({ text: "view", url: "/" })}
      {a({ text: "notes", url: "/list" })}
      {a({ text: "help", url: "/help" })}
    </div>
  );
}
