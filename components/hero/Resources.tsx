import Container from "@/components/Container";

export default function Resources() {
  return (
    <section id="resources" className="relative bg-gradient-to-br from-white via-sky-50 to-white text-zinc-800">
      <Container className="py-20">
        <div className="text-sm tracking-[0.2em] text-zinc-500">Resources</div>
        <h2 className="mt-2 text-2xl font-semibold">Helpful guidance</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10 transition hover:bg-sky-50">
            <div className="font-medium">Podcast</div>
            <p className="mt-1 text-sm text-zinc-600">Clips, shorts, full episodes.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10 transition hover:bg-sky-50">
            <div className="font-medium">Blog</div>
            <p className="mt-1 text-sm text-zinc-600">Articles and reflections.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
