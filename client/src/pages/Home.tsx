import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bot, ChevronLeft, CircleCheck, Headphones, MessageSquareText, Plus, Radio, Sparkles, TrendingUp, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const formatNumber = (value: number | undefined) => new Intl.NumberFormat("en-US").format(value ?? 0);

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.workspace.overview.useQuery(undefined, { enabled: Boolean(user) });
  const stats = data?.stats;

  const metrics = [
    { label: "المحادثات / Conversations", value: formatNumber(stats?.conversations), change: "هذا الشهر", icon: MessageSquareText, color: "text-cyan-300", bg: "bg-cyan-300/10" },
    { label: "نشطة / Active", value: formatNumber(stats?.active), change: "تحتاج متابعة", icon: TrendingUp, color: "text-lime-300", bg: "bg-lime-300/10" },
    { label: "تم الحل / Resolved", value: formatNumber(stats?.resolved), change: "بواسطة الوكلاء", icon: CircleCheck, color: "text-emerald-300", bg: "bg-emerald-300/10" },
    { label: "تحتاج إنسان / Escalated", value: formatNumber(stats?.escalated), change: "للفريق", icon: Headphones, color: "text-amber-300", bg: "bg-amber-300/10" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 pb-12" dir="rtl">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1b2d] px-6 py-8 shadow-2xl shadow-cyan-950/20 md:px-10 md:py-10">
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-28 right-20 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80" dir="ltr">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_#bef264]" /> Neon AI Agents
            </div>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              خلِّ الذكاء الاصطناعي <span className="text-lime-300">يتكلم باسمك.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              مساحة عمل موحّدة لبناء وكلاء يفهمون عملاءك، يجيبون بثقة، ويتابعون كل محادثة عبر القنوات التي تستخدمها.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => setLocation("/agents")} className="rounded-xl bg-lime-300 px-5 text-slate-950 hover:bg-lime-200">
                <Plus className="ml-2 h-4 w-4" /> إنشاء وكيل جديد
              </Button>
              <Button variant="outline" onClick={() => setLocation("/conversations")} className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10">
                فتح صندوق المحادثات <ChevronLeft className="mr-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            {(data?.agents ?? []).slice(0, 4).map((agent, index) => (
              <div key={agent.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><Bot className="h-4 w-4" /></div>
                  <span className={`h-2 w-2 rounded-full ${agent.status === "active" ? "bg-lime-300" : "bg-slate-500"}`} />
                </div>
                <p className="mt-4 truncate text-sm font-semibold text-white">{agent.name}</p>
                <p className="mt-1 text-xs text-slate-400">{index === 0 ? "واجهة العملاء" : agent.language === "bilingual" ? "AR + EN" : agent.language.toUpperCase()}</p>
              </div>
            ))}
            {!data?.agents?.length && !isLoading && <div className="col-span-2 rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">سيظهر وكلاؤك هنا بعد الإنشاء</div>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(item => (
          <Card key={item.label} className="border-white/10 bg-[#0b1728]/90 shadow-xl shadow-slate-950/20">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs text-slate-400">{item.label}</p><p className="mt-3 text-3xl font-semibold text-white">{isLoading ? "—" : item.value}</p><p className="mt-2 text-xs text-slate-500">{item.change}</p></div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color}`}><item.icon className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-white/10 bg-[#0b1728]/90 shadow-xl shadow-slate-950/20">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-5"><div><CardTitle className="text-lg text-white">آخر المحادثات</CardTitle><p className="mt-1 text-xs text-slate-400">مراقبة مستمرة لكل تفاعل مع عملائك</p></div><Button variant="ghost" onClick={() => setLocation("/conversations")} className="text-xs text-cyan-200 hover:bg-white/5 hover:text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button></CardHeader>
          <CardContent className="p-0">
            {(data?.conversations ?? []).slice(0, 5).map(conversation => (
              <div key={conversation.id} className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-6 py-4 last:border-0">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/20 to-lime-300/10 text-sm font-semibold text-cyan-100">{(conversation.customerName || "؟").slice(0, 1)}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{conversation.customerName || "زائر جديد"}</p><p className="mt-1 truncate text-xs text-slate-400">{conversation.customerEmail || conversation.customerPhone || "لا توجد بيانات اتصال بعد"}</p></div></div>
                <div className="flex shrink-0 items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline">{conversation.channel}</span><Badge className={conversation.status === "escalated" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : conversation.status === "resolved" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"}>{conversation.status}</Badge></div>
              </div>
            ))}
            {!data?.conversations?.length && <div className="px-6 py-12 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm text-slate-300">لا توجد محادثات بعد</p><p className="mt-1 text-xs text-slate-500">فعّل الودجت أو جرّب المحاكي لبدء أول محادثة.</p></div>}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0b1728]/90 shadow-xl shadow-slate-950/20">
          <CardHeader className="border-b border-white/10 pb-5"><CardTitle className="text-lg text-white">تشغيل سريع</CardTitle><p className="mt-1 text-xs text-slate-400">أهم الخطوات لتجهيز وكيلك</p></CardHeader>
          <CardContent className="space-y-3 p-5">
            {[{ icon: Bot, title: "عرّف شخصية وكيلك", desc: "النبرة، اللغة، وقواعد القرار", path: "/agents", color: "text-lime-300" }, { icon: Sparkles, title: "أضف معرفة العمل", desc: "FAQs، عروض، وسياسات", path: "/knowledge", color: "text-cyan-300" }, { icon: Radio, title: "اربط قنواتك", desc: "Web، WhatsApp، Social", path: "/channels", color: "text-violet-300" }, { icon: UsersRound, title: "اختبر تجربة العميل", desc: "شغّل الودجت الآن", path: "/agents", color: "text-amber-300" }].map(action => <button key={action.title} onClick={() => setLocation(action.path)} className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-right transition hover:border-cyan-300/30 hover:bg-white/[0.06]"><div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ${action.color}`}><action.icon className="h-4 w-4" /></div><div className="flex-1"><p className="text-sm font-medium text-white">{action.title}</p><p className="mt-1 text-xs text-slate-500">{action.desc}</p></div><ChevronLeft className="h-4 w-4 text-slate-600" /></button>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
