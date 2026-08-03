import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, logo_url, is_it } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const res = await query(
      "INSERT INTO companies (name, logo_url, is_it) VALUES ($1, $2, $3) RETURNING *",
      [name, logo_url || null, is_it === true]
    );

    // Seed company_slot_counts for the new company (slots 1, 2, 3)
    const companyId = res.rows[0].id;
    await query(
      `INSERT INTO company_slot_counts (company_id, slot_number, filled_count)
       VALUES ($1, 1, 0), ($1, 2, 0), ($1, 3, 0)`,
      [companyId]
    );

    return NextResponse.json({ success: true, company: res.rows[0] });
  } catch (error: any) {
    console.error("Error adding company:", error);
    // Unique constraint violation for name
    if (error.code === "23505") {
      return NextResponse.json({ error: "A company with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add company" }, { status: 500 });
  }
}
