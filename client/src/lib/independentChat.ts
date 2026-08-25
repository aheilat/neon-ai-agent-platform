export type IndependentAgentChatRequest = {
  accessToken: string;
  agentId: number;
  message: string;
  conversationId?: number;
};

export type IndependentAgentChatResponse = {
  agentId: number;
  reply: string;
  conversation: { id: number; status: "active" | "escalated" | "resolved" };
};

type FetchImplementation = typeof fetch;

async function readJsonResponse(response: Response): Promise<unknown> {
  if (typeof response.text !== "function") return response.json();
  const raw = await response.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(response.headers.get("content-type")?.includes("text/html") ? "تعذر الوصول إلى خدمة الوكيل. يبدو أن الخادم يعيد صفحة HTML بدلاً من استجابة API." : "وصل رد غير صالح من خدمة الوكيل.");
  }
}

function getResponseError(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "تعذر الحصول على رد من خدمة Claude المستقلة.";
}

/**
 * Sends a short test prompt only to an agent owned by the current independent
 * Supabase session. The browser sends a Bearer token, never an Anthropic key.
 */
export async function requestIndependentAgentReply(
  { accessToken, agentId, message, conversationId }: IndependentAgentChatRequest,
  fetchImplementation: FetchImplementation = fetch,
): Promise<IndependentAgentChatResponse> {
  const response = await fetchImplementation(`/api/external/agents/${agentId}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, conversationId }),
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getResponseError(payload));
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("reply" in payload) ||
    typeof payload.reply !== "string" ||
    !("agentId" in payload) ||
    typeof payload.agentId !== "number" ||
    !("conversation" in payload) ||
    typeof payload.conversation !== "object" ||
    payload.conversation === null ||
    !("id" in payload.conversation) ||
    typeof payload.conversation.id !== "number" ||
    !("status" in payload.conversation) ||
    !["active", "escalated", "resolved"].includes(String(payload.conversation.status))
  ) {
    throw new Error("وصل رد غير صالح من خدمة Claude المستقلة.");
  }

  return { reply: payload.reply, agentId: payload.agentId, conversation: payload.conversation as IndependentAgentChatResponse["conversation"] };
}

export async function closeIndependentConversation(
  accessToken: string,
  agentId: number,
  conversationId: number,
  fetchImplementation: FetchImplementation = fetch,
) {
  const response = await fetchImplementation(`/api/external/agents/${agentId}/conversations/${conversationId}/close`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(getResponseError(payload));
  if (typeof payload !== "object" || payload === null || !("conversation" in payload) || typeof payload.conversation !== "object" || payload.conversation === null || !("id" in payload.conversation) || typeof payload.conversation.id !== "number" || !("status" in payload.conversation) || payload.conversation.status !== "resolved") {
    throw new Error("وصلت حالة إغلاق غير صالحة من خدمة المحادثة المستقلة.");
  }
  return payload.conversation as { id: number; status: "resolved" };
}
