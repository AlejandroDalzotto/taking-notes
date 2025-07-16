import { IconHistory } from "@/components/Icons";

export default function Home() {
  return (
    <div className="flex flex-col grow pt-20 justify-center min-h-full max-h-full bg-white/[.02] rounded-xl px-14 relative">
      <IconHistory size={384} className="absolute -translate-x-1/2 -translate-y-1/2 fill-neutral-50/[0.03] -z-10 top-1/2 left-1/2" />
      <header>
        <h1 className="mb-5 text-3xl ">Welcome home!</h1>
      </header>
      <section>
        <p><span className="underline">Taking notes</span> is an app that helps you to write your ideas with in an intuitive way.</p>
      </section>
    </div>
  );
}
