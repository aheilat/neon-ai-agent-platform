# Live Render audit notes

Updated 2026-08-25 UTC during the independent runtime audit.

## Sources

- Login page: https://agent.neonadai.com/login?audit=auth-copy-20260825-final
- Public Widget: https://agent.neonadai.com/widget/7?audit=controls
- Public agent API: https://agent.neonadai.com/api/public/agents/7
- GitHub main: https://github.com/aheilat/neon-ai-agent-platform

## Verified observations

The live custom domain is served by Render (`x-render-origin-server: Render`) and the public Widget HTML, `neon-agent-widget.js`, and agent profile endpoint returned HTTP 200. A live public conversation lifecycle was previously verified: chat HTTP 200 JSON, handoff HTTP 201 JSON, close HTTP 200, and rating HTTP 200; temporary conversation records were removed from Supabase afterwards.

The live login bundle initially displayed the old text “دخول آمن بدون كلمة مرور داخل Neon” even though the form required a password. After commit `786d67e` was pushed to the selected GitHub repository, the deployed asset `/assets/index-C7571QSU.js` contained the corrected text “دخول آمن إلى مساحة عملك داخل Neon” and the Supabase explanation. A fresh browser navigation to the live domain confirmed the corrected copy at the rendered UI.

Before the public Widget media commit was deployed, the live Widget rendered only the text input, send control, close control, and human-handoff action; it did not show attachment or microphone controls. The latest media implementation was committed to GitHub as `8e11442` after the managed checkpoint `8e441dad`; the remaining verification is to wait for or trigger the Render service rebuild and confirm the live Widget now exposes the controls.

## Data-isolation observation

A read-only Supabase query showed four tenants owned by different emails, including `neon.render.e2e.202608250928@gmail.com`, `linaalmousa21@gmail.com`, `engr.ahmed.hailat@gmail.com`, and `eng.aheilat@gmail.com`. Agent records were intentionally not deleted because ownership of the visible test-like agents was not established. Only disposable conversations created during the live endpoint checks were deleted with narrowly scoped cleanup.

## Current deployment note

The managed project checkpoint publishes the Manus preview independently from the external Render service. The managed Git remote uses S3 credentials unavailable in the shell, so direct `git push` from `/home/ubuntu/neon-ai-agent-platform` fails by design. The selected GitHub repository was synchronized using `gh repo clone`, an archive copy excluding `.git`, `.env*`, `node_modules`, and `dist`, then a normal GitHub commit/push. The selected GitHub `main` currently contains commit `8e11442` for the Widget media controls. Render live-bundle verification remains pending until that service rebuild is visible.

## Media controls verified

After GitHub commit `8e11442`, the live Widget rebuilt with bundle `/assets/index-C27v38hu.js`. The bundle contains `إرفاق صورة أو ملف`, `تسجيل رسالة صوتية`, and the image disclosure. Browser navigation to `https://agent.neonadai.com/widget/7?audit=media-controls-final` visibly showed both controls, the text composer, handoff action, and the disclosure that images are name-only while text files are read before sending. The DOM contained one hidden file input accepting JPEG/PNG/WebP/GIF/TXT/MD/CSV/JSON and one message input. No message was sent during this control-only check.

A live control-only interaction check confirmed the rebuilt Widget shows the attachment and microphone buttons. The browser automation layer could not inject a local file into the hidden file input even though DOM inspection identified it; this is a tooling limitation, not a product error. No live message or attachment was sent during this attempt, so no customer or test conversation was created.

## Render status-1 alert follow-up — 2026-08-26 11:24 UTC

The live deployment was checked after the Render instance alert. `GET https://agent.neonadai.com/api/health` returned HTTP 200 with `runtime: independent`, `database: connected`, `supabase: configured`, and `missing: []`. The current server entrypoint was bundled with esbuild and started on an alternate local port in production mode; it reached `Server running` and stayed alive until the bounded smoke-test timeout. The only local warning was the expected absence of a client build directory in the temporary smoke-test fixture. Live logs showed no new uncaught, fatal, or exit marker in the inspected window. The recurring scheduled-sync provider exhaustion is now handled as a deferred JSON response in the checkpointed source.
