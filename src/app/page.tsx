import { IconHistory } from "@/components/Icons";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col grow pt-20 justify-center min-h-full max-h-full bg-white/[.02] rounded-xl px-14 relative">
      <IconHistory size={384} className="absolute -translate-x-1/2 -translate-y-1/2 fill-neutral-50/[0.03] -z-10 top-1/2 left-1/2" />
      <header>
        <h1 className="mb-5 text-3xl">Welcome home!</h1>
      </header>
      <section className="mb-5">
        <p><strong>Taking notes</strong> is an app that helps you to write your ideas with in an intuitive way.</p>
      </section>
      <Link
        target="_blank"
        className="text-sm font-light transition-colors hover:text-blue-500"
        href="https://github.com/AlejandroDalzotto"
      >
        Made by Alejandro
      </Link>
    </div>
  );
}
