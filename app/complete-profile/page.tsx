"use client";

import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Phone,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  departmentsByFaculty,
  faculties,
  normalizeStudentIdInput,
  type Faculty,
} from "@/lib/candidate-options";
import SiteBackground from "../site-background";
import SiteHeader from "../site-header";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | "">("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [studentId, setStudentId] = useState("");

  const departmentOptions = selectedFaculty
    ? departmentsByFaculty[selectedFaculty]
    : [];

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }
    if (session?.user.role !== "candidate") {
      router.replace("/");
      return;
    }

    const controller = new AbortController();
    fetch("/api/v1/candidate/profile", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to check profile");
        return response.json() as Promise<{ complete: boolean }>;
      })
      .then((data) => {
        if (data.complete) router.replace("/");
        else setIsChecking(false);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError("Unable to load your profile. Please refresh and try again.");
        setIsChecking(false);
      });

    return () => controller.abort();
  }, [router, session, status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/candidate/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to complete your profile.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-page complete-profile-page">
      <SiteBackground />
      <SiteHeader />

      <main className="complete-profile-main">
        {isChecking ? (
          <div className="complete-profile-loading" role="status">
            <Loader2 className="signup-spinner" size={28} aria-hidden="true" />
            Loading your candidate profile
          </div>
        ) : (
          <form className="signup-form complete-profile-form" onSubmit={handleSubmit}>
            <div className="complete-profile-icon" aria-hidden="true">
              <CheckCircle2 size={24} />
            </div>

            <div className="signup-form__heading">
              <p>Google account verified</p>
              <h1>Complete your profile</h1>
              <span>
                Welcome, {session?.user.name || "Candidate"}. Add your student details to continue.
              </span>
            </div>

            {error && <div className="signup-error" role="alert">{error}</div>}

            <label>
              <span>Contact number</span>
              <div className="signup-field">
                <Phone size={18} aria-hidden="true" />
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={11}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </label>

            <label>
              <span>Student ID</span>
              <div className="signup-field">
                <input
                  name="studentId"
                  type="text"
                  maxLength={7}
                  pattern="[0-9]{6}[A-Za-z]"
                  title="Enter 6 digits followed by one English letter"
                  value={studentId}
                  onChange={(event) => {
                    setStudentId(normalizeStudentIdInput(event.target.value));
                  }}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </label>

            <label>
              <span>Faculty</span>
              <div className="signup-field signup-field--select">
                <GraduationCap size={18} aria-hidden="true" />
                <select
                  name="faculty"
                  required
                  value={selectedFaculty}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setSelectedFaculty(event.target.value as Faculty);
                    setSelectedDepartment("");
                  }}
                >
                  <option value="" disabled>Select faculty</option>
                  {faculties.map((faculty) => (
                    <option value={faculty} key={faculty}>{faculty}</option>
                  ))}
                </select>
              </div>
            </label>

            <label>
              <span>Department</span>
              <div className="signup-field signup-field--select">
                <BookOpen size={18} aria-hidden="true" />
                <select
                  name="department"
                  required
                  value={selectedDepartment}
                  disabled={!selectedFaculty || isSubmitting}
                  onChange={(event) => setSelectedDepartment(event.target.value)}
                >
                  <option value="" disabled>
                    {selectedFaculty ? "Select department" : "Select faculty first"}
                  </option>
                  {departmentOptions.map((department) => (
                    <option value={department} key={department}>{department}</option>
                  ))}
                </select>
              </div>
            </label>

            <button className="signup-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="signup-spinner" size={18} aria-hidden="true" />
                  Saving profile
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
