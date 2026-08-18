import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WhatsAppConnectionDetails } from "@/components/WhatsAppConnectionDetails";
import { trpc } from "@/lib/trpc";
import { getWhatsAppEmbeddedStatus } from "@/lib/whatsappEmbeddedStatus";
import { Check, CircleAlert, Globe2, Instagram, Link2, Loader2, MessageCircle, PhoneCall, Radio, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const channels = [
  { id: "web" as const, name: "Live chat widget", nameAr: "ودجت الموقع", description: "أضف محادثة ذكية لأي موقع بسطر واحد.", icon: Globe2, tint: "text-cyan-300", bg: "bg-cyan-300/10", ready: true },
  { id: "whatsapp" as const, name: "WhatsApp Business", nameAr: "واتساب للأعمال", description: "دع العميل يربط حسابه بنفسه من Meta بدون نسخ رموز وصول أو معرّفات تقنية.", icon: MessageCircle, tint: "text-lime-300", bg: "bg-lime-300/10", ready: true },
  { id: "messenger" as const, name: "Facebook Messenger", nameAr: "فيسبوك ماسنجر", description: "وحّد رسائل صفحاتك في صندوق واحد.", icon: Send, tint: "text-blue-300", bg: "bg-blue-300/10", ready: false },
  { id: "instagram" as const, name: "Instagram DMs", nameAr: "رسائل إنستغرام", description: "حوّل التفاعل إلى محادثات وفرص مؤهلة.", icon: Instagram, tint: "text-fuchsia-300", bg: "bg-fuchsia-300/10", ready: false },
  { id: "phone" as const, name: "Voice / Phone", nameAr: "الهاتف الصوتي", description: "تجهيز بوابة صوتية للتعامل مع المكالمات.", icon: PhoneCall, tint: "text-amber-300", bg: "bg-amber-300/10", ready: false },
];

type WhatsAppConfig = {
  phoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
  setupStatus?: "pending_webhook_verification" | "connected" | "awaiting_customer_billing";
  setupProvider?: string;
  lastWebhookAt?: string;
};

type MetaSignupAssets = {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void;
    };
  }
}

function loadFacebookSdk() {
  if (window.FB) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("meta-facebook-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("تعذر تحميل Meta SDK")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "meta-facebook-sdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("تعذر تحميل Meta SDK"));
    document.head.appendChild(script);
  });
}

export default function Channels() {
  const utils = trpc.useUtils();
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const [agentId, setAgentId] = useState<number | undefined>();
  const [showWhatsAppSetup, setShowWhatsAppSetup] = useState(false);
  const [signupPin, setSignupPin] = useState("");
  const [signupCode, setSignupCode] = useState<string | null>(null);
  const [signupAssets, setSignupAssets] = useState<MetaSignupAssets | null>(null);
  const [launchingSignup, setLaunchingSignup] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => { if (!agentId && agents[0]) setAgentId(agents[0].id); }, [agents, agentId]);
  const { data: integrations = [] } = trpc.channels.list.useQuery({ agentId }, { enabled: Boolean(agentId) });
  const { data: embeddedConfig, isLoading: isEmbeddedConfigLoading } = trpc.channels.embeddedWhatsAppConfig.useQuery(
    { agentId: agentId ?? 0 },
    { enabled: Boolean(agentId) },
  );
  const configureMutation = trpc.channels.configure.useMutation({ onSuccess: async () => { await utils.channels.list.invalidate(); toast.success("تم تحديث إعداد القناة"); }, onError: error => toast.error(error.message) });
  const completionMutation = trpc.channels.completeEmbeddedWhatsApp.useMutation({
    onSuccess: async result => {
      await utils.channels.list.invalidate();
      setShowWhatsAppSetup(false);
      setSignupCode(null);
      setSignupAssets(null);
      setSignupPin("");
      toast.success(result.displayPhoneNumber ? `تم ربط الرقم ${result.displayPhoneNumber}. أضف وسيلة دفع في WhatsApp Manager لإكمال التشغيل.` : "تم ربط حساب WhatsApp. أضف وسيلة الدفع في WhatsApp Manager لإكمال التشغيل.");
    },
    onError: error => {
      submittedRef.current = false;
      toast.error(error.message);
    },
  });

  const activeMap = useMemo(() => new Map(integrations.map(item => [item.channel, item.isActive === 1])), [integrations]);
  const whatsAppIntegration = integrations.find(item => item.channel === "whatsapp");
  const whatsAppConfig = (whatsAppIntegration?.configJson ?? {}) as WhatsAppConfig;
  const whatsAppConnected = Boolean(whatsAppIntegration?.isActive && ["connected", "awaiting_customer_billing"].includes(whatsAppConfig.setupStatus || ""));
  const whatsAppStatusInfo = getWhatsAppEmbeddedStatus(whatsAppConfig, Boolean(whatsAppIntegration?.isActive));

  useEffect(() => {
    const onMetaMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;
      let data: { type?: string; event?: string; data?: MetaSignupAssets & { current_step?: string; error_message?: string } } | undefined;
      try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (data.event?.startsWith("FINISH") && data.data?.phone_number_id && data.data?.waba_id) {
        setSignupAssets(data.data);
        return;
      }
      if (data.event === "CANCEL") {
        setLaunchingSignup(false);
        toast.info(data.data?.error_message || "تم إلغاء ربط WhatsApp. يمكنك المحاولة في أي وقت.");
      }
    };
    window.addEventListener("message", onMetaMessage);
    return () => window.removeEventListener("message", onMetaMessage);
  }, []);

  useEffect(() => {
    if (!agentId || !signupCode || !signupAssets?.phone_number_id || !signupAssets.waba_id || !/^\d{6}$/.test(signupPin) || submittedRef.current) return;
    submittedRef.current = true;
    completionMutation.mutate({
      agentId,
      code: signupCode,
      phoneNumberId: signupAssets.phone_number_id,
      whatsappBusinessAccountId: signupAssets.waba_id,
      businessPortfolioId: signupAssets.business_id,
      pin: signupPin,
    });
  }, [agentId, signupCode, signupAssets, signupPin, completionMutation]);

  const resetSignup = () => {
    submittedRef.current = false;
    setSignupCode(null);
    setSignupAssets(null);
    setSignupPin("");
    setLaunchingSignup(false);
  };

  const launchWhatsAppSignup = async () => {
    if (!agentId) return toast.error("اختر وكيلاً أولاً");
    if (!embeddedConfig?.enabled) return toast.error("يحتاج مسؤول المنصة إلى إدخال Meta Configuration ID أولاً");
    if (!/^\d{6}$/.test(signupPin)) return toast.error("أنشئ رمز PIN من 6 أرقام لحماية رقم WhatsApp");
    try {
      resetSignup();
      setLaunchingSignup(true);
      await loadFacebookSdk();
      if (!window.FB) throw new Error("Meta SDK غير جاهز");
      window.FB.init({ appId: embeddedConfig.appId, autoLogAppEvents: true, xfbml: true, version: embeddedConfig.graphApiVersion });
      window.FB.login(response => {
        setLaunchingSignup(false);
        const code = response.authResponse?.code;
        if (!code) return toast.info("لم تكتمل جلسة Meta. يمكنك المحاولة مجدداً.");
        setSignupCode(code);
      }, {
        config_id: embeddedConfig.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      });
    } catch (error) {
      setLaunchingSignup(false);
      toast.error(error instanceof Error ? error.message : "تعذر بدء ربط Meta");
    }
  };

  const toggle = (channel: typeof channels[number]) => {
    if (!agentId) return toast.error("اختر وكيلاً أولاً");
    if (channel.id === "whatsapp") return setShowWhatsAppSetup(true);
    if (!channel.ready) return toast.info("هذه القناة تحتاج مزوداً رسمياً قبل تفعيلها.");
    configureMutation.mutate({ agentId, channel: channel.id, isActive: !activeMap.get(channel.id) });
  };

  return <div className="mx-auto max-w-[1400px] space-y-7 pb-12" dir="rtl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80" dir="ltr">Omnichannel / 04</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">القنوات <span className="text-slate-500">/ Channels</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">أطلق وكيل العميل ثم اربط قناته بخطوات موجهة، مع عزل كل حساب Meta داخل مساحة العمل الخاصة به.</p></div>
      <div className="flex items-center gap-3"><select value={agentId ?? ""} onChange={e => setAgentId(Number(e.target.value))} className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none"><option value="" className="bg-[#0b1728]">اختر الوكيل</option>{agents.map(agent => <option key={agent.id} value={agent.id} className="bg-[#0b1728]">{agent.name}</option>)}</select><Badge className="border-lime-300/20 bg-lime-300/10 px-3 py-2 text-lime-200">{integrations.filter(i => i.isActive).length} مفعّلة</Badge></div>
    </header>

    <div className="grid gap-4 lg:grid-cols-2">{channels.map(channel => {
      const active = activeMap.get(channel.id) ?? false;
      const isWhatsApp = channel.id === "whatsapp";
      const status = isWhatsApp ? whatsAppStatusInfo.cardStatus : (active ? "Live" : channel.ready ? "Ready" : "يتطلب مزوداً");
      return <Card key={channel.id} className={`border-white/10 bg-[#0b1728]/90 transition ${active ? "shadow-lg shadow-cyan-950/20" : ""}`}><CardContent className="p-6"><div className="flex items-start gap-4"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${channel.bg} ${channel.tint}`}><channel.icon className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-white">{channel.nameAr}</h2><p className="mt-1 text-xs text-slate-500" dir="ltr">{channel.name}</p></div><Badge className={active ? "border-lime-300/20 bg-lime-300/10 text-lime-200" : isWhatsApp && whatsAppConfig.phoneNumberId ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.05] text-slate-400"}>{status}</Badge></div><p className="mt-4 text-sm leading-6 text-slate-400">{channel.description}</p>{isWhatsApp && <WhatsAppConnectionDetails config={whatsAppConfig} isActive={Boolean(whatsAppIntegration?.isActive)} />}<div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => toggle(channel)} disabled={configureMutation.isPending || completionMutation.isPending} className={active ? "rounded-xl bg-white/10 text-white hover:bg-white/15" : channel.ready ? "rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "rounded-xl bg-white/[0.06] text-slate-300 hover:bg-white/10"}>{isWhatsApp ? <><Link2 className="ml-2 h-4 w-4" /> {whatsAppConnected ? "إدارة الربط" : "ربط WhatsApp"}</> : active ? <><Check className="ml-2 h-4 w-4" /> مفعّلة</> : channel.ready ? <><Radio className="ml-2 h-4 w-4" /> تفعيل</> : <><Radio className="ml-2 h-4 w-4" /> إعداد الربط</>}</Button>{isWhatsApp && <Badge variant="outline" className="rounded-xl border-white/10 px-3 text-xs text-slate-500">بدون رموز يدوية</Badge>}</div></div></div></CardContent></Card>;
    })}</div>

    <Card className="border-white/10 bg-[#0b1728]/90"><CardHeader className="flex flex-row items-center gap-3 border-b border-white/10 pb-5"><RefreshCw className="h-5 w-5 text-cyan-300" /><div><CardTitle className="text-base text-white">مسار القنوات الرسمية</CardTitle><p className="mt-1 text-xs text-slate-400">يستقبل الخادم الأحداث عبر Webhooks موثقة، ثم يمررها إلى وكيل مساحة العمل المناسبة.</p></div></CardHeader><CardContent className="grid gap-4 p-5 text-sm text-slate-400 md:grid-cols-3"><div><p className="font-medium text-white">01 · العميل ينشئ الوكيل</p><p className="mt-2 leading-6">يختار النشاط أو يضيف موقعه كي تتشكل معرفة الوكيل.</p></div><div><p className="font-medium text-white">02 · زر ربط واحد</p><p className="mt-2 leading-6">يفتح Meta ضمن المسار الموجه، ويتحقق العميل من رقمه بنفسه.</p></div><div><p className="font-medium text-white">03 · تشغيل معزول</p><p className="mt-2 leading-6">يحفظ Neon الاعتماد بشكل مشفر لكل قناة ووكيل، ولا يظهر في الواجهة.</p></div></CardContent></Card>

    <Dialog open={showWhatsAppSetup} onOpenChange={open => { setShowWhatsAppSetup(open); if (!open) resetSignup(); }}>
      <DialogContent className="max-w-xl border-white/10 bg-[#0b1728] text-white" dir="rtl">
        <DialogHeader><div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300"><Sparkles className="h-5 w-5" /></div><DialogTitle>ربط WhatsApp في دقيقتين</DialogTitle><DialogDescription className="leading-6 text-slate-400">لا تحتاج إلى نسخ Phone Number ID أو Access Token. ستدخل إلى Meta بحساب العميل فقط، ثم يعود الربط إلى Neon تلقائياً.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300"><p className="flex items-center gap-2 font-medium text-white"><Check className="h-4 w-4 text-lime-300" /> اختر أو أنشئ حساب WhatsApp Business داخل Meta</p><p className="flex items-center gap-2 font-medium text-white"><Check className="h-4 w-4 text-lime-300" /> أثبت ملكية رقم العمل واستكمل بياناته</p><p className="flex items-center gap-2 font-medium text-white"><Check className="h-4 w-4 text-lime-300" /> يعود Neon لربط الرقم بالوكيل الحالي دون كشف أي اعتماد</p></div>
          <label className="block space-y-2"><span className="text-xs text-slate-300">رمز أمان WhatsApp من 6 أرقام</span><Input inputMode="numeric" maxLength={6} type="password" value={signupPin} onChange={e => setSignupPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" dir="ltr" className="border-white/10 bg-white/[0.04] text-white" /><p className="text-xs leading-5 text-slate-500">أنشئ رمزاً جديداً واحفظه في مكان آمن؛ Meta تستخدمه لحماية الرقم عند تفعيله على Cloud API.</p></label>
          {!embeddedConfig?.enabled && <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.08] p-4 text-xs leading-6 text-amber-100"><div className="mb-1 flex items-center gap-2 font-medium"><CircleAlert className="h-4 w-4" /> جارٍ إكمال إعداد Meta للمسؤول</div>سيظهر زر Meta تلقائياً بعد إضافة Configuration ID وتسجيل نطاق Neon في Facebook Login for Business.</div>}
          {signupCode && !signupAssets && <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-xs text-cyan-100"><Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" /> تم استلام جلسة Meta؛ ننتظر بيانات الرقم لإكمال الربط.</div>}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setShowWhatsAppSetup(false)} className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10">إلغاء</Button><Button type="button" onClick={launchWhatsAppSignup} disabled={!embeddedConfig?.enabled || isEmbeddedConfigLoading || launchingSignup || completionMutation.isPending || !/^\d{6}$/.test(signupPin)} className="bg-lime-300 text-slate-950 hover:bg-lime-200">{launchingSignup || completionMutation.isPending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الربط الآمن</> : <><ShieldCheck className="ml-2 h-4 w-4" /> متابعة مع Meta</>}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
