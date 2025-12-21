'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 w-full bg-black/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 px-6 py-3 text-zinc-50">
        <Link href="/" className="text-lg font-semibold tracking-wide">
          vrtual.ai
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className={pathname === "/" ? "font-medium text-zinc-50" : "text-zinc-300 hover:text-zinc-100"}
          >
            Home
          </Link>
          <Link
            href="/chat"
            className={pathname?.startsWith("/chat") ? "font-medium text-zinc-50" : "text-zinc-300 hover:text-zinc-100"}
          >
            Chat
          </Link>
          <Link href="/#resources" className="text-zinc-300 hover:text-zinc-100">Resources</Link>
          <Link href="/#how-it-works" className="text-zinc-300 hover:text-zinc-100">How It Works</Link>
          <Link
            href="/chat"
            className="rounded-full bg-cyan-500/80 px-3 py-1.5 text-black ring-1 ring-white/20 hover:bg-cyan-400"
          >
            Start Conversation
          </Link>
        </div>
      </div>
    </nav>
  );
}
