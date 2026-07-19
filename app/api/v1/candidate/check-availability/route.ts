import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type AvailabilityBody = {
  email?: unknown;
  studentId?: unknown;
};

export async function POST(request: Request) {
  let body: AvailabilityBody;
  try {
    body = (await request.json()) as AvailabilityBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const studentId =
    typeof body.studentId === "string" ? body.studentId.trim().toUpperCase() : "";

  if (!email && !studentId) {
    return NextResponse.json(
      { error: "Email or university ID is required" },
      { status: 400 },
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  if (studentId && !/^\d{6}[A-Z]$/.test(studentId)) {
    return NextResponse.json({ error: "Invalid university ID" }, { status: 400 });
  }

  try {
    const [emailResult, studentIdResult] = await Promise.all([
      email
        ? query("SELECT EXISTS (SELECT 1 FROM users WHERE LOWER(email) = $1) AS exists", [email])
        : Promise.resolve(null),
      studentId
        ? query("SELECT EXISTS (SELECT 1 FROM candidates WHERE UPPER(student_id) = $1) AS exists", [studentId])
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      emailExists: emailResult ? Boolean(emailResult.rows[0]?.exists) : false,
      studentIdExists: studentIdResult
        ? Boolean(studentIdResult.rows[0]?.exists)
        : false,
    });
  } catch (error: unknown) {
    console.error("Candidate availability check error:", error);
    return NextResponse.json(
      { error: "Unable to check availability" },
      { status: 500 },
    );
  }
}
