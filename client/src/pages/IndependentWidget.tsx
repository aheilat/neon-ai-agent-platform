import { Button } from "@/components/ui/button";
import { Bot, Loader2, PhoneCall, Send, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRoute } from "wouter";

type PublicAgent = { id: number; name: string; description: string | null; language: string; tone: string };
type WidgetMessage = { role: "customer" | "assistant"; content: string };
type HandoffContact = { name: string | null; phone: string | null; email: string | null };

async function publicWidgetRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "تعذر إتمام الطلب الآن.");
  return body;
}

export default function IndependentWidget() {
  const [, params] = useRoute("/widget/:agentId");
  const agentId = Number(params?.agentId);
  const [agent, setAgent] = useState<PublicAgent | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationSessionToken, setConversationSessionToken] = useState<string | null>(null);
  const [conversationClosed, setConversationClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffSubmitting, setHandoffSubmitting] = useState(false);
  const [handoffComplete, setHandoffComplete] = useState(false);
  const [handoff, setHandoff] = useState({ name: "", phone: "", email: "", notes: "", consent: false });

  useEffect(() => {
    if (!Number.isSafeInteger(agentId) || agentId <= 0) { setError("تعذر فتح الوكيل المطلوب."); setLoading(false); return; }
    void publicWidgetRequest<{ agent: PublicAgent }>(`/api/public/agents/${agentId}`)
      .then((result) => { setAgent(result.agent); setMessages([{ role: "assistant", content: `مرحباً، أنا ${result.agent.name}. كيف أستطيع مساعدتك؟` }]); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر فتح الوكيل الآن."))
      .finally(() => setLoading(false));
  }, [agentId]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !agent || sending || handoffComplete || conversationClosed) return;
    const nextHistory = messages.map((item) => ({ role: item.role === "customer" ? "user" : "assistant", content: item.content }));
    setMessages((current) => [...current, { role: "customer", content: message }]);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      const result = await publicWidgetRequest<{ reply: string; conversation: { id: number; sessionToken: string } }>(`/api/public/agents/${agent.id}/chat`, { method: "POST", body: JSON.stringify({ message, conversationId, conversationSessionToken, history: nextHistory }) });
      setConversationId(result.conversation.id);
      setConversationSessionToken(result.conversation.sessionToken);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال الرسالة الآن.");
    } finally {
      setSending(false);
    }
  };

  const submitHandoff = async (event: FormEvent) => {
    event.preventDefault();
    if (!agent || handoffSubmitting || handoffComplete) return;
    if (!handoff.name.trim() || (!handoff.phone.trim() && !handoff.email.trim()) || !handoff.consent) {
      setError("اكتب اسمك ورقم هاتف أو بريداً إلكترونياً، ثم وافق على مشاركة البيانات مع فريق الشركة.");
      return;
    }
    setHandoffSubmitting(true);
    setError(null);
    try {
      const result = await publicWidgetRequest<{ contact: HandoffContact }>(`/api/public/agents/${agent.id}/handoff`, { method: "POST", body: JSON.stringify({ ...handoff, conversationId, conversationSessionToken }) });
      const contact = [result.contact.name, result.contact.phone, result.contact.email].filter((value): value is string => Boolean(value?.trim())).join(" · ");
      setMessages((current) => [...current, { role: "assistant", content: contact ? `تم حفظ طلبك وتحويله إلى فريق الشركة. للتواصل المباشر: ${contact}` : "تم حفظ طلبك وتحويله إلى فريق الشركة. سيتواصل معك الفريق باستخدام وسيلة الاتصال التي وافقت على مشاركتها." }]);
      setHandoffComplete(true);
      setHandoffOpen(false);
      void requestExperienceRating();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ طلب التواصل الآن.");
    } finally {
      setHandoffSubmitting(false);
    }
  };

  const requestExperienceRating = async () => {
    if (!agent || !conversationId || !conversationSessionToken) return;
    const rawRating = window.prompt("كيف تقيّم تجربة المحادثة؟ اختر رقماً من 1 إلى 5، حيث 5 = ★★★★★", "");
    if (rawRating === null || !rawRating.trim()) return;
    const satisfactionRating = Number(rawRating);
    if (!Number.isInteger(satisfactionRating) || satisfactionRating < 1 || satisfactionRating > 5) {
      setError("أدخل تقييماً صحيحاً من 1 إلى 5.");
      return;
    }
    try {
      await publicWidgetRequest(`/api/public/agents/${agent.id}/conversations/${conversationId}/rating`, { method: "POST", body: JSON.stringify({ conversationSessionToken, satisfactionRating }) });
      setMessages((current) => [...current, { role: "assistant", content: "شكراً لتقييمك. سيساعدنا ذلك في تحسين تجربة المحادثة." }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ التقييم الآن.");
    }
  };

  const closeConversation = async () => {
    if (!agent || !conversationId || !conversationSessionToken || sending || handoffComplete || conversationClosed) return;
    setSending(true);
    setError(null);
    try {
      await publicWidgetRequest(`/api/public/agents/${agent.id}/conversations/${conversationId}/close`, { method: "POST", body: JSON.stringify({ conversationSessionToken }) });
      setConversationClosed(true);
      setMessages((current) => [...current, { role: "assistant", content: "تم إنهاء المحادثة. إذا احتجت مساعدة لاحقاً، يمكنك بدء محادثة جديدة مع الشركة." }]);
      void requestExperienceRating();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إنهاء المحادثة الآن.");
    } finally {
      setSending(false);
    }
  };

  const close = () => window.parent?.postMessage({ type: "neon-agent-widget-close" }, "*");

  return <main className="min-h-screen bg-[#050d18] p-3 text-white" dir="rtl"><section className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1728] shadow-2xl shadow-cyan-950/30"><header className="flex items-center gap-3 bg-gradient-to-br from-[#123047] to-[#0d1b2d] px-5 py-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{agent?.name || "Neon AI"}</p><p className="mt-1 text-[11px] text-lime-200">{loading ? "جارٍ فتح المحادثة…" : handoffComplete ? "تم تحويل الطلب للفريق" : conversationClosed ? "تم إنهاء المحادثة" : "متصل الآن"}</p></div><button onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="إغلاق"><X className="h-4 w-4" /></button></header><div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">{loading && <p className="m-auto text-sm text-slate-400">جارٍ تجهيز وكيل الشركة…</p>}{error && <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm leading-6 text-rose-100">{error}</p>}{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`flex ${item.role === "customer" ? "justify-start" : "justify-end"}`}><p className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "customer" ? "rounded-tr-md bg-white/[0.08] text-slate-100" : "rounded-tl-md bg-cyan-300/10 text-cyan-50"}`}>{item.content}</p></div>)}{sending && <div className="flex justify-end"><p className="flex items-center gap-2 rounded-2xl bg-cyan-300/10 px-4 py-3 text-xs text-cyan-100"><Loader2 className="h-4 w-4 animate-spin" />يفكّر الوكيل…</p></div>}{handoffOpen && <form onSubmit={submitHandoff} className="rounded-2xl border border-lime-300/25 bg-lime-300/[0.08] p-3"><p className="font-bold text-lime-100">اطلب التواصل مع فريق الشركة</p><p className="mt-1 text-xs leading-5 text-slate-300">لن تُشارك بياناتك إلا مع فريق هذه الشركة لمعالجة طلبك.</p><div className="mt-3 grid gap-2"><input value={handoff.name} onChange={(event) => setHandoff((current) => ({ ...current, name: event.target.value }))} placeholder="الاسم" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-sm outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoff.phone} onChange={(event) => setHandoff((current) => ({ ...current, phone: event.target.value }))} placeholder="رقم الهاتف" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-left text-sm outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoff.email} onChange={(event) => setHandoff((current) => ({ ...current, email: event.target.value }))} placeholder="البريد الإلكتروني" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-left text-sm outline-none placeholder:text-slate-500" /><input value={handoff.notes} onChange={(event) => setHandoff((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظة مختصرة (اختياري)" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-sm outline-none placeholder:text-slate-500" /></div><label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-200"><input type="checkbox" checked={handoff.consent} onChange={(event) => setHandoff((current) => ({ ...current, consent: event.target.checked }))} className="mt-1" />أوافق على مشاركة هذه البيانات مع فريق الشركة للتواصل بشأن طلبي.</label><div className="mt-3 flex gap-2"><Button type="submit" disabled={handoffSubmitting} className="flex-1 bg-lime-300 text-slate-950 hover:bg-lime-200">{handoffSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}</Button><Button type="button" variant="outline" onClick={() => setHandoffOpen(false)} className="border-white/15 text-white">إلغاء</Button></div></form>}</div><form onSubmit={send} className="border-t border-white/10 p-3"><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={loading || sending || !agent || handoffComplete || conversationClosed} placeholder={handoffComplete ? "تم تحويل الطلب إلى الفريق" : conversationClosed ? "تم إنهاء المحادثة" : "اكتب استفسارك…"} className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50" /><Button type="submit" disabled={!draft.trim() || sending || !agent || handoffComplete || conversationClosed} className="h-10 w-10 rounded-xl bg-lime-300 p-0 text-slate-950 hover:bg-lime-200"><Send className="h-4 w-4" /></Button></div>{!handoffComplete && !conversationClosed && <><button type="button" onClick={() => { setError(null); setHandoffOpen((current) => !current); }} className="mt-3 flex w-full items-center justify-center gap-2 text-xs text-lime-200 hover:text-lime-100"><PhoneCall className="h-3.5 w-3.5" />أريد التحدث مع موظف</button>{conversationId && <button type="button" onClick={() => void closeConversation()} disabled={sending} className="mt-2 flex w-full items-center justify-center gap-2 text-xs text-slate-300 hover:text-white disabled:opacity-50">هل تحتاج مساعدة أخرى؟ إنهاء المحادثة الآن</button>}</>}<p className="mt-2 text-center text-[10px] text-slate-500">محادثة مستقلة مع وكيل هذه الشركة</p></form></section></main>;
}
