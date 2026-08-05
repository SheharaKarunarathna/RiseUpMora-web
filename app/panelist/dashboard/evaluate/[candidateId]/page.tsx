import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import EvaluationClient from "./EvaluationClient";

export const dynamic = "force-dynamic";

export default async function EvaluatePage(props: {
  params: Promise<{ candidateId: string }>;
}) {
  const params = await props.params;
  const candidateId = params.candidateId;

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "panelist") {
    redirect("/");
  }

  // 1. Get panelist details
  const panelistRes = await query(
    `SELECT p.id as panelist_id, p.panel_number, p.company_id, c.name as company_name
     FROM panelists p
     JOIN companies c ON p.company_id = c.id
     WHERE p.user_id = $1`,
    [session.user.id]
  );

  if (panelistRes.rowCount === 0) {
    redirect("/panelist/dashboard");
  }
  const panelist = panelistRes.rows[0];

  // 2. Get candidate details
  const candidateRes = await query(
    `SELECT c.id as candidate_id, u.name as candidate_name, u.email, c.student_id, c.department, c.cv_url
     FROM candidates c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = $1`,
    [candidateId]
  );

  if (candidateRes.rowCount === 0) {
    redirect("/panelist/dashboard");
  }
  const candidate = candidateRes.rows[0];

  // 3. Get existing feedback
  const feedbackRes = await query(
    `SELECT *
     FROM feedback
     WHERE candidate_id = $1 AND panelist_id = $2`,
    [candidateId, panelist.panelist_id]
  );
  
  const existingFeedback = feedbackRes.rowCount && feedbackRes.rowCount > 0 ? feedbackRes.rows[0] : null;

  return (
    <EvaluationClient
      candidate={candidate}
      panelist={panelist}
      existingFeedback={existingFeedback}
    />
  );
}
