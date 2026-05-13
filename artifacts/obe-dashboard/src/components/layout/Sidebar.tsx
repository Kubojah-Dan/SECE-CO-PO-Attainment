import { useAuthStore } from "../../store/authStore";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  BookOpen, 
  GraduationCap, 
  BarChart4, 
  FileText, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
};

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "HOD", "IQAC"] },
  { title: "Departments", href: "/departments", icon: Building2, roles: ["SUPER_ADMIN"] },
  { title: "Users", href: "/users", icon: Users, roles: ["SUPER_ADMIN"] },
  { title: "Regulations", href: "/regulations", icon: BookOpen, roles: ["SUPER_ADMIN"] },
  { title: "Subjects", href: "/subjects", icon: BookOpen, roles: ["SUPER_ADMIN", "HOD", "FACULTY"] },
  { title: "Students", href: "/students", icon: GraduationCap, roles: ["SUPER_ADMIN", "HOD"] },
  { title: "Attainment", href: "/attainment", icon: BarChart4, roles: ["SUPER_ADMIN", "HOD", "FACULTY", "IQAC"] },
  { title: "Reports", href: "/reports", icon: FileText, roles: ["SUPER_ADMIN", "HOD", "IQAC"] },
  { title: "Audit Logs", href: "/audit-logs", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
  { title: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    clearAuth();
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
          <BarChart4 className="h-6 w-6" />
          <span className="">OBE Analytics</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {filteredNavItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive ? "bg-muted text-primary" : ""
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{user?.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.role}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden absolute top-4 left-4 z-40">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <div className="hidden border-r bg-card md:block md:w-[280px]">
        <SidebarContent />
      </div>
    </>
  );
}
