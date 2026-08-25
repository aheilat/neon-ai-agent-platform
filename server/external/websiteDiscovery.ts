import { lookup } from "node:dns/promises";
import { z } from "zod";
import { completeWithIndependentClaude } from "./claude";

const goals = ["questions", "issues", "recommend", "buy", "leads", "appointments", "orders", "route", "human"] as const;
const channels = ["web", "whatsapp", "messenger", "instagram", "phone"] as const;
const MAX_PAGES = 5;
const MAX_PAGE_CHARS = 12_000;
const REQUEST_TIMEOUT_MS = 8_000;
const USER_AGENT = "NeonAIWebsiteDiscovery/1.0 (+https://agent.neonadai.com)";

export const independentWebsitePageSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(255),
  description: z.string().max(1_000),
  headings: z.array(z.string().max(300)).max(30),
  content: z.string().max(MAX_PAGE_CHARS),
  links: z.array(z.string().url()).max(200),
});

export const independentWebsiteAnalysisSchema = z.object({
  businessName: z.string().min(1).max(120),
  businessSummary: z.string().min(1).max(1_200),
  industry: z.string().min(1).max(120),
  audience: z.string().min(1).max(800),
  language: z.enum(["ar", "en", "bilingual"]),
  tone: z.enum(["friendly", "professional", "direct"]),
  persona: z.string().min(1).max(2_000),
  goals: z.array(z.enum(goals)).min(1).max(7),
  suggestedChannels: z.array(z.enum(channels)).min(1).max(5),
  services: z.array(z.object({
    name: z.string().min(1).max(160),
    description: z.string().min(1).max(1_000),
    sourceUrl: z.string().url(),
  })).max(20),
  faqs: z.array(z.object({
    question: z.string().min(1).max(500),
    answer: z.string().min(1).max(1_500),
    sourceUrl: z.string().url(),
  })).max(20),
  guardrails: z.array(z.string().min(1).max(500)).max(10),
});

export type IndependentWebsitePage = z.infer<typeof independentWebsitePageSchema>;
export type IndependentWebsiteAnalysis = z.infer<typeof independentWebsiteAnalysisSchema>;
export type IndependentWebsiteProposal = {
  websiteUrl: string;
  pages: Array<Pick<IndependentWebsitePage, "url" | "title" | "description" | "headings">>;
  analysis: IndependentWebsiteAnalysis;
};

function canonicalUrl(value: string) {
  const parsed = new URL(value);
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function isPrivateAddress(host: string) {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".local") || normalized.endsWith(".internal")) return true;
  if (normalized === "::1" || normalized === "0.0.0.0" || normalized === "169.254.169.254") return true;
  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return false;
  const [first, second] = octets;
  return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

export async function assertIndependentPublicWebsiteUrl(input: string) {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("أدخل رابط موقع صحيح يبدأ بـ https:// أو http://.");
  }
  if (!(["http:", "https:"].includes(parsed.protocol)) || parsed.username || parsed.password || isPrivateAddress(parsed.hostname)) {
    throw new Error("يمكن تحليل مواقع HTTP وHTTPS العامة فقط.");
  }
  if (parsed.port && !["80", "443"].includes(parsed.port)) throw new Error("استخدم منفذ الموقع العام المعتاد فقط.");
  try {
    const addresses = await lookup(parsed.hostname, { all: true });
    if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error("private");
  } catch (error) {
    if (error instanceof Error && error.message === "private") throw new Error("لا يمكن تحليل موقع يشير إلى شبكة داخلية.");
    throw new Error("تعذر التحقق من أن رابط الموقع عام ومتاح.");
  }
  parsed.hash = "";
  return parsed;
}

function decodeEntities(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function plainText(value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]?.trim() ?? "";
}

export function extractIndependentWebsitePage(html: string, pageUrl: string): IndependentWebsitePage {
  const title = plainText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || new URL(pageUrl).hostname;
  const description = plainText(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "");
  const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map((match) => plainText(match[1])).filter(Boolean).slice(0, 30);
  const links: string[] = [];
  for (const match of Array.from(html.matchAll(/<a\b([^>]*)>/gi))) {
    const href = attribute(match[1], "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const absolute = new URL(href, pageUrl);
      absolute.hash = "";
      if (!links.includes(absolute.toString())) links.push(absolute.toString());
    } catch {
      // Ignore malformed untrusted markup.
    }
  }
  const withoutNoise = html.replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const paragraphs = Array.from(withoutNoise.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)).map((match) => plainText(match[1])).filter(Boolean);
  const content = plainText(`${headings.join(". ")} ${paragraphs.join(". ")}`).slice(0, MAX_PAGE_CHARS);
  return independentWebsitePageSchema.parse({ url: pageUrl, title, description, headings, content, links: links.slice(0, 200) });
}

async function fetchPublicHtml(url: string, redirectCount = 0): Promise<{ html: string; pageUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { accept: "text/html,text/plain;q=0.9", "user-agent": USER_AGENT }, redirect: "manual", signal: controller.signal });
    if ([301, 302, 303, 307, 308].includes(response.status) && redirectCount < 2) {
      const location = response.headers.get("location");
      if (!location) throw new Error("unavailable");
      const next = await assertIndependentPublicWebsiteUrl(new URL(location, url).toString());
      return fetchPublicHtml(next.toString(), redirectCount + 1);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/")) throw new Error("unavailable");
    return { html: await response.text(), pageUrl: url };
  } finally {
    clearTimeout(timeout);
  }
}

function isCrawlable(link: URL, origin: string) {
  return link.origin === origin && ["http:", "https:"].includes(link.protocol) && !link.username && !link.password && !/\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|gif|svg|webp|mp4|mp3|css|js|xml)(?:$|\?)/i.test(link.pathname);
}

export async function crawlIndependentPublicWebsite(input: string) {
  const baseUrl = await assertIndependentPublicWebsiteUrl(input);
  const queue = [baseUrl.toString()];
  const visited = new Set<string>();
  const pages: IndependentWebsitePage[] = [];
  while (queue.length && pages.length < MAX_PAGES) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    try {
      const fetched = await fetchPublicHtml(current);
      const page = extractIndependentWebsitePage(fetched.html, fetched.pageUrl);
      pages.push(page);
      for (const link of page.links) {
        const next = new URL(link);
        if (queue.length + pages.length >= MAX_PAGES) break;
        if (isCrawlable(next, baseUrl.origin) && !visited.has(next.toString())) queue.push(next.toString());
      }
    } catch {
      // A broken public page does not prevent analysis of the remaining pages.
    }
  }
  if (!pages.length) throw new Error("تعذر العثور على صفحات عامة قابلة للقراءة في هذا الموقع.");
  return { websiteUrl: baseUrl.toString(), pages };
}

export function assertIndependentAnalysisSources(analysis: IndependentWebsiteAnalysis, pages: Array<Pick<IndependentWebsitePage, "url">>) {
  const sources = new Set(pages.map((page) => canonicalUrl(page.url)));
  for (const item of [...analysis.services, ...analysis.faqs]) {
    if (!sources.has(canonicalUrl(item.sourceUrl))) throw new Error("تضمن التحليل مصدراً غير موجود ضمن الصفحات التي تمت قراءتها.");
  }
  return analysis;
}

function extractJson(content: string) {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

export async function analyzeIndependentWebsitePages(
  snapshot: { websiteUrl: string; pages: IndependentWebsitePage[] },
  complete: typeof completeWithIndependentClaude = completeWithIndependentClaude,
) {
  const sourceText = snapshot.pages.map((page) => `SOURCE_URL: ${page.url}\nTITLE: ${page.title}\nDESCRIPTION: ${page.description}\nHEADINGS: ${page.headings.join(" | ")}\nCONTENT: ${page.content}`).join("\n\n").slice(0, 48_000);
  const response = await complete({
    system: "أنت محلل مواقع أعمال لمنصة Neon المستقلة. استخرج فقط ما تدعمه الصفحات العامة المرفقة. لا تخترع أسعاراً أو خدمات أو وعوداً. أنشئ اقتراحاً أولياً لوكيل خدمة عملاء للشركة نفسها، واجعل persona آمنة ومهنية. يجب أن تعتمد tone أحد القيم friendly أو professional أو direct. أضف guardrails تمنع الادعاءات غير المدعومة وتطلب تحويل الحالات الخاصة إلى فريق الشركة. يجب أن يطابق sourceUrl لكل خدمة وسؤال شائع أحد قيم SOURCE_URL حرفياً. أعد JSON فقط بلا Markdown.",
    messages: [{ role: "user", content: `حلل الصفحات التالية وأعد JSON مطابقاً للمفاتيح: businessName, businessSummary, industry, audience, language, tone, persona, goals, suggestedChannels, services, faqs, guardrails.\n\n${sourceText}` }],
    maxTokens: 3_500,
  });
  try {
    return assertIndependentAnalysisSources(independentWebsiteAnalysisSchema.parse(extractJson(response)), snapshot.pages);
  } catch {
    throw new Error("تعذر قراءة تحليل الموقع بشكل منظم. أعد المحاولة أو راجع الرابط.");
  }
}

export async function discoverIndependentWebsiteProposal(websiteUrl: string): Promise<IndependentWebsiteProposal> {
  const snapshot = await crawlIndependentPublicWebsite(websiteUrl);
  const analysis = await analyzeIndependentWebsitePages(snapshot);
  return {
    websiteUrl: snapshot.websiteUrl,
    pages: snapshot.pages.map(({ url, title, description, headings }) => ({ url, title, description, headings })),
    analysis,
  };
}
