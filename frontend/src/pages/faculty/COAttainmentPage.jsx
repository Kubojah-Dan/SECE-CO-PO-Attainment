import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attainmentService, subjectService } from '../../services/api';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { ArrowLeft, Loader2, Calculator, CheckCircle, TrendingUp, Award, AlertCircle, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import AttainmentBadge from '../../components/ui/AttainmentBadge';

export default function COAttainmentPage() {
  const { allocId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: subjectData, isLoading: isSubLoading } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
  });

  const { data: attainmentData, isLoading: isAttLoading } = useQuery({
    queryKey: ['attainment', allocId],
    queryFn: () => attainmentService.getCOAttainment(allocId),
    select: (res) => res.data
  });

  const calculateMutation = useMutation({
    mutationFn: () => attainmentService.calculate(allocId),
    onSuccess: () => {
      toast.success('Attainment recalculated successfully');
      queryClient.invalidateQueries(['attainment', allocId]);
    },
    onError: () => {
      toast.error('Failed to calculate attainment');
    }
  });

  if (isSubLoading || isAttLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const results = Array.isArray(attainmentData) 
    ? attainmentData 
    : (attainmentData?.results || []);
  const avgAttainment = results.length 
    ? results.reduce((sum, r) => sum + parseFloat(r.final_attainment || 0), 0) / results.length 
    : 0;
  
  const targetAchievedCount = results.filter(r => r.target_achieved).length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {calculateMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Calculator size={16} className="mr-2" />}
            Recalculate Now
          </button>
          <div className="text-right">
            <h1 className="text-2xl font-black text-gray-900 font-display">CO Attainment Analysis</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{subjectData?.data?.subject_name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Avg. Final Attainment" 
          value={`${avgAttainment.toFixed(1)}%`} 
          icon={TrendingUp} 
          color="blue"
        />
        <StatCard 
          title="Targets Achieved" 
          value={`${targetAchievedCount}/${results.length}`} 
          icon={CheckCircle} 
          color="green"
        />
        <StatCard 
          title="Compliance Level" 
          value={avgAttainment > 70 ? 'High' : avgAttainment > 60 ? 'Medium' : 'Action Required'} 
          icon={Award} 
          color={avgAttainment > 60 ? 'purple' : 'red'}
        />
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl bg-white">
        <div className="bg-slate-50 p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Course Outcomes Breakdown</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated per NBA Methodology</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">
                <th className="p-4">CO Code</th>
                <th className="p-4">Direct (80%)</th>
                <th className="p-4">Indirect (20%)</th>
                <th className="p-4">Final Attainment</th>
                <th className="p-4 text-center">Level</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{r.co_code}</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{r.co_description}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-600">{parseFloat(r.direct_attainment || 0).toFixed(1)}%</td>
                  <td className="p-4 text-sm font-medium text-gray-600">{parseFloat(r.indirect_attainment || 0).toFixed(1)}%</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900">{parseFloat(r.final_attainment || 0).toFixed(1)}%</span>
                      <div className="w-20 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{width: `${r.final_attainment}%`}} />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <AttainmentBadge level={r.attainment_level} />
                  </td>
                  <td className="p-4 text-right">
                    {r.target_achieved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-widest">
                        <CheckCircle size={10} /> Target Met
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-widest">
                        <AlertCircle size={10} /> Below Target
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {!calculateMutation.isPending && results.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <Calculator size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="font-bold text-gray-800">No attainment data calculated yet</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Recalculate attainment to process the current marks and survey data for this course.
          </p>
          <button 
            onClick={() => calculateMutation.mutate()}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
          >
            Run Initial Calculation
          </button>
        </div>
      )}
    </div>
  );
}
