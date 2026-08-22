import { Button } from "@/components/ui/button";
import { getIndependentSupabaseBrowserClient } from "@/lib/supabase";
import { Bot, LogOut, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

type IndependentAgent = { id: number; name: string; description: string | null; status: string; language: string; llmModel: string };
type IndependentWorkspaceResponse = {
  user: { email: string | null; name: string | null };
  workspace: { name: string; slug: string };
  defaultAgent: IndependentAgent;
  agents: IndependentAgent[];
};

export default function IndependentStaging() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<IndependentWorkspaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    const client = getIndependentSupabaseBrowserClient();
    if (!client) {
      setError("هذه الصفحة متاحة فقط بعد ضبط Supabase في بيئة Render أو Vercel.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setLocation("/login");
      return;
    }

    try {
      const response = await fetch("/api/external/agents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("تعذر تحميل مساحة العمل المستقلة. تحقّق من إعدادات Render وSupabase.");
      setData(await response.json() as IndependentWorkspaceResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل مساحة العمل المستقلة.");
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const signOut = async () => {
    await getIndependentSupabaseBrowserClient()?.auth.signOut();
    setLocation("/login");
  };

  return (
    <main className="min-h-screen bg-[#07111f] px-5 py-7 text-white sm:px-10" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-lime-300 text-slate-950"><Bot className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Independent staging</p><h1 className="text-xl font-bold">Neon AI Agent Platform</h1></div></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => void loadWorkspace()} disabled={loading} className="border-white/15 text-white hover:bg-white/10"><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button><Button variant="outline" onClick={() => void signOut()} className="border-white/15 text-white hover:bg-white/10"><LogOut className="ml-2 h-4 w-4" />خروج</Button></div>
        </header>

        {loading && <section className="py-24 text-center text-slate-300">جارٍ التحقق من جلسة Supabase ومساحة العمل…</section>}
        {!loading && error && <section className="mt-8 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-7"><h2 className="font-bold text-amber-100">نسخة التجربة مستقلة ولكنها غير جاهزة بعد</h2><p className="mt-3 text-sm leading-7 text-amber-50/80">{error}</p><Button onClick={() => setLocation("/login")} className="mt-5 bg-cyan-300 text-slate-950 hover:bg-cyan-200">العودة إلى الدخول</Button></section>}
        {!loading && data && <>
          <section className="mt-8 grid gap-5 rounded-3xl border border-cyan-200/15 bg-gradient-to-l from-cyan-300/10 to-lime-300/5 p-7 md:grid-cols-[1.3fr_0.7fr]"><div><p className="text-sm text-cyan-100">مساحة العمل المستقلة</p><h2 className="mt-2 text-3xl font-semibold">{data.workspace.name}</h2><p className="mt-3 text-sm leading-7 text-slate-300">تم التحقق من جلستك عبر Supabase. الوكلاء أدناه يأتون من PostgreSQL المستقل، وليس من بيانات Neon المدارة.</p></div><div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"><ShieldCheck className="h-6 w-6 text-lime-300" /><p className="mt-3 text-sm font-bold">{data.user.name || data.user.email || "مستخدم Neon"}</p><p className="mt-1 text-xs text-slate-400">{data.workspace.slug}</p></div></section>
          <section className="mt-8"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-200" /><h2 className="text-xl font-bold">وكلاء التجربة</h2></div><div className="mt-4 grid gap-4 md:grid-cols-2">{data.agents.map(agent => <article key={agent.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold">{agent.name}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{agent.description || "وكيل جاهز لبدء إعداد المعرفة والقنوات."}</p></div><span className="rounded-full bg-lime-300/15 px-3 py-1 text-xs font-bold text-lime-200">{agent.status}</span></div><p className="mt-5 text-xs text-cyan-100">{agent.language} · {agent.llmModel}</p></article>)}</div></section>
        </>}
      </div>
    </main>
  );
}
