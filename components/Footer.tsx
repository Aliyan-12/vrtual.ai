import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="text-lg font-semibold">vrtual.ai</div>
            <p className="mt-2 text-sm text-zinc-300">
              Understand emotions with conversational AI and helpful resources.
            </p>
          </div>
          <div>
            <div className="text-sm tracking-[0.2em] text-zinc-400">Explore</div>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <Link href="/#how-it-works" className="text-zinc-300 hover:text-zinc-100">How It Works</Link>
              <Link href="/#resources" className="text-zinc-300 hover:text-zinc-100">Resources</Link>
              <Link href="/chat" className="text-zinc-300 hover:text-zinc-100">Chat</Link>
            </div>
          </div>
          <div>
            <div className="text-sm tracking-[0.2em] text-zinc-400">Follow</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/#resources" className="rounded-full bg-white/10 px-3 py-1 text-xs">Podcast</Link>
              <Link href="/#resources" className="rounded-full bg-white/10 px-3 py-1 text-xs">Blog</Link>
              <Link href="/#resources" className="rounded-full bg-white/10 px-3 py-1 text-xs">Social Media</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 text-xs text-zinc-500">© {new Date().getFullYear()} vrtual.ai</div>
      </div>
    </footer>
  );
}
