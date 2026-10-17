import { Button } from "@/components/ui/button";
import { listIndependentLeads, updateIndependentLead, type IndependentLeadRecord, type IndependentLeadStatus, type IndependentLeadsPage } from "@/lib/independentSetup";
import { getIndependentSupabaseBrowserClient } from "@/lib/supabase";
import { Bot, Loader2, MessageSquareText, RefreshCw, Save, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 25;
const STATUS_LABELS: Record<IndependentLeadStatus, string> = { new: "جديد", contacted: "تم التواصل", qualified: "مؤهل", closed: "مغلق" };
const STATUSES = Object.keys(STATUS_LABELS) as IndependentLeadStatus[];
const NAV = [
  { href: "/agents", label: "الوكلاء" },
  { href: "/conversations", label: "الحوار والطلبات" },
  { href: "/leads", label: "العملاء المحتملون" },
  { href: "/channels", label: "القنوات" },
  { href: "/settings", label: "الإعدادات" },
];

type AgentOption = { id: number; name: string };

async function accessToken() {
  const { data } = await getIndependentSupabaseBrowserClient()?.auth.getSession() ?? { data: { session: null } };
  return data.session?.access_token;
}

function LeadCard({ lead, agentId, onSaved }: { lead: IndependentLeadRecord; agentId: number; onSaved: (lead: IndependentLeadRecord) => void }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const dirty = status !== lead.status || notes !== (lead.notes ?? "");

  const save = async () => {
    setSaving(true);
    setError(null);
    setSavedNotice(false);
    try {
      const token = await accessToken();
      if (!token) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
      const { lead: saved } = await updateIndependentLead(token, agentId, lead.id, { status, notes: notes.trim() ? notes.trim() : null });
      onSaved(saved);
      setSavedNotice(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ التعديل.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{lead.name}</p>
          <p className="mt-1 text-sm text-slate-300" dir="ltr">{[lead.phone, lead.email].filter(Boolean).join(" · ") || "لا توجد وسيلة تواصل بعد"}</p>
          <time className="mt-1 block text-xs text-slate-400">{new Date(lead.createdAt).toLocaleString("ar")}</time>
        </div>
        <label className="text-xs font-bold">الحالة
          <select value={status} onChange={event => setStatus(event.target.value as IndependentLeadStatus)} className="mr-2 rounded-lg border border-white/15 bg-slate-900 px-2 py-1 text-sm">
            {STATUSES.map(item => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
          </select>
        </label>
      </div>
      <textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={2000} rows={2} placeholder="ملاحظات داخلية عن العميل" className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm" />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void save()} disabled={!dirty || saving} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ</Button>
        {lead.conversationId ? <a href="/conversations" className="inline-flex items-center gap-1 text-xs font-bold text-cyan-200"><MessageSquareText className="h-4 w-4" />المحادثة #{lead.conversationId}</a> : null}
        {savedNotice && !dirty ? <p className="text-xs font-bold text-lime-200" role="status">تم الحفظ</p> : null}
        {error ? <p className="text-xs text-rose-200" role="alert">{error}</p> : null}
      </div>
    </article>
  );
}

export default function IndependentLeads() {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [status, setStatus] = useState<IndependentLeadStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<IndependentLeadsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await accessToken();
        if (!token) { window.location.href = "/external"; return; }
        const response = await fetch("/api/external/agents", { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json() as { agents?: AgentOption[]; defaultAgent?: AgentOption; error?: string };
        if (!response.ok || !body.agents) throw new Error(body.error ?? "تعذر تحميل الوكلاء.");
        if (!active) return;
        setAgents(body.agents);
        setAgentId(body.defaultAgent?.id ?? body.agents[0]?.id ?? null);
      } catch (reason) {
        if (active) { setError(reason instanceof Error ? reason.message : "تعذر تحميل الوكلاء."); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    if (agentId === null) return;
    setLoading(true);
    setError(null);
    try {
      const token = await accessToken();
      if (!token) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
      setPage(await listIndependentLeads(token, agentId, { status, search, limit: PAGE_SIZE, offset }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل العملاء المحتملين.");
    } finally {
      setLoading(false);
    }
  }, [agentId, status, search, offset]);

  useEffect(() => { void load(); }, [load]);

  const counts = page?.statusCounts ?? {};
  const allCount = STATUSES.reduce((sum, item) => sum + (counts[item] ?? 0), 0);

  return (
    <main className="independent-shell min-h-screen px-3 py-4 sm:px-8 sm:py-8" dir="rtl" data-independent-view="leads">
      <div className="independent-container mx-auto max-w-6xl">
        <header className="independent-header flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border px-4 py-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><h1 className="text-xl font-bold">العملاء المحتملون</h1></div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="border-white/15 text-white hover:bg-white/10"><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
        </header>
        <nav aria-label="أقسام مساحة العمل المستقلة" className="independent-nav mt-4 flex gap-2 overflow-x-auto rounded-3xl border p-2 pb-2 shadow-sm">
          {NAV.map(item => <a key={item.href} href={item.href} className={`independent-nav-link shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${item.href === "/leads" ? "is-active" : ""}`}>{item.label}</a>)}
        </nav>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            {agents.length > 1 ? <label className="text-sm font-bold">الوكيل
              <select value={agentId ?? ""} onChange={event => { setAgentId(Number(event.target.value)); setOffset(0); }} className="mr-2 rounded-lg border border-white/15 bg-slate-900 px-2 py-2 text-sm text-white">{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>
            </label> : null}
            <form className="flex flex-1 items-center gap-2" onSubmit={event => { event.preventDefault(); setOffset(0); setSearch(searchInput); }}>
              <input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو البريد" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white" />
              <Button type="submit" variant="outline" className="border-white/15 text-white hover:bg-white/10"><Search className="ml-2 h-4 w-4" />بحث</Button>
            </form>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="تصفية حسب الحالة">
            <button type="button" onClick={() => { setStatus(""); setOffset(0); }} className={`rounded-full border px-3 py-1 text-sm font-bold ${status === "" ? "border-cyan-200/60 bg-cyan-300/15" : "border-white/10"}`}>الكل ({allCount})</button>
            {STATUSES.map(item => <button key={item} type="button" onClick={() => { setStatus(item); setOffset(0); }} className={`rounded-full border px-3 py-1 text-sm font-bold ${status === item ? "border-cyan-200/60 bg-cyan-300/15" : "border-white/10"}`}>{STATUS_LABELS[item]} ({counts[item] ?? 0})</button>)}
          </div>

          {error ? <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100" role="alert">{error}</p> : null}
          {loading && !page ? <p className="mt-4 text-sm text-slate-400">جارٍ التحميل…</p> : null}
          {page && page.leads.length === 0 && !loading ? <p className="mt-4 rounded-2xl border border-dashed border-white/15 p-4 text-sm leading-6 text-slate-400">لا يوجد عملاء محتملون بعد. يُضاف العميل تلقائياً عند أول رسالة واتساب أو عند مشاركة رقمه أو بريده في الويدجت.</p> : null}
          <div className="mt-4 space-y-3">{agentId !== null && page?.leads.map(lead => <LeadCard key={`${lead.id}-${lead.updatedAt}`} lead={lead} agentId={agentId} onSaved={saved => setPage(current => {
              if (!current) return current;
              const previous = current.leads.find(item => item.id === saved.id);
              const statusCounts = { ...current.statusCounts };
              if (previous && previous.status !== saved.status) {
                statusCounts[previous.status] = Math.max((statusCounts[previous.status] ?? 0) - 1, 0);
                statusCounts[saved.status] = (statusCounts[saved.status] ?? 0) + 1;
              }
              return { ...current, statusCounts, leads: current.leads.map(item => item.id === saved.id ? saved : item) };
            })} />)}</div>

          {page && page.total > PAGE_SIZE ? <div className="mt-5 flex items-center justify-between text-sm">
            <Button variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="border-white/15 text-white hover:bg-white/10">السابق</Button>
            <span className="text-slate-400">{offset + 1}–{Math.min(offset + PAGE_SIZE, page.total)} من {page.total}</span>
            <Button variant="outline" disabled={offset + PAGE_SIZE >= page.total || loading} onClick={() => setOffset(offset + PAGE_SIZE)} className="border-white/15 text-white hover:bg-white/10">التالي</Button>
          </div> : null}
        </section>
      </div>
    </main>
  );
}
