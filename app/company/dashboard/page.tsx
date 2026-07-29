import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import Image from "next/image";
import { Building2, Calendar, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import ScheduleManager from "./ScheduleManager";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardOverview(props: {
  searchParams: Promise<{ show?: string }>;
}) {
  const searchParams = await props.searchParams;
  const showPreferences = searchParams.show === "preferences";
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
  let pref1Candidates: any[] = [];
  let pref2Candidates: any[] = [];
  let pref3Candidates: any[] = [];
  let pref4Candidates: any[] = [];

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

      // 2. Get allocations count grouped by status
      const allocationsRes = await query(
        `SELECT status, COUNT(*) as count
         FROM allocations
         WHERE company_id = $1
         GROUP BY status`,
        [companyId]
      );

      allocationsRes.rows.forEach((row: any) => {
        const count = parseInt(row.count, 10);
        totalAllocations += count;
        if (row.status === "0") {
          pendingAllocations += count;
        } else if (row.status === "1" || row.status === "ONGOING") {
          approvedAllocations += count;
        }
      });

      // 3. Fetch all allocations for the scheduler
      const allAllocationsRes = await query(
        `SELECT a.id, a.candidate_id, u.name as candidate_name, a.interview_date, a.time_slot, a.status
         FROM allocations a
         JOIN candidates c ON a.candidate_id = c.id
         JOIN users u ON c.user_id = u.id
         WHERE a.company_id = $1`,
        [companyId]
      );
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

      // 4. Fetch candidates for each preference level (ordered by created_at ASC for first apply, first serve)
      const pref1Res = await query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         WHERE c.pref_1 = $1
         ORDER BY c.created_at ASC`,
        [companyId]
      );
      pref1Candidates = pref1Res.rows;

      const pref2Res = await query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         WHERE c.pref_2 = $1
         ORDER BY c.created_at ASC`,
        [companyId]
      );
      pref2Candidates = pref2Res.rows;

      const pref3Res = await query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         WHERE c.pref_3 = $1
         ORDER BY c.created_at ASC`,
        [companyId]
      );
      pref3Candidates = pref3Res.rows;

      const pref4Res = await query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         WHERE c.pref_4 = $1
         ORDER BY c.created_at ASC`,
        [companyId]
      );
      pref4Candidates = pref4Res.rows;

      // 5. Fetch all interested candidates with preference numbers
      const interestedRes = await query(
        `SELECT c.id as candidate_id, u.name as candidate_name, u.email, c.created_at,
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
      );
      interestedCandidates = interestedRes.rows;
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
            Portal Overview
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
        <Link
          href={showPreferences ? "/company/dashboard" : "/company/dashboard?show=preferences"}
          className={`rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px] hover:shadow-md cursor-pointer group ${
            showPreferences
              ? "border-[#33aeda] ring-2 ring-[#33aeda]/10"
              : "border-[#002454]/10"
          }`}
        >
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Total Candidates
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#002454]">
              {pref1Candidates.length + pref2Candidates.length + pref3Candidates.length + pref4Candidates.length}
            </p>
            <span className="text-[10px] text-[#33aeda] font-bold block mt-1 group-hover:underline">
              {showPreferences ? "Click to hide tables" : "Click to view tables"}
            </span>
          </div>
          <div className={`p-3 rounded-xl transition-all ${
            showPreferences
              ? "bg-[#33aeda] text-white"
              : "bg-[#33aeda]/10 text-[#1688b2] group-hover:bg-[#33aeda] group-hover:text-white"
          }`}>
            <Building2 size={22} />
          </div>
        </Link>

        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px] hover:shadow-md">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Approved
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
              Pending Action
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

      {/* Candidate Preferences Section */}
      {showPreferences && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#002454]">Candidate Preferences</h2>
            <p className="text-xs text-[#002454]/60">
              Candidates who selected {companyName} sorted by application time (first applied, first served).
            </p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <PreferenceTable title="1st Preference" candidates={pref1Candidates} />
            <PreferenceTable title="2nd Preference" candidates={pref2Candidates} />
            <PreferenceTable title="3rd Preference" candidates={pref3Candidates} />
            <PreferenceTable title="4th Preference" candidates={pref4Candidates} />
          </div>
        </div>
      )}

      {/* Main Dashboard Section */}
      <div className="w-full">
        <ScheduleManager
          initialAllocations={allAllocations}
          interestedCandidates={interestedCandidates}
        />
      </div>
    </div>
  );
}

function PreferenceTable({
  title,
  candidates,
}: {
  title: string;
  candidates: any[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#002454]/10 p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-[#002454]/5 pb-3">
          <h3 className="text-lg font-bold text-[#002454]">{title}</h3>
          <span className="inline-flex items-center rounded-full bg-[#33aeda]/10 px-2.5 py-0.5 text-xs font-bold text-[#1688b2]">
            {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
          </span>
        </div>

        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#002454]/40">
            <Building2 size={40} className="mb-2 text-[#002454]/20" />
            <p className="font-semibold text-sm">No candidates selected this preference.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#002454]/5 text-[10px] font-extrabold uppercase text-[#002454]/50 tracking-wider">
                  <th className="pb-2.5 pr-2 w-10">#</th>
                  <th className="pb-2.5 pr-4">Candidate</th>
                  <th className="pb-2.5 px-4">Student ID / Dept</th>
                  <th className="pb-2.5 px-4">Applied Date</th>
                  <th className="pb-2.5 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand, index) => (
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
                      <div className="text-[10px] text-[#002454]/50 mt-0.5 truncate max-w-[100px]" title={cand.department}>
                        {cand.department}
                      </div>
                    </td>
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

