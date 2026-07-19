export const departmentsByFaculty = {
  "Faculty of Engineering": [
    "Department of Chemical & Process Engineering",
    "Department of Civil Engineering",
    "Department of Computer Science & Engineering",
    "Department of Earth Resources Engineering",
    "Department of Electrical Engineering",
    "Department of Electronic & Telecommunication Engineering",
    "Department of Materials Science & Engineering",
    "Department of Mechanical Engineering",
    "Department of Textile & Apparel Engineering",
    "Department of Transport Management and Logistics Engineering",
  ],
  "Faculty of Information Technology": [
    "Department of Information Technology",
  ],
  "Faculty of Business": [
    "Department of Decision Sciences",
    "Department of Industrial Management",
    "Department of Management of Technology",
  ],
  "Faculty of Architecture": [
    "Department of Architecture",
    "Department of Building Economics",
    "Department of Town & Country Planning",
    "Department of Integrated Design",
    "Department of Facilities Management",
  ],
} as const;

export type Faculty = keyof typeof departmentsByFaculty;

export const faculties = Object.keys(departmentsByFaculty) as Faculty[];

export function isFaculty(value: string): value is Faculty {
  return Object.hasOwn(departmentsByFaculty, value);
}

export function isDepartmentForFaculty(
  faculty: Faculty,
  department: string,
) {
  return (departmentsByFaculty[faculty] as readonly string[]).includes(department);
}

export function normalizeStudentIdInput(value: string) {
  let normalized = "";

  for (const character of value) {
    if (normalized.length < 6 && /[0-9]/.test(character)) {
      normalized += character;
    } else if (normalized.length === 6 && /[a-z]/i.test(character)) {
      normalized += character.toUpperCase();
      break;
    }
  }

  return normalized;
}
