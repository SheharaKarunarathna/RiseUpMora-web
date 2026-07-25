"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SiteBackground from "../../site-background";
import SiteHeader from "../../site-header";

type CandidateApplication = {
  name: string;
  email: string;
  phone: string;
  studentId: string;
  faculty: string;
  department: string;
  cvUrl: string | null;
  preferences: Array<string | null>;
  comment: string;
};

type Company = {
  id: string;
  name: string;
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  signature: string;
  folder: string;
  public_id: string;
  timestamp: number;
  overwrite: boolean;
  invalidate: boolean;
  expectedPublicId: string;
};

type CloudinaryUpload = {
  public_id: string;
  secure_url: string;
  error?: { message?: string };
};

const maximumFileSize = 10 * 1024 * 1024;

export default function CandidateApplicationPage() {
  const router = useRouter();
  const { status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<CandidateApplication | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [preferences, setPreferences] = useState(["", "", "", ""]);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [interviews, setInterviews] = useState<any[]>([]);

  const [showNoticePopup, setShowNoticePopup] = useState(true);
  const [isSendingNoticeEmail, setIsSendingNoticeEmail] = useState(false);
  const [noticeEmailStatus, setNoticeEmailStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSendNoticeEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSendingNoticeEmail) return;
    setIsSendingNoticeEmail(true);
    setNoticeEmailStatus(null);

    try {
      const response = await fetch("/api/v1/candidate/send-cv-notice", {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setNoticeEmailStatus({
          type: "success",
          message: data.message || "Email sent successfully! Check your inbox.",
        });
      } else {
        setNoticeEmailStatus({
          type: "error",
          message: data.error || "Unable to send notice email. Please try again.",
        });
      }
    } catch {
      setNoticeEmailStatus({
        type: "error",
        message: "Connection error. Please try again.",
      });
    } finally {
      setIsSendingNoticeEmail(false);
    }
  };


  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    const controller = new AbortController();
    fetch("/api/v1/candidate/application", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          router.replace("/complete-profile");
          return null;
        }
        const data = (await response.json()) as {
          candidate?: CandidateApplication;
          companies?: Company[];
          interviews?: any[];
          error?: string;
        };
        if (!response.ok || !data.candidate || !data.companies) {
          throw new Error(data.error || "Unable to load your application");
        }
        return data as { candidate: CandidateApplication; companies: Company[]; interviews: any[] };
      })
      .then((data) => {
        if (!data) return;
        setCandidate(data.candidate);
        setCompanies(data.companies);
        setInterviews(data.interviews || []);
        setPreferences(
          Array.from({ length: 4 }, (_, index) =>
            data.candidate.preferences[index] ?? "",
          ),
        );
        setComment(data.candidate.comment);
        setIsLoading(false);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your application",
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [router, status]);

  useEffect(() => {
    if (!success) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSuccess(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [success]);

  const selectFile = (selectedFile: File | undefined) => {
    setError("");
    setSuccess(false);
    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !== "application/pdf" ||
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setError("Please select a PDF file.");
      return;
    }

    if (selectedFile.size > maximumFileSize) {
      setFile(null);
      setError("The selected file exceeds the maximum size of 10 MB.");
      return;
    }

    setFile(selectedFile);
  };

  const updatePreference = (index: number, value: string) => {
    setPreferences((current) =>
      current.map((preference, preferenceIndex) =>
        preferenceIndex === index ? value : preference,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!file) {
      setError("Select your CV in PDF format before submitting.");
      return;
    }
    if (preferences.some((preference) => !preference)) {
      setError("Select all four company preferences.");
      return;
    }
    if (new Set(preferences).size !== 4) {
      setError("Each company preference must be different.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionStage("Preparing secure upload");

    try {
      const signatureResponse = await fetch(
        "/api/v1/candidate/application/upload-signature",
        { method: "POST" },
      );
      const signatureData = (await signatureResponse.json()) as
        | UploadSignature
        | { error?: string };
      if (!signatureResponse.ok || !("signature" in signatureData)) {
        throw new Error(
          "error" in signatureData && signatureData.error
            ? signatureData.error
            : "Unable to prepare the CV upload",
        );
      }

      setSubmissionStage("Uploading CV...");
      const cloudinaryForm = new FormData();
      cloudinaryForm.set("file", file);
      cloudinaryForm.set("api_key", signatureData.apiKey);
      cloudinaryForm.set("timestamp", String(signatureData.timestamp));
      cloudinaryForm.set("signature", signatureData.signature);
      cloudinaryForm.set("folder", signatureData.folder);
      cloudinaryForm.set("public_id", signatureData.public_id);
      cloudinaryForm.set("overwrite", String(signatureData.overwrite));
      cloudinaryForm.set("invalidate", String(signatureData.invalidate));

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/raw/upload`,
        { method: "POST", body: cloudinaryForm },
      );
      const uploadData = (await uploadResponse.json()) as CloudinaryUpload;
      if (!uploadResponse.ok || !uploadData.secure_url || !uploadData.public_id) {
        throw new Error(uploadData.error?.message || "Cloudinary rejected the CV upload");
      }
      if (uploadData.public_id !== signatureData.expectedPublicId) {
        throw new Error("Cloudinary returned an unexpected CV path");
      }

      setSubmissionStage("Saving application");
      const response = await fetch("/api/v1/candidate/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvUrl: uploadData.secure_url,
          publicId: uploadData.public_id,
          preferences,
          comment,
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to submit your application.");
        return;
      }

      setSuccess(true);
    } catch (submissionError: unknown) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to connect. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
      setSubmissionStage("");
    }
  };

  return (
    <div className="candidate-application-page">
      <SiteBackground />
      <SiteHeader />

      <main className="candidate-application-main">
        <Link className="signup-back-link" href="/#home">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to home
        </Link>

        <header className="candidate-application-heading">
          <p>Candidate Application</p>
          <h1>Add your CV</h1>
          <span>
            Review your details, upload your CV, and rank your preferred companies.
          </span>
        </header>

        {isLoading ? (
          <div className="candidate-application-loading" role="status">
            <Loader2 className="signup-spinner" size={24} aria-hidden="true" />
            Loading your application
          </div>
        ) : candidate ? (
          <>
            {/* Interviews & Feedback Portal */}
            {interviews.length > 0 && (
              <div className="candidate-interviews-section">
                <h2 className="candidate-interviews-title">My Interviews & Feedback</h2>
                <div className="candidate-interviews-list">
                  {interviews.map((item) => (
                    <div key={item.allocation_id} className="candidate-interview-card">
                      <div className="candidate-interview-header">
                        <div className="candidate-interview-company">
                          {item.logo_url && (
                            <img src={item.logo_url} alt={item.company_name} className="candidate-interview-logo" />
                          )}
                          <h3>{item.company_name}</h3>
                        </div>
                        <span className={`candidate-interview-status status-${item.status.toLowerCase()}`}>
                          {item.status === "0" ? "Pending" : item.status === "1" ? "Scheduled" : item.status === "ONGOING" ? "Ongoing" : "Completed"}
                        </span>
                      </div>

                      {item.status === "ONGOING" && (
                        <div className="candidate-interview-ongoing-notice">
                          <span>🔔</span> Your mock interview session is currently active. Please report to your assigned panel list.
                        </div>
                      )}

                      {item.status === "COMPLETED" && (
                        <div className="candidate-interview-feedback">
                          <h4>Mock Interview Evaluation</h4>
                          <div className="candidate-feedback-ratings">
                            <div className="candidate-rating-item">
                              <span className="rating-label">Technical Skills</span>
                              <span className="rating-value">{item.technical_skills || "N/A"}/10</span>
                            </div>
                            <div className="candidate-rating-item">
                              <span className="rating-label">Communication</span>
                              <span className="rating-value">{item.communication || "N/A"}/10</span>
                            </div>
                            <div className="candidate-rating-item">
                              <span className="rating-label">Industry Ready</span>
                              <span className="rating-value">{item.industry_ready || "N/A"}/10</span>
                            </div>
                          </div>

                          {item.written_feedback && (
                            <div className="candidate-feedback-notes">
                              <h5>Panelist Advice & Notes</h5>
                              <blockquote>"{item.written_feedback}"</blockquote>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form className="candidate-application-form" onSubmit={handleSubmit}>
              <section className="application-section" aria-labelledby="applicant-details-title">
                <div className="application-section__heading">
                  <span>01</span>
                  <div>
                    <h2 id="applicant-details-title">Applicant details</h2>
                    <p>These details come from your verified candidate profile.</p>
                  </div>
                </div>

                <div className="application-details-grid">
                  {[
                    ["Name", candidate.name],
                    ["Email address", candidate.email],
                    ["Phone number", candidate.phone],
                    ["University ID", candidate.studentId],
                    ["Faculty", candidate.faculty],
                    ["Department", candidate.department],
                  ].map(([label, value]) => (
                    <label key={label}>
                      <span>{label}</span>
                      <input type="text" value={value} readOnly />
                    </label>
                  ))}
                </div>
              </section>

              <section className="application-section" aria-labelledby="cv-upload-title">
                <div className="application-section__heading">
                  <span>02</span>
                  <div>
                    <h2 id="cv-upload-title">Curriculum vitae</h2>
                    <p>File types accepted: PDF, maximum file size: 10 MB</p>
                  </div>
                </div>

                <div
                  className={`application-dropzone${isDragging ? " application-dropzone--active" : ""}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setIsDragging(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    selectFile(event.dataTransfer.files[0]);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => selectFile(event.target.files?.[0])}
                    disabled={isSubmitting}
                  />
                  {file ? <FileText size={34} aria-hidden="true" /> : <UploadCloud size={34} aria-hidden="true" />}
                  <strong>{file ? file.name : "Drag and drop your CV here"}</strong>
                  <span>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB - PDF verified`
                      : "or click to browse files"}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Browse files
                  </button>
                </div>
              </section>

              <section className="application-section" aria-labelledby="preferences-title">
                <div className="application-section__heading">
                  <span>03</span>
                  <div>
                    <h2 id="preferences-title">Company preferences</h2>
                    <p>Rank four different companies in your preferred order.</p>
                  </div>
                </div>

                <div className="application-preferences-grid">
                  {preferences.map((preference, index) => (
                    <label key={index}>
                      <span>Preference {index + 1}</span>
                      <select
                        value={preference}
                        onChange={(event) => updatePreference(index, event.target.value)}
                        disabled={isSubmitting}
                        required
                      >
                        <option value="" disabled>Select company</option>
                        {companies.map((company) => (
                          <option
                            value={company.id}
                            key={company.id}
                            disabled={preferences.some(
                              (selected, selectedIndex) =>
                                selectedIndex !== index && selected === company.id,
                            )}
                          >
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </section>

              <section className="application-section" aria-labelledby="comment-title">
                <div className="application-section__heading">
                  <span>04</span>
                  <div>
                    <h2 id="comment-title">Comment</h2>
                    <p>Optional</p>
                  </div>
                </div>

                <label className="application-comment">
                  <span>Additional comment</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={2000}
                    rows={5}
                    disabled={isSubmitting}
                  />
                  <small>{comment.length} / 2000</small>
                </label>
              </section>

              {error && <div className="signup-error" role="alert">{error}</div>}

              <button
                className="application-submit"
                type="submit"
                disabled={isSubmitting || companies.length < 4}
              >
                {isSubmitting ? (
                  <Loader2 className="signup-spinner" size={19} aria-hidden="true" />
                ) : null}
                {isSubmitting ? submissionStage : "Submit application"}
              </button>
            </form>
          </>
        ) : (
          <div className="signup-error" role="alert">{error}</div>
        )}
      </main>

      {showNoticePopup && (
        <div
          className="cv-notice-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowNoticePopup(false);
          }}
        >
          <section
            className="cv-notice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cv-notice-title"
          >
            <button
              type="button"
              className="cv-notice-close-btn"
              onClick={() => setShowNoticePopup(false)}
              aria-label="Close notice"
            >
              <X size={18} />
            </button>

            <div className="cv-notice-modal__content">
              <div className="cv-notice-modal__icon" aria-hidden="true">
                <Info size={30} />
              </div>
              <h2 id="cv-notice-title">CV Submissions Opening Soon!</h2>
              <div className="cv-notice-text">
                <p>
                  The CV submission period will open by the end of July. Once submissions begin, you will be notified via email and through our website. Please remember to check your spam or junk folder and mark our email address as &apos;not spam&apos; to ensure you receive our updates. Alternatively, you may check our website regularly.
                </p>
                <p style={{ marginTop: "0.75rem" }}>
                  Click{" "}
                  <button
                    type="button"
                    onClick={handleSendNoticeEmail}
                    disabled={isSendingNoticeEmail}
                    className="cv-notice-trigger-btn"
                  >
                    {isSendingNoticeEmail ? "sending email..." : "here"}
                  </button>{" "}
                  to check your inbox.
                </p>
              </div>

              {noticeEmailStatus && (
                <div
                  className={`cv-notice-status cv-notice-status--${noticeEmailStatus.type}`}
                  role="status"
                >
                  {noticeEmailStatus.type === "success" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{noticeEmailStatus.message}</span>
                </div>
              )}

              <button
                type="button"
                className="cv-notice-dismiss-btn"
                onClick={() => setShowNoticePopup(false)}
              >
                Understood
              </button>
            </div>
          </section>
        </div>
      )}

      {success && (
        <div
          className="application-success-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSuccess(false);
          }}
        >
          <section
            className="application-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-success-title"
          >
            <div className="application-success-modal__content" role="status">
              <div className="application-success-modal__icon" aria-hidden="true">
                <CheckCircle2 size={34} />
              </div>
              <h2 id="application-success-title">Application submitted</h2>
              <p>Your application has been submitted successfully.</p>
              <button type="button" onClick={() => setSuccess(false)}>
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
