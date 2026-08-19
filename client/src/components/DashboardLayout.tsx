import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Bell, Bot, BrainCircuit, ChartNoAxesCombined, CreditCard, LayoutDashboard, LogOut, MessageSquareText, PanelLeft, Radio, Settings2, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const gabsterCategories = [
  {
    category: "COMMUNICATE",
    items: [
      { icon: MessageSquareText, label: "Omnichannel Inbox", path: "/conversations" },
      { icon: Bot, label: "AI Chatbot", path: "/agents" },
      { icon: Radio, label: "Voice & Calling", path: "/channels" },
      { icon: Users, label: "Instagram Automation", path: "/channels" },
    ]
  },
  {
    category: "OPERATE",
    items: [
      { icon: LayoutDashboard, label: "Workspace overview", path: "/start" },
      { icon: BrainCircuit, label: "Knowledge & training", path: "/knowledge" },
      { icon: Settings2, label: "Workflow automation", path: "/settings" },
      { icon: CreditCard, label: "Plans & billing", path: "/billing" },
    ]
  },
  {
    category: "ANALYZE",
    items: [
      { icon: ChartNoAxesCombined, label: "Analytics & dashboards", path: "/analytics" },
      { icon: ChartNoAxesCombined, label: "Opportunity quality", path: "/quality" },
      { icon: BrainCircuit, label: "Knowledge intelligence", path: "/knowledge" },
      { icon: Bot, label: "AI Engine", path: "/agents" },
    ]
  },
  {
    category: "ACT",
    items: [
      { icon: Users, label: "Business Agent", path: "/team" },
    ]
  }
];

const menuItems = gabsterCategories.flatMap(c => c.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">
        <div className="flex w-full max-w-md flex-col items-center gap-7 rounded-[28px] border border-white/10 bg-[#0b1728] p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><Bot className="h-6 w-6" /></div>
            <h1 className="text-center text-2xl font-semibold tracking-tight">
              سجّل الدخول للمتابعة
            </h1>
            <p className="max-w-sm text-center text-sm leading-7 text-slate-400">
              هذه مساحة عمل آمنة لإدارة وكلائك وقنوات عملائك. سجّل الدخول لبدء البناء.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full bg-gradient-to-l from-cyan-300 to-lime-300 text-slate-950 shadow-lg hover:from-cyan-200 hover:to-lime-200"
          >
            تسجيل الدخول / Sign in
          </Button>
          <Link href="/register" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">ليس لديك حساب؟ ابدأ مجاناً</Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">Neon AI Agents</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-2">
            {gabsterCategories.map((cat, idx) => (
              <div key={idx} className="mb-4">
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase mb-1 px-2">
                  {cat.category}
                </div>
                <div className="space-y-1">
                  {cat.items.map((item, i) => {
                    const Icon = item.icon;
                    const isActive = location === item.path;
                    return (
                      <button
                        key={i}
                        onClick={() => setLocation(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <Icon className="size-3.5 opacity-80 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>تسجيل الخروج / Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground font-semibold">
                    {activeMenuItem?.label ?? "Neon AI Agents"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
