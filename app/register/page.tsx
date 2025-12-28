import Container from "@/components/Container";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account · vrtual.ai",
  description: "Register for your account",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)] text-[var(--text-dark)]">
      <Container className="py-24 sm:py-32">
        <div className="mx-auto w-full max-w-md sm:max-w-lg rounded-2xl bg-[var(--white)] p-6 sm:p-8 ring-1 ring-black/10">
          <div className="text-center">
            <div className="text-xs sm:text-sm tracking-[0.2em] text-[var(--text-muted)]">Join us</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">Create your account</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Start your guided emotional journey.</p>
          </div>

          <form className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="text-sm text-[var(--text-dark)]">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Alex Smith"
                className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--white)] px-4 py-2 text-[var(--text-dark)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-sm text-[var(--text-dark)]">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--white)] px-4 py-2 text-[var(--text-dark)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="text-sm text-[var(--text-dark)]">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--white)] px-4 py-2 text-[var(--text-dark)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="text-sm text-[var(--text-dark)]">Confirm</label>
                <input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--white)] px-4 py-2 text-[var(--text-dark)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <label className="mt-2 flex items-start gap-2 text-sm text-zinc-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border border-black/10 bg-white" />
              I agree to the Terms and Privacy Policy.
            </label>

            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-sky-600 px-4 py-2 text-white hover:bg-sky-500"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px w-full bg-black/10" />
            <div className="text-xs text-zinc-500">or</div>
            <div className="h-px w-full bg-black/10" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black ring-1 ring-black/10 hover:bg-white/90"
              aria-label="Sign up with Google"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.651 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.152 7.961 3.039l5.657-5.657C33.24 6.053 28.86 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c10.98 0 19.82-8.9 19.98-19.88.01-.73.01-1.46-.369-4.037z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.814C14.444 16.88 18.9 14 24 14c3.059 0 5.842 1.152 7.961 3.039l5.657-5.657C33.24 6.053 28.86 4 24 4 16.318 4 9.742 8.444 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.18 0 9.86-1.98 13.4-5.2l-6.2-5.26C29.06 34.94 26.64 36 24 36c-5.19 0-9.59-3.34-11.24-8.01l-6.52 5.03C8.66 39.42 15.85 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.79 2.23-2.4 4.12-4.36 5.38l6.2 5.26C39.32 36.71 42 31.67 42 24c0-1.34-.16-2.64-.389-3.917z"/>
              </svg>
              Sign up with Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-medium text-white ring-1 ring-white/25 hover:bg-[#1466d4]"
              aria-label="Sign up with Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5 fill-white">
                <path d="M19 6h3V1h-3c-3.86 0-7 3.14-7 7v3H8v5h4v10h5V16h4l1-5h-5V8c0-1.103.897-2 2-2z"/>
              </svg>
              Sign up with Facebook
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-zinc-600">
            Already have an account? <Link href="/login" className="hover:text-zinc-900">Sign in</Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
