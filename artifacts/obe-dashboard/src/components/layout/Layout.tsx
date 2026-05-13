import { Sidebar } from "./Sidebar";
import { ProtectedRoute } from "./ProtectedRoute";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
        <Sidebar />
        <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
