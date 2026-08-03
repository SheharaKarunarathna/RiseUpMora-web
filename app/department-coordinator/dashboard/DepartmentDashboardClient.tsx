"use client";

import { useState } from "react";
import { Search, User, Mail, Phone, FileText, Download } from "lucide-react";
import * as XLSX from "xlsx";

type Candidate = {
  id: string;
  candidate_name: string;
  email: string;
  student_id: string;
  department: string;
  contact_number: string;
  cv_url: string;
  application_comment: string;
  created_at: string;
  pref_1_timeslot?: number | null;
  pref_2_timeslot?: number | null;
  pref_1_name?: string | null;
  pref_2_name?: string | null;
};

export default function DepartmentDashboardClient({
  initialCandidates,
  department,
}: {
  initialCandidates: Candidate[];
  department: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [slotFilter, setSlotFilter] = useState("");

  const filteredCandidates = initialCandidates.filter((cand) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (cand.candidate_name && cand.candidate_name.toLowerCase().includes(searchLower)) ||
      (cand.email && cand.email.toLowerCase().includes(searchLower)) ||
      (cand.student_id && cand.student_id.toLowerCase().includes(searchLower));

    const matchesSlot =
      !slotFilter ||
      (slotFilter === "none"
        ? !cand.pref_1_timeslot && !cand.pref_2_timeslot
        : String(cand.pref_1_timeslot) === slotFilter || String(cand.pref_2_timeslot) === slotFilter);

    return matchesSearch && matchesSlot;
  });

  const handleDownloadExcel = () => {
    const dataForExcel = filteredCandidates.map((cand) => ({
      "Name": cand.candidate_name,
      "Email": cand.email,
      "Index Number": cand.student_id,
      "Department": cand.department,
      "Contact Number": cand.contact_number,
      "Application Comment": cand.application_comment,
      "CV Uploaded": cand.cv_url ? "Yes" : "",
      "Applied On": new Date(cand.created_at).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
    XLSX.writeFile(workbook, `Candidates_${department}.xlsx`);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#002454]/10 p-6 shadow-sm flex flex-col justify-between min-h-[400px]">
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-[#002454]/5 pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#002454]">Candidates List</h3>
            <p className="text-sm text-[#002454]/60 mt-1">
              Showing candidates from {department}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002454]/40"
              />
              <input
                type="text"
                placeholder="Search by name, email, or index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#f8fcfe] border border-[#002454]/10 rounded-xl text-sm text-[#002454] focus:outline-none focus:ring-2 focus:ring-[#33aeda]/30 focus:border-[#33aeda] transition-all"
              />
            </div>

            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              className="py-2 px-3 bg-[#f8fcfe] border border-[#002454]/10 rounded-xl text-xs font-bold text-[#002454] focus:outline-none focus:ring-2 focus:ring-[#33aeda]/30 focus:border-[#33aeda]"
            >
              <option value="">All Time Slots</option>
              <option value="1">Slot 1 (10:00 - 11:00)</option>
              <option value="2">Slot 2 (11:00 - 12:00)</option>
              <option value="3">Slot 3 (1:30 - 2:30)</option>
              <option value="4">Slot 4 (2:30 - 3:30)</option>
              <option value="none">No Slot Selected</option>
            </select>

            <button
              onClick={handleDownloadExcel}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#002454] text-white rounded-xl text-sm font-medium hover:bg-[#002454]/90 transition-colors shrink-0"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#002454]/40">
            <User size={48} className="mb-3 text-[#002454]/20" />
            <p className="font-semibold">No candidates found.</p>
            {searchQuery && (
              <p className="text-sm mt-1">Try adjusting your search query.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[#002454]/5 text-xs font-extrabold uppercase text-[#002454]/50 tracking-wider">
                  <th className="pb-3 pr-2 w-10">#</th>
                  <th className="pb-3 pr-4">Candidate Information</th>
                  <th className="pb-3 px-4">Index Number</th>
                  <th className="pb-3 px-4">Applied Date</th>
                  <th className="pb-3 pl-4 text-right">CV</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((cand, index) => (
                  <tr
                    key={cand.id}
                    className="border-b border-[#002454]/5 last:border-b-0 hover:bg-[#f8fcfe] transition-colors"
                  >
                    <td className="py-4 pr-2 text-sm font-bold text-[#002454]/60">
                      {index + 1}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-bold text-sm text-[#002454] flex items-center gap-2">
                        <User size={14} className="text-[#33aeda]" />
                        {cand.candidate_name}
                      </div>
                      <div className="text-xs text-[#002454]/60 mt-1 flex items-center gap-2">
                        <Mail size={12} />
                        {cand.email}
                      </div>
                      {cand.contact_number && (
                        <div className="text-xs text-[#002454]/60 mt-1 flex items-center gap-2">
                          <Phone size={12} />
                          {cand.contact_number}
                        </div>
                      )}
                      {cand.application_comment && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-2 inline-block border border-amber-100">
                          <span className="font-semibold">Note:</span> {cand.application_comment}
                        </div>
                      )}
                      {(cand.pref_1_name || cand.pref_2_name) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          {cand.pref_1_name && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#002454]/5 px-1.5 py-0.5 font-medium text-[#002454]">
                              P1: {cand.pref_1_name} {cand.pref_1_timeslot ? `(Slot ${cand.pref_1_timeslot})` : ""}
                            </span>
                          )}
                          {cand.pref_2_name && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#002454]/5 px-1.5 py-0.5 font-medium text-[#002454]">
                              P2: {cand.pref_2_name} {cand.pref_2_timeslot ? `(Slot ${cand.pref_2_timeslot})` : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-sm text-[#002454]/80">
                        {cand.student_id || "N/A"}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-[#002454]/60">
                      {cand.created_at
                        ? new Date(cand.created_at).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="py-4 pl-4 text-right">
                      {cand.cv_url ? (
                        <a
                          href={`/api/v1/candidate/cv/${cand.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-[#33aeda]/10 hover:bg-[#33aeda]/20 px-3 py-2 text-xs font-bold text-[#1688b2] transition-colors"
                        >
                          <FileText size={14} />
                          View CV
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-400">
                          <FileText size={14} />
                          No CV
                        </span>
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
