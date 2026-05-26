import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksService, subjectService, allocationService } from '../../services/api';
import Card from '../../components/ui/Card';
import { Save, ArrowLeft, Loader2, Upload, FileSpreadsheet, Check, AlertTriangle, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

export default function MarksEntryPage() {
  const { allocId, assessmentType } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [studentMarks, setStudentMarks] = useState([]);
  const [questionMarks, setQuestionMarks] = useState({}); // studentId -> { questionId -> mark }
  const [useQuestionWise, setUseQuestionWise] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: subjectData, isLoading: isSubLoading } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
  });

  const { data: configs, isLoading: isConfigsLoading } = useQuery({
    queryKey: ['assessments', allocId],
    queryFn: () => allocationService.getAssessments(allocId),
    select: (res) => res.data?.filter(c => c.is_enabled)
  });

  const { data: qMappings, isLoading: isQLoading } = useQuery({
    queryKey: ['question-mappings', allocId, assessmentType],
    queryFn: () => marksService.getQuestionMappings({ 
      subject_allocation: allocId, 
      assessment_type__code: assessmentType?.toUpperCase() 
    }),
    enabled: !!assessmentType,
    select: (res) => res.data.results
  });

  const { data: students, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['allocation-students', allocId],
    queryFn: () => subjectService.getAllocationStudents(allocId),
  });

  const { data: existingMarks, isLoading: isMarksLoading } = useQuery({
    queryKey: ['existing-marks', allocId, assessmentType],
    queryFn: () => marksService.get(allocId, assessmentType),
    enabled: !!assessmentType,
    select: (res) => res.data.results || res.data
  });

  const { data: existingQuestionMarks } = useQuery({
    queryKey: ['existing-question-marks', allocId, assessmentType],
    queryFn: () => marksService.getQuestionMarks({ 
      question_mapping__subject_allocation: allocId, 
      question_mapping__assessment_type__code: assessmentType?.toUpperCase() 
    }),
    enabled: !!assessmentType,
    select: (res) => res.data.results || res.data
  });

  React.useEffect(() => {
    if (!assessmentType && configs && configs.length > 0) {
      navigate(`/faculty/subjects/${allocId}/marks/${configs[0].assessment_type_code.toLowerCase()}`, { replace: true });
    }
  }, [assessmentType, configs, allocId, navigate]);

  React.useEffect(() => {
    if (students?.data) {
      const marksMap = {};
      const absMap = {};
      
      const marksList = Array.isArray(existingMarks) ? existingMarks : [];
      marksList.forEach(m => {
        marksMap[m.student] = m.marks_obtained;
        absMap[m.student] = m.is_absent;
      });

      setStudentMarks(students.data.map(s => ({
        student_id: s.id,
        roll_number: s.roll_number,
        name: s.name,
        marks_obtained: marksMap[s.id] !== undefined && marksMap[s.id] !== null ? marksMap[s.id] : '',
        is_absent: absMap[s.id] || false
      })));

      if (existingQuestionMarks?.length > 0) {
        const qmState = {};
        existingQuestionMarks.forEach(qm => {
          if (!qmState[qm.student]) {
            qmState[qm.student] = {};
          }
          qmState[qm.student][qm.question_mapping] = qm.marks_obtained;
        });
        setQuestionMarks(qmState);
        setUseQuestionWise(true);
      }
    }
  }, [students, existingMarks, existingQuestionMarks]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (useQuestionWise) {
        // Transform questionMarks object to array for API
        const payload = Object.entries(questionMarks).flatMap(([studentId, marks]) => 
          Object.entries(marks).map(([qId, val]) => ({
            student: studentId,
            question_mapping: qId,
            marks_obtained: val
          }))
        );
        return marksService.saveQuestionMarks({ marks: payload });
      }
      return marksService.saveMarks(allocId, assessmentType, data);
    },
    onSuccess: () => {
      toast.success('Marks saved successfully');
      queryClient.invalidateQueries(['subject-allocation', allocId]);
      navigate(`/faculty/subjects/${allocId}`);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.info('Uploading and processing Excel...', { autoClose: false });

    try {
      await marksService.uploadExcel(allocId, assessmentType?.toUpperCase(), file);
      
      // Invalidate queries to reload all student and marks data from database
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subject-allocation', allocId] }),
        queryClient.invalidateQueries({ queryKey: ['allocation-students', allocId] }),
        queryClient.invalidateQueries({ queryKey: ['existing-marks', allocId, assessmentType] }),
        queryClient.invalidateQueries({ queryKey: ['existing-question-marks', allocId, assessmentType] }),
        queryClient.invalidateQueries({ queryKey: ['question-mappings', allocId, assessmentType] }),
      ]);

      toast.update(toastId, {
        render: 'Excel processed and marks updated successfully!',
        type: 'success',
        autoClose: 5000,
      });
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to process Excel file. Please ensure the template format is correct.';
      toast.update(toastId, {
        render: errMsg,
        type: 'error',
        autoClose: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMarkChange = (index, value) => {
    const newMarks = [...studentMarks];
    newMarks[index].marks_obtained = value;
    setStudentMarks(newMarks);
  };

  if (isSubLoading || isStudentsLoading || isMarksLoading || isConfigsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (configs && configs.length === 0) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-6 mt-12 bg-white rounded-3xl border border-slate-100 shadow-xl">
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-gray-900">No Enabled Assessments</h2>
        <p className="text-gray-500 text-sm leading-relaxed mt-2">
          You need to enable at least one assessment type (like CIA1 or ESE) in the Assessment Configuration before entering student marks.
        </p>
        <button 
          onClick={() => navigate(`/faculty/subjects/${allocId}/assessments`)} 
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          Go to Assessment Config
        </button>
      </div>
    );
  }

  const assessmentName = assessmentType?.toUpperCase() || 'Marks Entry';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-gray-100 pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button 
            onClick={() => navigate(`/faculty/subjects/${allocId}`)}
            className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors self-start"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Subject
          </button>
          
          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-black text-slate-900 font-display">{assessmentName} Marks</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{subjectData?.data?.subject_name}</p>
          </div>
        </div>

        {configs && configs.length > 0 && (
          <div className="w-full overflow-x-auto pb-2 pt-1 -mb-2">
            <div className="flex items-center bg-slate-100/85 p-1 rounded-2xl gap-1 border border-slate-200/50 w-max min-w-full">
              {configs.map((cfg) => {
                const isActive = assessmentType?.toUpperCase() === cfg.assessment_type_code?.toUpperCase();
                return (
                  <button
                    key={cfg.id}
                    onClick={() => navigate(`/faculty/subjects/${allocId}/marks/${cfg.assessment_type_code.toLowerCase()}`)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {cfg.assessment_type_name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1 bg-white border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6">
          <div>
            <h3 className="font-bold text-slate-900">Question-wise Granularity</h3>
            <p className="text-xs text-slate-500 mt-1">Map marks to specific Course Outcomes (COs)</p>
          </div>
          <div className="flex items-center gap-3">
            {qMappings?.length > 0 ? (
              <button 
                onClick={() => setUseQuestionWise(!useQuestionWise)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  useQuestionWise ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {useQuestionWise ? 'Switch to Total Marks' : 'Enable Question-wise'}
              </button>
            ) : (
              <Link 
                to={`/faculty/subjects/${allocId}/question-mapping/${assessmentType}`}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
              >
                <LayoutGrid size={14} /> Define Structure
              </Link>
            )}
          </div>
        </Card>
        
        <Card className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Excel Upload</p>
              <h3 className="text-lg font-bold mt-1">Import from Template</h3>
              <p className="text-blue-100 text-xs mt-1">Use the standard Excel template for bulk entry</p>
            </div>
            <label className="cursor-pointer bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 flex-shrink-0">
              <Upload size={16} />
              Choose File
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left table-auto">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-widest sticky left-0 bg-slate-900 z-20 min-w-[150px]">Student Details</th>
                {useQuestionWise ? (
                  qMappings.map(q => (
                    <th key={q.id} className="p-4 text-[10px] font-bold uppercase tracking-tighter text-center min-w-[80px]">
                      {q.question_number}
                      <div className="text-blue-400 font-black">{q.co_code}</div>
                    </th>
                  ))
                ) : (
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-center min-w-[120px]">Total Marks</th>
                )}
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-center min-w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentMarks.map((student, index) => (
                <tr key={student.student_id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-50">
                    <div className="font-mono text-sm font-bold text-slate-700">{student.roll_number}</div>
                    <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{student.name}</div>
                  </td>
                  {useQuestionWise ? (
                    qMappings.map(q => (
                      <td key={q.id} className="p-2 border-r border-gray-50">
                        <input 
                          type="number"
                          className="form-input w-full text-center font-bold text-blue-600 p-1"
                          value={questionMarks[student.student_id]?.[q.id] || ''}
                          disabled={student.is_absent}
                          onChange={(e) => {
                            setQuestionMarks({
                              ...questionMarks,
                              [student.student_id]: {
                                ...(questionMarks[student.student_id] || {}),
                                [q.id]: e.target.value
                              }
                            });
                            // Update total marks for this student
                            const rowMarks = {...(questionMarks[student.student_id] || {}), [q.id]: e.target.value};
                            const total = Object.values(rowMarks).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                            handleMarkChange(index, total);
                          }}
                        />
                      </td>
                    ))
                  ) : (
                    <td className="p-4">
                      <input 
                        type="number"
                        className="form-input w-full text-center font-bold text-blue-600 focus:ring-blue-500/20"
                        value={student.marks_obtained}
                        disabled={student.is_absent}
                        onChange={(e) => handleMarkChange(index, e.target.value)}
                      />
                    </td>
                  )}
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => {
                        const newMarks = [...studentMarks];
                        newMarks[index].is_absent = !newMarks[index].is_absent;
                        if (newMarks[index].is_absent) newMarks[index].marks_obtained = '';
                        setStudentMarks(newMarks);
                      }}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${
                        student.is_absent 
                        ? 'bg-red-50 text-red-600 border-red-100' 
                        : 'bg-green-50 text-green-600 border-green-100'
                      }`}
                    >
                      {student.is_absent ? 'ABSENT' : 'PRESENT'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div className="flex items-center gap-6 justify-between sm:justify-start w-full sm:w-auto">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Students</p>
            <p className="text-xl font-black text-slate-900">{studentMarks.length}</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Entered</p>
            <p className="text-xl font-black text-blue-600">{studentMarks.filter(m => m.marks_obtained !== '' || m.is_absent).length}</p>
          </div>
        </div>
        
        <button 
          onClick={() => saveMutation.mutate(studentMarks)}
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
          Save Marks
        </button>
      </div>
    </div>
  );
}
