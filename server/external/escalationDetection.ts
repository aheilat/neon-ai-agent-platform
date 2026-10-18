/**
 * Deterministic detection of "I want a human" requests (Arabic and English).
 *
 * No AI call and no database access: a pure function so it is fast, free and
 * fully testable. It deliberately looks for a *request* (a talk/transfer verb
 * near a person/department word, or a complaint word) instead of matching bare
 * words, because the agent's own product vocabulary ("agent", "team", "support")
 * appears in ordinary questions and must not silence the bot.
 */

export type EscalationReason = "human_request" | "sales_request" | "complaint";
export type EscalationDecision = { escalate: false } | { escalate: true; reason: EscalationReason };

/** Long messages (pasted documents, forwarded text) are not escalation requests. */
const MAX_MESSAGE_LENGTH = 400;
/** A verb and its target must sit within this many words of each other. */
const TARGET_WINDOW = 6;
/** A negation this close before the verb/complaint cancels the request ("لا أريد التحدث مع موظف"). */
const NEGATION_WINDOW = 3;

export function normalizeEscalationText(text: string) {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9\u0600-\u06FF\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (list: string[]) => new Set(list.map(normalizeEscalationText));

// Arabic ---------------------------------------------------------------------
/** Verbs meaning "speak/transfer": any person or department word is a valid target. */
const AR_TALK_VERBS = words(["اتكلم", "اتحدث", "التحدث", "التكلم", "اكلم", "احكي", "الحكي", "اخاطب", "مخاطبه", "مكالمه", "وصلني", "وصلوني", "توصلني", "توصلوني", "تحويلي", "تحويل"]);
/** Verbs meaning "get in touch": only a real person/department (not "support"/"team") counts as a target. */
const AR_CONTACT_VERBS = words(["اتواصل", "التواصل", "تواصل", "يتواصل", "اتصل", "الاتصال", "يتصل", "كلمني", "كلموني", "يكلمني", "يكلمنا", "الكلام", "الحديث"]);
/** "Transfer me" is a request on its own. */
const AR_TRANSFER_SELF = words(["حولني", "حولوني", "حولنا", "تحولني", "تحولوني", "تحولنا"]);
const AR_STRONG_TARGETS = words(["موظف", "موظفه", "موظفين", "شخص", "انسان", "بشري", "مسؤول", "مسئول", "مدير", "ممثل", "مندوب", "مختص", "حدا", "خدمهعملاء"]);
const AR_WEAK_TARGETS = words(["فريق", "دعم"]);
const AR_SALES = words(["مبيعات"]);
const AR_COMPLAINT = words(["شكوى", "شكاوى", "اشتكي", "اشتكاء"]);
/** A weak target ("team", "support") only counts after "to/with": "talk to the team", not "talk about the team". */
const AR_PREPOSITIONS = words(["مع", "الي", "الى"]);
const AR_NEGATIONS = words(["لا", "ما", "مش", "مو", "بدون", "ليس", "لست", "لن"]);

// English --------------------------------------------------------------------
const EN_TALK_VERBS = new Set(["talk", "talking", "speak", "speaking", "chat", "chatting"]);
const EN_CONTACT_VERBS = new Set(["call", "calling", "contact", "contacting", "reach", "reaching"]);
/** "connect me", "transfer us", "put me through": only a verb when followed by me/us. */
const EN_OBJECT_VERBS = new Set(["connect", "transfer", "forward", "escalate", "route", "redirect", "put", "hand", "pass"]);
const EN_STRONG_TARGETS = new Set(["human", "humans", "person", "people", "representative", "representatives", "rep", "reps", "operator", "manager", "supervisor", "employee", "someone", "somebody", "advisor", "consultant", "specialist", "customerservice"]);
const EN_WEAK_TARGETS = new Set(["support", "team", "staff", "owner"]);
const EN_SALES = new Set(["sales", "salesperson", "salesman"]);
const EN_COMPLAINT = new Set(["complaint", "complaints", "complain", "complaining"]);
/** "agent" is a target only when it clearly means a person ("a human agent", "an agent"), never "AI agent"/"your agents". */
const EN_AGENT_QUALIFIERS = new Set(["human", "live", "real", "sales", "support", "service", "customer", "an", "a"]);
const EN_PREPOSITIONS = new Set(["to", "with"]);
const EN_NEGATIONS = new Set(["not", "no", "never", "don't", "dont", "won't", "wont", "without", "stop"]);

/** Arabic words carry attached prefixes (و ف ب ل ك) and the article ال; check each plausible stem. */
function arabicStems(token: string) {
  const stems = new Set<string>([token]);
  const withoutPrefix = /^[وفبلك]/.test(token) && token.length > 3 ? token.slice(1) : token;
  stems.add(withoutPrefix);
  // "ل" + "ال" fuses into "لل" (للموظف = ل + الموظف).
  if (token.startsWith("لل") && token.length > 4) stems.add(token.slice(2));
  for (const stem of Array.from(stems)) if (stem.startsWith("ال") && stem.length > 4) stems.add(stem.slice(2));
  return Array.from(stems);
}

const arabicHas = (set: Set<string>, token: string) => arabicStems(token).some(stem => set.has(stem));

function negatedBefore(tokens: string[], index: number, isNegation: (token: string) => boolean) {
  for (let i = Math.max(0, index - NEGATION_WINDOW); i < index; i++) if (isNegation(tokens[i])) return true;
  return false;
}

type Target = { index: number; sales: boolean; strong: boolean };

function nearTarget(targets: Target[], tokens: string[], verbIndex: number, needStrong: boolean, isPreposition: (token: string) => boolean) {
  const matches = targets.filter(target => {
    if (Math.abs(target.index - verbIndex) > TARGET_WINDOW) return false;
    if (target.strong) return true;
    if (needStrong) return false;
    const from = Math.min(target.index, verbIndex) + 1;
    const to = Math.max(target.index, verbIndex);
    return tokens.slice(from, to).some(isPreposition) || (verbIndex < target.index && isPreposition(tokens[target.index - 1] ?? ""));
  });
  // "someone from sales" is a sales request: a department beats a generic person.
  return matches.find(target => target.sales) ?? matches[0];
}

function reasonFor(target: Target): EscalationReason {
  return target.sales ? "sales_request" : "human_request";
}

function detectArabic(tokens: string[]): EscalationDecision {
  const isNegation = (token: string) => arabicHas(AR_NEGATIONS, token);
  const targets: Target[] = [];
  tokens.forEach((token, index) => {
    if (arabicHas(AR_SALES, token)) targets.push({ index, sales: true, strong: true });
    else if (arabicHas(AR_STRONG_TARGETS, token)) targets.push({ index, sales: false, strong: true });
    else if (arabicHas(AR_WEAK_TARGETS, token)) targets.push({ index, sales: false, strong: false });
  });

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (negatedBefore(tokens, index, isNegation)) continue;
    if (arabicHas(AR_COMPLAINT, token)) return { escalate: true, reason: "complaint" };
    if (arabicHas(AR_TRANSFER_SELF, token)) {
      const target = nearTarget(targets, tokens, index, false, token => arabicHas(AR_PREPOSITIONS, token));
      return { escalate: true, reason: target ? reasonFor(target) : "human_request" };
    }
    const talk = arabicHas(AR_TALK_VERBS, token);
    const contact = arabicHas(AR_CONTACT_VERBS, token);
    if (!talk && !contact) continue;
    const target = nearTarget(targets, tokens, index, contact, token => arabicHas(AR_PREPOSITIONS, token));
    if (target) return { escalate: true, reason: reasonFor(target) };
  }
  return { escalate: false };
}

function detectEnglish(tokens: string[]): EscalationDecision {
  const isNegation = (token: string) => EN_NEGATIONS.has(token);
  const targets: Target[] = [];
  tokens.forEach((token, index) => {
    if (EN_SALES.has(token)) targets.push({ index, sales: true, strong: true });
    else if (EN_STRONG_TARGETS.has(token)) targets.push({ index, sales: false, strong: true });
    else if (EN_WEAK_TARGETS.has(token)) targets.push({ index, sales: false, strong: false });
    else if ((token === "agent") && index > 0 && EN_AGENT_QUALIFIERS.has(tokens[index - 1])) targets.push({ index, sales: false, strong: true });
  });

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (negatedBefore(tokens, index, isNegation)) continue;
    if (EN_COMPLAINT.has(token)) return { escalate: true, reason: "complaint" };
    const talk = EN_TALK_VERBS.has(token) || (EN_OBJECT_VERBS.has(token) && ["me", "us"].some(pronoun => tokens[index + 1] === pronoun || tokens[index + 2] === pronoun));
    const contact = EN_CONTACT_VERBS.has(token);
    if (!talk && !contact) continue;
    const target = nearTarget(targets, tokens, index, contact, token => EN_PREPOSITIONS.has(token));
    if (target) return { escalate: true, reason: reasonFor(target) };
  }
  return { escalate: false };
}

export function detectEscalationIntent(message: string): EscalationDecision {
  if (typeof message !== "string" || message.length === 0 || message.length > MAX_MESSAGE_LENGTH) return { escalate: false };
  const normalized = normalizeEscalationText(message)
    .replace(/خدمه (?:ال)?(?:عملاء|زبائن|عميل|زبون)/g, "خدمهعملاء")
    .replace(/customer (?:service|support|care)/g, "customerservice");
  if (!normalized) return { escalate: false };
  const tokens = normalized.split(" ");
  const arabic = detectArabic(tokens);
  if (arabic.escalate) return arabic;
  return detectEnglish(tokens);
}
