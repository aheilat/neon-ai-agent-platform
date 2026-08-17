import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { isExplicitCloseRequest, nextWidgetClosingStage, type WidgetClosingStage } from "@/lib/widgetConversation";
import { Bot, Image as ImageIcon, Loader2, MessageCircle, Mic, Paperclip, Send, Sparkles, Square, Star, UserRound, X } from "lucide-react";
import React, { FormEvent, useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";

type ChatMessage = { sender: "customer" | "agent"; content: string };
export default function Widget() {
  const [, params] = useRoute("/widget/:agentId");
  const agentId = Number(params?.agentId);
  const [conversationId, setConversationId] = useState<number>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ sender: "agent", content: "هلا! أنا مساعدك الذكي. كيف أقدر أخدمك اليوم؟" }]);
  const [isHandoffActive, setIsHandoffActive] = useState(false);
  const [handoffContactSaved, setHandoffContactSaved] = useState(false);
  const [lead, setLead] = useState({ name: "", phone: "", email: "" });
  const [contactError, setContactError] = useState("");
  const [closingStage, setClosingStage] = useState<WidgetClosingStage>("idle");
  const [rating, setRating] = useState<number>();
  const [selectedAttachment, setSelectedAttachment] = useState<{ name: string; type: "image" | "file" | "audio"; url?: string }>();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageListRef = useRef<HTMLElement>(null);
  const quickPrompts = ["ما الخدمات المتاحة؟", "أريد عرض سعر", "تحدث مع الفريق"];

  useEffect(() => {
    const container = messageListRef.current;
    if (container && typeof container.scrollTo === "function") container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, isHandoffActive, closingStage]);

  const appendAgent = (content: string) => setMessages(current => [...current, { sender: "agent", content }]);

  const replyMutation = trpc.chat.publicReply.useMutation({
    onSuccess: result => {
      setConversationId(result.conversationId ?? undefined);
      if (result.content) appendAgent(result.content);
      if (result.escalated || result.handoff) setIsHandoffActive(true);
    },
    onError: () => appendAgent("أعتذر، حصل خلل بسيط. جرّب مرة ثانية."),
  });
  const contactMutation = trpc.chat.publicHandoffContact.useMutation({
    onSuccess: () => {
      setHandoffContactSaved(true);
      setContactError("");
    },
    onError: () => setContactError("تعذر حفظ البيانات الآن. جرّب مرة أخرى أو تواصل هاتفياً مع الفريق."),
  });
  const closeMutation = trpc.chat.publicCloseConversation.useMutation({
    onSuccess: () => {
      setClosingStage("closed");
      appendAgent("تم إنهاء المحادثة. نرجو تقييم تجربتك لمساعدتنا على التحسين.");
    },
    onError: () => appendAgent("تعذر إنهاء المحادثة الآن. يمكنك المحاولة بعد قليل."),
  });
  const ratingMutation = trpc.chat.publicRateConversation.useMutation({
    onSuccess: () => appendAgent("شكراً لتقييمك. يسعدنا خدمتك دائماً."),
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedAttachment({ name: file.name, type: file.type.startsWith("image/") ? "image" : "file" });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        setSelectedAttachment({ name: "رسالة صوتية مسجلة.webm", type: "audio", url: URL.createObjectURL(new Blob(audioChunksRef.current, { type: "audio/webm" })) });
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      alert("الرجاء السماح بالوصول إلى الميكروفون.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    setIsRecording(false);
  };
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setSelectedAttachment(undefined);
  };
  const togglePreviewPlay = () => {
    if (!selectedAttachment?.url) return;
    if (isPlayingPreview) {
      previewAudioRef.current?.pause();
      setIsPlayingPreview(false);
      return;
    }
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(selectedAttachment.url);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
    }
    previewAudioRef.current.play().catch(() => {});
    setIsPlayingPreview(true);
  };

  const askForMoreHelp = () => {
    setClosingStage(current => nextWidgetClosingStage(current, "start-closing"));
    appendAgent("هل تحتاج إلى مساعدة أخرى؟");
  };
  const continueConversation = () => {
    setClosingStage(current => nextWidgetClosingStage(current, "needs-help"));
    appendAgent("بالتأكيد، كيف يمكنني مساعدتك؟");
  };
  const askToClose = () => {
    setClosingStage(current => nextWidgetClosingStage(current, "no-more-help"));
    appendAgent("هل تريد إنهاء المحادثة الآن؟");
  };
  const confirmClose = () => {
    if (!conversationId) {
      setClosingStage(current => nextWidgetClosingStage(current, "confirm-close"));
      appendAgent("تم إنهاء المحادثة. نرجو تقييم تجربتك لمساعدتنا على التحسين.");
      return;
    }
    closeMutation.mutate({ agentId, conversationId });
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if ((!text && !selectedAttachment) || !agentId || replyMutation.isPending || isHandoffActive || closingStage !== "idle") return;
    const prefix = selectedAttachment?.type === "image" ? "[مرفق صورة]" : selectedAttachment?.type === "audio" ? "[مرفق رسالة صوتية]" : selectedAttachment ? "[مرفق ملف]" : "";
    const content = selectedAttachment ? `${text ? `${text} ` : ""}${prefix} (${selectedAttachment.name})` : text;
    setMessages(current => [...current, { sender: "customer", content }]);
    setMessage("");
    setSelectedAttachment(undefined);
    if (!selectedAttachment && isExplicitCloseRequest(content)) {
      askForMoreHelp();
      return;
    }
    replyMutation.mutate({ agentId, conversationId, message: content });
  };

  const saveHandoffContact = (event: FormEvent) => {
    event.preventDefault();
    if (!conversationId || lead.name.trim().length < 2 || lead.phone.trim().length < 6 || !/^\S+@\S+\.\S+$/.test(lead.email.trim())) {
      setContactError("أدخل الاسم ورقم هاتف صالحين وبريداً إلكترونياً صحيحاً ليتمكن الفريق من التواصل معك.");
      return;
    }
    contactMutation.mutate({ agentId, conversationId, name: lead.name.trim(), phone: lead.phone.trim(), email: lead.email.trim() });
  };

  const submitRating = (value: number) => {
    if (rating || ratingMutation.isPending) return;
    setRating(value);
    if (conversationId) ratingMutation.mutate({ agentId, conversationId, rating: value });
  };

  const closeWidget = () => window.parent?.postMessage({ type: "neon-agent-widget-close" }, "*");
  const composerDisabled = isHandoffActive || closingStage !== "idle";

  return <div className="min-h-screen bg-[#050d18] p-4" dir="rtl"><div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md items-end justify-center"><div className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1728] shadow-2xl shadow-cyan-950/30"><header className="relative overflow-hidden bg-gradient-to-br from-[#123047] to-[#0d1b2d] px-5 py-5"><div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/15 blur-2xl" /><div className="relative flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-300 text-slate-950"><Bot className="h-5 w-5" /></div><div className="flex-1"><p className="text-sm font-semibold text-white">Neon AI Assistant</p><div className="mt-1 flex items-center gap-2 text-[11px] text-lime-200"><span className={`h-1.5 w-1.5 rounded-full ${isHandoffActive ? "bg-amber-300" : "bg-lime-300"}`} />{isHandoffActive ? "بانتظار الفريق" : closingStage === "closed" ? "المحادثة منتهية" : "متصل الآن"}</div></div><button onClick={closeWidget} className="text-slate-400 hover:text-white" aria-label="Close widget"><X className="h-4 w-4" /></button></div></header><main ref={messageListRef} aria-live="polite" className="flex max-h-[52vh] min-h-[320px] flex-col gap-4 overflow-y-auto scroll-smooth p-5">{messages.map((item, index) => <div key={`${item.sender}-${index}`} className={`flex ${item.sender === "customer" ? "justify-start" : "justify-end"}`}><div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.sender === "customer" ? "rounded-tr-md bg-white/[0.08] text-slate-200" : "rounded-tl-md bg-cyan-300/10 text-cyan-100"}`}><div className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-500">{item.sender === "customer" ? <UserRound className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-lime-300" />}{item.sender === "customer" ? "أنت" : "Neon AI"}</div>{item.content}</div></div>)}{messages.length === 1 && !replyMutation.isPending && !isHandoffActive && closingStage === "idle" && <div className="flex flex-wrap justify-end gap-2" aria-label="أسئلة مقترحة">{quickPrompts.map(prompt => <button key={prompt} onClick={() => setMessage(prompt)} className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[11px] text-cyan-100 transition hover:bg-cyan-300/15">{prompt}</button>)}</div>}{replyMutation.isPending && <div className="flex justify-end"><div className="flex items-center gap-2 rounded-2xl bg-cyan-300/10 px-4 py-3 text-xs text-cyan-100"><Loader2 className="h-4 w-4 animate-spin" />يفكّر في أفضل إجابة...</div></div>}</main>{isHandoffActive && <section className="border-t border-amber-300/20 bg-amber-300/[0.06] p-4"><div className="mb-2 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-amber-300" /><p className="text-xs font-semibold text-amber-100">تم تحويل المحادثة إلى الفريق</p></div><p className="mb-3 text-[11px] leading-5 text-slate-300">اترك بياناتك ليتمكن فريق Oman Drive من التواصل معك. الرد الآلي متوقف الآن.</p>{handoffContactSaved ? <p className="rounded-xl bg-lime-300/10 px-3 py-2 text-xs text-lime-200">تم استلام بياناتك. للتواصل العاجل: <a className="underline" href="tel:+96875192909">+968 7519 2909</a></p> : <form onSubmit={saveHandoffContact} className="grid gap-2"><Input required value={lead.name} onChange={event => setLead({ ...lead, name: event.target.value })} placeholder="الاسم الكامل" className="h-9 border-white/10 bg-white/[0.05] text-xs text-white" /><Input required value={lead.phone} onChange={event => setLead({ ...lead, phone: event.target.value })} placeholder="رقم الهاتف للتواصل" inputMode="tel" className="h-9 border-white/10 bg-white/[0.05] text-xs text-white" /><Input required type="email" value={lead.email} onChange={event => setLead({ ...lead, email: event.target.value })} placeholder="البريد الإلكتروني" inputMode="email" className="h-9 border-white/10 bg-white/[0.05] text-xs text-white" />{contactError && <p className="text-[11px] text-rose-300">{contactError}</p>}<Button type="submit" disabled={contactMutation.isPending} className="h-9 rounded-xl bg-amber-300 text-xs text-slate-950 hover:bg-amber-200">{contactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال بيانات التواصل للفريق"}</Button><a href="tel:+96875192909" className="text-center text-[11px] text-amber-200 underline">للتواصل العاجل: +968 7519 2909</a></form>}</section>}{closingStage === "ask-more" && <section className="border-t border-cyan-300/15 bg-cyan-300/[0.04] p-4"><p className="mb-3 text-xs text-cyan-100">هل تحتاج إلى مساعدة أخرى؟</p><div className="grid grid-cols-2 gap-2"><Button onClick={continueConversation} variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10">نعم</Button><Button onClick={askToClose} className="bg-lime-300 text-slate-950 hover:bg-lime-200">لا، أنهيها</Button></div></section>}{closingStage === "confirm-close" && <section className="border-t border-cyan-300/15 bg-cyan-300/[0.04] p-4"><p className="mb-3 text-xs text-cyan-100">هل تريد إنهاء المحادثة الآن؟</p><div className="grid grid-cols-2 gap-2"><Button onClick={continueConversation} variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10">لا، متابعة</Button><Button onClick={confirmClose} disabled={closeMutation.isPending} className="bg-lime-300 text-slate-950 hover:bg-lime-200">{closeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، إنهاء"}</Button></div></section>}{closingStage === "closed" && <section className="border-t border-lime-300/20 bg-lime-300/[0.06] p-4"><p className="mb-2 text-xs font-medium text-lime-100">كيف تقيم تجربتك؟</p><div className="flex gap-1" dir="ltr">{[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => submitRating(star)} disabled={Boolean(rating)} className="rounded p-1 text-amber-300 disabled:cursor-default"><Star className={`h-6 w-6 ${rating && star <= rating ? "fill-current" : ""}`} /></button>)}</div>{rating && <p className="mt-2 text-[11px] text-lime-200">شكراً لتقييمك.</p>}</section>}<footer className="border-t border-white/[0.07] p-3">{selectedAttachment && <div className="mb-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-slate-200"><div className="flex items-center gap-2">{selectedAttachment.type === "image" ? <ImageIcon className="h-4 w-4 text-cyan-300" /> : selectedAttachment.type === "audio" ? <button type="button" onClick={togglePreviewPlay} className="rounded-full bg-lime-300 p-1.5 text-slate-950">{isPlayingPreview ? <Square className="h-3 w-3 fill-current" /> : <Mic className="h-3 w-3" />}</button> : <Paperclip className="h-4 w-4 text-slate-300" />}<span className="max-w-[180px] truncate">{selectedAttachment.name}</span></div><button type="button" onClick={() => setSelectedAttachment(undefined)} className="text-slate-400"><X className="h-4 w-4" /></button></div>}<form onSubmit={send} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-1.5 shadow-inner shadow-black/20"><input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" /><button type="button" disabled={composerDisabled} onClick={() => fileInputRef.current?.click()} className="p-1 text-slate-400 transition hover:text-cyan-100 disabled:opacity-40" aria-label="إرفاق ملف"><Paperclip className="h-4 w-4" /></button>{isRecording ? <div className="flex items-center gap-1 rounded-xl bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200"><span>تسجيل...</span><button type="button" onClick={stopRecording}><Square className="h-3 w-3 fill-current" /></button><button type="button" onClick={cancelRecording}><X className="h-3 w-3" /></button></div> : <button type="button" disabled={composerDisabled} onClick={startRecording} className="p-1 text-slate-400 transition hover:text-cyan-100 disabled:opacity-40" aria-label="رسالة صوتية"><Mic className="h-4 w-4" /></button>}<Input value={message} disabled={composerDisabled} onChange={event => setMessage(event.target.value)} placeholder={isHandoffActive ? "أدخل بياناتك أعلاه" : closingStage !== "idle" ? "اختر أحد الخيارات أعلاه" : "اكتب استفسارك هنا..."} className="h-9 border-0 bg-transparent px-1 text-sm text-white shadow-none focus-visible:ring-0 disabled:opacity-50" /><Button type="submit" disabled={composerDisabled || (!message.trim() && !selectedAttachment) || replyMutation.isPending} className="h-9 w-9 rounded-xl bg-lime-300 p-0 text-slate-950 transition hover:bg-lime-200 active:scale-95">{replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}</Button></form><div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500"><span>ردود قصيرة ودقيقة من Neon AI</span>{!isHandoffActive && closingStage === "idle" ? <button onClick={askForMoreHelp} className="transition hover:text-slate-300">إنهاء المحادثة</button> : <span>{isHandoffActive ? "الرد الآلي متوقف" : "اختر الإجابة المناسبة أعلاه"}</span>}</div></footer></div></div></div>;
}
