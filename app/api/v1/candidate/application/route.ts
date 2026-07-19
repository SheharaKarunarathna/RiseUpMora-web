import { v2 as cloudinary } from "cloudinary";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  isDepartmentForFaculty,
  isFaculty,
} from "@/lib/candidate-options";
import { getCandidateCvAsset } from "@/lib/cloudinary-cv";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const maximumFileSize = 10 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
        { error: "Complete your candidate profile before applying" },
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
    console.error("Candidate application fetch error:", error);
    return NextResponse.json(
      { error: "Unable to load the application" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    cvUrl?: unknown;
    publicId?: unknown;
    preferences?: unknown;
    comment?: unknown;
    department?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid application submission" }, { status: 400 });
  }

  const cvUrl = typeof body.cvUrl === "string" ? body.cvUrl.trim() : "";
  const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
  const preferences = Array.isArray(body.preferences)
    ? body.preferences.map((value) => (typeof value === "string" ? value.trim() : ""))
    : [];
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const department =
    typeof body.department === "string" ? body.department.trim() : "";

  if (
    preferences.length !== 4 ||
    preferences.some((preference) => !uuidPattern.test(preference))
  ) {
    return NextResponse.json(
      { error: "Select all four company preferences" },
      { status: 400 },
    );
  }

  if (new Set(preferences).size !== 4) {
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

  const companyResult = await query(
    "SELECT id FROM companies WHERE id = ANY($1::uuid[])",
    [preferences],
  );
  if ((companyResult.rowCount ?? 0) !== 4) {
    return NextResponse.json(
      { error: "One or more selected companies are unavailable" },
      { status: 400 },
    );
  }

  const candidateResult = await query(
    `SELECT id, student_id, faculty, department
     FROM candidates
     WHERE user_id = $1`,
    [session.user.id],
  );
  if (candidateResult.rowCount === 0) {
    return NextResponse.json(
      { error: "Candidate profile not found" },
      { status: 404 },
    );
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "CV upload is not available until Cloudinary is configured" },
      { status: 503 },
    );
  }

  const candidate = candidateResult.rows[0] as {
    student_id: string;
    faculty: string;
    department: string;
  };
  if (
    !isFaculty(candidate.faculty) ||
    !isDepartmentForFaculty(candidate.faculty, department)
  ) {
    return NextResponse.json(
      { error: "Select a valid department for your faculty" },
      { status: 400 },
    );
  }

  const previousAsset = getCandidateCvAsset({
    studentId: candidate.student_id,
    faculty: candidate.faculty,
    department: candidate.department,
  });
  const expectedAsset = getCandidateCvAsset({
    studentId: candidate.student_id,
    faculty: candidate.faculty,
    department,
  });

  if (publicId !== expectedAsset.fullPublicId) {
    return NextResponse.json(
      { error: "The uploaded CV path does not match your candidate profile" },
      { status: 400 },
    );
  }

  try {
    const uploadedAsset = await cloudinary.api.resource(expectedAsset.fullPublicId, {
      resource_type: "raw",
    });

    if (
      uploadedAsset.secure_url !== cvUrl ||
      uploadedAsset.bytes > maximumFileSize ||
      !uploadedAsset.public_id.endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Cloudinary could not verify the uploaded PDF" },
        { status: 400 },
      );
    }

    await query(
      `UPDATE candidates
       SET cv_url = $1,
           pref_1 = $2,
           pref_2 = $3,
           pref_3 = $4,
           pref_4 = $5,
           application_comment = $6,
           department = $7
       WHERE user_id = $8`,
      [
        uploadedAsset.secure_url,
        preferences[0],
        preferences[1],
        preferences[2],
        preferences[3],
        comment || null,
        department,
        session.user.id,
      ],
    );

    if (previousAsset.fullPublicId !== expectedAsset.fullPublicId) {
      try {
        await cloudinary.uploader.destroy(previousAsset.fullPublicId, {
          resource_type: "raw",
          invalidate: true,
        });
      } catch (cleanupError: unknown) {
        console.error("Previous candidate CV cleanup error:", cleanupError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Your application has been submitted successfully",
    });
  } catch (error: unknown) {
    console.error("Candidate application submission error:", error);
    return NextResponse.json(
      { error: "Unable to submit your application. Please try again." },
      { status: 500 },
    );
  }
}
