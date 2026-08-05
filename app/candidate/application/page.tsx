"use client";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
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
import CompanyGuide from "../company-guide";

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
  pref1Timeslot: number[];
  pref2Timeslot: number[];
};

type Company = {
  id: string;
  name: string;
  is_it: boolean;
  logo_url?: string | null;
};

type SlotInfo = {
  slot: number;
  filled: number;
  max: number;
  status: "available" | "overcrowded";
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  signature: string;
  folder: string;
  public_id: string;
  timestamp: number;
  type?: string;
  access_mode?: string;
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
  const [timeslots, setTimeslots] = useState<number[]>([]);
  const [slotCounts, setSlotCounts] = useState<Record<string, SlotInfo[]>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);




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
        return data as { candidate: CandidateApplication; companies: Company[]; interviews: any[]; slotCounts: Record<string, SlotInfo[]> };
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
        setTimeslots(
          data.candidate.pref1Timeslot.length > 0
            ? data.candidate.pref1Timeslot
            : data.candidate.pref2Timeslot,
        );
        if (data.slotCounts) setSlotCounts(data.slotCounts);
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
    // Reset the shared timeslots when either of the top two preferences changes
    if (index === 0 || index === 1) setTimeslots([]);
    // Fetch slot counts for the newly selected company
    if ((index === 0 || index === 1) && value) {
      fetchSlotCounts(value);
    }
  };

  const fetchSlotCounts = async (companyId: string) => {
    try {
      const res = await fetch(`/api/v1/candidate/timeslots?companyId=${companyId}`);
      const data = await res.json();
      if (data.slots) {
        setSlotCounts((prev) => ({ ...prev, [companyId]: data.slots }));
      }
    } catch {
      // Silently ignore — UI will just not show availability
    }
  };

  const getSlotLabel = (slotNumber: number) => {
    switch (slotNumber) {
      case 1: return "10:00 AM – 11:00 AM";
      case 2: return "11:00 AM – 12:00 PM";
      case 3: return "1:30 PM – 2:30 PM";
      case 4: return "2:30 PM – 3:30 PM";
      default: return "";
    }
  };

  const getSlotStatus = (companyId: string, slotNumber: number): SlotInfo | undefined => {
    return slotCounts[companyId]?.find((s) => s.slot === slotNumber);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!file && !candidate?.cvUrl) {
      setError("Select your CV in PDF format before submitting.");
      return;
    }
    const selectedPreferences = preferences.filter(Boolean);
    if (new Set(selectedPreferences).size !== selectedPreferences.length) {
      setError("Each company preference must be different.");
      return;
    }
    // Validate the shared timeslots for pref 1 & 2
    if ((preferences[0] || preferences[1]) && timeslots.length === 0) {
      setError("Please select at least one time slot for your top two preferences.");
      return;
    }
    if (!agreedToTerms) {
      setError("You must agree to the terms and conditions before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedCvUrl = candidate?.cvUrl || "";
      let uploadedPublicId = "";

      if (file) {
        setSubmissionStage("Preparing secure upload");
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
        if (signatureData.type) cloudinaryForm.set("type", signatureData.type);
        if (signatureData.access_mode) cloudinaryForm.set("access_mode", signatureData.access_mode);
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

        uploadedCvUrl = uploadData.secure_url;
        uploadedPublicId = uploadData.public_id;
      }

      setSubmissionStage("Saving application");
      const response = await fetch("/api/v1/candidate/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvUrl: uploadedCvUrl,
          publicId: uploadedPublicId,
          preferences,
          comment,
          pref1Timeslot: preferences[0] ? timeslots : [],
          pref2Timeslot: preferences[1] ? timeslots : [],
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        candidate?: CandidateApplication;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to submit your application.");
        return;
      }

      if (data.candidate) {
        setCandidate(data.candidate);
      } else if (uploadedCvUrl) {
        setCandidate((prev) => (prev ? { ...prev, cvUrl: uploadedCvUrl } : null));
      }
      setFile(null);
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
                <h2 className="candidate-interviews-title">Selected companies</h2>
                <div className="candidate-interviews-list">
                  {interviews
                    .slice()
                    .sort((a, b) => (a.pref_rank ?? 99) - (b.pref_rank ?? 99))
                    .map((item, i) => {
                      const isCompleted =
                        item.allocation_status === "COMPLETED" ||
                        item.technical_skills != null ||
                        item.written_feedback != null;
                      const isOngoing =
                        !isCompleted &&
                        (item.allocation_status === "ONGOING" || item.allocation_status === "ongoing");

                      const statusLabel = isCompleted
                        ? "Completed"
                        : isOngoing
                          ? "Ongoing"
                          : null;

                      const statusClass = isCompleted
                        ? "completed"
                        : isOngoing
                          ? "ongoing"
                          : "";

                      return (
                        <div key={item.company_id || i} className="candidate-interview-card">
                          <div className="candidate-interview-header">
                            <div className="candidate-interview-company">
                              {item.logo_url && (
                                <img src={item.logo_url} alt={item.company_name} className="candidate-interview-logo" />
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {item.pref_rank && (
                                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#33aeda", background: "rgba(51,174,218,0.12)", padding: "2px 7px", borderRadius: "5px" }}>
                                    Pref #{item.pref_rank}
                                  </span>
                                )}
                                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#002454" }}>{item.company_name}</h3>
                              </div>
                            </div>
                            {statusLabel && (
                              <span className={`candidate-interview-status status-${statusClass}`}>
                                {statusLabel}
                              </span>
                            )}
                          </div>

                          {item.panel_number && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px", fontSize: "12px", color: "#002454", background: "rgba(0,36,84,0.03)", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                              <span>📋 Panel: {item.panel_number}</span>
                            </div>
                          )}

                          {isOngoing && (
                            <div className="candidate-interview-ongoing-notice" style={{ marginTop: "6px", padding: "6px 10px", fontSize: "12px" }}>
                              <span>🔔</span> Mock interview active. Please report to panel {item.panel_number || "list"}.
                            </div>
                          )}

                          {isCompleted && (
                            <div className="candidate-interview-feedback" style={{ marginTop: "8px", gap: "0.5rem" }}>
                              <h4 style={{ fontSize: "0.75rem", margin: "0" }}>Mock Interview Evaluation</h4>
                              <div className="candidate-feedback-ratings" style={{ gap: "0.5rem" }}>
                                <div className="candidate-rating-item" style={{ padding: "0.4rem 0.75rem" }}>
                                  <span className="rating-label">Technical</span>
                                  <span className="rating-value">{item.technical_skills ?? "N/A"}/10</span>
                                </div>
                                <div className="candidate-rating-item" style={{ padding: "0.4rem 0.75rem" }}>
                                  <span className="rating-label">Communication</span>
                                  <span className="rating-value">{item.communication ?? "N/A"}/10</span>
                                </div>
                                <div className="candidate-rating-item" style={{ padding: "0.4rem 0.75rem" }}>
                                  <span className="rating-label">Quality of Projects</span>
                                  <span className="rating-value">{item.quality_of_projects ?? "N/A"}/10</span>
                                </div>
                                <div className="candidate-rating-item" style={{ padding: "0.4rem 0.75rem" }}>
                                  <span className="rating-label">Industry Ready</span>
                                  <span className="rating-value">{item.industry_ready ?? "N/A"}/10</span>
                                </div>
                              </div>

                              {item.written_feedback && (
                                <div className="candidate-feedback-notes" style={{ paddingTop: "0.5rem" }}>
                                  <blockquote style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}>"{item.written_feedback}"</blockquote>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                      <input type="text" value={value ?? ""} readOnly />
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
                  {file ? (
                    <>
                      <FileText size={34} className="text-[#1688b2]" aria-hidden="true" />
                      <strong>{file.name}</strong>
                      <span className="text-emerald-700 font-semibold">
                        {(file.size / 1024 / 1024).toFixed(2)} MB - PDF verified (new file selected)
                      </span>
                      <div className="flex items-center gap-3 mt-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[#002454]/20 hover:bg-slate-100 text-[#002454] bg-white transition-colors shadow-sm"
                        >
                          Change File
                        </button>
                      </div>
                    </>
                  ) : candidate?.cvUrl ? (
                    <>
                      <FileText size={34} className="text-[#1688b2]" aria-hidden="true" />
                      <strong>CV Currently Uploaded</strong>
                      <span className="text-slate-600 font-medium">
                        Your CV is active. Drag & drop a new PDF to update it, or view your current CV below.
                      </span>
                      <div className="cv-dropzone-actions" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`/api/v1/candidate/cv/me?t=${Date.now()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="cv-dropzone-btn cv-dropzone-btn--primary"
                        >
                          <ExternalLink size={14} /> View Uploaded CV
                        </a>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting}
                          className="cv-dropzone-btn cv-dropzone-btn--secondary"
                        >
                          Replace CV
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={34} aria-hidden="true" />
                      <strong>Drag and drop your CV here</strong>
                      <span>or click to browse files</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                      >
                        Browse files
                      </button>
                    </>
                  )}
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
                    <div key={index}>
                      <label>
                        <span>Preference {index + 1}</span>
                        <div className="company-select-wrap">
                          {(() => {
                            const comp = companies.find((c) => c.id === preference);
                            if (!comp) return null;
                            if (comp.logo_url) {
                              return (
                                <div className="company-select-logo" title={comp.name}>
                                  <img src={comp.logo_url} alt={comp.name} />
                                </div>
                              );
                            }
                            return (
                              <div className="company-select-logo-placeholder" title={comp.name}>
                                <Building2 size={16} />
                              </div>
                            );
                          })()}
                          <select
                            value={preference}
                            onChange={(event) => updatePreference(index, event.target.value)}
                            disabled={isSubmitting}
                          >
                            <option value="">Select company (optional)</option>
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
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <section className="application-section" aria-labelledby="timeslot-title">
                <div className="application-section__heading">
                  <span>04</span>
                  <div>
                    <h2 id="timeslot-title">Time slot preferences</h2>
                  </div>
                </div>

                <div className="timeslot-priority-notice">
                  <Info size={15} aria-hidden="true" />
                  <span>
                    Note: Your first preference receives the highest priority. However, choosing a company as your first preference does not guarantee placement. Even if slots are available, you may not be allocated to that company depending on the overall preference allocation process.
                  </span>
                </div>

                {preferences[0] || preferences[1] ? (
                  <div className="timeslot-checkbox-group">
                    {[1, 2, 3, 4].map((slotNum) => {
                      const checked = timeslots.includes(slotNum);
                      // Overcrowded status reflects Preference 1's company only
                      const info = preferences[0] ? getSlotStatus(preferences[0], slotNum) : undefined;
                      const isOvercrowded = info?.status === "overcrowded";
                      return (
                        <label key={slotNum} className="timeslot-checkbox-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSubmitting}
                            onChange={() => {
                              setTimeslots((current) =>
                                checked
                                  ? current.filter((s) => s !== slotNum)
                                  : [...current, slotNum].sort((a, b) => a - b),
                              );
                            }}
                          />
                          <span className="timeslot-checkbox-label">
                            Slot {slotNum}: {getSlotLabel(slotNum)}
                          </span>
                          {info && (
                            isOvercrowded ? (
                              <span className="timeslot-status timeslot-status--overcrowded">
                                Overcrowded!
                              </span>
                            ) : (
                              <span className="timeslot-status timeslot-status--available">
                                Available
                              </span>
                            )
                          )}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="timeslot-empty-hint">
                    Select a company for Preference 1 or Preference 2 to choose time slots.
                  </p>
                )}
              </section>

              <section className="application-section" aria-labelledby="comment-title">
                <div className="application-section__heading">
                  <span>05</span>
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

              <div className="terms-checkbox-area">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>
                  I agree to the{" "}
                  <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">
                    terms and conditions
                  </a>
                </span>
              </div>

              <button
                className="application-submit"
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
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

        <CompanyGuide />
      </main>



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
