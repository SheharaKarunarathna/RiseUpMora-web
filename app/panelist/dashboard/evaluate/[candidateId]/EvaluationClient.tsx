"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Award, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Loader2
} from "lucide-react";

interface Candidate {
  candidate_id: string;
  candidate_name: string;
  email: string;
  student_id: string;
  department: string;
  cv_url: string;
}

interface Panelist {
  panelist_id: string;
  panel_number: number;
  company_id: string;
  company_name: string;
}

interface ExistingFeedback {
  technical_skills?: number;
  technical_knowledge?: number;
  communication?: number;
  quality_of_projects?: number;
  industry_ready?: number;
  written_feedback?: string;
  panelist_notes?: string;
}

interface EvaluationClientProps {
  candidate: Candidate;
  panelist: Panelist;
  existingFeedback: ExistingFeedback | null;
}

export default function EvaluationClient({
  candidate,
  panelist,
  existingFeedback,
}: EvaluationClientProps) {
  const router = useRouter();

  const [tech, setTech] = useState(existingFeedback?.technical_knowledge || existingFeedback?.technical_skills || 5);
  const [comm, setComm] = useState(existingFeedback?.communication || 5);
  const [projects, setProjects] = useState(existingFeedback?.quality_of_projects || 5);
  const [industry, setIndustry] = useState(existingFeedback?.industry_ready || 5);
  const [notes, setNotes] = useState(existingFeedback?.written_feedback || existingFeedback?.panelist_notes || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/v1/panelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-feedback",
          candidateId: candidate.candidate_id,
          panelistId: panelist.panelist_id,
          companyId: panelist.company_id,
          technicalSkills: tech,
          technicalKnowledge: tech,
          communication: comm,
          qualityOfProjects: projects,
          industryReady: industry,
          writtenFeedback: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to save candidate evaluation");
        return;
      }

      setMessage("Evaluation submitted successfully!");
      setTimeout(() => {
        router.push("/panelist/dashboard");
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingScale = (value: number, setValue: (v: number) => void) => {
    return (
      <div className="flex gap-1.5 sm:gap-2 justify-between mt-2.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => setValue(num)}
              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full font-bold text-xs transition-all border flex items-center justify-center ${
                isSelected
                  ? "bg-[#33aeda] text-white border-[#33aeda] shadow-md scale-105"
                  : "bg-white text-[#002454]/70 border-[#002454]/10 hover:border-[#33aeda] hover:text-[#33aeda]"
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Back button */}
      <div>
        <Link
          href="/panelist/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#002454]/60 hover:text-[#002454] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Interview Schedule
        </Link>
      </div>

      {/* Candidate Profile Details Card */}
      <div className="bg-white rounded-3xl border border-[#002454]/10 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#33aeda]">
            Evaluating Candidate
          </span>
          <h1 className="text-2xl font-extrabold text-[#002454] mt-0.5">
            {candidate.candidate_name}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#002454]/60 mt-1 font-semibold">
            <span>Student ID: {candidate.student_id}</span>
            <span>•</span>
            <span>Dept: {candidate.department}</span>
            <span>•</span>
            <span>{candidate.email}</span>
          </div>
        </div>

        {candidate.cv_url ? (
          <a
            href={`/api/v1/candidate/cv/${candidate.candidate_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-[#33aeda]/20 bg-[#33aeda]/5 hover:bg-[#33aeda]/10 px-4 py-2.5 text-xs font-bold text-[#1688b2] transition-all"
          >
            <Download size={14} /> View Candidate CV
          </a>
        ) : (
          <span className="text-xs font-bold text-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            No CV Uploaded
          </span>
        )}
      </div>

      {/* Alerts */}
      {message && (
        <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-sm">
          <CheckCircle size={14} />
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Evaluation Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#002454]/10 p-8 shadow-sm flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-extrabold text-[#002454] flex items-center gap-2 border-b border-[#002454]/5 pb-3">
            <Award className="text-[#33aeda]" /> Marking Parameters (Rate 1-10)
          </h2>
        </div>

        {/* 1. Technical Skills */}
        <div>
          <label className="block text-xs font-extrabold text-[#002454] uppercase tracking-wider">
            Technical Skills
          </label>
          <p className="text-[11px] text-[#002454]/50 leading-relaxed mt-0.5">
            Coding capability, theoretical knowledge, problem solving, and analytical skills.
          </p>
          {renderRatingScale(tech, setTech)}
        </div>

        {/* 2. Communication */}
        <div>
          <label className="block text-xs font-extrabold text-[#002454] uppercase tracking-wider">
            Communication
          </label>
          <p className="text-[11px] text-[#002454]/50 leading-relaxed mt-0.5">
            Clarity, listening skills, body language, confidence, and English proficiency.
          </p>
          {renderRatingScale(comm, setComm)}
        </div>

        {/* 3. Quality of Projects */}
        <div>
          <label className="block text-xs font-extrabold text-[#002454] uppercase tracking-wider">
            Quality of Projects
          </label>
          <p className="text-[11px] text-[#002454]/50 leading-relaxed mt-0.5">
            Complexity, relevance, execution, technical depth, and presentation of candidate projects.
          </p>
          {renderRatingScale(projects, setProjects)}
        </div>

        {/* 4. Industry Ready */}
        <div>
          <label className="block text-xs font-extrabold text-[#002454] uppercase tracking-wider">
            Industry Ready
          </label>
          <p className="text-[11px] text-[#002454]/50 leading-relaxed mt-0.5">
            Attitude, project exposure, adaptability, domain understanding, and fit.
          </p>
          {renderRatingScale(industry, setIndustry)}
        </div>

        {/* 4. Notes for Candidate */}
        <div className="border-t border-[#002454]/5 pt-6 flex flex-col gap-2">
          <label className="block text-xs font-extrabold text-[#002454] uppercase tracking-wider">
            Notes / Written Feedback for Candidate
          </label>
          <p className="text-[11px] text-amber-600 font-semibold bg-amber-50 rounded-lg p-2.5 border border-amber-200/50 flex items-start gap-2 leading-relaxed">
            <BookOpen size={14} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              <strong>Crucial Info:</strong> This note will be visible to the candidate on their application page once their interview status is marked as <strong>OVER</strong>.
            </span>
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            maxLength={1000}
            required
            placeholder="Provide constructive feedback, advice, areas of improvement, or overall interview review..."
            className="w-full rounded-xl border border-[#002454]/10 bg-white px-4 py-3 text-xs font-semibold text-[#002454] outline-none focus:border-[#33aeda] placeholder-[#002454]/30 leading-relaxed mt-1"
          />
          <small className="text-[10px] text-[#002454]/40 font-bold self-end mt-0.5">
            {notes.length} / 1000 characters
          </small>
        </div>

        {/* Action buttons */}
        <div className="border-t border-[#002454]/5 pt-6 flex gap-4 justify-end">
          <Link
            href="/panelist/dashboard"
            className="flex h-11 items-center justify-center rounded-xl border border-[#002454]/10 text-[#002454]/70 hover:bg-slate-50 px-5 text-xs font-bold transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !notes.trim()}
            className="flex h-11 items-center justify-center rounded-xl bg-[#33aeda] hover:bg-[#1688b2] text-white px-6 text-xs font-bold transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin mr-2" size={14} />
                Submitting...
              </>
            ) : (
              "Save Evaluation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
