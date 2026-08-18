import React from "react";
import { getWhatsAppEmbeddedStatus, type WhatsAppEmbeddedConnectionInfo } from "@/lib/whatsappEmbeddedStatus";

export function WhatsAppConnectionDetails({ config, isActive }: { config: WhatsAppEmbeddedConnectionInfo & { verifiedName?: string }; isActive: boolean }) {
  if (!config.displayPhoneNumber) return null;
  const status = getWhatsAppEmbeddedStatus(config, isActive);
  return <div data-testid="whatsapp-connection-details" className="mt-3 space-y-1 rounded-xl border border-lime-300/15 bg-lime-300/[0.05] p-3 text-xs">
    <p className="text-lime-200">الرقم المرتبط: <span dir="ltr">{config.displayPhoneNumber}</span></p>
    <p className="text-slate-300">{status.verificationStatus}{config.verifiedName ? ` · الاسم المتحقق: ${config.verifiedName}` : ""}</p>
    {status.qualityStatus && <p className="text-slate-400">{status.qualityStatus}</p>}
    {status.billingStatus && <p className="pt-1 text-amber-100">الخطوة التالية: {status.billingStatus}</p>}
  </div>;
}
