// Floating Screen Translator background service worker.
const activeControllers = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CANCEL_TRANSLATION") {
    const tabId = sender.tab?.id;
    if (tabId != null) {
      const controller = activeControllers.get(tabId);
      if (controller) controller.abort();
      activeControllers.delete(tabId);
    }
    return;
  }
  if (msg.type === "CAPTURE_AND_TRANSLATE_VISIBLE") {
    const tabId = sender.tab?.id;
    const windowId = sender.tab?.windowId;
    captureAndTranslateVisible(tabId, windowId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({error:String(error)}));
    return true;
  }
});

function decodeTranslation(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

async function translateLine(text, signal) {
  const source = String(text || "").trim();
  if (!source) return "";
  const url = "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(source) + "&langpair=ko|en";
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error("Translation service busy (HTTP " + response.status + ")");
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
      if (!response.ok) throw new Error("Translation service HTTP " + response.status);
      const data = await response.json();
      if (Number(data.responseStatus) !== 200 || !data.responseData?.translatedText) {
        throw new Error(data.responseDetails || "No translation returned");
      }
      const result = decodeTranslation(data.responseData.translatedText)
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!result) throw new Error("Empty translation returned");
      return result;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
      if (attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError || new Error("Translation failed");
}

async function ocrScreenshot(dataUrl, apiKey, signal) {
  const form = new FormData();
  form.append("base64Image", dataUrl);
  form.append("language", "kor");
  form.append("isOverlayRequired", "true");
  form.append("OCREngine", "2");
  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {"apikey": apiKey},
    body: form,
    signal
  });
  if (!response.ok) throw new Error("OCR service HTTP " + response.status);
  const data = await response.json();
  if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage?.join(", ") || "OCR failed");
  return data;
}

function progress(tabId, text) {
  chrome.tabs.sendMessage(tabId, {type:"FLOAT_TRANSLATOR_STATUS", status:text}).catch(()=>{});
}

async function captureAndTranslateVisible(tabId, windowId) {
  if (tabId == null || windowId == null) throw new Error("Could not identify the browser tab.");
  const {ocrKey} = await chrome.storage.local.get(["ocrKey"]);
  if (!ocrKey || !ocrKey.trim()) throw new Error("API_KEY_MISSING");

  const controller = new AbortController();
  activeControllers.set(tabId, controller);
  const signal = controller.signal;
  try {
    progress(tabId, "Capturing visible webpage…");
    // Use the sender's tab/window directly: skip an extra tabs.query round trip.
    const screenshotUrl = await chrome.tabs.captureVisibleTab(windowId, {format:"jpeg", quality:78});
    if (signal.aborted) throw new Error("Cancelled");
    await chrome.tabs.sendMessage(tabId, {type:"SHOW_CAPTURED_SCREEN", screenshotUrl});
    progress(tabId, "Screen frozen · Sending image to OCR…");

    const ocr = await ocrScreenshot(screenshotUrl, ocrKey.trim(), signal);
    if (signal.aborted) throw new Error("Cancelled");
    const parsed = ocr.ParsedResults?.[0];
    const lines = parsed?.TextOverlay?.Lines || [];
    if (!lines.length) throw new Error("No text positions detected. Check your OCR.space API key or try a clearer screen.");

    const image = await createImageBitmap(await (await fetch(screenshotUrl)).blob());
    const imageWidth = image.width, imageHeight = image.height;
    image.close();

    const candidates = [];
    for (const line of lines) {
      const words = line.Words || [];
      const korean = line.LineText || words.map(w=>w.WordText).join(" ");
      if (!/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(korean) || !words.length) continue;
      const left = Math.min(...words.map(w=>Number(w.Left)||0));
      const top = Math.min(...words.map(w=>Number(w.Top)||0));
      const right = Math.max(...words.map(w=>(Number(w.Left)||0)+(Number(w.Width)||0)));
      const bottom = Math.max(...words.map(w=>(Number(w.Top)||0)+(Number(w.Height)||0)));
      candidates.push({left,top,width:right-left,height:bottom-top,source:korean});
    }
    if (!candidates.length) throw new Error("No Korean text found on this screen.");

    progress(tabId, `OCR found ${candidates.length} Korean text areas · Translating…`);
    const boxes = new Array(candidates.length);
    let completed = 0;
    let next = 0;
    // Translate each OCR line independently. This preserves the exact mapping
    // between a Korean line and its English replacement (no newline guessing).
    const concurrency = Math.min(5, candidates.length);
    async function worker() {
      while (!signal.aborted) {
        const index = next++;
        if (index >= candidates.length) return;
        const item = candidates[index];
        try {
          const text = await translateLine(item.source, signal);
          boxes[index] = { ...item, text, failed: false };
        } catch (error) {
          if (signal.aborted) return;
          boxes[index] = { ...item, text: item.source, failed: true };
        }
        completed++;
        progress(tabId, `Translating… ${completed}/${candidates.length} lines`);
      }
    }
    await Promise.all(Array.from({length: concurrency}, worker));
    if (signal.aborted) throw new Error("Cancelled");
    progress(tabId, "Rendering translated screen…");
    return {
      screenshotUrl, imageWidth, imageHeight, boxes,
      title: "Captured webpage",
      translatedCount: boxes.filter(x => x && !x.failed).length,
      failedCount: boxes.filter(x => x && x.failed).length
    };
  } finally {
    if(activeControllers.get(tabId)===controller) activeControllers.delete(tabId);
  }
}
