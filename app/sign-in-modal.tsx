"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  X,
} from "lucide-react";
import { getProviders, getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SignInModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    emailInputRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const closeModal = () => {
    setError("");
    setIsSuccessful(false);
    onClose();
  };

  const handleCredentialsSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        portal: "candidate",
        redirect: false,
      });

      if (!result?.ok || result.error) {
        setError("Invalid credentials or your email has not been verified.");
        return;
      }

      const session = await getSession();
      if (session?.user?.role === "company_coordinator") {
        closeModal();
        router.push("/company/dashboard");
        router.refresh();
        return;
      }
      if (session?.user?.role === "department_coordinator") {
        closeModal();
        router.push("/department-coordinator/dashboard");
        router.refresh();
        return;
      }
      if (session?.user?.role === "panelist") {
        closeModal();
        router.push("/panelist/dashboard");
        router.refresh();
        return;
      }

      setIsSuccessful(true);
      setPassword("");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const providers = await getProviders();
      if (!providers?.google) {
        setError("Google sign-in is not configured yet.");
        return;
      }

      await signIn("google", { callbackUrl: "/complete-profile" });
    } catch {
      setError("Unable to start Google sign-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="sign-in-modal__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <section
        className="sign-in-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-title"
      >
        <button
          className="sign-in-modal__close"
          type="button"
          onClick={closeModal}
          aria-label="Close sign in"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {isSuccessful ? (
          <div className="sign-in-modal__success" role="status">
            <CheckCircle2 size={42} aria-hidden="true" />
            <h2 id="sign-in-title">Welcome back</h2>
            <p>You have signed in successfully.</p>
            <button type="button" onClick={closeModal}>Continue</button>
          </div>
        ) : (
          <>
            <div className="sign-in-modal__heading">
              <p>Candidate Portal</p>
              <h2 id="sign-in-title">Sign in to Rise Up Mora</h2>
              <span>Access your candidate account and registration details.</span>
            </div>

            {error && <div className="sign-in-modal__error" role="alert">{error}</div>}

            <form onSubmit={handleCredentialsSignIn}>
              <label>
                <span>Email address</span>
                <div className="sign-in-modal__field">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </label>

              <label>
                <span>Password</span>
                <div className="sign-in-modal__field">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <button
                className="sign-in-modal__submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="signup-spinner" size={18} /> : null}
                Sign In
              </button>
            </form>

            <div className="sign-in-modal__divider"><span>or</span></div>

            <button
              className="sign-in-modal__google"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.26h5.94a5.08 5.08 0 0 1-2.2 3.33v2.77h3.56c2.08-1.92 3.3-4.74 3.3-8.13z" />
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.86A10.99 10.99 0 0 0 12 23z" />
                <path fill="#fbbc05" d="M5.85 14.1a6.61 6.61 0 0 1 0-4.2V7.04H2.18a11.01 11.01 0 0 0 0 9.92l3.67-2.86z" />
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a10.99 10.99 0 0 0-9.82 6.04L5.85 9.9C6.72 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Sign in with Google
            </button>

            <p className="sign-in-modal__signup">
              Need an account? <Link href="/signup" onClick={closeModal}>Sign up</Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
