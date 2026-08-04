import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import Image from "next/image";
import { Building2, Calendar, CheckCircle, Clock, Layers } from "lucide-react";
import Link from "next/link";
import PreferenceTableClient from "./PreferenceTableClient";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardOverview(props: {
  searchParams: Promise<{ view?: string }>;
}) {
  const searchParams = await props.searchParams;
  const viewMode = searchParams.view || "timeslot"; // 'timeslot' (default 4 tables) or 'preference'
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "company_coordinator") {
    redirect("/");
  }

  let companyName = "No Company Linked";
  let companyLogo = "";
  let companyId = null;

  let slot1Candidates: any[] = [];
  let slot2Candidates: any[] = [];
  let slot3Candidates: any[] = [];
  let slot4Candidates: any[] = [];
  let unassignedCandidates: any[] = [];

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

      // Fetch all required candidate datasets concurrently
      const [
        slot1Res,
        slot2Res,
        slot3Res,
        slot4Res,
        unassignedRes,
        pref1Res,
        pref2Res,
        pref3Res,
        pref4Res
      ] = await Promise.all([
        // Slot 1: 10:00 AM – 11:00 AM (Priority: Pref 1 first, ordered by time added)
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                  tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                  COALESCE(tb.created_at, c.created_at) as preference_added_at,
                  c.created_at
           FROM timeslot_bookings tb
           JOIN candidates c ON tb.candidate_id = c.id
           JOIN users u ON c.user_id = u.id
           WHERE tb.company_id = $1::uuid AND tb.slot_number = 1
           ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Slot 2: 11:00 AM – 12:00 PM (Priority: Pref 1 first, ordered by time added)
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                  tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                  COALESCE(tb.created_at, c.created_at) as preference_added_at,
                  c.created_at
           FROM timeslot_bookings tb
           JOIN candidates c ON tb.candidate_id = c.id
           JOIN users u ON c.user_id = u.id
           WHERE tb.company_id = $1::uuid AND tb.slot_number = 2
           ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Slot 3: 1:30 PM – 2:30 PM (Priority: Pref 1 first, ordered by time added)
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                  tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                  COALESCE(tb.created_at, c.created_at) as preference_added_at,
                  c.created_at
           FROM timeslot_bookings tb
           JOIN candidates c ON tb.candidate_id = c.id
           JOIN users u ON c.user_id = u.id
           WHERE tb.company_id = $1::uuid AND tb.slot_number = 3
           ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Slot 4: 2:30 PM – 3:30 PM (Priority: Pref 1 first, ordered by time added)
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                  tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                  COALESCE(tb.created_at, c.created_at) as preference_added_at,
                  c.created_at
           FROM timeslot_bookings tb
           JOIN candidates c ON tb.candidate_id = c.id
           JOIN users u ON c.user_id = u.id
           WHERE tb.company_id = $1::uuid AND tb.slot_number = 4
           ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Unassigned / Candidates without fixed slot
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                  tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                  COALESCE(tb.created_at, c.created_at) as preference_added_at,
                  c.created_at
           FROM timeslot_bookings tb
           JOIN candidates c ON tb.candidate_id = c.id
           JOIN users u ON c.user_id = u.id
           WHERE tb.company_id = $1::uuid AND (tb.slot_number IS NULL OR tb.no_timeslot_selected = TRUE)
           ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Preferences 1
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected, COALESCE(tb.created_at, c.created_at) as preference_added_at
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 1
           WHERE c.pref_1 = $1::text
           ORDER BY COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Preferences 2
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected, COALESCE(tb.created_at, c.created_at) as preference_added_at
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 2
           WHERE c.pref_2 = $1::text
           ORDER BY COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Preferences 3
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected, COALESCE(tb.created_at, c.created_at) as preference_added_at
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 3
           WHERE c.pref_3 = $1::text
           ORDER BY COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        ),
        // Preferences 4
        query(
          `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                  tb.slot_number, tb.no_timeslot_selected, COALESCE(tb.created_at, c.created_at) as preference_added_at
           FROM candidates c
           JOIN users u ON c.user_id = u.id
           LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 4
           WHERE c.pref_4 = $1::text
           ORDER BY COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
          [companyId]
        )
      ]);

      slot1Candidates = slot1Res.rows;
      slot2Candidates = slot2Res.rows;
      slot3Candidates = slot3Res.rows;
      slot4Candidates = slot4Res.rows;
      unassignedCandidates = unassignedRes.rows;

      pref1Candidates = pref1Res.rows;
      pref2Candidates = pref2Res.rows;
      pref3Candidates = pref3Res.rows;
      pref4Candidates = pref4Res.rows;
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }

  const totalCandidateCount =
    slot1Candidates.length +
    slot2Candidates.length +
    slot3Candidates.length +
    slot4Candidates.length +
    unassignedCandidates.length;

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
            Candidate Application Dashboard for {companyName}
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

      {/* Overview Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Total Applicants
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#002454]">
              {totalCandidateCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#33aeda]/10 text-[#1688b2]">
            <Building2 size={24} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              1st Preference Applicants
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">
              {pref1Candidates.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* 4 Time Slot Tables Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#002454]/10 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#002454]">
              Candidate Applications per Time Slot
            </h2>
            <p className="text-xs text-[#002454]/60">
              Priority is given to 1st Preference candidates, ordered chronologically by application time (FCFS).
            </p>
          </div>

          {/* View Mode Switch */}
          <div className="flex items-center bg-[#f8fcfe] border border-[#002454]/10 p-1 rounded-xl">
            <Link
              href="/company/dashboard?view=timeslot"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "timeslot"
                  ? "bg-[#002454] text-white shadow-sm"
                  : "text-[#002454]/60 hover:text-[#002454]"
              }`}
            >
              <Clock size={13} /> 4 Time Slot Tables
            </Link>
            <Link
              href="/company/dashboard?view=preference"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "preference"
                  ? "bg-[#002454] text-white shadow-sm"
                  : "text-[#002454]/60 hover:text-[#002454]"
              }`}
            >
              <Layers size={13} /> 4 Preference Tables
            </Link>
          </div>
        </div>

        {viewMode === "timeslot" ? (
          <div className="flex flex-col gap-8">
            {/* The 4 Time Slot Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <PreferenceTableClient
                title="Slot 1 (10:00 AM – 11:00 AM)"
                subtitle="Candidates who selected Time Slot 1 (Pref 1 priority, then FCFS)"
                candidates={slot1Candidates}
                slotNum={1}
                showPrefBadge={true}
              />
              <PreferenceTableClient
                title="Slot 2 (11:00 AM – 12:00 PM)"
                subtitle="Candidates who selected Time Slot 2 (Pref 1 priority, then FCFS)"
                candidates={slot2Candidates}
                slotNum={2}
                showPrefBadge={true}
              />
              <PreferenceTableClient
                title="Slot 3 (1:30 PM – 2:30 PM)"
                subtitle="Candidates who selected Time Slot 3 (Pref 1 priority, then FCFS)"
                candidates={slot3Candidates}
                slotNum={3}
                showPrefBadge={true}
              />
              <PreferenceTableClient
                title="Slot 4 (2:30 PM – 3:30 PM)"
                subtitle="Candidates who selected Time Slot 4 (Pref 1 priority, then FCFS)"
                candidates={slot4Candidates}
                slotNum={4}
                showPrefBadge={true}
              />
            </div>

            {unassignedCandidates.length > 0 && (
              <div className="w-full">
                <PreferenceTableClient
                  title="No Fixed Time Slot (3rd & 4th Preferences)"
                  subtitle="Candidates who selected this company as 3rd or 4th preference without a specific time slot"
                  candidates={unassignedCandidates}
                  showPrefBadge={true}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <PreferenceTableClient
              title="1st Preference"
              candidates={pref1Candidates}
              prefNum={1}
              showSlotFilter={true}
            />
            <PreferenceTableClient
              title="2nd Preference"
              candidates={pref2Candidates}
              prefNum={2}
              showSlotFilter={true}
            />
            <PreferenceTableClient
              title="3rd Preference"
              candidates={pref3Candidates}
              prefNum={3}
            />
            <PreferenceTableClient
              title="4th Preference"
              candidates={pref4Candidates}
              prefNum={4}
            />
          </div>
        )}
      </div>
    </div>
  );
}
