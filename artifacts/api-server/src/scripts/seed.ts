/**
 * Seed script — creates initial data for the OBE system.
 * Run: pnpm --filter @workspace/api-server run seed
 */
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable, departmentsTable, regulationsTable, subjectsTable,
  courseOutcomesTable, programOutcomesTable, programSpecificOutcomesTable,
  studentsTable, coPOMappingsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

async function seed() {
  logger.info("Starting seed...");

  // 1. Departments
  const [cse, ece, mech] = await db
    .insert(departmentsTable)
    .values([
      { name: "Computer Science & Engineering", code: "CSE" },
      { name: "Electronics & Communication Engg", code: "ECE" },
      { name: "Mechanical Engineering", code: "MECH" },
    ])
    .onConflictDoNothing()
    .returning();

  const deptCSE = cse ?? (await db.query.departmentsTable?.findFirst({ where: (d, { eq }) => eq(d.code, "CSE") })) as typeof cse;
  const deptECE = ece ?? (await db.query.departmentsTable?.findFirst({ where: (d, { eq }) => eq(d.code, "ECE") })) as typeof ece;

  if (!deptCSE || !deptECE) {
    logger.error("Failed to create/find departments");
    return;
  }

  // 2. Users
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const [superAdmin, hod, faculty1, faculty2, iqac] = await db
    .insert(usersTable)
    .values([
      { name: "Super Admin", email: "admin@obe.edu", passwordHash, role: "SUPER_ADMIN", isActive: true },
      { name: "Dr. Rajesh Kumar", email: "hod.cse@obe.edu", passwordHash, role: "HOD", isActive: true, departmentId: deptCSE.id },
      { name: "Prof. Priya Sharma", email: "priya@obe.edu", passwordHash, role: "FACULTY", isActive: true, departmentId: deptCSE.id },
      { name: "Prof. Arjun Mehta", email: "arjun@obe.edu", passwordHash, role: "FACULTY", isActive: true, departmentId: deptCSE.id },
      { name: "Dr. Lakshmi Nair", email: "iqac@obe.edu", passwordHash, role: "IQAC", isActive: true },
    ])
    .onConflictDoNothing()
    .returning();

  if (!faculty1 || !faculty2) {
    logger.warn("Users may already exist, continuing...");
  }

  const f1 = faculty1 ?? { id: 3 };
  const f2 = faculty2 ?? { id: 4 };

  // 3. Update department HOD
  await db.update(departmentsTable).set({ hodUserId: hod?.id ?? 2 }).where(
    (await import("drizzle-orm")).eq(departmentsTable.id, deptCSE.id)
  );

  // 4. Regulations
  const [reg2019, reg2021] = await db
    .insert(regulationsTable)
    .values([
      { name: "R2019", year: 2019, departmentId: deptCSE.id },
      { name: "R2021", year: 2021, departmentId: deptCSE.id },
    ])
    .onConflictDoNothing()
    .returning();

  const r2019 = reg2019 ?? { id: 1 };

  // 5. Subjects
  const [ds, algo, os, dbms] = await db
    .insert(subjectsTable)
    .values([
      { name: "Data Structures", code: "CS2201", semester: 3, academicYear: "2024-25", credits: 4, departmentId: deptCSE.id, regulationId: r2019.id, facultyId: f1.id },
      { name: "Design & Analysis of Algorithms", code: "CS3301", semester: 5, academicYear: "2024-25", credits: 4, departmentId: deptCSE.id, regulationId: r2019.id, facultyId: f1.id },
      { name: "Operating Systems", code: "CS3302", semester: 5, academicYear: "2024-25", credits: 3, departmentId: deptCSE.id, regulationId: r2019.id, facultyId: f2.id },
      { name: "Database Management Systems", code: "CS3303", semester: 5, academicYear: "2024-25", credits: 3, departmentId: deptCSE.id, regulationId: r2019.id, facultyId: f2.id },
    ])
    .onConflictDoNothing()
    .returning();

  if (!ds) { logger.warn("Subjects may already exist"); return; }

  // 6. Course Outcomes for DS
  const cos = await db
    .insert(courseOutcomesTable)
    .values([
      { subjectId: ds.id, code: "CS2201.CO1", description: "Understand and implement linear data structures", bloomsLevel: "Apply" },
      { subjectId: ds.id, code: "CS2201.CO2", description: "Implement tree and graph data structures", bloomsLevel: "Apply" },
      { subjectId: ds.id, code: "CS2201.CO3", description: "Analyze time and space complexity of algorithms", bloomsLevel: "Analyze" },
      { subjectId: ds.id, code: "CS2201.CO4", description: "Apply appropriate data structure for real-world problems", bloomsLevel: "Evaluate" },
      { subjectId: ds.id, code: "CS2201.CO5", description: "Design and implement sorting and searching algorithms", bloomsLevel: "Create" },
    ])
    .returning();

  // 7. Program Outcomes for CSE
  const pos = await db
    .insert(programOutcomesTable)
    .values([
      { departmentId: deptCSE.id, code: "PO1", description: "Engineering Knowledge: Apply mathematics, science, and engineering fundamentals" },
      { departmentId: deptCSE.id, code: "PO2", description: "Problem Analysis: Identify, formulate, and solve complex engineering problems" },
      { departmentId: deptCSE.id, code: "PO3", description: "Design/Development of Solutions: Design systems and processes meeting constraints" },
      { departmentId: deptCSE.id, code: "PO4", description: "Conduct Investigations: Use research methods and analyze data" },
      { departmentId: deptCSE.id, code: "PO5", description: "Modern Tool Usage: Apply appropriate techniques and modern engineering tools" },
      { departmentId: deptCSE.id, code: "PO6", description: "The Engineer and Society: Apply reasoning for societal impact assessment" },
      { departmentId: deptCSE.id, code: "PO7", description: "Environment and Sustainability: Understand the impact of solutions on environment" },
      { departmentId: deptCSE.id, code: "PO8", description: "Ethics: Apply ethical principles and commit to professional ethics" },
      { departmentId: deptCSE.id, code: "PO9", description: "Individual and Team Work: Function effectively in teams" },
      { departmentId: deptCSE.id, code: "PO10", description: "Communication: Communicate effectively with the engineering community" },
      { departmentId: deptCSE.id, code: "PO11", description: "Project Management and Finance: Demonstrate engineering management and finance" },
      { departmentId: deptCSE.id, code: "PO12", description: "Life-long Learning: Recognize need for and engage in independent learning" },
    ])
    .returning();

  // 8. PSOs
  const psos = await db
    .insert(programSpecificOutcomesTable)
    .values([
      { departmentId: deptCSE.id, code: "PSO1", description: "Apply computer science fundamentals to analyze and build software systems" },
      { departmentId: deptCSE.id, code: "PSO2", description: "Demonstrate proficiency in full-stack development and system design" },
    ])
    .returning();

  // 9. CO-PO Mappings
  if (cos.length > 0 && pos.length > 0) {
    const mappings = [
      // CO1 mappings
      { coId: cos[0].id, targetType: "PO" as const, targetId: pos[0].id, correlationLevel: 3, isApproved: true },
      { coId: cos[0].id, targetType: "PO" as const, targetId: pos[1].id, correlationLevel: 2, isApproved: true },
      { coId: cos[0].id, targetType: "PO" as const, targetId: pos[4].id, correlationLevel: 3, isApproved: true },
      // CO2 mappings
      { coId: cos[1].id, targetType: "PO" as const, targetId: pos[0].id, correlationLevel: 2, isApproved: true },
      { coId: cos[1].id, targetType: "PO" as const, targetId: pos[2].id, correlationLevel: 3, isApproved: true },
      { coId: cos[1].id, targetType: "PO" as const, targetId: pos[4].id, correlationLevel: 2, isApproved: true },
      // CO3 mappings
      { coId: cos[2].id, targetType: "PO" as const, targetId: pos[0].id, correlationLevel: 3, isApproved: true },
      { coId: cos[2].id, targetType: "PO" as const, targetId: pos[1].id, correlationLevel: 3, isApproved: true },
      { coId: cos[2].id, targetType: "PO" as const, targetId: pos[3].id, correlationLevel: 2, isApproved: true },
      // CO4
      { coId: cos[3].id, targetType: "PO" as const, targetId: pos[2].id, correlationLevel: 3, isApproved: false },
      { coId: cos[3].id, targetType: "PO" as const, targetId: pos[1].id, correlationLevel: 2, isApproved: false },
      // CO5
      { coId: cos[4].id, targetType: "PO" as const, targetId: pos[2].id, correlationLevel: 3, isApproved: true },
      { coId: cos[4].id, targetType: "PO" as const, targetId: pos[4].id, correlationLevel: 3, isApproved: true },
      // PSO mappings
      { coId: cos[0].id, targetType: "PSO" as const, targetId: psos[0].id, correlationLevel: 3, isApproved: true },
      { coId: cos[1].id, targetType: "PSO" as const, targetId: psos[0].id, correlationLevel: 2, isApproved: true },
      { coId: cos[4].id, targetType: "PSO" as const, targetId: psos[1].id, correlationLevel: 3, isApproved: true },
    ];
    await db.insert(coPOMappingsTable).values(mappings).onConflictDoNothing();
  }

  // 10. Sample Students
  const students = [];
  for (let i = 1; i <= 30; i++) {
    students.push({
      rollNumber: `211CS${String(i).padStart(3, "0")}`,
      name: `Student ${i}`,
      email: `student${i}@college.edu`,
      departmentId: deptCSE.id,
      regulationId: r2019.id,
      semester: 5,
      academicYear: "2024-25",
    });
  }
  await db.insert(studentsTable).values(students).onConflictDoNothing();

  logger.info("Seed completed successfully!");
  logger.info("Login credentials: admin@obe.edu / Admin@123");
  logger.info("Also available: hod.cse@obe.edu, priya@obe.edu, arjun@obe.edu, iqac@obe.edu — all use Admin@123");
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
