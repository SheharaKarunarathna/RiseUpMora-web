import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendInvitationEmail } from "@/utils/email";
import crypto from "crypto";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  try {
    let sql = "";
    if (role === "candidate") {
      sql = `
        SELECT u.id as user_id, c.id as candidate_id, u.name, u.email, c.student_id, c.faculty, c.department, c.contact_number, c.cv_url,
               c.application_comment,
               cp1.name as pref_1_name, cp2.name as pref_2_name, cp3.name as pref_3_name, cp4.name as pref_4_name
        FROM users u 
        JOIN candidates c ON u.id = c.user_id 
        LEFT JOIN companies cp1 ON c.pref_1::uuid = cp1.id
        LEFT JOIN companies cp2 ON c.pref_2::uuid = cp2.id
        LEFT JOIN companies cp3 ON c.pref_3::uuid = cp3.id
        LEFT JOIN companies cp4 ON c.pref_4::uuid = cp4.id
        ORDER BY c.created_at DESC
      `;
    } else if (role === "company_coordinator") {
      sql = `
        SELECT u.id as user_id, u.name, u.email, c.name as company_name 
        FROM users u 
        JOIN company_coordinators cc ON u.id = cc.user_id 
        JOIN companies c ON cc.company_id = c.id
      `;
    } else if (role === "department_coordinator") {
      sql = `
        SELECT u.id as user_id, u.name, u.email, dc.department 
        FROM users u 
        JOIN department_coordinators dc ON u.id = dc.user_id
      `;
    } else if (role === "panelist") {
      sql = `
        SELECT u.id as user_id, u.name, u.email, p.panel_number, c.name as company_name 
        FROM users u 
        JOIN panelists p ON u.id = p.user_id 
        JOIN companies c ON p.company_id = c.id
      `;
    } else {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const res = await query(sql);
    return NextResponse.json({ success: true, users: res.rows });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { email, name, role, company_id, department } = await req.json();

    if (!email || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Generate random password & hash it
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    // 2. Insert into users table
    const userRes = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, email, passwordHash, role]
    );
    const userId = userRes.rows[0].id;

    // 3. Insert into specific role table
    if (role === "company_coordinator") {
      if (!company_id) throw new Error("company_id is required for company coordinator");
      await query("INSERT INTO company_coordinators (user_id, company_id) VALUES ($1, $2)", [userId, company_id]);
    } else if (role === "department_coordinator") {
      if (!department) throw new Error("department is required for department coordinator");
      await query("INSERT INTO department_coordinators (user_id, department) VALUES ($1, $2)", [userId, department]);
    } else if (role === "panelist") {
      if (!company_id) throw new Error("company_id is required for panelist");
      // Panelists require a panel_number, default to 0 for now as requested
      await query("INSERT INTO panelists (user_id, company_id, panel_number) VALUES ($1, $2, $3)", [userId, company_id, 0]);
    } else {
      throw new Error("Invalid role for invitation");
    }

    // 4. Generate JWT
    const jwtSecret = process.env.NEXTAUTH_SECRET || "default_secret";
    // We embed a snippet of the hash in the token so we can verify if the password was changed
    const token = jwt.sign(
      { userId, hashCheck: passwordHash.substring(0, 15) },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // 5. Send Email
    await sendInvitationEmail(email, token, role);

    return NextResponse.json({ success: true, message: "User invited successfully" });
  } catch (error: any) {
    console.error("Invite error:", error);
    if (error.code === "23505") { // Unique constraint violation (email)
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to invite user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Delete user from users table. Because of ON DELETE CASCADE,
    // this will also remove their entry from company_coordinators, department_coordinators, or panelists.
    const res = await query("DELETE FROM users WHERE id = $1 RETURNING *", [id]);
    
    if (res.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
