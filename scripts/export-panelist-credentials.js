const fs = require("fs");
const path = require("path");

// Credentials captured from the create-panelists.js run output
const credentials = [
  { company: "Ceylon Tobacco Company",                               email: "panelist.ceylon-tobacco-company@riseupmora.lk",                          password: "ZyZU9geF" },
  { company: "Creative Software",                                    email: "panelist.creative-software@riseupmora.lk",                               password: "Ki5rcbhf" },
  { company: "Eco Twin 14",                                          email: "panelist.eco-twin-14@riseupmora.lk",                                     password: "QHVzcC0k" },
  { company: "Elevex",                                               email: "panelist.elevex@riseupmora.lk",                                          password: "dqlIGyyt" },
  { company: "GTN tech",                                             email: "panelist.gtn-tech@riseupmora.lk",                                        password: "Taf4wJkk" },
  { company: "Hemas Holdings",                                       email: "panelist.hemas-holdings@riseupmora.lk",                                  password: "K2CLZqUG" },
  { company: "Hutch | Internet & Telecommunication Service Provider",email: "panelist.hutch-internet-telecommunication-service-provider@riseupmora.lk",password: "t2ULQJsg" },
  { company: "IPD",                                                  email: "panelist.ipd@riseupmora.lk",                                             password: "aoKzDrL9" },
  { company: "Idea8",                                                email: "panelist.idea8@riseupmora.lk",                                           password: "aDxtAJKR" },
  { company: "Inqube",                                               email: "panelist.inqube@riseupmora.lk",                                          password: "YKYqwD7l" },
  { company: "Loons Lab",                                            email: "panelist.loons-lab@riseupmora.lk",                                       password: "7o2xfS6z" },
  { company: "MAGA Engineering",                                     email: "panelist.maga-engineering@riseupmora.lk",                                password: "VBO7k5Y3" },
  { company: "MAS holdings",                                         email: "panelist.mas-holdings@riseupmora.lk",                                    password: "xMEX1ssH" },
  { company: "Pelwatte Dairy",                                       email: "panelist.pelwatte-dairy@riseupmora.lk",                                  password: "ufUhnnl2" },
  { company: "RMA Energy",                                           email: "panelist.rma-energy@riseupmora.lk",                                      password: "wVkmxso1" },
  { company: "VarioSystems",                                         email: "panelist.variosystems@riseupmora.lk",                                    password: "oPhGVhtx" },
  { company: "ZeroBeta",                                             email: "panelist.zerobeta@riseupmora.lk",                                        password: "VKDxdCif" },
];

const colCompany  = Math.max(...credentials.map(r => r.company.length),  7);
const colEmail    = Math.max(...credentials.map(r => r.email.length),    5);
const colPassword = 8;
const separator   = "-".repeat(colCompany + colEmail + colPassword + 6);

const lines = [
  "RiseUpMora — Panelist Login Credentials",
  `Generated : ${new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" })} (IST)`,
  "=".repeat(separator.length),
  "",
  "Login URL : https://www.riseupmora.lk/signin",
  "           (or http://localhost:3000/signin for local testing)",
  "",
  "=".repeat(separator.length),
  `${"Company".padEnd(colCompany)}  ${"Email".padEnd(colEmail)}  Password`,
  separator,
  ...credentials.map(r =>
    `${r.company.padEnd(colCompany)}  ${r.email.padEnd(colEmail)}  ${r.password}`
  ),
  separator,
  "",
  "NOTE: Passwords are hashed in the database.",
  "      Keep this file secure and do not share it publicly.",
  "",
  "DIMO: a panelist account for DIMO already existed before this run and was skipped.",
];

const output = lines.join("\n");
const outPath = path.join(__dirname, "panelist-credentials.txt");
fs.writeFileSync(outPath, output, "utf8");
console.log(`✅  Saved to: ${outPath}`);
console.log();
console.log(output);
