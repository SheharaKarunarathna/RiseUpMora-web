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
    const { name, logo_url, is_it, slot_limits } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const res = await query(
      "INSERT INTO companies (name, logo_url, is_it) VALUES ($1, $2, $3) RETURNING *",
      [name, logo_url || null, is_it === true]
    );

    // Seed company_slot_counts for the new company (slots 1, 2, 3, 4)
    const companyId = res.rows[0].id;
    const getLimit = (slotNum: number): number => {
      if (slot_limits && typeof slot_limits === "object") {
        const val = slot_limits[slotNum] ?? slot_limits[String(slotNum)];
        if (typeof val === "number" && val > 0) return val;
        if (typeof val === "string" && !isNaN(parseInt(val)) && parseInt(val) > 0) return parseInt(val);
      }
      return 10;
    };

    await query(
      `INSERT INTO company_slot_counts (company_id, slot_number, filled_count, max_limit)
       VALUES 
         ($1, 1, 0, $2),
         ($1, 2, 0, $3),
         ($1, 3, 0, $4),
         ($1, 4, 0, $5)`,
      [
        companyId,
        getLimit(1),
        getLimit(2),
        getLimit(3),
        getLimit(4),
      ]
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
