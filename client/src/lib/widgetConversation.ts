export function isExplicitCloseRequest(message: string) {
  return /^(?:أنهي|انهي|أغلق|اغلق|إغلاق|انهاء|إنهاء|end|close)(?:\s+(?:المحادثة|المحادثه|chat|conversation))?[.!؟]?$/i.test(message.trim());
}

export type WidgetClosingStage = "idle" | "ask-more" | "confirm-close" | "closed";
export type WidgetClosingEvent = "agent-reply" | "start-closing" | "needs-help" | "no-more-help" | "cancel-close" | "confirm-close";

export function nextWidgetClosingStage(stage: WidgetClosingStage, event: WidgetClosingEvent): WidgetClosingStage {
  if (event === "agent-reply") return stage;
  if (event === "start-closing" && stage === "idle") return "ask-more";
  if (event === "needs-help" || event === "cancel-close") return "idle";
  if (event === "no-more-help" && stage === "ask-more") return "confirm-close";
  if (event === "confirm-close" && stage === "confirm-close") return "closed";
  return stage;
}
