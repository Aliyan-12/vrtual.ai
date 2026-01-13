'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  
  // if (status === "loading") return <p>Loading...</p>;
  // if (!session) return <p>You are not logged in.</p>;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between border-b border-black/10 px-4 sm:px-6 py-3 text-[var(--text-dark)]">
        <Link href="/" className="text-lg font-semibold tracking-wide">
          vrtual.ai
        </Link>
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-[var(--text-muted)] hover:text-[var(--text-dark)] md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/"
            className={pathname === "/" ? "font-medium text-[var(--text-dark)]" : "text-[var(--text-muted)] hover:text-[var(--text-dark)]"}
          >
            Home
          </Link>
          <Link
            href="/chat"
            className={pathname?.startsWith("/chat") ? "font-medium text-[var(--text-dark)]" : "text-[var(--text-muted)] hover:text-[var(--text-dark)]"}
          >
            Chat
          </Link>
          <Link href="/#resources" className="text-[var(--text-muted)] hover:text-[var(--text-dark)]">Resources</Link>
          <Link href="/#how-it-works" className="text-[var(--text-muted)] hover:text-[var(--text-dark)]">How It Works</Link>
          {/* {session ? "Logged in" : "Not logged in"} */}
          <div className="flex gap-2">
            <Link
              href="/login"
              className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-white hover:bg-[var(--primary-hover)]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[var(--secondary)] px-3 py-1.5 text-white hover:text-black hover:bg-[var(--secondary-hover)]"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
      {open && (
        <div className="md:hidden">
          <div className="border-b border-black/10 bg-white/90 px-4 py-3 text-sm text-[var(--text-dark)] backdrop-blur">
            <div className="flex flex-col gap-3">
              <Link href="/" className={pathname === "/" ? "text-[var(--text-dark)]" : "hover:text-[var(--text-dark)]"} onClick={() => setOpen(false)}>Home</Link>
              <Link href="/chat" className={pathname?.startsWith("/chat") ? "text-[var(--text-dark)]" : "hover:text-[var(--text-dark)]"} onClick={() => setOpen(false)}>Chat</Link>
              <Link href="/#resources" className="hover:text-[var(--text-dark)]" onClick={() => setOpen(false)}>Resources</Link>
              <Link href="/#how-it-works" className="hover:text-[var(--text-dark)]" onClick={() => setOpen(false)}>How It Works</Link>
              <div className="flex gap-2">
                <Link href="/login" className="w-fit rounded-full bg-[var(--primary)] px-3 py-1.5 text-white hover:bg-[var(--primary-hover)]" onClick={() => setOpen(false)}>Login</Link>
                <Link href="/register" className="w-fit rounded-full bg-[var(--secondary)] px-3 py-1.5 text-white hover:text-black hover:bg-[var(--secondary-hover)]" onClick={() => setOpen(false)}>Register</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
