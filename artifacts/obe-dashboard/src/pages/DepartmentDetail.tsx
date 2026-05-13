import { Layout } from "../components/layout/Layout";
import { useGetDepartment, useGetDepartmentStats, getGetDepartmentQueryKey, getGetDepartmentStatsQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";

export default function DepartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const deptId = parseInt(id || "0", 10);

  const { data: dept, isLoading: isLoadingDept } = useGetDepartment(deptId, {
    query: { enabled: !!deptId, queryKey: getGetDepartmentQueryKey(deptId) }
  });

  const { data: stats, isLoading: isLoadingStats } = useGetDepartmentStats(deptId, {
    query: { enabled: !!deptId, queryKey: getGetDepartmentStatsQueryKey(deptId) }
  });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          {isLoadingDept ? (
            <Skeleton className="h-10 w-[300px]" />
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">{dept?.name}</h1>
              <p className="text-muted-foreground">{dept?.code} • Head of Department: {dept?.hodName || 'Unassigned'}</p>
            </>
          )}
        </div>

        {isLoadingStats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg CO Attainment</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgCOAttainment.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg PO Attainment</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgPOAttainment.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.subjectCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.facultyCount}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>PO Attainment Breakdown</CardTitle>
              <CardDescription>Performance against Program Outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-[300px] w-full" />
              ) : stats?.poBreakdown && stats.poBreakdown.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.poBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="poCode" />
                      <YAxis domain={[0, 3]} />
                      <Tooltip />
                      <Bar dataKey="attainmentValue" radius={[4, 4, 0, 0]}>
                        {stats.poBreakdown.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.attainmentValue >= (entry.threshold || 2.0) ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No PO attainment data available.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Weak Areas
              </CardTitle>
              <CardDescription>Areas requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-muted/20 rounded-lg">
                  <span className="text-4xl font-bold text-destructive mb-2">{stats?.weakCOCount || 0}</span>
                  <span className="text-muted-foreground">Weak Course Outcomes identified in this department.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
