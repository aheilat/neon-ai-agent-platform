# Neon AI Agent Platform - Project TODO

- [x] تصميم قاعدة البيانات (دعم Tenants، Agents، Knowledge Base، Conversations، Messages، Analytics، Channel Integrations)
- [x] إنشاء عمليات الهجرة (Migration) وتطبيقها عبر SQL
- [x] تطوير محرك الذكاء الاصطناعي (AI Agent Engine) المدعوم بـ LLM مع دعم اللغتين (العربية والإنجليزية) والتوجهات والقواعد
- [x] تطوير مسار إدارة الوكلاء المتعددين (Multi-Agent Management) في لوحة التحكم
- [x] تطوير قاعدة المعرفة (Knowledge Base Builder) لرفع وإدارة FAQs والمستندات لكل وكيل
- [x] تطوير محادثات العملاء الحية وتحليلات الأداء (Conversation History & Analytics Dashboard)
- [x] تطوير ويدجت الدردشة القابل للتضمين (Embeddable Live Chat Widget) مع دعم التصعيد (Escalation) والتقاط العملاء (Lead Capture)
- [x] توفير محاكاة تكامل قنوات التواصل الاجتماعي (WhatsApp, Facebook Messenger, Instagram DMs, Phone Voice Gateway) مع دعم الربط التجريبي
- [x] اختبار وتغطية الخادم ووظائف المحرك باختبارات Vitest
- [x] إنشاء نقطة التحقق (Checkpoint) وتسليم النسخة النهائية مع دليل الاستخدام

## UX Simplification / Gabster-inspired onboarding
- [x] بناء onboarding محمول متعدد الخطوات لاختيار أهداف الوكيل وإنشاء أول Agent
- [x] إضافة خيارات أهداف كبيرة وواضحة مع حالات تحديد وزر Continue ثابت
- [x] تحديث الصفحة الرئيسية لتوجيه المستخدم الجديد إلى أول وكيل بدلاً من لوحة كثيفة
- [x] تحسين التخطيط المحمول واللغة الثنائية مع الحفاظ على هوية Neon
- [x] ربط الأهداف المختارة بإنشاء إعدادات أولية للوكيل وقاعدة المعرفة والقنوات
- [x] إضافة اختبارات والتحقق البصري على الهاتف وسطح المكتب
- [x] حفظ نسخة checkpoint بعد اكتمال تجربة الاستخدام المبسطة

## Onboarding completion gaps
- [x] تنفيذ إنشاء تلقائي لعناصر Knowledge Base ابتدائية بناءً على الأهداف المختارة أثناء onboarding
- [x] حفظ القنوات المختارة من onboarding عبر channels.configure أو طبقة خادم مماثلة وربطها بالوكيل الجديد
- [x] إضافة اختبار يغطي إنشاء الوكيل وتهيئة القنوات وزرع بيانات المعرفة الابتدائية

## Live agent preview
- [x] إضافة مسار previewChat آمن لمحاكاة رد الوكيل قبل الحفظ
- [x] بناء بطاقة محادثة حية داخل خطوة الشخصية مع اللغة والنبرة والأهداف الحالية
- [x] إضافة اختبار لسلوك previewChat ورسالة التصعيد التجريبية
- [x] التحقق بصرياً من المعاينة على الهاتف وسطح المكتب ثم حفظ checkpoint
