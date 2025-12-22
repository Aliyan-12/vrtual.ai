import Container from "@/components/Container";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login · vrtual.ai",
  description: "Sign in to your account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-50">
      <Container className="py-24 sm:py-32">
        <div className="mx-auto w-full max-w-md sm:max-w-lg rounded-2xl bg-white/8 p-6 sm:p-8 backdrop-blur ring-1 ring-white/25">
          <div className="text-center">
            <div className="text-xs sm:text-sm tracking-[0.2em] text-zinc-400">Welcome back</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">Sign in to vrtual.ai</h1>
            <p className="mt-2 text-sm text-zinc-300">Continue your emotional journey.</p>
          </div>

          <form className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm text-zinc-300">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl bg-white/8 px-4 py-2 text-zinc-100 outline-none backdrop-blur ring-1 ring-white/25 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm text-zinc-300">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl bg-white/8 px-4 py-2 text-zinc-100 outline-none backdrop-blur ring-1 ring-white/25 placeholder:text-zinc-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" className="h-4 w-4 rounded border border-white/20 bg-white/5" />
                Remember me
              </label>
              <Link href="#" className="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200">Forgot password?</Link>
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-cyan-500/80 px-4 py-2 text-black ring-1 ring-white/20 hover:bg-cyan-400"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px w-full bg-white/15" />
            <div className="text-xs text-zinc-400">or</div>
            <div className="h-px w-full bg-white/15" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black ring-1 ring-white/25 hover:bg-white/90"
              aria-label="Sign in with Google"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.651 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.152 7.961 3.039l5.657-5.657C33.24 6.053 28.86 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c10.98 0 19.82-8.9 19.98-19.88.01-.73.01-1.46-.369-4.037z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.814C14.444 16.88 18.9 14 24 14c3.059 0 5.842 1.152 7.961 3.039l5.657-5.657C33.24 6.053 28.86 4 24 4 16.318 4 9.742 8.444 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.18 0 9.86-1.98 13.4-5.2l-6.2-5.26C29.06 34.94 26.64 36 24 36c-5.19 0-9.59-3.34-11.24-8.01l-6.52 5.03C8.66 39.42 15.85 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.79 2.23-2.4 4.12-4.36 5.38l6.2 5.26C39.32 36.71 42 31.67 42 24c0-1.34-.16-2.64-.389-3.917z"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-medium text-white ring-1 ring-white/25 hover:bg-[#1466d4]"
              aria-label="Sign in with Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5 fill-white">
                <path d="M19 6h3V1h-3c-3.86 0-7 3.14-7 7v3H8v5h4v10h5V16h4l1-5h-5V8c0-1.103.897-2 2-2z"/>
              </svg>
              Continue with Facebook
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-zinc-400">
            Don’t have an account? <Link href="/register" className="hover:text-zinc-200">Create one</Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
