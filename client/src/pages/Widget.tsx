import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Bot, ChevronDown, Loader2, MessageCircle, Send, Sparkles, UserRound, X, Paperclip, Mic, Square, Image as ImageIcon } from "lucide-react";
import { FormEvent, useState, useRef } from "react";
import { useRoute } from "wouter";

export default function Widget() {
  const [, params] = useRoute("/widget/:agentId");
  const agentId = Number(params?.agentId);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "customer" | "agent"; content: string }>>([{ sender: "agent", content: "هلا! أنا مساعدك الذكي. كيف أقدر أخدمك اليوم؟" }]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", phone: "" });
  const [selectedAttachment, setSelectedAttachment] = useState<{ name: string; type: string; url?: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedAttachment({
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "file"
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setSelectedAttachment({
          name: "رسالة صوتية مسجلة.webm",
          type: "audio",
          url: audioUrl
        });
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("الرجاء السماح بالوصول إلى الميكروفون.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePreviewPlay = () => {
    if (!selectedAttachment?.url) return;
    if (isPlayingPreview) {
      previewAudioRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(selectedAttachment.url);
        previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      }
      previewAudioRef.current.play().catch(() => {});
      setIsPlayingPreview(true);
    }
  };

  const replyMutation = trpc.chat.publicReply.useMutation({
    onSuccess: result => {
      setConversationId(result.conversationId ?? undefined);
      setMessages(current => [...current, { sender: "agent", content: result.content }]);
      if (result.escalated) setShowLeadForm(true);
    },
    onError: () => setMessages(current => [...current, { sender: "agent", content: "أعتذر، صار خلل بسيط. جرّب مرة ثانية أو اترك بياناتك ونتواصل معك." }])
  });

  const send = (event: FormEvent) => {
    event.preventDefault();
    const value = message.trim();
    if ((!value && !selectedAttachment) || !agentId || replyMutation.isPending) return;

    let finalContent = value;
    if (selectedAttachment) {
      const prefix = selectedAttachment.type === "image" ? "[مرفق صورة]" : selectedAttachment.type === "audio" ? "[مرفق رسالة صوتية]" : "[مرفق ملف]";
      finalContent = value ? `${value} ${prefix} (${selectedAttachment.name})` : `${prefix} (${selectedAttachment.name})`;
      setSelectedAttachment(null);
    }

    setMessages(current => [...current, { sender: "customer", content: finalContent }]);
    setMessage("");
    replyMutation.mutate({
      agentId,
      conversationId,
      message: finalContent,
      customerName: lead.name || undefined,
      customerEmail: lead.email || undefined,
      customerPhone: lead.phone || undefined
    });
  };
  return <div className="min-h-screen bg-[#050d18] p-4" dir="rtl"><div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md items-end justify-center"><div className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1728] shadow-2xl shadow-cyan-950/30"><div className="relative overflow-hidden bg-gradient-to-br from-[#123047] to-[#0d1b2d] px-5 py-5"><div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/15 blur-2xl" /><div className="relative flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-300 text-slate-950 shadow-lg shadow-lime-300/10"><Bot className="h-5 w-5" /></div><div className="flex-1"><p className="text-sm font-semibold text-white">Neon AI Assistant</p><div className="mt-1 flex items-center gap-2 text-[11px] text-lime-200"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> متصل الآن</div></div><button className="text-slate-400 hover:text-white" aria-label="Close widget"><X className="h-4 w-4" /></button></div></div><div className="flex max-h-[55vh] min-h-[380px] flex-col gap-4 overflow-y-auto p-5">{messages.map((item, index) => <div key={`${item.sender}-${index}`} className={`flex ${item.sender === "customer" ? "justify-start" : "justify-end"}`}><div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.sender === "customer" ? "rounded-tr-md bg-white/[0.08] text-slate-200" : "rounded-tl-md bg-cyan-300/10 text-cyan-100"}`}><div className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-500">{item.sender === "customer" ? <UserRound className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-lime-300" />}{item.sender === "customer" ? "أنت" : "Neon AI"}</div>{item.content}</div></div>)}{replyMutation.isPending && <div className="flex justify-end"><div className="rounded-2xl rounded-tl-md bg-cyan-300/10 px-4 py-3 text-cyan-100"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}</div>{showLeadForm && <div className="border-t border-white/[0.07] bg-amber-300/[0.04] p-4"><div className="mb-3 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-amber-300" /><p className="text-xs font-medium text-amber-100">خلّنا نوصلك مع الفريق</p></div><div className="grid gap-2"><Input value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} placeholder="الاسم" className="h-9 border-white/10 bg-white/[0.05] text-xs text-white" /><Input value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} placeholder="البريد الإلكتروني" className="h-9 border-white/10 bg-white/[0.05] text-xs text-white" /><Input value={lead.phone} onChange={e => setLead({ ...lead, phone: e.target.value })} placeholder="رقم الجوال" className="h-9 border-white/10 bg-white/[0.05] text-xs text-white" /></div></div>}<div className="border-t border-white/[0.07] p-3">
  {selectedAttachment && (
    <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-xs text-slate-200 w-full justify-between border border-white/10">
      <div className="flex items-center gap-2.5">
        {selectedAttachment.type === "image" ? (
          <ImageIcon className="h-4 w-4 text-cyan-300 shrink-0" />
        ) : selectedAttachment.type === "audio" ? (
          <button type="button" onClick={togglePreviewPlay} className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-300 text-slate-950 hover:bg-lime-200 shrink-0">
            {isPlayingPreview ? <Square className="h-3 w-3 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <Paperclip className="h-4 w-4 text-slate-300 shrink-0" />
        )}
        <div className="flex flex-col">
          <span className="max-w-[160px] truncate font-medium">{selectedAttachment.name}</span>
          {selectedAttachment.type === "audio" && (
            <span className="text-[10px] text-lime-300">{isPlayingPreview ? "جاري الاستماع للتسجيل..." : "انقر للاستماع قبل الإرسال"}</span>
          )}
        </div>
      </div>
      <button type="button" onClick={() => { if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; } setIsPlayingPreview(false); setSelectedAttachment(null); }} className="text-slate-400 hover:text-white p-1" title="حذف المرفق">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )}
  <form onSubmit={send} className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-2xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-cyan-300">
    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-cyan-300 transition-colors p-1" title="إرفاق ملف أو صورة">
      <Paperclip className="h-4 w-4" />
    </button>
    <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`transition-colors p-1 ${isRecording ? "text-red-400 animate-bounce" : "text-slate-400 hover:text-lime-300"}`} title={isRecording ? "إيقاف التسجيل" : "تسجيل رسالة صوتية"}>
      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
    <Input value={message} onChange={e => setMessage(e.target.value)} placeholder={isRecording ? "جاري التسجيل الصوتي..." : "اكتب استفسارك هنا..."} className="h-9 border-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus-visible:ring-0 px-1 shadow-none" />
    <Button type="submit" disabled={(!message.trim() && !selectedAttachment) || replyMutation.isPending} className="h-9 w-9 shrink-0 rounded-xl bg-lime-300 p-0 text-slate-950 hover:bg-lime-200">
      {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
    </Button>
  </form>
  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
    <span>مدعوم بواسطة Neon AI Agents</span>
    <button onClick={() => setShowLeadForm(value => !value)} className="hover:text-slate-300">{showLeadForm ? <ChevronDown className="inline h-3 w-3" /> : "تواصل مع الفريق"}</button>
  </div>
</div></div></div></div>;
}
