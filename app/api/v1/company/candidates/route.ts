import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
  }

  try {
    const res = await query(
      `SELECT c.id as candidate_id, u.name as candidate_name, u.email, c.student_id,
              c.faculty, c.department, c.contact_number, c.cv_url, c.application_comment,
              tb.preference_number, tb.slot_number, tb.no_timeslot_selected,
              c.created_at
       FROM timeslot_bookings tb
       JOIN candidates c ON tb.candidate_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE tb.company_id = $1
       ORDER BY tb.preference_number ASC, tb.slot_number ASC NULLS LAST, u.name ASC`,
      [companyId]
    );

    return NextResponse.json({ success: true, candidates: res.rows });
  } catch (error: any) {
    console.error("Error fetching company candidates:", error);
    return NextResponse.json({ error: "Failed to fetch company candidates" }, { status: 500 });
  }
}
