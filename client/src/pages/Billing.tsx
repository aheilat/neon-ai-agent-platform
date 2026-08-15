import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, CreditCard, Sparkles, CheckCircle2, AlertCircle, ExternalLink, Zap, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.billing.getSubscription.useQuery();
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "professional" | "enterprise">("professional");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const checkoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (res) => {
      setIsProcessing(false);
      toast.success("تم تجهيز جلسة الدفع عبر HyperPay بنجاح!");
      // If mock checkout ID returned, trigger verification simulation
      if (res.checkoutId) {
        setCheckoutUrl(res.checkoutId);
      }
    },
    onError: (err) => {
      setIsProcessing(false);
      toast.error(err.message || "فشل إنشاء جلسة الدفع");
    },
  });

  const verifyMutation = trpc.billing.verifyPayment.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setCheckoutUrl(null);
      utils.billing.getSubscription.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "فشلت عملية التحقق من الدفع");
    },
  });

  const plans = [
    {
      id: "starter",
      name: "الباقة المبتدئة (Starter)",
      price: 99,
      currency: "SAR",
      description: "مناسبة للمشاريع الناشئة والأفراد الراغبين ببدء خدمة العملاء بالذكاء الاصطناعي.",
      features: ["وكيل ذكي واحد (1 Agent)", "تعلّم تلقائي من موقع الويب", "دعم قنوات الويب والواتساب", "تخزين 500 مستند معرفي"],
    },
    {
      id: "professional",
      name: "الباقة المحترفة (Professional)",
      price: 299,
      currency: "SAR",
      description: "المعيار المثالي للشركات المتوسطة مع أدوات مبيعات وإدارة فريق متكاملة.",
      features: ["حتى 5 وكلاء ذكيين (AI Agents)", "نماذج OpenAI GPT-4o & Claude 3.5", "إدارة الفريق وتحويل المحادثات", "إشعارات المتصفح والتنبيهات الصوتية", "جدولة مزامنة الموقع والتصدير لـ CSV"],
      popular: true,
    },
    {
      id: "enterprise",
      name: "باقة المؤسسات (Enterprise)",
      price: 799,
      currency: "SAR",
      description: "حلول سيادية ومخصصة للشركات الكبرى مع دعم فني مخصص ونماذج GPT-5.",
      features: ["عدد غير محدود من الوكلاء", "وصول حصري لنموذج GPT-5", "عزل تام وعناوين مخصصة", "مدير حساب خاص ودعم 24/7", "تكامل كامل مع كافة قنوات الاتصال والهاتف"],
    },
  ];

  const handleSubscribe = (planId: "starter" | "professional" | "enterprise", price: number) => {
    setSelectedPlan(planId);
    setIsProcessing(true);
    toast.info("جاري تجهيز بوابة دفع HyperPay الآمنة للباقة المختارة...", {
      icon: <Sparkles className="w-4 h-4 text-neon-cyan animate-spin" />,
    });
    setTimeout(() => {
      checkoutMutation.mutate({
        planName: planId,
        amount: price,
        currency: "SAR",
      });
    }, 600);
  };

  const handleSimulateSuccess = () => {
    if (!checkoutUrl) return;
    verifyMutation.mutate({ checkoutId: checkoutUrl });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />
      </div>
    );
  }

  const currentSub = data?.subscription;
  const transactions = data?.transactions || [];
  const usage = data?.usage || { agentsCount: 0, conversationsCount: 0, knowledgeCount: 0 };

  // Determine limits based on plan name
  const planName = currentSub?.planName || "starter";
  const limits = planName === "enterprise" 
    ? { agents: 999, conversations: 50000, knowledge: 10000 }
    : planName === "professional"
    ? { agents: 5, conversations: 5000, knowledge: 2000 }
    : { agents: 1, conversations: 500, knowledge: 500 };

  const agentPct = Math.min(100, Math.round((usage.agentsCount / limits.agents) * 100));
  const convPct = Math.min(100, Math.round((usage.conversationsCount / limits.conversations) * 100));
  const kbPct = Math.min(100, Math.round((usage.knowledgeCount / limits.knowledge) * 100));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-neon-cyan via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              الاشتراكات وبوابة الدفع (HyperPay)
            </h1>
            <Badge variant="outline" className="border-neon-cyan/50 text-neon-cyan gap-1 bg-neon-cyan/10">
              <ShieldCheck className="w-3.5 h-3.5" /> آمن وموثق
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            اختر باقتك المفضلة وأتمم الدفع بأمان تام عبر بوابة HyperPay الرائدة في الشرق الأوسط.
          </p>
        </div>
      </div>

      {/* Current Subscription Status */}
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-neon-cyan" /> حالة اشتراكك الحالي
            </span>
            <Badge className={currentSub?.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
              {currentSub?.status === "active" ? "نشط (Active)" : "غير مفعل أو بانتظار الدفع"}
            </Badge>
          </CardTitle>
          <CardDescription>
            تفاصيل الخطة الحالية وصلاحية الاشتراك الخاص بمنظمتك.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
            <p className="text-xs text-muted-foreground">الباقة الحالية</p>
            <p className="text-lg font-bold mt-1 capitalize text-neon-cyan">{currentSub?.planName || "Starter"}</p>
          </div>
          <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
            <p className="text-xs text-muted-foreground">قيمة الاشتراك</p>
            <p className="text-lg font-bold mt-1">
              {currentSub?.amount ? (currentSub.amount / 100).toFixed(2) : "0.00"} {currentSub?.currency || "SAR"} / شهر
            </p>
          </div>
          <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
            <p className="text-xs text-muted-foreground">تاريخ التجديد / الانتهاء</p>
            <p className="text-sm font-medium mt-1">
              {currentSub && "currentPeriodEnd" in currentSub && currentSub.currentPeriodEnd ? new Date(currentSub.currentPeriodEnd).toLocaleDateString("ar-SA") : "غير متوفر"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Usage & Quotas Dashboard */}
      <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/40 backdrop-blur shadow-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-neon-cyan" /> استهلاك الحصص الحالية (Real-Time Usage Quotas)
            </CardTitle>
            <CardDescription className="mt-1">
              متابعة فورية لعدد الوكلاء النشطين، المحادثات، ومعلومات قاعدة المعرفة مقارنة بحدود باقتك الحالية.
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowUpgradeModal(true)}
            className="bg-gradient-to-r from-neon-cyan to-indigo-500 text-slate-950 font-bold gap-2 shadow-lg shadow-neon-cyan/20 hover:opacity-90 shrink-0"
          >
            <Zap className="w-4 h-4" /> ترقية الباقة (Upgrade Plan)
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Agents Quota */}
          <div className="bg-muted/30 p-5 rounded-xl border border-border/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">الوكلاء النشطون (AI Agents)</span>
              <span className="text-sm font-bold text-neon-cyan">{usage.agentsCount} / {limits.agents === 999 ? "غير محدود" : limits.agents}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div className="bg-neon-cyan h-2.5 rounded-full transition-all duration-500" style={{ width: `${agentPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">الوكلاء المتاحون للعمل الفوري واستقبال العملاء.</p>
          </div>

          {/* Conversations Quota */}
          <div className="bg-muted/30 p-5 rounded-xl border border-border/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">المحادثات الشهرية (Conversations)</span>
              <span className="text-sm font-bold text-indigo-400">{usage.conversationsCount} / {limits.conversations}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${convPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">عدد المحادثات الإجمالية عبر الويب وقنوات التواصل.</p>
          </div>

          {/* Knowledge Items Quota */}
          <div className="bg-muted/30 p-5 rounded-xl border border-border/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">عناصر قاعدة المعرفة (Knowledge Items)</span>
              <span className="text-sm font-bold text-purple-400">{usage.knowledgeCount} / {limits.knowledge}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${kbPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">الأسئلة الشائعة والخدمات المستخرجة من موقعك.</p>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Comparison Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-3xl bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-neon-cyan">
              <Sparkles className="w-6 h-6" /> ترقية الباقة ومقارنة المميزات
            </DialogTitle>
            <DialogDescription>
              قارن بين باقتك الحالية والباقات المتاحة لتختار الأنسب لاستمرار نمو عملك.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center gap-3 bg-muted/40 p-2 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === "monthly" ? "bg-neon-cyan text-slate-950 shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                الفوترة الشهرية (Monthly)
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === "yearly" ? "bg-neon-cyan text-slate-950 shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                الفوترة السنوية (Yearly)
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                  وفر 20%
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Plan Card */}
              <div className="bg-muted/30 p-5 rounded-xl border border-border/40 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground uppercase">الباقة الحالية</span>
                  <span className="text-sm font-bold capitalize text-muted-foreground">{currentSub?.planName || "Starter"}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black">
                    {currentSub?.amount ? (currentSub.amount / 100).toFixed(2) : "0"} {currentSub?.currency || "SAR"}
                    <span className="text-xs font-normal text-muted-foreground"> / شهر</span>
                  </p>
                  <p className="text-xs text-muted-foreground">خطة العمل الفاعلة حالياً على مساحتك.</p>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon-cyan" /> حدود الحصص القياسية
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon-cyan" /> دعم قنوات الويب والواتساب
                  </li>
                </ul>
              </div>

              {/* Recommended Upgrade Plan Card */}
              <div className="bg-gradient-to-br from-neon-cyan/10 via-card to-card p-5 rounded-xl border border-neon-cyan/60 shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-2 left-2 bg-neon-cyan text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                  {billingCycle === "yearly" ? "خصم سنوي 20%" : "موصى بها للأعمال"}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neon-cyan/20 text-neon-cyan uppercase">الباقة الأعلى</span>
                  <span className="text-sm font-bold text-neon-cyan">Professional</span>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black text-neon-cyan">
                    {billingCycle === "yearly" ? "2,870" : "299"} <span className="text-sm font-semibold">SAR</span>
                    <span className="text-xs font-normal text-muted-foreground"> {billingCycle === "yearly" ? "/ سنوياً" : "/ شهر"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {billingCycle === "yearly" ? "تعادل تقريباً 239 ريال شهرياً مع توفير 600 ريال سنويّاً." : "وكلاء غير محدودين، نماذج GPT-4o و Claude 3.5، وإدارة فريق."}
                  </p>
                </div>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon-cyan" /> حتى 5 وكلاء ذكيين متقدمين
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon-cyan" /> إشعارات المتصفح والتنبيهات الصوتية
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon-cyan" /> جدول مزامنة الموقع وتصدير التقارير
                  </li>
                </ul>
                <Button
                  disabled={isProcessing}
                  onClick={() => {
                    setShowUpgradeModal(false);
                    handleSubscribe("professional", billingCycle === "yearly" ? 2870 : 299);
                  }}
                  className="w-full bg-gradient-to-r from-neon-cyan to-indigo-500 text-slate-950 font-bold gap-2 shadow-lg shadow-neon-cyan/20 hover:opacity-90 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      جاري معالجة الدفع...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4" /> الانتقال للباقة المحترفة ({billingCycle === "yearly" ? "سنوي" : "شهري"})
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HyperPay Checkout Modal / Simulator Box if checkout is active */}
      {checkoutUrl && (
        <Card className="border-neon-cyan/60 bg-neon-cyan/5 shadow-2xl animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neon-cyan">
              <CreditCard className="w-5 h-5" /> نافذة دفع HyperPay الآمنة
            </CardTitle>
            <CardDescription>
              تم إنشاء جلسة الدفع بنجاح. في بيئة الإنتاج يتم توجيه العميل إلى نموذج دفع HyperPay المعتم (Hosted Checkout Widget).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-card rounded-lg border border-border/40 font-mono text-xs text-muted-foreground break-all">
              Checkout ID: {checkoutUrl}
            </div>
            <div className="flex gap-4">
              <Button onClick={handleSimulateSuccess} disabled={verifyMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <CheckCircle2 className="w-4 h-4" /> محاكاة إتمام الدفع بنجاح (HyperPay Sandbox)
              </Button>
              <Button variant="outline" onClick={() => setCheckoutUrl(null)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans Grid */}
      <div id="pricing-plans-section" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">اختر خطة العمل المناسبة</h2>
          {(agentPct >= 80 || convPct >= 80 || kbPct >= 80) && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" /> اقتربت من استنفاد حصتك، يُنصح بالترقية
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative flex flex-col justify-between border transition-all duration-300 hover:border-neon-cyan/50 ${plan.popular ? "border-neon-cyan/60 bg-gradient-to-b from-neon-cyan/10 via-card to-card shadow-2xl scale-[1.02]" : "border-border/60 bg-card/50"}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-cyan text-slate-950 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  الأكثر طلباً (Most Popular)
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-sm font-semibold text-muted-foreground">{plan.currency} / شهر</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                <ul className="space-y-3 text-sm">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-neon-cyan shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan.id as any, plan.price)}
                  disabled={isProcessing}
                  className={`w-full gap-2 font-bold ${plan.popular ? "bg-neon-cyan text-slate-950 hover:bg-neon-cyan/90 shadow-lg shadow-neon-cyan/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  <Zap className="w-4 h-4" /> الاشتراك الآن عبر HyperPay
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment History Table */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-neon-cyan" /> سجل المعاملات المالية (Payment Transactions)
          </CardTitle>
          <CardDescription>سجل العمليات السابقة وحالات الدفع عبر بوابة HyperPay.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">لا توجد معاملات سجّلت حتى الآن.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="border-b border-border/40 text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">معرف العملية (Checkout ID)</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">رسالة البوابة</th>
                    <th className="py-3 px-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono text-xs">{tx.checkoutId}</td>
                      <td className="py-3 px-4 font-bold">{(tx.amount / 100).toFixed(2)} {tx.currency}</td>
                      <td className="py-3 px-4">
                        <Badge className={tx.status === "success" ? "bg-emerald-500/20 text-emerald-400" : tx.status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{tx.responseMessage || "-"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
