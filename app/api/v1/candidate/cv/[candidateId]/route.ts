import { v2 as cloudinary } from "cloudinary";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(
  _request: Request,
  props: { params: Promise<{ candidateId: string }> }
) {
  const params = await props.params;
  const candidateId = params.candidateId;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const userId = session.user.id;

  try {
    // 1. Fetch candidate's cv_url and student_id from DB
    let candidateRes;
    if (candidateId === "me") {
      candidateRes = await query(
        "SELECT id, user_id, cv_url, student_id FROM candidates WHERE user_id = $1",
        [userId]
      );
    } else {
      candidateRes = await query(
        "SELECT id, user_id, cv_url, student_id FROM candidates WHERE id = $1",
        [candidateId]
      );
    }

    if (candidateRes.rowCount === 0) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = candidateRes.rows[0] as {
      id: string;
      user_id: string;
      cv_url: string | null;
      student_id: string | null;
    };

    if (!candidate.cv_url) {
      return NextResponse.json({ error: "CV not uploaded" }, { status: 404 });
    }

    // 2. Access Control Checks
    let isAuthorized = false;

    if (role === "admin") {
      isAuthorized = true;
    } else if (role === "candidate") {
      if (candidate.user_id === userId) {
        isAuthorized = true;
      }
    } else if (role === "company_coordinator") {
      const ccRes = await query(
        "SELECT company_id FROM company_coordinators WHERE user_id = $1",
        [userId]
      );
      if (ccRes.rowCount && ccRes.rowCount > 0) {
        isAuthorized = true;
      }
    } else if (role === "panelist") {
      const panRes = await query(
        "SELECT id, company_id FROM panelists WHERE user_id = $1",
        [userId]
      );
      if (panRes.rowCount && panRes.rowCount > 0) {
        isAuthorized = true;
      }
    } else if (role === "department_coordinator") {
      const dcRes = await query(
        "SELECT department FROM department_coordinators WHERE user_id = $1",
        [userId]
      );
      if (dcRes.rowCount && dcRes.rowCount > 0) {
        const dept = dcRes.rows[0].department;
        const authCheck = await query(
          "SELECT 1 FROM candidates WHERE id = $1 AND department = $2",
          [candidate.id, dept]
        );
        if ((authCheck.rowCount ?? 0) > 0) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch PDF content securely using Cloudinary signed API download
    let pdfResponse: Response | null = null;

    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      let publicIdWithFormat = "";
      const match = candidate.cv_url.match(/\/(?:upload|authenticated)(?:\/s--[^/]+--)?(?:\/v\d+)?\/(.+)$/);
      if (match && match[1]) {
        publicIdWithFormat = match[1];
      } else {
        const parts = candidate.cv_url.split(/\/(?:upload|authenticated)\//);
        if (parts.length === 2) {
          publicIdWithFormat = parts[1].replace(/^(?:s--[^/]+--\/)?(?:v\d+\/)?/, "");
        }
      }

      if (publicIdWithFormat) {
        // Try signed download URL for authenticated type first
        const authSignedUrl = cloudinary.utils.private_download_url(
          publicIdWithFormat,
          "",
          { resource_type: "raw", type: "authenticated" }
        );
        pdfResponse = await fetch(authSignedUrl);

        // Fallback: try signed download URL for upload type
        if (!pdfResponse.ok) {
          const uploadSignedUrl = cloudinary.utils.private_download_url(
            publicIdWithFormat,
            "",
            { resource_type: "raw", type: "upload" }
          );
          pdfResponse = await fetch(uploadSignedUrl);
        }
      }
    }

    // Direct fetch fallback
    if (!pdfResponse || !pdfResponse.ok) {
      pdfResponse = await fetch(candidate.cv_url);
    }

    if (!pdfResponse.ok) {
      console.error("CV Proxy failed to fetch PDF from Cloudinary:", {
        status: pdfResponse.status,
        statusText: pdfResponse.statusText,
        cv_url: candidate.cv_url,
      });
      return NextResponse.json(
        { error: "Unable to retrieve CV file from storage" },
        { status: 502 }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const filename = `${candidate.student_id || "candidate"}_CV.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("CV proxy error:", error);
    return NextResponse.json({ error: "Failed to retrieve CV" }, { status: 500 });
  }
}
