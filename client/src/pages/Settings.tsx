import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Check, LockKeyhole, Mail, ShieldCheck, SlidersHorizontal, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const utils = trpc.useUtils();
  const dataPolicyQuery = trpc.workspace.dataPolicy.useQuery();
  const [retentionDays, setRetentionDays] = useState(90);
  const [requireConsent, setRequireConsent] = useState(true);
  const [allowModelTraining, setAllowModelTraining] = useState(false);
  const [deletionContactEmail, setDeletionContactEmail] = useState("");

  useEffect(() => {
    if (!dataPolicyQuery.data) return;
    setRetentionDays(dataPolicyQuery.data.retentionDays);
    setRequireConsent(dataPolicyQuery.data.requireConsent === 1);
    setAllowModelTraining(dataPolicyQuery.data.allowModelTraining === 1);
    setDeletionContactEmail(dataPolicyQuery.data.deletionContactEmail || "");
  }, [dataPolicyQuery.data]);

  const savePolicyMutation = trpc.workspace.saveDataPolicy.useMutation({
    onSuccess: async () => {
      await utils.workspace.dataPolicy.invalidate();
      toast.success("تم حفظ سياسة الخصوصية لمساحة العمل.");
    },
    onError: error => toast.error(error.message || "تعذر حفظ سياسة الخصوصية."),
  });

  const savePolicy = () => savePolicyMutation.mutate({ retentionDays, requireConsent, allowModelTraining, deletionContactEmail });

  return <div className="mx-auto max-w-[1100px] space-y-7 pb-12" dir="rtl">
    <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80" dir="ltr">Workspace / 06</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">الإعدادات <span className="text-slate-500">/ Settings</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">إعدادات مساحة العمل لا تنتقل بين الشركات. اضبط الخصوصية والاحتفاظ بالمحادثات بما يناسب خدمتك قبل تشغيل القنوات الحية.</p></header>

    <Card className="border-lime-300/20 bg-gradient-to-br from-lime-300/[0.06] to-[#0b1728]/90"><CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-white/10 pb-5"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300"><ShieldCheck className="h-5 w-5" /></div><div><CardTitle className="text-base text-white">مركز الخصوصية والامتثال</CardTitle><p className="mt-1 text-xs leading-5 text-slate-400">ضوابط تشغيلية لمساحة عملك: الاحتفاظ بالبيانات، موافقة العميل، ومسار طلب الحذف. راجع متطلبات نشاطك والبلد الذي تعمل فيه مع مستشارك القانوني عند الحاجة.</p></div></div><Badge className="border-lime-300/20 bg-lime-300/10 text-lime-200">إعدادات محفوظة لكل شركة</Badge></CardHeader><CardContent className="space-y-6 p-6">{dataPolicyQuery.isLoading ? <p className="text-sm text-slate-400">جارٍ تحميل سياسة البيانات...</p> : <><div className="grid gap-5 md:grid-cols-2"><label className="space-y-2"><span className="text-xs font-medium text-slate-300">مدة الاحتفاظ بالمحادثات (بالأيام)</span><Input type="number" min={7} max={730} value={retentionDays} onChange={event => setRetentionDays(Math.max(7, Math.min(730, Number(event.target.value) || 7)))} className="border-white/10 bg-white/[0.04] text-white" /><p className="text-[11px] leading-5 text-slate-500">من 7 إلى 730 يوماً. هذا إعداد سياسة مسجل، ولا يحذف البيانات التاريخية تلقائياً بعد.</p></label><label className="space-y-2"><span className="text-xs font-medium text-slate-300">بريد استقبال طلبات الحذف أو الخصوصية</span><div className="relative"><Mail className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" /><Input type="email" dir="ltr" value={deletionContactEmail} onChange={event => setDeletionContactEmail(event.target.value)} placeholder="privacy@yourcompany.com" className="border-white/10 bg-white/[0.04] pr-10 text-white" /></div><p className="text-[11px] leading-5 text-slate-500">يظهر كجهة مسؤولية داخل سياسة مساحة العمل؛ لا يُعرض للعميل في الودجت تلقائياً.</p></label></div><div className="grid gap-3 md:grid-cols-2"><button type="button" onClick={() => setRequireConsent(value => !value)} className={`rounded-2xl border p-4 text-right transition ${requireConsent ? "border-cyan-300/35 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.03]"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${requireConsent ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span><span><span className="block text-sm font-semibold text-white">طلب موافقة قبل جمع بيانات التواصل</span><span className="mt-1 block text-xs leading-5 text-slate-400">يوجّه الوكيل لطلب موافقة صريحة عندما يجمع بيانات متابعة العميل.</span></span></div></button><button type="button" onClick={() => setAllowModelTraining(value => !value)} className={`rounded-2xl border p-4 text-right transition ${allowModelTraining ? "border-amber-300/35 bg-amber-300/[0.08]" : "border-white/10 bg-white/[0.03]"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${allowModelTraining ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span><span><span className="block text-sm font-semibold text-white">السماح باستخدام بيانات الخدمة لتحسين النماذج</span><span className="mt-1 block text-xs leading-5 text-slate-400">معطل افتراضياً. فعّله فقط بعد التأكد من أن لديك أساساً وموافقة مناسبين.</span></span></div></button></div><div className="flex flex-col justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-slate-500">لا تمثل هذه الشاشة استشارة قانونية؛ إنها مركز تشغيلي لتوثيق إعدادات الخصوصية داخل Neon.</p><Button onClick={savePolicy} disabled={savePolicyMutation.isPending} className="rounded-xl bg-lime-300 text-slate-950 hover:bg-lime-200">{savePolicyMutation.isPending ? "جارٍ الحفظ..." : "حفظ سياسة الخصوصية"}</Button></div></>}</CardContent></Card>

    <div className="grid gap-5 md:grid-cols-2"><Card className="border-white/10 bg-[#0b1728]/90"><CardHeader className="border-b border-white/10 pb-5"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-lime-300" /><div><CardTitle className="text-base text-white">عزل البيانات / Isolation</CardTitle><p className="mt-1 text-xs text-slate-400">حواجز التطبيق الحالية لمساحتك.</p></div></div></CardHeader><CardContent className="space-y-3 p-5">{["كل استعلامات الوكلاء مرتبطة بـ tenantId", "المحادثات وقاعدة المعرفة لا تُعرض خارج المساحة", "تسجيل الدخول مطلوب للوحة التحكم", "الودجت يعرّف الوكيل المحدد فقط"].map(item => <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-xs text-slate-300"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />{item}</div>)}</CardContent></Card><Card className="border-white/10 bg-[#0b1728]/90"><CardHeader className="border-b border-white/10 pb-5"><div className="flex items-center gap-3"><Webhook className="h-5 w-5 text-cyan-300" /><div><CardTitle className="text-base text-white">أمان التكاملات</CardTitle><p className="mt-1 text-xs text-slate-400">لا نضع مفاتيح القنوات داخل الواجهة.</p></div></div></CardHeader><CardContent className="space-y-4 p-5"><p className="text-sm leading-6 text-slate-400">عند جاهزية القناة الرسمية، تُحفظ الأسرار في بيئة الخادم وتُستخدم للتحقق من Webhooks وإرسال الردود. لا تعرضها في كود الودجت أو المتصفح.</p><div className="flex items-center justify-between rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-3"><span className="text-xs text-amber-100">WhatsApp Business API</span><Badge className="border-amber-300/20 bg-transparent text-[10px] text-amber-200">يتطلب بياناتك</Badge></div><div className="flex items-center justify-between rounded-xl border border-white/[0.08] p-3"><span className="text-xs text-slate-300">LLM gateway</span><Badge className="border-lime-300/20 bg-lime-300/10 text-[10px] text-lime-200">مُدار</Badge></div></CardContent></Card></div>

    <Card className="border-white/10 bg-[#0b1728]/90"><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-300"><SlidersHorizontal className="h-5 w-5" /></div><div className="flex-1"><p className="text-sm font-medium text-white">إعدادات إضافية لمساحة العمل</p><p className="mt-1 text-xs text-slate-500">تستطيع إدارة القنوات والوكلاء والفريق من الأقسام المخصصة لها داخل Neon.</p></div></CardContent></Card>
  </div>;
}
