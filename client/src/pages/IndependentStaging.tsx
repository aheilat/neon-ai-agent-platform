import { Button } from "@/components/ui/button";
import { requestIndependentAgentReply } from "@/lib/independentChat";
import {
  addIndependentKnowledgeItem,
  createIndependentWorkspaceAgent,
  updateIndependentAgentProfile,
  type IndependentAgentProfile,
} from "@/lib/independentSetup";
import { getIndependentSupabaseBrowserClient } from "@/lib/supabase";
import { Bot, CheckCircle2, CirclePlus, FileText, Globe2, Loader2, LogOut, MessageSquareText, RefreshCw, Save, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
};

type IndependentKnowledgeItem = {
  id: number;
  title: string;
  content: string;
  category: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

type IndependentWorkspaceResponse = {
  user: { email: string | null; name: string | null };
  workspace: { name: string; slug: string };
  defaultAgent: IndependentAgent;
  agents: IndependentAgent[];
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

function serverMessage(payload: unknown, fallback: string) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export default function IndependentStaging() {
  const [, setLocation] = useLocation();
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
  const [chatDraft, setChatDraft] = useState("");
  const [sendingAgentId, setSendingAgentId] = useState<number | null>(null);
  const [chatResult, setChatResult] = useState<{ agentId: number; reply: string } | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

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

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedAgent) return;
    setProfile(profileFromAgent(selectedAgent));
    void loadKnowledge(selectedAgent.id);
    setChatDraft("");
    setChatResult(null);
    setChatError(null);
  }, [loadKnowledge, selectedAgent]);

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

  const sendTestMessage = async () => {
    if (!selectedAgent) return;
    const message = chatDraft.trim();
    if (!message) return setChatError("اكتب رسالة قصيرة لاختبار رد الوكيل.");
    const token = await accessToken();
    if (!token) return setLocation("/login");
    setSendingAgentId(selectedAgent.id);
    setChatError(null);
    setChatResult(null);
    try {
      const result = await requestIndependentAgentReply({ accessToken: token, agentId: selectedAgent.id, message });
      setChatResult(result);
    } catch (reason) {
      setChatError(reason instanceof Error ? reason.message : "تعذر الحصول على رد Claude.");
    } finally {
      setSendingAgentId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-5 text-white sm:px-8 sm:py-8" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Neon workspace</p><h1 className="text-xl font-bold">إعداد وكيلك الذكي</h1></div></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => void loadWorkspace()} disabled={loading} className="border-white/15 text-white hover:bg-white/10"><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button><Button variant="outline" onClick={() => void signOut()} className="border-white/15 text-white hover:bg-white/10"><LogOut className="ml-2 h-4 w-4" />خروج</Button></div>
        </header>

        {loading && <section className="py-24 text-center text-slate-300">جارٍ فتح مساحة العمل الآمنة…</section>}
        {!loading && error && <section className="mt-6 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-5"><p className="font-bold text-amber-100">نحتاج خطوة بسيطة قبل المتابعة</p><p className="mt-2 text-sm leading-7 text-amber-50/80">{error}</p></section>}

        {!loading && data && selectedAgent && <>
          <section className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-3xl border border-cyan-200/15 bg-gradient-to-l from-cyan-300/10 to-lime-300/5 p-6"><p className="text-sm text-cyan-100">مساحة العمل المستقلة</p><h2 className="mt-2 text-2xl font-semibold">{data.workspace.name}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">ابدأ بتعريف وكيلك، ثم أضف معلومات شركتك المعتمدة، وبعدها اختبر الرد قبل مشاركته مع العملاء.</p><div className="mt-5 grid gap-2 sm:grid-cols-3">{[["1", "عرّف الوكيل"], ["2", "أضف المعرفة"], ["3", "اختبر الرد"]].map(([number, label]) => <div key={number} className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3 text-sm"><span className="ml-2 text-cyan-200">{number}</span>{label}</div>)}</div></div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><ShieldCheck className="h-6 w-6 text-lime-300" /><p className="mt-3 text-sm font-bold">{data.user.name || data.user.email || "مستخدم Neon"}</p><p className="mt-1 text-xs text-slate-400">{data.workspace.slug}</p><p className="mt-5 text-xs leading-6 text-slate-400">بيانات كل مساحة عمل تبقى معزولة. لا نستخدم معرفة أي شركة أخرى في رد وكيلك.</p></div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 font-bold"><Bot className="h-5 w-5 text-cyan-200" /> وكلاؤك</p><p className="mt-1 text-sm text-slate-400">اختر وكيلاً أو أنشئ وكيلاً جديداً لنشاط مختلف.</p></div><Button onClick={() => void createAdditionalAgent()} disabled={creatingAgent} className="bg-lime-300 text-slate-950 hover:bg-lime-200">{creatingAgent ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CirclePlus className="ml-2 h-4 w-4" />}وكيل جديد</Button></div>
            <div className="mt-4 flex flex-wrap gap-2">{data.agents.map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(agent.id)} className={`rounded-2xl border px-4 py-3 text-right transition ${selectedAgent.id === agent.id ? "border-cyan-200/60 bg-cyan-300/15 text-white" : "border-white/10 bg-slate-950/30 text-slate-300 hover:border-white/25"}`}><span className="block text-sm font-bold">{agent.name}</span><span className="mt-1 block text-xs text-slate-400">{agent.status === "active" ? "نشط" : agent.status}</span></button>)}</div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-bold">1. عرّف وكيلك</h2></div><p className="mt-2 text-sm leading-6 text-slate-400">هذه الإعدادات هي شخصية الوكيل وحدوده قبل الاختبار.</p><div className="mt-5 space-y-4"><label className="block text-sm font-bold">اسم الوكيل<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-cyan-200/70 placeholder:text-slate-500 focus:ring-2" /></label><label className="block text-sm font-bold">وصف قصير<input value={profile.description ?? ""} onChange={(event) => setProfile((current) => ({ ...current, description: event.target.value || null }))} placeholder="مثال: يرد على استفسارات عملاء شركتي" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-cyan-200/70 placeholder:text-slate-500 focus:ring-2" /></label><label className="block text-sm font-bold">شخصية الوكيل<textarea value={profile.persona ?? ""} onChange={(event) => setProfile((current) => ({ ...current, persona: event.target.value || null }))} placeholder="كيف تريد أن يتحدث الوكيل؟ وما الذي يجب ألا يفعله؟" className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm leading-7 text-white outline-none ring-cyan-200/70 placeholder:text-slate-500 focus:ring-2" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">اللغة<select value={profile.language} onChange={(event) => setProfile((current) => ({ ...current, language: event.target.value as IndependentAgentProfile["language"] }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none"><option value="bilingual">عربي + English</option><option value="ar">العربية</option><option value="en">English</option></select></label><label className="block text-sm font-bold">النبرة<select value={profile.tone} onChange={(event) => setProfile((current) => ({ ...current, tone: event.target.value as IndependentAgentProfile["tone"] }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none"><option value="friendly">ودود</option><option value="professional">احترافي</option><option value="direct">مباشر</option></select></label></div><Button onClick={() => void saveAgentProfile()} disabled={savingProfile} className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{savingProfile ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ إعدادات الوكيل</Button></div></article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-lime-200" /><h2 className="text-lg font-bold">2. أضف معرفة شركتك</h2></div><p className="mt-2 text-sm leading-6 text-slate-400">الصق الخدمات، الأسعار المعتمدة، الأسئلة الشائعة، أو السياسات. استخدم رابط الموقع كمصدر اختياري، ولا تضف معلومات غير مؤكدة.</p><div className="mt-5 space-y-4"><label className="block text-sm font-bold">عنوان المعرفة<input value={knowledgeDraft.title} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, title: event.target.value }))} placeholder="مثال: خدماتنا وأسعار البداية" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-lime-200/70 placeholder:text-slate-500 focus:ring-2" /></label><label className="block text-sm font-bold">المعلومة المعتمدة<textarea value={knowledgeDraft.content} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, content: event.target.value }))} placeholder="اكتب ما تريد أن يجيب عنه الوكيل بدقة…" className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm leading-7 text-white outline-none ring-lime-200/70 placeholder:text-slate-500 focus:ring-2" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">رابط المصدر <span className="font-normal text-slate-500">(اختياري)</span><input type="url" value={knowledgeDraft.sourceUrl} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://example.com" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none placeholder:text-slate-500" /></label><label className="block text-sm font-bold">نوع المعلومة<select value={knowledgeDraft.category} onChange={(event) => setKnowledgeDraft((current) => ({ ...current, category: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none"><option value="business">خدمات الشركة</option><option value="faq">أسئلة شائعة</option><option value="policy">سياسة أو تعليمات</option></select></label></div><Button onClick={() => void addKnowledge()} disabled={addingKnowledge} className="w-full bg-lime-300 text-slate-950 hover:bg-lime-200">{addingKnowledge ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CirclePlus className="ml-2 h-4 w-4" />}إضافة إلى معرفة الوكيل</Button></div>
              <div className="mt-5 border-t border-white/10 pt-5"><p className="text-sm font-bold">المعرفة الحالية</p>{knowledgeLoading ? <p className="mt-3 text-sm text-slate-400">جارٍ تحميل المعرفة…</p> : knowledge.length ? <div className="mt-3 space-y-2">{knowledge.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{item.title}</p>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-200" aria-label={`فتح مصدر ${item.title}`}><Globe2 className="h-4 w-4" /></a>}</div><p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-400">{item.content}</p></div>)}</div> : <p className="mt-3 rounded-2xl border border-dashed border-white/15 p-4 text-sm leading-6 text-slate-400">لا توجد معرفة مضافة بعد. أضف أول معلومة قبل الاعتماد على الردود.</p>}</div>
            </article>
          </section>

          <section className="mt-6 rounded-3xl border border-cyan-200/15 bg-gradient-to-l from-cyan-300/10 to-transparent p-5 sm:p-6"><div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-bold">3. اختبر رد الوكيل</h2></div><p className="mt-2 text-sm leading-6 text-slate-300">هذا الاختبار يستخدم Claude من الخادم فقط، ويأخذ معرفة هذا الوكيل في الاعتبار. لا تشارك الرابط مع العملاء قبل إضافة المعرفة ومراجعة الإجابات.</p><textarea value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="مثال: ما الخدمات التي تقدمونها؟" className="mt-4 min-h-24 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none ring-cyan-200/70 placeholder:text-slate-500 focus:ring-2" disabled={sendingAgentId === selectedAgent.id} /><Button onClick={() => void sendTestMessage()} disabled={sendingAgentId === selectedAgent.id} className="mt-3 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{sendingAgentId === selectedAgent.id ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جارٍ طلب الرد…</> : <><Send className="ml-2 h-4 w-4" />اختبر الرد الآن</>}</Button>{chatResult?.agentId === selectedAgent.id && <div className="mt-4 rounded-2xl border border-lime-300/25 bg-lime-300/10 p-4"><p className="flex items-center gap-2 text-xs font-bold text-lime-200"><CheckCircle2 className="h-4 w-4" />رد الوكيل</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">{chatResult.reply}</p></div>}{chatError && <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{chatError}</p>}</section>
        </>}
      </div>
    </main>
  );
}
