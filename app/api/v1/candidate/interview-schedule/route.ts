import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Returns the logged-in candidate's allocated interview slots.
 * Rows are matched on the student index number, which is how the schedule
 * was imported (see database/20260806_interview_schedule.sql).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(
      `SELECT s.panel_number,
              s.interview_time,
              c.name     AS company_name,
              c.logo_url AS logo_url
       FROM candidates cd
       JOIN interview_schedule s ON s.student_id = cd.student_id
       JOIN companies c          ON c.id = s.company_id
       WHERE cd.user_id = $1
       ORDER BY s.interview_time ASC, c.name ASC`,
      [session.user.id],
    );

    return NextResponse.json({ schedule: result.rows });
  } catch (error: unknown) {
    // 42P01 = undefined_table. The schedule migration has not been run yet,
    // so treat it as "no schedule" rather than failing the page.
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "42P01"
    ) {
      return NextResponse.json({ schedule: [] });
    }

    console.error("Interview schedule fetch error:", error);
    return NextResponse.json(
      { error: "Unable to load your interview schedule" },
      { status: 500 },
    );
  }
}
