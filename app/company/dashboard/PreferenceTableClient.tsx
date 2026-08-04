"use client";

import { useState } from "react";
import { Building2, ChevronDown, Clock, Tag } from "lucide-react";

export default function PreferenceTableClient({
  title,
  candidates,
  prefNum,
  slotNum,
  showSlotFilter = false,
  showPrefBadge = false,
  subtitle,
}: {
  title: string;
  candidates: any[];
  prefNum?: number;
  slotNum?: number;
  showSlotFilter?: boolean;
  showPrefBadge?: boolean;
  subtitle?: string;
}) {
  const [slotFilter, setSlotFilter] = useState("");

  const filteredCandidates = candidates.filter((cand) => {
    if (!slotFilter) return true;
    if (slotFilter === "none") return !cand.slot_number;
    return String(cand.slot_number) === slotFilter;
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

  return (
    <div className="bg-white rounded-2xl border border-[#002454]/10 p-6 shadow-sm flex flex-col justify-between min-h-[320px]">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[#002454]/5 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#002454]">{title}</h3>
              <span className="inline-flex items-center rounded-full bg-[#33aeda]/10 px-2.5 py-0.5 text-xs font-bold text-[#1688b2]">
                {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-[#002454]/50 mt-0.5 font-medium">{subtitle}</p>
            )}
          </div>

          {showSlotFilter && candidates.length > 0 && (
            <div className="relative">
              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value)}
                className="appearance-none rounded-xl border border-[#002454]/10 bg-[#f8fcfe] py-1.5 pl-3 pr-7 text-xs font-bold text-[#002454] outline-none focus:border-[#33aeda]"
              >
                <option value="">All Time Slots</option>
                <option value="1">Slot 1 (10:00 - 11:00)</option>
                <option value="2">Slot 2 (11:00 - 12:00)</option>
                <option value="3">Slot 3 (1:30 - 2:30)</option>
                <option value="4">Slot 4 (2:30 - 3:30)</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            </div>
          )}
        </div>

        {sortedCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#002454]/40">
            <Building2 size={40} className="mb-2 text-[#002454]/20" />
            <p className="font-semibold text-sm">
              {slotFilter ? "No candidates found for this time slot." : "No candidates registered for this section."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#002454]/5 text-[10px] font-extrabold uppercase text-[#002454]/50 tracking-wider">
                  <th className="pb-2.5 pr-2 w-10">#</th>
                  <th className="pb-2.5 px-3">Ref No.</th>
                  <th className="pb-2.5 pr-4">Candidate</th>
                  <th className="pb-2.5 px-3">Department</th>
                  {showPrefBadge && <th className="pb-2.5 px-3">Preference</th>}
                  {showSlotFilter && <th className="pb-2.5 px-3">Time Slot</th>}
                  <th className="pb-2.5 px-3">Added Time</th>
                  <th className="pb-2.5 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCandidates.map((cand, index) => (
                  <tr key={cand.id} className="border-b border-[#002454]/5 last:border-b-0 hover:bg-[#f8fcfe]">
                    <td className="py-3 pr-2 text-xs font-bold text-[#002454]/60">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-xs text-[#002454] bg-[#002454]/5 px-2 py-0.5 rounded inline-block">
                        {cand.student_id || "N/A"}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-bold text-sm text-[#002454] truncate max-w-[150px]" title={cand.candidate_name}>
                        {cand.candidate_name}
                      </div>
                      <div className="text-xs text-[#002454]/50 mt-0.5 truncate max-w-[150px]" title={cand.email}>
                        {cand.email}
                      </div>
                      {cand.contact_number && (
                        <div className="text-[11px] text-[#002454]/70 mt-1 font-semibold flex items-center gap-1">
                          <span>📞</span> <span>{cand.contact_number}</span>
                        </div>
                      )}
                      {cand.application_comment && (
                        <div
                          className="text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 mt-1.5 inline-block max-w-[150px] truncate"
                          title={cand.application_comment}
                        >
                          Comment: {cand.application_comment}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-xs font-semibold text-[#002454]/70 truncate max-w-[110px]" title={cand.department}>
                        {cand.department}
                      </div>
                    </td>
                    {showPrefBadge && (
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          cand.preference_number === 1
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-[#f6c430]/20 text-[#8a6b00]"
                        }`}>
                          <Tag size={10} /> Pref {cand.preference_number || (cand.pref_1 === cand.company_id ? 1 : cand.pref_2 === cand.company_id ? 2 : cand.pref_3 === cand.company_id ? 3 : 4)}
                        </span>
                      </td>
                    )}
                    {showSlotFilter && (
                      <td className="py-3 px-3">
                        {cand.slot_number ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#1688b2]/10 px-2 py-0.5 text-[11px] font-bold text-[#1688b2]">
                            <Clock size={11} /> Slot {cand.slot_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 italic">No slot</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-3 text-xs font-semibold text-[#002454]/70">
                      {formatAddedTime(cand.preference_added_at || cand.created_at)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {cand.cv_url ? (
                        <a
                          href={`/api/v1/candidate/cv/${cand.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#33aeda]/10 hover:bg-[#33aeda]/20 px-2.5 py-1.5 text-xs font-bold text-[#1688b2] transition-colors"
                        >
                          CV
                        </a>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">No CV</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
