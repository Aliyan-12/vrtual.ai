'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 w-full bg-black/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 text-zinc-50">
        <Link href="/" className="text-lg font-semibold tracking-wide">
          vrtual.ai
        </Link>
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-zinc-300 hover:text-zinc-100 md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
        <div className="hidden md:flex items-center gap-6 text-sm">
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
      {open && (
        <div className="md:hidden">
          <div className="border-b border-white/10 bg-black/80 px-4 py-3 text-sm text-zinc-300">
            <div className="flex flex-col gap-3">
              <Link href="/" className={pathname === "/" ? "text-zinc-50" : "hover:text-zinc-100"} onClick={() => setOpen(false)}>Home</Link>
              <Link href="/chat" className={pathname?.startsWith("/chat") ? "text-zinc-50" : "hover:text-zinc-100"} onClick={() => setOpen(false)}>Chat</Link>
              <Link href="/#resources" className="hover:text-zinc-100" onClick={() => setOpen(false)}>Resources</Link>
              <Link href="/#how-it-works" className="hover:text-zinc-100" onClick={() => setOpen(false)}>How It Works</Link>
              <Link href="/chat" className="rounded-full bg-cyan-500/80 px-3 py-1.5 text-black ring-1 ring-white/20 hover:bg-cyan-400 w-fit" onClick={() => setOpen(false)}>Start Conversation</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
