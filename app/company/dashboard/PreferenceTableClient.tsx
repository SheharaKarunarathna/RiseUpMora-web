"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Clock, Tag, ExternalLink, Copy, Check, Award, Search } from "lucide-react";

export default function PreferenceTableClient({
  title,
  candidates,
  prefNum,
  slotNum,
  showSlotFilter = false,
  showPrefBadge = false,
  showEvaluate = false,
  subtitle,
}: {
  title: string;
  candidates: any[];
  prefNum?: number;
  slotNum?: number;
  showSlotFilter?: boolean;
  showPrefBadge?: boolean;
  showEvaluate?: boolean;
  subtitle?: string;
}) {
  const [slotFilter, setSlotFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [interviewedMap, setInterviewedMap] = useState<Record<string, boolean>>({});

  // Initialize interviewedMap from DB candidates props
  useEffect(() => {
    const initialMap: Record<string, boolean> = {};
    candidates.forEach((cand) => {
      if (cand.id) {
        initialMap[cand.id] = Boolean(cand.is_interviewed);
      }
    });

    // Also fallback to localStorage for offline / instant cache
    try {
      const storageKey = `interviewed_candidates_${title.replace(/\s+/g, "_")}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const localData = JSON.parse(saved);
        Object.assign(initialMap, localData);
      }
    } catch (e) {
      console.error("Failed to load interviewed candidates cache", e);
    }

    setInterviewedMap(initialMap);
  }, [candidates, title]);

  const toggleInterviewed = async (candId: string) => {
    const nextStatus = !interviewedMap[candId];

    // Optimistic UI update
    setInterviewedMap((prev) => {
      const next = { ...prev, [candId]: nextStatus };
      try {
        const storageKey = `interviewed_candidates_${title.replace(/\s+/g, "_")}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save interviewed cache", e);
      }
      return next;
    });

    // Database persistence via API
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
    // 1. Slot Filter
    if (slotFilter) {
      const slotNumbers: number[] = cand.slot_numbers || [];
      if (slotFilter === "none" && slotNumbers.length > 0) return false;
      if (slotFilter !== "none" && !slotNumbers.map(String).includes(slotFilter)) return false;
    }

    // 2. Front-end Real-time Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = cand.candidate_name?.toLowerCase().includes(q);
      const emailMatch = cand.email?.toLowerCase().includes(q);
      const refMatch = cand.student_id?.toLowerCase().includes(q);
      const deptMatch = cand.department?.toLowerCase().includes(q);
      const phoneMatch = cand.contact_number?.toLowerCase().includes(q);

      if (!nameMatch && !emailMatch && !refMatch && !deptMatch && !phoneMatch) {
        return false;
      }
    }

    return true;
  });

  // Sorting logic:
  // 1. Priority to Preference 1 selected candidates (Preference 1 -> 2 -> 3 -> 4)
  // 2. Order candidates by the time they added the preference (preference_added_at || created_at)
  // 3. Reference number (student_id) tie-breaker
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    const prefA = Number(a.preference_number ?? 99);
    const prefB = Number(b.preference_number ?? 99);
    if (prefA !== prefB) {
      return prefA - prefB;
    }

    const timeA = new Date(a.preference_added_at || a.created_at || 0).getTime();
    const timeB = new Date(b.preference_added_at || b.created_at || 0).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const refA = String(a.student_id || "").trim();
    const refB = String(b.student_id || "").trim();
    return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: "base" });
  });

  const formatAddedTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopyPhone = (candId: string, phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(candId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#002454]/15 p-4 sm:p-6 shadow-sm flex flex-col justify-between min-h-[320px] transition-all">
      <div>
        {/* Table Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b-2 border-[#002454]/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[#002454] tracking-tight">{title}</h3>
              <span className="inline-flex items-center rounded-full bg-[#33aeda]/15 px-2.5 py-0.5 text-xs font-black text-[#0d6082] border border-[#33aeda]/30">
                {sortedCandidates.length} of {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-[#002454]/60 mt-1 font-medium leading-relaxed">{subtitle}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {/* Front-end Real-time Search Box */}
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

            {showSlotFilter && candidates.length > 0 && (
              <div className="relative w-full sm:w-auto">
                <select
                  value={slotFilter}
                  onChange={(e) => setSlotFilter(e.target.value)}
                  className="w-full sm:w-auto appearance-none rounded-xl border-2 border-[#002454]/20 bg-[#f8fcfe] py-1.5 pl-3 pr-8 text-xs font-extrabold text-[#002454] outline-none focus:border-[#33aeda]"
                >
                  <option value="">All Time Slots</option>
                  <option value="1">Slot 1 (10:00 - 11:00)</option>
                  <option value="2">Slot 2 (11:00 - 12:00)</option>
                  <option value="3">Slot 3 (1:30 - 2:30)</option>
                  <option value="4">Slot 4 (2:30 - 3:30)</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#002454]/50 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {sortedCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#002454]/40 border-2 border-dashed border-[#002454]/10 rounded-xl bg-[#fbfdfe]">
            <Building2 size={44} className="mb-2 text-[#002454]/25" />
            <p className="font-bold text-sm text-[#002454]/70">
              {searchQuery
                ? `No candidates found matching "${searchQuery}".`
                : slotFilter
                ? "No candidates found for this time slot."
                : "No candidates registered for this section."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table View (Visible Borders) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border-2 border-[#002454]/20 shadow-sm bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#002454]/5 border-b-2 border-[#002454]/20 text-xs font-black text-[#002454] uppercase tracking-wider">
                    <th className="py-3 px-3 border-r border-[#002454]/15 w-12 text-center">#</th>
                    <th className="py-3 px-3 border-r border-[#002454]/15">Ref No.</th>
                    <th className="py-3 px-4 border-r border-[#002454]/15 min-w-[220px]">Candidate Details</th>
                    <th className="py-3 px-3 border-r border-[#002454]/15 min-w-[170px]">Department</th>
                    {showPrefBadge && <th className="py-3 px-3 border-r border-[#002454]/15 text-center">Preference</th>}
                    <th className="py-3 px-3 border-r border-[#002454]/15 min-w-[120px]">Added Time</th>
                    <th className="py-3 px-4 border-r border-[#002454]/15 text-center">Actions</th>
                    <th className="py-3 px-3 text-center min-w-[110px]">Interviewed</th>
                    {showEvaluate && <th className="py-3 px-3 border-l border-[#002454]/15 text-center min-w-[120px]">Evaluation</th>}
                  </tr>
                </thead>
                <tbody className="divide-y border-t border-[#002454]/15 divide-[#002454]/15">
                  {sortedCandidates.map((cand, index) => {
                    const isDone = Boolean(interviewedMap[cand.id]);
                    return (
                      <tr
                        key={cand.id}
                        className={`transition-colors border-b border-[#002454]/15 ${
                          isDone
                            ? "bg-slate-200/90 text-slate-700 opacity-80"
                            : "hover:bg-[#f0f7fc] odd:bg-white even:bg-[#fbfdfe]"
                        }`}
                      >
                        <td className="py-3.5 px-3 border-r border-[#002454]/15 text-xs font-black text-[#002454]/70 text-center">
                          #{index + 1}
                        </td>
                        <td className="py-3.5 px-3 border-r border-[#002454]/15">
                          <div className={`font-black text-xs px-2 py-1 rounded-md inline-block tracking-wide ${
                            isDone
                              ? "bg-slate-300 text-slate-800 border border-slate-400"
                              : "bg-[#002454]/10 text-[#002454] border border-[#002454]/20"
                          }`}>
                            {cand.student_id || "N/A"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 border-r border-[#002454]/15">
                          {/* Student Name fully visible */}
                          <div className={`font-extrabold text-sm whitespace-normal break-words ${
                            isDone ? "text-slate-800 line-through decoration-slate-500" : "text-[#002454]"
                          }`}>
                            {cand.candidate_name}
                          </div>
                          {/* Student Email fully visible */}
                          <div className="text-xs text-[#002454]/80 font-semibold whitespace-normal break-words mt-0.5">
                            {cand.email}
                          </div>
                          {/* Mobile Number fully visible + Copy icon button */}
                          {cand.contact_number && (
                            <div className="text-xs text-[#002454] mt-1.5 font-extrabold flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[#002454]">
                                <span>📞</span>
                                <span>{cand.contact_number}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(cand.id, cand.contact_number)}
                                title={copiedId === cand.id ? "Copied!" : "Copy mobile number"}
                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black bg-[#002454]/10 hover:bg-[#33aeda] text-[#002454] hover:text-white transition-all border border-[#002454]/20 shadow-xs active:scale-95 cursor-pointer"
                              >
                                {copiedId === cand.id ? (
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
                        <td className="py-3.5 px-3 border-r border-[#002454]/15 relative group">
                          {/* High-Contrast Department Badge + Hover Popup displaying Full Name */}
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
                        {showPrefBadge && (
                          <td className="py-3.5 px-3 border-r border-[#002454]/15 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-black shadow-xs ${
                                cand.preference_number === 1
                                  ? "bg-emerald-100 text-emerald-900 border-2 border-emerald-400"
                                  : "bg-[#f6c430]/25 text-[#7a5c00] border border-[#f6c430]/50"
                              }`}
                            >
                              <Tag size={11} /> Pref {cand.preference_number || (cand.pref_1 === cand.company_id ? 1 : cand.pref_2 === cand.company_id ? 2 : cand.pref_3 === cand.company_id ? 3 : 4)}
                            </span>
                          </td>
                        )}
                        <td className="py-3.5 px-3 border-r border-[#002454]/15 text-xs font-bold text-[#002454]/80 whitespace-normal break-words">
                          {formatAddedTime(cand.preference_added_at || cand.created_at)}
                        </td>
                        <td className="py-3.5 px-4 border-r border-[#002454]/15 text-center">
                          {cand.cv_url ? (
                            <a
                              href={`/api/v1/candidate/cv/${cand.id}`}
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
                        {/* Interviewed Checkbox Column (Synced to Database) */}
                        <td className="py-3.5 px-3 text-center">
                          <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => toggleInterviewed(cand.id)}
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
                              href={`/panelist/dashboard/evaluate/${cand.id}`}
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

            {/* Mobile Cards View (Optimized for Small Screens) */}
            <div className="block md:hidden flex flex-col gap-3">
              {sortedCandidates.map((cand, index) => {
                const isDone = Boolean(interviewedMap[cand.id]);
                return (
                  <div
                    key={cand.id}
                    className={`rounded-xl border-2 border-[#002454]/20 p-4 shadow-xs flex flex-col gap-3 transition-all ${
                      isDone
                        ? "bg-slate-200/90 text-slate-700 opacity-80"
                        : "bg-[#fbfdfe] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#002454]/15 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#002454]/60">#{index + 1}</span>
                        <span className="font-black text-xs text-[#002454] bg-[#002454]/10 border border-[#002454]/20 px-2 py-0.5 rounded tracking-wide">
                          Ref: {cand.student_id || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Mobile Interviewed Checkbox */}
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-[#002454]/20 shadow-xs">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleInterviewed(cand.id)}
                            className="w-4 h-4 accent-[#002454] cursor-pointer"
                          />
                          <span className={`text-[11px] font-black ${isDone ? "text-slate-700" : "text-[#002454]"}`}>
                            {isDone ? "Interviewed ✓" : "Interviewed?"}
                          </span>
                        </label>

                        {showPrefBadge && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-black ${
                              cand.preference_number === 1
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-400"
                                : "bg-[#f6c430]/25 text-[#7a5c00] border border-[#f6c430]/40"
                            }`}
                          >
                            <Tag size={10} /> Pref {cand.preference_number || 1}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Candidate Name, Email, Mobile - fully visible */}
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
                            onClick={() => handleCopyPhone(cand.id, cand.contact_number)}
                            title={copiedId === cand.id ? "Copied!" : "Copy mobile number"}
                            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black bg-[#002454]/10 hover:bg-[#33aeda] text-[#002454] hover:text-white transition-all border border-[#002454]/20 cursor-pointer"
                          >
                            {copiedId === cand.id ? (
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
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#002454]/70 block mb-0.5">Added Time</span>
                        <span className="font-bold text-[#002454]">{formatAddedTime(cand.preference_added_at || cand.created_at)}</span>
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
                          href={`/api/v1/candidate/cv/${cand.id}`}
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
                          href={`/panelist/dashboard/evaluate/${cand.id}`}
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
