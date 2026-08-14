import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, ShieldCheck, Sliders } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function NotificationSettings() {
  const utils = trpc.useUtils();
  const { data: prefs, isLoading } = trpc.notifications.getPreferences.useQuery();

  const [escalationPush, setEscalationPush] = useState(true);
  const [assignmentPush, setAssignmentPush] = useState(true);
  const [leadPush, setLeadPush] = useState(true);
  const [generalPush, setGeneralPush] = useState(true);

  useEffect(() => {
    if (prefs) {
      setEscalationPush(prefs.escalationPush === 1);
      setAssignmentPush(prefs.assignmentPush === 1);
      setLeadPush(prefs.leadPush === 1);
      setGeneralPush(prefs.generalPush === 1);
    }
  }, [prefs]);

  const updateMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: async () => {
      await utils.notifications.getPreferences.invalidate();
      toast.success("تم حفظ تفضيلات الإشعارات بنجاح");
    },
    onError: error => toast.error(error.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      escalationPush,
      assignmentPush,
      leadPush,
      generalPush,
    });
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-7 pb-12" dir="rtl">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80" dir="ltr">Push Preferences / 10</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">إعدادات تفضيلات إشعارات المتصفح <span className="text-slate-500">/ Settings</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">حدد بالضبط أنواع التنبيهات والأحداث التي ترغب بتلقيها فورياً عبر متصفحك أثناء العمل أو خارجه.</p>
        </div>
      </header>

      <Card className="border-white/10 bg-[#0b1728]/90">
        <CardHeader className="border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base text-white">تخصيص قنوات التنبيه</CardTitle>
              <p className="mt-1 text-xs text-slate-400">تحكم كامل في أنواع الرسائل الفورية</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading && <p className="p-6 text-center text-sm text-slate-400">جاري تحميل التفضيلات...</p>}
          {!isLoading && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer transition-colors hover:bg-white/[0.04]">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white">تصعيدات المحادثات (Escalations)</span>
                    <p className="text-xs text-slate-400">تنبيه فوري عندما يطلب الزائر التحدث لموظف أو يتم تصعيد المحادثة.</p>
                  </div>
                  <input type="checkbox" checked={escalationPush} onChange={e => setEscalationPush(e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-0" />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer transition-colors hover:bg-white/[0.04]">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white">تعيينات الوكلاء والقنوات (Assignments)</span>
                    <p className="text-xs text-slate-400">تنبيه عند تعيين وكيل ذكاء اصطناعي أو قناة مثل واتساب إليك.</p>
                  </div>
                  <input type="checkbox" checked={assignmentPush} onChange={e => setAssignmentPush(e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-0" />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer transition-colors hover:bg-white/[0.04]">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white">العملاء المحتملين الجدد (Leads)</span>
                    <p className="text-xs text-slate-400">تنبيه عند التقاط بيانات زائر مهتم أو عميل محتمل جديد.</p>
                  </div>
                  <input type="checkbox" checked={leadPush} onChange={e => setLeadPush(e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-0" />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer transition-colors hover:bg-white/[0.04]">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white">التنبيهات والإعلانات العامة (General)</span>
                    <p className="text-xs text-slate-400">تنبيهات النظام والتحديثات الصادرة عن مساحة العمل.</p>
                  </div>
                  <input type="checkbox" checked={generalPush} onChange={e => setGeneralPush(e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-0" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button type="submit" disabled={updateMutation.isPending} className="rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                  حفظ التفضيلات
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
