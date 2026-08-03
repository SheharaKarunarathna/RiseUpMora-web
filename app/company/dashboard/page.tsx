import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import Image from "next/image";
import { Building2, Calendar, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import ScheduleManager from "./ScheduleManager";
import PreferenceTableClient from "./PreferenceTableClient";

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

      // Fetch all required data concurrently
      const [
        allocationsRes,
        allAllocationsRes,
        pref1Res,
        pref2Res,
        pref3Res,
        pref4Res,
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
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1 AND tb.preference_number = 1
           WHERE c.pref_1 = $1
           ORDER BY c.created_at ASC`,
          [companyId]
        ),
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1 AND tb.preference_number = 2
           WHERE c.pref_2 = $1
           ORDER BY c.created_at ASC`,
          [companyId]
        ),
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1 AND tb.preference_number = 3
           WHERE c.pref_3 = $1
           ORDER BY c.created_at ASC`,
          [companyId]
        ),
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1 AND tb.preference_number = 4
           WHERE c.pref_4 = $1
           ORDER BY c.created_at ASC`,
          [companyId]
        ),
        query(
          `SELECT c.id as candidate_id, u.name as candidate_name, u.email, c.student_id, c.created_at,
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

      pref1Candidates = pref1Res.rows;
      pref2Candidates = pref2Res.rows;
      pref3Candidates = pref3Res.rows;
      pref4Candidates = pref4Res.rows;
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
            <PreferenceTableClient title="1st Preference" candidates={pref1Candidates} prefNum={1} />
            <PreferenceTableClient title="2nd Preference" candidates={pref2Candidates} prefNum={2} />
            <PreferenceTableClient title="3rd Preference" candidates={pref3Candidates} prefNum={3} />
            <PreferenceTableClient title="4th Preference" candidates={pref4Candidates} prefNum={4} />
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

