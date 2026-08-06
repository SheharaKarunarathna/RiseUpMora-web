"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Search, ExternalLink, Copy, Check, Clock, Award } from "lucide-react";

type ScheduleCandidate = {
  schedule_id: string;
  student_id: string;
  panel_number: number;
  interview_time: string;
  candidate_id: string;
  candidate_name: string;
  email: string;
  department: string;
  contact_number: string;
  cv_url: string;
  application_comment: string;
  created_at: string;
  is_interviewed: boolean;
  feedback_id: string | null;
};

/** "10:15:00" -> "10.15 AM" */
function formatSlotTime(value: string) {
  const [h, m] = String(value).split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}.${m ?? "00"} ${period}`;
}

export default function ScheduleTableClient({
  candidates,
  companyName,
  showEvaluate = false,
}: {
  candidates: ScheduleCandidate[];
  companyName?: string;
  showEvaluate?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [interviewedMap, setInterviewedMap] = useState<Record<string, boolean>>({});

  // Initialize interviewedMap from DB candidates props
  useEffect(() => {
    const initialMap: Record<string, boolean> = {};
    candidates.forEach((cand) => {
      if (cand.candidate_id) {
        initialMap[cand.candidate_id] = Boolean(cand.is_interviewed);
      }
    });

    try {
      const storageKey = `interviewed_schedule_${(companyName || "company").replace(/\s+/g, "_")}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const localData = JSON.parse(saved);
        Object.assign(initialMap, localData);
      }
    } catch (e) {
      console.error("Failed to load interviewed candidates cache", e);
    }

    setInterviewedMap(initialMap);
  }, [candidates, companyName]);

  const toggleInterviewed = async (candId: string) => {
    const nextStatus = !interviewedMap[candId];

    setInterviewedMap((prev) => {
      const next = { ...prev, [candId]: nextStatus };
      try {
        const storageKey = `interviewed_schedule_${(companyName || "company").replace(/\s+/g, "_")}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save interviewed cache", e);
      }
      return next;
    });

    try {
      const response = await fetch("/api/v1/company/interviewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candId,
          isInterviewed: nextStatus,
        }),
      });
      if (!response.ok) {
        console.error("Failed to save interviewed status to database");
      }
    } catch (error) {
      console.error("Network error saving interviewed status:", error);
    }
  };

  const filteredCandidates = candidates.filter((cand) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      cand.candidate_name?.toLowerCase().includes(q) ||
      cand.email?.toLowerCase().includes(q) ||
      cand.student_id?.toLowerCase().includes(q) ||
      cand.department?.toLowerCase().includes(q) ||
      cand.contact_number?.toLowerCase().includes(q)
    );
  });

  const handleCopyPhone = (candId: string, phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(candId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#002454]/15 p-4 sm:p-6 shadow-sm flex flex-col justify-between min-h-[320px] transition-all">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b-2 border-[#002454]/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[#002454] tracking-tight">
                Interview Schedule
              </h3>
              <span className="inline-flex items-center rounded-full bg-[#33aeda]/15 px-2.5 py-0.5 text-xs font-black text-[#0d6082] border border-[#33aeda]/30">
                {filteredCandidates.length} of {candidates.length}{" "}
                {candidates.length === 1 ? "candidate" : "candidates"}
              </span>
            </div>
            <p className="text-xs text-[#002454]/60 mt-1 font-medium leading-relaxed">
              Real interview schedule ordered by assigned time &amp; panel
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002454]/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, ref #, dept..."
              className="w-full rounded-xl border-2 border-[#002454]/20 bg-[#f8fcfe] py-1.5 pl-9 pr-7 text-xs font-extrabold text-[#002454] placeholder-[#002454]/40 outline-none focus:border-[#33aeda] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#002454]/40 hover:text-[#002454] font-black text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#002454]/40 border-2 border-dashed border-[#002454]/10 rounded-xl bg-[#fbfdfe]">
            <Building2 size={44} className="mb-2 text-[#002454]/25" />
            <p className="font-bold text-sm text-[#002454]/70">
              {searchQuery
                ? `No candidates found matching "${searchQuery}".`
                : "No interviews have been scheduled for this company yet."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border-2 border-[#002454]/20 shadow-sm bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#002454]/5 border-b-2 border-[#002454]/20 text-xs font-black text-[#002454] uppercase tracking-wider">
                    <th className="py-3 px-3 border-r border-[#002454]/15 w-12 text-center">#</th>
                    <th className="py-3 px-3 border-r border-[#002454]/15 min-w-[110px]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        Time Slot
                      </div>
                    </th>
                    <th className="py-3 px-3 border-r border-[#002454]/15 w-20 text-center">Panel</th>
                    <th className="py-3 px-3 border-r border-[#002454]/15">Ref No.</th>
                    <th className="py-3 px-4 border-r border-[#002454]/15 min-w-[220px]">Candidate Details</th>
                    <th className="py-3 px-3 border-r border-[#002454]/15 min-w-[170px]">Department</th>
                    <th className="py-3 px-4 border-r border-[#002454]/15 text-center">Actions</th>
                    <th className="py-3 px-3 text-center min-w-[110px]">Interviewed</th>
                    {showEvaluate && <th className="py-3 px-3 border-l border-[#002454]/15 text-center min-w-[120px]">Evaluation</th>}
                  </tr>
                </thead>
                <tbody className="divide-y border-t border-[#002454]/15 divide-[#002454]/15">
                  {filteredCandidates.map((cand, index) => {
                    const isDone = Boolean(interviewedMap[cand.candidate_id]);
                    return (
                      <tr
                        key={cand.schedule_id}
                        className={`transition-colors border-b border-[#002454]/15 ${
                          isDone
                            ? "bg-slate-200/90 text-slate-700 opacity-80"
                            : "hover:bg-[#f0f7fc] odd:bg-white even:bg-[#fbfdfe]"
                        }`}
                      >
                        {/* # */}
                        <td className="py-3.5 px-3 border-r border-[#002454]/15 text-xs font-black text-[#002454]/70 text-center">
                          #{index + 1}
                        </td>

                        {/* Time Slot */}
                        <td className="py-3.5 px-3 border-r border-[#002454]/15">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black shadow-xs ${
                              isDone
                                ? "bg-slate-300 text-slate-800 border border-slate-400"
                                : "bg-[#f6c430]/25 text-[#7a5c00] border border-[#f6c430]/50"
                            }`}
                          >
                            <Clock size={12} />
                            {formatSlotTime(cand.interview_time)}
                          </span>
                        </td>

                        {/* Panel */}
                        <td className="py-3.5 px-3 border-r border-[#002454]/15 text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black shadow-xs ${
                              isDone
                                ? "bg-slate-300 text-slate-800 border border-slate-400"
                                : "bg-[#33aeda]/15 text-[#0e6d8e] border border-[#33aeda]/40"
                            }`}
                          >
                            P{cand.panel_number}
                          </span>
                        </td>

                        {/* Ref No. */}
                        <td className="py-3.5 px-3 border-r border-[#002454]/15">
                          <div
                            className={`font-black text-xs px-2 py-1 rounded-md inline-block tracking-wide ${
                              isDone
                                ? "bg-slate-300 text-slate-800 border border-slate-400"
                                : "bg-[#002454]/10 text-[#002454] border border-[#002454]/20"
                            }`}
                          >
                            {cand.student_id || "N/A"}
                          </div>
                        </td>

                        {/* Candidate Details */}
                        <td className="py-3.5 px-4 border-r border-[#002454]/15">
                          <div
                            className={`font-extrabold text-sm whitespace-normal break-words ${
                              isDone ? "text-slate-800 line-through decoration-slate-500" : "text-[#002454]"
                            }`}
                          >
                            {cand.candidate_name}
                          </div>
                          <div className="text-xs text-[#002454]/80 font-semibold whitespace-normal break-words mt-0.5">
                            {cand.email}
                          </div>
                          {cand.contact_number && (
                            <div className="text-xs text-[#002454] mt-1.5 font-extrabold flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[#002454]">
                                <span>📞</span>
                                <span>{cand.contact_number}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(cand.candidate_id, cand.contact_number)}
                                title={copiedId === cand.candidate_id ? "Copied!" : "Copy mobile number"}
                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black bg-[#002454]/10 hover:bg-[#33aeda] text-[#002454] hover:text-white transition-all border border-[#002454]/20 shadow-xs active:scale-95 cursor-pointer"
                              >
                                {copiedId === cand.candidate_id ? (
                                  <>
                                    <Check size={11} className="text-emerald-600" />
                                    <span className="text-emerald-700 font-extrabold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {cand.application_comment && (
                            <div className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-2 py-1 mt-2 whitespace-normal break-words">
                              Comment: {cand.application_comment}
                            </div>
                          )}
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-3 border-r border-[#002454]/15 relative group">
                          <div
                            className={`font-extrabold text-xs px-2.5 py-1.5 rounded-lg whitespace-normal break-words shadow-xs transition-colors cursor-pointer ${
                              isDone
                                ? "bg-slate-300 text-slate-800 border border-slate-400"
                                : "bg-[#002454]/10 text-[#002454] border border-[#002454]/25 hover:bg-[#33aeda]/20 hover:border-[#33aeda]/50"
                            }`}
                            title={cand.department}
                          >
                            {cand.department || "N/A"}
                          </div>
                          {cand.department && (
                            <div className="absolute left-2 bottom-full mb-2 hidden group-hover:block z-50 bg-[#002454] text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-2xl border-2 border-[#33aeda] pointer-events-none max-w-sm whitespace-normal break-words min-w-[200px]">
                              <div className="text-[10px] text-[#f6c430] uppercase tracking-wider font-extrabold mb-1 flex items-center gap-1">
                                <span>🏢</span> <span>Full Department Name</span>
                              </div>
                              <div className="text-white text-xs font-black leading-snug">{cand.department}</div>
                              <div className="absolute left-6 top-full w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-[#002454]" />
                            </div>
                          )}
                        </td>

                        {/* CV Action */}
                        <td className="py-3.5 px-4 border-r border-[#002454]/15 text-center">
                          {cand.cv_url ? (
                            <a
                              href={`/api/v1/candidate/cv/${cand.candidate_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#33aeda] hover:bg-[#289ac4] px-3 py-1.5 text-xs font-black text-white shadow-xs transition-colors"
                            >
                              <span>CV</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">No CV</span>
                          )}
                        </td>

                        {/* Interviewed */}
                        <td className="py-3.5 px-3 text-center">
                          <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => toggleInterviewed(cand.candidate_id)}
                              className="w-4 h-4 rounded border-2 border-[#002454]/40 text-[#002454] focus:ring-[#33aeda] cursor-pointer accent-[#002454]"
                            />
                            {isDone && (
                              <span className="text-[10px] font-black text-slate-700 bg-slate-300 border border-slate-400 px-1.5 py-0.5 rounded">
                                Done ✓
                              </span>
                            )}
                          </label>
                        </td>
                        {showEvaluate && (
                          <td className="py-3.5 px-3 border-l border-[#002454]/15 text-center">
                            <Link
                              href={`/panelist/dashboard/evaluate/${cand.candidate_id}`}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                                cand.feedback_id
                                  ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                                  : "bg-[#f6c430] hover:bg-[#d49400] text-[#002454]"
                              }`}
                            >
                              <Award size={13} />
                              {cand.feedback_id ? "Edit Rated" : "Evaluate"}
                            </Link>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden flex flex-col gap-3">
              {filteredCandidates.map((cand, index) => {
                const isDone = Boolean(interviewedMap[cand.candidate_id]);
                return (
                  <div
                    key={cand.schedule_id}
                    className={`rounded-xl border-2 border-[#002454]/20 p-4 shadow-xs flex flex-col gap-3 transition-all ${
                      isDone
                        ? "bg-slate-200/90 text-slate-700 opacity-80"
                        : "bg-[#fbfdfe] hover:bg-white"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between border-b border-[#002454]/15 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#002454]/60">#{index + 1}</span>
                        <span className="font-black text-xs text-[#002454] bg-[#002454]/10 border border-[#002454]/20 px-2 py-0.5 rounded tracking-wide">
                          Ref: {cand.student_id || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-[#002454]/20 shadow-xs">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleInterviewed(cand.candidate_id)}
                            className="w-4 h-4 accent-[#002454] cursor-pointer"
                          />
                          <span className={`text-[11px] font-black ${isDone ? "text-slate-700" : "text-[#002454]"}`}>
                            {isDone ? "Interviewed ✓" : "Interviewed?"}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Time & Panel badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#f6c430]/25 text-[#7a5c00] border border-[#f6c430]/50 px-2.5 py-1 text-xs font-black">
                        <Clock size={12} />
                        {formatSlotTime(cand.interview_time)}
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-[#33aeda]/15 text-[#0e6d8e] border border-[#33aeda]/40 px-2.5 py-1 text-xs font-black">
                        Panel {cand.panel_number}
                      </span>
                    </div>

                    {/* Candidate info */}
                    <div className="flex flex-col gap-1.5">
                      <div className={`font-extrabold text-sm whitespace-normal break-words ${isDone ? "text-slate-800 line-through" : "text-[#002454]"}`}>
                        {cand.candidate_name}
                      </div>
                      <div className="text-xs text-[#002454]/80 font-semibold whitespace-normal break-words">
                        {cand.email}
                      </div>
                      {cand.contact_number && (
                        <div className="text-xs text-[#002454] font-extrabold mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                            📞 {cand.contact_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(cand.candidate_id, cand.contact_number)}
                            title={copiedId === cand.candidate_id ? "Copied!" : "Copy mobile number"}
                            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black bg-[#002454]/10 hover:bg-[#33aeda] text-[#002454] hover:text-white transition-all border border-[#002454]/20 cursor-pointer"
                          >
                            {copiedId === cand.candidate_id ? (
                              <>
                                <Check size={10} className="text-emerald-600" />
                                <span className="text-emerald-600 font-extrabold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={10} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-[#002454]/10 py-2 my-0.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#002454]/70 block mb-0.5">Department</span>
                        <span className="font-extrabold text-xs text-[#002454] bg-[#002454]/10 border border-[#002454]/20 px-2 py-0.5 rounded inline-block whitespace-normal break-words" title={cand.department}>
                          {cand.department || "N/A"}
                        </span>
                      </div>
                    </div>

                    {cand.application_comment && (
                      <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 whitespace-normal break-words">
                        <span className="text-[10px] uppercase font-extrabold block text-amber-900">Comment</span>
                        {cand.application_comment}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {cand.cv_url ? (
                        <a
                          href={`/api/v1/candidate/cv/${cand.candidate_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#33aeda] hover:bg-[#289ac4] px-4 py-2 text-xs font-black text-white shadow-xs transition-colors"
                        >
                          <span>View Candidate CV</span>
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">No CV Attached</span>
                      )}

                      {showEvaluate && (
                        <Link
                          href={`/panelist/dashboard/evaluate/${cand.candidate_id}`}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black shadow-xs transition-colors ${
                            cand.feedback_id
                              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                              : "bg-[#f6c430] hover:bg-[#d49400] text-[#002454]"
                          }`}
                        >
                          <Award size={13} />
                          {cand.feedback_id ? "Edit Rated" : "Evaluate"}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
