import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getCandidateSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "candidate") return null;
  return session;
}

export async function GET() {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [candidateResult, companyResult] = await Promise.all([
      query(
        `SELECT u.name, u.email, c.contact_number, c.student_id,
                c.faculty, c.department, c.cv_url,
                c.pref_1, c.pref_2, c.pref_3, c.pref_4,
                c.application_comment
         FROM users u
         JOIN candidates c ON c.user_id = u.id
         WHERE u.id = $1`,
        [session.user.id],
      ),
      query("SELECT id, name FROM companies ORDER BY name ASC"),
    ]);

    if (candidateResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    const candidate = candidateResult.rows[0] as {
      name: string;
      email: string;
      contact_number: string;
      student_id: string;
      faculty: string;
      department: string;
      cv_url: string | null;
      pref_1: string | null;
      pref_2: string | null;
      pref_3: string | null;
      pref_4: string | null;
      application_comment: string | null;
    };

    return NextResponse.json({
      candidate: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.contact_number,
        studentId: candidate.student_id,
        faculty: candidate.faculty,
        department: candidate.department,
        cvUrl: candidate.cv_url,
        preferences: [
          candidate.pref_1,
          candidate.pref_2,
          candidate.pref_3,
          candidate.pref_4,
        ],
        comment: candidate.application_comment ?? "",
      },
      companies: companyResult.rows,
    });
  } catch (error: unknown) {
    console.error("Dashboard fetch error:", error);
    return NextResponse.json(
      { error: "Unable to load the dashboard" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    studentId?: unknown;
    faculty?: unknown;
    department?: unknown;
    preferences?: unknown;
    comment?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const faculty = typeof body.faculty === "string" ? body.faculty.trim() : "";
  const department = typeof body.department === "string" ? body.department.trim() : "";
  const rawPreferences = Array.isArray(body.preferences)
    ? body.preferences.map((value) => (typeof value === "string" ? value.trim() : ""))
    : [];
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Name cannot exceed 200 characters" }, { status: 400 });
  }
  if (phone.length > 50) {
    return NextResponse.json({ error: "Phone number is too long" }, { status: 400 });
  }
  if (studentId.length > 50) {
    return NextResponse.json({ error: "University ID is too long" }, { status: 400 });
  }
  if (faculty.length > 200) {
    return NextResponse.json({ error: "Faculty name is too long" }, { status: 400 });
  }
  if (department.length > 200) {
    return NextResponse.json({ error: "Department name is too long" }, { status: 400 });
  }

  const preferences: Array<string | null> = Array.from({ length: 4 }, (_, index) => {
    const pref = rawPreferences[index];
    return pref && uuidPattern.test(pref) ? pref : null;
  });

  for (let i = 0; i < rawPreferences.length && i < 4; i++) {
    const raw = rawPreferences[i];
    if (raw && !uuidPattern.test(raw)) {
      return NextResponse.json(
        { error: "Invalid company preference" },
        { status: 400 },
      );
    }
  }

  const selectedPrefs = preferences.filter((p): p is string => p !== null);

  if (new Set(selectedPrefs).size !== selectedPrefs.length) {
    return NextResponse.json(
      { error: "Each company preference must be different" },
      { status: 400 },
    );
  }

  if (comment.length > 2000) {
    return NextResponse.json(
      { error: "Comment cannot exceed 2,000 characters" },
      { status: 400 },
    );
  }

  if (selectedPrefs.length > 0) {
    const companyResult = await query(
      "SELECT id FROM companies WHERE id = ANY($1::uuid[])",
      [selectedPrefs],
    );
    if ((companyResult.rowCount ?? 0) !== selectedPrefs.length) {
      return NextResponse.json(
        { error: "One or more selected companies are unavailable" },
        { status: 400 },
      );
    }
  }

  try {
    await query(
      `UPDATE users
       SET name = $1
       WHERE id = $2`,
      [name, session.user.id],
    );

    await query(
      `UPDATE candidates
       SET contact_number = $1,
           student_id     = $2,
           faculty        = $3,
           department     = $4,
           pref_1         = $5,
           pref_2         = $6,
           pref_3         = $7,
           pref_4         = $8,
           application_comment = $9
       WHERE user_id = $10`,
      [
        phone || null,
        studentId || null,
        faculty || null,
        department || null,
        preferences[0],
        preferences[1],
        preferences[2],
        preferences[3],
        comment || null,
        session.user.id,
      ],
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: unknown) {
    console.error("Dashboard preferences update error:", error);
    return NextResponse.json(
      { error: "Unable to update preferences. Please try again." },
      { status: 500 },
    );
  }
}
