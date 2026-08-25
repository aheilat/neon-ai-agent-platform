import { completeWithIndependentClaude, type IndependentClaudeMessage } from "./claude";
import { getIndependentAgentInTenant, listIndependentKnowledgeForAgent, type IndependentAgent, type IndependentKnowledgeItem } from "./agentRepository";
import { getIndependentPostgresPool } from "./postgres";
import { resolveIndependentWorkspaceSession, type IndependentRuntimeDependencies } from "./runtime";

type IndependentChatDependencies = Pick<IndependentRuntimeDependencies, "createContext"> & {
  getPool: typeof getIndependentPostgresPool;
  getAgent: typeof getIndependentAgentInTenant;
  getKnowledge: typeof listIndependentKnowledgeForAgent;
  complete: (request: { system: string; messages: IndependentClaudeMessage[]; maxTokens: number }) => Promise<string>;
};

const defaultDependencies: IndependentChatDependencies = {
  createContext: async authorization => {
    const { createIndependentRequestContext } = await import("./context");
    return createIndependentRequestContext(authorization);
  },
  getPool: getIndependentPostgresPool,
  getAgent: getIndependentAgentInTenant,
  getKnowledge: listIndependentKnowledgeForAgent,
  complete: completeWithIndependentClaude,
};

function systemPrompt(agent: IndependentAgent, knowledge: IndependentKnowledgeItem[]) {
  const knowledgeContext = knowledge.length
    ? knowledge.map(item => `- ${item.title}: ${item.content}`).join("\n")
    : "لا توجد معلومات معرفة معتمدة بعد. اطلب تفاصيل إضافية أو حوّل العميل إلى الفريق عند الحاجة.";
  return [
    `أنت ${agent.name}، وكيل خدمة عملاء لـNeon AI Agent Platform.`,
    agent.persona || "أجب بوضوح وود واحترام.",
    agent.decisionRules || "لا تخترع حقائق أو أسعاراً أو مواعيد. استخدم قاعدة المعرفة فقط.",
    "إذا لم تتوفر إجابة موثوقة، اشرح ذلك بإيجاز واقترح التواصل مع الفريق.",
    "قاعدة المعرفة المعتمدة:",
    knowledgeContext,
  ].join("\n\n");
}

export async function generateIndependentAgentReplyForTenant(
  tenantId: number,
  input: { agentId: number; message: string; history?: IndependentClaudeMessage[] },
  dependencies: Omit<IndependentChatDependencies, "createContext"> = defaultDependencies,
) {
  const pool = dependencies.getPool();
  if (!pool) return { kind: "unavailable" as const };
  const agent = await dependencies.getAgent(pool, tenantId, input.agentId);
  if (!agent || agent.status !== "active") return { kind: "not-found" as const };
  const knowledge = await dependencies.getKnowledge(pool, tenantId, agent.id);
  const history = (input.history ?? []).filter(item => item.role === "user" || item.role === "assistant").slice(-10);
  const reply = await dependencies.complete({
    system: systemPrompt(agent, knowledge),
    messages: [...history, { role: "user", content: input.message }],
    maxTokens: 800,
  });
  return { kind: "success" as const, reply, agentId: agent.id };
}

export async function generateIndependentAgentReply(
  authorization: string | undefined,
  input: { agentId: number; message: string; history?: IndependentClaudeMessage[] },
  dependencies: IndependentChatDependencies = defaultDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return { kind: "unauthorized" as const };

  return generateIndependentAgentReplyForTenant(session.workspace.id, input, dependencies);
}
