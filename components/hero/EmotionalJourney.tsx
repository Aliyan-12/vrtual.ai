import Container from "@/components/Container";

export default function EmotionalJourney() {
  return (
    <section id="conversation" className="relative bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-50">
      <Container className="py-20">
        <div className="text-sm tracking-[0.2em] text-zinc-400">Journey</div>
        <h2 className="mt-2 text-2xl font-semibold">Emotional states</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-5">
          <div className="rounded-2xl bg-white/8 p-4 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            Calm
            <a href="#resources" className="mt-2 block text-sm text-cyan-300/90 hover:text-cyan-200">Learn More</a>
          </div>
          <div className="rounded-2xl bg-white/8 p-4 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            Concerned
            <a href="#resources" className="mt-2 block text-sm text-sky-300/90 hover:text-sky-200">Learn More</a>
          </div>
          <div className="rounded-2xl bg-white/8 p-4 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            Defensive
            <a href="#resources" className="mt-2 block text-sm text-amber-300/90 hover:text-amber-200">Learn More</a>
          </div>
          <div className="rounded-2xl bg-white/8 p-4 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            Frustrated
            <a href="#resources" className="mt-2 block text-sm text-orange-300/90 hover:text-orange-200">Learn More</a>
          </div>
          <div className="rounded-2xl bg-white/8 p-4 text-center backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            Escalated
            <a href="#resources" className="mt-2 block text-sm text-pink-300/90 hover:text-pink-200">Learn More</a>
          </div>
        </div>
      </Container>
    </section>
  );
}
