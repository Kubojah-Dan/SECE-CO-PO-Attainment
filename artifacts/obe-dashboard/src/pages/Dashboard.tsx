import { Layout } from "../components/layout/Layout";
import { 
  useGetDashboardSummary, 
  useGetCOTrends, 
  useGetWeakCOs, 
  useGetDepartmentComparison, 
  useGetFacultyProgress 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, BookOpen, GraduationCap, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({});
  const { data: trends, isLoading: isLoadingTrends } = useGetCOTrends({});
  const { data: weakCos, isLoading: isLoadingWeakCos } = useGetWeakCOs({});
  const { data: deptComparison, isLoading: isLoadingComparison } = useGetDepartmentComparison({});

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Institution-wide overview of academic outcomes.</p>
        </div>

        {isLoadingSummary ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Departments"
              value={summary.totalDepartments}
              icon={Building2}
            />
            <MetricCard
              title="Faculty"
              value={summary.totalFaculty}
              icon={Users}
            />
            <MetricCard
              title="Students"
              value={summary.totalStudents}
              icon={GraduationCap}
            />
            <MetricCard
              title="Subjects"
              value={summary.totalSubjects}
              icon={BookOpen}
            />
            <MetricCard
              title="Avg CO Attainment"
              value={`${summary.avgCOAttainment.toFixed(2)}%`}
              icon={undefined}
            />
            <MetricCard
              title="Avg PO Attainment"
              value={`${summary.avgPOAttainment.toFixed(2)}%`}
              icon={undefined}
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>CO Attainment Trends</CardTitle>
              <CardDescription>Average attainment over recent periods</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrends ? (
                <Skeleton className="h-[300px] w-full" />
              ) : trends && trends.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 3]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="attainmentValue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Department Comparison</CardTitle>
              <CardDescription>Average CO & PO attainment by department</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingComparison ? (
                <Skeleton className="h-[300px] w-full" />
              ) : deptComparison && deptComparison.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptComparison} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 3]} />
                      <YAxis dataKey="departmentName" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="avgCOAttainment" name="Avg CO" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="avgPOAttainment" name="Avg PO" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No comparison data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Weak Course Outcomes
            </CardTitle>
            <CardDescription>COs falling below target thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingWeakCos ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : weakCos && weakCos.length > 0 ? (
              <div className="divide-y">
                {weakCos.map((co) => (
                  <div key={co.coId} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{co.coCode} - {co.subjectName}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{co.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">{co.departmentName} | Faculty: {co.facultyName || 'Unassigned'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Actual: {co.attainmentValue.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">Target: {co.threshold.toFixed(2)}</span>
                      </div>
                      <Badge variant="destructive">Gap: {co.gap?.toFixed(2) || 'N/A'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No weak COs detected across the institution.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon?: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
