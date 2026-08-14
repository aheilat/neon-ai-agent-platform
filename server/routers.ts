import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  addMessage,
  createAgentForTenant,
  createConversation,
  createKnowledgeItem,
  replaceWebsiteKnowledge,
  deleteKnowledgeItem,
  createLead,
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  updateMemberAvailability,
  updateMemberActivity,
  setMemberIdleTimeout,
  getTeamInvites,
  createTeamInvite,
  getTeamAssignments,
  setTeamAssignment,
  getTenantNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  savePushSubscription,
  getTenantPushSubscriptions,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  ensureDefaultAgent,
  getAgentAndTenant,
  getPublicAgent,
  getAgentInTenant,
  getConversationWithMessages,
  getKnowledgeForAgent,
  getOrCreateTenant,
  getTenantAgents,
  getTenantConversations,
  getTenantStats,
  listChannelIntegrations,
  markConversationStatus,
  updateAgentInTenant,
  upsertChannelIntegration,
} from "./db";
import { buildAgentPrompt, containsEscalationKeyword, createAssistantReply, fallbackReply, normalizeLlmContent, toSafeAgentSettings } from "./agentEngine";
import { analyzeWebsite, websiteAnalysisSchema } from "./websiteAnalyzer";

const agentInput = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  persona: z.string().max(5000).optional(),
  tone: z.string().max(50).default("professional"),
  language: z.enum(["ar", "en", "bilingual"]).default("bilingual"),
  decisionRules: z.string().max(5000).optional(),
  fallbackMessage: z.string().max(1000).optional(),
  escalationKeyword: z.string().max(200).optional(),
  status: z.enum(["active", "paused", "draft"]).default("active"),
});

const onboardingGoal = z.enum(["questions", "issues", "recommend", "buy", "leads", "appointments", "orders", "route", "symptoms", "medications", "insurance", "emergency", "human"]);
const onboardingChannel = z.enum(["web", "whatsapp", "messenger", "instagram", "phone"]);
const industryTemplateSchema = z.enum(["ecommerce", "realestate", "healthcare", "general"]).default("general");

const industryTemplates: Record<z.infer<typeof industryTemplateSchema>, { name: string; description: string; persona: string; goals: Array<z.infer<typeof onboardingGoal>>; channels: Array<z.infer<typeof onboardingChannel>>; knowledge: Array<{ title: string; content: string }> }> = {
  ecommerce: {
    name: "خبير التجارة الإلكترونية",
    description: "متخصص في تتبع الطلبات، اقتراح المنتجات، وتسهيل عمليات الشراء للعملاء.",
    persona: "أنت مساعد تجارة إلكترونية ودود وخبير بالمنتجات. تساعد العميل في اختيار المقاس، تتبع الشحنة، وإتمام الدفع بثقة.",
    goals: ["recommend", "buy", "orders", "human"],
    channels: ["web", "whatsapp", "instagram"],
    knowledge: [
      { title: "سياسة الشحن والتوصيل", content: "التوصيل خلال 2 إلى 4 أيام عمل لكافة المدن. الشحن مجاني للطلبات فوق 300 ريال." },
      { title: "سياسة الاسترجاع والاستبدال", content: "الاسترجاع متاح خلال 7 أيام من استلام الطلب بشرط أن يكون المنتج بحالته الأصلية." },
    ],
  },
  realestate: {
    name: "مستشار العقارات الذكي",
    description: "متخصص في عرض الوحدات، حجز المعاينات، وتأهيل العملاء المهتمين بالشراء أو الإيجار.",
    persona: "أنت مستشار عقاري احترافي وموثوق. تساعد العميل في إيجاد العقار المناسب، معرفة الأسعار، وحجز موعد معاينة.",
    goals: ["recommend", "appointments", "leads", "human"],
    channels: ["web", "whatsapp", "phone"],
    knowledge: [
      { title: "المشاريع الحالية والأسعار", content: "متوفر فلل وققق فندقية بأسعار تبدأ من 450 ألف ريال مع خطط دفع مرنة حتى 5 سنوات." },
      { title: "حجز المعاينات", content: "المعاينات متاحة طوال أيام الأسبوع من 4 عصراً وحتى 9 مساءً بحجز مسبق." },
    ],
  },
  healthcare: {
    name: "منسق الرعاية الصحية الذكي",
    description: "مساعد آمن لتوجيه المرضى، حجز المواعيد، وتنظيم الأسئلة الصحية العامة دون تشخيص.",
    persona: "أنت منسق رعاية صحية متعاطف ومحترف. اجمع المعلومات العامة بهدوء، ساعد في حجز الموعد وتوجيه المريض للقسم المناسب، ولا تشخّص الحالات أو تصف الأدوية أو تغيّر الجرعات. عند وجود أعراض خطيرة أو خطر فوري، وجّه المريض فوراً إلى خدمات الطوارئ المحلية ولا تطلب منه الانتظار.",
    goals: ["questions", "appointments", "symptoms", "insurance", "emergency", "human"],
    channels: ["web", "whatsapp", "phone"],
    knowledge: [
      { title: "حجز المواعيد الطبية", content: "ساعد المريض في تحديد التخصص والخدمة والوقت المناسب، ثم أكد بيانات التواصل الضرورية فقط قبل إرسال طلب الحجز إلى الفريق المختص." },
      { title: "الاستفسارات الصحية العامة", content: "قدّم معلومات تثقيفية عامة من قاعدة المعرفة دون تشخيص أو وصف علاج. وضّح أن المعلومات لا تغني عن تقييم طبيب أو مختص مرخّص." },
      { title: "علامات الخطر والطوارئ", content: "إذا ذكر المريض خطراً فورياً أو أعراضاً شديدة مثل صعوبة التنفس أو فقدان الوعي أو نزيف حاد، اطلب منه التواصل فوراً مع رقم الطوارئ المحلي أو التوجه لأقرب قسم طوارئ، ولا تؤخر طلب المساعدة بأسئلة إضافية." },
      { title: "الخصوصية والبيانات الحساسة", content: "لا تطلب كلمات مرور أو أرقام بطاقات أو صور هويات أو تفاصيل طبية غير ضرورية. اجمع الحد الأدنى اللازم للتوجيه أو الحجز، وحوّل التفاصيل الحساسة إلى الفريق المختص عبر القناة المعتمدة." },
    ],
  },
  general: {
    name: "موظف Neon الذكي",
    description: "وكيل خدمة عملاء عام للرد على الاستفسارات وحل الشكاوى وتوجيه العملاء.",
    persona: "أنت موظف خدمة عملاء ودود وعملي. تساعد العميل في الإجابة على الأسئلة وتقديم الدعم السريع.",
    goals: ["questions", "human"],
    channels: ["web"],
    knowledge: [
      { title: "الأسئلة الشائعة العامة", content: "نحن متواجدون لخدمتكم على مدار الساعة طوال أيام الأسبوع عبر القنوات الرقمية." },
    ],
  },
};

const onboardingKnowledge: Record<z.infer<typeof onboardingGoal>, { title: string; content: string }> = {
  questions: { title: "إرشادات الرد على الأسئلة", content: "أجب باختصار ووضوح، واذكر المعلومات المتوفرة في قاعدة المعرفة فقط. إذا لم تتأكد من الإجابة، اطلب تفاصيل إضافية أو حوّل العميل لموظف." },
  issues: { title: "إرشادات حل المشاكل والشكاوى", content: "استمع للعميل، لخّص المشكلة، اقترح خطوة عملية، وابقَ هادئاً وودوداً. صعّد الحالات الحساسة أو غير المحلولة للفريق البشري." },
  recommend: { title: "إرشادات اقتراح المنتجات", content: "اسأل عن احتياج العميل وميزانيته وتفضيلاته قبل الاقتراح. اعرض خيارين أو ثلاثة مع سبب واضح لكل خيار." },
  buy: { title: "إرشادات مساعدة العميل على الشراء", content: "وجّه العميل إلى الخطوة التالية في الشراء، وتحقق من المنتج والكمية وبيانات التواصل قبل تحويله للدفع أو للفريق." },
  leads: { title: "إرشادات جمع العملاء المحتملين", content: "اطلب الاسم ووسيلة التواصل بإذن العميل، ثم صنّف اهتمامه ودوّن احتياجه الرئيسي دون طلب بيانات حساسة." },
  appointments: { title: "إرشادات حجز المواعيد", content: "اجمع اليوم والوقت المناسب ونوع الخدمة وبيانات التواصل، ثم أكد التفاصيل قبل إرسال الحجز للفريق." },
  orders: { title: "إرشادات تتبع الطلبات", content: "اطلب رقم الطلب أو وسيلة التحقق المناسبة، ثم اعرض الحالة المتاحة ووقت التحديث، وحوّل الاستفسار للفريق عند الحاجة." },
  route: { title: "إرشادات توجيه العميل", content: "حدّد نوع طلب العميل والقسم المناسب، ثم وجّهه بوضوح مع إبقاء خيار التواصل مع موظف متاح." },
  symptoms: { title: "إرشادات الاستفسارات عن الأعراض", content: "اسأل عن المعلومات العامة اللازمة للتوجيه فقط، ولا تقدّم تشخيصاً أو وصفة علاجية. شجّع على استشارة مختص، وصعّد الحالات المقلقة أو غير الواضحة للفريق الصحي." },
  medications: { title: "إرشادات الأدوية", content: "قدّم معلومات تنظيمية عامة مثل مواعيد التواصل أو طلب إعادة التعبئة فقط. لا تغيّر الجرعات ولا تقترح بدء أو إيقاف دواء، ووجّه المريض للصيدلي أو الطبيب المختص." },
  insurance: { title: "إرشادات التأمين الصحي", content: "اشرح خطوات التحقق من التغطية والمستندات المطلوبة بصورة عامة، ولا تطلب بيانات مالية أو هوية كاملة داخل المحادثة. حوّل الحالات الخاصة إلى موظف مختص." },
  emergency: { title: "إرشادات الحالات الطارئة", content: "عند وجود خطر فوري أو أعراض شديدة، وجّه المريض مباشرة إلى خدمات الطوارئ المحلية أو أقرب قسم طوارئ، ولا تؤخر طلب المساعدة بمحاولة التشخيص أو جمع تفاصيل غير ضرورية." },
  human: { title: "إرشادات التحويل لموظف", content: "عند طلب العميل موظفاً أو وجود شكوى حساسة، اجمع ملخصاً قصيراً وأرسل المحادثة إلى عضو الفريق المتاح." },
};

async function workspaceForUser(user: NonNullable<Parameters<typeof getOrCreateTenant>[0]>) {
  const tenant = await getOrCreateTenant(user);
  if (!tenant) throw new Error("Workspace is not available yet");
  return tenant;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  workspace: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      const defaultAgent = await ensureDefaultAgent(tenant.id);
      const [agents, stats, conversations, integrations] = await Promise.all([
        getTenantAgents(tenant.id),
        getTenantStats(tenant.id),
        getTenantConversations(tenant.id),
        listChannelIntegrations(tenant.id),
      ]);
      return {
        tenant,
        defaultAgent: defaultAgent ? toSafeAgentSettings(defaultAgent) : undefined,
        agents: agents.map(toSafeAgentSettings),
        stats,
        conversations,
        integrations,
      };
    }),
  }),

  agents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantAgents(tenant.id);
    }),
    create: protectedProcedure.input(agentInput).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return createAgentForTenant({ tenantId: tenant.id, ...input });
    }),
    analyzeWebsite: protectedProcedure.input(z.object({
      websiteUrl: z.string().url().max(2048),
      consent: z.literal(true),
    })).mutation(async ({ input }) => {
      const result = await analyzeWebsite(input.websiteUrl);
      return {
        websiteUrl: result.websiteUrl,
        pages: result.pages.map(page => ({ url: page.url, title: page.title, description: page.description, headings: page.headings })),
        analysis: result.analysis,
      };
    }),
    onboardFromWebsite: protectedProcedure.input(z.object({
      websiteUrl: z.string().url().max(2048),
      analysis: websiteAnalysisSchema,
      sourcePages: z.array(z.object({ url: z.string().url(), title: z.string().max(255) })).min(1).max(5),
      goals: z.array(onboardingGoal).min(1).max(9),
      channels: z.array(onboardingChannel).min(1).max(5).optional(),
      language: z.enum(["ar", "en", "bilingual"]).optional(),
      tone: z.string().max(80).optional(),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const configuredChannels: Array<z.infer<typeof onboardingChannel>> = input.channels?.length ? input.channels : input.analysis.suggestedChannels;
      const fallbackMessage = "أقدر أساعدك بمعلومات الخدمات المتاحة على موقعكم، وإذا احتجت حالة خاصة أحوّلك إلى أحد أعضاء الفريق.";
      const agent = await createAgentForTenant({
        tenantId: tenant.id,
        name: input.analysis.businessName,
        description: input.analysis.businessSummary,
        persona: input.analysis.persona,
        tone: input.tone || input.analysis.tone,
        language: input.language || input.analysis.language,
        decisionRules: input.analysis.guardrails.join(" "),
        fallbackMessage,
        escalationKeyword: "موظف، إنسان، شكوى، عاجل، human, agent",
        status: "active",
      });
      if (!agent) throw new Error("Agent could not be created");

      const defaultSource = input.sourcePages[0] || { url: input.websiteUrl, title: input.analysis.businessName };
      const pageMap = new Map(input.sourcePages.map(p => [p.url, p]));
      const selectedGoalKnowledge = input.goals.map(goal => onboardingKnowledge[goal]);
      const knowledgeItems = [
        ...input.analysis.services.map(service => {
          const matchedPage = service.sourceUrl ? pageMap.get(service.sourceUrl) : undefined;
          return {
            title: service.name,
            content: service.description,
            category: "Website service",
            sourceUrl: service.sourceUrl || matchedPage?.url || defaultSource.url,
            sourceTitle: matchedPage?.title || defaultSource.title,
          };
        }),
        ...input.analysis.faqs.map(faq => {
          const matchedPage = faq.sourceUrl ? pageMap.get(faq.sourceUrl) : undefined;
          return {
            title: `FAQ: ${faq.question}`.slice(0, 255),
            content: faq.answer,
            category: "Website FAQ",
            sourceUrl: faq.sourceUrl || matchedPage?.url || defaultSource.url,
            sourceTitle: matchedPage?.title || defaultSource.title,
          };
        }),
        ...selectedGoalKnowledge.map(item => ({
          title: item.title,
          content: item.content,
          category: "Agent goal",
          sourceUrl: defaultSource.url,
          sourceTitle: defaultSource.title,
        })),
      ];
      if (!knowledgeItems.length) knowledgeItems.push({ title: "ملخص النشاط من الموقع", content: input.analysis.businessSummary, category: "Website summary", sourceUrl: defaultSource.url, sourceTitle: defaultSource.title });
      for (const item of knowledgeItems) {
        await createKnowledgeItem({ tenantId: tenant.id, agentId: agent.id, title: item.title, content: item.content, category: item.category, sourceUrl: item.sourceUrl, sourceTitle: item.sourceTitle, sourceFetchedAt: new Date() });
      }
      for (const channel of configuredChannels) {
        await upsertChannelIntegration({ tenantId: tenant.id, agentId: agent.id, channel, isActive: channel === "web" ? 1 : 0, configJson: { setupStatus: channel === "web" ? "ready" : "needs_credentials", source: "website_analysis", websiteUrl: input.websiteUrl } });
      }
      return { agent: toSafeAgentSettings(agent), knowledgeCount: knowledgeItems.length, channelCount: configuredChannels.length, analysis: { ...input.analysis, goals: input.goals } };
    }),
    onboard: protectedProcedure.input(z.object({
      language: z.enum(["ar", "en", "bilingual"]).default("bilingual"),
      tone: z.string().max(50).default("friendly"),
      templateId: industryTemplateSchema.optional(),
      goals: z.array(onboardingGoal).min(1).max(9),
      channels: z.array(onboardingChannel).min(1).max(5).optional(),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const template = industryTemplates[input.templateId || "general"];
      const goalKnowledge = input.goals.map(goal => onboardingKnowledge[goal]);
      const allKnowledge = [...template.knowledge, ...goalKnowledge];
      const uniqueKnowledge = Array.from(new Map(allKnowledge.map(item => [item.title, item])).values());
      const configuredChannels: Array<z.infer<typeof onboardingChannel>> = input.channels?.length ? input.channels : template.channels;
      const isHealthcareTemplate = input.templateId === "healthcare";

      const agent = await createAgentForTenant({
        tenantId: tenant.id,
        name: template.name,
        description: template.description,
        persona: template.persona,
        tone: input.tone,
        language: input.language,
        decisionRules: isHealthcareTemplate ? "قدّم تثقيفاً عاماً فقط، ولا تشخّص أو تصف دواءً أو تغيّر جرعة. لا تجمع بيانات صحية أو شخصية غير ضرورية. عند ذكر خطر فوري أو أعراض شديدة، وجّه المريض فوراً إلى الطوارئ المحلية وصعّد المحادثة للفريق الصحي." : input.goals.includes("human") ? "إذا طلب العميل موظفاً أو ظهرت شكوى حساسة، صعّد المحادثة للفريق البشري." : "قدّم إجابة مباشرة، ثم اقترح الخطوة التالية المناسبة.",
        fallbackMessage: isHealthcareTemplate ? "أفضّل أن يراجعك مختص صحي. إذا كانت هناك حالة طارئة أو خطر فوري، تواصل الآن مع خدمات الطوارئ المحلية." : "خلني أتأكد من أحد أعضاء الفريق وأرجع لك بأقرب وقت.",
        escalationKeyword: isHealthcareTemplate ? "طوارئ، إسعاف، ضيق تنفس، فقدان وعي، نزيف، عاجل، طبيب، موظف" : "موظف، إنسان، شكوى، عاجل",
        status: "active",
      });
      if (!agent) throw new Error("Agent could not be created");

      for (const item of uniqueKnowledge) {
        await createKnowledgeItem({ tenantId: tenant.id, agentId: agent.id, title: item.title, content: item.content, category: "Template" });
      }
      for (const channel of configuredChannels) {
        await upsertChannelIntegration({ tenantId: tenant.id, agentId: agent.id, channel, isActive: channel === "web" ? 1 : 0, configJson: { setupStatus: channel === "web" ? "ready" : "needs_credentials", source: "onboarding", templateId: input.templateId || "general" } });
      }
      return { agent: toSafeAgentSettings(agent), knowledgeCount: uniqueKnowledge.length, channelCount: configuredChannels.length };
    }),
    previewChat: protectedProcedure.input(z.object({
      language: z.enum(["ar", "en", "bilingual"]).default("bilingual"),
      tone: z.string().max(50).default("friendly"),
      templateId: industryTemplateSchema.optional(),
      websiteAnalysis: websiteAnalysisSchema.optional(),
      goals: z.array(onboardingGoal).min(1).max(9),
      message: z.string().min(1).max(1000),
    })).mutation(async ({ input }) => {
      const websiteProfile = input.websiteAnalysis;
      const template = websiteProfile ? {
        name: websiteProfile.businessName,
        persona: websiteProfile.persona,
        knowledge: [
          ...websiteProfile.services.map(service => ({ title: service.name, content: service.description })),
          ...websiteProfile.faqs.map(faq => ({ title: `FAQ: ${faq.question}`.slice(0, 255), content: faq.answer })),
        ],
      } : industryTemplates[input.templateId || "general"];
      const goalKnowledge = websiteProfile ? [] : input.goals.map(goal => onboardingKnowledge[goal]);
      const allKnowledge = [...template.knowledge, ...goalKnowledge];
      const uniqueKnowledge = Array.from(new Map(allKnowledge.map(item => [item.title, item])).values());
      const tempAgent = {
        name: template.name,
        persona: template.persona,
        tone: input.tone,
        language: input.language,
        decisionRules: websiteProfile ? websiteProfile.guardrails.join(" ") : "أجب بثقة واقترح الخطوة التالية.",
        fallbackMessage: websiteProfile ? "أقدر أساعدك بمعلومات الخدمات المنشورة، وأحوّلك إلى الفريق عند الحاجة." : "أقدر أساعدك أكثر بتفاصيل إضافية أو بتحويلك لأحد الزملاء.",
        escalationKeyword: "موظف,إنسان,شكوى,human,agent,عاجل",
      };
      const formattedKnowledge = uniqueKnowledge.map((item: { title: string; content: string }, i: number) => ({ id: i + 1, title: item.title, content: item.content, category: "Template", tenantId: 0, agentId: 0, sourceUrl: null, sourceTitle: null, sourceFetchedAt: null, createdAt: new Date(), updatedAt: new Date() }));
      const prompt = buildAgentPrompt(tempAgent as any, formattedKnowledge, input.message);
      const isEscalated = containsEscalationKeyword(input.message, tempAgent.escalationKeyword);
      if (isEscalated) {
        return {
          reply: input.language === "ar" ? "أهلاً بك! تم تحويل طلبك لأحد أعضاء الفريق المختصين للمتابعة الفورية." : "Hello! Your request has been handed over to our support team for immediate follow-up.",
          escalated: true,
        };
      }
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "أنت مساعد ذكي لخدمة العملاء. أجب بلغة طبيعية ومختصرة تتناسب مع طلب العميل." },
            { role: "user", content: prompt },
          ],
        });
        const reply = normalizeLlmContent(response.choices[0]?.message?.content) || "أهلاً بك! كيف أقدر أساعدك اليوم؟";
        return { reply, escalated: false };
      } catch (err) {
        return {
          reply: input.language === "ar" ? "أهلاً بك! استلمت استفسارك، وأنا جاهز لمساعدتك بالخطوة التالية." : "Hello! I received your inquiry and I am ready to help you with the next step.",
          escalated: false,
        };
      }
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), patch: agentInput.partial() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return updateAgentInTenant(tenant.id, input.id, input.patch);
    }),
    syncFromWebsite: protectedProcedure.input(z.object({
      agentId: z.number().int().positive(),
      websiteUrl: z.string().url().max(2048),
      consent: z.literal(true),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");

      const result = await analyzeWebsite(input.websiteUrl);
      const sourcePages = result.pages.map(page => ({ url: page.url, title: page.title }));
      const analysis = result.analysis;
      const sourceMap = new Map(sourcePages.map(page => [page.url.replace(/\/$/, ""), page]));
      const defaultSource = sourcePages[0];
      const knowledgeItems = [
        ...analysis.services.map(service => {
          const source = sourceMap.get(service.sourceUrl.replace(/\/$/, ""));
          if (!source) throw new Error("تعذر التحقق من مصدر إحدى الخدمات المستخرجة.");
          return { title: service.name, content: service.description, category: "Website service", sourceUrl: source.url, sourceTitle: source.title };
        }),
        ...analysis.faqs.map(faq => {
          const source = sourceMap.get(faq.sourceUrl.replace(/\/$/, ""));
          if (!source) throw new Error("تعذر التحقق من مصدر أحد الأسئلة المستخرجة.");
          return { title: `FAQ: ${faq.question}`.slice(0, 255), content: faq.answer, category: "Website FAQ", sourceUrl: source.url, sourceTitle: source.title };
        }),
      ];
      if (!knowledgeItems.length && defaultSource) knowledgeItems.push({ title: "ملخص النشاط من الموقع", content: analysis.businessSummary, category: "Website summary", sourceUrl: defaultSource.url, sourceTitle: defaultSource.title });

      const updatedAgent = await updateAgentInTenant(tenant.id, agent.id, {
        description: analysis.businessSummary,
        persona: analysis.persona,
        tone: analysis.tone,
        language: analysis.language,
        decisionRules: analysis.guardrails.join(" "),
        sourceWebsiteUrl: result.websiteUrl,
        lastWebsiteSyncAt: new Date(),
      });
      const knowledge = await replaceWebsiteKnowledge({ tenantId: tenant.id, agentId: agent.id, items: knowledgeItems });
      return { agent: updatedAgent ? toSafeAgentSettings(updatedAgent) : undefined, analysis, pages: sourcePages, knowledgeCount: knowledge.length, syncedAt: new Date() };
    }),
  }),

  knowledge: router({
    list: protectedProcedure.input(z.object({ agentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      return getKnowledgeForAgent(tenant.id, agent.id);
    }),
    create: protectedProcedure.input(z.object({ agentId: z.number().int().positive(), title: z.string().min(2).max(255), content: z.string().min(10).max(30000), category: z.string().max(100).default("FAQ") })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      return createKnowledgeItem({ tenantId: tenant.id, agentId: agent.id, title: input.title, content: input.content, category: input.category });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await deleteKnowledgeItem(tenant.id, input.id);
      return { success: true };
    }),
  }),

  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantConversations(tenant.id);
    }),
    detail: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getConversationWithMessages(tenant.id, input.id);
    }),
    setStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "escalated", "resolved"]) })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await markConversationStatus(tenant.id, input.id, input.status);
      return { success: true };
    }),
  }),

  analytics: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantStats(tenant.id);
    }),
  }),

  channels: router({
    list: protectedProcedure.input(z.object({ agentId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return listChannelIntegrations(tenant.id, input?.agentId);
    }),
    configure: protectedProcedure.input(z.object({ agentId: z.number().int().positive(), channel: z.enum(["whatsapp", "messenger", "instagram", "phone", "web"]), isActive: z.boolean(), configJson: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      return upsertChannelIntegration({ tenantId: tenant.id, agentId: input.agentId, channel: input.channel, isActive: input.isActive ? 1 : 0, configJson: input.configJson });
    }),
  }),

  chat: router({
    reply: protectedProcedure.input(z.object({
      agentId: z.number().int().positive(),
      conversationId: z.number().int().positive().optional(),
      message: z.string().min(1).max(5000),
      channel: z.enum(["web", "whatsapp", "messenger", "instagram", "phone"]).default("web"),
      customerName: z.string().max(255).optional(),
      customerEmail: z.string().email().max(320).optional(),
      customerPhone: z.string().max(50).optional(),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      if (agent.status !== "active") return { ...fallbackReply(agent), conversationId: input.conversationId ?? null };

      let conversationId = input.conversationId;
      let history = input.conversationId ? await getConversationWithMessages(tenant.id, input.conversationId) : undefined;
      if (conversationId && !history) throw new Error("Conversation not found in workspace");
      if (!conversationId) {
        const conversation = await createConversation({
          tenantId: tenant.id,
          agentId: agent.id,
          channel: input.channel,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          status: "active",
        });
        if (!conversation) throw new Error("Conversation could not be created");
        conversationId = conversation.id;
        history = { conversation, messages: [] };
      }

      await addMessage({ conversationId, sender: "customer", content: input.message });
      const escalated = containsEscalationKeyword(input.message, agent.escalationKeyword);
      if (escalated) {
        const reply = fallbackReply(agent);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        await markConversationStatus(tenant.id, conversationId, "escalated");
        return { ...reply, conversationId };
      }

      const knowledge = await getKnowledgeForAgent(tenant.id, agent.id);
      const prompt = buildAgentPrompt(agent, knowledge, input.message);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "أنت وكيل خدمة عملاء متعدد اللغات. كن دقيقاً، لا تختلق معلومات، ووجّه العميل إلى خطوة عملية." },
            ...(history?.messages.slice(-8).map(item => ({ role: item.sender === "customer" ? "user" as const : "assistant" as const, content: item.content })) ?? []),
            { role: "user", content: prompt },
          ],
        });
        const content = normalizeLlmContent(response.choices?.[0]?.message?.content);
        const reply = createAssistantReply(content);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        return { ...reply, conversationId };
      } catch (error) {
        console.error("[AI Agent] LLM request failed", error);
        const reply = createAssistantReply(agent.fallbackMessage || "حالياً ما قدرت أوصل للمحرك الذكي. خلّني أحوّلك للفريق.", true);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        await markConversationStatus(tenant.id, conversationId, "escalated");
        return { ...reply, conversationId };
      }
    }),
    publicReply: publicProcedure.input(z.object({
      agentId: z.number().int().positive(),
      conversationId: z.number().int().positive().optional(),
      message: z.string().min(1).max(5000),
      customerName: z.string().max(255).optional(),
      customerEmail: z.string().email().max(320).optional(),
      customerPhone: z.string().max(50).optional(),
    })).mutation(async ({ input }) => {
      const agent = await getPublicAgent(input.agentId);
      if (!agent) throw new Error("Agent not found");
      let conversationId = input.conversationId;
      let history = input.conversationId ? await getConversationWithMessages(agent.tenantId, input.conversationId) : undefined;
      if (conversationId && !history) throw new Error("Conversation not found");
      if (!conversationId) {
        const conversation = await createConversation({ tenantId: agent.tenantId, agentId: agent.id, channel: "web", customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone, status: "active" });
        if (!conversation) throw new Error("Conversation could not be created");
        conversationId = conversation.id;
        history = { conversation, messages: [] };
      }
      await addMessage({ conversationId, sender: "customer", content: input.message });
      if (input.customerName || input.customerEmail || input.customerPhone) {
        await createLead({ tenantId: agent.tenantId, agentId: agent.id, conversationId, name: input.customerName || "زائر مهتم", email: input.customerEmail, phone: input.customerPhone, notes: input.message });
      }
      if (containsEscalationKeyword(input.message, agent.escalationKeyword)) {
        const reply = fallbackReply(agent);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        await markConversationStatus(agent.tenantId, conversationId, "escalated");
        await createNotification({
          tenantId: agent.tenantId,
          title: `تصعيد محادثة جديدة (${agent.name})`,
          message: `طلب العميل التحدث لموظف في المحادثة #${conversationId}. يرجى المراجعة والتدخل.`,
          type: "escalation",
        });
        return { ...reply, conversationId };
      }
      try {
        const knowledge = await getKnowledgeForAgent(agent.tenantId, agent.id);
        const response = await invokeLLM({ messages: [{ role: "system", content: "أنت وكيل خدمة عملاء متعدد اللغات. لا تخترع معلومات، واكتب رداً مفيداً." }, ...(history?.messages.slice(-8).map(item => ({ role: item.sender === "customer" ? "user" as const : "assistant" as const, content: item.content })) ?? []), { role: "user", content: buildAgentPrompt(agent, knowledge, input.message) }] });
        const reply = createAssistantReply(normalizeLlmContent(response.choices?.[0]?.message?.content));
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        return { ...reply, conversationId };
      } catch (error) {
        console.error("[Public Widget] LLM request failed", error);
        const reply = createAssistantReply(agent.fallbackMessage || "أقدر أساعدك أكثر إذا شاركتني تفاصيل إضافية.", true);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        return { ...reply, conversationId };
      }
    }),
  }),

  team: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      const members = await getTeamMembers(tenant.id);
      const invites = await getTeamInvites(tenant.id);
      const assignments = await getTeamAssignments(tenant.id);
      return { members, invites, assignments };
    }),
    invite: protectedProcedure.input(z.object({ email: z.string().email(), role: z.enum(["admin", "agent", "viewer"]).default("agent") })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const invite = await createTeamInvite({ tenantId: tenant.id, email: input.email, role: input.role });
      const name = input.email.split("@")[0];
      await addTeamMember({ tenantId: tenant.id, name: name.charAt(0).toUpperCase() + name.slice(1), email: input.email, role: input.role });
      return { success: true, invite };
    }),
    updateRole: protectedProcedure.input(z.object({ memberId: z.number().int().positive(), role: z.enum(["admin", "agent", "viewer", "owner"]) })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await updateTeamMemberRole(tenant.id, input.memberId, input.role);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ memberId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await removeTeamMember(tenant.id, input.memberId);
      return { success: true };
    }),
    setAvailability: protectedProcedure.input(z.object({ memberId: z.number().int().positive(), availability: z.enum(["online", "offline", "busy"]) })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await updateMemberAvailability(tenant.id, input.memberId, input.availability);
      return { success: true };
    }),
    setIdleTimeout: protectedProcedure.input(z.object({ memberId: z.number().int().positive(), idleTimeoutMinutes: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await setMemberIdleTimeout(tenant.id, input.memberId, input.idleTimeoutMinutes);
      return { success: true };
    }),
    pingActivity: protectedProcedure.mutation(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      await updateMemberActivity(tenant.id, ctx.user.id);
      return { success: true };
    }),
    setAssignment: protectedProcedure.input(z.object({ memberId: z.number().int().positive(), targetType: z.enum(["agent", "channel"]), targetId: z.string(), assign: z.boolean() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await setTeamAssignment({ tenantId: tenant.id, memberId: input.memberId, targetType: input.targetType, targetId: input.targetId, assign: input.assign });
      return { success: true };
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantNotifications(tenant.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await markNotificationRead(tenant.id, input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      await markAllNotificationsRead(tenant.id);
      return { success: true };
    }),
    subscribe: protectedProcedure.input(z.object({
      endpoint: z.string(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await savePushSubscription({
        tenantId: tenant.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      });
      return { success: true };
    }),
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getUserNotificationPreferences(tenant.id, ctx.user.id);
    }),
    updatePreferences: protectedProcedure.input(z.object({
      escalationPush: z.boolean(),
      assignmentPush: z.boolean(),
      leadPush: z.boolean(),
      generalPush: z.boolean(),
      soundAlerts: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await updateUserNotificationPreferences({
        tenantId: tenant.id,
        userId: ctx.user.id,
        escalationPush: input.escalationPush ? 1 : 0,
        assignmentPush: input.assignmentPush ? 1 : 0,
        leadPush: input.leadPush ? 1 : 0,
        generalPush: input.generalPush ? 1 : 0,
        soundAlerts: input.soundAlerts !== undefined ? (input.soundAlerts ? 1 : 0) : 1,
      });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
