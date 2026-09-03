import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startLogin } from "@/const";
import { resendIndependentConfirmationEmail, sendIndependentPasswordReset, signInWithIndependentGoogle, signInToIndependentNeon, signUpForIndependentNeon, updateIndependentPassword } from "@/lib/independentAuth";
import { hasIndependentSupabaseBrowserConfig } from "@/lib/supabase";
import { ArrowLeft, Bot, Check, Chrome, LockKeyhole, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

function readableAuthError(reason: unknown, fallback: string) {
  const message = reason instanceof Error ? reason.message : "";
  if (/provider.*not enabled|unsupported provider/i.test(message)) return "تسجيل الدخول عبر Google غير مفعّل في Supabase حالياً. فعّل Google من Authentication ثم أعد المحاولة.";
  if (/email.*not confirmed/i.test(message)) return "أكد بريدك الإلكتروني أولاً من الرابط المرسل، ثم سجّل الدخول مرة أخرى.";
  if (/rate limit|too many requests/i.test(message)) return "تم تجاوز عدد المحاولات المسموح. انتظر قليلاً ثم حاول مرة أخرى.";
  return message || fallback;
}

export function getAccessCopy(isRegister: boolean) {
  if (isRegister) {
    return {
      heading: "أنشئ مساحة عملك في Neon",
      description: "ابدأ بناء وكيلك الأول مجاناً، ثم أضف المعرفة والقنوات عندما تكون جاهزاً.",
      action: "إنشاء حسابي وبدء التجربة",
      switchLead: "لديك مساحة عمل بالفعل؟",
      switchAction: "تسجيل الدخول",
      switchPath: "/login",
    };
  }

  return {
    heading: "أهلاً بعودتك إلى Neon",
    description: "سجّل الدخول للعودة إلى وكلائك ومحادثاتك وقنواتك وفوترة مساحة عملك.",
    action: "تسجيل الدخول والمتابعة",
    switchLead: "جديد على Neon؟",
    switchAction: "أنشئ حساباً مجاناً",
    switchPath: "/register",
  };
}

export default function Access() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const isRegister = location === "/register";
  const isReset = location === "/reset-password";
  const isIndependentRuntime = hasIndependentSupabaseBrowserConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isIndependentRuntime || !isAuthenticated || isReset) return;
    const intentRaw = localStorage.getItem("neon-checkout-intent");
    if (intentRaw) {
      localStorage.removeItem("neon-checkout-intent");
      try {
        const intent = JSON.parse(intentRaw) as { plan: string; cycle: string };
        setLocation(`/billing?plan=${encodeURIComponent(intent.plan)}&cycle=${encodeURIComponent(intent.cycle)}`);
        return;
      } catch {
        // Fall through to the guided first-agent flow if a stale intent is malformed.
      }
    }
    setLocation("/start");
  }, [isAuthenticated, isIndependentRuntime, isReset, setLocation]);

  if (isAuthenticated && !isReset) return null;

  const copy = isReset ? {
    heading: resetRequested ? "أنشئ كلمة مرور جديدة" : "استعادة كلمة المرور",
    description: resetRequested ? "اكتب كلمة مرور جديدة لحماية مساحة عملك، ثم سجّل الدخول للمتابعة." : "أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لاستعادة كلمة المرور.",
    action: resetRequested ? "حفظ كلمة المرور" : "إرسال رابط الاستعادة",
    switchLead: "تذكرت كلمة المرور؟",
    switchAction: "العودة لتسجيل الدخول",
    switchPath: "/login",
  } : getAccessCopy(isRegister);

  const submitIndependentAccess = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setConfirmationMessage(null);
    setSubmitting(true);
    try {
      if (isReset) {
        await updateIndependentPassword(password);
        setConfirmationMessage("تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
        setPassword("");
      } else if (isRegister) {
        const result = await signUpForIndependentNeon(email, password, window.location.origin);
        if (result.confirmationRequired) {
          setConfirmationMessage("تحقق من بريدك الإلكتروني ثم افتح رابط التأكيد للمتابعة إلى مساحة العمل.");
        } else {
          setLocation("/external");
        }
      } else {
        await signInToIndependentNeon(email, password);
        setLocation("/external");
      }
    } catch (reason) {
      setFormError(readableAuthError(reason, "تعذرت عملية المصادقة. حاول مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email.trim()) {
      setFormError("اكتب بريدك الإلكتروني أولاً لاستلام رابط الاستعادة.");
      return;
    }
    setFormError(null);
    setConfirmationMessage(null);
    setSubmitting(true);
    try {
      await sendIndependentPasswordReset(email.trim(), window.location.origin);
      setResetRequested(true);
      setConfirmationMessage("إذا كان البريد مسجلاً، سيصلك رابط استعادة كلمة المرور. تحقق من الوارد والرسائل غير المرغوب فيها، ثم افتح الرابط للمتابعة.");
    } catch (reason) {
      setFormError(readableAuthError(reason, "تعذر إرسال رابط الاستعادة الآن."));
    } finally {
      setSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email.trim()) return setFormError("اكتب بريد التسجيل أولاً.");
    setFormError(null);
    setSubmitting(true);
    try {
      await resendIndependentConfirmationEmail(email.trim(), window.location.origin);
      setConfirmationMessage("تمت إعادة إرسال رسالة التأكيد. تحقق من الوارد والرسائل غير المرغوب فيها.");
    } catch (reason) {
      setFormError(readableAuthError(reason, "تعذر إعادة إرسال رسالة التأكيد الآن."));
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await signInWithIndependentGoogle(window.location.origin);
    } catch (reason) {
      setFormError(readableAuthError(reason, "تسجيل الدخول عبر Google غير متاح حالياً. فعّله من Supabase ثم حاول مجدداً."));
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#07111f] text-white lg:grid-cols-[1.04fr_0.96fr]" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(103,232,249,0.16),transparent_26rem),radial-gradient(circle_at_15%_86%,rgba(190,242,100,0.09),transparent_25rem)]" />
      <section className="relative z-10 flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> العودة إلى الصفحة الرئيسية</Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.25)]"><Bot className="h-6 w-6" /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Neon Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{copy.heading}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">{copy.description}</p>
          <div className="mt-8 rounded-2xl border border-white/[0.09] bg-white/[0.045] p-4">
            <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" /><div><p className="text-sm font-bold text-white">دخول آمن إلى مساحة عملك داخل Neon</p><p className="mt-1 text-xs leading-6 text-slate-400">نستخدم Supabase لحماية تسجيل الدخول وإنشاء أو استعادة مساحة عملك وحفظ وكلائك وبياناتك بصورة محمية.</p></div></div>
          </div>
          {isIndependentRuntime ? <form className="mt-6 space-y-3" onSubmit={isReset && !resetRequested ? (event) => { event.preventDefault(); void requestPasswordReset(); } : submitIndependentAccess}>
            {(!isReset || !resetRequested) && <Input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="البريد الإلكتروني" className="h-12 border-white/15 bg-slate-950/50 text-white placeholder:text-slate-500" />}
            {(!isReset || resetRequested) && <Input required type="password" minLength={8} autoComplete={isRegister || isReset ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder={isReset ? "كلمة المرور الجديدة (8 أحرف على الأقل)" : "كلمة المرور (8 أحرف على الأقل)"} className="h-12 border-white/15 bg-slate-950/50 text-white placeholder:text-slate-500" />}
            {formError && <p className="text-sm leading-6 text-rose-200">{formError}</p>}{confirmationMessage && <p className="text-sm leading-6 text-lime-200">{confirmationMessage}</p>}
            {isRegister && confirmationMessage && <button type="button" onClick={() => void resendConfirmation()} disabled={submitting} className="w-full text-sm font-bold text-cyan-200 hover:text-cyan-100 disabled:opacity-50">إعادة إرسال رسالة التأكيد</button>}
            <Button disabled={submitting} type="submit" size="lg" className="h-14 w-full rounded-2xl bg-gradient-to-l from-cyan-300 to-lime-300 text-base font-bold text-slate-950 hover:from-cyan-200 hover:to-lime-200">{submitting ? "جارٍ المتابعة..." : copy.action}<ArrowLeft className="mr-2 h-5 w-5" /></Button>
            {!isRegister && !isReset && <div className="flex items-center justify-between gap-3 text-sm"><button type="button" onClick={() => setLocation("/reset-password")} className="font-bold text-cyan-200 hover:text-cyan-100">نسيت كلمة المرور؟</button><span className="text-slate-500">أو</span></div>}
            {!isRegister && !isReset && <Button type="button" variant="outline" disabled={submitting} onClick={() => void signInWithGoogle()} className="h-12 w-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10"><Chrome className="ml-2 h-4 w-4" />المتابعة باستخدام Google</Button>}
          </form> : <Button disabled={loading} onClick={() => { if (!localStorage.getItem("neon-checkout-intent")) localStorage.setItem("neon-after-auth", "/start"); startLogin(); }} size="lg" className="mt-6 h-14 w-full rounded-2xl bg-gradient-to-l from-cyan-300 to-lime-300 text-base font-bold text-slate-950 hover:from-cyan-200 hover:to-lime-200">{loading ? "جارٍ التحقق..." : copy.action}<ArrowLeft className="mr-2 h-5 w-5" /></Button>}
          <p className="mt-5 text-center text-sm text-slate-400">{copy.switchLead} <Link href={copy.switchPath} className="font-bold text-cyan-200 hover:text-cyan-100">{copy.switchAction}</Link></p>
        </div>
      </section>
      <aside className="relative z-10 hidden border-r border-white/[0.07] bg-[#0a1828]/70 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5" dir="ltr"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><span className="text-sm font-bold tracking-[0.12em]">NEON <span className="font-medium text-slate-400">AI</span></span></div>
        <div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Sparkles className="h-6 w-6" /></span><h2 className="mt-6 max-w-sm text-4xl font-semibold leading-tight tracking-[-0.04em]">اجعل كل استفسار بداية علاقة أفضل مع عميلك.</h2><div className="mt-8 space-y-4">{["ابنِ الوكيل من موقع شركتك", "ابدأ بلا بطاقة دفع", "فعّل WhatsApp والموقع عند الجاهزية"].map(item => <p key={item} className="flex items-center gap-3 text-sm text-slate-300"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-300/15 text-lime-300"><Check className="h-3.5 w-3.5" /></span>{item}</p>)}</div></div>
        <p className="text-xs text-slate-500">Arabic-first AI agents for customer conversations.</p>
      </aside>
    </main>
  );
}
