(() => {
  const script = document.currentScript;
  const agentId = script?.dataset?.agentId;
  if (!agentId || document.getElementById(`neon-agent-widget-${agentId}`)) return;

  const origin = new URL(script.src).origin;
  const root = document.createElement("div");
  root.id = `neon-agent-widget-${agentId}`;
  root.innerHTML = `
    <style>
      #neon-agent-widget-${agentId} { position: fixed; inset: auto 24px 24px auto; z-index: 2147483000; font-family: Inter, Arial, sans-serif; direction: rtl; }
      #neon-agent-widget-${agentId} .neon-launcher { width: 58px; height: 58px; border: 0; border-radius: 20px; cursor: pointer; background: #bef264; color: #07111f; box-shadow: 0 18px 45px rgba(7,17,31,.35); font-size: 25px; }
      #neon-agent-widget-${agentId} .neon-frame { display: none; position: absolute; right: 0; bottom: 74px; width: min(390px, calc(100vw - 32px)); height: min(680px, calc(100vh - 112px)); border: 1px solid rgba(255,255,255,.15); border-radius: 28px; box-shadow: 0 26px 80px rgba(0,0,0,.35); background: #07111f; overflow: hidden; }
      #neon-agent-widget-${agentId} .neon-frame.is-open { display: block; }
      #neon-agent-widget-${agentId} iframe { display: block; width: 100%; height: 100%; border: 0; }
    </style>
    <div class="neon-frame"><iframe title="Neon AI Agent" loading="lazy"></iframe></div>
    <button class="neon-launcher" aria-label="Open Neon AI Agent">✦</button>
  `;
  document.body.appendChild(root);
  const frame = root.querySelector(".neon-frame");
  const iframe = root.querySelector("iframe");
  const launcher = root.querySelector(".neon-launcher");
  let loaded = false;
  launcher.addEventListener("click", () => {
    const open = frame.classList.toggle("is-open");
    if (open && !loaded) {
      iframe.src = `${origin}/widget/${encodeURIComponent(agentId)}`;
      loaded = true;
    }
  });
  window.addEventListener("message", event => {
    if (event.origin === origin && event.data?.type === "neon-agent-widget-close") {
      frame.classList.remove("is-open");
    }
  });
})();
