import { NEON_CONTACT_EMAIL } from "@shared/contact";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export type LegalDoc = "terms" | "privacy" | "refund";
type Lang = "ar" | "en";
type Section = { h?: string; p: string[] };

const COMPANY = { ar: "نيون للتكنولوجيا والطاقة المتجددة (الأردن)", en: "Neon for Technology and Renewable Energy (Jordan)" };
const UPDATED = { ar: "آخر تحديث: 31 أكتوبر 2026", en: "Last updated: October 31, 2026" };

const DOCS: Record<LegalDoc, { title: Record<Lang, string>; body: Record<Lang, Section[]> }> = {
  terms: {
    title: { ar: "شروط الاستخدام", en: "Terms of Service" },
    body: {
      ar: [
        { h: "من نحن", p: [`منصة Neon AI Agents (agent.neonadai.com) تملكها وتديرها شركة ${COMPANY.ar} («نيون»، «نحن»). باستخدامك المنصة أو إنشاء حساب فيها فإنك توافق على هذه الشروط.`] },
        { h: "الخدمة", p: ["نوفر منصة لإنشاء وكلاء ذكاء اصطناعي يرد على عملائك عبر موقعك وواتساب والصوت، بحسب الباقة التي تختارها. قد تتغير المزايا بمرور الوقت."] },
        { h: "حسابك", p: ["أنت مسؤول عن صحة بيانات حسابك وسرية كلمة المرور وعن كل نشاط يتم من خلاله. أبلغنا فوراً إن اشتبهت باستخدام غير مصرح به."] },
        { h: "الاستخدام المقبول", p: ["يُمنع استخدام المنصة لأي محتوى غير قانوني أو مضلل أو مسيء، أو لانتحال هوية، أو لإرسال رسائل مزعجة، أو لجمع بيانات الأشخاص دون موافقتهم، أو لمخالفة سياسات واتساب/Meta أو أي مزود آخر نتصل به. يحق لنا إيقاف الحساب عند المخالفة."] },
        { h: "محتواك ومسؤوليتك", p: ["أنت مسؤول عن المعلومات التي تضيفها إلى وكلائك (الأسعار، السياسات، الأسئلة الشائعة) وعن صحتها. يجيب الوكيل من هذه المعلومات، وأنت المسؤول عن مراجعتها وتحديثها."] },
        { h: "طبيعة الذكاء الاصطناعي", p: ["الوكلاء يعتمدون على نماذج ذكاء اصطناعي قد تخطئ أو تعطي إجابات غير دقيقة. لا نضمن دقة الردود أو ملاءمتها لحالة بعينها. لا تعتمد على الوكيل وحده في قرارات طبية أو قانونية أو مالية حساسة دون مراجعة بشرية."] },
        { h: "الباقات والدفع", p: ["الأسعار المعلنة بالدولار الأمريكي. تتوفر تجربة مجانية 14 يوماً دون بطاقة دفع. الاشتراكات المدفوعة شهرية أو سنوية بحسب الباقة. تتم معالجة الدفع عبر مزود دفع خارجي (PayTabs)، ولا نخزّن بيانات بطاقتك. قد نغيّر الأسعار مستقبلاً بإشعار مسبق."] },
        { h: "الاسترجاع والإلغاء", p: ["تسري سياسة الاسترجاع المنشورة في صفحة «سياسة الاسترجاع». يمكنك إيقاف اشتراكك بالتواصل معنا."] },
        { h: "حدود المسؤولية", p: ["تُقدَّم المنصة «كما هي». بالقدر الذي يسمح به القانون، لا نتحمل مسؤولية الخسائر غير المباشرة أو فوات الأرباح الناتجة عن استخدام المنصة أو انقطاعها أو أخطاء الذكاء الاصطناعي، وتقتصر مسؤوليتنا الإجمالية على المبلغ الذي دفعته لنا خلال الأشهر الثلاثة السابقة للمطالبة."] },
        { h: "التعديلات والقانون الواجب", p: ["قد نعدّل هذه الشروط وننشر النسخة المحدّثة هنا، واستمرارك في الاستخدام يعني قبولها. تخضع هذه الشروط لقوانين المملكة الأردنية الهاشمية."] },
        { h: "التواصل", p: [NEON_CONTACT_EMAIL] },
      ],
      en: [
        { h: "Who we are", p: [`Neon AI Agents (agent.neonadai.com) is owned and operated by ${COMPANY.en} ("Neon", "we"). By using the platform or creating an account you agree to these terms.`] },
        { h: "The service", p: ["We provide a platform for building AI agents that answer your customers through your website, WhatsApp and voice, depending on your plan. Features may change over time."] },
        { h: "Your account", p: ["You are responsible for the accuracy of your account details, the secrecy of your password, and all activity under your account. Tell us promptly if you suspect unauthorized use."] },
        { h: "Acceptable use", p: ["You may not use the platform for unlawful, misleading or abusive content, impersonation, spam, collecting people's data without consent, or in violation of WhatsApp/Meta or any other provider's policies. We may suspend accounts that break these rules."] },
        { h: "Your content and responsibility", p: ["You are responsible for the information you add to your agents (prices, policies, FAQs) and for its accuracy. Agents answer from that information; reviewing and updating it is your responsibility."] },
        { h: "AI limitations", p: ["Agents rely on AI models that can make mistakes or give inaccurate answers. We do not guarantee accuracy or fitness for a specific case. Do not rely on an agent alone for medical, legal or financial decisions without human review."] },
        { h: "Plans and payment", p: ["Prices are listed in US dollars. A 14-day free trial is available without a payment card. Paid subscriptions are monthly or yearly depending on the plan. Payments are processed by a third-party payment provider (PayTabs); we do not store your card details. We may change prices in the future with prior notice."] },
        { h: "Refunds and cancellation", p: ["Our Refund Policy applies. You can stop your subscription by contacting us."] },
        { h: "Limitation of liability", p: ['The platform is provided "as is". To the extent permitted by law, we are not liable for indirect losses or lost profits arising from use of the platform, outages or AI errors, and our total liability is limited to the amount you paid us in the three months before the claim.'] },
        { h: "Changes and governing law", p: ["We may update these terms and post the new version here; continued use means acceptance. These terms are governed by the laws of the Hashemite Kingdom of Jordan."] },
        { h: "Contact", p: [NEON_CONTACT_EMAIL] },
      ],
    },
  },
  privacy: {
    title: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
    body: {
      ar: [
        { h: "البيانات التي نجمعها", p: ["بيانات الحساب (البريد الإلكتروني وكلمة المرور المشفّرة أو حساب Google)؛ محتوى المحادثات بين وكلائك وعملائك؛ بيانات التواصل التي يتركها العملاء (الاسم، رقم الجوال، البريد) وأرقام واتساب المرسلين وأسماؤهم؛ بيانات تقنية وسجلات تشغيل. لا نخزّن أرقام البطاقات المصرفية، فهي تُعالج لدى مزود الدفع."] },
        { h: "كيف نستخدمها", p: ["لتشغيل الوكلاء والرد على العملاء، وحفظ المحادثات والعملاء المحتملين في لوحتك، وإرسال إشعارات التصعيد، وحماية الخدمة وتحسينها، والتواصل معك بشأن حسابك."] },
        { h: "دورنا ودورك", p: ["بالنسبة لبيانات عملائك التي تصل عبر وكلائك، أنت المسؤول عن الحصول على الموافقات اللازمة وإبلاغ عملائك، ونحن نعالجها نيابةً عنك لتقديم الخدمة فقط. تتيح المنصة طلب موافقة العميل قبل جمع بيانات التواصل."] },
        { h: "الجهات التي نعتمد عليها", p: ["لتقديم الخدمة نستعين بمزودين: Supabase (قاعدة البيانات وتسجيل الدخول)، Render (الاستضافة)، Google (Gemini) وAnthropic (نماذج الذكاء الاصطناعي، يُرسَل إليها نص المحادثة لتوليد الرد)، Meta (واتساب)، Resend (البريد)، ElevenLabs (الصوت، عند تفعيله)، وPayTabs (الدفع). نشاركهم الحد الأدنى اللازم فقط، ولا نبيع بياناتك."] },
        { h: "الاحتفاظ والحذف", p: ["تتحكم في فترة الاحتفاظ بالمحادثات من إعدادات الخصوصية في مساحة عملك. يمكنك طلب حذف حسابك وبياناتك بمراسلتنا، وسننفذ الطلب خلال مدة معقولة ما لم يلزمنا القانون بالاحتفاظ ببعضها."] },
        { h: "الأمان", p: ["نستخدم اتصالات مشفّرة وصلاحيات وصول مقيّدة، لكن لا يوجد نظام آمن بالكامل، ونلتزم بإبلاغك بأي خرق يمسّ بياناتك وفق القانون."] },
        { h: "الأطفال", p: ["الخدمة موجهة للشركات والأفراد البالغين، وليست لمن هم دون 18 عاماً."] },
        { h: "التواصل", p: [`${COMPANY.ar} — ${NEON_CONTACT_EMAIL}`] },
      ],
      en: [
        { h: "Data we collect", p: ["Account data (email and encrypted password, or Google sign-in); conversation content between your agents and your customers; contact details customers leave (name, phone, email) and WhatsApp sender numbers and names; technical data and operational logs. We do not store bank card numbers; those are handled by the payment provider."] },
        { h: "How we use it", p: ["To run your agents and answer customers, store conversations and leads in your dashboard, send escalation notifications, protect and improve the service, and contact you about your account."] },
        { h: "Our role and yours", p: ["For your customers' data that reaches us through your agents, you are responsible for obtaining the necessary consents and informing your customers; we process it on your behalf solely to provide the service. The platform can ask for a customer's consent before collecting contact details."] },
        { h: "Service providers", p: ["We use: Supabase (database and sign-in), Render (hosting), Google (Gemini) and Anthropic (AI models, which receive the conversation text to generate a reply), Meta (WhatsApp), Resend (email), ElevenLabs (voice, when enabled) and PayTabs (payments). We share only what is necessary and we do not sell your data."] },
        { h: "Retention and deletion", p: ["You control conversation retention in your workspace privacy settings. You can request deletion of your account and data by contacting us; we will act within a reasonable time unless the law requires us to keep some of it."] },
        { h: "Security", p: ["We use encrypted connections and restricted access, but no system is completely secure. We will notify you of a breach affecting your data as the law requires."] },
        { h: "Children", p: ["The service is intended for businesses and adults, not for anyone under 18."] },
        { h: "Contact", p: [`${COMPANY.en} — ${NEON_CONTACT_EMAIL}`] },
      ],
    },
  },
  refund: {
    title: { ar: "سياسة الاسترجاع", en: "Refund Policy" },
    body: {
      ar: [
        { p: ["نمنحك تجربة مجانية 14 يوماً دون بطاقة دفع لتتأكد من ملاءمة الخدمة. بعد انتهاء الفترة التجريبية وبدء الاشتراك المدفوع، يمكنك طلب استرجاع قيمة اشتراكك خلال 3 أيام من انتهاء الفترة التجريبية."] },
        { h: "كيف تطلب الاسترجاع", p: [`راسلنا على ${NEON_CONTACT_EMAIL} من بريد حسابك مع ذكر سبب الطلب. نراجع الطلب ونردّ عليك، ويُعاد المبلغ بنفس وسيلة الدفع.`] },
        { h: "رسوم التجهيز", p: ["رسوم التجهيز الكامل (تُدفع مرة واحدة) غير قابلة للاسترجاع بعد بدء العمل على حسابك."] },
        { h: "بعد انقضاء المدة", p: ["بعد انقضاء مدة الاسترجاع لا تُسترجع مدفوعات الفترات المنتهية، ويمكنك إيقاف التجديد في أي وقت بالتواصل معنا."] },
      ],
      en: [
        { p: ["We offer a 14-day free trial with no payment card so you can check the service fits. After the trial ends and a paid subscription starts, you can request a refund of your subscription fee within 3 days of the end of the trial."] },
        { h: "How to request a refund", p: [`Email ${NEON_CONTACT_EMAIL} from your account email with the reason. We review the request and reply, and refunds go back to the original payment method.`] },
        { h: "Setup fee", p: ["The one-time full setup fee is non-refundable once work on your account has started."] },
        { h: "After the refund window", p: ["After the refund window, payments for elapsed periods are not refunded, and you can stop renewal at any time by contacting us."] },
      ],
    },
  },
};

export const LEGAL_LINKS: Array<{ href: string; doc: LegalDoc }> = [
  { href: "/terms", doc: "terms" },
  { href: "/privacy", doc: "privacy" },
  { href: "/refund", doc: "refund" },
];

export default function Legal({ doc }: { doc: LegalDoc }) {
  const [lang, setLang] = useState<Lang>("ar");
  const content = DOCS[doc];
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-slate-200 sm:px-6" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <article className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />{lang === "ar" ? "الرئيسية" : "Home"}</Link>
          <div className="flex gap-2" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === "ar"} onClick={() => setLang("ar")} className={`rounded-full border px-4 py-1 text-sm ${lang === "ar" ? "border-lime-300 bg-lime-300 text-slate-950" : "border-white/15 text-slate-300"}`}>العربية</button>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} className={`rounded-full border px-4 py-1 text-sm ${lang === "en" ? "border-lime-300 bg-lime-300 text-slate-950" : "border-white/15 text-slate-300"}`}>English</button>
          </div>
        </div>
        <h1 className="mt-8 text-3xl font-semibold text-white">{content.title[lang]}</h1>
        <p className="mt-1 text-sm text-slate-400">{UPDATED[lang]}</p>
        <div className="mt-6 space-y-5 leading-8">
          {content.body[lang].map((section, index) => (
            <section key={index}>
              {section.h && <h2 className="text-lg font-semibold text-cyan-200">{section.h}</h2>}
              {section.p.map((paragraph, i) => <p key={i} className="mt-1 break-words">{paragraph}</p>)}
            </section>
          ))}
        </div>
        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-sm text-slate-400" aria-label="Legal">
          {LEGAL_LINKS.map(link => <Link key={link.href} href={link.href} className="hover:text-white">{DOCS[link.doc].title[lang]}</Link>)}
        </nav>
      </article>
    </main>
  );
}
