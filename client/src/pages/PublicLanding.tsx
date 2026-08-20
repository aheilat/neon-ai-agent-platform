import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { NEON_CONTACT_EMAIL } from "@shared/contact";
import {
  ArrowLeft,
  ArrowUpLeft,
  Bot,
  Check,
  ChevronLeft,
  CirclePlay,
  Globe2,
  Instagram,
  Languages,
  LockKeyhole,
  MessageCircle,
  Moon,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRoundCheck,
  UsersRound,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export const LANDING_WORKFLOW = [
  { number: "01", label: "اربط القنوات", copy: "أضف موقعك أولاً، ثم جهّز WhatsApp والقنوات التي يستخدمها عملاؤك.", icon: MessageCircle, tag: "Website · WhatsApp" },
  { number: "02", label: "علّم الوكيل", copy: "أدخل موقعك واختر أهداف الوكيل ونبرته؛ Neon يبني نقطة بداية قابلة للتحكم.", icon: Sparkles, tag: "Knowledge · Arabic" },
  { number: "03", label: "انطلق بثقة", copy: "اختبر الردود، راقب التحويلات، ثم سلّم الحالات الحساسة لفريقك بالوقت المناسب.", icon: Zap, tag: "Launch · Improve" },
];

export const LANDING_VERTICALS = [
  { name: "التجارة الإلكترونية", outcome: "أسئلة المنتجات، الطلبات، والشراء", icon: Sparkles },
  { name: "العقارات", outcome: "تأهيل العملاء وحجز المعاينات", icon: Globe2 },
  { name: "الخدمات المحلية", outcome: "طلبات العرض والحجوزات والمتابعة", icon: PhoneCall },
  { name: "الرعاية الصحية", outcome: "توجيه آمن ومواعيد مع تصعيد واضح", icon: ShieldCheck },
  { name: "السفر والضيافة", outcome: "تأهيل الطلبات وتنسيق البرنامج", icon: Languages },
];

function NeonMark({ compact = false }: { compact?: boolean }) {
  return <span className="inline-flex items-center gap-2.5" dir="ltr"><span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-cyan-300 via-sky-400 to-lime-300 text-slate-950 shadow-[0_0_32px_rgba(103,232,249,0.32)]"><Bot className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#07111f] bg-lime-300" /></span>{!compact && <span className="text-sm font-extrabold tracking-[0.16em] text-white">NEON <span className="font-semibold text-cyan-200">AI</span></span>}</span>;
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
        // Ignore malformed local intent and continue to the normal workspace path.
      }
    }
    if (localStorage.getItem("neon-after-auth") !== "/start") return;
    localStorage.removeItem("neon-after-auth");
    setLocation("/start");
  }, [isAuthenticated, setLocation]);

  const beginFree = () => {
    if (isAuthenticated) return setLocation("/start");
    localStorage.setItem("neon-after-auth", "/start");
    startLogin();
  };

  const tone = isLight ? {
    page: "bg-[#f6fbff] text-slate-950",
    muted: "text-slate-600",
    card: "border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]",
    soft: "border-slate-200 bg-white/80",
    nav: "border-slate-200 bg-white/75",
  } : {
    page: "bg-[#06111f] text-white",
    muted: "text-slate-300",
    card: "border-white/[0.11] bg-[#0b1b2e]/80 shadow-[0_28px_80px_rgba(0,0,0,0.34)]",
    soft: "border-white/[0.09] bg-white/[0.035]",
    nav: "border-white/[0.08] bg-[#071625]/70",
  };

  return <main className={`min-h-screen overflow-hidden ${tone.page}`} dir="rtl">
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.17] [background-image:radial-gradient(circle,rgba(148,163,184,0.75)_1px,transparent_1px)] [background-size:19px_19px]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[850px] bg-[radial-gradient(circle_at_75%_14%,rgba(34,211,238,0.20),transparent_23rem),radial-gradient(circle_at_23%_30%,rgba(190,242,100,0.12),transparent_25rem)]" />

    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 lg:px-8">
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border px-4 py-3 backdrop-blur-xl ${tone.nav}`}>
        <Link href="/" aria-label="Neon AI home"><NeonMark /></Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          <a href="#product" className={`${tone.muted} transition hover:text-cyan-300`}>المنصة</a>
          <a href="#how-it-works" className={`${tone.muted} transition hover:text-cyan-300`}>كيف تعمل</a>
          <a href="#industries" className={`${tone.muted} transition hover:text-cyan-300`}>للقطاعات</a>
          <Link href="/pricing" className={`${tone.muted} transition hover:text-cyan-300`}>الأسعار</Link>
        </nav>
        <div className="flex items-center gap-2" dir="ltr">
          <button type="button" onClick={() => setIsLight(value => !value)} className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${isLight ? "border-slate-200 bg-white text-slate-700 hover:border-cyan-300" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40"}`} aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}>{isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
          {isAuthenticated ? <Button onClick={() => setLocation("/start")} className="h-10 rounded-xl bg-lime-300 px-4 text-sm font-bold text-slate-950 hover:bg-lime-200">مساحة العمل</Button> : <><Link href="/login" className={`hidden px-2 text-sm font-bold sm:inline ${isLight ? "text-slate-600" : "text-slate-200"}`}>تسجيل الدخول</Link><Button onClick={beginFree} className="h-10 rounded-xl bg-gradient-to-l from-cyan-300 to-lime-300 px-4 text-sm font-extrabold text-slate-950 shadow-[0_10px_30px_rgba(103,232,249,0.25)] hover:from-cyan-200 hover:to-lime-200">ابدأ مجاناً</Button></>}
        </div>
      </div>
    </header>

    <section className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8 lg:pb-24">
      <div className="order-1 max-w-2xl text-center lg:text-right">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${isLight ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-cyan-300/20 bg-cyan-300/[0.10] text-cyan-100"}`}><span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_12px_#bef264]" /> وكلاء محادثة عربية للشركات</div>
        <h1 className={`mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-[-0.055em] sm:text-6xl lg:text-7xl ${isLight ? "text-slate-950" : "text-white"}`}>ردّ على عملائك،<br /><span className="bg-gradient-to-l from-cyan-300 via-sky-300 to-lime-300 bg-clip-text text-transparent">واجمع طلباتهم،</span><br />وسلّم المهم لفريقك.</h1>
        <p className={`mx-auto mt-6 max-w-xl text-base leading-8 sm:text-lg lg:mx-0 ${tone.muted}`}>Neon يحوّل موقع شركتك ومعرفتها إلى وكيل يجيب بوضوح، يؤهل الاستفسارات، ويعرف متى يتوقف ليسلّم المحادثة لفريقك.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"><Button onClick={beginFree} size="lg" className="h-14 rounded-2xl bg-gradient-to-l from-cyan-300 to-lime-300 px-6 text-base font-extrabold text-slate-950 shadow-[0_16px_38px_rgba(103,232,249,0.25)] hover:from-cyan-200 hover:to-lime-200">ابنِ وكيلك الأول مجاناً <ArrowLeft className="mr-2 h-5 w-5" /></Button><a href="#product" className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl border px-6 text-base font-bold transition ${isLight ? "border-slate-200 bg-white text-slate-800 hover:border-cyan-300" : "border-white/[0.12] bg-white/[0.03] text-white hover:border-cyan-300/50 hover:bg-white/[0.06]"}`}><CirclePlay className="h-5 w-5 text-cyan-300" /> شاهد المنتج</a></div>
        <div className={`mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold lg:justify-start ${isLight ? "text-slate-500" : "text-slate-400"}`}><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-lime-300" /> تجربة مجانية 14 يوماً</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-lime-300" /> بلا بطاقة للبدء</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-lime-300" /> عربي وإنجليزي</span></div>
      </div>

      <div id="product" className="order-2 relative mx-auto w-full max-w-[710px]">
        <div className="absolute -inset-10 -z-10 rounded-[4rem] bg-cyan-300/15 blur-3xl" />
        <div className={`overflow-hidden rounded-[30px] border p-3 sm:p-4 ${tone.card}`}>
          <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-[#071626]/75"}`}><div className="flex items-center gap-3"><NeonMark compact /><div><p className={`text-sm font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>تشغيل المحادثات</p><p className={`mt-0.5 text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>مثال توضيحي داخل Neon</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-lime-300/10 px-2.5 py-1 text-[10px] font-extrabold text-lime-300"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> الوكيل نشط</span></div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[0.72fr_1.28fr]">
            <aside className={`rounded-2xl border p-3 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-white/[0.025]"}`}><p className={`px-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>القنوات</p>{[{ icon: MessageCircle, text: "WhatsApp", active: true }, { icon: Globe2, text: "الموقع", active: false }, { icon: Instagram, text: "Instagram", active: false }].map(channel => <div key={channel.text} className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${channel.active ? (isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-300/10 text-emerald-100") : (isLight ? "text-slate-500" : "text-slate-400")}`}><channel.icon className="h-3.5 w-3.5" />{channel.text}<span className={`mr-auto h-1.5 w-1.5 rounded-full ${channel.active ? "bg-lime-300" : "bg-slate-400"}`} /></div>)}<div className={`mt-4 rounded-xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/[0.07] bg-[#10243a]"}`}><p className={`text-[10px] font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>قاعدة المعرفة</p><p className={`mt-1 text-xs font-extrabold ${isLight ? "text-slate-800" : "text-white"}`}>موقعك + ملفاتك</p></div></aside>
            <section className={`rounded-2xl border p-4 sm:p-5 ${isLight ? "border-slate-100 bg-white" : "border-white/[0.07] bg-[#081829]"}`}><div className="flex items-start justify-between gap-4"><div><p className={`text-base font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>طلب جديد: شاحنة مبردة</p><p className={`mt-1 text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>WhatsApp · محادثة تجريبية</p></div><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-extrabold text-cyan-200">تأهيل عميل</span></div><div className={`mt-5 max-w-[88%] rounded-2xl rounded-tr-sm px-3.5 py-3 text-xs leading-6 ${isLight ? "bg-slate-100 text-slate-700" : "bg-white/[0.07] text-slate-100"}`}>أحتاج شاحنة مبردة يوم الثلاثاء. هل تتوفر في مسقط؟</div><div className="mr-auto mt-3 max-w-[90%] rounded-2xl rounded-tl-sm bg-gradient-to-l from-cyan-300 to-[#9cf1bf] px-3.5 py-3 text-xs leading-6 text-slate-950">يسعدني مساعدتك. ما الحمولة التقريبية ووقت الاستلام؟ سأتحقق من التوفر وأسجّل طلبك للفريق.</div><div className={`mt-5 flex items-center justify-between rounded-xl border px-3 py-2.5 ${isLight ? "border-lime-100 bg-lime-50" : "border-lime-300/15 bg-lime-300/[0.06]"}`}><span className={`inline-flex items-center gap-2 text-xs font-bold ${isLight ? "text-lime-800" : "text-lime-100"}`}><UserRoundCheck className="h-4 w-4 text-lime-300" /> جاهز للتحويل للفريق عند الحاجة</span><span className="text-[10px] font-extrabold text-lime-300">بيانات بإذن العميل</span></div></section>
          </div>
        </div>
        <div className={`absolute -right-3 top-20 hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold shadow-xl sm:flex ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-[#11263c] text-white"}`}><ShieldCheck className="h-4 w-4 text-lime-300" /> إجابة من المعرفة</div>
        <div className={`absolute -left-4 bottom-10 hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold shadow-xl sm:flex ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-[#11263c] text-white"}`}><MessageCircle className="h-4 w-4 text-emerald-400" /> WhatsApp جاهز للربط</div>
      </div>
    </section>

    <section className={`border-y ${isLight ? "border-slate-200 bg-white/75" : "border-white/[0.07] bg-white/[0.025]"}`}><div className="mx-auto grid max-w-7xl gap-px px-4 sm:grid-cols-3 sm:px-6 lg:px-8"><div className="py-6 text-center"><p className="text-2xl font-extrabold text-cyan-300">موقعك</p><p className={`mt-1 text-xs font-semibold ${tone.muted}`}>تعليم الوكيل من صفحاتك العامة</p></div><div className="border-y py-6 text-center sm:border-x sm:border-y-0 sm:border-white/[0.08]"><p className="text-2xl font-extrabold text-lime-300">قنواتك</p><p className={`mt-1 text-xs font-semibold ${tone.muted}`}>محادثات موحّدة على الويب وWhatsApp</p></div><div className="py-6 text-center"><p className="text-2xl font-extrabold text-cyan-300">فريقك</p><p className={`mt-1 text-xs font-semibold ${tone.muted}`}>تحويل واضح للحالات التي تحتاج إنساناً</p></div></div></section>

    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8" id="how-it-works"><div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-300">خطوات واضحة، بلا تعقيد</p><h2 className={`mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl ${isLight ? "text-slate-950" : "text-white"}`}>من أول زيارة إلى وكيل يعمل لخدمة عملائك.</h2><p className={`mt-5 max-w-md text-base leading-8 ${tone.muted}`}>ابدأ بخطوة واحدة. لا تحتاج إلى فريق تقني حتى ترى أول إجابة مبنية على معرفة نشاطك.</p><Link href="/pricing" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-cyan-300 hover:text-cyan-200">شاهد الباقات والتجربة المجانية <ArrowLeft className="h-4 w-4" /></Link></div><div className="space-y-3">{LANDING_WORKFLOW.map(step => <article key={step.number} className={`group flex gap-4 rounded-[24px] border p-5 transition duration-200 hover:-translate-y-0.5 ${tone.soft}`}><div className="flex w-12 shrink-0 flex-col items-center"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/20 to-lime-300/10 text-cyan-300"><step.icon className="h-5 w-5" /></span><span className={`mt-2 text-[10px] font-extrabold ${isLight ? "text-slate-400" : "text-slate-500"}`}>{step.number}</span></div><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className={`text-xl font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>{step.label}</h3><span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300" dir="ltr">{step.tag}</span></div><p className={`mt-2 text-sm leading-7 ${tone.muted}`}>{step.copy}</p></div></article>)}</div></div></section>

    <section id="industries" className={`border-y py-24 ${isLight ? "border-slate-200 bg-white/75" : "border-white/[0.07] bg-[#091a2b]/55"}`}><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:px-8"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime-300">مُصمم لطبيعة عملك</p><h2 className={`mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl ${isLight ? "text-slate-950" : "text-white"}`}>لا تبدأ من صفحة فارغة.</h2><p className={`mt-5 max-w-lg text-base leading-8 ${tone.muted}`}>اختر قالباً يهيّئ الأهداف والقنوات وقاعدة المعرفة كنقطة بداية. يبقى كل شيء قابلاً للتعديل قبل الإطلاق.</p><Button onClick={beginFree} variant="outline" className={`mt-7 h-12 rounded-xl px-5 font-bold ${isLight ? "border-slate-200 bg-white text-slate-800 hover:border-cyan-300" : "border-white/[0.12] bg-white/[0.03] text-white hover:border-cyan-300/50"}`}>استكشف القوالب <ArrowLeft className="mr-2 h-4 w-4" /></Button></div><div className={`overflow-hidden rounded-[28px] border ${tone.card}`}>{LANDING_VERTICALS.map((vertical, index) => <button key={vertical.name} type="button" onClick={beginFree} className={`group flex w-full items-center gap-4 px-5 py-4 text-right transition ${index !== LANDING_VERTICALS.length - 1 ? (isLight ? "border-b border-slate-100" : "border-b border-white/[0.07]") : ""} ${isLight ? "hover:bg-cyan-50" : "hover:bg-white/[0.045]"}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300"><vertical.icon className="h-4.5 w-4.5" /></span><span className="flex-1"><span className={`block text-sm font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>{vertical.name}</span><span className={`mt-1 block text-xs ${tone.muted}`}>{vertical.outcome}</span></span><ChevronLeft className="h-4 w-4 text-slate-500 transition group-hover:-translate-x-1 group-hover:text-cyan-300" /></button>)}</div></div></section>

    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"><div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]"><div className={`rounded-[30px] border p-7 sm:p-10 ${tone.card}`}><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-extrabold text-lime-300">التجربة المجانية</span><span className={`rounded-full border px-3 py-1 text-xs font-bold ${isLight ? "border-slate-200 text-slate-600" : "border-white/[0.10] text-slate-300"}`}>14 يوماً · بلا بطاقة</span></div><h2 className={`mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl ${isLight ? "text-slate-950" : "text-white"}`}>اختبر أول محادثة قبل أن تربط أي قناة حية.</h2><p className={`mt-5 max-w-xl text-base leading-8 ${tone.muted}`}>أنشئ مساحة عملك، أضف موقعك، وجرّب الوكيل. عندما تصبح جاهزاً، اختر الباقة المناسبة وفعّل قنواتك.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button onClick={beginFree} size="lg" className="h-14 rounded-2xl bg-gradient-to-l from-cyan-300 to-lime-300 px-6 text-base font-extrabold text-slate-950 hover:from-cyan-200 hover:to-lime-200">ابدأ التجربة المجانية <ArrowLeft className="mr-2 h-5 w-5" /></Button><Link href="/pricing" className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl border px-6 font-bold ${isLight ? "border-slate-200 bg-white text-slate-800" : "border-white/[0.12] bg-white/[0.03] text-white"}`}>قارن الباقات <ArrowUpLeft className="h-4 w-4" /></Link></div></div><aside className={`rounded-[30px] border p-7 ${tone.soft}`}><LockKeyhole className="h-7 w-7 text-cyan-300" /><h3 className={`mt-5 text-xl font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>ثقة قبل الإطلاق</h3><div className={`mt-5 space-y-4 text-sm leading-6 ${tone.muted}`}><p className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-lime-300" /> عزل بيانات ومحادثات كل شركة داخل مساحة عملها.</p><p className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-lime-300" /> طلب موافقة قبل جمع بيانات التواصل عند تفعيلها في إعدادات الخصوصية.</p><p className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-lime-300" /> ربط WhatsApp الذاتي جاهز تقنياً ويُفتح للعملاء بعد اكتمال مراجعة Meta.</p></div></aside></div></section>

    <footer className={`border-t ${isLight ? "border-slate-200 bg-white" : "border-white/[0.07] bg-[#05101b]"}`}><div className={`mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs sm:flex-row sm:px-6 lg:px-8 ${isLight ? "text-slate-500" : "text-slate-500"}`}><NeonMark /><span>Neon AI Agent Platform · Arabic-first customer automation</span><div className="flex items-center gap-4"><Link href="/pricing" className="hover:text-cyan-300">الأسعار</Link><Link href="/login" className="hover:text-cyan-300">تسجيل الدخول</Link><a href={`mailto:${NEON_CONTACT_EMAIL}`} className="hover:text-cyan-300">تواصل معنا</a></div></div></footer>
  </main>;
}
