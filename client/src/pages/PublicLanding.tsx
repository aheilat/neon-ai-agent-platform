import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronLeft,
  CirclePlay,
  Globe2,
  Instagram,
  Languages,
  MessageCircle,
  Moon,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRoundPlus,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "اربط قنواتك",
    description: "ابدأ من موقعك، ثم أضف WhatsApp وقنوات التواصل التي يستخدمها عملاؤك.",
    detail: "Web · WhatsApp · Instagram",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "درّب وكيلك",
    description: "أدخل رابط موقعك، وسيتعرّف Neon على خدماتك وأسئلتك الشائعة ونبرة علامتك.",
    detail: "Website learning · AR + EN",
  },
  {
    number: "03",
    icon: Zap,
    title: "انطلق وتابع النتائج",
    description: "اختبر المحادثة، انشر الوكيل، ثم راقب الحلول والتحويلات والفرص من مكان واحد.",
    detail: "Launch · Monitor · Improve",
  },
];

const industries = [
  "التجارة الإلكترونية",
  "العقارات",
  "الرعاية الصحية",
  "الخدمات المحلية",
  "التسويق",
  "السفر والسياحة",
];

function NeonMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" dir="ltr">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-lime-300 text-slate-950 shadow-[0_0_28px_rgba(103,232,249,0.28)]">
        <Bot className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="text-sm font-bold tracking-[0.12em] text-white">
          NEON <span className="font-medium text-slate-400">AI</span>
        </span>
      )}
    </span>
  );
}

export default function PublicLanding() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("neon-light", isLight);
    return () => document.documentElement.classList.remove("neon-light");
  }, [isLight]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const checkoutIntent = localStorage.getItem("neon-checkout-intent");
    if (checkoutIntent) {
      localStorage.removeItem("neon-checkout-intent");
      try {
        const intent = JSON.parse(checkoutIntent) as { plan: string; cycle: string };
        setLocation(`/billing?plan=${encodeURIComponent(intent.plan)}&cycle=${encodeURIComponent(intent.cycle)}`);
        return;
      } catch {
        // A malformed browser value is ignored and the standard guided flow stays available.
      }
    }
    if (localStorage.getItem("neon-after-auth") !== "/start") return;
    localStorage.removeItem("neon-after-auth");
    setLocation("/start");
  }, [isAuthenticated, setLocation]);

  const beginFree = () => {
    if (isAuthenticated) {
      setLocation("/start");
      return;
    }
    localStorage.setItem("neon-after-auth", "/start");
    startLogin();
  };

  return (
    <main className={`min-h-screen overflow-hidden ${isLight ? "bg-[#f7fbff] text-slate-950" : "bg-[#07111f] text-white"}`} dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[760px] bg-[radial-gradient(circle_at_72%_20%,rgba(103,232,249,0.16),transparent_25rem),radial-gradient(circle_at_28%_25%,rgba(190,242,100,0.10),transparent_20rem)]" />
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-[0.16] [background-image:radial-gradient(circle,rgba(148,163,184,0.8)_1px,transparent_1px)] [background-size:18px_18px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Neon AI home"><NeonMark /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-400 lg:flex" dir="ltr">
          <a href="#platform" className="hover:text-white">Platform</a>
          <a href="#how-it-works" className="hover:text-white">How it works</a>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <a href="#industries" className="hover:text-white">Industries</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3" dir="ltr">
          <button type="button" onClick={() => setIsLight(value => !value)} className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-white/[0.04] text-slate-300"}`} aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}>
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          {isAuthenticated ? (
            <Button onClick={() => setLocation("/start")} className="h-10 rounded-xl bg-lime-300 px-4 text-sm font-bold text-slate-950 hover:bg-lime-200">مساحة العمل</Button>
          ) : (
            <>
              <Link href="/login" className={`px-1.5 text-xs font-semibold sm:hidden ${isLight ? "text-slate-600 hover:text-slate-950" : "text-slate-200 hover:text-white"}`}>دخول</Link>
              <Link href="/login" className={`hidden px-2 text-sm font-semibold sm:inline ${isLight ? "text-slate-600 hover:text-slate-950" : "text-slate-200 hover:text-white"}`}>تسجيل الدخول</Link>
              <Button onClick={beginFree} className="h-10 rounded-xl bg-gradient-to-l from-cyan-300 to-lime-300 px-4 text-sm font-bold text-slate-950 shadow-[0_10px_28px_rgba(103,232,249,0.20)] hover:from-cyan-200 hover:to-lime-200">ابدأ مجاناً</Button>
            </>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-28">
        <div className="max-w-3xl text-center lg:text-right">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${isLight ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}><span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_10px_#bef264]" /> منصة وكلاء ذكية للمنطقة العربية</div>
          <h1 className={`mt-6 text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.045em] sm:text-6xl lg:text-7xl ${isLight ? "text-slate-950" : "text-white"}`}>
            ابنِ وكيلك الذكي الأول، <span className="bg-gradient-to-l from-cyan-300 to-lime-300 bg-clip-text text-transparent">مجاناً.</span>
          </h1>
          <p className={`mx-auto mt-6 max-w-2xl text-base leading-8 sm:text-lg lg:mx-0 ${isLight ? "text-slate-600" : "text-slate-300"}`}>
            Neon يحوّل معرفة شركتك إلى محادثات مفيدة عبر موقعك وWhatsApp. حلّ الاستفسارات، اجمع العملاء المحتملين، ووجّه الحالات المهمة للفريق.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button onClick={beginFree} size="lg" className="h-14 rounded-2xl bg-gradient-to-l from-cyan-300 to-lime-300 px-6 text-base font-bold text-slate-950 shadow-[0_14px_35px_rgba(103,232,249,0.22)] hover:from-cyan-200 hover:to-lime-200">ابنِ وكيلك الأول مجاناً <ArrowLeft className="mr-2 h-5 w-5" /></Button>
            <Link href="#how-it-works" className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl border px-6 text-base font-semibold ${isLight ? "border-slate-200 bg-white text-slate-700 hover:border-cyan-300" : "border-white/12 bg-white/[0.03] text-white hover:border-cyan-300/50 hover:bg-white/[0.06]"}`}><CirclePlay className="h-5 w-5 text-cyan-300" /> شاهد كيف يعمل</Link>
          </div>
          <div className={`mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium lg:justify-start ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime-300" /> ابدأ بلا بطاقة دفع</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime-300" /> عربي وإنجليزي</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime-300" /> إعداد خلال دقائق</span>
          </div>
        </div>

        <div id="platform" className="relative mx-auto w-full max-w-[560px] lg:mx-0">
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-cyan-300/10 blur-3xl" />
          <div className={`overflow-hidden rounded-[28px] border p-3 shadow-2xl ${isLight ? "border-slate-200 bg-white shadow-slate-300/30" : "border-white/12 bg-[#0b1728]/90 shadow-slate-950/60"}`}>
            <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.06] bg-white/[0.035]"}`}>
              <div className="flex items-center gap-2"><NeonMark compact /><span className={`text-xs font-semibold ${isLight ? "text-slate-600" : "text-slate-300"}`}>صندوق المحادثات الموحد</span></div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 3 وكلاء نشطون</span>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-[0.7fr_1.3fr]" dir="rtl">
              <aside className={`rounded-2xl border p-3 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.06] bg-white/[0.025]"}`}>
                <p className={`px-1 text-[10px] font-bold uppercase tracking-[0.12em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>القنوات</p>
                {[{ icon: MessageCircle, text: "WhatsApp", active: true }, { icon: Globe2, text: "Website", active: false }, { icon: Instagram, text: "Instagram", active: false }].map(channel => <div key={channel.text} className={`mt-2 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs ${channel.active ? (isLight ? "bg-cyan-100 text-cyan-800" : "bg-cyan-300/10 text-cyan-100") : (isLight ? "text-slate-500" : "text-slate-400")}`}><channel.icon className="h-3.5 w-3.5" />{channel.text}<span className={`mr-auto h-1.5 w-1.5 rounded-full ${channel.active ? "bg-lime-300" : "bg-slate-500"}`} /></div>)}
              </aside>
              <section className={`rounded-2xl border p-4 ${isLight ? "border-slate-100 bg-white" : "border-white/[0.06] bg-[#091523]"}`}>
                <div className="flex items-center justify-between"><div><p className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>طلب عرض سعر</p><p className={`mt-0.5 text-[11px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>WhatsApp · الآن</p></div><span className="rounded-full bg-lime-300/15 px-2 py-1 text-[10px] font-bold text-lime-300">تم الحل</span></div>
                <div className={`mt-5 max-w-[92%] rounded-2xl rounded-tr-sm px-3 py-2.5 text-xs leading-5 ${isLight ? "bg-slate-100 text-slate-700" : "bg-white/[0.07] text-slate-200"}`}>أهلاً، أريد معرفة الخدمة المناسبة لنشاطي.</div>
                <div className="mr-auto mt-3 max-w-[92%] rounded-2xl rounded-tl-sm bg-gradient-to-l from-cyan-300 to-[#91edc9] px-3 py-2.5 text-xs leading-5 text-slate-950">أكيد. أخبرني بنوع النشاط والهدف، وسأقترح الخدمة وأجمع بيانات التواصل للفريق عند الحاجة.</div>
                <div className={`mt-5 flex items-center gap-2 border-t pt-3 ${isLight ? "border-slate-100" : "border-white/[0.06]"}`}><div className={`h-8 flex-1 rounded-xl px-3 py-2 text-[10px] ${isLight ? "bg-slate-100 text-slate-400" : "bg-white/[0.04] text-slate-500"}`}>AI يكتب ردًا يعتمد على معرفتك...</div><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-300 text-slate-950"><ArrowLeft className="h-3.5 w-3.5" /></span></div>
              </section>
            </div>
          </div>
          <div className={`absolute -left-4 top-24 hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-lg sm:flex ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-[#102236] text-slate-100"}`}><MessageCircle className="h-4 w-4 text-emerald-400" /> WhatsApp · تم الحل</div>
          <div className={`absolute -right-3 bottom-10 hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-lg sm:flex ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-[#102236] text-slate-100"}`}><BadgeCheck className="h-4 w-4 text-lime-300" /> إجابة موثقة</div>
        </div>
      </section>

      <section className={`relative z-10 border-y py-8 ${isLight ? "border-slate-200 bg-white/70" : "border-white/[0.07] bg-white/[0.025]"}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-7 gap-y-4 px-4 sm:px-6 lg:justify-between lg:px-8">
          <span className={`text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>قنوات تعمل مع Neon من اليوم الأول</span>
          {[{ icon: Globe2, text: "Website" }, { icon: MessageCircle, text: "WhatsApp" }, { icon: Instagram, text: "Instagram" }, { icon: PhoneCall, text: "Human handoff" }].map(channel => <span key={channel.text} className={`inline-flex items-center gap-2 text-sm font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}><channel.icon className="h-4 w-4 text-cyan-300" />{channel.text}</span>)}
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl text-center sm:mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Simple by design</p>
          <h2 className={`mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl ${isLight ? "text-slate-950" : "text-white"}`}>من أول زيارة إلى أول وكيل في ثلاث خطوات.</h2>
          <p className={`mt-4 text-base leading-7 ${isLight ? "text-slate-600" : "text-slate-400"}`}>لا تحتاج فريقاً تقنياً. Neon يرافقك من معرفة نشاطك إلى إطلاق المحادثات ومراجعة النتائج.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(step => <article key={step.number} className={`group rounded-[24px] border p-6 transition duration-200 hover:-translate-y-1 ${isLight ? "border-slate-200 bg-white shadow-sm hover:border-cyan-200" : "border-white/[0.08] bg-white/[0.025] hover:border-cyan-300/30 hover:bg-white/[0.045]"}`}><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-300"><step.icon className="h-5 w-5" /></span><span className={`text-xs font-bold ${isLight ? "text-slate-400" : "text-slate-500"}`}>{step.number}</span></div><h3 className={`mt-8 text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{step.title}</h3><p className={`mt-3 text-sm leading-7 ${isLight ? "text-slate-600" : "text-slate-400"}`}>{step.description}</p><p className="mt-6 text-xs font-semibold text-cyan-300" dir="ltr">{step.detail}</p></article>)}
        </div>
      </section>

      <section id="industries" className={`relative z-10 border-y py-20 ${isLight ? "border-slate-200 bg-white/75" : "border-white/[0.07] bg-[#091523]/50"}`}>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">Built for your business</p><h2 className={`mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl ${isLight ? "text-slate-950" : "text-white"}`}>ابدأ بقالب مناسب لنشاطك.</h2><p className={`mt-4 max-w-md text-sm leading-7 ${isLight ? "text-slate-600" : "text-slate-400"}`}>تختار قطاعك، ويجهز Neon الأهداف والقنوات والنبرة كبداية قابلة للتعديل.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{industries.map((industry, index) => <button key={industry} onClick={beginFree} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-right text-sm font-bold ${isLight ? "border-slate-200 bg-white text-slate-800 hover:border-cyan-300" : "border-white/[0.08] bg-white/[0.03] text-slate-100 hover:border-cyan-300/40 hover:bg-white/[0.06]"}`}><span className="inline-flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300/20 to-lime-300/10 text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</span>{industry}</span><ChevronLeft className="h-4 w-4 text-slate-500" /></button>)}</div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <div className={`overflow-hidden rounded-[30px] border px-6 py-12 sm:px-12 ${isLight ? "border-cyan-100 bg-gradient-to-br from-white to-cyan-50 shadow-xl shadow-cyan-100/40" : "border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 via-[#0b1728] to-lime-300/[0.07]"}`}>
          <UserRoundPlus className="mx-auto h-8 w-8 text-lime-300" />
          <h2 className={`mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl ${isLight ? "text-slate-950" : "text-white"}`}>ابدأ بدون تعقيد. ابنِ وكيلك الأول اليوم.</h2>
          <p className={`mx-auto mt-5 max-w-xl text-sm leading-7 ${isLight ? "text-slate-600" : "text-slate-300"}`}>سجّل مساحة عملك، أضف رابط موقعك، وجرّب أول محادثة قبل ربط أي قناة حية.</p>
          <Button onClick={beginFree} size="lg" className="mt-8 h-14 rounded-2xl bg-gradient-to-l from-cyan-300 to-lime-300 px-7 text-base font-bold text-slate-950 hover:from-cyan-200 hover:to-lime-200">ابدأ تجربتك المجانية <ArrowLeft className="mr-2 h-5 w-5" /></Button>
          <p className={`mt-4 text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>التسجيل آمن، ولا توجد بطاقة دفع مطلوبة للبدء.</p>
        </div>
      </section>

      <footer className={`relative z-10 border-t ${isLight ? "border-slate-200 bg-white" : "border-white/[0.07] bg-[#06101c]"}`}>
        <div className={`mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-7 text-xs sm:flex-row sm:px-6 lg:px-8 ${isLight ? "text-slate-500" : "text-slate-500"}`}><NeonMark /><span>Neon AI Agent Platform · Arabic-first customer automation</span><div className="flex items-center gap-4"><Link href="/pricing" className="hover:text-cyan-300">الأسعار</Link><Link href="/login" className="hover:text-cyan-300">تسجيل الدخول</Link><a href="mailto:hello@neon.ai" className="hover:text-cyan-300">تواصل معنا <ArrowUpRight className="inline h-3 w-3" /></a></div></div>
      </footer>
    </main>
  );
}
