"use client";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Save,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  departmentsByFaculty,
  faculties,
  type Faculty,
} from "@/lib/candidate-options";
import SiteBackground from "../../site-background";
import SiteHeader from "../../site-header";

type CandidateProfile = {
  name: string;
  email: string;
  phone: string;
  studentId: string;
  faculty: string;
  department: string;
  cvUrl: string | null;
  preferences: Array<string | null>;
  comment: string;
  pref1Timeslot: number | null;
  pref2Timeslot: number | null;
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
  status: "available" | "overcrowded" | "filled";
};

type FieldKey = "name" | "phone" | "studentId" | "faculty" | "department";

export default function CandidateDashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [preferences, setPreferences] = useState(["", "", "", ""]);
  const [comment, setComment] = useState("");

  // Committed (saved) values — what the server has
  const [savedName, setSavedName] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [savedStudentId, setSavedStudentId] = useState("");
  const [savedFaculty, setSavedFaculty] = useState("");
  const [savedDepartment, setSavedDepartment] = useState("");

  // In-progress edit values — only used while that field is in edit mode
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editFaculty, setEditFaculty] = useState("");
  const [editDepartment, setEditDepartment] = useState("");

  // Which fields are currently in edit mode
  const [editingFields, setEditingFields] = useState<Set<FieldKey>>(new Set());
  const [fieldSaving, setFieldSaving] = useState<FieldKey | null>(null);

  // Uniqueness conflict messages for phone & studentId
  const [fieldConflict, setFieldConflict] = useState<Partial<Record<"phone" | "studentId", string>>>({});
  // Individual field success messages
  const [fieldSuccess, setFieldSuccess] = useState<Partial<Record<FieldKey, string>>>({});
  // Which fields are currently being checked (spinner feedback)
  const [fieldChecking, setFieldChecking] = useState<Partial<Record<"phone" | "studentId", boolean>>>({});
  // Debounce timer refs
  const checkTimers = useRef<Partial<Record<"phone" | "studentId", ReturnType<typeof setTimeout>>>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pref1Timeslot, setPref1Timeslot] = useState<number | null>(null);
  const [pref2Timeslot, setPref2Timeslot] = useState<number | null>(null);
  const [slotCounts, setSlotCounts] = useState<Record<string, SlotInfo[]>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Refs for auto-focusing inputs when edit mode activates
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const studentIdRef = useRef<HTMLInputElement>(null);
  const facultyRef = useRef<HTMLInputElement>(null);
  const departmentRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<FieldKey, any> = {
    name: nameRef,
    phone: phoneRef,
    studentId: studentIdRef,
    faculty: facultyRef,
    department: departmentRef,
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    const controller = new AbortController();
    fetch("/api/v1/candidate/dashboard", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          router.replace("/complete-profile");
          return null;
        }
        const data = (await response.json()) as {
          candidate?: CandidateProfile;
          companies?: Company[];
          error?: string;
        };
        if (!response.ok || !data.candidate || !data.companies) {
          throw new Error(data.error || "Unable to load your profile");
        }
        return data as { candidate: CandidateProfile; companies: Company[] };
      })
      .then((data) => {
        if (!data) return;
        setCandidate(data.candidate);
        setCompanies(data.companies);
        setPreferences(
          Array.from({ length: 4 }, (_, index) =>
            data.candidate.preferences[index] ?? "",
          ),
        );
        setComment(data.candidate.comment);
        // Initialise both saved and edit values from the fetched data
        setSavedName(data.candidate.name);
        setSavedPhone(data.candidate.phone);
        setSavedStudentId(data.candidate.studentId);
        setSavedFaculty(data.candidate.faculty);
        setSavedDepartment(data.candidate.department);
        setEditName(data.candidate.name);
        setEditPhone(data.candidate.phone);
        setEditStudentId(data.candidate.studentId);
        setEditFaculty(data.candidate.faculty);
        setEditDepartment(data.candidate.department);
        setPref1Timeslot(data.candidate.pref1Timeslot);
        setPref2Timeslot(data.candidate.pref2Timeslot);
        if ((data as any).slotCounts) setSlotCounts((data as any).slotCounts);
        setIsLoading(false);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your profile",
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [router, status]);

  const updatePreference = (index: number, value: string) => {
    setPreferences((current) =>
      current.map((preference, preferenceIndex) =>
        preferenceIndex === index ? value : preference,
      ),
    );
    setSaveSuccess(false);
    // Reset timeslot when company changes for pref 1 or 2
    if (index === 0) setPref1Timeslot(null);
    if (index === 1) setPref2Timeslot(null);
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
      // Silently ignore
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

  const getSlotStatusInfo = (companyId: string, slotNumber: number): SlotInfo | undefined => {
    return slotCounts[companyId]?.find((s) => s.slot === slotNumber);
  };

  const getCvFilename = (url: string) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return "CV.pdf";
    }
  };

  /** Debounced uniqueness check for phone / studentId. */
  const checkFieldUniqueness = (field: "phone" | "studentId", value: string) => {
    // Clear any pending timer
    if (checkTimers.current[field]) clearTimeout(checkTimers.current[field]);
    // Clear previous conflict immediately
    setFieldConflict((prev) => ({ ...prev, [field]: undefined }));

    const trimmed = value.trim();
    if (!trimmed) return; // empty is fine

    // Don't check uniqueness if format is clearly wrong
    if (field === "phone" && trimmed.length !== 10) return;
    if (field === "studentId" && !/^\d{6}[A-Z]$/.test(trimmed)) return;

    setFieldChecking((prev) => ({ ...prev, [field]: true }));
    checkTimers.current[field] = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/candidate/check-field?field=${field}&value=${encodeURIComponent(trimmed)}`,
        );
        const data = (await res.json()) as { available?: boolean; error?: string };
        if (!data.available) {
          const label = field === "phone" ? "phone number" : "university ID";
          setFieldConflict((prev) => ({
            ...prev,
            [field]: `This ${label} is already linked to another account.`,
          }));
        }
      } catch {
        // Silently ignore network errors during check
      } finally {
        setFieldChecking((prev) => ({ ...prev, [field]: false }));
      }
    }, 500);
  };

  /** Enter edit mode for a field: reset in-progress value and focus the input. */
  const startEditing = (field: FieldKey) => {
    // Reset the in-progress value to the last committed value
    if (field === "name") setEditName(savedName);
    if (field === "phone") setEditPhone(savedPhone);
    if (field === "studentId") setEditStudentId(savedStudentId);
    if (field === "faculty") setEditFaculty(savedFaculty);
    if (field === "department") setEditDepartment(savedDepartment);

    setEditingFields((prev) => new Set([...prev, field]));
    setSaveSuccess(false);
    setFieldSuccess((prev) => ({ ...prev, [field]: undefined }));

    // Focus the input after the next render
    setTimeout(() => fieldRefs[field].current?.focus(), 0);
  };

  /** Save a single profile field and exit edit mode. */
  const saveField = async (field: FieldKey, value: string) => {
    const trimmed = value.trim();
    if (field === "phone" && trimmed.length !== 10) return;
    if (field === "studentId" && !/^\d{6}[A-Z]$/.test(trimmed)) return;
    if ((field === "phone" || field === "studentId") && fieldConflict[field]) return;

    setFieldSaving(field);
    setError("");
    try {
      const body: Record<string, string> = {
        [field]: value,
      };

      if (field === "faculty") {
        body.department = editingFields.has("department") ? editDepartment : savedDepartment;
      } else if (field === "department") {
        body.faculty = editingFields.has("faculty") ? editFaculty : savedFaculty;
      }

      const response = await fetch("/api/v1/candidate/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        setError(data.error || "Unable to save field.");
        return;
      }
      // Commit to saved snapshot and exit edit mode
      if (field === "name") { setSavedName(value); setCandidate((p) => p ? { ...p, name: value } : p); }
      if (field === "phone") { setSavedPhone(value); setCandidate((p) => p ? { ...p, phone: value } : p); }
      if (field === "studentId") { setSavedStudentId(value); setCandidate((p) => p ? { ...p, studentId: value } : p); }

      if (field === "faculty" || field === "department") {
        const facVal = field === "faculty" ? value : (editingFields.has("faculty") ? editFaculty : savedFaculty);
        const depVal = field === "department" ? value : (editingFields.has("department") ? editDepartment : savedDepartment);
        setSavedFaculty(facVal);
        setSavedDepartment(depVal);
        setCandidate((p) => p ? { ...p, faculty: facVal, department: depVal } : p);
        setEditingFields((prev) => {
          const next = new Set(prev);
          next.delete("faculty");
          next.delete("department");
          return next;
        });
        setFieldSuccess((prev) => ({
          ...prev,
          faculty: "Faculty is updated",
          department: "Department is updated"
        }));
      } else {
        setEditingFields((prev) => { const next = new Set(prev); next.delete(field); return next; });
        const fieldLabels: Record<FieldKey, string> = {
          name: "Name",
          phone: "Phone number",
          studentId: "University ID",
          faculty: "Faculty",
          department: "Department"
        };
        setFieldSuccess((prev) => ({ ...prev, [field]: `${fieldLabels[field]} is updated` }));
      }
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setFieldSaving(null);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaveSuccess(false);

    if (!savedName.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    const selectedPreferences = preferences.filter(Boolean);
    if (new Set(selectedPreferences).size !== selectedPreferences.length) {
      setError("Each company preference must be different.");
      return;
    }
    // Validate timeslots for pref 1 & 2
    if (preferences[0] && !pref1Timeslot) {
      setError("Please select a time slot for Preference 1.");
      return;
    }
    if (preferences[1] && !pref2Timeslot) {
      setError("Please select a time slot for Preference 2.");
      return;
    }
    if (!agreedToTerms) {
      setError("You must agree to the terms and conditions before submitting.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/candidate/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: savedName,
          phone: savedPhone,
          studentId: savedStudentId,
          faculty: savedFaculty,
          department: savedDepartment,
          preferences,
          comment,
          pref1Timeslot: preferences[0] ? pref1Timeslot : null,
          pref2Timeslot: preferences[1] ? pref2Timeslot : null,
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to save changes.");
        return;
      }

      setSaveSuccess(true);
      setEditingFields(new Set());
      setFieldSuccess({});
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /** Renders a single editable profile field with a Pencil/Save icon. */
  const renderField = (
    label: string,
    field: FieldKey,
    value: string,
    setValue: (v: string) => void,
    inputRef: React.RefObject<any>,
    inputType = "text",
    options?: readonly string[],
  ) => {
    const isEditing = editingFields.has(field);
    const isSavingThis = fieldSaving === field;
    const conflictMsg = (field === "phone" || field === "studentId") ? fieldConflict[field] : undefined;
    const isChecking = (field === "phone" || field === "studentId") ? fieldChecking[field] : false;

    let hasFormatError = false;
    let formatErrorMsg = "";
    if (isEditing && value.trim()) {
      if (field === "phone" && value.trim().length !== 10) {
        hasFormatError = true;
        formatErrorMsg = "Phone number must be exactly 10 digits.";
      } else if (field === "studentId" && !/^\d{6}[A-Z]$/.test(value.trim())) {
        hasFormatError = true;
        formatErrorMsg = "University ID must be 6 digits followed by 1 uppercase letter.";
      }
    }

    const disableSave = fieldSaving !== null || !!conflictMsg || isChecking || hasFormatError;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!isEditing) return;
      let val = e.target.value;
      if (field === "phone") {
        val = val.replace(/\D/g, "").slice(0, 10);
      } else if (field === "studentId") {
        val = val.replace(/[^0-9a-zA-Z]/g, "").toUpperCase().slice(0, 7);
      }
      setValue(val);
      if (field === "phone" || field === "studentId") {
        checkFieldUniqueness(field, val);
      }
    };

    return (
      <label key={field}>
        <span>{label}</span>
        <div className="field-input-wrap">
          {options ? (
            <select
              ref={inputRef}
              value={isEditing ? value : (
                field === "faculty" ? savedFaculty :
                  savedDepartment
              )}
              onChange={handleChange}
              disabled={!isEditing || isSavingThis || isSaving}
              onKeyDown={(e) => {
                if (!isEditing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!disableSave) saveField(field, value.trim());
                } else if (e.key === "Escape") {
                  setEditingFields((prev) => { const next = new Set(prev); next.delete(field); return next; });
                }
              }}
            >
              <option value="" disabled>Select {label.toLowerCase()}</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef}
              type={inputType}
              value={isEditing ? value : (
                field === "name" ? savedName :
                  field === "phone" ? savedPhone :
                    field === "studentId" ? savedStudentId :
                      field === "faculty" ? savedFaculty :
                        savedDepartment
              )}
              onChange={handleChange}
              readOnly={!isEditing}
              disabled={isSavingThis || isSaving}
              onKeyDown={(e) => {
                if (!isEditing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!disableSave) saveField(field, value.trim());
                } else if (e.key === "Escape") {
                  setEditingFields((prev) => { const next = new Set(prev); next.delete(field); return next; });
                }
              }}
            />
          )}
          {isEditing ? (
            <button
              type="button"
              className="field-icon-btn field-icon-btn--save"
              title={`Save ${label.toLowerCase()}`}
              aria-label={`Save ${label.toLowerCase()}`}
              disabled={disableSave}
              onClick={() => saveField(field, value.trim())}
            >
              {isSavingThis || isChecking
                ? <Loader2 size={14} className="signup-spinner" />
                : <Save size={14} />}
            </button>
          ) : (
            <button
              type="button"
              className="field-icon-btn field-icon-btn--edit"
              title={`Edit ${label.toLowerCase()}`}
              aria-label={`Edit ${label.toLowerCase()}`}
              disabled={fieldSaving !== null || isSaving}
              onClick={() => startEditing(field)}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
        {isEditing && (conflictMsg || formatErrorMsg) && (
          <div style={{ color: "#e11d48", fontSize: "0.75rem", marginTop: "-0.2rem", fontWeight: 600 }}>
            {conflictMsg || formatErrorMsg}
          </div>
        )}
        {!isEditing && fieldSuccess[field] && (
          <div style={{ color: "#2563eb", fontSize: "0.75rem", marginTop: "-0.2rem", fontWeight: 600 }}>
            {fieldSuccess[field]}
          </div>
        )}
      </label>
    );
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
          <p>My Profile</p>
          <h1>Candidate Dashboard</h1>
          <span>
            View your details, manage your CV, and update company preferences.
          </span>
        </header>

        {isLoading ? (
          <div className="candidate-application-loading" role="status">
            <Loader2 className="signup-spinner" size={24} aria-hidden="true" />
            Loading your profile
          </div>
        ) : candidate ? (
          <form className="candidate-application-form" onSubmit={handleSave}>
            {/* Section 01 — Applicant Details */}
            <section className="application-section" aria-labelledby="dashboard-details-title">
              <div className="application-section__heading">
                <span>01</span>
                <div>
                  <h2 id="dashboard-details-title">Applicant details</h2>
                  <p>Your verified candidate profile information.</p>
                </div>
              </div>

              <div className="application-details-grid">
                {renderField("Name", "name", editName, setEditName, nameRef)}
                {renderField("Phone number", "phone", editPhone, setEditPhone, phoneRef)}
                {renderField("University ID", "studentId", editStudentId, setEditStudentId, studentIdRef)}
                {renderField("Faculty", "faculty", editFaculty, setEditFaculty, facultyRef, "text", faculties)}
                {renderField(
                  "Department",
                  "department",
                  editDepartment,
                  setEditDepartment,
                  departmentRef,
                  "text",
                  departmentsByFaculty[(editingFields.has("faculty") ? editFaculty : savedFaculty) as Faculty] || []
                )}

                {/* Email — permanently locked */}
                <label>
                  <span>Email address</span>
                  <div className="field-input-wrap">
                    <input type="email" value={candidate.email} readOnly />
                    <span
                      className="field-icon-btn field-icon-btn--locked"
                      aria-label="Email cannot be changed"
                    >
                      <Lock size={14} />
                    </span>
                  </div>
                </label>
              </div>
            </section>

            {/* Section 02 — Curriculum Vitae */}
            <section className="application-section" aria-labelledby="dashboard-cv-title">
              <div className="application-section__heading">
                <span>02</span>
                <div>
                  <h2 id="dashboard-cv-title">Curriculum vitae</h2>
                  <p>Your uploaded CV document.</p>
                </div>
              </div>

              {candidate.cvUrl ? (
                <div className="dashboard-cv-card">
                  <div className="dashboard-cv-info">
                    <FileText size={28} aria-hidden="true" />
                    <div>
                      <strong>{getCvFilename(candidate.cvUrl)}</strong>
                      <span>PDF document — uploaded</span>
                    </div>
                  </div>
                  <div className="dashboard-cv-actions">
                    <a
                      href="/api/v1/candidate/cv/me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-cv-btn dashboard-cv-btn--view"
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      View CV
                    </a>
                    <Link
                      href="/candidate/application"
                      className="dashboard-cv-btn dashboard-cv-btn--replace"
                    >
                      <RefreshCw size={15} aria-hidden="true" />
                      Re-upload CV
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="dashboard-cv-card dashboard-cv-card--empty">
                  <FileText size={28} aria-hidden="true" />
                  <div>
                    <strong>No CV uploaded yet</strong>
                    <span>Upload your CV to complete your application.</span>
                  </div>
                  <Link
                    href="/candidate/application"
                    className="dashboard-cv-btn dashboard-cv-btn--replace"
                  >
                    Upload CV
                  </Link>
                </div>
              )}
            </section>

            {/* Section 03 — Company Preferences */}
            <section className="application-section" aria-labelledby="dashboard-preferences-title">
              <div className="application-section__heading">
                <span>03</span>
                <div>
                  <h2 id="dashboard-preferences-title">Company preferences</h2>
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
                          disabled={isSaving}
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

                    {/* Time slot selector for Pref 1 & 2 only */}
                    {(index === 0 || index === 1) && preference && (
                      <div className="timeslot-group">
                        <label>
                          <span>Time Slot (required)</span>
                          <div className="timeslot-select-wrap">
                            <select
                              value={index === 0 ? (pref1Timeslot ?? "") : (pref2Timeslot ?? "")}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                if (index === 0) setPref1Timeslot(val);
                                else setPref2Timeslot(val);
                                setSaveSuccess(false);
                              }}
                              disabled={isSaving}
                            >
                              <option value="">Select a time slot</option>
                              {[1, 2, 3, 4].map((slotNum) => {
                                const info = getSlotStatusInfo(preference, slotNum);
                                const isFilled = info?.status === "filled";
                                return (
                                  <option key={slotNum} value={slotNum} disabled={isFilled}>
                                    Slot {slotNum}: {getSlotLabel(slotNum)}
                                    {isFilled ? " (Full)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                            {(() => {
                              const selectedSlot = index === 0 ? pref1Timeslot : pref2Timeslot;
                              if (!selectedSlot) return null;
                              const info = getSlotStatusInfo(preference, selectedSlot);
                              if (!info) return null;
                              if (info.status === "overcrowded") {
                                return (
                                  <span className="timeslot-status timeslot-status--overcrowded">
                                    This slot is overcrowded!
                                  </span>
                                );
                              }
                              if (info.status === "filled") {
                                return (
                                  <span className="timeslot-status timeslot-status--filled">
                                    Sorry, this slot is filled!
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Section 04 — Comment */}
            <section className="application-section" aria-labelledby="dashboard-comment-title">
              <div className="application-section__heading">
                <span>04</span>
                <div>
                  <h2 id="dashboard-comment-title">Comment</h2>
                  <p>Optional</p>
                </div>
              </div>

              <label className="application-comment">
                <span>Additional comment</span>
                <textarea
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    setSaveSuccess(false);
                  }}
                  maxLength={2000}
                  rows={5}
                  disabled={isSaving}
                />
                <small>{comment.length} / 2000</small>
              </label>
            </section>

            {error && <div className="signup-error" role="alert">{error}</div>}

            {saveSuccess && (
              <div className="dashboard-save-success" role="status">
                <CheckCircle2 size={17} aria-hidden="true" />
                Changes saved successfully
              </div>
            )}

            <div className="terms-checkbox-area">
              <input
                type="checkbox"
                id="dashboard-agree-terms"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  setSaveSuccess(false);
                }}
                disabled={isSaving}
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
              disabled={isSaving || !agreedToTerms}
            >
              {isSaving ? (
                <Loader2 className="signup-spinner" size={19} aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              {isSaving ? "Saving changes" : "Save preferences"}
            </button>
          </form>
        ) : (
          <div className="signup-error" role="alert">{error}</div>
        )}
      </main>
    </div>
  );
}
