import Container from "@/components/Container";

export default function Resources() {
  return (
    <section id="resources" className="relative bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-50">
      <Container className="py-20">
        <div className="text-sm tracking-[0.2em] text-zinc-400">Resources</div>
        <h2 className="mt-2 text-2xl font-semibold">Helpful guidance</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/8 p-6 backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            <div className="font-medium">Podcast</div>
            <p className="mt-1 text-sm text-zinc-300">Clips, shorts, full episodes.</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-6 backdrop-blur ring-1 ring-white/25 transition hover:bg-white/12">
            <div className="font-medium">Blog</div>
            <p className="mt-1 text-sm text-zinc-300">Articles and reflections.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
