"use client";

import { useState } from "react";
import { Building2, ChevronDown, Clock } from "lucide-react";

export default function PreferenceTableClient({
  title,
  candidates,
  prefNum,
}: {
  title: string;
  candidates: any[];
  prefNum: number;
}) {
  const [slotFilter, setSlotFilter] = useState("");

  const filteredCandidates = candidates.filter((cand) => {
    if (!slotFilter) return true;
    if (slotFilter === "none") return !cand.slot_number;
    return String(cand.slot_number) === slotFilter;
  });

  const getSlotBadge = (slotNum: number | null) => {
    if (slotNum === 1) return "Slot 1 (10:00 AM – 11:30 AM)";
    if (slotNum === 2) return "Slot 2 (11:45 AM – 1:00 PM)";
    if (slotNum === 3) return "Slot 3 (2:00 PM – 4:00 PM)";
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#002454]/10 p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[#002454]/5 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#002454]">{title}</h3>
            <span className="inline-flex items-center rounded-full bg-[#33aeda]/10 px-2.5 py-0.5 text-xs font-bold text-[#1688b2]">
              {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
            </span>
          </div>

          {(prefNum === 1 || prefNum === 2) && candidates.length > 0 && (
            <div className="relative">
              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value)}
                className="appearance-none rounded-xl border border-[#002454]/10 bg-[#f8fcfe] py-1.5 pl-3 pr-7 text-xs font-bold text-[#002454] outline-none focus:border-[#33aeda]"
              >
                <option value="">All Time Slots</option>
                <option value="1">Slot 1 (10:00 - 11:30)</option>
                <option value="2">Slot 2 (11:45 - 1:00)</option>
                <option value="3">Slot 3 (2:00 - 4:00)</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            </div>
          )}
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#002454]/40">
            <Building2 size={40} className="mb-2 text-[#002454]/20" />
            <p className="font-semibold text-sm">
              {slotFilter ? "No candidates found for this time slot." : "No candidates selected this preference."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#002454]/5 text-[10px] font-extrabold uppercase text-[#002454]/50 tracking-wider">
                  <th className="pb-2.5 pr-2 w-10">#</th>
                  <th className="pb-2.5 pr-4">Candidate</th>
                  <th className="pb-2.5 px-4">Index Number</th>
                  <th className="pb-2.5 px-4">Department</th>
                  {(prefNum === 1 || prefNum === 2) && <th className="pb-2.5 px-4">Time Slot</th>}
                  <th className="pb-2.5 px-4">Applied Date</th>
                  <th className="pb-2.5 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((cand, index) => (
                  <tr key={cand.id} className="border-b border-[#002454]/5 last:border-b-0 hover:bg-[#f8fcfe]">
                    <td className="py-3 pr-2 text-xs font-bold text-[#002454]/60">
                      #{index + 1}
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
                    <td className="py-3 px-4">
                      <div className="font-semibold text-xs text-[#002454]/80">
                        {cand.student_id || "N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[10px] text-[#002454]/50 mt-0.5 truncate max-w-[100px]" title={cand.department}>
                        {cand.department}
                      </div>
                    </td>
                    {(prefNum === 1 || prefNum === 2) && (
                      <td className="py-3 px-4">
                        {cand.slot_number ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#1688b2]/10 px-2 py-0.5 text-[11px] font-bold text-[#1688b2]">
                            <Clock size={11} /> Slot {cand.slot_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 italic">No slot</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-xs font-semibold text-[#002454]/60">
                      {cand.created_at
                        ? new Date(cand.created_at).toLocaleDateString()
                        : "N/A"}
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
