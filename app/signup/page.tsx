"use client";

import Link from "next/link";
import { getProviders, signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  departmentsByFaculty,
  faculties,
  normalizeStudentIdInput,
  type Faculty,
} from "@/lib/candidate-options";
import SiteBackground from "../site-background";
import SiteHeader from "../site-header";

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | "">("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [emailFieldError, setEmailFieldError] = useState("");
  const [studentIdFieldError, setStudentIdFieldError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingStudentId, setIsCheckingStudentId] = useState(false);

  const departmentOptions = selectedFaculty ? departmentsByFaculty[selectedFaculty] : [];

  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/v1/candidate/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
          signal: controller.signal,
        });
        const data = (await response.json()) as { emailExists?: boolean };
        if (response.ok && data.emailExists) {
          setEmailFieldError("This email address is already registered.");
        }
      } catch (requestError: unknown) {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setEmailFieldError("");
        }
      } finally {
        if (!controller.signal.aborted) setIsCheckingEmail(false);
      }
    }, 600);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [email]);

  useEffect(() => {
    if (!/^\d{6}[A-Z]$/.test(studentId)) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/v1/candidate/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
          signal: controller.signal,
        });
        const data = (await response.json()) as { studentIdExists?: boolean };
        if (response.ok && data.studentIdExists) {
          setStudentIdFieldError(
            "This university ID is already registered. Contact an OC member if you have any doubt.",
          );
        }
      } catch (requestError: unknown) {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setStudentIdFieldError("");
        }
      } finally {
        if (!controller.signal.aborted) setIsCheckingStudentId(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [studentId]);

  return (
    <div className="signup-page">
      <SiteBackground />
      <SiteHeader />

      <main className="signup-main">
        <section className="signup-hero" aria-labelledby="signup-heading">
          <div className="signup-copy">
            <Link className="signup-back-link" href="/#home">
              <ArrowLeft size={18} aria-hidden="true" />
              Back to home
            </Link>

            <p className="hero-eyebrow">Rise Up Mora 2026</p>
            <h1 id="signup-heading">
              Start your <span>career-ready</span> journey.
            </h1>
            <p className="signup-description">
              Register your interest for Rise Up Mora and stay ready for webinars,
              workshops, internship fair updates, and mock interview opportunities.
            </p>

            <div className="signup-highlights" aria-label="Registration highlights">
              <div>
                <strong>20+</strong>
                <span>Expert sessions</span>
              </div>
              <div>
                <strong>50+</strong>
                <span>Industry partners</span>
              </div>
              <div>
                <strong>Aug 06</strong>
                <span>Fair day</span>
              </div>
            </div>
          </div>

          <form
            className="signup-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              setError("");
              setSubmitted(false);

              if (
                emailFieldError ||
                studentIdFieldError ||
                isCheckingEmail ||
                isCheckingStudentId
              ) {
                setError("Resolve the highlighted fields before signing up.");
                return;
              }

              setIsSubmitting(true);

              const formData = new FormData(form);

              try {
                const response = await fetch("/api/v1/candidate/signup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(Object.fromEntries(formData)),
                });
                const data = (await response.json()) as {
                  success?: boolean;
                  error?: string;
                  field?: "email" | "studentId";
                };

                if (!response.ok || !data.success) {
                  if (data.field === "email") {
                    setEmailFieldError(data.error || "This email address is already registered.");
                  } else if (data.field === "studentId") {
                    setStudentIdFieldError(
                      data.error ||
                        "This university ID is already registered. Contact an OC member if you have any doubt.",
                    );
                  } else {
                    setError(data.error || "Unable to complete registration");
                  }
                  return;
                }

                setSubmitted(true);
                form.reset();
                setSelectedFaculty("");
                setSelectedDepartment("");
                setEmail("");
                setStudentId("");
                setIsCheckingEmail(false);
                setIsCheckingStudentId(false);
              } catch {
                setError("Unable to connect. Please check your connection and try again.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="signup-form__heading">
              <p>Student Signup</p>
              <h2>Reserve your place</h2>
            </div>

            {submitted && (
              <div className="signup-success" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                Check your email to verify your address and set your password.
              </div>
            )}

            {error && (
              <div className="signup-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                {error}
              </div>
            )}

            <label>
              <span>Full name</span>
              <div className="signup-field">
                <UserRound size={18} aria-hidden="true" />
                <input name="name" type="text" autoComplete="name" required />
              </div>
            </label>

            <label>
              <span>Email address</span>
              <div className={`signup-field${emailFieldError ? " signup-field--error" : ""}`}>
                <Mail size={18} aria-hidden="true" />
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    const value = event.target.value;
                    setEmail(value);
                    setEmailFieldError("");
                    setIsCheckingEmail(
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
                    );
                  }}
                  aria-invalid={Boolean(emailFieldError)}
                  aria-describedby={emailFieldError ? "signup-email-error" : undefined}
                  required
                />
              </div>
              {isCheckingEmail && <small className="signup-field-status">Checking email...</small>}
              {emailFieldError && (
                <small className="signup-field-error" id="signup-email-error" role="alert">
                  {emailFieldError}
                </small>
              )}
            </label>

            <label>
              <span>Contact number</span>
              <div className="signup-field">
                <Phone size={18} aria-hidden="true" />
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={11}
                  required
                />
              </div>
            </label>

            <div className="signup-form__row">
              <label>
                <span>Faculty</span>
                <div className="signup-field signup-field--select">
                  <GraduationCap size={18} aria-hidden="true" />
                  <select
                    name="faculty"
                    required
                    value={selectedFaculty}
                    onChange={(event) => {
                      setSelectedFaculty(event.target.value as Faculty);
                      setSelectedDepartment("");
                    }}
                  >
                    <option value="" disabled>
                      Select faculty
                    </option>
                    {faculties.map((faculty) => (
                      <option value={faculty} key={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label>
                <span>Student ID</span>
                <div className={`signup-field${studentIdFieldError ? " signup-field--error" : ""}`}>
                  <input
                    name="studentId"
                    type="text"
                    maxLength={7}
                    pattern="[0-9]{6}[A-Za-z]"
                    title="Enter 6 digits followed by one English letter"
                    value={studentId}
                    aria-invalid={Boolean(studentIdFieldError)}
                    aria-describedby={
                      studentIdFieldError ? "signup-student-id-error" : undefined
                    }
                    onChange={(event) => {
                      const normalizedValue = normalizeStudentIdInput(
                        event.target.value,
                      );
                      setStudentId(normalizedValue);
                      setStudentIdFieldError("");
                      setIsCheckingStudentId(/^\d{6}[A-Z]$/.test(normalizedValue));
                    }}
                    required
                  />
                </div>
                {isCheckingStudentId && (
                  <small className="signup-field-status">Checking university ID...</small>
                )}
                {studentIdFieldError && (
                  <small
                    className="signup-field-error"
                    id="signup-student-id-error"
                    role="alert"
                  >
                    {studentIdFieldError}
                  </small>
                )}
              </label>
            </div>

            <label>
              <span>Department</span>
              <div className="signup-field signup-field--select">
                <BookOpen size={18} aria-hidden="true" />
                <select
                  name="department"
                  required
                  value={selectedDepartment}
                  disabled={!selectedFaculty}
                  onChange={(event) => setSelectedDepartment(event.target.value)}
                >
                  <option value="" disabled>
                    {selectedFaculty ? "Select department" : "Select faculty first"}
                  </option>
                  {departmentOptions.map((department) => (
                    <option value={department} key={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <button
              className="signup-submit"
              type="submit"
              disabled={
                isSubmitting ||
                isCheckingEmail ||
                isCheckingStudentId ||
                Boolean(emailFieldError) ||
                Boolean(studentIdFieldError)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="signup-spinner" size={18} aria-hidden="true" />
                  Sending verification email
                </>
              ) : (
                "Sign Up"
              )}
            </button>

            <div className="signup-divider" aria-hidden="true">
              <span>or</span>
            </div>

            <button
              className="signup-google"
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
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
              }}
            >
              <svg
                className="signup-google__mark"
                aria-hidden="true"
                viewBox="0 0 24 24"
              >
                <path fill="#4285f4" d="M22.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.26h5.94a5.08 5.08 0 0 1-2.2 3.33v2.77h3.56c2.08-1.92 3.3-4.74 3.3-8.13z" />
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.86A10.99 10.99 0 0 0 12 23z" />
                <path fill="#fbbc05" d="M5.85 14.1a6.61 6.61 0 0 1 0-4.2V7.04H2.18a11.01 11.01 0 0 0 0 9.92l3.67-2.86z" />
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a10.99 10.99 0 0 0-9.82 6.04L5.85 9.9C6.72 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Sign in with Google
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
