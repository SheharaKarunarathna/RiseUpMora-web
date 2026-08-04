import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "company_coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateId, companyId, isInterviewed } = await req.json();

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    // 1. Resolve coordinator's company_id
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const companyRes = await query(
        `SELECT company_id FROM company_coordinators WHERE user_id = $1`,
        [session.user.id]
      );
      if (companyRes.rowCount && companyRes.rowCount > 0) {
        targetCompanyId = companyRes.rows[0].company_id;
      }
    }

    // 2. Update timeslot_bookings for this company & candidate
    if (targetCompanyId) {
      await query(
        `UPDATE timeslot_bookings
         SET is_interviewed = $1
         WHERE candidate_id = $2 AND company_id = $3::uuid`,
        [Boolean(isInterviewed), candidateId, targetCompanyId]
      );
    }

    // 3. Update candidates table for candidate
    await query(
      `UPDATE candidates
       SET is_interviewed = $1
       WHERE id = $2`,
      [Boolean(isInterviewed), candidateId]
    );

    return NextResponse.json({
      success: true,
      candidateId,
      companyId: targetCompanyId,
      isInterviewed: Boolean(isInterviewed),
    });
  } catch (error: any) {
    console.error("Error updating candidate interviewed status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
