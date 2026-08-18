import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BILLING_PLANS, TRIAL_PLAN, type BillingCycle, type PaidPlanId } from "@shared/billingPlans";
import { ArrowLeft, Bot, Check, ChevronLeft, CircleHelp, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const cycleLabel: Record<BillingCycle, string> = { monthly: "شهري", yearly: "سنوي" };

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [cycle, setCycle] = useState<BillingCycle>("yearly");

  const beginTrial = () => setLocation(isAuthenticated ? "/start" : "/register");
  const choosePaidPlan = (plan: PaidPlanId) => {
    const intent = { plan, cycle };
    localStorage.setItem("neon-checkout-intent", JSON.stringify(intent));
    setLocation(isAuthenticated ? `/billing?plan=${plan}&cycle=${cycle}` : "/register");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.17),transparent_31rem),radial-gradient(circle_at_15%_35%,rgba(190,242,100,0.09),transparent_20rem)]" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> العودة للرئيسية</Link>
        <Link href="/" className="inline-flex items-center gap-2" dir="ltr"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><span className="text-sm font-bold tracking-[0.12em]">NEON <span className="font-medium text-slate-400">AI</span></span></Link>
        <Link href="/login" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">تسجيل الدخول</Link>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Simple, clear pricing</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">ابدأ مجاناً، ثم اختر ما يناسب نموك.</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300">جميع الباقات تبدأ من مساحة عمل واحدة. يمكنك الترقية بعد اختبار وكيلك الأول، وتظهر حدود الاستخدام بوضوح داخل لوحة العميل.</p></div>
        <div className="mx-auto mt-9 flex w-fit items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5"><button onClick={() => setCycle("monthly")} className={`rounded-xl px-4 py-2 text-sm font-bold ${cycle === "monthly" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}>شهري</button><button onClick={() => setCycle("yearly")} className={`rounded-xl px-4 py-2 text-sm font-bold ${cycle === "yearly" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}>سنوي <span className="mr-1 text-[10px] text-emerald-500">وفّر حتى 20%</span></button></div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article className="flex flex-col rounded-[26px] border border-cyan-300/30 bg-gradient-to-b from-cyan-300/12 to-white/[0.025] p-6 shadow-[0_20px_55px_rgba(8,145,178,0.10)]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950"><Sparkles className="h-5 w-5" /></span><h2 className="mt-6 text-xl font-bold">{TRIAL_PLAN.name}</h2><p className="mt-3 min-h-14 text-sm leading-6 text-slate-300">{TRIAL_PLAN.description}</p><div className="mt-6"><span className="text-4xl font-semibold">0</span><span className="mr-1 text-sm text-slate-400">ر.س</span><p className="mt-1 text-xs text-cyan-100">لمدة {TRIAL_PLAN.durationDays} يوماً · بلا بطاقة دفع</p></div><ul className="mt-7 space-y-3 border-t border-white/[0.08] pt-6">{TRIAL_PLAN.features.map(feature => <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-slate-200"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />{feature}</li>)}</ul><Button onClick={beginTrial} className="mt-8 h-12 rounded-xl bg-white text-slate-950 hover:bg-slate-100">ابدأ التجربة <ArrowLeft className="mr-2 h-4 w-4" /></Button></article>
          {BILLING_PLANS.map(plan => { const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice; return <article key={plan.id} className={`relative flex flex-col rounded-[26px] border p-6 ${plan.highlighted ? "border-lime-300/55 bg-lime-300/[0.07] shadow-[0_20px_55px_rgba(190,242,100,0.08)]" : "border-white/[0.09] bg-white/[0.025]"}`}>{plan.highlighted && <span className="absolute -top-3 right-5 rounded-full bg-lime-300 px-3 py-1 text-[10px] font-black text-slate-950">الأكثر اختياراً</span>}<h2 className="text-xl font-bold">{plan.shortName}</h2><p className="mt-1 text-xs font-semibold text-cyan-200" dir="ltr">{plan.name}</p><p className="mt-4 min-h-14 text-sm leading-6 text-slate-300">{plan.description}</p><div className="mt-6"><span className="text-4xl font-semibold">{price.toLocaleString("ar-SA")}</span><span className="mr-1 text-sm text-slate-400">ر.س</span><p className="mt-1 text-xs text-slate-400">لكل {cycleLabel[cycle] === "شهري" ? "شهر" : "سنة"} · {cycle === "yearly" ? "الدفع السنوي مقدمًا" : "يمكن الإلغاء لاحقاً"}</p></div><ul className="mt-7 space-y-3 border-t border-white/[0.08] pt-6">{plan.features.map(feature => <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-slate-200"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />{feature}</li>)}</ul><Button onClick={() => choosePaidPlan(plan.id)} className={`mt-8 h-12 rounded-xl ${plan.highlighted ? "bg-lime-300 text-slate-950 hover:bg-lime-200" : "bg-white/[0.10] text-white hover:bg-white/[0.16]"}`}>اختر باقة {plan.shortName} <ArrowLeft className="mr-2 h-4 w-4" /></Button></article>; })}
        </div>
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><CircleHelp className="h-5 w-5 text-cyan-300" />هل تحتاج خطة خاصة، حجماً أكبر، أو متطلبات تكامل محددة؟</span><a href="mailto:hello@neon.ai" className="inline-flex items-center gap-1 font-bold text-cyan-200 hover:text-cyan-100">تحدث إلى Neon <ChevronLeft className="h-4 w-4" /></a></div>
      </section>
    </main>
  );
}
