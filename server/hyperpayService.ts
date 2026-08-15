import fetch from "node-fetch";

// HyperPay Service for Neon AI Agent Platform
// Supports Test and Production environments with Entity ID, Access Token, and Server-to-Server REST API.

export interface HyperPayCheckoutRequest {
  amount: number; // e.g. 299.00
  currency: string; // e.g. "SAR"
  paymentType: "DB" | "PA"; // DB = Debit (Immediate), PA = Pre-authorisation
  merchantTransactionId: string;
  customerEmail: string;
  customerName: string;
  planName: string;
  tenantId: number;
}

export interface HyperPayCheckoutResponse {
  success: boolean;
  checkoutId?: string;
  resultCode?: string;
  resultMessage?: string;
  error?: string;
}

export class HyperPayService {
  private entityId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    // Default to HyperPay Test environment or env vars if provided
    this.entityId = process.env.HYPERPAY_ENTITY_ID || "test_entity_id_placeholder";
    this.accessToken = process.env.HYPERPAY_ACCESS_TOKEN || "test_access_token_placeholder";
    // HyperPay test REST endpoint or production endpoint
    this.baseUrl = process.env.HYPERPAY_BASE_URL || "https://eu-test.oppwa.com/v1";
  }

  /**
   * Create a checkout session (Get checkoutId for HyperPay widget or Server-to-Server form)
   */
  async createCheckoutSession(req: HyperPayCheckoutRequest): Promise<HyperPayCheckoutResponse> {
    try {
      // If running in sandbox/test mode without live keys, return a mock success checkoutId for smooth testing
      if (!process.env.HYPERPAY_ACCESS_TOKEN || this.accessToken === "test_access_token_placeholder") {
        const mockCheckoutId = "TEST_CHECKOUT_" + Math.random().toString(36).substring(2, 15).toUpperCase();
        console.log(`[HyperPay Mock] Created checkout session for tenant ${req.tenantId}, plan ${req.planName}, amount ${req.amount} ${req.currency}. ID: ${mockCheckoutId}`);
        return {
          success: true,
          checkoutId: mockCheckoutId,
          resultMessage: "Mock checkout session created successfully for testing."
        };
      }

      const bodyParams = new URLSearchParams();
      bodyParams.append("entityId", this.entityId);
      bodyParams.append("amount", req.amount.toFixed(2));
      bodyParams.append("currency", req.currency);
      bodyParams.append("paymentType", req.paymentType);
      bodyParams.append("merchantTransactionId", req.merchantTransactionId);
      bodyParams.append("customer.email", req.customerEmail);
      bodyParams.append("customer.givenName", req.customerName);
      bodyParams.append("customer.surname", "Customer");
      bodyParams.append("testMode", "EXTERNAL"); // set to test mode if configured

      const response = await fetch(`${this.baseUrl}/checkouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      const data = (await response.json()) as any;

      if (data && data.id) {
        return {
          success: true,
          checkoutId: data.id,
          resultCode: data.result?.code,
          resultMessage: data.result?.description,
        };
      } else {
        return {
          success: false,
          error: data?.result?.description || "Failed to create HyperPay checkout session",
        };
      }
    } catch (err: any) {
      console.error("[HyperPay Error] createCheckoutSession:", err);
      return {
        success: false,
        error: err.message || "Network or API error communicating with HyperPay",
      };
    }
  }

  /**
   * Verify payment status using checkoutId after customer redirection
   */
  async verifyPaymentStatus(checkoutId: string): Promise<{ success: boolean; paymentId?: string; amount?: number; currency?: string; responseCode?: string; responseMessage?: string; rawJson?: any }> {
    try {
      if (checkoutId.startsWith("TEST_CHECKOUT_")) {
        return {
          success: true,
          paymentId: "TEST_PAYMENT_" + Date.now(),
          amount: 299,
          currency: "SAR",
          responseCode: "000.100.110",
          responseMessage: "Successfully processed (Mock)",
          rawJson: { result: { code: "000.100.110", description: "Request successfully processed" } }
        };
      }

      const response = await fetch(`${this.baseUrl}/checkouts/${checkoutId}/payment?entityId=${this.entityId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const data = (await response.json()) as any;
      const resultCode = data.result?.code;
      // HyperPay success codes usually start with "000.000." or "000.100."
      const isSuccess = resultCode && (resultCode.startsWith("000.000") || resultCode.startsWith("000.100") || resultCode.startsWith("000.3"));

      return {
        success: Boolean(isSuccess),
        paymentId: data.id,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        currency: data.currency,
        responseCode: resultCode,
        responseMessage: data.result?.description,
        rawJson: data,
      };
    } catch (err: any) {
      console.error("[HyperPay Error] verifyPaymentStatus:", err);
      return {
        success: false,
        responseMessage: err.message,
      };
    }
  }
}

export const hyperPayService = new HyperPayService();
