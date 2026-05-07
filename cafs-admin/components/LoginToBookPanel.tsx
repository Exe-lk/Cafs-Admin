"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

export default function LoginToBookPanel({
  backHref = "/book",
  googleEndpoint = "/api/auth/patient/google",
  oauthNext,
  initialErrorMessage = null,
}: {
  backHref?: string;
  /** API route that starts Google OAuth and returns `{ url }` */
  googleEndpoint?: string;
  /** `next` passed to OAuth start endpoint; defaults to `backHref` */
  oauthNext?: string;
  /** Optional auth error to show after redirect from callback */
  initialErrorMessage?: string | null;
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage,
  );

  const startGoogle = useCallback(async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const res = await fetch(googleEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ next: oauthNext ?? backHref }),
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data?.error || "Unable to start Google sign-in");
      }
      if (!data?.url) {
        throw new Error("Missing authorization URL");
      }

      window.location.assign(data.url);
    } catch (e) {
      console.error(e);
      setErrorMessage("Unable to start Google sign-in. Please try again.");
      setGoogleLoading(false);
    }
  }, [backHref, googleEndpoint, googleLoading, oauthNext]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
      {errorMessage ? (
        <div className="absolute top-6 left-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 rounded-xl border border-red-400/35 bg-red-950/80 px-4 py-3 text-left shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-red-100">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="shrink-0 text-red-200/80 transition hover:text-white"
              aria-label="Dismiss error message"
            >
              x
            </button>
          </div>
        </div>
      ) : null}

      <Link
        href={backHref}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Your details</span>
      </Link>

      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-12">
          Login to book online
        </h1>

        <div className="flex justify-center gap-6 mb-10">
          <SocialButton
            ariaLabel="Login with Google"
            onClick={startGoogle}
            disabled={googleLoading}
          >
            <GoogleIcon className="w-6 h-6" />
          </SocialButton>
          <SocialButton ariaLabel="Login with Facebook">
            <FacebookIcon className="w-7 h-7 fill-white" />
          </SocialButton>
          <SocialButton ariaLabel="Login with Email">
            <MailIcon className="w-6 h-6" />
          </SocialButton>
        </div>

        <div className="flex items-center gap-4 mb-10 text-white/40 uppercase tracking-widest text-[10px] font-bold">
          <div className="h-px flex-1 bg-dark-border/60" />
          <span>or</span>
          <div className="h-px flex-1 bg-dark-border/60" />
        </div>

        <button
          type="button"
          className="w-full py-4 px-6 bg-primary-teal text-white font-semibold rounded-full hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-black/30"
        >
          Create profile
        </button>

        <p className="mt-8 text-gray-400 text-sm">
          Need help?{" "}
          <a className="text-mint-accent hover:underline" href="#">
            Contact support
          </a>
        </p>
      </div>
    </main>
  );
}

function SocialButton({
  children,
  ariaLabel,
  onClick,
  disabled,
}: {
  children: ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center w-14 h-14 rounded-full border border-dark-border hover:bg-white/5 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

