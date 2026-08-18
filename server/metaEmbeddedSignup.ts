import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v26.0";
const TOKEN_PREFIX = "v1";

type MetaTokenResponse = { access_token?: string; token_type?: string; error?: { message?: string } };
type MetaGraphResponse = { success?: boolean; error?: { message?: string }; display_phone_number?: string; verified_name?: string; code_verification_status?: string; quality_rating?: string };

export type MetaEmbeddedSignupAssets = {
  phoneNumberId: string;
  whatsappBusinessAccountId: string;
  businessPortfolioId?: string;
};

export type CompletedEmbeddedSignup = MetaEmbeddedSignupAssets & {
  encryptedBusinessToken: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
};

function getMetaAppId() {
  return process.env.META_APP_ID || process.env.VITE_META_APP_ID || "";
}

function getEncryptionKey() {
  const source = process.env.JWT_SECRET;
  if (!source) throw new Error("Server encryption key is not configured");
  return createHash("sha256").update(`neon:whatsapp-embedded:${source}`).digest();
}

function ensureDigits(value: string, label: string) {
  const trimmed = value.trim();
  if (!/^\d{5,100}$/.test(trimmed)) throw new Error(`${label} is invalid`);
  return trimmed;
}

async function metaRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}${path}`, init);
  const data = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Meta request failed");
  return data;
}

export function getEmbeddedSignupPublicConfig() {
  const appId = getMetaAppId();
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || "";
  return {
    enabled: Boolean(appId && configId),
    appId,
    configId,
    graphApiVersion: GRAPH_API_VERSION,
  };
}

export function encryptBusinessToken(token: string) {
  if (!token || token.length < 20) throw new Error("Meta business token is invalid");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${TOKEN_PREFIX}.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptBusinessToken(ciphertext: string) {
  const [version, ivValue, tagValue, payload] = ciphertext.split(".");
  if (version !== TOKEN_PREFIX || !ivValue || !tagValue || !payload) throw new Error("Stored WhatsApp credential is invalid");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8");
}

async function exchangeEmbeddedCode(code: string) {
  const appId = getMetaAppId();
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Meta app credentials are not configured");
  if (!code || code.length < 10 || code.length > 6000) throw new Error("Meta signup code is invalid or expired");
  const query = new URLSearchParams({ client_id: appId, client_secret: appSecret, code });
  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${query.toString()}`);
  const data = await response.json().catch(() => ({})) as MetaTokenResponse;
  if (!response.ok || !data.access_token) throw new Error(data.error?.message || "Meta signup code could not be exchanged");
  return data.access_token;
}

async function subscribeCustomerWaba(input: { token: string; whatsappBusinessAccountId: string }) {
  await metaRequest<MetaGraphResponse>(`/${input.whatsappBusinessAccountId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.token}` },
  });
}

async function registerCustomerPhone(input: { token: string; phoneNumberId: string; pin: string }) {
  if (!/^\d{6}$/.test(input.pin)) throw new Error("WhatsApp security PIN must contain 6 digits");
  await metaRequest<MetaGraphResponse>(`/${input.phoneNumberId}/register`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", pin: input.pin }),
  });
}

async function getCustomerPhoneDetails(input: { token: string; phoneNumberId: string }) {
  const query = new URLSearchParams({ fields: "display_phone_number,verified_name,code_verification_status,quality_rating" });
  return metaRequest<MetaGraphResponse>(`/${input.phoneNumberId}?${query.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${input.token}` },
  });
}

export async function completeMetaEmbeddedSignup(input: MetaEmbeddedSignupAssets & { code: string; pin: string }): Promise<CompletedEmbeddedSignup> {
  const phoneNumberId = ensureDigits(input.phoneNumberId, "Phone number ID");
  const whatsappBusinessAccountId = ensureDigits(input.whatsappBusinessAccountId, "WhatsApp Business Account ID");
  const businessPortfolioId = input.businessPortfolioId ? ensureDigits(input.businessPortfolioId, "Business portfolio ID") : undefined;
  const businessToken = await exchangeEmbeddedCode(input.code);
  await subscribeCustomerWaba({ token: businessToken, whatsappBusinessAccountId });
  await registerCustomerPhone({ token: businessToken, phoneNumberId, pin: input.pin });
  const details = await getCustomerPhoneDetails({ token: businessToken, phoneNumberId });
  return {
    phoneNumberId,
    whatsappBusinessAccountId,
    businessPortfolioId,
    encryptedBusinessToken: encryptBusinessToken(businessToken),
    displayPhoneNumber: details.display_phone_number,
    verifiedName: details.verified_name,
    qualityRating: details.quality_rating,
    codeVerificationStatus: details.code_verification_status,
  };
}
