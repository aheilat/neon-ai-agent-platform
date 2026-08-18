export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export type SubscriptionBillingCycle = BillingCycle | "trial";
export type PaidPlanId = "starter" | "professional" | "enterprise";

export type BillingPlan = {
  id: PaidPlanId;
  name: string;
  shortName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
};

export const TRIAL_DAYS = 14;

export const TRIAL_PLAN = {
  id: "trial" as const,
  name: "تجربة Neon المجانية",
  description: "اكتشف إعداد وكيلك الأول واختبره قبل الانتقال إلى باقة مدفوعة.",
  durationDays: TRIAL_DAYS,
  features: ["وكيل ذكي واحد", "تحليل موقعك وبناء معرفة أولية", "معاينة المحادثة قبل النشر", "250 محادثة تجريبية"],
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    shortName: "المبتدئة",
    monthlyPrice: 99,
    yearlyPrice: 950,
    description: "للمشاريع الناشئة التي تريد أول وكيل ذكاء اصطناعي لخدمة العملاء.",
    features: ["وكيل ذكي واحد", "1,000 محادثة شهرياً", "موقعك + WhatsApp", "تعلّم من موقع الويب"],
  },
  {
    id: "professional",
    name: "Growth",
    shortName: "النمو",
    monthlyPrice: 299,
    yearlyPrice: 2870,
    description: "للشركات التي تريد تشغيل القنوات والفريق والمبيعات من مساحة موحدة.",
    features: ["حتى 5 وكلاء", "5,000 محادثة شهرياً", "فريق وتحويل بشري", "تحليلات ومزامنة موقع"],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    shortName: "المؤسسات",
    monthlyPrice: 799,
    yearlyPrice: 7670,
    description: "للتوسع المؤسسي والتكاملات والاحتياجات الأمنية المتقدمة.",
    features: ["وكلاء وقنوات موسعة", "50,000 محادثة شهرياً", "دعم أولوية", "إعدادات مخصصة"],
  },
];

export function getBillingPlan(planId: PaidPlanId) {
  const plan = BILLING_PLANS.find(item => item.id === planId);
  if (!plan) throw new Error(`Unknown Neon billing plan: ${planId}`);
  return plan;
}

export function getPlanPrice(planId: PaidPlanId, cycle: BillingCycle) {
  const plan = getBillingPlan(planId);
  return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

export function getSubscriptionPeriodEnd(start: Date, cycle: SubscriptionBillingCycle) {
  const end = new Date(start);
  if (cycle === "trial") {
    end.setUTCDate(end.getUTCDate() + TRIAL_DAYS);
    return end;
  }
  end.setUTCMonth(end.getUTCMonth() + (cycle === "yearly" ? 12 : 1));
  return end;
}
