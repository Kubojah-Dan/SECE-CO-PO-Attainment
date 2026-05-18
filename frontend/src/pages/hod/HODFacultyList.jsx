import React from 'react';
import Card from '../../components/ui/Card';
import { Users, Mail, Phone, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/api';
import { Loader2 } from 'lucide-react';

export default function HODFacultyList() {
  const { data: facultyData, isLoading } = useQuery({
    queryKey: ['hod', 'faculty'],
    queryFn: () => userService.getFaculty(),
    select: (res) => res.data
  });

  // Handle both paginated {results: []} and direct [] responses
  const faculty = Array.isArray(facultyData) 
    ? facultyData 
    : (Array.isArray(facultyData?.results) ? facultyData.results : []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Department Faculty</h1>
          <p className="text-gray-500 font-medium">Manage and track faculty progress within your department</p>
        </div>
      </div>

      {faculty.length === 0 ? (
        <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
          <Users size={48} className="mx-auto mb-4 text-slate-200" />
          <h3 className="text-lg font-bold text-slate-900">No faculty members found</h3>
          <p className="text-slate-500 text-sm">Members will appear once they are assigned to your department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faculty.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {f.first_name?.[0] || '?'}{f.last_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">
                    {f.first_name} {f.last_name}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">{f.faculty_profile?.designation || 'Faculty Member'}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail size={14} className="text-gray-400" />
                      <span className="truncate">{f.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg w-fit mt-2">
                      <BookOpen size={14} />
                      <span>{f.faculty_profile?.allocations_count || 0} Assigned Subjects</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
