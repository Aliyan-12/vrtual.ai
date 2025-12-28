import Container from "@/components/Container";

export default function Features() {
  return (
    <section className="relative bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)] text-[var(--text-dark)]">
      <Container className="py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="group rounded-2xl bg-[var(--white)] p-6 ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            <div className="text-sm tracking-[0.2em] text-[var(--text-muted)]">Presence</div>
            <h2 className="mt-2 text-xl font-medium">Talk to the Avatar</h2>
            <p className="mt-2 text-[var(--text-muted)]">Your avatar listens and responds with voice.</p>
          </div>
          <div className="group rounded-2xl bg-[var(--white)] p-6 ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            <div className="text-sm tracking-[0.2em] text-[var(--text-muted)]">Guidance</div>
            <h2 className="mt-2 text-xl font-medium">Get Helpful Resources</h2>
            <p className="mt-2 text-[var(--text-muted)]">Based on conversation, the AI pulls relevant links.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-sm text-[var(--text-dark)] ring-1 ring-[var(--accent)]">Podcast clips</span>
              <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-sm text-[var(--text-dark)] ring-1 ring-[var(--accent)]">Shorts</span>
              <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-sm text-[var(--text-dark)] ring-1 ring-[var(--accent)]">Episodes</span>
              <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-sm text-[var(--text-dark)] ring-1 ring-[var(--accent)]">Blogs</span>
            </div>
          </div>
          <div className="group rounded-2xl bg-[var(--white)] p-6 ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            <div className="text-sm tracking-[0.2em] text-[var(--text-muted)]">Awareness</div>
            <h2 className="mt-2 text-xl font-medium">See Emotional Patterns</h2>
            <p className="mt-2 text-[var(--text-muted)]">Calm, concerned, defensive, frustrated, escalated.</p>
            <div className="mt-4 flex h-24 items-end gap-2">
              <div className="h-8 w-8 rounded bg-[var(--secondary)]/50" />
              <div className="h-16 w-8 rounded bg-[var(--accent)]/50" />
              <div className="h-10 w-8 rounded bg-[var(--pink)]/50" />
              <div className="h-20 w-8 rounded bg-[var(--secondary)]/50" />
              <div className="h-12 w-8 rounded bg-[var(--accent)]/50" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
