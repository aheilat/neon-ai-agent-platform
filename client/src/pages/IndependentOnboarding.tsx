import { Button } from "@/components/ui/button";
import { analyzeIndependentCompanyWebsite, applyIndependentWebsiteProposal, type IndependentWebsiteProposal } from "@/lib/independentSetup";
import { getIndependentSupabaseBrowserClient } from "@/lib/supabase";
import { ArrowLeft, Bot, Check, Globe2, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const functionGoalMap: Record<string, string> = { answer: "questions", qualify: "leads", capture: "buy", escalate: "human", appointments: "appointments", whatsapp: "route" };

const functions = [
  { id: "answer", title: "الرد على أسئلة العملاء", description: "إجابات واضحة من موقعك ومعرفتك.", icon: MessageSquareText },
  { id: "qualify", title: "تأهيل العملاء", description: "اجمع التفاصيل المهمة قبل التواصل.", icon: Check },
  { id: "capture", title: "جمع طلبات الخدمة", description: "حوّل الطلبات إلى فرص متابعة منظمة.", icon: Sparkles },
  { id: "escalate", title: "التحويل للفريق", description: "اعرف متى يحتاج العميل إلى إنسان.", icon: ArrowLeft },
  { id: "appointments", title: "الحجوزات والمواعيد", description: "افهم الموعد المطلوب واترك التأكيد لفريقك.", icon: Globe2 },
  { id: "whatsapp", title: "WhatsApp والقنوات", description: "جهّز القنوات بعد اعتماد Meta.", icon: Bot },
] as const;

type CreatedAgent = { id: number; name: string };

export default function IndependentOnboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>(["answer", "qualify", "capture", "escalate"]);
  const [proposal, setProposal] = useState<IndependentWebsiteProposal | null>(null);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(async () => (await getIndependentSupabaseBrowserClient()?.auth.getSession())?.data.session?.access_token, []);

  useEffect(() => {
    void token.then((value) => { if (!value) setLocation("/login"); });
  }, [setLocation, token]);

  const toggleFunction = (id: string) => setSelectedFunctions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const analyze = async () => {
    if (!websiteUrl.trim()) return setError("أدخل رابط موقع شركتك أولاً.");
    const accessToken = await token;
    if (!accessToken) return setLocation("/login");
    setBusy(true); setError(null);
    try {
      const result = await analyzeIndependentCompanyWebsite(accessToken, websiteUrl.trim());
      setProposal(result); setStep(3);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تحليل الموقع الآن."); }
    finally { setBusy(false); }
  };

  const createAgent = async () => {
    if (!proposal) return;
    const accessToken = await token;
    if (!accessToken) return setLocation("/login");
    setBusy(true); setError(null);
    try {
      const adjusted = { ...proposal, analysis: { ...proposal.analysis, goals: selectedFunctions.map((id) => functionGoalMap[id]).filter(Boolean).slice(0, 7) } };
      const result = await applyIndependentWebsiteProposal<{ agent: CreatedAgent }>(accessToken, adjusted);
      setCreatedAgent(result.agent); setStep(4);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إنشاء صفحة الوكيل."); }
    finally { setBusy(false); }
  };

  const progress = `${step}/4`;
  return <main dir="rtl" className="min-h-screen bg-[#f7f8fc] text-[#12172b]">
    <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-5xl items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5d5cf1] to-[#8c3ff1] text-white"><Bot className="h-5 w-5" /></span><div><p className="font-black tracking-wide">NEON AI</p><p className="text-xs text-slate-500">ابنِ وكيلك خلال دقائق</p></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">الخطوة {progress}</span></div></header>
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 flex items-center gap-2"><span className="h-1.5 flex-1 rounded-full bg-[#5d5cf1]" /><span className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-[#5d5cf1]" : "bg-slate-200"}`} /><span className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-[#5d5cf1]" : "bg-slate-200"}`} /><span className={`h-1.5 flex-1 rounded-full ${step >= 4 ? "bg-[#5d5cf1]" : "bg-slate-200"}`} /></div>
      {step === 1 && <div className="mx-auto max-w-2xl text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#5d5cf1] text-white shadow-lg shadow-indigo-200"><Globe2 className="h-8 w-8" /></span><h1 className="mt-7 text-3xl font-black tracking-tight sm:text-5xl">لنبدأ من موقع شركتك</h1><p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-500">أرسل رابطاً عاماً واحداً. سيقرأ Neon صفحاتك، يفهم خدماتك، ويقترح نقطة بداية لوكيلك.</p><div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 text-right shadow-sm"><label className="text-sm font-bold text-slate-700">رابط موقع الشركة</label><input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} dir="ltr" type="url" placeholder="https://company.com" className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left outline-none ring-[#5d5cf1] focus:ring-2" /><p className="mt-3 text-xs leading-6 text-slate-400">نقرأ المحتوى العام فقط. لا تدخل روابط خاصة أو كلمات مرور.</p></div><Button onClick={() => setStep(2)} className="mt-6 h-14 w-full rounded-2xl bg-[#5d5cf1] text-base font-bold text-white hover:bg-[#4b4ad9]">متابعة واختيار وظائف الوكيل <ArrowLeft className="mr-2 h-5 w-5" /></Button></div>}
      {step === 2 && <div className="mx-auto max-w-3xl"><div className="text-center"><h1 className="text-3xl font-black tracking-tight sm:text-5xl">ماذا تريد من وكيلك؟</h1><p className="mt-4 text-slate-500">اختر الوظائف المناسبة. يمكنك تعديلها لاحقاً.</p></div><div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">{functions.map(({ id, title, description, icon: Icon }) => { const enabled = selectedFunctions.includes(id); return <button key={id} type="button" onClick={() => toggleFunction(id)} className={`min-h-36 rounded-3xl border-2 p-4 text-right transition active:scale-[.98] sm:p-5 ${enabled ? "border-[#5d5cf1] bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200"}`}><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${enabled ? "bg-[#5d5cf1] text-white" : "bg-slate-100 text-slate-500"}`}><Icon className="h-5 w-5" /></span><span className="mt-4 block text-sm font-black sm:text-base">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></button>; })}</div><div className="mt-6 flex gap-3"><Button type="button" variant="outline" onClick={() => setStep(1)} className="h-14 flex-1 rounded-2xl border-slate-300">رجوع</Button><Button onClick={() => void analyze()} disabled={busy || selectedFunctions.length === 0} className="h-14 flex-[2] rounded-2xl bg-[#5d5cf1] font-bold text-white hover:bg-[#4b4ad9]">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "حلّل موقعي وابنِ اقتراحاً"}</Button></div></div>}
      {step === 3 && proposal && <div className="mx-auto max-w-3xl"><div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"><Sparkles className="h-7 w-7" /></span><h1 className="mt-5 text-3xl font-black">وجدنا نقطة بداية ممتازة</h1><p className="mt-3 text-slate-500">راجع الملخص ثم أنشئ صفحة وكيلك الخاصة.</p></div><div className="mt-8 space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-xs text-slate-500">اسم النشاط</p><p className="mt-1 text-xl font-black">{proposal.analysis.businessName}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{proposal.analysis.industry}</span></div><p className="pt-2 text-sm leading-7 text-slate-600">{proposal.analysis.businessSummary}</p><div className="grid gap-3 pt-2 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">الخدمات المكتشفة</p><p className="mt-1 text-2xl font-black">{proposal.analysis.services.length}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">الأسئلة الشائعة</p><p className="mt-1 text-2xl font-black">{proposal.analysis.faqs.length}</p></div></div></div><div className="mt-5 flex gap-3"><Button type="button" variant="outline" onClick={() => setStep(2)} className="h-14 flex-1 rounded-2xl border-slate-300">تعديل الوظائف</Button><Button onClick={() => void createAgent()} disabled={busy} className="h-14 flex-[2] rounded-2xl bg-[#5d5cf1] font-bold text-white hover:bg-[#4b4ad9]">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "إنشاء صفحة الوكيل"}</Button></div></div>}
      {step === 4 && createdAgent && <div className="mx-auto max-w-2xl text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-100"><Check className="h-8 w-8" /></span><h1 className="mt-7 text-3xl font-black sm:text-5xl">وكيلك جاهز</h1><p className="mt-4 text-slate-500">أنشأنا صفحة خاصة بـ <strong>{createdAgent.name}</strong> وربطناها بمعرفة شركتك.</p><div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 text-right shadow-sm"><p className="text-sm font-bold">خطوتك التالية</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><a href={`/widget/${createdAgent.id}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-indigo-50 p-4 text-sm font-bold text-indigo-700 hover:bg-indigo-100">افتح المحادثة وجرب الوكيل ←</a><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">كود التضمين</p><code dir="ltr" className="mt-2 block break-all text-xs text-slate-700">{`<script src="${window.location.origin}/neon-agent-widget.js" data-agent-id="${createdAgent.id}"></script>`}</code></div></div></div><Button onClick={() => setLocation("/start")} className="mt-6 h-14 w-full rounded-2xl bg-[#5d5cf1] font-bold text-white hover:bg-[#4b4ad9]">فتح مساحة الوكيل <ArrowLeft className="mr-2 h-5 w-5" /></Button></div>}
      {error && <p className="mx-auto mt-6 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    </section>
  </main>;
}
