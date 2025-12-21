import Container from "@/components/Container";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-50">
      <Container className="py-20">
        <div className="text-sm tracking-[0.2em] text-zinc-400">How it works</div>
        <h2 className="mt-2 text-2xl font-semibold">From talk to understanding</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/8 p-6 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            <div className="text-3xl">🗣️</div>
            <div className="mt-2 font-medium">Talk</div>
            <p className="mt-1 text-sm text-zinc-300">You initiate a conversation.</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-6 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            <div className="text-3xl">🤖</div>
            <div className="mt-2 font-medium">AI understands emotion</div>
            <p className="mt-1 text-sm text-zinc-300">Signals and patterns are detected.</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-6 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            <div className="text-3xl">🎯</div>
            <div className="mt-2 font-medium">Guidance & links</div>
            <p className="mt-1 text-sm text-zinc-300">Tailored support with resources.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
