/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhatsAppConnectionDetails } from "./WhatsAppConnectionDetails";

describe("WhatsAppConnectionDetails", () => {
  it("renders the linked number, verification, business name, quality, billing, and next step", () => {
    render(<WhatsAppConnectionDetails isActive config={{
      displayPhoneNumber: "+968 7519 2909",
      verifiedName: "Neon Marketing",
      qualityRating: "GREEN",
      codeVerificationStatus: "VERIFIED",
      setupStatus: "awaiting_customer_billing",
    }} />);

    const details = screen.getByTestId("whatsapp-connection-details");
    expect(details.textContent).toContain("+968 7519 2909");
    expect(details.textContent).toContain("تم تأكيد الرقم في Meta");
    expect(details.textContent).toContain("Neon Marketing");
    expect(details.textContent).toContain("تقييم جودة الرقم: GREEN");
    expect(details.textContent).toContain("أضف وسيلة دفع في WhatsApp Manager");
  });
});
