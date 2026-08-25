import { Button } from "@/components/ui/button";
import { Bot, FileText, Loader2, Mic, Paperclip, PhoneCall, Send, Square, Star, X } from "lucide-react";
import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";

type PublicAgent = { id: number; name: string; description: string | null; language: string; tone: string };
type WidgetMessage = { role: "customer" | "assistant"; content: string };
type HandoffContact = { name: string | null; phone: string | null; email: string | null };
type PendingAttachment = { fileName: string; mediaType: string; size: number; textContent: string | null };
type SpeechResult = { isFinal: boolean; 0?: { transcript?: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type BrowserSpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

async function publicWidgetRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  const rawBody = await response.text();
  let body: (T & { error?: string }) | null = null;
  if (contentType.includes("application/json")) {
    try { body = JSON.parse(rawBody) as T & { error?: string }; } catch { body = null; }
  }
  if (!response.ok) {
    if (body?.error) throw new Error(body.error);
    if (contentType.includes("text/html") || /^\s*<!doctype html/i.test(rawBody)) throw new Error("تعذر الوصول إلى خدمة الوكيل حالياً. يبدو أن الخادم يعيد صفحة HTML بدلاً من استجابة API. حاول بعد لحظات.");
    throw new Error("تعذر إتمام الطلب الآن.");
  }
  if (!body) throw new Error("وصلت استجابة غير صالحة من خدمة الوكيل. حاول مرة أخرى.");
  return body;
}

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

export default function IndependentWidget() {
  const [, params] = useRoute("/widget/:agentId");
  const agentId = Number(params?.agentId);
  const [agent, setAgent] = useState<PublicAgent | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
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
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceStopRequestedRef = useRef(false);

  useEffect(() => {
    if (!Number.isSafeInteger(agentId) || agentId <= 0) { setError("تعذر فتح الوكيل المطلوب."); setLoading(false); return; }
    void publicWidgetRequest<{ agent: PublicAgent }>(`/api/public/agents/${agentId}`)
      .then((result) => { setAgent(result.agent); setMessages([{ role: "assistant", content: `مرحباً، أنا ${result.agent.name}. كيف أستطيع مساعدتك؟` }]); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر فتح الوكيل الآن."))
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(() => () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    speechRecognitionRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, [audioPreviewUrl]);

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم المرفق يتجاوز 5 ميغابايت. اختر ملفاً أصغر.");
      return;
    }
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    const isText = file.type.startsWith("text/") || file.type === "application/json" || /\.(txt|md|csv|json)$/i.test(file.name);
    if (!isImage && !isText) {
      setError("يسمح بإرفاق صورة أو ملف TXT أو MD أو CSV أو JSON فقط.");
      return;
    }
    let textContent: string | null = null;
    if (isText) {
      try { textContent = (await file.text()).trim().slice(0, 12_000) || null; }
      catch { setError("تعذر قراءة الملف النصي. جرّب حفظه بترميز UTF-8 ثم أعد المحاولة."); return; }
    }
    setPendingAttachment({ fileName: file.name, mediaType: file.type || (isImage ? "image/*" : "text/plain"), size: file.size, textContent });
    setError(null);
  };

  const startVoiceCapture = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return setError("التسجيل الصوتي غير مدعوم في هذا المتصفح.");
    const browserWindow = window as BrowserSpeechRecognitionWindow;
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) return setError("استخدم Chrome على الهاتف لتفعيل تحويل الصوت إلى نص قبل الإرسال.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorderOptions = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined;
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setVoiceTranscript("");
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob); });
      };
      const recognition = new Recognition();
      speechRecognitionRef.current = recognition;
      voiceStopRequestedRef.current = false;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = agent?.language === "en" ? "en-US" : "ar-SA";
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).slice(event.resultIndex).filter((result) => result.isFinal).map((result) => result[0]?.transcript ?? "").join(" ").trim();
        if (transcript) setVoiceTranscript((current) => current ? `${current} ${transcript}` : transcript);
      };
      recognition.onerror = () => setError("تعذر تحويل الصوت إلى نص. يمكنك كتابة الرسالة أو المحاولة مجدداً.");
      recognition.onend = () => {
        if (!voiceStopRequestedRef.current && mediaRecorderRef.current?.state === "recording") {
          try { recognition.start(); return; } catch { /* the browser may already be restarting */ }
        }
        setIsRecording(false);
      };
      recorder.start();
      recognition.start();
      setIsRecording(true);
      setError(null);
    } catch {
      setError("اسمح بالوصول إلى الميكروفون لتسجيل رسالتك الصوتية.");
    }
  };

  const stopVoiceCapture = () => {
    voiceStopRequestedRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    speechRecognitionRef.current?.stop();
    setIsRecording(false);
  };

  const cancelVoiceCapture = () => {
    stopVoiceCapture();
    setAudioPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
    setVoiceTranscript("");
  };

  const sendMessage = async (messageOverride?: string) => {
    if (!agent || sending || handoffComplete || conversationClosed) return;
    const typedMessage = (messageOverride ?? draft).trim();
    const attachment = pendingAttachment;
    if (!typedMessage && !attachment) { setError("اكتب رسالة أو أرفق ملفاً قبل الإرسال."); return; }
    const displayMessage = typedMessage || `أرفقت ملفاً باسم «${attachment?.fileName}».`;
    const attachmentContext = attachment
      ? attachment.textContent
        ? `\n\nمحتوى المرفق «${attachment.fileName}»:\n${attachment.textContent}`
        : `\n\nمرفق: ${attachment.fileName} (${formatAttachmentSize(attachment.size)}). هذا الـWidget يعرض اسم الصورة فقط ولا يدّعي قراءة محتواها.`
      : "";
    const requestMessage = `${displayMessage}${attachmentContext}`;
    const nextHistory = messages.map((item) => ({ role: item.role === "customer" ? "user" : "assistant", content: item.content }));
    setMessages((current) => typedMessage ? [...current, { role: "customer", content: typedMessage }] : current);
    setDraft("");
    setPendingAttachment(null);
    setSending(true);
    setError(null);
    try {
      const result = await publicWidgetRequest<{ reply: string; conversation: { id: number; sessionToken: string } }>(`/api/public/agents/${agent.id}/chat`, { method: "POST", body: JSON.stringify({ message: requestMessage, conversationId, conversationSessionToken, history: nextHistory }) });
      setConversationId(result.conversation.id);
      setConversationSessionToken(result.conversation.sessionToken);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال الرسالة الآن.");
    } finally {
      setSending(false);
    }
  };

  const send = (event: FormEvent) => { event.preventDefault(); void sendMessage(); };

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
      if (conversationId && conversationSessionToken) setRatingOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ طلب التواصل الآن.");
    } finally {
      setHandoffSubmitting(false);
    }
  };

  const submitExperienceRating = async (satisfactionRating: number) => {
    if (!agent || !conversationId || !conversationSessionToken || ratingSubmitting) return;
    setRatingSubmitting(true);
    setError(null);
    try {
      await publicWidgetRequest(`/api/public/agents/${agent.id}/conversations/${conversationId}/rating`, { method: "POST", body: JSON.stringify({ conversationSessionToken, satisfactionRating }) });
      setRatingOpen(false);
      setMessages((current) => [...current, { role: "assistant", content: "شكراً لتقييمك. سيساعدنا ذلك في تحسين تجربة المحادثة." }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ التقييم الآن.");
    } finally {
      setRatingSubmitting(false);
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
      setRatingOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إنهاء المحادثة الآن.");
    } finally {
      setSending(false);
    }
  };

  const close = () => window.parent?.postMessage({ type: "neon-agent-widget-close" }, "*");

  return <main className="min-h-screen bg-[#050d18] p-3 text-white" dir="rtl"><section className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1728] shadow-2xl shadow-cyan-950/30"><header className="flex items-center gap-3 bg-gradient-to-br from-[#123047] to-[#0d1b2d] px-5 py-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{agent?.name || "Neon AI"}</p><p className="mt-1 text-[11px] text-lime-200">{loading ? "جارٍ فتح المحادثة…" : handoffComplete ? "تم تحويل الطلب للفريق" : conversationClosed ? "تم إنهاء المحادثة" : "متصل الآن"}</p></div><button onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="إغلاق"><X className="h-4 w-4" /></button></header><div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">{loading && <p className="m-auto text-sm text-slate-400">جارٍ تجهيز وكيل الشركة…</p>}{error && <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm leading-6 text-rose-100">{error}</p>}{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`flex ${item.role === "customer" ? "justify-start" : "justify-end"}`}><p className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "customer" ? "rounded-tr-md bg-white/[0.08] text-slate-100" : "rounded-tl-md bg-cyan-300/10 text-cyan-50"}`}>{item.content}</p></div>)}{sending && <div className="flex justify-end"><p className="flex items-center gap-2 rounded-2xl bg-cyan-300/10 px-4 py-3 text-xs text-cyan-100"><Loader2 className="h-4 w-4 animate-spin" />يفكّر الوكيل…</p></div>}{handoffOpen && <form onSubmit={submitHandoff} className="rounded-2xl border border-lime-300/25 bg-lime-300/[0.08] p-3"><p className="font-bold text-lime-100">اطلب التواصل مع فريق الشركة</p><p className="mt-1 text-xs leading-5 text-slate-300">لن تُشارك بياناتك إلا مع فريق هذه الشركة لمعالجة طلبك.</p><div className="mt-3 grid gap-2"><input value={handoff.name} onChange={(event) => setHandoff((current) => ({ ...current, name: event.target.value }))} placeholder="الاسم" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-sm outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoff.phone} onChange={(event) => setHandoff((current) => ({ ...current, phone: event.target.value }))} placeholder="رقم الهاتف" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-left text-sm outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoff.email} onChange={(event) => setHandoff((current) => ({ ...current, email: event.target.value }))} placeholder="البريد الإلكتروني" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-left text-sm outline-none placeholder:text-slate-500" /><input value={handoff.notes} onChange={(event) => setHandoff((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظة مختصرة (اختياري)" className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-sm outline-none placeholder:text-slate-500" /></div><label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-200"><input type="checkbox" checked={handoff.consent} onChange={(event) => setHandoff((current) => ({ ...current, consent: event.target.checked }))} className="mt-1" />أوافق على مشاركة هذه البيانات مع فريق الشركة للتواصل بشأن طلبي.</label><div className="mt-3 flex gap-2"><Button type="submit" disabled={handoffSubmitting} className="flex-1 bg-lime-300 text-slate-950 hover:bg-lime-200">{handoffSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}</Button><Button type="button" variant="outline" onClick={() => setHandoffOpen(false)} className="border-white/15 text-white">إلغاء</Button></div></form>}{ratingOpen && <section className="rounded-2xl border border-cyan-200/25 bg-cyan-300/[0.08] p-3 text-center"><p className="font-bold text-cyan-50">كيف تقيّم تجربة المحادثة؟</p><p className="mt-1 text-xs text-slate-300">اختياري، ويساعد الشركة على تحسين الوكيل.</p><div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="تقييم تجربة المحادثة من 1 إلى 5">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" onClick={() => void submitExperienceRating(rating)} disabled={ratingSubmitting} className="rounded-lg p-1.5 text-lime-200 transition hover:bg-lime-300/15 hover:text-lime-100 disabled:opacity-50" aria-label={`تقييم ${rating} من 5`}><Star className="h-6 w-6" fill="currentColor" /></button>)}</div><button type="button" onClick={() => setRatingOpen(false)} disabled={ratingSubmitting} className="mt-2 text-xs text-slate-400 hover:text-slate-200">تخطي</button></section>}</div><form onSubmit={send} className="border-t border-white/10 p-3">{pendingAttachment && <div className="mb-2 flex items-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-300/[0.08] p-2 text-xs text-cyan-50"><FileText className="h-4 w-4 shrink-0 text-cyan-200" /><span className="min-w-0 flex-1 truncate">{pendingAttachment.fileName} · {pendingAttachment.textContent ? "سيُقرأ كنص" : "اسم الملف فقط"}</span><button type="button" onClick={() => setPendingAttachment(null)} className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="إزالة المرفق"><X className="h-3.5 w-3.5" /></button></div>}{audioPreviewUrl && <div className="mb-2 rounded-xl border border-cyan-200/20 bg-cyan-300/[0.08] p-2"><div className="flex items-center gap-2"><Mic className="h-4 w-4 shrink-0 text-cyan-200" /><audio controls src={audioPreviewUrl} className="h-8 min-w-0 flex-1" /><button type="button" onClick={cancelVoiceCapture} className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="إلغاء التسجيل"><X className="h-3.5 w-3.5" /></button></div>{voiceTranscript ? <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/35 p-2"><p className="text-[10px] font-bold text-cyan-100">النص المسموع</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-white">{voiceTranscript}</p><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => current ? `${current} ${voiceTranscript}` : voiceTranscript)} className="border-cyan-200/30 text-cyan-100">استخدم النص</Button><Button type="button" size="sm" onClick={() => void sendMessage(voiceTranscript)} disabled={sending} className="bg-cyan-300 text-slate-950">إرسال الصوت كنص</Button></div></div> : <p className="mt-2 text-[10px] leading-5 text-amber-100">تم حفظ المعاينة، لكن لم يصل نص من المتصفح. يمكنك كتابة الرسالة يدوياً.</p>}</div>}{isRecording && <p className="mb-2 flex items-center gap-2 text-xs text-rose-100"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" />جارٍ التسجيل وتحويل الكلام إلى نص…</p>}<div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5"><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,text/plain,text/markdown,text/csv,application/json,.txt,.md,.csv,.json" className="hidden" onChange={(event) => void handleAttachmentChange(event)} /><button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || sending || !agent || handoffComplete || conversationClosed} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-cyan-100 disabled:opacity-40" aria-label="إرفاق صورة أو ملف"><Paperclip className="h-4 w-4" /></button><button type="button" onClick={() => isRecording ? stopVoiceCapture() : void startVoiceCapture()} disabled={loading || sending || !agent || handoffComplete || conversationClosed} className={`rounded-xl p-2 transition ${isRecording ? "bg-rose-300/15 text-rose-100" : "text-slate-400 hover:bg-white/10 hover:text-cyan-100"} disabled:opacity-40`} aria-label={isRecording ? "إيقاف التسجيل" : "تسجيل رسالة صوتية"}>{isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={loading || sending || !agent || handoffComplete || conversationClosed} placeholder={handoffComplete ? "تم تحويل الطلب إلى الفريق" : conversationClosed ? "تم إنهاء المحادثة" : "اكتب استفسارك…"} className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50" /><Button type="submit" disabled={(!draft.trim() && !pendingAttachment) || sending || !agent || handoffComplete || conversationClosed} className="h-10 w-10 shrink-0 rounded-xl bg-lime-300 p-0 text-slate-950 hover:bg-lime-200" aria-label="إرسال الرسالة"><Send className="h-4 w-4" /></Button></div>{!handoffComplete && !conversationClosed && <><button type="button" onClick={() => { setError(null); setHandoffOpen((current) => !current); }} className="mt-3 flex w-full items-center justify-center gap-2 text-xs text-lime-200 hover:text-lime-100"><PhoneCall className="h-3.5 w-3.5" />أريد التحدث مع موظف</button>{conversationId && <button type="button" onClick={() => void closeConversation()} disabled={sending} className="mt-2 flex w-full items-center justify-center gap-2 text-xs text-slate-300 hover:text-white disabled:opacity-50">هل تحتاج مساعدة أخرى؟ إنهاء المحادثة الآن</button>}</>}<p className="mt-2 text-center text-[10px] text-slate-500">محادثة مستقلة مع وكيل هذه الشركة · الصور تعرض اسم الملف فقط، وملفات النص تُقرأ قبل الإرسال</p></form></section></main>;
}
