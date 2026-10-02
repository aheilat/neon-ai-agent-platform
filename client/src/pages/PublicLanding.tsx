import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { hasIndependentSupabaseBrowserConfig } from "@/lib/supabase";
import { NEON_CONTACT_EMAIL } from "@shared/contact";
import {
  ArrowLeft,
  ArrowUpLeft,
  Bot,
  Check,
  ChevronLeft,
  Globe2,
  Instagram,
  Languages,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

// Neon AI Agents' own company agent, used to power the live demo widget for site visitors.
// This id already existed in the codebase before this redesign; it is reused here, not newly introduced.
const DEMO_AGENT_ID = "2";

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

// Channel availability shown on the public landing page. `ready` must stay in sync with the
// `channels` list in Channels.tsx (the dashboard integration page) — it reflects which
// integrations are actually built, not just configured. Do not mark a channel `ready` here
// unless its backend integration exists; see docs/landing-page-conversion-audit for context.
const LANDING_CHANNELS = [
  { id: "whatsapp", name: "WhatsApp", nameAr: "واتساب", icon: MessageCircle, ready: true },
  { id: "web", name: "Website Chat", nameAr: "محادثة الموقع", icon: Globe2, ready: true },
  { id: "instagram", name: "Instagram", nameAr: "إنستغرام", icon: Instagram, ready: false },
  { id: "voice", name: "Voice", nameAr: "صوتي", icon: PhoneCall, ready: false },
] as const;

export function publicStartDestination(isIndependentRuntime: boolean, isAuthenticated: boolean) {
  if (isIndependentRuntime) return isAuthenticated ? "/start" : "/register";
  return isAuthenticated ? "/start" : undefined;
}

function NeonMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" dir="ltr">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Bot className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-ring" />
      </span>
      {!compact && <span className="text-sm font-bold tracking-[0.14em] text-foreground">NEON AI</span>}
    </span>
  );
}

export default function PublicLanding() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const isIndependentRuntime = hasIndependentSupabaseBrowserConfig();

  // Load the existing floating demo-agent widget (same mechanism used elsewhere in the app).
  // Every CTA below that should "talk to the agent" opens this widget rather than a new route.
  useEffect(() => {
    if (document.getElementById(`neon-agent-widget-${DEMO_AGENT_ID}`)) return;
    const script = document.createElement("script");
    script.src = "/neon-agent-widget.js";
    script.dataset.agentId = DEMO_AGENT_ID;
    document.body.appendChild(script);
    return () => {
      script.remove();
      document.getElementById(`neon-agent-widget-${DEMO_AGENT_ID}`)?.remove();
    };
  }, []);

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
    const destination = publicStartDestination(isIndependentRuntime, isAuthenticated);
    if (destination) return setLocation(destination);
    localStorage.setItem("neon-after-auth", "/start");
    startLogin();
  };

  // Opens the existing live demo widget. Reused by the hero's secondary CTA and by every
  // "ready" channel card — none of them invent a new route or a new agent id.
  const openDemo = () => {
    document.querySelector<HTMLButtonElement>(`#neon-agent-widget-${DEMO_AGENT_ID} .neon-launcher`)?.click();
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Neon AI home"><NeonMark /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
            <a href="#channels" className="transition hover:text-foreground">القنوات</a>
            <a href="#how-it-works" className="transition hover:text-foreground">كيف تعمل</a>
            <a href="#industries" className="transition hover:text-foreground">للقطاعات</a>
            <Link href="/pricing" className="transition hover:text-foreground">الأسعار</Link>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => setLocation("/start")} className="h-10 rounded-lg px-4 text-sm font-semibold">مساحة العمل</Button>
            ) : (
              <>
                <Link href="/login" className="hidden px-1 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline">تسجيل الدخول</Link>
                <Button onClick={beginFree} className="h-10 rounded-lg px-4 text-sm font-semibold">ابدأ مجاناً</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> وكلاء محادثة عربية للشركات
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
          ردّ على عملائك، واجمع طلباتهم، وسلّم المهم لفريقك.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Neon يحوّل موقع شركتك ومعرفتها إلى وكيل يجيب بوضوح، يؤهل الاستفسارات، ويعرف متى يتوقف ليسلّم المحادثة لفريقك.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={beginFree} size="lg" className="h-13 rounded-lg px-6 text-base font-semibold">
            ابنِ وكيلك الأول مجاناً <ArrowLeft className="mr-2 h-5 w-5" />
          </Button>
          <Button onClick={openDemo} variant="outline" size="lg" className="h-13 rounded-lg border-border px-6 text-base font-semibold">
            جرّب المحادثة الآن
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> تجربة مجانية 14 يوماً</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> بلا بطاقة للبدء</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> عربي وإنجليزي</span>
        </div>

        {/* Product proof panel */}
        <div className="relative mx-auto mt-14 w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card p-3 text-right shadow-xl shadow-black/20 sm:p-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <NeonMark compact />
              <div>
                <p className="text-sm font-semibold">تشغيل المحادثات</p>
                <p className="mt-0.5 text-xs text-muted-foreground">مثال توضيحي داخل Neon</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> الوكيل نشط
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-border bg-background p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">طلب جديد: شاحنة مبردة</p>
                <p className="mt-1 text-xs text-muted-foreground">WhatsApp · محادثة تجريبية</p>
              </div>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">تأهيل عميل</span>
            </div>
            <div className="mt-4 max-w-[90%] rounded-2xl rounded-tr-sm bg-secondary px-3.5 py-3 text-xs leading-6 text-foreground">
              أحتاج شاحنة مبردة يوم الثلاثاء. هل تتوفر في مسقط؟
            </div>
            <div className="mr-auto mt-3 max-w-[90%] rounded-2xl rounded-tl-sm bg-primary px-3.5 py-3 text-xs leading-6 text-primary-foreground">
              يسعدني مساعدتك. ما الحمولة التقريبية ووقت الاستلام؟ سأتحقق من التوفر وأسجّل طلبك للفريق.
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-xs font-semibold"><UserRoundCheck className="h-4 w-4 text-primary" /> جاهز للتحويل للفريق عند الحاجة</span>
              <span className="text-[11px] font-semibold text-muted-foreground">بيانات بإذن العميل</span>
            </div>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section id="channels" className="border-y border-border bg-secondary/20 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">القنوات</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">قابل عملاءك أينما كانوا</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              القنوات الجاهزة الآن تربطك بالوكيل مباشرة. القنوات القادمة ستظهر بوضوح بدون أي وعد سابق لأوانه.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {LANDING_CHANNELS.map(channel => (
              channel.ready ? (
                <button
                  key={channel.id}
                  type="button"
                  onClick={openDemo}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-right transition hover:border-primary/50 hover:bg-secondary/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <channel.icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{channel.nameAr}</span>
                    <span className="mt-0.5 block text-xs text-primary">جرّب المحادثة الآن</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <div
                  key={channel.id}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center gap-4 rounded-xl border border-dashed border-border bg-transparent p-5 opacity-60"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <channel.icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-muted-foreground">{channel.nameAr}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">قريباً</span>
                  </span>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">خطوات واضحة، بلا تعقيد</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">من أول زيارة إلى وكيل يعمل لخدمة عملائك.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
              ابدأ بخطوة واحدة. لا تحتاج إلى فريق تقني حتى ترى أول إجابة مبنية على معرفة نشاطك.
            </p>
            <Link href="/pricing" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              شاهد الباقات والتجربة المجانية <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {LANDING_WORKFLOW.map(step => (
              <article key={step.number} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <div className="flex w-11 shrink-0 flex-col items-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><step.icon className="h-5 w-5" /></span>
                  <span className="mt-2 text-[11px] font-semibold text-muted-foreground">{step.number}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{step.label}</h3>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground" dir="ltr">{step.tag}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="border-y border-border bg-secondary/20 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">مُصمم لطبيعة عملك</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">لا تبدأ من صفحة فارغة.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
              اختر قالباً يهيّئ الأهداف والقنوات وقاعدة المعرفة كنقطة بداية. يبقى كل شيء قابلاً للتعديل قبل الإطلاق.
            </p>
            <Button onClick={beginFree} variant="outline" className="mt-6 h-11 rounded-lg border-border px-5 font-semibold">
              استكشف القوالب <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {LANDING_VERTICALS.map((vertical, index) => (
              <button
                key={vertical.name}
                type="button"
                onClick={beginFree}
                className={`group flex w-full items-center gap-4 px-5 py-4 text-right transition hover:bg-secondary/50 ${index !== LANDING_VERTICALS.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><vertical.icon className="h-4.5 w-4.5" /></span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{vertical.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{vertical.outcome}</span>
                </span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">التجربة المجانية</span>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">14 يوماً · بلا بطاقة</span>
            </div>
            <h2 className="mt-6 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">اختبر أول محادثة قبل أن تربط أي قناة حية.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              أنشئ مساحة عملك، أضف موقعك، وجرّب الوكيل. عندما تصبح جاهزاً، اختر الباقة المناسبة وفعّل قنواتك.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={beginFree} size="lg" className="h-13 rounded-lg px-6 text-base font-semibold">
                ابدأ التجربة المجانية <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
              <Link href="/pricing" className="inline-flex h-13 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-semibold">
                قارن الباقات <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <aside className="rounded-2xl border border-border bg-secondary/30 p-7">
            <LockKeyhole className="h-6 w-6 text-primary" />
            <h3 className="mt-5 text-lg font-semibold">ثقة قبل الإطلاق</h3>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <p className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> عزل بيانات ومحادثات كل شركة داخل مساحة عملها.</p>
              <p className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> طلب موافقة قبل جمع بيانات التواصل عند تفعيلها في إعدادات الخصوصية.</p>
              <p className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> ربط WhatsApp الذاتي جاهز تقنياً ويُفتح للعملاء بعد اكتمال مراجعة Meta.</p>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <NeonMark />
          <span>Neon AI Agent Platform · Arabic-first customer automation</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-foreground">الأسعار</Link>
            <Link href="/login" className="hover:text-foreground">تسجيل الدخول</Link>
            <a href={`mailto:${NEON_CONTACT_EMAIL}`} className="hover:text-foreground">تواصل معنا</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
