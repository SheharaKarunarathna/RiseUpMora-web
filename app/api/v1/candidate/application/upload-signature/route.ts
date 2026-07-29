import { v2 as cloudinary } from "cloudinary";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCandidateCvAsset } from "@/lib/cloudinary-cv";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured" },
      { status: 503 },
    );
  }

  const candidateResult = await query(
    `SELECT student_id, faculty, department
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

  const candidate = candidateResult.rows[0] as {
    student_id: string;
    faculty: string;
    department: string;
  };
  const asset = getCandidateCvAsset({
    studentId: candidate.student_id,
    faculty: candidate.faculty,
    department: candidate.department,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParameters = {
    folder: asset.folder,
    public_id: asset.publicId,
    timestamp,
    type: "authenticated",
    overwrite: true,
    invalidate: true,
  } as const;
  const signature = cloudinary.utils.api_sign_request(uploadParameters, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    signature,
    ...uploadParameters,
    expectedPublicId: asset.fullPublicId,
  });
}
