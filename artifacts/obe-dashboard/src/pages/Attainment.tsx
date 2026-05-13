import { Layout } from "../components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCOAttainment, useGetPOAttainment, useGetPSOAttainment } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "../store/authStore";

export default function Attainment() {
  const { user } = useAuthStore();
  const departmentId = user?.departmentId || 1;
  const subjectId = 1; // Defaulting to 1 for demo purposes since we don't have subject selection in this view

  const { data: coData, isLoading: isLoadingCO } = useGetCOAttainment(subjectId, {
    query: { enabled: !!subjectId }
  });
  
  const { data: poData, isLoading: isLoadingPO } = useGetPOAttainment(departmentId, {
    query: { enabled: !!departmentId }
  });

  const { data: psoData, isLoading: isLoadingPSO } = useGetPSOAttainment(departmentId, {
    query: { enabled: !!departmentId }
  });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attainment Hub</h1>
          <p className="text-muted-foreground">Institution-wide attainment analytics and reporting.</p>
        </div>

        <Tabs defaultValue="co" className="w-full">
          <TabsList>
            <TabsTrigger value="co">Course Outcomes</TabsTrigger>
            <TabsTrigger value="po">Program Outcomes</TabsTrigger>
            <TabsTrigger value="pso">Program Specific Outcomes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="co" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CO Attainment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCO ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : coData && coData.cos.length > 0 ? (
                  <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={coData.cos} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="coCode" />
                        <YAxis domain={[0, 3]} />
                        <Tooltip />
                        <ReferenceLine y={2.0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                        <Bar dataKey="finalAttainment" radius={[4, 4, 0, 0]}>
                          {coData.cos.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.finalAttainment >= entry.threshold ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                    No CO attainment data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="po" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PO Attainment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPO ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : poData && poData.length > 0 ? (
                  <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={poData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="poCode" />
                        <YAxis domain={[0, 3]} />
                        <Tooltip />
                        <ReferenceLine y={2.0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                        <Bar dataKey="attainmentValue" radius={[4, 4, 0, 0]}>
                          {poData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={(entry.attainmentValue || 0) >= (entry.threshold || 2.0) ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                    No PO attainment data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pso" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PSO Attainment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPSO ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : psoData && psoData.length > 0 ? (
                  <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={psoData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="psoCode" />
                        <YAxis domain={[0, 3]} />
                        <Tooltip />
                        <ReferenceLine y={2.0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                        <Bar dataKey="attainmentValue" radius={[4, 4, 0, 0]}>
                          {psoData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={(entry.attainmentValue || 0) >= (entry.threshold || 2.0) ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                    No PSO attainment data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
