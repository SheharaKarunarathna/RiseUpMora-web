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
    "Department of Artificial Intelligence",
    "Department of Information Technology & Management",
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

export const TIME_SLOTS = [
  { id: "08:00 AM - 11:00 AM", label: "Time Slot 1 (08:00 AM - 11:00 AM)" },
  { id: "11:00 AM - 02:00 PM", label: "Time Slot 2 (11:00 AM - 02:00 PM)" },
  { id: "02:00 PM - 05:00 PM", label: "Time Slot 3 (02:00 PM - 05:00 PM)" },
] as const;

export type TimeSlotId = (typeof TIME_SLOTS)[number]["id"];

