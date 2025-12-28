import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[var(--light-gray)] via-[#EEF2F7] to-[var(--white)] text-[var(--text-dark)] border-t border-black/10">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="text-lg font-semibold">vrtual.ai</div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Understand emotions with conversational AI and helpful resources.
            </p>
          </div>
          <div>
            <div className="text-sm tracking-[0.2em] text-[var(--text-muted)]">Explore</div>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <Link href="/#how-it-works" className="text-[var(--text-muted)] hover:text-[var(--text-dark)]">How It Works</Link>
              <Link href="/#resources" className="text-[var(--text-muted)] hover:text-[var(--text-dark)]">Resources</Link>
              <Link href="/chat" className="text-[var(--text-muted)] hover:text-[var(--text-dark)]">Chat</Link>
            </div>
          </div>
          <div>
            <div className="text-sm tracking-[0.2em] text-[var(--text-muted)]">Follow</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/#resources" className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs text-[var(--text-dark)] ring-1 ring-[var(--accent)]">Podcast</Link>
              <Link href="/#resources" className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs text-[var(--text-dark)] ring-1 ring-[var(--accent)]">Blog</Link>
              <Link href="/#resources" className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs text-[var(--text-dark)] ring-1 ring-[var(--accent)]">Social Media</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} vrtual.ai</div>
      </div>
    </footer>
  );
}
