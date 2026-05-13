/**
 * Attainment Calculation Engine
 * 
 * Formula:
 *   Direct CO Attainment = (students who scored >= threshold%) / total students × 100
 *   Final CO Attainment = (Direct × directWeightage) + (Indirect × indirectWeightage)
 *   PO Attainment = Σ(CO_Attainment × CorrelationLevel) / Σ(CorrelationLevel) for all COs mapped to PO
 */

import { db } from "@workspace/db";
import {
  studentMarksTable,
  courseOutcomesTable,
  directAttainmentTable,
  indirectAttainmentTable,
  finalAttainmentTable,
  coPOMappingsTable,
  programOutcomesTable,
  programSpecificOutcomesTable,
  studentsTable,
  subjectsTable,
  departmentsTable,
} from "@workspace/db";
import { eq, and, avg, count, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface COAttainmentResult {
  coId: number;
  coCode: string;
  description: string;
  directAttainment: number;
  indirectAttainment: number;
  directWeightage: number;
  indirectWeightage: number;
  finalAttainment: number;
  threshold: number;
  isAttained: boolean;
  studentCount: number;
  attainedCount: number;
}

export async function calculateCOAttainment(params: {
  subjectId: number;
  directWeightage: number;
  indirectWeightage: number;
  threshold: number;
  academicYear?: string | null;
}): Promise<COAttainmentResult[]> {
  const { subjectId, directWeightage, indirectWeightage, threshold } = params;

  const cos = await db
    .select()
    .from(courseOutcomesTable)
    .where(eq(courseOutcomesTable.subjectId, subjectId));

  if (cos.length === 0) return [];

  const results: COAttainmentResult[] = [];

  for (const co of cos) {
    const marks = await db
      .select()
      .from(studentMarksTable)
      .where(and(eq(studentMarksTable.subjectId, subjectId), eq(studentMarksTable.coId, co.id)));

    const studentScores: Record<number, { obtained: number; max: number }> = {};
    for (const mark of marks) {
      if (!studentScores[mark.studentId]) {
        studentScores[mark.studentId] = { obtained: 0, max: 0 };
      }
      studentScores[mark.studentId].obtained += mark.marksObtained;
      studentScores[mark.studentId].max += mark.maxMarks;
    }

    const totalStudents = Object.keys(studentScores).length;
    let attainedStudents = 0;
    const attainmentThresholdPercent = 60;

    for (const [, score] of Object.entries(studentScores)) {
      if (score.max > 0 && (score.obtained / score.max) * 100 >= attainmentThresholdPercent) {
        attainedStudents++;
      }
    }

    const directAttainmentValue = totalStudents > 0
      ? (attainedStudents / totalStudents) * 100
      : 0;

    const indirectRows = await db
      .select()
      .from(indirectAttainmentTable)
      .where(and(eq(indirectAttainmentTable.subjectId, subjectId), eq(indirectAttainmentTable.coId, co.id)));

    const indirectAttainmentValue = indirectRows.length > 0
      ? indirectRows.reduce((sum, r) => sum + r.attainmentValue, 0) / indirectRows.length
      : 0;

    const finalAttainmentValue =
      (directAttainmentValue * directWeightage) +
      (indirectAttainmentValue * indirectWeightage);

    const isAttained = finalAttainmentValue >= threshold;

    await db
      .insert(directAttainmentTable)
      .values({
        subjectId,
        coId: co.id,
        attainmentValue: directAttainmentValue,
        studentCount: totalStudents,
        attainedCount: attainedStudents,
        academicYear: params.academicYear ?? null,
      })
      .onConflictDoNothing();

    const existing = await db
      .select()
      .from(finalAttainmentTable)
      .where(and(eq(finalAttainmentTable.subjectId, subjectId), eq(finalAttainmentTable.coId, co.id)));

    if (existing.length > 0) {
      await db
        .update(finalAttainmentTable)
        .set({
          directAttainment: directAttainmentValue,
          indirectAttainment: indirectAttainmentValue,
          directWeightage,
          indirectWeightage,
          finalAttainment: finalAttainmentValue,
          threshold,
          isAttained,
          academicYear: params.academicYear ?? null,
          calculatedAt: new Date(),
        })
        .where(and(eq(finalAttainmentTable.subjectId, subjectId), eq(finalAttainmentTable.coId, co.id)));
    } else {
      await db
        .insert(finalAttainmentTable)
        .values({
          subjectId,
          coId: co.id,
          directAttainment: directAttainmentValue,
          indirectAttainment: indirectAttainmentValue,
          directWeightage,
          indirectWeightage,
          finalAttainment: finalAttainmentValue,
          threshold,
          isAttained,
          academicYear: params.academicYear ?? null,
        });
    }

    results.push({
      coId: co.id,
      coCode: co.code,
      description: co.description,
      directAttainment: directAttainmentValue,
      indirectAttainment: indirectAttainmentValue,
      directWeightage,
      indirectWeightage,
      finalAttainment: finalAttainmentValue,
      threshold,
      isAttained,
      studentCount: totalStudents,
      attainedCount: attainedStudents,
    });
  }

  return results;
}

export async function calculatePOAttainment(departmentId: number): Promise<Array<{
  poId: number; poCode: string; description: string; attainmentValue: number; isAttained: boolean; threshold: number | null;
}>> {
  const pos = await db
    .select()
    .from(programOutcomesTable)
    .where(eq(programOutcomesTable.departmentId, departmentId));

  const results = [];
  const defaultThreshold = 60;

  for (const po of pos) {
    const mappings = await db
      .select()
      .from(coPOMappingsTable)
      .where(and(eq(coPOMappingsTable.targetId, po.id), eq(coPOMappingsTable.targetType, "PO")));

    if (mappings.length === 0) {
      results.push({ poId: po.id, poCode: po.code, description: po.description, attainmentValue: 0, isAttained: false, threshold: defaultThreshold });
      continue;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const mapping of mappings) {
      if (mapping.correlationLevel === 0) continue;
      const finalRow = await db
        .select()
        .from(finalAttainmentTable)
        .where(eq(finalAttainmentTable.coId, mapping.coId))
        .limit(1);
      if (finalRow.length > 0) {
        weightedSum += finalRow[0].finalAttainment * mapping.correlationLevel;
        totalWeight += mapping.correlationLevel;
      }
    }

    const attainmentValue = totalWeight > 0 ? weightedSum / totalWeight : 0;
    results.push({
      poId: po.id, poCode: po.code, description: po.description,
      attainmentValue, isAttained: attainmentValue >= defaultThreshold, threshold: defaultThreshold,
    });
  }

  return results;
}

export async function calculatePSOAttainment(departmentId: number): Promise<Array<{
  psoId: number; psoCode: string; description: string; attainmentValue: number; isAttained: boolean; threshold: number | null;
}>> {
  const psos = await db
    .select()
    .from(programSpecificOutcomesTable)
    .where(eq(programSpecificOutcomesTable.departmentId, departmentId));

  const results = [];
  const defaultThreshold = 60;

  for (const pso of psos) {
    const mappings = await db
      .select()
      .from(coPOMappingsTable)
      .where(and(eq(coPOMappingsTable.targetId, pso.id), eq(coPOMappingsTable.targetType, "PSO")));

    if (mappings.length === 0) {
      results.push({ psoId: pso.id, psoCode: pso.code, description: pso.description, attainmentValue: 0, isAttained: false, threshold: defaultThreshold });
      continue;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const mapping of mappings) {
      if (mapping.correlationLevel === 0) continue;
      const finalRow = await db
        .select()
        .from(finalAttainmentTable)
        .where(eq(finalAttainmentTable.coId, mapping.coId))
        .limit(1);
      if (finalRow.length > 0) {
        weightedSum += finalRow[0].finalAttainment * mapping.correlationLevel;
        totalWeight += mapping.correlationLevel;
      }
    }

    const attainmentValue = totalWeight > 0 ? weightedSum / totalWeight : 0;
    results.push({
      psoId: pso.id, psoCode: pso.code, description: pso.description,
      attainmentValue, isAttained: attainmentValue >= defaultThreshold, threshold: defaultThreshold,
    });
  }

  return results;
}
