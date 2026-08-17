# كتالوج النماذج المستخدم في Neon

تم التحقق من النماذج المتاحة في بيئة المشروع بتاريخ 17 أغسطس 2026 من نقطة الكتالوج الحية:

`$BUILT_IN_FORGE_API_URL/v1/models`

النماذج المتاحة التي يعتمد عليها توجيه محادثة Neon هي:

- `gpt-5-mini` و`gpt-5` و`gpt-5.5` و`gpt-5-nano` من OpenAI.
- `claude-haiku-4-5` و`claude-sonnet-4-6` و`claude-opus-4-6` و`claude-opus-4-7` من Anthropic.
- `gemini-3-flash-preview` و`gemini-3.1-pro-preview` من Google.

يعتمد التوجيه الافتراضي على `claude-haiku-4-5` بعد تحقق استجابة عربية مرئية، مع `gemini-3-flash-preview` و`gpt-5-mini` كبدائل تشغيلية. تُطبع أسماء النماذج الفعلية من الكتالوج الحي عند الحاجة بدلاً من افتراض استمرار أي اسم قديم مثل `gpt-4o`.
