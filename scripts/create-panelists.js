/**
 * scripts/create-panelists.js
 *
 * Creates one panelist account (panel_number = 1) for every company in the database.
 * - Email: panelist.<slug>@riseupmora.lk  (all lowercase, non-alphanumeric chars → "-")
 * - Password: 8-character alphanumeric, randomly generated
 * - email_verified_at is set to CURRENT_TIMESTAMP to skip any email confirmation step
 *
 * Usage:
 *   node scripts/create-panelists.js
 *
 * Requires: dotenv, pg, bcryptjs  (all already installed in the project)
 */

require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 8-char alphanumeric password (letters + digits, no symbols)
function generatePassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[crypto.randomInt(0, charset.length)];
  }
  return password;
}

// Convert company name to a safe email slug
// e.g. "Hayleys PLC" → "hayleys-plc"
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createPanelists() {
  console.log("=".repeat(60));
  console.log("  RiseUpMora — Panelist Account Generator");
  console.log("=".repeat(60));
  console.log();

  const client = await pool.connect();
  try {
    // Fetch all companies ordered by name
    const { rows: companies } = await client.query(
      "SELECT id, name FROM companies ORDER BY name ASC"
    );

    if (companies.length === 0) {
      console.error("❌  No companies found in the database. Aborting.");
      return;
    }

    console.log(`Found ${companies.length} companies. Creating panelist accounts...\n`);

    const created = [];
    const skipped = [];

    for (const company of companies) {
      const slug = toSlug(company.name);
      const email = `panelist.${slug}@riseupmora.lk`;
      const displayName = `Panelist – ${company.name}`;
      const panelNumber = 1;

      // Check if a panelist already exists for this company
      const existingPanelist = await client.query(
        "SELECT p.id FROM panelists p WHERE p.company_id = $1 AND p.panel_number = $2",
        [company.id, panelNumber]
      );

      if (existingPanelist.rows.length > 0) {
        console.log(`⚠️  Panelist (panel #${panelNumber}) already exists for "${company.name}". Skipping.`);
        skipped.push(company.name);
        continue;
      }

      // Also check if the email is taken
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`⚠️  Email "${email}" already in use. Skipping "${company.name}".`);
        skipped.push(company.name);
        continue;
      }

      const rawPassword = generatePassword();
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Insert user — email_verified_at is set immediately to bypass confirmation
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, email_verified_at)
         VALUES ($1, $2, $3, 'panelist', CURRENT_TIMESTAMP)
         RETURNING id`,
        [displayName, email, passwordHash]
      );
      const userId = userRes.rows[0].id;

      // Insert panelist record
      await client.query(
        `INSERT INTO panelists (user_id, company_id, panel_number)
         VALUES ($1, $2, $3)`,
        [userId, company.id, panelNumber]
      );

      created.push({ company: company.name, email, password: rawPassword });

      console.log(`✅  Created: "${company.name}"`);
      console.log(`    Email   : ${email}`);
      console.log(`    Password: ${rawPassword}`);
      console.log();
    }

    // Summary table
    console.log("=".repeat(60));
    console.log("  SUMMARY");
    console.log("=".repeat(60));
    console.log(`  Created : ${created.length}`);
    console.log(`  Skipped : ${skipped.length}`);
    console.log();

    if (created.length > 0) {
      console.log("  CREDENTIALS (save these now — passwords are hashed in DB)");
      console.log("-".repeat(60));
      const colW = Math.max(...created.map((r) => r.company.length), 7);
      console.log(
        `  ${"Company".padEnd(colW)}  ${"Email".padEnd(45)}  Password`
      );
      console.log("-".repeat(60));
      for (const row of created) {
        console.log(
          `  ${row.company.padEnd(colW)}  ${row.email.padEnd(45)}  ${row.password}`
        );
      }
      console.log("-".repeat(60));
    }
  } catch (err) {
    console.error("❌  Unexpected error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

createPanelists();
