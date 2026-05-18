import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksService, subjectService } from '../../services/api';
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Improved robust mapping
        const newMarks = [...studentMarks];
        data.forEach(row => {
          // Find roll number column (try common variants)
          const rollKey = Object.keys(row).find(k => 
            k.toLowerCase().replace(/[\s\._]/g, '') === 'rollno' || 
            k.toLowerCase().replace(/[\s\._]/g, '') === 'rollnumber'
          );
          
          if (!rollKey) return;
          
          const rollValue = String(row[rollKey]).trim();
          const studentIndex = newMarks.findIndex(m => m.roll_number === rollValue);
          
          if (studentIndex !== -1) {
            // Find marks column matching the current assessment type
            const targetAssess = assessmentType?.toUpperCase().replace(/[\s\-_]/g, '');
            const marksKey = Object.keys(row).find(k => {
              const normalizedK = k.toUpperCase().replace(/[\s\-_]/g, '');
              // Match exactly or start with assessment name
              return normalizedK === targetAssess || normalizedK.startsWith(targetAssess);
            });

            if (marksKey) {
              const val = row[marksKey];
              newMarks[studentIndex].marks_obtained = val !== undefined ? val : '';
            }

            // Check for status/absent
            const statusKey = Object.keys(row).find(k => k.toLowerCase() === 'status');
            if (statusKey) {
              newMarks[studentIndex].is_absent = String(row[statusKey]).toUpperCase().startsWith('A');
            }
          }
        });
        setStudentMarks(newMarks);
        toast.success(`Synced ${data.length} records from Excel`);
      } catch (err) {
        toast.error('Error processing Excel file');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMarkChange = (index, value) => {
    const newMarks = [...studentMarks];
    newMarks[index].marks_obtained = value;
    setStudentMarks(newMarks);
  };

  if (isSubLoading || isStudentsLoading || isMarksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const assessmentName = assessmentType?.toUpperCase() || 'Marks Entry';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900 font-display">{assessmentName} Marks</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{subjectData?.data?.subject_name}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1 bg-white border-slate-100 flex items-center justify-between p-6">
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
        <Card className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Excel Upload</p>
              <h3 className="text-lg font-bold mt-1">Import from Template</h3>
              <p className="text-blue-100 text-xs mt-1">Use the standard Excel template for bulk entry</p>
            </div>
            <label className="cursor-pointer bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all flex items-center gap-2">
              <Upload size={16} />
              Choose File
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-4 text-xs font-bold uppercase tracking-widest sticky left-0 bg-slate-900 z-20">Student Details</th>
              {useQuestionWise ? (
                qMappings.map(q => (
                  <th key={q.id} className="p-4 text-[10px] font-bold uppercase tracking-tighter text-center w-24">
                    {q.question_number}
                    <div className="text-blue-400 font-black">{q.co_code}</div>
                  </th>
                ))
              ) : (
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-center w-32">Total Marks</th>
              )}
              <th className="p-4 text-xs font-bold uppercase tracking-widest text-center w-24">Status</th>
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
      </Card>

      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
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
          className="px-10 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
          Save Marks
        </button>
      </div>
    </div>
  );
}
