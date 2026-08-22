export type IndependentAgentChatRequest = {
  accessToken: string;
  agentId: number;
  message: string;
};

export type IndependentAgentChatResponse = {
  agentId: number;
  reply: string;
};

type FetchImplementation = typeof fetch;

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
  { accessToken, agentId, message }: IndependentAgentChatRequest,
  fetchImplementation: FetchImplementation = fetch,
): Promise<IndependentAgentChatResponse> {
  const response = await fetchImplementation(`/api/external/agents/${agentId}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  const payload = await response.json() as unknown;

  if (!response.ok) {
    throw new Error(getResponseError(payload));
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("reply" in payload) ||
    typeof payload.reply !== "string" ||
    !("agentId" in payload) ||
    typeof payload.agentId !== "number"
  ) {
    throw new Error("وصل رد غير صالح من خدمة Claude المستقلة.");
  }

  return { reply: payload.reply, agentId: payload.agentId };
}
