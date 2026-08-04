import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  isDepartmentForFaculty,
  isFaculty,
} from "@/lib/candidate-options";
import { sendCandidateVerificationEmail } from "@/utils/email";

export const runtime = "nodejs";

type SignupBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  faculty?: unknown;
  department?: unknown;
  studentId?: unknown;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const jwtSecret = process.env.NEXTAUTH_SECRET;

  if (!jwtSecret) {
    console.error("Candidate signup requires NEXTAUTH_SECRET");
    return NextResponse.json(
      { error: "Registration is temporarily unavailable" },
      { status: 503 },
    );
  }

  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = readText(body.name);
  const email = readText(body.email).toLowerCase();
  const phone = readText(body.phone);
  const faculty = readText(body.faculty);
  const department = readText(body.department);
  const studentId = readText(body.studentId).toUpperCase();

  if (!name || !email || !phone || !faculty || !department || !studentId) {
    return NextResponse.json(
      { error: "Please complete all required fields" },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  if (!/^\d{6}[A-Z]$/.test(studentId)) {
    return NextResponse.json(
      { error: "Student ID must contain 6 digits followed by one letter" },
      { status: 400 },
    );
  }

  if (!isFaculty(faculty) || !isDepartmentForFaculty(faculty, department)) {
    return NextResponse.json(
      { error: "Select a valid faculty and department" },
      { status: 400 },
    );
  }

  if (name.length > 255 || email.length > 255 || phone.length > 11) {
    return NextResponse.json(
      { error: "One or more fields exceed the allowed length" },
      { status: 400 },
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const temporaryPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'candidate')
       RETURNING id`,
      [name, email, passwordHash],
    );
    const userId = userResult.rows[0].id;

    await client.query("SAVEPOINT before_candidates_insert");
    try {
      await client.query(
        `INSERT INTO candidates
          (user_id, student_id, faculty, department, contact_number, status)
         VALUES ($1, $2, $3, $4, $5, 'Registered')`,
        [userId, studentId, faculty, department, phone],
      );
    } catch (insertErr: any) {
      if (insertErr?.code === "42703") {
        // status column doesn't exist yet — roll back to savepoint and retry without it
        await client.query("ROLLBACK TO SAVEPOINT before_candidates_insert");
        await client.query(
          `INSERT INTO candidates
            (user_id, student_id, faculty, department, contact_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, studentId, faculty, department, phone],
        );
      } else {
        throw insertErr;
      }
    }

    const token = jwt.sign(
      {
        userId,
        hashCheck: passwordHash.substring(0, 15),
        purpose: "candidate_email_verification",
      },
      jwtSecret,
      { expiresIn: "7d" },
    );

    await sendCandidateVerificationEmail(email, token, name);
    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Check your email to verify your address and finish setting up your account.",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("Candidate signup error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "An account with this email or student ID already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Unable to complete registration. Please try again." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
