/**
 * SECE CO-PO Platform — Faculty Dashboard
 * Shows: stat cards, subject list with marks status, CO attainment summary
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  BookMarked, Users, BarChart3, AlertCircle,
  CheckCircle2, Clock, ChevronRight, Upload,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { allocationService } from '../../services/api';
import AttainmentBadge from '../../components/ui/AttainmentBadge';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

// ── Skeleton loader ───────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-16 mb-2" />
      <div className="skeleton h-3 w-32" />
    </div>
  );
}

// ── Assessment Status Dots ────────────────────────────────────
const ASSESSMENT_CODES = ['CIA1', 'CIA2', 'CIA3', 'ESE', 'QUIZ', 'ASSIGN'];

function AssessmentStatusRow({ marks_status = {} }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {ASSESSMENT_CODES.map((code) => {
        const status = marks_status[code];
        return (
          <span
            key={code}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-mono font-semibold"
            style={{
              background: status === 'complete' ? 'var(--success-light)' :
                          status === 'partial'  ? '#FEF3C7' :
                          'var(--gray-100)',
              color: status === 'complete' ? '#065F46' :
                     status === 'partial'  ? '#92400E' :
                     'var(--gray-400)',
            }}
          >
            {status === 'complete' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
            {code}
          </span>
        );
      })}
    </div>
  );
}

// ── Subject Card ──────────────────────────────────────────────
function SubjectCard({ allocation, index }) {
  const completionPct = allocation.marks_completion_pct ?? 0;
  const hasAttainment = allocation.co_attainments?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card p-5 border border-gray-200 hover:border-slate-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Subject info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span
              className="subject-code text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}
            >
              {allocation.subject_code}
            </span>
            <span className="text-xs" style={{ color: 'var(--gray-400)' }}>
              Sem {allocation.semester} | Section {allocation.section_name}
            </span>
          </div>
          <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--gray-800)' }}>
            {allocation.subject_name}
          </h3>
          <div className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
            {allocation.student_count} students
          </div>

          {/* Assessment status */}
          <AssessmentStatusRow marks_status={allocation.marks_status ?? {}} />
        </div>

        {/* Right: CO attainment mini-display */}
        {hasAttainment && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            {allocation.co_attainments?.slice(0, 5).map((att) => (
              <div key={att.co_code} className="flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: 'var(--gray-500)', minWidth: '28px' }}>
                  {att.co_code}
                </span>
                <AttainmentBadge level={att.attainment_level} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--gray-500)' }}>
          <span>Marks entry progress</span>
          <span className="font-mono">{completionPct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <Link
          to={`/faculty/subjects/${allocation.id}/marks`}
          className="btn btn-primary flex-1 justify-center text-xs py-2"
        >
          <Upload size={13} /> Enter Marks
        </Link>
        <Link
          to={`/faculty/subjects/${allocation.id}/co-attainment`}
          className="btn btn-secondary flex-1 justify-center text-xs py-2"
        >
          <BarChart3 size={13} /> Attainment
        </Link>
        <Link
          to={`/faculty/subjects/${allocation.id}`}
          className="btn btn-ghost px-3 py-2"
          title="View subject details"
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </motion.div>
  );
}

import { useSelection } from '../../contexts/SelectionContext';

// ── Main Dashboard ────────────────────────────────────────────
export default function FacultyDashboard() {
  const { user, department } = useAuth();
  const { selectedAY } = useSelection();

  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ['faculty', 'my-subjects', selectedAY],
    queryFn: () => allocationService.mySubjects({ academic_year: selectedAY }),
    select: (res) => res.data,
  });

  const subjects = subjectsData?.results || subjectsData || [];

  // Summary stats
  const totalSubjects = subjects.length;
  const totalStudents = subjects.reduce((sum, s) => sum + (s.student_count || 0), 0);
  const pendingMarks = subjects.filter((s) => (s.marks_completion_pct ?? 0) < 100).length;
  const avgAttainment = subjects.length
    ? Math.round(subjects.reduce((sum, s) => sum + (s.overall_attainment ?? 0), 0) / subjects.length)
    : 0;

  const STATS = [
    { label: 'My Subjects',    value: totalSubjects },
    { label: 'Total Students', value: totalStudents },
    { label: 'Avg Attainment', value: `${avgAttainment}%` },
    { label: 'Pending Marks',  value: pendingMarks },
  ];

  const STAT_ICONS = [BookMarked, Users, TrendingUp, AlertCircle];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold mb-1 text-[var(--text-primary)] tracking-tight"
          >
            Good {getGreeting()}, {user?.first_name}!
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {department && <span className="font-medium">{department} · </span>}
            Here's your subjects overview.
          </p>
        </div>
        <AcademicYearSelector align="right" />
      </div>

      {/* ── Stat Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          : STATS.map((stat, i) => {
              const Icon = STAT_ICONS[i];
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="stat-card card-enter bg-white border border-gray-200 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    {/* Monochromatic slate icon — no varied pastels or colored borders */}
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Icon size={18} className="text-slate-700" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono mb-0.5" style={{ color: 'var(--gray-900)' }}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium" style={{ color: 'var(--gray-500)' }}>
                    {stat.label}
                  </div>
                </motion.div>
              );
            })}
      </div>

      {/* ── My Subjects ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--gray-800)' }}>
            My Subjects
          </h2>
          <Link to="/faculty/subjects" className="btn btn-ghost text-xs">
            View All <ChevronRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="skeleton h-5 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2 mb-4" />
                <div className="skeleton h-2 w-full mb-4" />
                <div className="flex gap-2">
                  <div className="skeleton h-8 flex-1" />
                  <div className="skeleton h-8 flex-1" />
                </div>
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="card p-12 text-center border border-gray-200">
            <BookMarked size={40} className="mx-auto mb-3" style={{ color: 'var(--gray-200)' }} />
            <h3 className="font-semibold mb-1" style={{ color: 'var(--gray-600)' }}>
              No subjects allocated for this year
            </h3>
            <p className="text-sm" style={{ color: 'var(--gray-400)' }}>
              Change the academic year or contact your HOD.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {subjects.map((allocation, i) => (
              <SubjectCard key={allocation.id} allocation={allocation} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
