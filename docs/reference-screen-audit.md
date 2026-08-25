# Reference Screen Audit

## Screens inspected

### Screenshot_20260826-001726.jpg
The mobile reference uses a very light warm background with large rounded white surfaces, thin gray borders, and soft shadows. The top product bar is a horizontal control strip with profile, alerts, dropdown, layout/device controls, and the Gabster mark. The main content includes a large Arabic heading, a prominent empty-state message, and a blue `عرض الكل` action. Below it is a browser-like content preview card with a URL field, a page title, and skeleton/loading blocks. A floating circular helper/widget sits at the lower-right.

### Screenshot_20260826-001717.jpg
The same mobile shell is visible with an expanded settings/notification popover. A saturated indigo primary CTA reads `إنشاء موظف جديد`, a plan-upgrade card appears above language choices, Arabic is selected, and a connectivity row is visible. A slim vertical floating control rail on the right contains more actions and a vibration/toast notification is shown. The visual language is light, rounded, layered, and action-first rather than dark dashboard-oriented.

## Initial design direction for Neon

Use a warm off-white page background, white rounded panels, blue/indigo primary actions, restrained green status accents, and a compact responsive top bar. Make the first action `إنشاء وكيل` prominent, keep the selected agent visible, and place secondary controls in a compact utility rail or mobile overflow menu. Preserve Neon’s actual Arabic-first functionality and avoid copying Gabster branding or claiming Gabster-specific product capabilities.

## Pending screens

Inspect remaining supplied screenshots for conversations, onboarding, agent settings, channels, knowledge, and completion states before making broad UI changes.


## Additional screens inspected

### Screenshot_20260826-001703.jpg
The mobile setup screen is a single centered card with the heading `أضف هذه الصفحة إلى الروابط السريعة`, a URL field, a name field, and a large blue `إضافة` button. The screen is intentionally narrow and keyboard-aware, with no competing dashboard content while the user is entering data.

### Screenshot_20260826-001636.jpg
The editor view adds a clear `العودة إلى إعداد التضمين` escape route, a two-tab switch (`إطار مضمن` / `واجهة`), and a browser-like preview below. The active tab uses a blue underline and the preview card has a URL bar, page title, and loading/skeleton area. This confirms the reference prioritizes focused task views over showing every control at once.

### Screenshot_20260826-001613.jpg
The mobile conversation area is introduced with a prominent blue `تحديث المحادثة` button, followed by a green success callout explaining that the tool is connected and offering a large `كود التضمين` button. The conversation inbox below uses a bold indigo gradient header, language toggle, a `+ جديدة` action, and a clean empty-state message. This suggests that the app should surface the next actionable step before the list itself.

### Screenshot_20260826-001428.jpg
A public-facing landing page uses a white header with the product mark, theme toggle, and hamburger menu. A floating vertical contact rail shows WhatsApp, Instagram, Telegram, and Messenger buttons with strong brand colors and a close control. The hero is spacious with a consultation CTA and large typography. For Neon, this visual pattern is useful for channel shortcuts, but real channel availability must remain truthful.

### Screenshot_20260826-001400.jpg
The public product page uses dotted background texture, horizontal pill-like channel tiles (Telegram, Email, WhatsApp, Live chat), and an oversized voice feature heading. The right-side contact rail remains persistent. This supports a simple channel selection vocabulary for Neon, but channel tiles should communicate `جاهز` versus `بانتظار الاعتماد` rather than implying all are live.

### Screenshot_20260826-001242.jpg
The embedded preview is a full browser-like card with the website URL bar, Arabic page content, a bold blue/purple conversation banner, language toggle, empty conversation rows, and a branded footer with a `زورونا` action. The preview itself is treated as a product surface with a clear visual frame, not just a raw iframe.

### Screenshot_20260826-001220.jpg
The reference opens an instructional modal titled `شاهد كيفية التضمين كإطار مضمن`, with a dimmed/blurred app background, a rounded white dialog, a close control, a video player, and a clear `إغلاق` button. This is a good pattern for Neon’s embed help: teach the user in context without navigating away.

### Screenshot_20260826-001205.jpg
The same embed-help modal is shown at a code-instruction frame. The video demonstrates a short script snippet inside a dark code view. Neon should pair its real generated script with a similarly simple modal or help drawer and avoid making the user hunt through documentation.

### Screenshot_20260826-001138.jpg
The embed setup is explicitly numbered. A selected `لوحة مضمنة` mode is followed by `الخطوة 3: انسخ المقتطف`, a dark script card with a copy button, and a help link `تواجه مشكلة؟ شاهد هذا الشرح`. This is a strong pattern for Neon’s Widget page: show current setup state, the exact code, and help in one focused flow.

### Screenshot_20260826-001051.jpg
The completion state confirms the URL/domain in a green success card, offers edit, shows the embed method toggle (`ودجت` / `إطار مضمن`), explains placement before `</body>`, and presents a copyable code block with bottom actions for `صفحة التضمين` and `إغلاق`. Neon should use the same completion hierarchy while generating its own real agent-specific script.

### Screenshot_20260826-001035.jpg
The completed linking modal uses a green confirmation icon, a bold success title `تم ربط أداة الدردشة بنجاح`, a short instruction to add the site domain, a single domain input, a primary `حفظ` action, and bottom actions for the embed page and closing. The background is intentionally blurred so the user focuses on the next required step.

### Screenshot_20260826-001006.jpg
The same modal is shown during save with the domain input populated by `https://example.com` and the primary button replaced by a spinner. This confirms the desired behavior for Neon: validate the domain, disable duplicate submission, show a visible loading state, and keep the next step accessible.

### Screenshot_20260826-000935.jpg
The workspace uses separate large accordion cards for `قاعدة المعرفة` and `الفجوات المعرفية`. Each card has a clear title, an expand/collapse control, a refresh icon, and a large dashed `إضافة` empty-state action. This is a useful model for making Neon knowledge management approachable instead of presenting a dense table immediately.

### Screenshot_20260826-000930.jpg
The expanded knowledge view shows readable knowledge cards such as `Response style` and `Identity`, each with a short preview, a list/settings icon, and `عرض المزيد`. Below, `التكاملات` is its own accordion card with recognizable channel icons and an `إضافة` action. Neon should group knowledge and integrations into scannable modules with empty states and refresh actions.

### Screenshot_20260826-000921.jpg
The settings workspace has a dedicated `الإشعارات` card with an on/off toggle, explanatory copy, and an `إرسال إشعار تجريبي` button. Below it, `التوجيهات` is expanded with an `إضافة قالب` action and readable instruction cards. Integrations are collapsed into a separate row with channel icons. The interface favors progressive disclosure and keeps advanced controls out of the initial view.

### Screenshot_20260826-000914.jpg
The compact settings state shows four stacked accordion rows: notifications, instructions, integrations, and knowledge base, with only the selected section expanded. This is a strong mobile pattern for Neon’s Settings and Agent pages: one focused module at a time, clear chevrons, and no long dashboard wall.

### Screenshot_20260826-000817.jpg
The reference includes a guided-tour modal for the `لوحة التوجيهات` section. It dims the rest of the page, points to the relevant accordion with a small diamond marker, and provides `السابق`, `تخطي`, and `التالي` controls with progress `Step 2 of 8`. Neon can use a short Arabic guided tour only for first-time setup, with a skip option and no interruption for returning users.

## Audit conclusion
Across the supplied screens, the consistent pattern is a light, airy, rounded mobile workspace with progressive disclosure: top utility bar, one active task/module, a clear primary action, compact accordions, and contextual success/help modals. The independent Neon functionality should be retained, but its current dense dark sections should be reorganized into these focused surfaces.
