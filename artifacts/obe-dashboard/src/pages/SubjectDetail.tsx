import { Layout } from "../components/layout/Layout";
import { 
  useGetSubject, 
  useListCOs, 
  useGetCOAttainment,
  getGetSubjectQueryKey, 
  getListCOsQueryKey,
  useCalculateAttainment
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const subjectId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();

  const { data: subject, isLoading: isLoadingSubject } = useGetSubject(subjectId, {
    query: { enabled: !!subjectId, queryKey: getGetSubjectQueryKey(subjectId) }
  });

  const { data: cos, isLoading: isLoadingCos } = useListCOs(subjectId, {
    query: { enabled: !!subjectId, queryKey: getListCOsQueryKey(subjectId) }
  });

  const { data: attainment, isLoading: isLoadingAttainment } = useGetCOAttainment(subjectId, {
    query: { enabled: !!subjectId }
  });

  const calcMutation = useCalculateAttainment();

  const handleCalculate = () => {
    calcMutation.mutate(
      { 
        subjectId, 
        data: { directWeightage: 80, indirectWeightage: 20, threshold: 2.0 } 
      },
      {
        onSuccess: () => {
          toast.success("Attainment calculated successfully");
          queryClient.invalidateQueries();
        },
        onError: () => {
          toast.error("Failed to calculate attainment");
        }
      }
    );
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          {isLoadingSubject ? (
            <Skeleton className="h-10 w-[300px]" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{subject?.name}</h1>
                <Badge variant={subject?.attainmentStatus === 'completed' ? 'default' : 'secondary'}>
                  {subject?.attainmentStatus || 'Pending'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {subject?.code} • Semester {subject?.semester} • {subject?.academicYear} • Faculty: {subject?.facultyName || 'Unassigned'}
              </p>
            </>
          )}
        </div>

        <Tabs defaultValue="cos" className="w-full">
          <TabsList>
            <TabsTrigger value="cos">Course Outcomes</TabsTrigger>
            <TabsTrigger value="mapping">CO-PO Mapping</TabsTrigger>
            <TabsTrigger value="marks">Marks Upload</TabsTrigger>
            <TabsTrigger value="attainment">Attainment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Outcomes (COs)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Bloom's Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCos ? (
                      <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ) : cos && cos.length > 0 ? (
                      cos.map((co) => (
                        <TableRow key={co.id}>
                          <TableCell className="font-medium">{co.code}</TableCell>
                          <TableCell>{co.description}</TableCell>
                          <TableCell><Badge variant="outline">{co.bloomsLevel}</Badge></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={3} className="text-center h-24">No COs defined.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mapping" className="mt-6">
            <Card>
              <CardHeader><CardTitle>CO-PO Mapping Matrix</CardTitle></CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                  <p className="mb-4">Configure the correlation levels (0-3) between Course Outcomes and Program Outcomes.</p>
                  <Button variant="outline">Edit Mapping Matrix</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="marks" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Marks Upload</CardTitle></CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                  <p className="mb-4">Upload student marks via Excel for CIA1, CIA2, CIA3, or ESE.</p>
                  <Button>Upload Excel File</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attainment" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>Attainment Results</CardTitle>
                  <CardDescription>Final calculated direct and indirect attainments.</CardDescription>
                </div>
                <Button onClick={handleCalculate} disabled={calcMutation.isPending}>
                  <Play className="mr-2 h-4 w-4" />
                  {calcMutation.isPending ? "Calculating..." : "Calculate Attainment"}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingAttainment ? (
                  <Skeleton className="h-32 w-full" />
                ) : attainment?.cos && attainment.cos.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CO</TableHead>
                        <TableHead className="text-right">Direct</TableHead>
                        <TableHead className="text-right">Indirect</TableHead>
                        <TableHead className="text-right">Final</TableHead>
                        <TableHead className="text-right">Threshold</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attainment.cos.map((co) => (
                        <TableRow key={co.coId}>
                          <TableCell className="font-medium">{co.coCode}</TableCell>
                          <TableCell className="text-right">{co.directAttainment.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{co.indirectAttainment.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold">{co.finalAttainment.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{co.threshold.toFixed(2)}</TableCell>
                          <TableCell>
                            {co.isAttained ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Attained</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Not Attained</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                    No attainment data available. Click calculate to generate results.
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
