export default function Home() {
  return (
    <div className="flex flex-col pt-20 justify-center min-h-full max-h-full bg-white/[.02] rounded-xl px-14 relative">
      <svg className="absolute -translate-x-1/2 -translate-y-1/2 fill-neutral-50/[0.03] -z-10 w-96 h-96 top-1/2 left-1/2">
        <use xlinkHref="/sprites.svg#history" />
      </svg>
      <header>
        <h1 className="mb-5 text-3xl font-geist-mono">Welcome home!</h1>
      </header>
      <section>
        <p><span className="underline">Taking notes</span> is an app that helps you to write your ideas with in an intuitive way.</p>
      </section>
    </div>
  );
}
