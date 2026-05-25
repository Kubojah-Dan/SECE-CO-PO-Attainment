import 'dotenv/config'
import { PrismaClient, Role, SubjectType, BloomsLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...\n')

  // 1. AttainmentConfig
  const config = await prisma.attainmentConfig.upsert({
    where: { id: 'default-config' },
    update: {},
    create: {
      id: 'default-config',
      directWeight: 0.8,
      indirectWeight: 0.2,
      targetMet: 60,
      nearTarget: 50,
      updatedAt: new Date(),
    },
  })
  console.log('✅ AttainmentConfig seeded:', config.id)

  // 2. Program Outcomes PO1–PO12
  const poData = [
    { number: 1, code: 'PO1', description: 'Engineering knowledge: Apply knowledge of mathematics, science, engineering fundamentals and an engineering specialisation for the solution of complex engineering problems.' },
    { number: 2, code: 'PO2', description: 'Problem analysis: Identify, formulate, review research literature, and analyse complex engineering problems reaching substantiated conclusions using first principles.' },
    { number: 3, code: 'PO3', description: 'Design/development of solutions: Design solutions for complex engineering problems and design system components or processes that meet the specified needs.' },
    { number: 4, code: 'PO4', description: 'Conduct investigations of complex problems: Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data.' },
    { number: 5, code: 'PO5', description: 'Modern tool usage: Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modelling.' },
    { number: 6, code: 'PO6', description: 'The engineer and society: Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues.' },
    { number: 7, code: 'PO7', description: 'Environment and sustainability: Understand the impact of the professional engineering solutions in societal and environmental contexts.' },
    { number: 8, code: 'PO8', description: 'Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.' },
    { number: 9, code: 'PO9', description: 'Individual and team work: Function effectively as an individual, and as a member or leader in diverse teams and in multidisciplinary settings.' },
    { number: 10, code: 'PO10', description: 'Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large.' },
    { number: 11, code: 'PO11', description: 'Project management and finance: Demonstrate knowledge and understanding of the engineering and management principles and apply these to manage projects.' },
    { number: 12, code: 'PO12', description: 'Life-long learning: Recognise the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.' },
  ]

  const pos = await prisma.$transaction(
    poData.map((po) =>
      prisma.programOutcome.upsert({
        where: { code: po.code },
        update: { description: po.description, updatedAt: new Date() },
        create: { ...po, updatedAt: new Date() },
      })
    )
  )
  console.log(`✅ ProgramOutcomes seeded: ${pos.length} POs`)

  // 3. Program Specific Outcomes PSO1–PSO2
  const psoData = [
    { number: 1, code: 'PSO1', description: 'Apply domain-specific knowledge to solve real-world engineering problems using fundamental concepts and systematic approaches.' },
    { number: 2, code: 'PSO2', description: 'Design and develop software systems using modern tools, methodologies, and best practices to meet industry standards.' },
  ]

  const psos = await prisma.$transaction(
    psoData.map((pso) =>
      prisma.programSpecificOutcome.upsert({
        where: { code: pso.code },
        update: { description: pso.description, updatedAt: new Date() },
        create: { ...pso, updatedAt: new Date() },
      })
    )
  )
  console.log(`✅ ProgramSpecificOutcomes seeded: ${psos.length} PSOs`)

  // 4. Department
  const cseDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Department of Computer Science and Engineering',
    },
  })
  console.log('✅ Department seeded:', cseDept.code)

  // 5. Regulation
  const regulation = await prisma.regulation.upsert({
    where: { name: 'R2021' },
    update: {},
    create: { name: 'R2021' },
  })
  console.log('✅ Regulation seeded:', regulation.name)

  // 6. Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { name: '2024-25' },
    update: { isCurrent: true },
    create: { name: '2024-25', isCurrent: true },
  })
  console.log('✅ AcademicYear seeded:', academicYear.name)

  // 7. Users — hash password once
  const passwordHash = await bcrypt.hash('Admin@123', 12)

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@obeattain.edu' },
    update: {},
    create: {
      employeeId: 'SA001',
      email: 'admin@obeattain.edu',
      name: 'Super Admin',
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  })

  // HOD
  const hod = await prisma.user.upsert({
    where: { email: 'hod@obeattain.edu' },
    update: {},
    create: {
      employeeId: 'HOD001',
      email: 'hod@obeattain.edu',
      name: 'Dr. Rajan K',
      passwordHash,
      role: Role.HOD,
      isActive: true,
      departmentId: cseDept.id,
    },
  })

  // Faculty
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@obeattain.edu' },
    update: {},
    create: {
      employeeId: 'FAC001',
      email: 'faculty@obeattain.edu',
      name: 'Prof. Meera S',
      passwordHash,
      role: Role.FACULTY,
      isActive: true,
      departmentId: cseDept.id,
    },
  })

  // IQAC
  const iqac = await prisma.user.upsert({
    where: { email: 'iqac@obeattain.edu' },
    update: {},
    create: {
      employeeId: 'IQAC001',
      email: 'iqac@obeattain.edu',
      name: 'IQAC Officer',
      passwordHash,
      role: Role.IQAC,
      isActive: true,
    },
  })

  console.log(`✅ Users seeded: ${[superAdmin, hod, faculty, iqac].length} users`)

  // 8. Set CSE department hodId
  await prisma.department.update({
    where: { id: cseDept.id },
    data: { hodId: hod.id },
  })
  console.log('✅ Department HOD assigned:', hod.name)

  // 9. Subject + SubjectFaculty
  const subject = await prisma.subject.upsert({
    where: {
      code_regulationId_academicYearId: {
        code: 'CS3401',
        regulationId: regulation.id,
        academicYearId: academicYear.id,
      },
    },
    update: {},
    create: {
      code: 'CS3401',
      name: 'Operating Systems',
      semester: 5,
      type: SubjectType.THEORY,
      departmentId: cseDept.id,
      regulationId: regulation.id,
      academicYearId: academicYear.id,
    },
  })

  await prisma.subjectFaculty.upsert({
    where: { subjectId_facultyId: { subjectId: subject.id, facultyId: faculty.id } },
    update: {},
    create: { subjectId: subject.id, facultyId: faculty.id },
  })
  console.log('✅ Subject seeded:', subject.code, '| Faculty assigned:', faculty.name)

  // 10. Students
  const studentsData = [
    { rollNumber: 'CS22001', name: 'Arjun R',   email: 'cs22001@college.edu' },
    { rollNumber: 'CS22002', name: 'Divya M',   email: 'cs22002@college.edu' },
    { rollNumber: 'CS22003', name: 'Karthik S', email: 'cs22003@college.edu' },
    { rollNumber: 'CS22004', name: 'Priya T',   email: 'cs22004@college.edu' },
    { rollNumber: 'CS22005', name: 'Sanjay V',  email: 'cs22005@college.edu' },
  ]

  const students = await prisma.$transaction(
    studentsData.map((s) =>
      prisma.student.upsert({
        where: {
          rollNumber_departmentId: {
            rollNumber: s.rollNumber,
            departmentId: cseDept.id,
          },
        },
        update: {},
        create: {
          ...s,
          batch: '2022-26',
          departmentId: cseDept.id,
        },
      })
    )
  )
  console.log(`✅ Students seeded: ${students.length} students`)

  // Summary
  const counts = await Promise.all([
    prisma.attainmentConfig.count(),
    prisma.programOutcome.count(),
    prisma.programSpecificOutcome.count(),
    prisma.department.count(),
    prisma.regulation.count(),
    prisma.academicYear.count(),
    prisma.user.count(),
    prisma.subject.count(),
    prisma.student.count(),
  ])

  console.log('\n═══════════════════════════════════')
  console.log('       SEED SUMMARY')
  console.log('═══════════════════════════════════')
  console.table({
    AttainmentConfig:      counts[0],
    ProgramOutcomes:       counts[1],
    ProgramSpecificOutcomes: counts[2],
    Departments:           counts[3],
    Regulations:           counts[4],
    AcademicYears:         counts[5],
    Users:                 counts[6],
    Subjects:              counts[7],
    Students:              counts[8],
  })
  console.log('═══════════════════════════════════')
  console.log('✅ Seed completed successfully!\n')
  console.log('Test Credentials (password: Admin@123):')
  console.log('  Super Admin : admin@obeattain.edu')
  console.log('  HOD         : hod@obeattain.edu')
  console.log('  Faculty     : faculty@obeattain.edu')
  console.log('  IQAC        : iqac@obeattain.edu')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
