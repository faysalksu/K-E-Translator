(() => {
  if (window.__floatingKoEnTranslatorLoaded) return;
  window.__floatingKoEnTranslatorLoaded = true;

  const BUTTON_ID = "__ko_en_float_button";
  const OVERLAY_ID = "__ko_en_screen_overlay";
  let busy = false;
  let activeTaskId = 0;
  let overlay = null;
  let statusNode = null;
  let pointerStart = null;
  let buttonStart = null;
  let moved = false;

  const style = document.createElement("style");
  style.textContent = `
    #${BUTTON_ID}{
      position:fixed;right:22px;bottom:24px;width:58px;height:58px;z-index:2147483648;
      border:3px solid #fff;border-radius:50%;background:#123e78;color:#fff;
      box-shadow:0 4px 18px rgba(0,0,0,.32);font:800 12px/1 Arial,sans-serif;letter-spacing:-.35px;
      display:flex;align-items:center;justify-content:center;cursor:grab;
      user-select:none;touch-action:none;padding:0;
    }
    #${BUTTON_ID}:active{cursor:grabbing}
    #${BUTTON_ID}.working{font-size:0!important;cursor:pointer!important}
    #${BUTTON_ID}.working:after{
      content:"";width:24px;height:24px;border:3px solid rgba(255,255,255,.38);
      border-top-color:#fff;border-radius:50%;animation:koen-spin .7s linear infinite;
    }
    #${OVERLAY_ID} .koen-notice{
      position:fixed;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);
      width:min(340px,calc(100% - 36px));box-sizing:border-box;padding:20px;
      border-radius:16px;background:#fff;color:#172b45;text-align:center;
      font:14px/1.5 Arial,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35);
    }
    #${OVERLAY_ID} .koen-notice strong{display:block;font-size:17px;margin-bottom:8px}
    #${OVERLAY_ID} .koen-notice button{
      margin-top:12px;border:0;border-radius:8px;background:#123e78;color:#fff;
      padding:10px 16px;font-weight:700;cursor:pointer
    }
    #${OVERLAY_ID}{
      position:fixed;inset:0;z-index:2147483646;background:#101827;
      display:flex;align-items:center;justify-content:center;overflow:auto;
      cursor:default;
    }
    #${OVERLAY_ID} .koen-shot{
      display:block;max-width:100%;max-height:100%;width:auto;height:auto;
      object-fit:contain;box-shadow:0 0 0 1px rgba(255,255,255,.2);
    }
    #${OVERLAY_ID} .koen-status{
      position:fixed;top:12px;left:50%;transform:translateX(-50%);
      max-width:calc(100% - 100px);padding:9px 14px;border-radius:22px;
      background:rgba(12,29,53,.94);color:#fff;font:13px/1.4 Arial,sans-serif;
      box-shadow:0 3px 12px rgba(0,0,0,.25);text-align:center;
      display:flex;align-items:center;gap:9px;pointer-events:none;
    }
    #${OVERLAY_ID} .koen-spinner{
      width:15px;height:15px;flex:0 0 15px;border:2px solid rgba(255,255,255,.35);
      border-top-color:#fff;border-radius:50%;animation:koen-spin .75s linear infinite;
    }
    @keyframes koen-spin{to{transform:rotate(360deg)}}
    #${OVERLAY_ID} .koen-hint{
      position:fixed;bottom:12px;left:50%;transform:translateX(-50%);
      padding:7px 12px;border-radius:18px;background:rgba(12,29,53,.86);
      color:#fff;font:11px Arial,sans-serif;pointer-events:none;white-space:nowrap;
    }
    #${OVERLAY_ID} .koen-canvas{position:relative;display:inline-block;line-height:0;max-width:100%;max-height:100%}
    #${OVERLAY_ID} .koen-text-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    #${OVERLAY_ID} .koen-text-box{
      position:absolute;display:flex;align-items:center;justify-content:center;
      overflow:hidden;box-sizing:border-box;background:rgba(255,255,255,.98);
      color:#102c50;border:0;padding:0 2px;text-align:left;
      font-family:Arial,Helvetica,sans-serif;font-weight:500;
      line-height:1.12;white-space:normal;overflow-wrap:anywhere;word-break:normal;
    }
    #${OVERLAY_ID} .koen-text-box.failed{color:#9d2626}
  `;
  (document.documentElement || document.head).appendChild(style);

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.title =
      "Korean to English — click to translate. Press ESC to release.";
    button.setAttribute("aria-label", "Korean to English screen translator");
    button.textContent = "K→E";
    document.documentElement.appendChild(button);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerup", onPointerUp);
    button.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerDown(event) {
    const button = event.currentTarget;
    pointerStart = { x: event.clientX, y: event.clientY };
    const rect = button.getBoundingClientRect();
    buttonStart = { left: rect.left, top: rect.top };
    moved = false;
    button.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function onPointerMove(event) {
    if (!pointerStart || !buttonStart) return;
    const dx = event.clientX - pointerStart.x,
      dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    if (moved) {
      const button = event.currentTarget;
      const x = Math.max(
        0,
        Math.min(innerWidth - button.offsetWidth, buttonStart.left + dx),
      );
      const y = Math.max(
        0,
        Math.min(innerHeight - button.offsetHeight, buttonStart.top + dy),
      );
      button.style.left = x + "px";
      button.style.top = y + "px";
      button.style.right = "auto";
      button.style.bottom = "auto";
    }
    event.preventDefault();
  }
  function onPointerUp(event) {
    if (!pointerStart) return;
    const wasMoved = moved;
    pointerStart = null;
    buttonStart = null;
    if (!wasMoved) {
      if (busy || overlay) releaseScreen();
      else startCapture();
    }
    event.preventDefault();
  }

  function showOverlay(screenshotUrl) {
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML =
      '<div class="koen-status"><span class="koen-spinner"></span><span class="koen-status-text">Screen frozen. Preparing translation…</span></div><div class="koen-hint">Click the floating button or press ESC to stop</div>';
    const frozenImage = document.createElement("img");
    frozenImage.className = "koen-shot";
    frozenImage.src = screenshotUrl;
    frozenImage.alt = "Frozen webpage screenshot";
    const wrap = document.createElement("div");
    wrap.className = "koen-canvas";
    wrap.appendChild(frozenImage);
    overlay.appendChild(wrap);
    document.documentElement.appendChild(overlay);
    statusNode = overlay.querySelector(".koen-status-text");
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.classList.remove("working");
      button.textContent = "×";
      button.title = "Stop translation and release screen";
      button.style.background = "#b3261e";
      button.style.visibility = "visible";
    }
    document.addEventListener("keydown", onEscape, true);
    document.documentElement.style.overflow = "hidden";
    if (document.body) document.body.style.overflow = "hidden";
  }
  function setStatus(text) {
    if (statusNode) statusNode.textContent = text;
  }

  async function startCapture() {
    if (busy || overlay) return;
    busy = true;
    const taskId = ++activeTaskId;
    document.addEventListener("keydown", onEscape, true);
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.textContent = "";
      button.classList.add("working");
      button.title = "Stop and release screen";
      button.style.background = "#b3261e";
    }
    setButtonStatus("Capturing…");
    try {
      const result = await chrome.runtime.sendMessage({
        type: "CAPTURE_AND_TRANSLATE_VISIBLE",
      });
      if (taskId !== activeTaskId) return;
      if (result?.error) throw new Error(result.error);
      drawTranslatedScreenshot(result, taskId);
    } catch (error) {
      if (taskId !== activeTaskId) return;
      if (overlay)
        setStatus(
          (error.message || "Translation failed") + " — click × or press ESC.",
        );
      else {
        console.warn("Screenshot translation failed:", error);
        if ((error.message || "").includes("API_KEY_MISSING"))
          showApiKeyNotice();
        else resetButton();
      }
    } finally {
      if (taskId === activeTaskId) busy = false;
    }
  }

  function setButtonStatus(label) {
    const button = document.getElementById(BUTTON_ID);
    if (button) button.setAttribute("aria-label", label);
  }

  function resetButton() {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.classList.remove("working");
      button.textContent = "K→E";
      button.title =
        "Korean to English — click to translate. Press again or ESC to release.";
      button.setAttribute("aria-label", "Korean to English screen translator");
      button.style.background = "#123e78";
      button.style.visibility = "visible";
    }
  }

  function showApiKeyNotice() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      statusNode = null;
    }
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML =
      '<div class="koen-notice"><strong>OCR API key required</strong>Translation cannot start because the OCR.space API key is not set. Click the extension icon in Chrome, enter your API key under Image OCR Settings, and press Save Settings.<br> <a href="https://ocr.space/ocrapi/freekey"><button type="button">Create a Free API</button></a><br><button type="button">OK</button></div>';
    document.documentElement.appendChild(overlay);
    overlay.querySelector("button").addEventListener("click", releaseScreen);
    document.addEventListener("keydown", onEscape, true);
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.textContent = "×";
      button.classList.remove("working");
      button.style.background = "#b3261e";
    }
  }

  function drawTranslatedScreenshot(result, taskId) {
    const image = new Image();
    image.className = "koen-shot";
    image.alt = "Captured webpage screenshot";
    image.onload = () => {
      if (taskId !== activeTaskId || !overlay) return;
      overlay.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "koen-canvas";
      const layer = document.createElement("div");
      layer.className = "koen-text-layer";
      wrap.append(image, layer);
      overlay.appendChild(wrap);

      // Wait for layout so clientWidth/clientHeight are the real rendered
      // screenshot dimensions (not zero while a second image is still loading).
      requestAnimationFrame(() => {
        if (taskId !== activeTaskId || !overlay) return;
        const renderedScaleX = image.clientWidth / result.imageWidth;
        const renderedScaleY = image.clientHeight / result.imageHeight;
        if (!renderedScaleX || !renderedScaleY) {
          setStatus("Could not size screenshot. Press ESC and try again.");
          return;
        }
        const measureCanvas = document.createElement("canvas");
        const measureCtx = measureCanvas.getContext("2d");

        function wrapText(text, maxWidth, fontSize) {
          measureCtx.font = `500 ${fontSize}px Arial, Helvetica, sans-serif`;
          const words = String(text || "").split(/\s+/);
          const rows = [];
          let row = "";
          for (const word of words) {
            const candidate = row ? row + " " + word : word;
            if (row && measureCtx.measureText(candidate).width > maxWidth) {
              rows.push(row);
              row = word;
            } else row = candidate;
          }
          if (row) rows.push(row);
          return rows;
        }

        for (const box of result.boxes || []) {
          if (!box || box.failed) continue;
          const el = document.createElement("div");
          el.className = "koen-text-box";
          el.style.left = (box.left / result.imageWidth) * 100 + "%";
          el.style.top = (box.top / result.imageHeight) * 100 + "%";
          el.style.width = (box.width / result.imageWidth) * 100 + "%";
          el.style.height = (box.height / result.imageHeight) * 100 + "%";

          const availableWidth = Math.max(4, box.width * renderedScaleX - 4);
          const availableHeight = Math.max(4, box.height * renderedScaleY - 1);
          const sourceFontSize = Math.max(
            6,
            box.height * renderedScaleY * 0.82,
          );
          let fontSize = sourceFontSize;
          let rows = wrapText(box.text, availableWidth, fontSize);
          while (
            fontSize > 6 &&
            (rows.length * fontSize * 1.12 > availableHeight ||
              rows.some(
                (row) => measureCtx.measureText(row).width > availableWidth,
              ))
          ) {
            fontSize -= 0.5;
            rows = wrapText(box.text, availableWidth, fontSize);
          }
          el.style.fontSize = fontSize + "px";
          el.style.lineHeight = "1.12";
          el.style.whiteSpace = "pre-wrap";
          el.textContent = rows.join("\n");
          el.title = box.text;
          layer.appendChild(el);
        }
        const hint = document.createElement("div");
        hint.className = "koen-hint";
        hint.textContent = `${result.translatedCount || 0} translated${result.failedCount ? ` · ${result.failedCount} failed` : ""} · Click × or press ESC to release`;
        overlay.appendChild(hint);
      });
    };
    image.onerror = () =>
      setStatus("Could not render screenshot. Click × or press ESC to close.");
    image.src = result.screenshotUrl;
  }

  function onEscape(event) {
    if (event.key === "Escape" && (overlay || busy)) {
      event.preventDefault();
      event.stopPropagation();
      releaseScreen();
    }
  }
  function releaseScreen() {
    activeTaskId++;
    try {
      chrome.runtime
        .sendMessage({ type: "CANCEL_TRANSLATION" })
        .catch(() => {});
    } catch (e) {}
    if (overlay) {
      overlay.remove();
      overlay = null;
      statusNode = null;
    }
    document.removeEventListener("keydown", onEscape, true);
    document.documentElement.style.overflow = "";
    if (document.body) document.body.style.overflow = "";
    const button = document.getElementById(BUTTON_ID);
    resetButton();
    busy = false;
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SHOW_CAPTURED_SCREEN" && busy && !overlay) {
      showOverlay(msg.screenshotUrl);
    }
    if (msg.type === "FLOAT_TRANSLATOR_STATUS") setStatus(msg.status);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createButton, { once: true });
  } else createButton();
})();
