import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

/** "10:15" or "10:15:00" -> "10:15:00"; returns null when unparseable. */
function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

/** GET /api/v1/admin/interview-schedule?studentId=230123A */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const studentId = new URL(request.url).searchParams.get("studentId")?.trim();
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT s.id, s.panel_number, s.interview_time, s.company_id,
              c.name AS company_name, c.logo_url
       FROM interview_schedule s
       JOIN companies c ON c.id = s.company_id
       WHERE s.student_id = $1
       ORDER BY s.interview_time ASC, c.name ASC`,
      [studentId],
    );
    return NextResponse.json({ success: true, schedule: result.rows });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json({ success: true, schedule: [] });
    }
    console.error("Admin interview schedule fetch error:", error);
    return NextResponse.json({ error: "Unable to load the schedule" }, { status: 500 });
  }
}

/** POST — assign a company + time + panel to a candidate. */
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: {
    studentId?: unknown;
    companyId?: unknown;
    panelNumber?: unknown;
    interviewTime?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
  const panelNumber = Number.parseInt(String(body.panelNumber), 10);
  const interviewTime = normalizeTime(body.interviewTime);

  if (!studentId) {
    return NextResponse.json(
      { error: "This candidate has no university ID set, so a schedule cannot be assigned." },
      { status: 400 },
    );
  }
  if (!uuidPattern.test(companyId)) {
    return NextResponse.json({ error: "Select a company" }, { status: 400 });
  }
  if (!Number.isInteger(panelNumber) || panelNumber < 1) {
    return NextResponse.json({ error: "Panel must be 1 or higher" }, { status: 400 });
  }
  if (!interviewTime) {
    return NextResponse.json({ error: "Select a valid interview time" }, { status: 400 });
  }

  try {
    const company = await query("SELECT id, name FROM companies WHERE id = $1", [companyId]);
    if (company.rowCount === 0) {
      return NextResponse.json({ error: "That company no longer exists" }, { status: 400 });
    }

    // The candidate cannot be in two places at once.
    const clash = await query(
      `SELECT c.name FROM interview_schedule s
       JOIN companies c ON c.id = s.company_id
       WHERE s.student_id = $1 AND s.interview_time = $2::time`,
      [studentId, interviewTime],
    );
    if ((clash.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { error: `This candidate already has an interview at that time (${clash.rows[0].name}).` },
        { status: 409 },
      );
    }

    // One panel can only see one candidate at a time.
    const panelClash = await query(
      `SELECT student_id FROM interview_schedule
       WHERE company_id = $1 AND panel_number = $2 AND interview_time = $3::time`,
      [companyId, panelNumber, interviewTime],
    );
    if ((panelClash.rowCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Panel ${panelNumber} already has ${panelClash.rows[0].student_id} at that time.`,
        },
        { status: 409 },
      );
    }

    const inserted = await query(
      `INSERT INTO interview_schedule (company_id, student_id, panel_number, interview_time)
       VALUES ($1, $2, $3, $4::time)
       RETURNING id, panel_number, interview_time, company_id`,
      [companyId, studentId, panelNumber, interviewTime],
    );

    return NextResponse.json({ success: true, entry: inserted.rows[0] });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "This candidate already has an interview with that company." },
        { status: 409 },
      );
    }
    if (code === "42P01") {
      return NextResponse.json(
        { error: "The interview_schedule table does not exist yet. Run the migration first." },
        { status: 500 },
      );
    }
    console.error("Admin interview schedule insert error:", error);
    return NextResponse.json({ error: "Unable to save the assignment" }, { status: 500 });
  }
}

/** DELETE /api/v1/admin/interview-schedule?id=<uuid> */
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "A valid entry id is required" }, { status: 400 });
  }

  try {
    const result = await query("DELETE FROM interview_schedule WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Admin interview schedule delete error:", error);
    return NextResponse.json({ error: "Unable to remove the assignment" }, { status: 500 });
  }
}
