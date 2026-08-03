import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import Image from "next/image";
import { Building2, Calendar, CheckCircle, Clock, FileText, UserCheck } from "lucide-react";
import ScheduleManager from "./ScheduleManager";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardOverview() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "company_coordinator") {
    redirect("/");
  }

  let companyName = "No Company Linked";
  let companyLogo = "";
  let companyId = null;
  let totalAllocations = 0;
  let pendingAllocations = 0;
  let approvedAllocations = 0;
  let allAllocations: any[] = [];
  let interestedCandidates: any[] = [];
  let slot1Candidates: any[] = [];
  let slot2Candidates: any[] = [];
  let slot3Candidates: any[] = [];

  try {
    // 1. Get coordinator's company info
    const companyRes = await query(
      `SELECT c.id, c.name, c.logo_url
       FROM company_coordinators cc
       JOIN companies c ON cc.company_id = c.id
       WHERE cc.user_id = $1`,
      [session.user.id]
    );

    if (companyRes.rowCount && companyRes.rowCount > 0) {
      const company = companyRes.rows[0];
      companyName = company.name;
      companyLogo = company.logo_url;
      companyId = company.id;

      // Fetch required data concurrently
      const [
        allocationsRes,
        allAllocationsRes,
        interestedRes
      ] = await Promise.all([
        query(
          `SELECT status, COUNT(*) as count
           FROM allocations
           WHERE company_id = $1
           GROUP BY status`,
          [companyId]
        ),
        query(
          `SELECT a.id, a.candidate_id, u.name as candidate_name, c.student_id, a.interview_date, a.time_slot, a.status
           FROM allocations a
           JOIN candidates c ON a.candidate_id = c.id
           JOIN users u ON c.user_id = u.id
           WHERE a.company_id = $1`,
          [companyId]
        ),
        query(
          `SELECT c.id as candidate_id, c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at, c.preferred_time_slot,
                  CASE 
                    WHEN c.pref_1 = $1 THEN 1
                    WHEN c.pref_2 = $1 THEN 2
                    WHEN c.pref_3 = $1 THEN 3
                    WHEN c.pref_4 = $1 THEN 4
                  END as preference_num
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           WHERE c.pref_1 = $1 OR c.pref_2 = $1 OR c.pref_3 = $1 OR c.pref_4 = $1
           ORDER BY preference_num ASC, c.created_at ASC`,
          [companyId]
        )
      ]);

      allocationsRes.rows.forEach((row: any) => {
        const count = parseInt(row.count, 10);
        totalAllocations += count;
        if (row.status === "0") {
          pendingAllocations += count;
        } else if (row.status === "1" || row.status === "ONGOING") {
          approvedAllocations += count;
        }
      });

      allAllocations = allAllocationsRes.rows;

      // Sort allocations chronologically by date and time in JS
      const parse12hToMinutes = (timeSlotStr: string) => {
        const startPart = timeSlotStr.split(" - ")[0];
        const match = startPart.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let hrs = Number(match[1]);
        const mns = Number(match[2]);
        const period = match[3].toUpperCase();
        if (period === "PM" && hrs < 12) hrs += 12;
        if (period === "AM" && hrs === 12) hrs = 0;
        return hrs * 60 + mns;
      };

      allAllocations.sort((a: any, b: any) => {
        const dateA = new Date(a.interview_date).getTime();
        const dateB = new Date(b.interview_date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return parse12hToMinutes(a.time_slot) - parse12hToMinutes(b.time_slot);
      });

      interestedCandidates = interestedRes.rows;

      // Filter and sort candidates for each of the 3 time slots
      // Primary sort: preference_num ASC (1 > 2 > 3 > 4)
      // Secondary sort: created_at ASC (first come first served)
      const sortCandidates = (list: any[]) =>
        [...list].sort((a, b) => {
          const prefDiff = (a.preference_num || 99) - (b.preference_num || 99);
          if (prefDiff !== 0) return prefDiff;
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });

      slot1Candidates = sortCandidates(
        interestedCandidates.filter(
          (c) =>
            !c.preferred_time_slot ||
            c.preferred_time_slot.includes("08:00") ||
            c.preferred_time_slot.includes("Slot 1")
        )
      );

      slot2Candidates = sortCandidates(
        interestedCandidates.filter(
          (c) =>
            c.preferred_time_slot &&
            (c.preferred_time_slot.includes("11:00") ||
              c.preferred_time_slot.includes("Slot 2"))
        )
      );

      slot3Candidates = sortCandidates(
        interestedCandidates.filter(
          (c) =>
            c.preferred_time_slot &&
            (c.preferred_time_slot.includes("02:00") ||
              c.preferred_time_slot.includes("14:00") ||
              c.preferred_time_slot.includes("Slot 3"))
        )
      );
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Welcome & Company Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#002454] to-[#0d3b66] p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <Building2 size={240} />
        </div>
        <div className="relative z-10">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#f6c430]">
            Company Portal Overview
          </span>
          <h1 className="text-3xl font-extrabold mt-1">
            Welcome back, {session.user.name || "Coordinator"}
          </h1>
          <p className="text-[#33aeda] font-semibold text-sm mt-1">
            Managing allocations for {companyName}
          </p>
        </div>
        {companyLogo && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center justify-center relative z-10 h-16 w-32 shadow-inner">
            <img
              src={companyLogo}
              alt={companyName}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px] hover:shadow-md">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Total Interested Candidates
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#002454]">
              {interestedCandidates.length}
            </p>
          </div>
          <div className="p-3 bg-[#33aeda]/10 text-[#1688b2] rounded-xl">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px] hover:shadow-md">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Approved Allocations
            </p>
            <p className="mt-2 text-3xl font-extrabold text-green-600">
              {approvedAllocations}
            </p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px] hover:shadow-md">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Pending Allocations
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#bf8500]">
              {pendingAllocations}
            </p>
          </div>
          <div className="p-3 bg-[#bf8500]/10 text-[#bf8500] rounded-xl">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Always-Visible 3 Time Slot Preference Tables */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#002454]">Candidate Time Slot Preferences</h2>
          <p className="text-xs text-[#002454]/60 mt-1">
            Students who chose {companyName}, categorized into three time slots. Ranked by <span className="font-bold text-[#002454]">Preference Number</span> (1st preference first) and <span className="font-bold text-[#002454]">Selection Time</span> (First come, first served).
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <TimeSlotTable
            slotName="Time Slot 1 (08:00 AM - 11:00 AM)"
            badgeColor="bg-blue-50 text-blue-700 border-blue-200"
            candidates={slot1Candidates}
          />
          <TimeSlotTable
            slotName="Time Slot 2 (11:00 AM - 02:00 PM)"
            badgeColor="bg-amber-50 text-amber-700 border-amber-200"
            candidates={slot2Candidates}
          />
          <TimeSlotTable
            slotName="Time Slot 3 (02:00 PM - 05:00 PM)"
            badgeColor="bg-purple-50 text-purple-700 border-purple-200"
            candidates={slot3Candidates}
          />
        </div>
      </div>

      {/* Main Dashboard / Schedule Manager Section */}
      <div className="w-full">
        <ScheduleManager
          initialAllocations={allAllocations}
          interestedCandidates={interestedCandidates}
        />
      </div>
    </div>
  );
}

function TimeSlotTable({
  slotName,
  badgeColor,
  candidates,
}: {
  slotName: string;
  badgeColor: string;
  candidates: any[];
}) {
  const getPrefBadge = (prefNum: number) => {
    switch (prefNum) {
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            1st Preference
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
            2nd Preference
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
            3rd Preference
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
            4th Preference
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#002454]/10 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[#002454]/10 pb-4">
          <div className="flex items-center gap-3">
            <Clock className="text-[#33aeda]" size={22} />
            <h3 className="text-lg font-extrabold text-[#002454]">{slotName}</h3>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border ${badgeColor}`}>
            {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
          </span>
        </div>

        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#002454]/40">
            <Building2 size={36} className="mb-2 text-[#002454]/20" />
            <p className="font-semibold text-sm">No candidates selected this time slot.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#002454]/10 text-[10px] font-extrabold uppercase text-[#002454]/50 tracking-wider">
                  <th className="pb-3 pr-2 w-10">#</th>
                  <th className="pb-3 pr-4">Candidate</th>
                  <th className="pb-3 px-4">Preference Rank</th>
                  <th className="pb-3 px-4">Index Number</th>
                  <th className="pb-3 px-4">Department</th>
                  <th className="pb-3 px-4">Selection Time</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand, index) => (
                  <tr key={cand.id || cand.candidate_id || index} className="border-b border-[#002454]/5 last:border-b-0 hover:bg-[#f8fcfe] transition-colors">
                    <td className="py-3.5 pr-2 text-xs font-bold text-[#002454]/60">
                      #{index + 1}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-sm text-[#002454] truncate max-w-[180px]" title={cand.candidate_name}>
                        {cand.candidate_name}
                      </div>
                      <div className="text-xs text-[#002454]/50 mt-0.5 truncate max-w-[180px]" title={cand.email}>
                        {cand.email}
                      </div>
                      {cand.contact_number && (
                        <div className="text-[11px] text-[#002454]/70 mt-1 font-semibold flex items-center gap-1">
                          <span>📞</span> <span>{cand.contact_number}</span>
                        </div>
                      )}
                      {cand.application_comment && (
                        <div
                          className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-2 py-0.5 mt-1.5 inline-block max-w-[180px] truncate"
                          title={cand.application_comment}
                        >
                          Comment: {cand.application_comment}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPrefBadge(cand.preference_num)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-xs text-[#002454]/80">
                        {cand.student_id || "N/A"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-[#002454]/70 font-medium truncate max-w-[140px]" title={cand.department}>
                        {cand.department}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#002454]/60 whitespace-nowrap">
                      {cand.created_at
                        ? new Date(cand.created_at).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "N/A"}
                    </td>
                    <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                      {cand.cv_url ? (
                        <a
                          href={`/api/v1/candidate/cv/${cand.id || cand.candidate_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#33aeda]/10 hover:bg-[#33aeda]/20 px-3 py-1.5 text-xs font-bold text-[#1688b2] transition-colors"
                        >
                          View CV
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

