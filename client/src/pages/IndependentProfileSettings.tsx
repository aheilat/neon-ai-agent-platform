import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIndependentSupabaseBrowserClient } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, LogOut, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export function profileErrorMessage(reason: unknown, fallback: string) {
  const message = reason instanceof Error ? reason.message : "";
  if (/same password|password.*weak|password.*should/i.test(message)) return "اختر كلمة مرور مختلفة وأقوى من كلمة المرور الحالية.";
  if (/session|not authenticated|jwt/i.test(message)) return "انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم حاول.";
  return message || fallback;
}

export default function IndependentProfileSettings() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const client = getIndependentSupabaseBrowserClient();
      if (!client) {
        setError("إعدادات المصادقة المستقلة غير مكتملة حالياً.");
        setLoading(false);
        return;
      }
      try {
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          setLocation("/login");
          return;
        }
        if (!active) return;
        const metadata = data.session.user.user_metadata ?? {};
        setEmail(data.session.user.email ?? "");
        setFullName(typeof metadata.full_name === "string" ? metadata.full_name : "");
        setPhone(typeof metadata.phone === "string" ? metadata.phone : "");
      } catch (reason) {
        if (active) setError(profileErrorMessage(reason, "تعذر تحميل بيانات الملف الشخصي."));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, [setLocation]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const client = getIndependentSupabaseBrowserClient();
    if (!client) return setError("إعدادات المصادقة المستقلة غير مكتملة حالياً.");
    setSavingProfile(true);
    setMessage(null);
    setError(null);
    try {
      const { error: updateError } = await client.auth.updateUser({ data: { full_name: fullName.trim(), phone: phone.trim() } });
      if (updateError) throw updateError;
      setMessage("تم حفظ معلوماتك الشخصية بنجاح.");
    } catch (reason) {
      setError(profileErrorMessage(reason, "تعذر حفظ معلوماتك الشخصية."));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) return setError("يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.");
    if (newPassword !== confirmPassword) return setError("كلمتا المرور غير متطابقتين.");
    const client = getIndependentSupabaseBrowserClient();
    if (!client) return setError("إعدادات المصادقة المستقلة غير مكتملة حالياً.");
    setChangingPassword(true);
    setMessage(null);
    setError(null);
    try {
      const { error: updateError } = await client.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setNewPassword("");
      setConfirmPassword("");
      setMessage("تم تغيير كلمة المرور بنجاح.");
    } catch (reason) {
      setError(profileErrorMessage(reason, "تعذر تغيير كلمة المرور."));
    } finally {
      setChangingPassword(false);
    }
  };

  const signOut = async () => {
    await getIndependentSupabaseBrowserClient()?.auth.signOut();
    setLocation("/login");
  };

  if (loading) return <main className="min-h-screen bg-[#07111f] p-6 text-center text-slate-300" dir="rtl">جارٍ تحميل ملفك الشخصي…</main>;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-5 text-white sm:px-8 sm:py-8" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0b1728] p-4 shadow-xl shadow-black/10 sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><UserRound className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">Neon profile</p><h1 className="text-xl font-bold">إعدادات ملفك الشخصي</h1></div></div>
          <div className="flex gap-2"><Link href="/start" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold text-slate-200 hover:bg-white/10"><ArrowLeft className="h-4 w-4" />مساحة العمل</Link><Button type="button" variant="outline" onClick={() => void signOut()} className="border-white/15 text-white hover:bg-white/10"><LogOut className="ml-2 h-4 w-4" />خروج</Button></div>
        </header>

        {error && <p role="alert" className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-4 text-sm leading-6 text-rose-100">{error}</p>}
        {message && <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-lime-300/25 bg-lime-300/10 p-4 text-sm leading-6 text-lime-100"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</p>}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <form onSubmit={saveProfile} className="rounded-3xl border border-white/10 bg-[#0b1728] p-5 sm:p-6">
            <div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-bold">معلوماتك الشخصية</h2></div>
            <p className="mt-2 text-sm leading-6 text-slate-400">حدّث البيانات التي تظهر داخل مساحة عملك. البريد الإلكتروني مرتبط بحسابك ولا يمكن تغييره من هذه الصفحة.</p>
            <label className="mt-5 block text-sm font-bold">البريد الإلكتروني<Input value={email} readOnly dir="ltr" className="mt-2 h-12 border-white/15 bg-slate-950/50 text-white/60" /></label>
            <label className="mt-4 block text-sm font-bold">الاسم الكامل<Input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="مثال: أحمد هيلات" className="mt-2 h-12 border-white/15 bg-slate-950/50 text-white placeholder:text-slate-500" /></label>
            <label className="mt-4 block text-sm font-bold">رقم الهاتف<Input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" dir="ltr" placeholder="+962 7…" className="mt-2 h-12 border-white/15 bg-slate-950/50 text-white placeholder:text-slate-500" /></label>
            <Button type="submit" disabled={savingProfile} className="mt-5 h-12 w-full bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200">{savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : "حفظ المعلومات"}</Button>
          </form>

          <form onSubmit={changePassword} className="rounded-3xl border border-white/10 bg-[#0b1728] p-5 sm:p-6">
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-lime-200" /><h2 className="text-lg font-bold">تغيير كلمة المرور</h2></div>
            <p className="mt-2 text-sm leading-6 text-slate-400">استخدم كلمة مرور لا تقل عن 8 أحرف. سيتم تحديث كلمة المرور للحساب الحالي بعد التحقق من الجلسة.</p>
            <label className="mt-5 block text-sm font-bold">كلمة المرور الجديدة<Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} type="password" autoComplete="new-password" placeholder="8 أحرف على الأقل" className="mt-2 h-12 border-white/15 bg-slate-950/50 text-white placeholder:text-slate-500" /></label>
            <label className="mt-4 block text-sm font-bold">تأكيد كلمة المرور<Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} type="password" autoComplete="new-password" placeholder="أعد كتابة كلمة المرور" className="mt-2 h-12 border-white/15 bg-slate-950/50 text-white placeholder:text-slate-500" /></label>
            <Button type="submit" disabled={changingPassword} className="mt-5 h-12 w-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200">{changingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : "تغيير كلمة المرور"}</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
