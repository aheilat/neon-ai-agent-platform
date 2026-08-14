import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, ArrowRight, Bot, CalendarDays, Check, CheckCircle2, ChevronLeft, CircleCheck, ClipboardCheck, Globe2, Headphones, HelpCircle, Loader2, MapPin, MessageSquareText, Package, Plus, Radio, ShoppingBag, Sparkles, Smartphone, Target, TrendingUp, UsersRound, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const formatNumber = (value: number | undefined) => new Intl.NumberFormat("en-US").format(value ?? 0);

type Goal = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof HelpCircle;
};

const goals: Goal[] = [
  { id: "questions", title: "الرد على الأسئلة", subtitle: "Answer questions", icon: HelpCircle },
  { id: "issues", title: "حل المشاكل والشكاوى", subtitle: "Resolve issues & complaints", icon: Headphones },
  { id: "recommend", title: "اقتراح المنتجات", subtitle: "Recommend products", icon: Sparkles },
  { id: "buy", title: "مساعدة العميل على الشراء", subtitle: "Guide customers to buy", icon: ShoppingBag },
  { id: "leads", title: "جمع وتأهيل العملاء المحتملين", subtitle: "Capture & qualify leads", icon: ClipboardCheck },
  { id: "appointments", title: "حجز المواعيد", subtitle: "Book appointments", icon: CalendarDays },
  { id: "orders", title: "تتبع الطلبات والحالة", subtitle: "Track orders & status", icon: Package },
  { id: "route", title: "توجيه العميل للقسم المناسب", subtitle: "Route to the right place", icon: MapPin },
  { id: "human", title: "تحويل المحادثة لموظف", subtitle: "Hand off to a human", icon: UsersRound },
];

const channels = [
  { id: "web", title: "موقعك الإلكتروني", subtitle: "Website widget", icon: Globe2 },
  { id: "whatsapp", title: "واتساب", subtitle: "WhatsApp Business", icon: Smartphone },
  { id: "instagram", title: "إنستغرام", subtitle: "Instagram DMs", icon: Radio },
  { id: "messenger", title: "ماسنجر", subtitle: "Facebook Messenger", icon: MessageSquareText },
  { id: "phone", title: "الهاتف", subtitle: "Phone gateway", icon: Headphones },
];

const onboardingSteps = ["ابدأ", "الأهداف", "الشخصية", "القنوات", "جاهز"];

function Onboarding() {
  const [, setLocation] = useLocation();
  const onboardAgent = trpc.agents.onboard.useMutation();
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["questions", "human"]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["web"]);
  const [language, setLanguage] = useState<"ar" | "en" | "bilingual">("bilingual");
  const [tone, setTone] = useState("friendly");
  const [isCreating, setIsCreating] = useState(false);

  const selectedGoalObjects = useMemo(() => goals.filter(goal => selectedGoals.includes(goal.id)), [selectedGoals]);

  const toggle = (value: string, current: string[], setter: (next: string[]) => void) => {
    setter(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  const next = () => {
    if (step === 1 && selectedGoals.length === 0) {
      toast.error("اختر هدفاً واحداً على الأقل للمتابعة");
      return;
    }
    if (step === 3 && selectedChannels.length === 0) {
      toast.error("اختر قناة واحدة على الأقل للمتابعة");
      return;
    }
    setStep(current => Math.min(current + 1, onboardingSteps.length - 1));
  };

  const createFirstAgent = async () => {
    setIsCreating(true);
    try {
      await onboardAgent.mutateAsync({
        tone,
        language,
        goals: selectedGoals as Array<"questions" | "issues" | "recommend" | "buy" | "leads" | "appointments" | "orders" | "route" | "human">,
        channels: selectedChannels as Array<"web" | "whatsapp" | "messenger" | "instagram" | "phone">,
      });
      localStorage.setItem("neon-onboarding-complete", "1");
      toast.success("تم إنشاء وكيلك الذكي بنجاح");
      setStep(4);
    } catch (error: any) {
      toast.error(error?.message || "تعذر إنشاء الوكيل الآن");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-[#f7f7ff] text-slate-950" dir="rtl">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-3 px-1 py-2">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-sm font-semibold text-slate-900" aria-label="Neon AI home">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5b4df5] to-[#8c7cff] text-white shadow-lg shadow-indigo-300/40"><Bot className="h-5 w-5" /></span>
            <span>NEON <span className="font-normal text-slate-500">AI Agent</span></span>
          </button>
          <Button variant="ghost" onClick={() => { localStorage.setItem("neon-onboarding-complete", "1"); setLocation("/agents"); }} className="text-xs text-slate-500 hover:bg-white hover:text-slate-900">
            تخطي الآن <ArrowLeft className="mr-1 h-4 w-4" />
          </Button>
        </header>

        <div className="mx-auto mt-4 flex w-full max-w-3xl items-center gap-2 px-1 sm:mt-8">
          {onboardingSteps.map((label, index) => (
            <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-gradient-to-l from-[#5b4df5] to-[#8c7cff]" : "bg-slate-200"}`} />
              <span className={`hidden text-[11px] font-semibold sm:block ${index === step ? "text-indigo-600" : "text-slate-400"}`}>{label}</span>
            </div>
          ))}
        </div>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-8 sm:py-12">
          {step === 0 && (
            <section className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#5144ea] to-[#8b7bff] text-white shadow-2xl shadow-indigo-300/50"><Wand2 className="h-9 w-9" /></div>
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">Start simple / ابدأ ببساطة</p>
              <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">ابنِ أول موظف ذكي لك في دقائق.</h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">بنمشي معك خطوة بخطوة. اختر وش تبغى وكيلك يسوي، واختر القنوات، وNeon يجهز لك إعداداً أولياً جاهزاً للتجربة.</p>
              <Button onClick={next} className="mt-9 h-14 w-full max-w-md rounded-full bg-gradient-to-l from-[#5144ea] to-[#7b6cff] text-base font-bold text-white shadow-xl shadow-indigo-300/40 hover:from-[#4639dc] hover:to-[#6f60f2]">خلّنا نبدأ <ArrowLeft className="mr-2 h-5 w-5" /></Button>
              <p className="mt-4 text-xs text-slate-400">ما يحتاج خبرة تقنية • تقدر تعدل كل شيء لاحقاً</p>
            </section>
          )}

          {step === 1 && (
            <section>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Target className="h-6 w-6" /></div>
                <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">وش تبغى وكيلك يسوي؟</h1>
                <p className="mt-3 text-base text-slate-500">اختر هدفاً واحداً أو أكثر، وتقدر تغيرها لاحقاً.</p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {goals.map(goal => {
                  const selected = selectedGoals.includes(goal.id);
                  return <button key={goal.id} onClick={() => toggle(goal.id, selectedGoals, setSelectedGoals)} className={`group flex min-h-[76px] items-center gap-4 rounded-[24px] border-2 px-5 text-right transition-all ${selected ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md"}`}>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}><goal.icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 sm:text-base">{goal.title}</span><span className="mt-0.5 block text-xs text-slate-400" dir="ltr">{goal.subtitle}</span></span>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 text-transparent"}`}><Check className="h-4 w-4" /></span>
                  </button>;
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="mx-auto w-full max-w-2xl">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Bot className="h-6 w-6" /></div>
                <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">خلّه يتكلم بطريقتك.</h1>
                <p className="mt-3 text-base text-slate-500">اختر اللغة والنبرة، وNeon يجهز لك شخصية أولية مناسبة.</p>
              </div>
              <div className="mt-8 space-y-7 rounded-[28px] bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-8">
                <div><p className="mb-3 text-sm font-bold text-slate-900">اللغة / Language</p><div className="grid gap-3 sm:grid-cols-3">{[{ id: "ar", label: "العربية", sub: "Arabic" }, { id: "bilingual", label: "عربي + English", sub: "Bilingual" }, { id: "en", label: "English", sub: "English" }].map(item => <button key={item.id} onClick={() => setLanguage(item.id as any)} className={`rounded-2xl border-2 p-4 text-right transition ${language === item.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"}`}><span className="block text-sm font-bold text-slate-900">{item.label}</span><span className="mt-1 block text-xs text-slate-400" dir="ltr">{item.sub}</span></button>)}</div></div>
                <div><p className="mb-3 text-sm font-bold text-slate-900">النبرة / Tone</p><div className="grid gap-3 sm:grid-cols-3">{[{ id: "friendly", label: "ودود", sub: "Friendly" }, { id: "professional", label: "احترافي", sub: "Professional" }, { id: "direct", label: "مباشر", sub: "Direct" }].map(item => <button key={item.id} onClick={() => setTone(item.id)} className={`rounded-2xl border-2 p-4 text-right transition ${tone === item.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"}`}><span className="block text-sm font-bold text-slate-900">{item.label}</span><span className="mt-1 block text-xs text-slate-400" dir="ltr">{item.sub}</span></button>)}</div></div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600"><Radio className="h-6 w-6" /></div>
                <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">وين تبي تستقبل العملاء؟</h1>
                <p className="mt-3 text-base text-slate-500">حدد القنوات اللي تبغى تبدأ فيها. تقدر تربط الباقي بعدين.</p>
              </div>
              <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">{channels.map(channel => { const selected = selectedChannels.includes(channel.id); return <button key={channel.id} onClick={() => toggle(channel.id, selectedChannels, setSelectedChannels)} className={`flex min-h-[82px] items-center gap-4 rounded-[24px] border-2 bg-white px-5 text-right transition ${selected ? "border-cyan-500 bg-cyan-50 shadow-lg shadow-cyan-100" : "border-slate-200 hover:border-cyan-200 hover:shadow-md"}`}><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selected ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500"}`}><channel.icon className="h-5 w-5" /></span><span className="flex-1"><span className="block text-sm font-bold text-slate-900">{channel.title}</span><span className="mt-1 block text-xs text-slate-400" dir="ltr">{channel.subtitle}</span></span><span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 text-transparent"}`}><Check className="h-4 w-4" /></span></button>; })}</div>
            </section>
          )}

          {step === 4 && (
            <section className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></div>
              <h1 className="mt-7 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">وكيلك جاهز.</h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-600">تم تجهيز الإعداد الأولي بناءً على اختياراتك. الحين تقدر تضيف المعرفة، تربط القنوات، وتجرب المحادثة.</p>
              <div className="mx-auto mt-7 grid max-w-lg gap-3 text-right sm:grid-cols-2">{selectedGoalObjects.slice(0, 4).map(goal => <div key={goal.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"><goal.icon className="h-4 w-4 text-indigo-500" /><span className="text-xs font-semibold text-slate-700">{goal.title}</span></div>)}</div>
              <Button onClick={() => setLocation("/agents")} className="mt-9 h-14 w-full max-w-md rounded-full bg-gradient-to-l from-[#5144ea] to-[#7b6cff] text-base font-bold text-white shadow-xl shadow-indigo-300/40 hover:from-[#4639dc] hover:to-[#6f60f2]">افتح لوحة الوكيل <ArrowLeft className="mr-2 h-5 w-5" /></Button>
            </section>
          )}
        </main>

        {step > 0 && step < 4 && (
          <footer className="sticky bottom-0 mt-auto flex flex-col-reverse gap-3 border-t border-slate-200/80 bg-[#f7f7ff]/95 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(current => Math.max(current - 1, 0))} className="h-12 rounded-full text-slate-500 hover:bg-white hover:text-slate-900"><ArrowRight className="ml-2 h-4 w-4" /> رجوع</Button>
            {step === 3 ? <Button onClick={createFirstAgent} disabled={isCreating} className="h-14 rounded-full bg-gradient-to-l from-[#5144ea] to-[#7b6cff] px-8 text-base font-bold text-white shadow-xl shadow-indigo-200/50 hover:from-[#4639dc] hover:to-[#6f60f2]">{isCreating ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري التجهيز...</> : <>أنشئ وكيلي <ArrowLeft className="mr-2 h-5 w-5" /></>}</Button> : <Button onClick={next} className="h-14 rounded-full bg-gradient-to-l from-[#5144ea] to-[#7b6cff] px-8 text-base font-bold text-white shadow-xl shadow-indigo-200/50 hover:from-[#4639dc] hover:to-[#6f60f2]">Continue <ArrowLeft className="mr-2 h-5 w-5" /></Button>}
          </footer>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data, isLoading } = trpc.workspace.overview.useQuery(undefined, { enabled: Boolean(user) });
  const stats = data?.stats;
  const metrics = [
    { label: "المحادثات / Conversations", value: formatNumber(stats?.conversations), change: "هذا الشهر", icon: MessageSquareText, color: "text-cyan-300", bg: "bg-cyan-300/10" },
    { label: "نشطة / Active", value: formatNumber(stats?.active), change: "تحتاج متابعة", icon: TrendingUp, color: "text-lime-300", bg: "bg-lime-300/10" },
    { label: "تم الحل / Resolved", value: formatNumber(stats?.resolved), change: "بواسطة الوكلاء", icon: CircleCheck, color: "text-emerald-300", bg: "bg-emerald-300/10" },
    { label: "تحتاج إنسان / Escalated", value: formatNumber(stats?.escalated), change: "للفريق", icon: Headphones, color: "text-amber-300", bg: "bg-amber-300/10" },
  ];

  return <div className="mx-auto max-w-[1400px] space-y-7 pb-12" dir="rtl">
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1b2d] px-6 py-8 shadow-2xl shadow-cyan-950/20 md:px-10 md:py-10"><div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" /><div className="absolute -bottom-28 right-20 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" /><div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center"><div className="max-w-2xl"><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80" dir="ltr"><span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_#bef264]" /> Neon AI Agents</div><h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">خلِّ الذكاء الاصطناعي <span className="text-lime-300">يتكلم باسمك.</span></h1><p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 md:text-base">مساحة عمل موحّدة لبناء وكلاء يفهمون عملاءك، يجيبون بثقة، ويتابعون كل محادثة عبر القنوات التي تستخدمها.</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => setLocation("/agents")} className="rounded-xl bg-lime-300 px-5 text-slate-950 hover:bg-lime-200"><Plus className="ml-2 h-4 w-4" /> إنشاء وكيل جديد</Button><Button variant="outline" onClick={() => { localStorage.removeItem("neon-onboarding-complete"); window.location.reload(); }} className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"><Wand2 className="ml-2 h-4 w-4" /> تشغيل الإعداد السريع</Button></div></div><div className="grid w-full max-w-sm grid-cols-2 gap-3">{(data?.agents ?? []).slice(0, 4).map((agent, index) => <div key={agent.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur"><div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><Bot className="h-4 w-4" /></div><span className={`h-2 w-2 rounded-full ${agent.status === "active" ? "bg-lime-300" : "bg-slate-500"}`} /></div><p className="mt-4 truncate text-sm font-semibold text-white">{agent.name}</p><p className="mt-1 text-xs text-slate-400">{index === 0 ? "واجهة العملاء" : agent.language === "bilingual" ? "AR + EN" : agent.language.toUpperCase()}</p></div>)}{!data?.agents?.length && !isLoading && <div className="col-span-2 rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">سيظهر وكلاؤك هنا بعد الإنشاء</div>}</div></div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(item => <Card key={item.label} className="border-white/10 bg-[#0b1728]/90 shadow-xl shadow-slate-950/20"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-slate-400">{item.label}</p><p className="mt-3 text-3xl font-semibold text-white">{isLoading ? "—" : item.value}</p><p className="mt-2 text-xs text-slate-500">{item.change}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color}`}><item.icon className="h-5 w-5" /></div></div></CardContent></Card>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><Card className="border-white/10 bg-[#0b1728]/90 shadow-xl shadow-slate-950/20"><CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-5"><div><CardTitle className="text-lg text-white">آخر المحادثات</CardTitle><p className="mt-1 text-xs text-slate-400">مراقبة مستمرة لكل تفاعل مع عملائك</p></div><Button variant="ghost" onClick={() => setLocation("/conversations")} className="text-xs text-cyan-200 hover:bg-white/5 hover:text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button></CardHeader><CardContent className="p-0">{(data?.conversations ?? []).slice(0, 5).map(conversation => <div key={conversation.id} className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-6 py-4 last:border-0"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/20 to-lime-300/10 text-sm font-semibold text-cyan-100">{(conversation.customerName || "؟").slice(0, 1)}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{conversation.customerName || "زائر جديد"}</p><p className="mt-1 truncate text-xs text-slate-400">{conversation.customerEmail || conversation.customerPhone || "لا توجد بيانات اتصال بعد"}</p></div></div><div className="flex shrink-0 items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline">{conversation.channel}</span><Badge className={conversation.status === "escalated" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : conversation.status === "resolved" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"}>{conversation.status}</Badge></div></div>)}{!data?.conversations?.length && <div className="px-6 py-12 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm text-slate-300">لا توجد محادثات بعد</p><p className="mt-1 text-xs text-slate-500">فعّل الودجت أو جرّب المحاكي لبدء أول محادثة.</p></div>}</CardContent></Card><Card className="border-white/10 bg-[#0b1728]/90 shadow-xl shadow-slate-950/20"><CardHeader className="border-b border-white/10 pb-5"><CardTitle className="text-lg text-white">تشغيل سريع</CardTitle><p className="mt-1 text-xs text-slate-400">أهم الخطوات لتجهيز وكيلك</p></CardHeader><CardContent className="space-y-3 p-5">{[{ icon: Bot, title: "عرّف شخصية وكيلك", desc: "النبرة، اللغة، وقواعد القرار", path: "/agents", color: "text-lime-300" }, { icon: Sparkles, title: "أضف معرفة العمل", desc: "FAQs، عروض، وسياسات", path: "/knowledge", color: "text-cyan-300" }, { icon: Radio, title: "اربط قنواتك", desc: "Web، WhatsApp، Social", path: "/channels", color: "text-violet-300" }, { icon: UsersRound, title: "اختبر تجربة العميل", desc: "شغّل الودجت الآن", path: "/agents", color: "text-amber-300" }].map(action => <button key={action.title} onClick={() => setLocation(action.path)} className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-right transition hover:border-cyan-300/30 hover:bg-white/[0.06]"><div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ${action.color}`}><action.icon className="h-4 w-4" /></div><div className="flex-1"><p className="text-sm font-medium text-white">{action.title}</p><p className="mt-1 text-xs text-slate-500">{action.desc}</p></div><ChevronLeft className="h-4 w-4 text-slate-600" /></button>)}</CardContent></Card></div>
  </div>;
}

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(() => typeof window !== "undefined" && localStorage.getItem("neon-onboarding-complete") !== "1");

  useEffect(() => {
    const handleStorage = () => setShowOnboarding(localStorage.getItem("neon-onboarding-complete") !== "1");
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return showOnboarding ? <Onboarding /> : <DashboardLayout><Dashboard /></DashboardLayout>;
}
