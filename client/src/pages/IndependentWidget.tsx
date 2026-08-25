import { Button } from "@/components/ui/button";
import { Bot, Loader2, Send, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRoute } from "wouter";

type PublicAgent = { id: number; name: string; description: string | null; language: string; tone: string };
type WidgetMessage = { role: "customer" | "assistant"; content: string };

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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!message || !agent || sending) return;
    const nextHistory = messages.map((item) => ({ role: item.role === "customer" ? "user" : "assistant", content: item.content }));
    setMessages((current) => [...current, { role: "customer", content: message }]);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      const result = await publicWidgetRequest<{ reply: string; conversation: { id: number } }>(`/api/public/agents/${agent.id}/chat`, { method: "POST", body: JSON.stringify({ message, conversationId, history: nextHistory }) });
      setConversationId(result.conversation.id);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال الرسالة الآن.");
    } finally {
      setSending(false);
    }
  };

  const close = () => window.parent?.postMessage({ type: "neon-agent-widget-close" }, "*");

  return <main className="min-h-screen bg-[#050d18] p-3 text-white" dir="rtl"><section className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1728] shadow-2xl shadow-cyan-950/30"><header className="flex items-center gap-3 bg-gradient-to-br from-[#123047] to-[#0d1b2d] px-5 py-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{agent?.name || "Neon AI"}</p><p className="mt-1 text-[11px] text-lime-200">{loading ? "جارٍ فتح المحادثة…" : "متصل الآن"}</p></div><button onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="إغلاق"><X className="h-4 w-4" /></button></header><div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">{loading && <p className="m-auto text-sm text-slate-400">جارٍ تجهيز وكيل الشركة…</p>}{error && <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p>}{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`flex ${item.role === "customer" ? "justify-start" : "justify-end"}`}><p className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "customer" ? "rounded-tr-md bg-white/[0.08] text-slate-100" : "rounded-tl-md bg-cyan-300/10 text-cyan-50"}`}>{item.content}</p></div>)}{sending && <div className="flex justify-end"><p className="flex items-center gap-2 rounded-2xl bg-cyan-300/10 px-4 py-3 text-xs text-cyan-100"><Loader2 className="h-4 w-4 animate-spin" />يفكّر الوكيل…</p></div>}</div><form onSubmit={send} className="border-t border-white/10 p-3"><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={loading || sending || !agent} placeholder="اكتب استفسارك…" className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50" /><Button type="submit" disabled={!draft.trim() || sending || !agent} className="h-10 w-10 rounded-xl bg-lime-300 p-0 text-slate-950 hover:bg-lime-200"><Send className="h-4 w-4" /></Button></div><p className="mt-2 text-center text-[10px] text-slate-500">محادثة مستقلة مع وكيل هذه الشركة</p></form></section></main>;
}
