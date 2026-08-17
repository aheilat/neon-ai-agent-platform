import { describe, expect, it } from "vitest";
import { getChatModelCandidates, normalizeChatModel } from "./chatModels";

describe("chat model routing", () => {
  it("migrates legacy unavailable model names to the fast default", () => {
    expect(normalizeChatModel("gpt-4o")).toBe("auto");
    expect(normalizeChatModel("claude-3-5-sonnet")).toBe("claude-sonnet-4-6");
    expect(normalizeChatModel("unknown-provider")).toBe("auto");
  });

  it("selects a primary model then cross-provider fallbacks", () => {
    expect(getChatModelCandidates("auto")).toEqual(["claude-haiku-4-5", "gemini-3-flash-preview", "gpt-5-mini"]);
    expect(getChatModelCandidates("claude-sonnet-4-6")[0]).toBe("claude-sonnet-4-6");
  });
});
