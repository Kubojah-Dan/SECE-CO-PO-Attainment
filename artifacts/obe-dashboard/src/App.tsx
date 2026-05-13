import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Departments from "./pages/Departments";
import DepartmentDetail from "./pages/DepartmentDetail";
import Regulations from "./pages/Regulations";
import Subjects from "./pages/Subjects";
import SubjectDetail from "./pages/SubjectDetail";
import Students from "./pages/Students";
import Attainment from "./pages/Attainment";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      </Route>
      <Route path="/departments">
        <ProtectedRoute>
          <Departments />
        </ProtectedRoute>
      </Route>
      <Route path="/departments/:id">
        <ProtectedRoute>
          <DepartmentDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/regulations">
        <ProtectedRoute>
          <Regulations />
        </ProtectedRoute>
      </Route>
      <Route path="/subjects">
        <ProtectedRoute>
          <Subjects />
        </ProtectedRoute>
      </Route>
      <Route path="/subjects/:id">
        <ProtectedRoute>
          <SubjectDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/students">
        <ProtectedRoute>
          <Students />
        </ProtectedRoute>
      </Route>
      <Route path="/attainment">
        <ProtectedRoute>
          <Attainment />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/audit-logs">
        <ProtectedRoute>
          <AuditLogs />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
