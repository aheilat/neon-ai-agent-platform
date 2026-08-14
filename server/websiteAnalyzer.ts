import { lookup } from "node:dns/promises";
import { URL } from "node:url";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";

const onboardingGoals = ["questions", "issues", "recommend", "buy", "leads", "appointments", "orders", "route", "symptoms", "medications", "insurance", "emergency", "human"] as const;
const onboardingChannels = ["web", "whatsapp", "messenger", "instagram", "phone"] as const;

export const websitePageSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  description: z.string(),
  headings: z.array(z.string()),
  content: z.string(),
  links: z.array(z.string().url()),
});

export const websiteAnalysisSchema = z.object({
  businessName: z.string().min(1).max(255),
  businessSummary: z.string().min(1).max(1200),
  industry: z.string().min(1).max(120),
  audience: z.string().min(1).max(800),
  language: z.enum(["ar", "en", "bilingual"]),
  tone: z.string().min(1).max(80),
  persona: z.string().min(1).max(5000),
  goals: z.array(z.enum(onboardingGoals)).min(1).max(9),
  suggestedChannels: z.array(z.enum(onboardingChannels)).min(1).max(5),
  services: z.array(z.object({
    name: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
    sourceUrl: z.string().url(),
  })).max(20),
  faqs: z.array(z.object({
    question: z.string().min(1).max(500),
    answer: z.string().min(1).max(1500),
    sourceUrl: z.string().url(),
  })).max(20),
  guardrails: z.array(z.string().min(1).max(500)).max(12),
});

export type WebsitePage = z.infer<typeof websitePageSchema>;
export type WebsiteAnalysis = z.infer<typeof websiteAnalysisSchema>;

function canonicalUrl(value: string) {
  const parsed = new URL(value);
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export function assertAnalysisSources(analysis: WebsiteAnalysis, pages: Array<Pick<WebsitePage, "url">>) {
  const allowed = new Set(pages.map(page => canonicalUrl(page.url)));
  for (const item of [...analysis.services, ...analysis.faqs]) {
    if (!allowed.has(canonicalUrl(item.sourceUrl))) {
      throw new Error("تضمن التحليل مصدراً غير موجود ضمن الصفحات التي تمت قراءتها.");
    }
  }
  return analysis;
}

export type WebsiteSnapshot = {
  websiteUrl: string;
  pages: WebsitePage[];
};

const MAX_PAGES = 5;
const MAX_PAGE_CHARS = 14000;
const REQUEST_TIMEOUT_MS = 9000;
const USER_AGENT = "NeonAIWebsiteAnalyzer/1.0 (+https://neonaiagent-nu42grqa.manus.space)";

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function readAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() ?? "";
}

function isPrivateIp(host: string) {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".local") || normalized.endsWith(".internal")) return true;
  if (normalized === "::1" || normalized === "0.0.0.0" || normalized === "169.254.169.254") return true;
  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return false;
  const [first, second] = octets;
  return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

export async function assertSafeWebsiteUrl(input: string) {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("أدخل رابطاً صحيحاً يبدأ بـ https:// أو http://.");
  }
  if (!/[.]?https?:$/.test(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("يسمح بتحليل روابط HTTP وHTTPS العامة فقط.");
  }
  if (isPrivateIp(parsed.hostname)) throw new Error("لا يمكن تحليل عناوين الشبكات الداخلية أو المحلية.");
  try {
    const resolved = await lookup(parsed.hostname, { all: true });
    if (resolved.some(record => isPrivateIp(record.address))) throw new Error("لا يمكن تحليل نطاق يشير إلى شبكة داخلية.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("شبكة داخلية")) throw error;
    throw new Error("تعذر التحقق من نطاق الموقع. تأكد من أن الرابط عام ومتاح.");
  }
  parsed.hash = "";
  return parsed;
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: "text/html,text/plain;q=0.9", "user-agent": USER_AGENT },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobots(robots: string) {
  const disallowed: string[] = [];
  let applies = false;
  for (const line of robots.split(/\r?\n/)) {
    const [rawKey, rawValue] = line.split(":", 2);
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue?.trim() ?? "";
    if (key === "user-agent") applies = value === "*";
    if (applies && key === "disallow" && value) disallowed.push(value);
  }
  return disallowed;
}

function allowedByRobots(url: URL, disallowed: string[]) {
  return !disallowed.some(path => path === "/" || url.pathname.startsWith(path));
}

function isCrawlableLink(url: URL, origin: string) {
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) return false;
  if (url.username || url.password) return false;
  if (/\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|gif|svg|webp|mp4|mp3|css|js|xml)(?:$|\?)/i.test(url.pathname)) return false;
  return true;
}

export function extractWebsitePage(html: string, pageUrl: string): WebsitePage {
  const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || new URL(pageUrl).hostname;
  const description = cleanText(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "");
  const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map(match => cleanText(match[1])).filter(Boolean).slice(0, 30);
  const links: string[] = [];
  for (const match of Array.from(html.matchAll(/<a\b([^>]*)>/gi))) {
    const href = readAttribute(match[1], "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const absolute = new URL(href, pageUrl);
      absolute.hash = "";
      if (!links.includes(absolute.toString())) links.push(absolute.toString());
    } catch {
      // Ignore malformed links from untrusted HTML.
    }
  }
  const withoutNoise = html.replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const paragraphs = Array.from(withoutNoise.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)).map(match => cleanText(match[1])).filter(Boolean);
  const content = cleanText(`${headings.join(". ")} ${paragraphs.join(". ")}`).slice(0, MAX_PAGE_CHARS);
  return websitePageSchema.parse({ url: pageUrl, title, description, headings, content, links });
}

export async function crawlWebsite(input: string): Promise<WebsiteSnapshot> {
  const baseUrl = await assertSafeWebsiteUrl(input);
  const origin = baseUrl.origin;
  let disallowed: string[] = [];
  try {
    disallowed = parseRobots(await fetchText(new URL("/robots.txt", baseUrl).toString()));
  } catch {
    // A missing robots file does not prevent crawling public pages.
  }
  if (!allowedByRobots(baseUrl, disallowed)) throw new Error("يسمح الموقع بالوصول إلى robots.txt فقط ولا يسمح بتحليل الصفحة الرئيسية.");

  const queue = [baseUrl.toString()];
  const visited = new Set<string>();
  const pages: WebsitePage[] = [];
  while (queue.length && pages.length < MAX_PAGES) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const currentUrl = new URL(current);
    if (!allowedByRobots(currentUrl, disallowed)) continue;
    try {
      const html = await fetchText(current);
      const page = extractWebsitePage(html, current);
      pages.push(page);
      for (const link of page.links) {
        const linkUrl = new URL(link);
        if (queue.length + pages.length >= MAX_PAGES) break;
        if (isCrawlableLink(linkUrl, origin) && allowedByRobots(linkUrl, disallowed) && !visited.has(linkUrl.toString())) queue.push(linkUrl.toString());
      }
    } catch {
      // Skip an unavailable page and continue with the rest of the public site.
    }
  }
  if (!pages.length) throw new Error("تعذر العثور على صفحات عامة قابلة للقراءة في الموقع.");
  return { websiteUrl: baseUrl.toString(), pages };
}

function textFromLlmContent(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(item => typeof item === "object" && item && "text" in item ? String(item.text) : "").join("\n");
  return "";
}

export async function analyzeWebsiteSnapshot(snapshot: WebsiteSnapshot): Promise<WebsiteAnalysis> {
  const sourceText = snapshot.pages.map(page => [
    `SOURCE_URL: ${page.url}`,
    `TITLE: ${page.title}`,
    `DESCRIPTION: ${page.description}`,
    `HEADINGS: ${page.headings.join(" | ")}`,
    `CONTENT: ${page.content}`,
  ].join("\n")).join("\n\n").slice(0, 50000);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "أنت محلل مواقع أعمال لمنصة Neon. استخرج فقط ما تدعمه المصادر المرفقة، ولا تخترع أسعاراً أو خدمات أو وعوداً. أنشئ ملفاً أولياً لوكيل خدمة عملاء. إذا كانت المعلومات ناقصة استخدم صياغة عامة مثل غير محدد. لا تطلب أو تستنتج بيانات شخصية حساسة. اجعل persona مهنية ومناسبة للقطاع، وأضف في guardrails قيوداً تمنع الادعاءات غير المدعومة وتحول الحالات التي تحتاج موظفاً إلى الفريق البشري. يجب أن يضع كل service وfaq قيمة sourceUrl مطابقة حرفياً لأحد SOURCE_URL المرفقة؛ لا تستخدم رابطاً خارجياً أو قيمة فارغة.",
      },
      { role: "user", content: `حلّل صفحات الموقع التالية وأعد JSON مطابقاً للمخطط. اربط كل خدمة وسؤال شائع بصفحة المصدر الأصلية عبر sourceUrl.\n\n${sourceText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "website_agent_profile",
        strict: true,
          schema: {
            type: "object",
            properties: {
              businessName: { type: "string" },
              businessSummary: { type: "string" },
              industry: { type: "string" },
              audience: { type: "string" },
              language: { type: "string", enum: ["ar", "en", "bilingual"] },
              tone: { type: "string" },
              persona: { type: "string" },
              goals: { type: "array", items: { type: "string", enum: onboardingGoals } },
              suggestedChannels: { type: "array", items: { type: "string", enum: onboardingChannels } },
              services: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, sourceUrl: { type: "string" } }, required: ["name", "description", "sourceUrl"], additionalProperties: false } },
              faqs: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" }, sourceUrl: { type: "string" } }, required: ["question", "answer", "sourceUrl"], additionalProperties: false } },
              guardrails: { type: "array", items: { type: "string" } },
            },
            required: ["businessName", "businessSummary", "industry", "audience", "language", "tone", "persona", "goals", "suggestedChannels", "services", "faqs", "guardrails"],
            additionalProperties: false,
          },
      },
    },
  });

  const content = textFromLlmContent(response.choices?.[0]?.message?.content);
  if (!content) throw new Error("تعذر الحصول على تحليل منظم للموقع.");
  try {
    return assertAnalysisSources(websiteAnalysisSchema.parse(JSON.parse(content)), snapshot.pages);
  } catch {
    throw new Error("تعذر قراءة نتيجة تحليل الموقع. أعد المحاولة أو راجع الرابط.");
  }
}

export async function analyzeWebsite(input: string) {
  const snapshot = await crawlWebsite(input);
  const analysis = await analyzeWebsiteSnapshot(snapshot);
  return { ...snapshot, analysis };
}
