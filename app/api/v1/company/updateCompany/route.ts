import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, name, logo_url, is_it } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: "Company ID and name are required" }, { status: 400 });
    }

    const res = await query(
      "UPDATE companies SET name = $1, logo_url = $2, is_it = $3 WHERE id = $4 RETURNING *",
      [name, logo_url || null, is_it === true, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, company: res.rows[0] });
  } catch (error: any) {
    console.error("Error updating company:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "A company with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}
