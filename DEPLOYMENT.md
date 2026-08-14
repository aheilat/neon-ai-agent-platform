# دليل النشر والتثبيت - Neon AI Agent Platform

مرحباً بك! يتضمن هذا الملف الدليل الشامل لنشر **Neon AI Agent Platform** على منصة **Render**، وربط قاعدة البيانات بـ **Supabase (PostgreSQL)**، وتشغيل المنصة على الويب والهاتف (iOS و Android).

---

## أولاً: إعداد قاعدة البيانات على Supabase

1. أنشئ مشروعاً جديداً على [Supabase](https://supabase.com).
2. اذهب إلى **Project Settings > Database** واحصل على **Connection String (URI)** بنمط PostgreSQL (مثل `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`).
3. قم بتطبيق ملفات الهجرة (Migrations) الموجودة في مجلد `drizzle/` على قاعدة بيانات Supabase باستخدام Drizzle Kit أو عبر SQL Editor في لوحة تحكم Supabase.

---

## ثانياً: النشر على Render

1. اذهب إلى [Render Dashboard](https://dashboard.render.com) وأنشئ **New Web Service** واربط مستودع المشروع (أو ارفع المشروع).
2. إعدادات البناء والتشغيل:
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`
3. متغيرات البيئة (Environment Variables) الواجب إضافتها في Render:
   - `DATABASE_URL`: رابط اتصال Supabase PostgreSQL.
   - `JWT_SECRET`: مفتاح سري لتوقيع الجلسات (JWT).
   - `NODE_ENV`: `production`

---

## ثالثاً: تشغيل التطبيق على Web، iOS، و Android

### 1. الويب (Web)
التطبيق يعمل مباشرة كواجهة ويب متكاملة (React 19 + Tailwind CSS + tRPC) مدعومة بالخادم والواجهات البرمجية. عند النشر على Render أو أي موفر ويب، يصبح الرابط متاحاً لكافة المستخدمين عبر المتصفح.

### 2. تطبيقات الهواتف الذكية (iOS و Android)
المنصة مصممة بتقنيات تفاعلية متجاوبة (Responsive Web Widget)، ويمكن تحويلها بسهولة إلى تطبيق هجين (Hybrid Mobile App) عبر **React Native / Expo** أو **Capacitor / Cordova** عن طريق توجيه وجهات العرض إلى رابط المنصة المنشور على الويب، أو استخدام حزمة Expo المحمولة المرفقة في المشروع.
