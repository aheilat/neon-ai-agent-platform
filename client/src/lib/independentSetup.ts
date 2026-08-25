type FetchImplementation = typeof fetch;

export type IndependentAgentProfile = {
  name: string;
  description: string | null;
  persona: string | null;
  tone: "friendly" | "professional" | "direct";
  language: "ar" | "en" | "bilingual";
  status: "active" | "paused" | "draft";
};

export type IndependentKnowledgeInput = {
  title: string;
  content: string;
  category: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

export type IndependentTemplate = {
  id: string;
  name: string;
  description: string;
  persona: string;
  tone: "friendly" | "professional" | "direct";
  language: "ar" | "en" | "bilingual";
  knowledge: Array<{ title: string; content: string }>;
};

export type IndependentWebsiteProposal = {
  websiteUrl: string;
  pages: Array<{ url: string; title: string; description: string; headings: string[] }>;
  analysis: {
    businessName: string;
    businessSummary: string;
    industry: string;
    audience: string;
    language: "ar" | "en" | "bilingual";
    tone: "friendly" | "professional" | "direct";
    persona: string;
    goals: string[];
    suggestedChannels: string[];
    services: Array<{ name: string; description: string; sourceUrl: string }>;
    faqs: Array<{ question: string; answer: string; sourceUrl: string }>;
    guardrails: string[];
  };
};

function serverError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") return payload.error;
  return "تعذر حفظ إعدادات مساحة العمل المستقلة.";
}

async function requestJson<T>(
  path: string,
  method: "POST" | "PATCH" | "GET",
  accessToken: string,
  payload: unknown = undefined,
  fetchImplementation: FetchImplementation,
): Promise<T> {
  const response = await fetchImplementation(path, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(payload) }),
  });
  let body: unknown;
  if (typeof response.text === "function") {
    const raw = await response.text();
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = null; }
  } else {
    body = await response.json() as unknown;
  }
  if (!response.ok) {
    if (body) throw new Error(serverError(body));
    const contentType = response.headers?.get?.("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("text/html")) throw new Error("تعذر الوصول إلى خدمة مساحة العمل حالياً. يبدو أن الخادم يعيد صفحة HTML بدلاً من استجابة API.");
    throw new Error("تعذر حفظ إعدادات مساحة العمل المستقلة.");
  }
  if (!body) throw new Error("وصلت استجابة غير صالحة من خدمة مساحة العمل.");
  return body as T;
}

export function updateIndependentAgentProfile<T>(
  accessToken: string,
  agentId: number,
  profile: IndependentAgentProfile,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}`, "PATCH", accessToken, profile, fetchImplementation);
}

export function createIndependentWorkspaceAgent<T>(
  accessToken: string,
  profile: IndependentAgentProfile,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>("/api/external/agents", "POST", accessToken, profile, fetchImplementation);
}

export function listIndependentTemplates<T = { templates: IndependentTemplate[] }>(
  accessToken: string,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>("/api/external/templates", "GET", accessToken, undefined, fetchImplementation);
}

export function createIndependentAgentFromTemplate<T>(
  accessToken: string,
  templateId: string,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/templates/${encodeURIComponent(templateId)}/agents`, "POST", accessToken, {}, fetchImplementation);
}

export function addIndependentKnowledgeItem<T>(
  accessToken: string,
  agentId: number,
  item: IndependentKnowledgeInput,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/knowledge`, "POST", accessToken, item, fetchImplementation);
}

export function analyzeIndependentCompanyWebsite(
  accessToken: string,
  websiteUrl: string,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<IndependentWebsiteProposal>("/api/external/website/analysis", "POST", accessToken, { websiteUrl, consent: true }, fetchImplementation);
}

export function applyIndependentWebsiteProposal<T>(
  accessToken: string,
  proposal: IndependentWebsiteProposal,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>("/api/external/website/apply-proposal", "POST", accessToken, proposal, fetchImplementation);
}

export function addIndependentImageKnowledge<T>(
  accessToken: string,
  agentId: number,
  image: { fileName: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; dataUrl: string },
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/image-knowledge`, "POST", accessToken, image, fetchImplementation);
}

export function addIndependentTextFileKnowledge<T>(
  accessToken: string,
  agentId: number,
  file: { fileName: string; mediaType: "text/plain" | "text/markdown" | "text/csv" | "application/json"; dataUrl: string },
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/file-knowledge`, "POST", accessToken, file, fetchImplementation);
}

export function addIndependentWebsiteKnowledge<T>(
  accessToken: string,
  agentId: number,
  input: { websiteUrl: string; category: string },
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/website-knowledge`, "POST", accessToken, input, fetchImplementation);
}

export function saveIndependentHandoffContact<T>(
  accessToken: string,
  agentId: number,
  contact: { name: string; phone: string; email: string },
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/handoff-contact`, "PATCH", accessToken, contact, fetchImplementation);
}

export function createIndependentHandoffRequest<T>(
  accessToken: string,
  agentId: number,
  request: { name: string; phone: string; email: string; notes: string; consent: boolean; conversationId?: number | null },
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/handoff-requests`, "POST", accessToken, request, fetchImplementation);
}

export function listIndependentHandoffRequests<T>(
  accessToken: string,
  agentId: number,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/handoff-requests`, "GET", accessToken, undefined, fetchImplementation);
}

export function listIndependentAgentConversations<T>(
  accessToken: string,
  agentId: number,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/conversations`, "GET", accessToken, undefined, fetchImplementation);
}

export function getIndependentAgentConversation<T>(
  accessToken: string,
  agentId: number,
  conversationId: number,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/conversations/${conversationId}`, "GET", accessToken, undefined, fetchImplementation);
}
