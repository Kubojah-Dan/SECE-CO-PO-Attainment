import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  allocationService, assessmentTypeService, attainmentConfigService
} from '../../services/api';
import Card from '../../components/ui/Card';
import {
  ArrowLeft, Loader2, Settings2, Info, Plus, X, ChevronDown, Save, Sliders
} from 'lucide-react';
import { toast } from 'react-toastify';

const CATEGORY_OPTIONS = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'EXTERNAL', label: 'External' },
  { value: 'CONTINUOUS', label: 'Continuous' },
  { value: 'PROJECT', label: 'Project' },
];

const CATEGORY_COLORS = {
  INTERNAL: 'bg-blue-100 text-blue-700',
  EXTERNAL: 'bg-purple-100 text-purple-700',
  CONTINUOUS: 'bg-emerald-100 text-emerald-700',
  PROJECT: 'bg-amber-100 text-amber-700',
};

export default function AssessmentConfigPage() {
  const { allocId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: '', code: '', category: 'CONTINUOUS', default_max_marks: 100, weightage_percent: ''
  });

  // ── Queries ───────────────────────────────────────────────────
  const { data: configs, isLoading } = useQuery({
    queryKey: ['assessments', allocId],
    queryFn: () => allocationService.getAssessments(allocId),
    select: (res) => res.data,
  });

  const { data: rawConfigsData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['attainment-configs'],
    queryFn: () => attainmentConfigService.list(),
    select: (res) => res.data,
  });

  const attainmentConfigs = Array.isArray(rawConfigsData) ? rawConfigsData : (rawConfigsData?.results || []);

  // Use global config (department null) or first one
  const globalConfig = attainmentConfigs?.find(c => !c.department) ?? attainmentConfigs?.[0];

  // ── Mutations ─────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ typeId, data }) => allocationService.updateAssessment(allocId, typeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessments', allocId]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to update assessment');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => attainmentConfigService.update(id, data),
    onSuccess: () => {
      toast.success('Attainment weights updated');
      queryClient.invalidateQueries(['attainment-configs']);
    },
    onError: () => toast.error('Failed to update attainment weights'),
  });

  const createTypeMutation = useMutation({
    mutationFn: (typeData) => assessmentTypeService.create(typeData),
    onSuccess: async (res) => {
      const newType = res.data;
      toast.success(`"${newType.name}" added!`);
      // The backend perform_create already creates SubjectAssessmentConfig for all allocations
      setShowAddForm(false);
      setNewAssessment({ name: '', code: '', category: 'CONTINUOUS', default_max_marks: 100, weightage_percent: '' });
      queryClient.invalidateQueries(['assessments', allocId]);
    },
    onError: (err) => {
      const detail = err?.response?.data;
      const msg = detail?.code?.[0] || detail?.name?.[0] || 'Failed to create assessment';
      toast.error(msg);
    },
  });

  const handleCreateAssessment = (e) => {
    e.preventDefault();
    if (!newAssessment.name.trim() || !newAssessment.code.trim()) {
      toast.error('Name and Code are required');
      return;
    }
    createTypeMutation.mutate({
      ...newAssessment,
      code: newAssessment.code.toUpperCase().replace(/\s+/g, '_'),
      weightage_percent: newAssessment.weightage_percent || null,
      is_system: false,
    });
  };

  if (isLoading || isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const directW = globalConfig?.direct_weightage ?? 80;
  const indirectW = globalConfig?.indirect_weightage ?? 20;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900">Assessment Setup</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
            Configure which components to include
          </p>
        </div>
      </div>

      {/* Direct / Indirect Weight Config */}
      {/* Attainment Weight Configuration — flat light card */}
      <Card className="!p-0 overflow-hidden border border-gray-200">
        <div className="bg-slate-50 border-b border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white border border-gray-200 rounded-xl">
              <Sliders size={18} className="text-slate-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Attainment Weight Configuration</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Direct (marks-based) vs Indirect (survey-based) split — editable per department
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                Direct Attainment %
              </label>
              <input
                type="number"
                min="0" max="100" step="5"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                defaultValue={directW}
                onBlur={(e) => {
                  if (!globalConfig) return;
                  const val = parseFloat(e.target.value);
                  updateConfigMutation.mutate({
                    id: globalConfig.id,
                    data: { direct_weightage: val, indirect_weightage: 100 - val }
                  });
                }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                Indirect Attainment %
              </label>
              <input
                type="number"
                min="0" max="100" step="5"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                defaultValue={indirectW}
                onBlur={(e) => {
                  if (!globalConfig) return;
                  const val = parseFloat(e.target.value);
                  updateConfigMutation.mutate({
                    id: globalConfig.id,
                    data: { indirect_weightage: val, direct_weightage: 100 - val }
                  });
                }}
              />
            </div>
          </div>
          {/* visual split bar */}
          <div className="mt-4 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-slate-700 rounded-full transition-all"
              style={{ width: `${directW}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-center">
            {directW}% Direct · {indirectW}% Indirect
          </p>
        </div>
      </Card>

      {/* Assessment List */}
      <div className="space-y-3">
        {configs?.map((cfg) => {
          const catColor = CATEGORY_COLORS[cfg.assessment_type_category] ?? 'bg-slate-100 text-slate-600';
          return (
            <Card
              key={cfg.id}
              className={`!p-4 transition-all ${!cfg.is_enabled ? 'opacity-50 bg-slate-50' : ''}`}
            >
              {/* Row 1: Include toggle + Name */}
              <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                {/* Include toggle */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">On</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.is_enabled}
                      onChange={(e) =>
                        updateMutation.mutate({ typeId: cfg.id, data: { is_enabled: e.target.checked } })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                {/* Code badge */}
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black tracking-wider flex-shrink-0 ${catColor}`}>
                  {cfg.assessment_type_code}
                </span>

                {/* Name + category + threshold */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-sm ${cfg.is_enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                    {cfg.assessment_type_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      {cfg.assessment_type_category}
                    </span>
                    <span className="text-[9px] text-gray-300">·</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      Pass threshold: {cfg.threshold_pct}%
                    </span>
                  </div>
                </div>

                {/* Inputs */}
                <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1 text-center">
                      Max Marks
                    </label>
                    <input
                      type="number"
                      className="form-input w-20 text-center font-bold text-sm disabled:bg-slate-100 disabled:text-slate-300"
                      defaultValue={cfg.max_marks}
                      disabled={!cfg.is_enabled}
                      onBlur={(e) =>
                        updateMutation.mutate({ typeId: cfg.id, data: { max_marks: parseFloat(e.target.value) } })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1 text-center">
                      Weight %
                    </label>
                    <input
                      type="number"
                      className="form-input w-20 text-center font-bold text-sm disabled:bg-slate-100 disabled:text-slate-300"
                      defaultValue={cfg.effective_weightage ?? ''}
                      disabled={!cfg.is_enabled}
                      placeholder="–"
                      onBlur={(e) =>
                        updateMutation.mutate({
                          typeId: cfg.id,
                          data: { weightage: e.target.value !== '' ? parseFloat(e.target.value) : null }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Custom Assessment */}
      {showAddForm ? (
        <Card className="border-2 border-dashed border-blue-200 !p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Add Custom Assessment</h3>
            <button onClick={() => setShowAddForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreateAssessment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Name *</label>
              <input
                className="form-input w-full text-sm"
                placeholder="e.g. Seminar"
                value={newAssessment.name}
                onChange={(e) => setNewAssessment(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Code *</label>
              <input
                className="form-input w-full text-sm uppercase"
                placeholder="e.g. SEM"
                value={newAssessment.code}
                onChange={(e) => setNewAssessment(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Category *</label>
              <select
                className="form-input w-full text-sm"
                value={newAssessment.category}
                onChange={(e) => setNewAssessment(p => ({ ...p, category: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Default Max Marks</label>
              <input
                type="number"
                className="form-input w-full text-sm"
                value={newAssessment.default_max_marks}
                onChange={(e) => setNewAssessment(p => ({ ...p, default_max_marks: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Weightage % (optional)</label>
              <input
                type="number"
                className="form-input w-full text-sm"
                placeholder="Leave blank if not applicable"
                value={newAssessment.weightage_percent}
                onChange={(e) => setNewAssessment(p => ({ ...p, weightage_percent: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTypeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-colors"
              >
                {createTypeMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Add Assessment
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all"
        >
          <Plus size={16} />
          Add Custom Assessment Type
        </button>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
        <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Workflow Step 2:</strong> Toggle assessments <em>On/Off</em> per subject. Disabled assessments
          are excluded from attainment calculations and Excel reports. Changes take effect immediately.
        </p>
      </div>
    </div>
  );
}
