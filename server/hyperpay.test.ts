import { describe, it, expect } from "vitest";
import { hyperPayService, isSuccessfulHyperPayResult } from "./hyperpayService";

describe("HyperPay Integration Tests", () => {
  it("should initialize checkout session successfully in test/mock mode", async () => {
    const res = await hyperPayService.createCheckoutSession({
      amount: 299.00,
      currency: "SAR",
      paymentType: "DB",
      merchantTransactionId: "TX_TEST_123",
      customerEmail: "test@neon.ai",
      customerName: "Test Tenant",
      planName: "professional",
      tenantId: 1,
    });

    expect(res.success).toBe(true);
    expect(res.checkoutId).toBeDefined();
    expect(res.checkoutId?.startsWith("TEST_CHECKOUT_")).toBe(true);
  });

  it("should verify payment status successfully with mock checkout ID", async () => {
    const verification = await hyperPayService.verifyPaymentStatus("TEST_CHECKOUT_ABC123");

    expect(verification.success).toBe(true);
    expect(verification.responseCode).toBe("000.100.110");
    expect(verification.amount).toBe(299);
  });

  it("rejects non-success gateway response codes without network access", () => {
    expect(isSuccessfulHyperPayResult("800.100.153")).toBe(false);
    expect(isSuccessfulHyperPayResult("000.100.110")).toBe(true);
  });
});
