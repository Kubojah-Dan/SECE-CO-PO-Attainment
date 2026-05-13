import { Layout } from "../components/layout/Layout";
import { useListDepartments, useCreateDepartment, getListDepartmentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, GraduationCap, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const deptSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(2, "Code is required"),
});

export default function Departments() {
  const { data: departments, isLoading } = useListDepartments();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createDept = useCreateDepartment();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof deptSchema>>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: "", code: "" },
  });

  const onSubmit = (values: z.infer<typeof deptSchema>) => {
    createDept.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Department created successfully");
          setIsCreateOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
        },
        onError: () => {
          toast.error("Failed to create department");
        },
      }
    );
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground">Manage academic departments and programs.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Department</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Department Name</FormLabel><FormControl><Input placeholder="e.g. Computer Science" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="e.g. CSE" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createDept.isPending}>
                      {createDept.isPending ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent className="flex-1">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))
          ) : departments && departments.length > 0 ? (
            departments.map((dept) => (
              <Card key={dept.id} className="flex flex-col hover-elevate transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="line-clamp-1" title={dept.name}>{dept.name}</CardTitle>
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">{dept.code}</div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Head of Department</div>
                    <div className="font-medium">{dept.hodName || 'Not Assigned'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Faculty
                      </div>
                      <div className="font-semibold">{dept.facultyCount || 0}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" /> Students
                      </div>
                      <div className="font-semibold">{dept.studentCount || 0}</div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/50">
                  <Link href={`/departments/${dept.id}`} className="w-full">
                    <Button variant="ghost" className="w-full justify-between">
                      View Details
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              No departments found. Create your first department to get started.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
