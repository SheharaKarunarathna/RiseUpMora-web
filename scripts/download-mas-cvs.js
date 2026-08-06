/**
 * scripts/download-mas-cvs.js
 *
 * Bulk downloads candidate CVs for candidates who have preferred MAS Holdings (or any specified company).
 * Replicates the API proxy logic from app/api/v1/candidate/cv/[candidateId]/route.ts using Cloudinary signed download URLs.
 *
 * Usage:
 *   node scripts/download-mas-cvs.js [options]
 *
 * Options:
 *   --company="MAS holdings"    Target company name (default: "MAS holdings")
 *   --outDir="./downloads"      Output directory for CV files (default: "./downloads/<Company>_CVs")
 *   --concurrency=3             Number of parallel downloads (default: 3)
 *   --overwrite                 Re-download and overwrite existing files
 *
 * Example:
 *   node scripts/download-mas-cvs.js
 */

const path = require('path');
const fs = require('fs');

// Ensure dotenv is loaded from workspace root
const workspaceDir = path.resolve(__dirname, '..');
const envPath = path.join(workspaceDir, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const { Pool } = require('pg');
const { v2: cloudinary } = require('cloudinary');

// Parse CLI arguments
const args = process.argv.slice(2);
function getArgValue(flag, defaultValue) {
  const match = args.find((arg) => arg.startsWith(`${flag}=`));
  return match ? match.split('=')[1].replace(/^["']|["']$/g, '') : defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const companySearchTerm = getArgValue('--company', 'MAS holdings');
const customOutDir = getArgValue('--outDir', null);
const concurrency = Math.max(1, parseInt(getArgValue('--concurrency', '3'), 10));
const overwrite = hasFlag('--overwrite');

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to sanitize filenames
function sanitizeFilename(str) {
  if (!str) return 'candidate';
  return str
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
}

// Utility: Sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility: Fetch with retries and exponential backoff
async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (attempt === retries) {
        return response;
      }
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
    }
    await sleep(delayMs * Math.pow(2, attempt - 1));
  }
  return null;
}

/**
 * Downloads a candidate CV using Cloudinary signed download proxy logic.
 */
async function downloadCv(cvUrl) {
  if (!cvUrl) {
    throw new Error('No CV URL provided');
  }

  // Extract Cloudinary Public ID
  let publicIdWithFormat = '';
  const match = cvUrl.match(/\/(?:upload|authenticated)(?:\/s--[^/]+--)?(?:\/v\d+)?\/(.+)$/);
  if (match && match[1]) {
    publicIdWithFormat = match[1];
  } else {
    const parts = cvUrl.split(/\/(?:upload|authenticated)\//);
    if (parts.length === 2) {
      publicIdWithFormat = parts[1].replace(/^(?:s--[^/]+--\/)?(?:v\d+\/)?/, '');
    }
  }

  let pdfResponse = null;

  if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && publicIdWithFormat) {
    // 1. Signed private download URL for 'raw' + 'authenticated'
    try {
      const authSignedUrl = cloudinary.utils.private_download_url(
        publicIdWithFormat,
        '',
        { resource_type: 'raw', type: 'authenticated' }
      );
      pdfResponse = await fetchWithRetry(authSignedUrl, { cache: 'no-store' });
    } catch (err) {
      // Continue to next attempt
    }

    // 2. Signed private download URL for 'raw' + 'upload'
    if (!pdfResponse || !pdfResponse.ok) {
      try {
        const uploadSignedUrl = cloudinary.utils.private_download_url(
          publicIdWithFormat,
          '',
          { resource_type: 'raw', type: 'upload' }
        );
        pdfResponse = await fetchWithRetry(uploadSignedUrl, { cache: 'no-store' });
      } catch (err) {
        // Continue to next attempt
      }
    }

    // 3. Signed private download URL for 'image' + 'authenticated'
    if (!pdfResponse || !pdfResponse.ok) {
      try {
        const imageAuthSignedUrl = cloudinary.utils.private_download_url(
          publicIdWithFormat,
          '',
          { resource_type: 'image', type: 'authenticated' }
        );
        pdfResponse = await fetchWithRetry(imageAuthSignedUrl, { cache: 'no-store' });
      } catch (err) {
        // Continue to next attempt
      }
    }
  }

  // 4. Direct cvUrl fetch fallback
  if (!pdfResponse || !pdfResponse.ok) {
    try {
      pdfResponse = await fetchWithRetry(cvUrl, { cache: 'no-store' });
    } catch (err) {
      // Error handled below
    }
  }

  if (!pdfResponse || !pdfResponse.ok) {
    const statusText = pdfResponse ? `HTTP ${pdfResponse.status} ${pdfResponse.statusText}` : 'Network error';
    throw new Error(`Failed to fetch file (${statusText})`);
  }

  const arrayBuffer = await pdfResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Parallel queue runner with concurrency control
 */
async function asyncPool(limit, array, fn) {
  const results = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);

    if (limit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function main() {
  console.log('='.repeat(70));
  console.log('  RiseUpMora — Bulk Candidate CV Downloader');
  console.log('='.repeat(70));
  console.log(`  Target Company : "${companySearchTerm}"`);
  console.log(`  Concurrency    : ${concurrency}`);
  console.log(`  Overwrite      : ${overwrite ? 'Yes' : 'No (skipping existing)'}`);
  console.log();

  // Create pool and fetch candidate metadata, then close pool immediately
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  let exactCompany = null;
  let candidates = [];

  try {
    const client = await pool.connect();

    // 1. Find company
    const { rows: companies } = await client.query(
      'SELECT id, name FROM companies WHERE LOWER(name) = LOWER($1) OR name ILIKE $2',
      [companySearchTerm, `%${companySearchTerm}%`]
    );

    if (companies.length === 0) {
      console.error(`❌ No company found matching "${companySearchTerm}".`);
      client.release();
      await pool.end();
      process.exit(1);
    }

    exactCompany = companies.find((c) => c.name.toLowerCase() === companySearchTerm.toLowerCase()) || companies[0];
    console.log(`✅ Selected Company: "${exactCompany.name}" (ID: ${exactCompany.id})\n`);

    // 2. Fetch candidates
    const queryText = `
      SELECT DISTINCT 
        c.id as candidate_id, 
        c.student_id, 
        u.name as candidate_name, 
        u.email, 
        c.contact_number, 
        c.faculty, 
        c.department, 
        c.cv_url,
        CASE 
          WHEN tb.company_id = $1 THEN tb.preference_number
          WHEN c.pref_1 = $1::text OR c.pref_1 ILIKE $2 THEN 1
          WHEN c.pref_2 = $1::text OR c.pref_2 ILIKE $2 THEN 2
          WHEN c.pref_3 = $1::text OR c.pref_3 ILIKE $2 THEN 3
          WHEN c.pref_4 = $1::text OR c.pref_4 ILIKE $2 THEN 4
          ELSE NULL
        END as preference_rank
      FROM candidates c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1
      WHERE tb.company_id = $1
         OR c.pref_1 = $1::text
         OR c.pref_2 = $1::text
         OR c.pref_3 = $1::text
         OR c.pref_4 = $1::text
         OR c.pref_1 ILIKE $2
         OR c.pref_2 ILIKE $2
         OR c.pref_3 ILIKE $2
         OR c.pref_4 ILIKE $2
      ORDER BY preference_rank ASC NULLS LAST, c.student_id ASC NULLS LAST
    `;

    const res = await client.query(queryText, [exactCompany.id, exactCompany.name]);
    candidates = res.rows;
    client.release();
  } catch (dbErr) {
    console.error('❌ Database error:', dbErr);
    process.exit(1);
  } finally {
    await pool.end();
  }

  // Determine output directory
  const outputDirectory = customOutDir
    ? path.resolve(customOutDir)
    : path.join(workspaceDir, 'downloads', `${sanitizeFilename(exactCompany.name)}_CVs`);

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  console.log(`📁 Target Output Directory: ${outputDirectory}\n`);

  console.log(`Found ${candidates.length} candidate(s) who preferred "${exactCompany.name}".`);

  const withCv = candidates.filter((c) => c.cv_url && c.cv_url.trim() !== '');
  console.log(`Candidates with uploaded CV: ${withCv.length} / ${candidates.length}\n`);

  if (withCv.length === 0) {
    console.log('No candidate CVs to download.');
    return;
  }

  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const manifestRows = [];

  console.log('Starting bulk download...\n');

  // Worker function for downloading each candidate's CV
  async function processCandidate(candidate, index) {
    const idxStr = `[${index + 1}/${withCv.length}]`.padStart(8);
    const studentId = candidate.student_id || `ID_${candidate.candidate_id.substring(0, 6)}`;
    const safeName = sanitizeFilename(candidate.candidate_name);
    const filename = `${sanitizeFilename(studentId)}_${safeName}.pdf`;
    const filePath = path.join(outputDirectory, filename);

    const manifestEntry = {
      student_id: studentId,
      name: candidate.candidate_name,
      email: candidate.email,
      contact_number: candidate.contact_number,
      faculty: candidate.faculty,
      department: candidate.department,
      preference_rank: candidate.preference_rank || 'N/A',
      cv_url: candidate.cv_url,
      saved_filename: filename,
      status: 'PENDING',
    };

    // Check if file already exists
    if (!overwrite && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      console.log(`${idxStr} ⏩ Skipped (already downloaded): ${filename}`);
      skippedCount++;
      manifestEntry.status = 'SKIPPED_ALREADY_EXISTS';
      manifestRows.push(manifestEntry);
      return;
    }

    try {
      const buffer = await downloadCv(candidate.cv_url);
      fs.writeFileSync(filePath, buffer);
      console.log(`${idxStr} ✅ Downloaded: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
      downloadedCount++;
      manifestEntry.status = 'DOWNLOADED';
    } catch (err) {
      console.error(`${idxStr} ❌ Failed (${studentId}): ${err.message}`);
      failedCount++;
      manifestEntry.status = `FAILED: ${err.message}`;
    }

    manifestRows.push(manifestEntry);
  }

  // Run bulk downloads with concurrency control
  const candidatesWithIndex = withCv.map((c, i) => ({ candidate: c, index: i }));
  await asyncPool(concurrency, candidatesWithIndex, ({ candidate, index }) =>
    processCandidate(candidate, index)
  );

  // Save Manifest Files (JSON & CSV)
  const manifestJsonPath = path.join(outputDirectory, 'candidates_manifest.json');
  fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestRows, null, 2), 'utf8');

  const csvHeaders = ['Student ID', 'Name', 'Email', 'Contact Number', 'Faculty', 'Department', 'Preference Rank', 'Filename', 'Status', 'CV URL'];
  const csvLines = [
    csvHeaders.join(','),
    ...manifestRows.map((r) =>
      [
        `"${r.student_id}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${r.email}"`,
        `"${r.contact_number || ''}"`,
        `"${(r.faculty || '').replace(/"/g, '""')}"`,
        `"${(r.department || '').replace(/"/g, '""')}"`,
        `"${r.preference_rank}"`,
        `"${r.saved_filename}"`,
        `"${r.status}"`,
        `"${r.cv_url}"`,
      ].join(',')
    ),
  ];

  const manifestCsvPath = path.join(outputDirectory, 'candidates_manifest.csv');
  fs.writeFileSync(manifestCsvPath, csvLines.join('\r\n'), 'utf8');

  // Print Summary
  console.log();
  console.log('='.repeat(70));
  console.log('  DOWNLOAD SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total Preferred Candidates : ${candidates.length}`);
  console.log(`  Candidates with CVs        : ${withCv.length}`);
  console.log(`  Successfully Downloaded    : ${downloadedCount}`);
  console.log(`  Skipped (Already Existed)  : ${skippedCount}`);
  console.log(`  Failed Downloads           : ${failedCount}`);
  console.log(`  Files Output Directory     : ${outputDirectory}`);
  console.log(`  Manifest Files Saved       :`);
  console.log(`    - CSV  : ${manifestCsvPath}`);
  console.log(`    - JSON : ${manifestJsonPath}`);
  console.log('='.repeat(70));
}

main();
