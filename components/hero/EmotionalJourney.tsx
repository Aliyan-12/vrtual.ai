import Container from "@/components/Container";

export default function EmotionalJourney() {
  return (
    <section id="conversation" className="relative bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)] text-[var(--text-dark)]">
      <Container className="py-20">
        <div className="text-sm tracking-[0.2em] text-[var(--text-muted)]">Journey</div>
        <h2 className="mt-2 text-2xl font-semibold">Emotional states</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-5">
          <div className="rounded-2xl bg-[var(--white)] p-4 text-center ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            Calm
            <a href="#resources" className="mt-2 block text-sm text-[var(--text-muted)] hover:text-[var(--text-dark)]">Learn More</a>
          </div>
          <div className="rounded-2xl bg-[var(--white)] p-4 text-center ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            Concerned
            <a href="#resources" className="mt-2 block text-sm text-[var(--text-muted)] hover:text-[var(--text-dark)]">Learn More</a>
          </div>
          <div className="rounded-2xl bg-[var(--white)] p-4 text-center ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            Defensive
            <a href="#resources" className="mt-2 block text-sm text-[var(--text-muted)] hover:text-[var(--text-dark)]">Learn More</a>
          </div>
          <div className="rounded-2xl bg-[var(--white)] p-4 text-center ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            Frustrated
            <a href="#resources" className="mt-2 block text-sm text-[var(--text-muted)] hover:text-[var(--text-dark)]">Learn More</a>
          </div>
          <div className="rounded-2xl bg-[var(--white)] p-4 text-center ring-1 ring-black/10 transition hover:bg-[var(--secondary-light)]">
            Escalated
            <a href="#resources" className="mt-2 block text-sm text-[var(--text-muted)] hover:text-[var(--text-dark)]">Learn More</a>
          </div>
        </div>
      </Container>
    </section>
  );
}
