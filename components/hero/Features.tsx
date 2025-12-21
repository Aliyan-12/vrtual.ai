import Container from "@/components/Container";

export default function Features() {
  return (
    <section className="relative bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-50">
      <Container className="py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="group rounded-2xl bg-white/8 p-6 backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12 hover:ring-white/35">
            <div className="text-sm tracking-[0.2em] text-zinc-400">Presence</div>
            <h2 className="mt-2 text-xl font-medium">Talk to the Avatar</h2>
            <p className="mt-2 text-zinc-300">Your avatar listens and responds with voice.</p>
          </div>
          <div className="group rounded-2xl bg-white/8 p-6 backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12 hover:ring-white/35">
            <div className="text-sm tracking-[0.2em] text-zinc-400">Guidance</div>
            <h2 className="mt-2 text-xl font-medium">Get Helpful Resources</h2>
            <p className="mt-2 text-zinc-300">Based on conversation, the AI pulls relevant links.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm">Podcast clips</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm">Shorts</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm">Episodes</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm">Blogs</span>
            </div>
          </div>
          <div className="group rounded-2xl bg-white/8 p-6 backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12 hover:ring-white/35">
            <div className="text-sm tracking-[0.2em] text-zinc-400">Awareness</div>
            <h2 className="mt-2 text-xl font-medium">See Emotional Patterns</h2>
            <p className="mt-2 text-zinc-300">Calm, concerned, defensive, frustrated, escalated.</p>
            <div className="mt-4 flex h-24 items-end gap-2">
              <div className="h-8 w-8 rounded bg-cyan-400/50" />
              <div className="h-16 w-8 rounded bg-violet-400/50" />
              <div className="h-10 w-8 rounded bg-pink-400/50" />
              <div className="h-20 w-8 rounded bg-cyan-400/50" />
              <div className="h-12 w-8 rounded bg-violet-400/50" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
