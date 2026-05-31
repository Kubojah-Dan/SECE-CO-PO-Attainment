/**
 * SECE CO-PO Platform — Staff Mark Entry Page
 * HR Staff can download templates and upload marks for subjects
 * assigned to their departments where staff_mark_entry_enabled=True.
 */
import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  staffService, marksService, subjectService,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import {
  BookMarked, Download, Upload, Loader2, Search,
  AlertTriangle, CheckCircle2, ChevronDown, Building2,
  User, GraduationCap, X,
} from 'lucide-react';
import { toast } from 'react-toastify';

// ── Deterministic per-department color ───────────────────────
const DEPT_PALETTE = [
  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  { bg: 'bg-violet-50', text: 'text-violet-700',  border: 'border-violet-200'},
  { bg: 'bg-teal-50',   text: 'text-teal-700',    border: 'border-teal-200'  },
  { bg: 'bg-orange-50', text: 'text-orange-700',  border: 'border-orange-200'},
  { bg: 'bg-rose-50',   text: 'text-rose-700',    border: 'border-rose-200'  },
  { bg: 'bg-emerald-50',text: 'text-emerald-700', border: 'border-emerald-200'},
  { bg: 'bg-amber-50',  text: 'text-amber-700',   border: 'border-amber-200' },
  { bg: 'bg-sky-50',    text: 'text-sky-700',     border: 'border-sky-200'   },
];
const deptColor = (deptId) => DEPT_PALETTE[(deptId || 0) % DEPT_PALETTE.length];

// ── Exam type tabs (mirrors MarksEntryPage pattern) ─────────
const EXAM_TYPES = ['CIA1', 'CIA2', 'ESE', 'MODEL', 'ASSIGN', 'LAB', 'LAB_EXAM'];

// ── Upload result inline component ──────────────────────────
function UploadResult({ result, onClose }) {
  if (!result) return null;
  const { status, saved, skipped, errors } = result;
  const [showErrors, setShowErrors] = useState(false);

  if (status === 'SUCCESS') {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <CheckCircle2 size={16} className="flex-shrink-0" />
        <span className="font-semibold">{saved} marks saved successfully.</span>
        <button onClick={onClose} className="ml-auto text-emerald-400 hover:text-emerald-700"><X size={14} /></button>
      </div>
    );
  }
  if (status === 'PARTIAL') {
    return (
      <div className="mt-3 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-amber-700 font-semibold">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{saved} saved, {skipped} skipped.</span>
          {errors?.length > 0 && (
            <button
              onClick={() => setShowErrors(v => !v)}
              className="ml-auto text-xs underline text-amber-600 hover:text-amber-800 flex items-center gap-1"
            >
              {showErrors ? 'Hide' : 'Show'} errors
              <ChevronDown size={12} className={`transition-transform ${showErrors ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button onClick={onClose} className="text-amber-400 hover:text-amber-700"><X size={14} /></button>
        </div>
        {showErrors && errors?.length > 0 && (
          <ul className="mt-3 space-y-1 max-h-40 overflow-y-auto">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-1.5">
                Row {e.row}: {e.issue}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <AlertTriangle size={16} className="flex-shrink-0" />
      <span className="font-semibold">Upload failed — {result.error || 'Unknown error'}</span>
      <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-700"><X size={14} /></button>
    </div>
  );
}

// ── Subject Card ─────────────────────────────────────────────
function SubjectCard({ alloc }) {
  const [selectedExam, setSelectedExam] = useState('CIA1');
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);
  const color = deptColor(alloc.subject);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await marksService.downloadTemplate(alloc.id, selectedExam);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${alloc.subject_code}_${selectedExam}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Template downloaded: ${alloc.subject_code} — ${selectedExam}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download template.');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const toastId = toast.info(`Uploading ${selectedExam} marks for ${alloc.subject_code}…`, { autoClose: false });
    try {
      const res = await marksService.uploadExcel(alloc.id, selectedExam, file);
      const log = res.data;

      // Poll for completion (max 30s)
      let finalLog = log;
      if (log.status === 'PENDING' || log.status === 'PROCESSING') {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const pollRes = await marksService.getUploadStatus(log.id);
          finalLog = pollRes.data;
          if (['SUCCESS', 'PARTIAL', 'FAILED'].includes(finalLog.status)) break;
        }
      }

      const saved = finalLog.records_processed ?? 0;
      const skipped = (finalLog.records_total ?? 0) - saved;
      const errors = finalLog.errors ?? [];

      setUploadResult({
        status: finalLog.status,
        saved,
        skipped,
        errors,
        error: errors[0]?.error,
      });

      if (finalLog.status === 'SUCCESS') {
        toast.update(toastId, { render: `${saved} marks saved for ${alloc.subject_code} — ${selectedExam}`, type: 'success', autoClose: 5000, isLoading: false });
      } else if (finalLog.status === 'PARTIAL') {
        toast.update(toastId, { render: `${saved} saved, ${skipped} skipped — check errors below`, type: 'warning', autoClose: 5000, isLoading: false });
      } else {
        toast.update(toastId, { render: `Upload failed for ${alloc.subject_code}`, type: 'error', autoClose: 5000, isLoading: false });
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Check file format.';
      setUploadResult({ status: 'FAILED', error: msg });
      toast.update(toastId, { render: msg, type: 'error', autoClose: 5000, isLoading: false });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border border-gray-200 p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 tracking-wide font-mono">
              {alloc.subject_code}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${color.bg} ${color.text} ${color.border}`}>
              <Building2 size={11} className="mr-1" />
              {alloc.department_name || alloc.subject_name?.split(' ')[0]}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-gray-900 leading-tight">
            {alloc.subject_name}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <GraduationCap size={12} />
              {alloc.section_name}
            </span>
            <span>Sem {alloc.semester}</span>
            {alloc.faculty_name && (
              <span className="flex items-center gap-1">
                <User size={12} />
                {alloc.faculty_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Exam type selector */}
      <div className="flex flex-wrap gap-1.5">
        {EXAM_TYPES.map(type => (
          <button
            key={type}
            onClick={() => { setSelectedExam(type); setUploadResult(null); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              selectedExam === type
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-slate-400'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading
            ? <><Loader2 size={15} className="animate-spin" /> Downloading…</>
            : <><Download size={15} /> Download template</>
          }
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading
            ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
            : <><Upload size={15} /> Upload marks</>
          }
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Inline upload result */}
      <UploadResult result={uploadResult} onClose={() => setUploadResult(null)} />
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function StaffSubjectsPage() {
  const { user } = useAuth();
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [search, setSearch] = useState('');

  const { data: rawSubjects, isLoading } = useQuery({
    queryKey: ['staff-subjects', selectedDept, selectedYear, search],
    queryFn: () => staffService.fetchSubjects({
      department: selectedDept || undefined,
      academic_year: selectedYear || undefined,
      search: search || undefined,
    }),
    select: (res) => {
      const data = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
      return data;
    },
  });

  const subjects = rawSubjects ?? [];

  // Derive unique departments from the subjects list
  const deptOptions = React.useMemo(() => {
    const seen = new Map();
    subjects.forEach(s => {
      if (s.subject && !seen.has(String(s.subject))) {
        seen.set(String(s.subject), s.department_name || `Dept ${s.subject}`);
      }
    });
    // Fall back to academic_year field if available
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [subjects]);

  // Staff department names from user profile (for subtitle)
  const deptNames = user?.staff_departments
    ? user.staff_departments.join(', ')
    : 'your assigned departments';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <BookMarked size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Mark Entry — Assigned Subjects
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          You are assigned to <span className="font-semibold text-gray-700">{deptNames}</span>.
          Only subjects with staff upload enabled are shown.
        </p>
      </div>

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by subject name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all"
          />
        </div>

        {/* Department filter — only staff's own depts */}
        {deptOptions.length > 1 && (
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all min-w-[180px]"
          >
            <option value="">All Departments</option>
            {deptOptions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={40} className="animate-spin text-slate-400" />
          <p className="text-sm text-gray-400 font-medium">Loading subjects…</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
            <BookMarked size={28} className="text-slate-300" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-gray-800">No subjects available</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-sm">
              No subjects have staff mark entry enabled for your departments yet.
              Contact your HOD or faculty member to enable access.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} available
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {subjects.map(alloc => (
              <SubjectCard key={alloc.id} alloc={alloc} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
