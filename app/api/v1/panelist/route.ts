import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "panelist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // 1. Find panelist's associated company details
    const panelistRes = await query(
      "SELECT id as panelist_id, company_id FROM panelists WHERE user_id = $1",
      [session.user.id]
    );

    if (panelistRes.rowCount === 0) {
      return NextResponse.json({ error: "No panelist profile associated with this account" }, { status: 400 });
    }
    const { company_id: companyId } = panelistRes.rows[0];

    const body = await req.json();
    const { action } = body;

    if (action === "update-status") {
      const { allocationId, status } = body;
      if (!allocationId || !status) {
        return NextResponse.json({ error: "Allocation ID and status are required" }, { status: 400 });
      }

      // Check allocation ownership
      const allocRes = await query(
        "SELECT company_id FROM allocations WHERE id = $1",
        [allocationId]
      );

      if (allocRes.rowCount === 0) {
        return NextResponse.json({ error: "Allocation slot not found" }, { status: 404 });
      }

      if (allocRes.rows[0].company_id !== companyId) {
        return NextResponse.json({ error: "Unauthorized: This slot belongs to another company" }, { status: 403 });
      }

      await query("BEGIN");
      try {
        // If status is set to ONGOING, reset other slots of this company from ONGOING to '1' (Scheduled)
        if (status === "ONGOING") {
          await query(
            "UPDATE allocations SET status = '1' WHERE company_id = $1 AND status = 'ONGOING' AND id != $2",
            [companyId, allocationId]
          );
        }
        
        await query(
          "UPDATE allocations SET status = $1 WHERE id = $2",
          [status, allocationId]
        );
        // Also update candidate status if column exists
        try {
          await query(
            "UPDATE candidates SET status = $1 WHERE id = (SELECT candidate_id FROM allocations WHERE id = $2)",
            [status, allocationId]
          );
        } catch (err: any) {
          if (err?.code !== "42703") throw err;
        }
        await query("COMMIT");
      } catch (err) {
        await query("ROLLBACK");
        throw err;
      }

      return NextResponse.json({ success: true, message: "Interview status updated successfully" });
    } else if (action === "save-feedback") {
      const { 
        candidateId, 
        panelistId, 
        companyId: bodyCompanyId, 
        technicalSkills,
        technicalKnowledge,
        communication, 
        qualityOfProjects,
        industryReady, 
        writtenFeedback 
      } = body;

      if (!candidateId || !panelistId || !bodyCompanyId || !writtenFeedback) {
        return NextResponse.json({ error: "All evaluation fields are required" }, { status: 400 });
      }

      if (bodyCompanyId !== companyId) {
        return NextResponse.json({ error: "Unauthorized company evaluation" }, { status: 403 });
      }

      const tech = Number(technicalKnowledge ?? technicalSkills ?? 5);
      const comm = Number(communication ?? 5);
      const proj = Number(qualityOfProjects ?? 5);
      const ind = Number(industryReady ?? 5);

      // Calculate score out of 100 based on all 4 criteria
      const score = Math.round(((tech + comm + proj + ind) / 4) * 10);

      // Robust upsert feedback handling schema variations
      try {
        await query(
          `INSERT INTO feedback (candidate_id, panelist_id, company_id, technical_skills, technical_knowledge, communication, quality_of_projects, industry_ready, score, written_feedback, panelist_notes)
           VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $9)
           ON CONFLICT (candidate_id, company_id) DO UPDATE
           SET technical_skills = EXCLUDED.technical_skills,
               technical_knowledge = EXCLUDED.technical_knowledge,
               communication = EXCLUDED.communication,
               quality_of_projects = EXCLUDED.quality_of_projects,
               industry_ready = EXCLUDED.industry_ready,
               score = EXCLUDED.score,
               written_feedback = EXCLUDED.written_feedback,
               panelist_notes = EXCLUDED.panelist_notes`,
          [candidateId, panelistId, companyId, tech, comm, proj, ind, score, writtenFeedback]
        );
      } catch (err: any) {
        // Fallback for schemas without technical_knowledge or panelist_notes columns
        try {
          await query(
            `INSERT INTO feedback (candidate_id, panelist_id, company_id, technical_skills, communication, quality_of_projects, industry_ready, score, written_feedback)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (candidate_id, company_id) DO UPDATE
             SET technical_skills = EXCLUDED.technical_skills,
                 communication = EXCLUDED.communication,
                 quality_of_projects = EXCLUDED.quality_of_projects,
                 industry_ready = EXCLUDED.industry_ready,
                 score = EXCLUDED.score,
                 written_feedback = EXCLUDED.written_feedback`,
            [candidateId, panelistId, companyId, tech, comm, proj, ind, score, writtenFeedback]
          );
        } catch (fallbackErr: any) {
          await query(
            `INSERT INTO feedback (candidate_id, panelist_id, company_id, technical_skills, communication, industry_ready, score, written_feedback)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (candidate_id, company_id) DO UPDATE
             SET technical_skills = EXCLUDED.technical_skills,
                 communication = EXCLUDED.communication,
                 industry_ready = EXCLUDED.industry_ready,
                 score = EXCLUDED.score,
                 written_feedback = EXCLUDED.written_feedback`,
            [candidateId, panelistId, companyId, tech, comm, ind, score, writtenFeedback]
          );
        }
      }

      // Update candidate status to Evaluated if column exists
      try {
        await query(
          "UPDATE candidates SET status = 'Evaluated' WHERE id = $1",
          [candidateId]
        );
      } catch (err: any) {
        if (err?.code !== "42703") throw err;
      }

      return NextResponse.json({ success: true, message: "Feedback evaluation saved successfully" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Panelist API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process panelist request" }, { status: 500 });
  }
}
