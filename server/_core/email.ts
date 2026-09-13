import { ENV } from "./env";

/**
 * Minimal email sender using the Resend REST API. Used for operational
 * notifications (e.g. "a customer wants to talk to your team") where we
 * don't need templates, attachments, or delivery tracking — just a
 * best-effort send that never throws into the caller's request flow.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) {
    console.warn("[Email] RESEND_API_KEY or RESEND_FROM_EMAIL not configured; skipping send");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.resendApiKey}`,
      },
      body: JSON.stringify({
        from: ENV.resendFromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Email] Resend send failed", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email] Resend send threw", error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    return false;
  }
}
