import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Rss, 
  CalendarDays, 
  MessageSquareQuote, 
  Mail, 
  FileCode2, 
  Users, 
  Settings as SettingsIcon,
  Bell,
  LogOut,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe, useLogout, useGetUnresolvedErrorCount } from "@workspace/api-client-react";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarTrigger,
  SidebarHeader
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const logoutMutation = useLogout();
  const { data: errorCount } = useGetUnresolvedErrorCount();

  useEffect(() => {
    if (!isUserLoading && !user) {
      setLocation("/login");
    }
  }, [isUserLoading, user, setLocation]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/login");
  };

  const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Fonti", url: "/fonti", icon: Rss },
    { title: "Eventi", url: "/eventi", icon: CalendarDays },
    { title: "Prompt AI", url: "/prompt", icon: MessageSquareQuote },
    { title: "Newsletter", url: "/newsletter", icon: Mail },
    { title: "Template", url: "/template", icon: FileCode2 },
    ...(user?.isSuperadmin ? [{ title: "Utenti", url: "/utenti", icon: Users }] : []),
    { title: "Impostazioni", url: "/impostazioni", icon: SettingsIcon },
  ];

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-border/50">
          <SidebarHeader className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <img src="https://media.beehiiv.com/cdn-cgi/image/format=auto,onerror=redirect/uploads/publication/logo/86d392b4-bd06-4860-a4d1-bd8bc1014080/Varese_Life.png" alt="Varese Life Logo" className="h-8 w-auto" />
              <div className="font-display font-bold text-lg text-foreground tracking-tight">Varese Life</div>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  {navItems.map((item) => {
                    const isActive = location.startsWith(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="hover-elevate">
                          <Link href={item.url} className={isActive ? "font-medium text-primary" : "text-muted-foreground"}>
                            <item.icon className={isActive ? "text-primary" : ""} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="mt-auto p-4 border-t border-border/50">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase">
                {user.email.substring(0, 2)}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-medium truncate">{user.email}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </Button>
          </div>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-4">
              <Link href="/impostazioni#errori">
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full">
                  <Bell className="w-5 h-5" />
                  {(errorCount?.count || 0) > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
                  )}
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
