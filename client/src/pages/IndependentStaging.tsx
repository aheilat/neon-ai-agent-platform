import { Button } from "@/components/ui/button";
import { closeIndependentConversation, requestIndependentAgentReply } from "@/lib/independentChat";
import {
  addIndependentKnowledgeItem,
  addIndependentImageKnowledge,
  analyzeIndependentCompanyWebsite,
  applyIndependentWebsiteProposal,
  addIndependentTextFileKnowledge,
  createIndependentHandoffRequest,
  createIndependentWorkspaceAgent,
  getIndependentAgentConversation,
  listIndependentAgentConversations,
  listIndependentHandoffRequests,
  saveIndependentHandoffContact,
  updateIndependentAgentProfile,
  type IndependentAgentProfile,
  type IndependentWebsiteProposal,
} from "@/lib/independentSetup";
import { getIndependentSupabaseBrowserClient } from "@/lib/supabase";
import { Bot, CheckCircle2, CirclePlus, Copy, ExternalLink, FileText, Globe2, ImageIcon, Loader2, LogOut, MessageSquareText, Mic, Paperclip, RefreshCw, Save, Send, ShieldCheck, Sparkles, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

type IndependentAgent = {
  id: number;
  name: string;
  description: string | null;
  persona: string | null;
  tone: "friendly" | "professional" | "direct";
  language: "ar" | "en" | "bilingual";
  llmModel: string;
  status: "active" | "paused" | "draft";
  capabilitiesJson?: Record<string, unknown> | null;
};

type IndependentKnowledgeItem = {
  id: number;
  title: string;
  content: string;
  category: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

type IndependentHandoffLead = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

type IndependentConversationSummary = {
  id: number;
  agentId: number;
  tenantId: number;
  channel: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: "active" | "escalated" | "resolved";
  createdAt: string;
  updatedAt: string;
  agentName: string;
  lastMessageContent: string | null;
  lastMessageSender: "customer" | "agent" | "system" | "human" | null;
  lastMessageCreatedAt: string | null;
  leadId: number | null;
  leadStatus: string | null;
};

type IndependentConversationMessage = {
  id: number;
  conversationId: number;
  sender: "customer" | "agent" | "system" | "human";
  content: string;
  createdAt: string;
};

type IndependentWorkspaceResponse = {
  user: { email: string | null; name: string | null };
  workspace: { name: string; slug: string };
  defaultAgent: IndependentAgent;
  agents: IndependentAgent[];
};

type WorkspaceChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function profileFromAgent(agent: IndependentAgent): IndependentAgentProfile {
  return {
    name: agent.name,
    description: agent.description,
    persona: agent.persona,
    tone: agent.tone,
    language: agent.language,
    status: agent.status,
  };
}

const newAgentProfile: IndependentAgentProfile = {
  name: "وكيل شركتي",
  description: "وكيل يرد على العملاء من المعرفة المعتمدة للشركة.",
  persona: "مساعد خدمة عملاء عربي واضح وودود. لا يخترع معلومات، ويحوّل الحالات التي تحتاج قراراً بشرياً إلى الفريق.",
  tone: "friendly",
  language: "bilingual",
  status: "active",
};

const independentWorkspaceNavigation = [
  { href: "/agents", label: "الوكلاء", sectionId: "independent-agents" },
  { href: "/knowledge", label: "المعرفة", sectionId: "independent-knowledge" },
  { href: "/conversations", label: "الحوار والطلبات", sectionId: "independent-conversations" },
  { href: "/channels", label: "القنوات", sectionId: "independent-channels" },
  { href: "/settings", label: "الإعدادات", sectionId: "independent-settings" },
] as const;

function serverMessage(payload: unknown, fallback: string) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export default function IndependentStaging() {
  const [location, setLocation] = useLocation();
  const [data, setData] = useState<IndependentWorkspaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [profile, setProfile] = useState<IndependentAgentProfile>(newAgentProfile);
  const [knowledge, setKnowledge] = useState<IndependentKnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeDraft, setKnowledgeDraft] = useState({ title: "", content: "", category: "business", sourceUrl: "", sourceTitle: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [addingKnowledge, setAddingKnowledge] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteProposal, setWebsiteProposal] = useState<IndependentWebsiteProposal | null>(null);
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [applyingWebsiteProposal, setApplyingWebsiteProposal] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [sendingAgentId, setSendingAgentId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<WorkspaceChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationStatus, setConversationStatus] = useState<"active" | "escalated" | "resolved">("active");
  const [closingConversation, setClosingConversation] = useState(false);
  const [addingAttachment, setAddingAttachment] = useState(false);
  const [attachmentStatus, setAttachmentStatus] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [handoffContact, setHandoffContact] = useState({ name: "", phone: "", email: "" });
  const [savingHandoffContact, setSavingHandoffContact] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffRequest, setHandoffRequest] = useState({ name: "", phone: "", email: "", notes: "", consent: false });
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const [handoffLeads, setHandoffLeads] = useState<IndependentHandoffLead[]>([]);
  const [handoffLeadsLoading, setHandoffLeadsLoading] = useState(false);
  const [handoffLeadsError, setHandoffLeadsError] = useState<string | null>(null);
  const [inboxConversations, setInboxConversations] = useState<IndependentConversationSummary[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [selectedInboxConversation, setSelectedInboxConversation] = useState<IndependentConversationSummary | null>(null);
  const [inboxMessages, setInboxMessages] = useState<IndependentConversationMessage[]>([]);
  const [inboxMessagesLoading, setInboxMessagesLoading] = useState(false);
  const [closingInboxConversationId, setClosingInboxConversationId] = useState<number | null>(null);
  const [widgetCopyStatus, setWidgetCopyStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceStopRequestedRef = useRef(false);

  const selectedAgent = useMemo(
    () => data?.agents.find((agent) => agent.id === selectedAgentId) ?? data?.defaultAgent ?? null,
    [data, selectedAgentId],
  );

  const accessToken = useCallback(async () => {
    const client = getIndependentSupabaseBrowserClient();
    const { data: sessionData } = await client?.auth.getSession() ?? { data: { session: null } };
    return sessionData.session?.access_token;
  }, []);

  const loadWorkspace = useCallback(async () => {
    const client = getIndependentSupabaseBrowserClient();
    if (!client) {
      setError("هذه الصفحة متاحة فقط بعد ضبط Supabase في البيئة المستقلة.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const token = await accessToken();
    if (!token) {
      setLocation("/login");
      return;
    }

    try {
      const response = await fetch("/api/external/agents", { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as unknown;
      if (!response.ok) throw new Error(serverMessage(payload, "تعذر تحميل مساحة العمل المستقلة."));
      const workspace = payload as IndependentWorkspaceResponse;
      setData(workspace);
      setSelectedAgentId((current) => current && workspace.agents.some((agent) => agent.id === current) ? current : workspace.defaultAgent.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل مساحة العمل المستقلة.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, setLocation]);

  const loadKnowledge = useCallback(async (agentId: number) => {
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setKnowledgeLoading(true);
    try {
      const response = await fetch(`/api/external/agents/${agentId}/knowledge`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { knowledge?: IndependentKnowledgeItem[]; error?: string };
      if (!response.ok) throw new Error(serverMessage(payload, "تعذر تحميل المعرفة المعتمدة."));
      setKnowledge(payload.knowledge ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل المعرفة المعتمدة.");
    } finally {
      setKnowledgeLoading(false);
    }
  }, [accessToken, setLocation]);

  const loadHandoffRequests = useCallback(async (agentId: number) => {
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setHandoffLeadsLoading(true);
    setHandoffLeadsError(null);
    try {
      const payload = await listIndependentHandoffRequests<{ leads: IndependentHandoffLead[] }>(token, agentId);
      setHandoffLeads(payload.leads ?? []);
    } catch (reason) {
      setHandoffLeads([]);
      setHandoffLeadsError(reason instanceof Error ? reason.message : "تعذر تحميل طلبات التحويل البشري.");
    } finally {
      setHandoffLeadsLoading(false);
    }
  }, [accessToken, setLocation]);

  const loadInboxConversations = useCallback(async (agentId: number) => {
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setInboxLoading(true);
    setInboxError(null);
    try {
      const payload = await listIndependentAgentConversations<{ conversations: IndependentConversationSummary[] }>(token, agentId);
      setInboxConversations(payload.conversations ?? []);
    } catch (reason) {
      setInboxConversations([]);
      setInboxError(reason instanceof Error ? reason.message : "تعذر تحميل محادثات هذا الوكيل.");
    } finally {
      setInboxLoading(false);
    }
  }, [accessToken, setLocation]);

  const openInboxConversation = async (conversation: IndependentConversationSummary) => {
    if (!selectedAgent) return;
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setSelectedInboxConversation(conversation);
    setInboxMessagesLoading(true);
    setInboxError(null);
    try {
      const payload = await getIndependentAgentConversation<{ conversation: IndependentConversationSummary; messages: IndependentConversationMessage[] }>(token, selectedAgent.id, conversation.id);
      setSelectedInboxConversation((current) => current?.id === conversation.id ? { ...conversation, ...payload.conversation } : current);
      setInboxMessages(payload.messages ?? []);
    } catch (reason) {
      setInboxMessages([]);
      setInboxError(reason instanceof Error ? reason.message : "تعذر فتح رسائل المحادثة.");
    } finally {
      setInboxMessagesLoading(false);
    }
  };

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  useEffect(() => {
    const target = independentWorkspaceNavigation.find((item) => item.href === location);
    if (!target || loading) return;
    const timer = window.setTimeout(() => document.getElementById(target.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    return () => window.clearTimeout(timer);
  }, [loading, location]);

  useEffect(() => {
    if (!selectedAgent) return;
    setProfile(profileFromAgent(selectedAgent));
    void loadKnowledge(selectedAgent.id);
    void loadHandoffRequests(selectedAgent.id);
    void loadInboxConversations(selectedAgent.id);
    setSelectedInboxConversation(null);
    setInboxMessages([]);
    setChatDraft("");
    setChatMessages([]);
    setChatError(null);
    setConversationId(null);
    setConversationStatus("active");
    setAttachmentStatus(null);
    setAudioPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
    setVoiceTranscript("");
    const contact = (selectedAgent.capabilitiesJson?.handoffContact ?? {}) as Record<string, unknown>;
    setHandoffContact({ name: typeof contact.name === "string" ? contact.name : "", phone: typeof contact.phone === "string" ? contact.phone : "", email: typeof contact.email === "string" ? contact.email : "" });
    setHandoffOpen(false);
    setHandoffStatus(null);
  }, [loadHandoffRequests, loadInboxConversations, loadKnowledge, selectedAgent]);

  const signOut = async () => {
    await getIndependentSupabaseBrowserClient()?.auth.signOut();
    setLocation("/login");
  };

  const saveAgentProfile = async () => {
    if (!selectedAgent || !profile.name.trim() || !profile.persona?.trim()) {
      setError("اكتب اسم الوكيل وشخصيته قبل الحفظ.");
      return;
    }
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setSavingProfile(true);
    setError(null);
    try {
      await updateIndependentAgentProfile(token, selectedAgent.id, {
        ...profile,
        name: profile.name.trim(),
        description: profile.description?.trim() || null,
        persona: profile.persona.trim(),
      });
      await loadWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ إعدادات الوكيل.");
    } finally {
      setSavingProfile(false);
    }
  };

  const addKnowledge = async () => {
    if (!selectedAgent || !knowledgeDraft.title.trim() || !knowledgeDraft.content.trim()) {
      setError("أدخل عنوان المعرفة والنص الذي تريد أن يعتمد عليه الوكيل.");
      return;
    }
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setAddingKnowledge(true);
    setError(null);
    try {
      const item = await addIndependentKnowledgeItem<IndependentKnowledgeItem>(token, selectedAgent.id, {
        title: knowledgeDraft.title.trim(),
        content: knowledgeDraft.content.trim(),
        category: knowledgeDraft.category.trim() || "business",
        sourceUrl: knowledgeDraft.sourceUrl.trim() || null,
        sourceTitle: knowledgeDraft.sourceTitle.trim() || null,
      });
      setKnowledge((current) => [item, ...current]);
      setKnowledgeDraft({ title: "", content: "", category: "business", sourceUrl: "", sourceTitle: "" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المعرفة.");
    } finally {
      setAddingKnowledge(false);
    }
  };

  const createAdditionalAgent = async () => {
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setCreatingAgent(true);
    setError(null);
    try {
      const created = await createIndependentWorkspaceAgent<IndependentAgent>(token, {
        ...newAgentProfile,
        name: `وكيل جديد ${data?.agents.length ? data.agents.length + 1 : 2}`,
      });
      await loadWorkspace();
      setSelectedAgentId(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إنشاء وكيل جديد.");
    } finally {
      setCreatingAgent(false);
    }
  };

  const analyzeCompanyWebsite = async () => {
    const candidate = websiteUrl.trim();
    if (!candidate) return setError("أدخل رابط موقع شركتك أولاً.");
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setAnalyzingWebsite(true);
    setError(null);
    setWebsiteProposal(null);
    try {
      const proposal = await analyzeIndependentCompanyWebsite(token, candidate);
      setWebsiteProposal(proposal);
      setWebsiteUrl(proposal.websiteUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحليل موقع الشركة.");
    } finally {
      setAnalyzingWebsite(false);
    }
  };

  const applyWebsiteProposal = async () => {
    if (!websiteProposal) return;
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setApplyingWebsiteProposal(true);
    setError(null);
    try {
      const result = await applyIndependentWebsiteProposal<{ agent: IndependentAgent }>(token, websiteProposal);
      await loadWorkspace();
      setSelectedAgentId(result.agent.id);
      setWebsiteProposal(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إنشاء وكيل شركتك من الموقع.");
    } finally {
      setApplyingWebsiteProposal(false);
    }
  };

  const addKnowledgeAttachment = async (file: File) => {
    if (!selectedAgent) return;
    if (file.size > 5 * 1024 * 1024) return setAttachmentStatus("تعذر رفع المرفق: الحد الأقصى 5 MB.");
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setAddingAttachment(true);
    setAttachmentStatus(`جارٍ حفظ ${file.name} ضمن معرفة الوكيل…`);
    setError(null);
    try {
      if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        });
        const result = await addIndependentImageKnowledge<{ knowledge: IndependentKnowledgeItem; extractedText: string }>(token, selectedAgent.id, { fileName: file.name, mediaType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", dataUrl });
        setKnowledge((current) => [result.knowledge, ...current]);
        setAttachmentStatus(`تم حفظ ${file.name} واستخراج معرفة منه بنجاح.`);
        return;
      }
      const isText = file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name);
      if (!isText) throw new Error("يدعم الوكيل الآن الصور وملفات TXT وMD وCSV وJSON. حوّل PDF أو Word إلى نص قبل إرفاقه.");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("تعذر قراءة الملف."));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const mediaType = file.type === "text/markdown" || file.type === "text/csv" || file.type === "application/json" ? file.type : "text/plain";
      const result = await addIndependentTextFileKnowledge<{ knowledge: IndependentKnowledgeItem }>(token, selectedAgent.id, {
        fileName: file.name, mediaType, dataUrl,
      });
      setKnowledge((current) => [result.knowledge, ...current]);
      setAttachmentStatus(`تم حفظ ${file.name} ضمن معرفة الوكيل بنجاح.`);
    } catch (reason) {
      setAttachmentStatus(reason instanceof Error ? `تعذر إضافة المرفق: ${reason.message}` : "تعذر إضافة المرفق إلى معرفة الوكيل.");
    } finally {
      setAddingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startVoiceCapture = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return setChatError("التسجيل الصوتي غير مدعوم في هذا المتصفح.");
    const browserWindow = window as typeof window & { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) return setChatError("استخدم Chrome على الهاتف لتفعيل تحويل الصوت إلى نص قبل الإرسال.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setVoiceTranscript("");
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob); });
      };
      const recognition = new Recognition();
      speechRecognitionRef.current = recognition;
      voiceStopRequestedRef.current = false;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = selectedAgent?.language === "en" ? "en-US" : "ar-SA";
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).slice(event.resultIndex).filter((result) => result.isFinal).map((result) => result[0]?.transcript ?? "").join(" ").trim();
        if (transcript) setVoiceTranscript((current) => current ? `${current} ${transcript}` : transcript);
      };
      recognition.onerror = () => setChatError("تعذر تحويل الصوت إلى نص. يمكنك كتابة الرسالة أو المحاولة مجدداً.");
      recognition.onend = () => {
        if (!voiceStopRequestedRef.current && mediaRecorderRef.current?.state === "recording") {
          try { recognition.start(); return; } catch { /* the browser may already be restarting recognition */ }
        }
        setIsRecording(false);
      };
      recorder.start();
      recognition.start();
      setIsRecording(true);
      setChatError(null);
    } catch {
      setChatError("اسمح بالوصول إلى الميكروفون لتسجيل رسالتك الصوتية.");
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

  const useVoiceTranscript = () => {
    const transcript = voiceTranscript.trim();
    if (!transcript) return setChatError("لم يصل نص مسموع من المتصفح. جرّب Chrome أو اكتب رسالتك.");
    setChatDraft((current) => current ? `${current} ${transcript}` : transcript);
    setChatError(null);
  };

  const sendTestMessage = async (quickMessage?: string) => {
    if (!selectedAgent) return;
    if (conversationStatus !== "active" && conversationId) return setChatError(conversationStatus === "escalated" ? "تم تحويل هذه المحادثة إلى الفريق البشري؛ لن يرسل الوكيل رداً آلياً آخر." : "هذه المحادثة مغلقة.");
    const message = (quickMessage ?? chatDraft).trim();
    if (!message) return setChatError("اكتب رسالة قصيرة لاختبار رد الوكيل.");
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setSendingAgentId(selectedAgent.id);
    setChatError(null);
    setChatMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: message }]);
    if (!quickMessage) setChatDraft("");
    try {
      const result = await requestIndependentAgentReply({ accessToken: token, agentId: selectedAgent.id, message, conversationId: conversationId ?? undefined });
      setConversationId(result.conversation.id);
      setConversationStatus(result.conversation.status);
      setChatMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: result.reply }]);
      void loadInboxConversations(selectedAgent.id);
    } catch (reason) {
      setChatError(reason instanceof Error ? reason.message : "تعذر الحصول على رد Claude.");
    } finally {
      setSendingAgentId(null);
    }
  };

  const sendVoiceTranscript = async () => {
    const transcript = voiceTranscript.trim();
    if (!transcript) return setChatError("لم يصل نص مسموع من المتصفح. استخدم زر «استخدم النص في المحادثة» بعد ظهور النص.");
    await sendTestMessage(transcript);
  };

  const saveHandoffSettings = async () => {
    if (!selectedAgent || (!handoffContact.phone.trim() && !handoffContact.email.trim())) return setError("أضف رقم هاتف أو بريد العمل قبل حفظ التحويل البشري.");
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setSavingHandoffContact(true);
    setError(null);
    try {
      await saveIndependentHandoffContact(token, selectedAgent.id, handoffContact);
      await loadWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ معلومات التحويل البشري.");
    } finally {
      setSavingHandoffContact(false);
    }
  };

  const submitHandoffRequest = async () => {
    if (!selectedAgent || !handoffRequest.name.trim() || (!handoffRequest.phone.trim() && !handoffRequest.email.trim()) || !handoffRequest.consent) return setHandoffStatus("اكتب الاسم ورقم الهاتف أو البريد، ثم وافق على مشاركة البيانات مع هذه الشركة.");
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setHandoffStatus("جارٍ تسجيل طلب التواصل…");
    try {
      const result = await createIndependentHandoffRequest<{ contact: { name: string | null; phone: string | null; email: string | null }; conversation: { id: number; status: "escalated" } | null }>(token, selectedAgent.id, { ...handoffRequest, conversationId });
      const directContact = [result.contact.name, result.contact.phone, result.contact.email].filter(Boolean).join(" · ");
      const confirmation = directContact ? `تم تسجيل طلبك وسيتم التواصل معك عبر فريق ${directContact}.` : "تم تسجيل طلبك لفريق هذه الشركة. لم تُضبط وسيلة تواصل مباشرة بعد.";
      setChatMessages([]);
      setChatDraft("");
      setVoiceTranscript("");
      setAudioPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
      if (result.conversation) {
        setConversationId(result.conversation.id);
        setConversationStatus("escalated");
      }
      await loadHandoffRequests(selectedAgent.id);
      await loadInboxConversations(selectedAgent.id);
      setHandoffStatus(`${confirmation} تمت إزالة سجل الدردشة من شاشة الاختبار.`);
      setHandoffOpen(false);
      setHandoffRequest({ name: "", phone: "", email: "", notes: "", consent: false });
    } catch (reason) {
      setHandoffStatus(reason instanceof Error ? reason.message : "تعذر حفظ طلب التواصل الآن.");
    }
  };

  const closeConversation = async () => {
    if (!selectedAgent || !conversationId || conversationStatus !== "active") return;
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setClosingConversation(true);
    setChatError(null);
    try {
      await closeIndependentConversation(token, selectedAgent.id, conversationId);
      setConversationStatus("resolved");
      setConversationId(null);
      setChatMessages([]);
      setChatDraft("");
      setVoiceTranscript("");
      setAudioPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
      setChatError("تم إغلاق المحادثة وحذف سجلها من شاشة الاختبار. اكتب رسالة جديدة لبدء اختبار جديد.");
      await loadInboxConversations(selectedAgent.id);
    } catch (reason) {
      setChatError(reason instanceof Error ? reason.message : "تعذر إغلاق المحادثة الآن.");
    } finally {
      setClosingConversation(false);
    }
  };

  const closeInboxConversation = async () => {
    if (!selectedAgent || !selectedInboxConversation || selectedInboxConversation.status !== "active") return;
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setClosingInboxConversationId(selectedInboxConversation.id);
    setInboxError(null);
    try {
      await closeIndependentConversation(token, selectedAgent.id, selectedInboxConversation.id);
      setSelectedInboxConversation((current) => current ? { ...current, status: "resolved" } : current);
      await loadInboxConversations(selectedAgent.id);
    } catch (reason) {
      setInboxError(reason instanceof Error ? reason.message : "تعذر إغلاق هذه المحادثة.");
    } finally {
      setClosingInboxConversationId(null);
    }
  };

  const copyWidgetSnippet = async () => {
    if (!selectedAgent) return;
    const snippet = `<script src="${window.location.origin}/neon-agent-widget.js" data-agent-id="${selectedAgent.id}"></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
      setWidgetCopyStatus("تم نسخ كود الـWidget الخاص بهذا الوكيل.");
    } catch {
      setWidgetCopyStatus("تعذر النسخ تلقائياً. انسخ الكود الظاهر يدوياً.");
    }
  };

  const handoffInbox = selectedAgent ? <section id="independent-conversations" className="mb-6 scroll-mt-5 rounded-3xl border border-cyan-200/20 bg-cyan-300/[0.06] p-5 sm:p-6">
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><MessageSquareText className="h-5 w-5 text-cyan-200" />صندوق محادثات الوكيل</h2><p className="mt-1 text-sm leading-6 text-slate-300">سجل المحادثات المحفوظة للوكيل <strong>{selectedAgent.name}</strong> فقط. اختر محادثة لقراءة رسائلها.</p></div><Button type="button" variant="outline" size="sm" onClick={() => void loadInboxConversations(selectedAgent.id)} disabled={inboxLoading} className="border-cyan-200/30 text-cyan-100 hover:bg-cyan-300/10">{inboxLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}تحديث المحادثات</Button></div>
      {inboxError ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{inboxError}</p> : inboxLoading ? <p className="mt-4 text-sm text-slate-400">جارٍ تحميل محادثات الوكيل…</p> : inboxConversations.length ? <div className="mt-4 grid gap-2 lg:grid-cols-2">{inboxConversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => void openInboxConversation(conversation)} className={`rounded-2xl border p-3 text-right transition ${selectedInboxConversation?.id === conversation.id ? "border-cyan-200/60 bg-cyan-300/10" : "border-white/10 bg-slate-950/45 hover:border-white/25"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-white">{conversation.customerName || conversation.customerEmail || conversation.customerPhone || "زائر الـWidget"}</p><p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-400">{conversation.lastMessageContent || "لا توجد رسالة محفوظة بعد."}</p></div><div className="shrink-0 text-left"><span className={`rounded-full px-2 py-1 text-xs font-bold ${conversation.status === "active" ? "bg-cyan-300/10 text-cyan-100" : conversation.status === "escalated" ? "bg-amber-300/10 text-amber-100" : "bg-slate-300/10 text-slate-300"}`}>{conversation.status === "active" ? "مفتوحة" : conversation.status === "escalated" ? "محوّلة" : "مغلقة"}</span><p className="mt-2 text-xs text-slate-500">{new Date(conversation.updatedAt).toLocaleString("ar")}</p></div></div>{conversation.leadStatus && <p className="mt-2 text-xs text-lime-100">طلب تواصل: {conversation.leadStatus === "new" ? "جديد" : conversation.leadStatus}</p>}</button>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-white/15 p-4 text-sm leading-7 text-slate-400">لا توجد محادثات محفوظة لهذا الوكيل بعد. ستظهر هنا محادثات الاختبار والـWidget التي تستخدم هذا الوكيل فقط.</p>}
      {selectedInboxConversation && <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">رسائل المحادثة #{selectedInboxConversation.id}</p><p className="mt-1 text-xs text-slate-400">الحالة: {selectedInboxConversation.status === "active" ? "مفتوحة" : selectedInboxConversation.status === "escalated" ? "محوّلة إلى الفريق" : "مغلقة"}</p></div><div className="flex gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedInboxConversation(null); setInboxMessages([]); }} className="text-slate-300 hover:bg-white/10 hover:text-white">إخفاء</Button>{selectedInboxConversation.status === "active" && <Button type="button" variant="outline" size="sm" onClick={() => void closeInboxConversation()} disabled={closingInboxConversationId === selectedInboxConversation.id} className="border-cyan-200/30 text-cyan-100 hover:bg-cyan-300/10">{closingInboxConversationId === selectedInboxConversation.id ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-1 h-4 w-4" />}إغلاق</Button>}</div></div>{inboxMessagesLoading ? <p className="mt-4 text-sm text-slate-400">جارٍ تحميل الرسائل…</p> : inboxMessages.length ? <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">{inboxMessages.map((message) => <div key={message.id} className={`rounded-2xl px-3 py-2 text-sm leading-6 ${message.sender === "customer" ? "bg-cyan-300 text-slate-950" : message.sender === "human" ? "bg-lime-300/15 text-lime-50" : "border border-white/10 bg-white/[0.045] text-slate-100"}`}><div className="mb-1 flex items-center justify-between gap-2 text-xs opacity-75"><span>{message.sender === "customer" ? "الزائر" : message.sender === "agent" ? selectedAgent.name : message.sender === "human" ? "الفريق" : "النظام"}</span><time>{new Date(message.createdAt).toLocaleString("ar")}</time></div><p dir="auto" className="whitespace-pre-wrap">{message.content}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-400">لا توجد رسائل قابلة للعرض في هذه المحادثة.</p>}</div>}
    </div>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 font-bold"><MessageSquareText className="h-5 w-5 text-cyan-200" />طلبات التحويل البشري</h2><p className="mt-1 text-sm leading-6 text-slate-300">طلبات الزوار المحفوظة للوكيل <strong>{selectedAgent.name}</strong> فقط. لا تُعرض بيانات وكلاء أو شركات أخرى.</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => void loadHandoffRequests(selectedAgent.id)} disabled={handoffLeadsLoading} className="border-cyan-200/30 text-cyan-100 hover:bg-cyan-300/10">{handoffLeadsLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}تحديث الطلبات</Button>
    </div>
    {handoffLeadsError ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{handoffLeadsError}</p> : handoffLeadsLoading ? <p className="mt-4 text-sm text-slate-400">جارٍ تحميل الطلبات الخاصة بهذا الوكيل…</p> : handoffLeads.length ? <div className="mt-5 space-y-3">{handoffLeads.map((lead) => <article key={lead.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-white">{lead.name}</p><p dir="ltr" className="mt-1 text-sm text-cyan-100">{lead.phone || lead.email || "لم يقدّم وسيلة تواصل"}</p></div><div className="text-left"><span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-xs font-bold text-lime-100">{lead.status === "new" ? "طلب جديد" : lead.status}</span><p className="mt-2 text-xs text-slate-500">{new Date(lead.createdAt).toLocaleString("ar")}</p></div></div>{lead.notes && <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-slate-300">{lead.notes}</p>}</article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-white/15 p-4 text-sm leading-7 text-slate-400">لا توجد طلبات تحويل مسجلة لهذا الوكيل بعد. عند طلب زائر التواصل من الـWidget وموافقته، سيظهر طلبه هنا.</p>}
    <p className="mt-4 text-xs leading-6 text-slate-400">هذه اللوحة تحفظ وتعرض الطلبات فقط. لا تدّعي إرسال إشعار WhatsApp أو بريد أو اتصال هاتفي، لأن قنوات الإرسال ليست مهيّأة بعد.</p>
  </section> : null;

  const workspaceSettings = selectedAgent && location === "/settings" ? <section id="independent-settings" className="mb-6 scroll-mt-5 rounded-3xl border border-lime-300/25 bg-lime-300/[0.06] p-5 sm:p-6">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lime-200" /><div><h2 className="font-bold">إعدادات التحويل البشري للوكيل المحدد</h2><p className="mt-1 text-sm leading-6 text-slate-300">احفظ جهة التواصل الخاصة بـ<strong>{selectedAgent.name}</strong> فقط. لا يُرسل النظام رسالة أو مكالمة نيابةً عنك.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><input value={handoffContact.name} onChange={(event) => setHandoffContact((current) => ({ ...current, name: event.target.value }))} placeholder="اسم القسم أو الموظف" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoffContact.phone} onChange={(event) => setHandoffContact((current) => ({ ...current, phone: event.target.value }))} placeholder="هاتف العمل" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-left text-sm text-white outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoffContact.email} onChange={(event) => setHandoffContact((current) => ({ ...current, email: event.target.value }))} placeholder="بريد العمل" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-left text-sm text-white outline-none placeholder:text-slate-500" /></div>
    <Button onClick={() => void saveHandoffSettings()} disabled={savingHandoffContact} className="mt-3 bg-lime-300 text-slate-950 hover:bg-lime-200">{savingHandoffContact ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ جهة التواصل</Button>
  </section> : null;

  return (
    <main data-independent-view={independentWorkspaceNavigation.some((item) => item.href === location) ? location.slice(1) : "workspace"} className="min-h-screen bg-[#07111f] px-4 py-5 text-white sm:px-8 sm:py-8" dir="rtl">
      <div className="mx-auto max-w-6xl">
        {handoffInbox}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Neon workspace</p><h1 className="text-xl font-bold">إعداد وكيلك الذكي</h1></div></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => void loadWorkspace()} disabled={loading} className="border-white/15 text-white hover:bg-white/10"><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button><Button variant="outline" onClick={() => void signOut()} className="border-white/15 text-white hover:bg-white/10"><LogOut className="ml-2 h-4 w-4" />خروج</Button></div>
        </header>

        <nav aria-label="أقسام مساحة العمل المستقلة" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {independentWorkspaceNavigation.map((item) => <a key={item.href} href={item.href} className={`shrink-0 rounded-full border px-3 py-2 text-sm font-bold transition ${location === item.href ? "border-cyan-200/60 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.025] text-slate-300 hover:border-white/25 hover:text-white"}`}>{item.label}</a>)}
        </nav>

        {workspaceSettings}

        {loading && <section className="py-24 text-center text-slate-300">جارٍ فتح مساحة العمل الآمنة…</section>}
        {!loading && error && <section className="mt-6 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-5"><p className="font-bold text-amber-100">نحتاج خطوة بسيطة قبل المتابعة</p><p className="mt-2 text-sm leading-7 text-amber-50/80">{error}</p></section>}

        {!loading && data && selectedAgent && <>
          <section id="independent-overview" className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-3xl border border-cyan-200/15 bg-gradient-to-l from-cyan-300/10 to-lime-300/5 p-6"><p className="text-sm text-cyan-100">مساحة العمل المستقلة</p><h2 className="mt-2 text-2xl font-semibold">{data.workspace.name}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">ابدأ بتعريف وكيلك، ثم أضف معلومات شركتك المعتمدة، وبعدها اختبر الرد قبل مشاركته مع العملاء.</p><div className="mt-5 grid gap-2 sm:grid-cols-3">{[["1", "عرّف الوكيل"], ["2", "أضف المعرفة"], ["3", "اختبر الرد"]].map(([number, label]) => <div key={number} className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3 text-sm"><span className="ml-2 text-cyan-200">{number}</span>{label}</div>)}</div></div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><ShieldCheck className="h-6 w-6 text-lime-300" /><p className="mt-3 text-sm font-bold">{data.user.name || data.user.email || "مستخدم Neon"}</p><p className="mt-1 text-xs text-slate-400">{data.workspace.slug}</p><p className="mt-5 text-xs leading-6 text-slate-400">بيانات كل مساحة عمل تبقى معزولة. لا نستخدم معرفة أي شركة أخرى في رد وكيلك.</p></div>
          </section>

          <section id="independent-agents" className="mt-6 scroll-mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 font-bold"><Bot className="h-5 w-5 text-cyan-200" /> وكلاؤك</p><p className="mt-1 text-sm text-slate-400">اختر وكيلاً أو أنشئ وكيلاً جديداً لنشاط مختلف.</p></div><Button onClick={() => void createAdditionalAgent()} disabled={creatingAgent} className="bg-lime-300 text-slate-950 hover:bg-lime-200">{creatingAgent ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CirclePlus className="ml-2 h-4 w-4" />}وكيل جديد</Button></div>
            <div className="mt-4 flex flex-wrap gap-2">{data.agents.map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(agent.id)} className={`rounded-2xl border px-4 py-3 text-right transition ${selectedAgent.id === agent.id ? "border-cyan-200/60 bg-cyan-300/15 text-white" : "border-white/10 bg-slate-950/30 text-slate-300 hover:border-white/25"}`}><span className="block text-sm font-bold">{agent.name}</span><span className="mt-1 block text-xs text-slate-400">{agent.status === "active" ? "نشط" : agent.status}</span></button>)}</div>
          </section>

          <section id="independent-widget" className="mt-6 rounded-3xl border border-cyan-200/20 bg-cyan-300/[0.06] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="flex items-center gap-2 font-bold"><MessageSquareText className="h-5 w-5 text-cyan-200" /> معاينة وWidget الوكيل</p><p className="mt-1 text-sm leading-6 text-slate-300">هذه المعاينة وكود التضمين مرتبطان بالوكيل المحدد فقط: <strong>{selectedAgent.name}</strong>.</p></div><a href={`/widget/${selectedAgent.id}`} target="_blank" rel="noreferrer"><Button type="button" variant="outline" className="border-cyan-200/30 text-cyan-100 hover:bg-cyan-300/10"><ExternalLink className="ml-2 h-4 w-4" />فتح المعاينة الحية</Button></a></div>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3 sm:flex-row sm:items-center"><code dir="ltr" className="min-w-0 flex-1 break-all text-left text-xs leading-6 text-cyan-100">{`<script src="${window.location.origin}/neon-agent-widget.js" data-agent-id="${selectedAgent.id}"></script>`}</code><Button type="button" onClick={() => void copyWidgetSnippet()} className="shrink-0 bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Copy className="ml-2 h-4 w-4" />نسخ الكود</Button></div>
            {widgetCopyStatus && <p className="mt-3 text-sm text-lime-100">{widgetCopyStatus}</p>}
          </section>

          <section id="independent-channels" className="mt-6 scroll-mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
            <div className="flex items-start gap-3"><Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" /><div><h2 className="font-bold">قنوات وكيلك</h2><p className="mt-1 text-sm leading-6 text-slate-300">هذه الحالة تخص الوكيل المحدد فقط. لا نظهر قناة على أنها متصلة قبل أن تكون جاهزة فعلياً.</p></div></div>
            <div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.08] p-4"><p className="font-bold text-lime-100">Widget الويب</p><p className="mt-2 text-sm leading-6 text-slate-300">جاهز للمعاينة والتضمين مع الوكيل المحدد.</p><a href={`/widget/${selectedAgent.id}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-lime-200 hover:text-lime-100">فتح الـWidget ←</a></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4"><p className="font-bold text-amber-100">WhatsApp / Meta</p><p className="mt-2 text-sm leading-6 text-slate-300">غير متاح الآن لأن تطبيق Meta غير نشط. لا توجد رسالة WhatsApp أو رقم متصل من هذه المنصة حتى يصبح التطبيق Live وتكتمل المراجعة.</p></div><div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><p className="font-bold text-slate-100">الهاتف والبريد</p><p className="mt-2 text-sm leading-6 text-slate-300">قنوات الإرسال لم تُهيأ بعد. يمكن للوكيل حفظ طلب تحويل بموافقة العميل فقط، من دون ادعاء إرسال مكالمة أو بريد.</p></div></div>
          </section>

          <section id="independent-website-learning" className="mt-6 rounded-3xl border border-lime-300/25 bg-gradient-to-l from-lime-300/[0.10] to-cyan-300/[0.06] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-lg font-bold"><Globe2 className="h-5 w-5 text-lime-200" />ابدأ من موقع شركتك</p><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">ضع رابط موقع شركتك العام. Neon يقرأ حتى خمس صفحات عامة فقط، ثم يقترح وكيل شركتك وقاعدة معرفته. لا يُنشأ أو يتغير الوكيل قبل مراجعتك وموافقتك.</p></div><span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-100">موقع عام فقط · Claude من الخادم</span></div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input type="url" dir="ltr" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://your-company.com" className="h-12 w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 text-left text-sm text-white outline-none ring-lime-200/70 placeholder:text-slate-500 focus:ring-2" /><Button onClick={() => void analyzeCompanyWebsite()} disabled={analyzingWebsite} className="h-12 bg-lime-300 text-slate-950 hover:bg-lime-200">{analyzingWebsite ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جارٍ تحليل الموقع…</> : <><Sparkles className="ml-2 h-4 w-4" />حلّل موقعي واقترح الوكيل</>}</Button></div>
            <p className="mt-3 text-xs leading-6 text-slate-400">بمتابعة التحليل أنت تؤكد أن لديك حق استخدام المحتوى العام لموقع الشركة لإعداد وكيلها. لا تُقرأ صفحات خاصة أو محمية بكلمة مرور.</p>
            {websiteProposal && <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-lime-100">راجع اقتراح وكيل شركتك قبل الإنشاء</p><p className="mt-1 text-xs text-slate-400">تمت قراءة {websiteProposal.pages.length} صفحة عامة من {new URL(websiteProposal.websiteUrl).hostname}.</p></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">{websiteProposal.analysis.industry}</span></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="block text-sm font-bold">اسم الوكيل المقترح<input value={websiteProposal.analysis.businessName} onChange={(event) => setWebsiteProposal((current) => current ? { ...current, analysis: { ...current.analysis, businessName: event.target.value } } : current)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-cyan-200/70 focus:ring-2" /></label><label className="block text-sm font-bold">نبرة الوكيل<select value={websiteProposal.analysis.tone} onChange={(event) => setWebsiteProposal((current) => current ? { ...current, analysis: { ...current.analysis, tone: event.target.value as IndependentWebsiteProposal["analysis"]["tone"] } } : current)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none"><option value="friendly">ودود</option><option value="professional">احترافي</option><option value="direct">مباشر</option></select></label></div><label className="mt-4 block text-sm font-bold">شخصية الوكيل وحدوده<textarea value={websiteProposal.analysis.persona} onChange={(event) => setWebsiteProposal((current) => current ? { ...current, analysis: { ...current.analysis, persona: event.target.value } } : current)} className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm leading-7 text-white outline-none ring-cyan-200/70 focus:ring-2" /></label><p className="mt-4 text-sm leading-7 text-slate-300">{websiteProposal.analysis.businessSummary}</p><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="font-bold">الخدمات المقترحة ({websiteProposal.analysis.services.length})</p><div className="mt-3 space-y-2">{websiteProposal.analysis.services.slice(0, 5).map((service) => <div key={`${service.name}-${service.sourceUrl}`} className="rounded-xl bg-slate-950/40 p-3"><p className="text-sm font-bold">{service.name}</p><p className="mt-1 text-xs leading-6 text-slate-400">{service.description}</p></div>) || <p className="text-sm text-slate-400">لم يحدد الموقع خدمات واضحة؛ سيستخدم الوكيل ملخص النشاط فقط.</p>}</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="font-bold">الأسئلة الشائعة ({websiteProposal.analysis.faqs.length})</p><div className="mt-3 space-y-2">{websiteProposal.analysis.faqs.slice(0, 4).map((faq) => <div key={`${faq.question}-${faq.sourceUrl}`} className="rounded-xl bg-slate-950/40 p-3"><p className="text-sm font-bold">{faq.question}</p><p className="mt-1 text-xs leading-6 text-slate-400">{faq.answer}</p></div>) || <p className="text-sm text-slate-400">لم يعثر التحليل على أسئلة شائعة صريحة في الصفحات المقروءة.</p>}</div></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button onClick={() => void applyWebsiteProposal()} disabled={applyingWebsiteProposal} className="h-12 flex-1 bg-cyan-300 text-slate-950 hover:bg-cyan-200">{applyingWebsiteProposal ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جارٍ إنشاء وكيل شركتك…</> : <><CheckCircle2 className="ml-2 h-4 w-4" />موافق: أنشئ وكيل شركتي من هذا الاقتراح</>}</Button><Button variant="outline" onClick={() => setWebsiteProposal(null)} disabled={applyingWebsiteProposal} className="h-12 border-white/15 text-white hover:bg-white/10">إلغاء ومراجعة الرابط</Button></div></div>}
          </section>

          <section id="independent-knowledge" className="mt-6 scroll-mt-5 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-bold">1. عرّف وكيلك</h2></div><p className="mt-2 text-sm leading-6 text-slate-400">هذه الإعدادات هي شخصية الوكيل وحدوده قبل الاختبار.</p><div className="mt-5 space-y-4"><label className="block text-sm font-bold">اسم الوكيل<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-cyan-200/70 placeholder:text-slate-500 focus:ring-2" /></label><label className="block text-sm font-bold">وصف قصير<input value={profile.description ?? ""} onChange={(event) => setProfile((current) => ({ ...current, description: event.target.value || null }))} placeholder="مثال: يرد على استفسارات عملاء شركتي" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-cyan-200/70 placeholder:text-slate-500 focus:ring-2" /></label><label className="block text-sm font-bold">شخصية الوكيل<textarea value={profile.persona ?? ""} onChange={(event) => setProfile((current) => ({ ...current, persona: event.target.value || null }))} placeholder="كيف تريد أن يتحدث الوكيل؟ وما الذي يجب ألا يفعله؟" className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm leading-7 text-white outline-none ring-cyan-200/70 placeholder:text-slate-500 focus:ring-2" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">اللغة<select value={profile.language} onChange={(event) => setProfile((current) => ({ ...current, language: event.target.value as IndependentAgentProfile["language"] }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none"><option value="bilingual">عربي + English</option><option value="ar">العربية</option><option value="en">English</option></select></label><label className="block text-sm font-bold">النبرة<select value={profile.tone} onChange={(event) => setProfile((current) => ({ ...current, tone: event.target.value as IndependentAgentProfile["tone"] }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none"><option value="friendly">ودود</option><option value="professional">احترافي</option><option value="direct">مباشر</option></select></label></div><Button onClick={() => void saveAgentProfile()} disabled={savingProfile} className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{savingProfile ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ إعدادات الوكيل</Button></div></article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-lime-200" /><h2 className="text-lg font-bold">2. أضف معرفة شركتك</h2></div><p className="mt-2 text-sm leading-6 text-slate-400">الصق الخدمات، الأسعار المعتمدة، الأسئلة الشائعة، أو السياسات. استخدم رابط الموقع كمصدر اختياري، ولا تضف معلومات غير مؤكدة.</p><div className="mt-5 space-y-4"><label className="block text-sm font-bold">عنوان المعرفة<input value={knowledgeDraft.title} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, title: event.target.value }))} placeholder="مثال: خدماتنا وأسعار البداية" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-lime-200/70 placeholder:text-slate-500 focus:ring-2" /></label><label className="block text-sm font-bold">المعلومة المعتمدة<textarea value={knowledgeDraft.content} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, content: event.target.value }))} placeholder="اكتب ما تريد أن يجيب عنه الوكيل بدقة…" className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm leading-7 text-white outline-none ring-lime-200/70 placeholder:text-slate-500 focus:ring-2" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">رابط المصدر <span className="font-normal text-slate-500">(اختياري)</span><input type="url" value={knowledgeDraft.sourceUrl} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://example.com" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none placeholder:text-slate-500" /></label><label className="block text-sm font-bold">نوع المعلومة<select value={knowledgeDraft.category} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, category: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none"><option value="business">خدمات الشركة</option><option value="faq">أسئلة شائعة</option><option value="policy">سياسة أو تعليمات</option></select></label></div><Button onClick={() => void addKnowledge()} disabled={addingKnowledge} className="w-full bg-lime-300 text-slate-950 hover:bg-lime-200">{addingKnowledge ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CirclePlus className="ml-2 h-4 w-4" />}إضافة إلى معرفة الوكيل</Button></div>
              <div className="mt-5 border-t border-white/10 pt-5"><p className="text-sm font-bold">المعرفة الحالية</p>{knowledgeLoading ? <p className="mt-3 text-sm text-slate-400">جارٍ تحميل المعرفة…</p> : knowledge.length ? <div className="mt-3 space-y-2">{knowledge.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{item.title}</p>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-200" aria-label={`فتح مصدر ${item.title}`}><Globe2 className="h-4 w-4" /></a>}</div><p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-400">{item.content}</p></div>)}</div> : <p className="mt-3 rounded-2xl border border-dashed border-white/15 p-4 text-sm leading-6 text-slate-400">لا توجد معرفة مضافة بعد. أضف أول معلومة قبل الاعتماد على الردود.</p>}</div>
            </article>
          </section>

          <section id="independent-attachments" className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,text/plain,text/markdown,text/csv,application/json,.txt,.md,.csv,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addKnowledgeAttachment(file); }} /><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={addingAttachment} className="border-white/15 text-white hover:bg-white/10">{addingAttachment ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Paperclip className="ml-2 h-4 w-4" />}إرفاق معرفة</Button><Button type="button" variant="outline" onClick={() => isRecording ? stopVoiceCapture() : void startVoiceCapture()} className={isRecording ? "border-rose-300/40 text-rose-100 hover:bg-rose-300/10" : "border-white/15 text-white hover:bg-white/10"}>{isRecording ? <><Square className="ml-2 h-4 w-4" />إيقاف التسجيل</> : <><Mic className="ml-2 h-4 w-4" />رسالة صوتية</>}</Button><span className="text-xs leading-6 text-slate-400">الصور وملفات TXT وMD وCSV وJSON تُضاف إلى معرفة الوكيل. حد المرفق 5 MB.</span></div>{attachmentStatus && <p className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${attachmentStatus.startsWith("تم") ? "border-lime-300/20 bg-lime-300/10 text-lime-100" : attachmentStatus.startsWith("جار") ? "border-cyan-200/20 bg-cyan-300/10 text-cyan-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>{attachmentStatus}</p>}{isRecording && <p className="mt-3 flex items-center gap-2 text-sm text-rose-100"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" />جارٍ التسجيل وتحويل كلامك إلى نص…</p>}{audioPreviewUrl && <div className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] p-3"><div className="flex flex-wrap items-center gap-3"><Mic className="h-4 w-4 text-cyan-200" /><audio controls src={audioPreviewUrl} className="h-9 max-w-full" /><Button type="button" variant="ghost" size="sm" onClick={cancelVoiceCapture} className="text-slate-200 hover:bg-white/10 hover:text-white"><X className="ml-1 h-4 w-4" />إلغاء التسجيل</Button></div>{voiceTranscript ? <><div className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 p-3"><p className="text-xs font-bold text-cyan-100">النص المسموع</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white">{voiceTranscript}</p></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={useVoiceTranscript} className="border-cyan-200/30 text-cyan-100 hover:bg-cyan-300/10">استخدم النص في المحادثة</Button><Button type="button" size="sm" onClick={() => void sendVoiceTranscript()} disabled={sendingAgentId === selectedAgent.id} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">إرسال النص الآن</Button></div><p className="mt-2 text-xs leading-6 text-slate-400">يرسل هذا الخيار النص الظاهر فقط إلى الوكيل؛ لا ندّعي إرسال الملف الصوتي أو تحويله خادمياً.</p></> : <p className="mt-3 text-xs leading-6 text-amber-100">تم حفظ معاينة الصوت، لكن المتصفح لم يعطِ نصاً. جرّب Chrome أو اكتب الرسالة بنفسك.</p>}</div>}</section>

          <section id="independent-test-chat" className="mt-6 overflow-hidden rounded-3xl border border-cyan-200/20 bg-gradient-to-b from-cyan-300/[0.10] to-slate-950/40"><div className="border-b border-white/10 px-5 py-5 sm:px-6"><div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-bold">3. اختبر وكيل شركتك</h2></div><p className="mt-2 text-sm leading-6 text-slate-300">محادثة اختبار حقيقية مع Claude من الخادم ومعرفة الوكيل المختار. راجع الإجابات قبل نشر الوكيل للعملاء.</p></div><div className="min-h-72 space-y-4 p-5 sm:p-6">{chatMessages.length ? chatMessages.map((message, index) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ${message.role === "user" ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-slate-950/70 text-slate-100"}`}>{message.role === "assistant" ? <><div className="prose prose-sm max-w-none break-words prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0"><Streamdown>{message.content}</Streamdown></div>{index === chatMessages.length - 1 && <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">{["أريد معرفة الأسعار والباقات", "أريد عرضاً توضيحياً"].map((prompt) => <button key={prompt} onClick={() => void sendTestMessage(prompt)} disabled={sendingAgentId === selectedAgent.id} className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50">{prompt}</button>)}<button onClick={() => setHandoffOpen(true)} className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-2 text-xs text-lime-100 transition hover:bg-lime-300/20">أريد التحدث مع موظف</button></div>}</> : <p className="whitespace-pre-wrap">{message.content}</p>}</div></div>) : <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/25 p-5 text-center"><Sparkles className="h-7 w-7 text-lime-200" /><p className="mt-3 font-bold">جرّب أول سؤال كعميل</p><p className="mt-1 max-w-md text-sm leading-6 text-slate-400">اكتب سؤالاً من نوع الأسئلة التي يسألها عملاء شركتك عادةً، وتحقق أن الوكيل يعتمد على المعلومات التي راجعتها.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{["ما الخدمات التي تقدمونها؟", "كيف أبدأ معكم؟"].map((prompt) => <button key={prompt} onClick={() => void sendTestMessage(prompt)} className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/10">{prompt}</button>)}<button onClick={() => setHandoffOpen(true)} className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-2 text-xs text-lime-100 transition hover:bg-lime-300/20">أريد التحدث مع موظف</button></div></div>}{sendingAgentId === selectedAgent.id && <div className="flex justify-end"><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300"><Loader2 className="h-4 w-4 animate-spin text-cyan-200" />يفكّر الوكيل…</div></div>}</div><div className="border-t border-white/10 bg-slate-950/45 p-4 sm:p-5"><div className="flex items-end gap-3 rounded-2xl border border-white/15 bg-slate-950/70 p-2 focus-within:border-cyan-200/50"><textarea value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendTestMessage(); } }} placeholder="اكتب رسالتك إلى وكيل شركتك…" className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-500" disabled={sendingAgentId === selectedAgent.id} /><Button onClick={() => void sendTestMessage()} size="icon" disabled={!chatDraft.trim() || sendingAgentId === selectedAgent.id} className="h-11 w-11 shrink-0 rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200" aria-label="إرسال الرسالة">{sendingAgentId === selectedAgent.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</Button></div>{chatError && <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{chatError}</p>}</div></section>

          {conversationId && <section className="mt-6 flex flex-col gap-3 rounded-3xl border border-cyan-200/20 bg-cyan-300/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">حالة محادثة الاختبار</p><p className="mt-1 text-sm text-slate-300">{conversationStatus === "active" ? "المحادثة مفتوحة ويمكن للوكيل الرد." : conversationStatus === "escalated" ? "تم تحويل المحادثة إلى الفريق البشري، وتوقف الرد الآلي." : "تم إغلاق المحادثة بصورة صحيحة."}</p></div>{conversationStatus === "active" && <Button type="button" variant="outline" onClick={() => void closeConversation()} disabled={closingConversation} className="border-cyan-200/30 text-cyan-100 hover:bg-cyan-300/10">{closingConversation ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-4 w-4" />}إنهاء المحادثة</Button>}</section>}

          <section className="mt-6 rounded-3xl border border-lime-300/20 bg-lime-300/[0.06] p-5 sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lime-200" /><div><h2 className="font-bold">إعداد التحويل البشري لهذا الوكيل</h2><p className="mt-1 text-sm leading-6 text-slate-300">أدخل جهة التواصل الخاصة بشركتك فقط. لا يظهر رقم Neon أو أي شركة أخرى لعملائك.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><input value={handoffContact.name} onChange={(event) => setHandoffContact((current) => ({ ...current, name: event.target.value }))} placeholder="اسم القسم أو الموظف" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoffContact.phone} onChange={(event) => setHandoffContact((current) => ({ ...current, phone: event.target.value }))} placeholder="هاتف العمل" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-left text-sm text-white outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoffContact.email} onChange={(event) => setHandoffContact((current) => ({ ...current, email: event.target.value }))} placeholder="بريد العمل" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-left text-sm text-white outline-none placeholder:text-slate-500" /></div><Button onClick={() => void saveHandoffSettings()} disabled={savingHandoffContact} className="mt-3 bg-lime-300 text-slate-950 hover:bg-lime-200">{savingHandoffContact ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ جهة التواصل</Button></section>

          {handoffOpen && <section className="mt-6 rounded-3xl border border-cyan-200/25 bg-cyan-300/[0.08] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold">طلب التواصل مع الفريق</h2><p className="mt-1 text-sm leading-6 text-slate-300">سيسجل الوكيل هذا الطلب ضمن مساحة عمل الشركة المختارة فقط.</p></div><Button type="button" variant="ghost" size="icon" onClick={() => setHandoffOpen(false)} className="text-slate-200 hover:bg-white/10 hover:text-white" aria-label="إغلاق"><X className="h-5 w-5" /></Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={handoffRequest.name} onChange={(event) => setHandoffRequest((current) => ({ ...current, name: event.target.value }))} placeholder="الاسم" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoffRequest.phone} onChange={(event) => setHandoffRequest((current) => ({ ...current, phone: event.target.value }))} placeholder="رقم الهاتف" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-left text-sm text-white outline-none placeholder:text-slate-500" /><input dir="ltr" value={handoffRequest.email} onChange={(event) => setHandoffRequest((current) => ({ ...current, email: event.target.value }))} placeholder="البريد الإلكتروني" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-left text-sm text-white outline-none placeholder:text-slate-500" /><input value={handoffRequest.notes} onChange={(event) => setHandoffRequest((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظة مختصرة (اختياري)" className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none placeholder:text-slate-500" /></div><label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-200"><input type="checkbox" checked={handoffRequest.consent} onChange={(event) => setHandoffRequest((current) => ({ ...current, consent: event.target.checked }))} className="mt-1 h-4 w-4 accent-lime-300" />أوافق على مشاركة بيانات التواصل أعلاه مع هذه الشركة فقط لغرض الرد على طلبي.</label><div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={() => void submitHandoffRequest()} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">إرسال طلب التواصل</Button>{handoffStatus && <p className="text-sm text-cyan-100">{handoffStatus}</p>}</div></section>}
        </>}
      </div>
    </main>
  );
}
