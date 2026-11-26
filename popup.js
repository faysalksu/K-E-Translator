const $ = (id) => document.getElementById(id);
chrome.storage.local.get(
  ["ocrKey"],
  (data) => ($("ocrKey").value = data.ocrKey || ""),
);
$("save").addEventListener("click", async () => {
  await chrome.storage.local.set({ ocrKey: $("ocrKey").value.trim() });
  $("save").textContent = "Saved";
  setTimeout(() => ($("save").textContent = "Save settings"), 1200);
});
