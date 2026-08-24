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

function serverError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") return payload.error;
  return "تعذر حفظ إعدادات مساحة العمل المستقلة.";
}

async function requestJson<T>(
  path: string,
  method: "POST" | "PATCH",
  accessToken: string,
  payload: unknown,
  fetchImplementation: FetchImplementation,
): Promise<T> {
  const response = await fetchImplementation(path, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as unknown;
  if (!response.ok) throw new Error(serverError(body));
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

export function addIndependentKnowledgeItem<T>(
  accessToken: string,
  agentId: number,
  item: IndependentKnowledgeInput,
  fetchImplementation: FetchImplementation = fetch,
) {
  return requestJson<T>(`/api/external/agents/${agentId}/knowledge`, "POST", accessToken, item, fetchImplementation);
}
