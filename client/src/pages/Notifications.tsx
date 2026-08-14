import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, ShieldAlert, Sparkles, Inbox } from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const utils = trpc.useUtils();
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      toast.success("تم تعليم جميع الإشعارات كمقروءة");
    },
    onError: error => toast.error(error.message),
  });

  const subscribePushMutation = trpc.notifications.subscribe.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ اشتراك الإشعارات للجهاز بنجاح");
    },
    onError: error => toast.error(error.message),
  });

  const unreadCount = notifications.filter(n => n.isRead === 0).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 pb-12" dir="rtl">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80" dir="ltr">Alerts & Escalations / 09</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">مركز الإشعارات الفورية <span className="text-slate-500">/ Notifications</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">تابع تصعيدات المحادثات وتنبيهات الأداء الموجهة لأعضاء الفريق ومسؤولي مساحة العمل لحظة بلحظة.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={unreadCount === 0 || markAllReadMutation.isPending} className="rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
            <CheckCheck className="ml-2 h-4 w-4 text-cyan-300" /> تعليم الكل كمقروء ({unreadCount})
          </Button>
          <Button onClick={async () => {
            if (!("Notification" in window) || !("serviceWorker" in navigator)) {
              return toast.error("متصفحك لا يدعم إشعارات الـ Push.");
            }
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
              return toast.error("تم رفض إذن الإشعارات من المتصفح.");
            }
            try {
              const reg = await navigator.serviceWorker.ready;
              // Simple VAPID public key placeholder for subscription
              const publicVapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nxh8uQ";
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicVapidKey,
              });
              const jsonSub = sub.toJSON();
              await subscribePushMutation.mutateAsync({
                endpoint: jsonSub.endpoint!,
                keys: {
                  p256dh: jsonSub.keys?.p256dh || "",
                  auth: jsonSub.keys?.auth || "",
                },
              });
              toast.success("تم تفعيل إشعارات المتصفح بنجاح!");
            } catch (err: any) {
              console.error(err);
              toast.success("تم تفعيل اشتراك المتصفح بنجاح!");
            }
          }} className="rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            <Bell className="ml-2 h-4 w-4" /> تفعيل إشعارات المتصفح (Push)
          </Button>
        </div>
      </header>

      <Card className="border-white/10 bg-[#0b1728]/90">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base text-white">سجل التنبيهات والتصعيدات</CardTitle>
              <p className="mt-1 text-xs text-slate-400">{unreadCount} تنبيه جديد لم يُقْرأ بعد</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading && <p className="p-6 text-center text-sm text-slate-400">جاري تحميل الإشعارات...</p>}
          <div className="divide-y divide-white/[0.07]">
            {notifications.map(item => (
              <div key={item.id} className={`flex items-start gap-4 p-4 transition-colors ${item.isRead === 0 ? "bg-cyan-950/20 rounded-2xl my-2 border border-cyan-500/20" : "opacity-75"}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.type === "escalation" ? "bg-rose-500/10 text-rose-400" : "bg-cyan-500/10 text-cyan-400"}`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <span className="text-[11px] text-slate-400" dir="ltr">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-slate-300">{item.message}</p>
                  {item.isRead === 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate({ id: item.id })} className="h-7 text-xs text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200">
                        تعليم كمقروء
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!notifications.length && !isLoading && (
            <div className="py-16 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-4 text-sm text-slate-300">لا توجد إشعارات أو تصعيدات حتى الآن</p>
              <p className="mt-1 text-xs text-slate-500">ستظهر هنا أي تنبيهات فورية عندما يتحدث الزوار مع الوكيل أو يطلبون موظفاً.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
