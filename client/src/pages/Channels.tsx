import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Check, Copy, ExternalLink, Globe2, Instagram, Loader2, MessageCircle, PhoneCall, Radio, RefreshCw, Send, Settings2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const channels = [
  { id: "web" as const, name: "Live chat widget", nameAr: "ودجت الموقع", description: "أضف محادثة ذكية لأي موقع بسطر واحد.", icon: Globe2, tint: "text-cyan-300", bg: "bg-cyan-300/10", ready: true },
  { id: "whatsapp" as const, name: "WhatsApp Business", nameAr: "واتساب للأعمال", description: "اربط حساب Meta WhatsApp Business لاستقبال الرسائل والرد عليها من وكيلك.", icon: MessageCircle, tint: "text-lime-300", bg: "bg-lime-300/10", ready: true },
  { id: "messenger" as const, name: "Facebook Messenger", nameAr: "فيسبوك ماسنجر", description: "وحّد رسائل صفحاتك في صندوق واحد.", icon: Send, tint: "text-blue-300", bg: "bg-blue-300/10", ready: false },
  { id: "instagram" as const, name: "Instagram DMs", nameAr: "رسائل إنستغرام", description: "حوّل التفاعل إلى محادثات وفرص مؤهلة.", icon: Instagram, tint: "text-fuchsia-300", bg: "bg-fuchsia-300/10", ready: false },
  { id: "phone" as const, name: "Voice / Phone", nameAr: "الهاتف الصوتي", description: "تجهيز بوابة صوتية للتعامل مع المكالمات.", icon: PhoneCall, tint: "text-amber-300", bg: "bg-amber-300/10", ready: false },
];

type WhatsAppConfig = {
  phoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  displayPhoneNumber?: string;
  setupStatus?: "pending_webhook_verification" | "connected";
  lastWebhookAt?: string;
};

export default function Channels() {
  const utils = trpc.useUtils();
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const [agentId, setAgentId] = useState<number | undefined>();
  const [showWhatsAppSetup, setShowWhatsAppSetup] = useState(false);
  const [whatsAppForm, setWhatsAppForm] = useState({ phoneNumberId: "", whatsappBusinessAccountId: "", displayPhoneNumber: "" });
  useEffect(() => { if (!agentId && agents[0]) setAgentId(agents[0].id); }, [agents, agentId]);
  const { data: integrations = [] } = trpc.channels.list.useQuery({ agentId }, { enabled: Boolean(agentId) });
  const configureMutation = trpc.channels.configure.useMutation({ onSuccess: async () => { await utils.channels.list.invalidate(); toast.success("تم تحديث إعداد القناة"); }, onError: error => toast.error(error.message) });
  const configureWhatsAppMutation = trpc.channels.configureWhatsApp.useMutation({
    onSuccess: async () => { await utils.channels.list.invalidate(); setShowWhatsAppSetup(false); toast.success("تم حفظ بيانات واتساب. أكمل التحقق من Webhook في لوحة Meta."); },
    onError: error => toast.error(error.message),
  });

  const activeMap = useMemo(() => new Map(integrations.map(item => [item.channel, item.isActive === 1])), [integrations]);
  const whatsAppIntegration = integrations.find(item => item.channel === "whatsapp");
  const whatsAppConfig = (whatsAppIntegration?.configJson ?? {}) as WhatsAppConfig;
  const whatsAppConnected = Boolean(whatsAppIntegration?.isActive && whatsAppConfig.setupStatus === "connected");
  const webhookUrl = typeof window === "undefined" ? "/api/webhooks/whatsapp" : `${window.location.origin}/api/webhooks/whatsapp`;

  useEffect(() => {
    if (!showWhatsAppSetup) return;
    setWhatsAppForm({
      phoneNumberId: whatsAppConfig.phoneNumberId || "",
      whatsappBusinessAccountId: whatsAppConfig.whatsappBusinessAccountId || "",
      displayPhoneNumber: whatsAppConfig.displayPhoneNumber || "",
    });
  }, [showWhatsAppSetup, whatsAppConfig.phoneNumberId, whatsAppConfig.whatsappBusinessAccountId, whatsAppConfig.displayPhoneNumber]);

  const toggle = (channel: typeof channels[number]) => {
    if (!agentId) return toast.error("اختر وكيلاً أولاً");
    if (channel.id === "whatsapp") return setShowWhatsAppSetup(true);
    if (!channel.ready) return toast.info("هذه القناة تحتاج مزوداً رسمياً قبل تفعيلها.");
    configureMutation.mutate({ agentId, channel: channel.id, isActive: !activeMap.get(channel.id) });
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("تم نسخ رابط Webhook");
  };

  const saveWhatsAppSetup = () => {
    if (!agentId) return toast.error("اختر وكيلاً أولاً");
    configureWhatsAppMutation.mutate({ agentId, ...whatsAppForm });
  };

  return <div className="mx-auto max-w-[1400px] space-y-7 pb-12" dir="rtl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80" dir="ltr">Omnichannel / 04</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">القنوات <span className="text-slate-500">/ Channels</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">اجعل وكيلك حاضراً حيث يتواجد عميلك، مع تحكم واضح في حالة كل قناة وربطها بالوكيل المناسب.</p></div>
      <div className="flex items-center gap-3"><select value={agentId ?? ""} onChange={e => setAgentId(Number(e.target.value))} className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none"><option value="" className="bg-[#0b1728]">اختر الوكيل</option>{agents.map(agent => <option key={agent.id} value={agent.id} className="bg-[#0b1728]">{agent.name}</option>)}</select><Badge className="border-lime-300/20 bg-lime-300/10 px-3 py-2 text-lime-200">{integrations.filter(i => i.isActive).length} مفعّلة</Badge></div>
    </header>

    <div className="grid gap-4 lg:grid-cols-2">{channels.map(channel => {
      const active = activeMap.get(channel.id) ?? false;
      const isWhatsApp = channel.id === "whatsapp";
      const status = isWhatsApp ? (whatsAppConnected ? "متصل" : whatsAppConfig.phoneNumberId ? "بانتظار التحقق" : "غير متصل") : (active ? "Live" : channel.ready ? "Ready" : "يتطلب مزوداً");
      return <Card key={channel.id} className={`border-white/10 bg-[#0b1728]/90 transition ${active ? "shadow-lg shadow-cyan-950/20" : ""}`}><CardContent className="p-6"><div className="flex items-start gap-4"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${channel.bg} ${channel.tint}`}><channel.icon className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-white">{channel.nameAr}</h2><p className="mt-1 text-xs text-slate-500" dir="ltr">{channel.name}</p></div><Badge className={active ? "border-lime-300/20 bg-lime-300/10 text-lime-200" : isWhatsApp && whatsAppConfig.phoneNumberId ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.05] text-slate-400"}>{status}</Badge></div><p className="mt-4 text-sm leading-6 text-slate-400">{channel.description}</p>{isWhatsApp && whatsAppConfig.displayPhoneNumber && <p className="mt-2 text-xs text-lime-200">الرقم المرتبط: <span dir="ltr">{whatsAppConfig.displayPhoneNumber}</span></p>}<div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => toggle(channel)} disabled={configureMutation.isPending || configureWhatsAppMutation.isPending} className={active ? "rounded-xl bg-white/10 text-white hover:bg-white/15" : channel.ready ? "rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "rounded-xl bg-white/[0.06] text-slate-300 hover:bg-white/10"}>{isWhatsApp ? <><Settings2 className="ml-2 h-4 w-4" /> {whatsAppConnected ? "إدارة الربط" : "إعداد Meta WhatsApp"}</> : active ? <><Check className="ml-2 h-4 w-4" /> مفعّلة</> : channel.ready ? <><Radio className="ml-2 h-4 w-4" /> تفعيل</> : <><Settings2 className="ml-2 h-4 w-4" /> إعداد الربط</>}</Button>{!channel.ready && <Badge variant="outline" className="rounded-xl border-white/10 px-3 text-xs text-slate-500">يلزم مزود رسمي</Badge>}</div></div></div></CardContent></Card>;
    })}</div>

    <Card className="border-white/10 bg-[#0b1728]/90"><CardHeader className="flex flex-row items-center gap-3 border-b border-white/10 pb-5"><RefreshCw className="h-5 w-5 text-cyan-300" /><div><CardTitle className="text-base text-white">كيف تعمل القنوات الرسمية؟</CardTitle><p className="mt-1 text-xs text-slate-400">يستقبل الخادم الأحداث عبر Webhooks موثقة، ثم يمررها إلى الوكيل مع الحفاظ على مساحة العمل.</p></div></CardHeader><CardContent className="grid gap-4 p-5 text-sm text-slate-400 md:grid-cols-3"><div><p className="font-medium text-white">01 · Event intake</p><p className="mt-2 leading-6">كل رسالة تصل إلى نقطة استقبال قناة محددة مع التحقق من التوقيع.</p></div><div><p className="font-medium text-white">02 · Agent routing</p><p className="mt-2 leading-6">تُربط القناة بالوكيل الذي اختاره صاحب مساحة العمل.</p></div><div><p className="font-medium text-white">03 · Human handoff</p><p className="mt-2 leading-6">عند التصعيد، تُحفظ المحادثة وتنتقل للفريق بدلاً من الاستمرار آلياً.</p></div></CardContent></Card>

    <Dialog open={showWhatsAppSetup} onOpenChange={setShowWhatsAppSetup}>
      <DialogContent className="max-w-xl border-white/10 bg-[#0b1728] text-white" dir="rtl">
        <DialogHeader><div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300"><MessageCircle className="h-5 w-5" /></div><DialogTitle>ربط Meta WhatsApp Business</DialogTitle><DialogDescription className="leading-6 text-slate-400">احفظ معرّفات حساب Oman Drive هنا. ستبقى القناة في حالة «بانتظار التحقق» إلى أن ينجح Meta في التحقق من رابط Webhook.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2"><label className="block space-y-2"><span className="text-xs text-slate-300">Phone Number ID من لوحة Meta</span><Input value={whatsAppForm.phoneNumberId} onChange={e => setWhatsAppForm(form => ({ ...form, phoneNumberId: e.target.value }))} placeholder="مثال: 123456789012345" dir="ltr" className="border-white/10 bg-white/[0.04] text-white" /></label><label className="block space-y-2"><span className="text-xs text-slate-300">WhatsApp Business Account ID</span><Input value={whatsAppForm.whatsappBusinessAccountId} onChange={e => setWhatsAppForm(form => ({ ...form, whatsappBusinessAccountId: e.target.value }))} placeholder="مثال: 123456789012345" dir="ltr" className="border-white/10 bg-white/[0.04] text-white" /></label><label className="block space-y-2"><span className="text-xs text-slate-300">رقم الأعمال الظاهر للعملاء</span><Input value={whatsAppForm.displayPhoneNumber} onChange={e => setWhatsAppForm(form => ({ ...form, displayPhoneNumber: e.target.value }))} placeholder="0096875192909" dir="ltr" className="border-white/10 bg-white/[0.04] text-white" /></label><div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4"><div className="flex items-center gap-2 text-sm font-medium text-cyan-100"><ShieldCheck className="h-4 w-4 text-cyan-300" /> رابط Callback URL المطلوب في Meta</div><div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-black/20 px-3 py-2 text-[11px] text-cyan-200" dir="ltr">{webhookUrl}</code><Button type="button" size="icon" variant="outline" onClick={copyWebhookUrl} className="shrink-0 border-white/10 bg-white/[0.04] text-white hover:bg-white/10"><Copy className="h-4 w-4" /></Button></div><p className="mt-3 text-xs leading-5 text-slate-400">ستحتاج أيضاً إلى إدخال Verify Token وApp Secret وAccess Token في إعدادات الخادم الآمنة، وليس في هذه الصفحة.</p></div><a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-lime-200 hover:text-lime-100">فتح دليل Meta الرسمي <ExternalLink className="h-3.5 w-3.5" /></a></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setShowWhatsAppSetup(false)} className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10">إلغاء</Button><Button type="button" onClick={saveWhatsAppSetup} disabled={configureWhatsAppMutation.isPending || !whatsAppForm.phoneNumberId || !whatsAppForm.whatsappBusinessAccountId || !whatsAppForm.displayPhoneNumber} className="bg-lime-300 text-slate-950 hover:bg-lime-200">{configureWhatsAppMutation.isPending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الحفظ</> : "حفظ والإنتظار للتحقق"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
