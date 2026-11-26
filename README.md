# 🇰🇷 K-E Translator – Korean to English Screen & Image Translator

**K-E Translator** is a Chrome extension that helps users understand Korean content by translating Korean text into English directly from their screen.

It uses OCR (Optical Character Recognition) technology to detect Korean text from webpages, images, and other visible screen content, then translates the recognized text into English.

The extension provides a convenient floating **K→E** button, allowing users to translate without manually copying and pasting text.

> **Note:** This extension is not published on the Chrome Web Store. You must install it manually using Chrome Developer Mode. Follow the installation instructions below.

---

## ✨ Features

- 🌐 **Webpage Translation:** Translate Korean text displayed on webpages into English.
- 🖼️ **Image Text Translation:** Recognize and translate Korean text inside images visible on your screen.
- 📸 **Screen Capture Translation:** Capture the visible webpage and process its text using OCR.
- 🔍 **Korean OCR Recognition:** Detect Korean characters using the OCR.space API.
- 🌍 **Korean to English Translation:** Translate recognized Korean text using the MyMemory Translation API.
- 📍 **Text Position Preservation:** Display English translations in approximately the same positions as the original Korean text.
- 🔵 **Floating K→E Button:** Access the translator directly from webpages.
- ✋ **Draggable Button:** Move the floating button anywhere on the screen.
- ⌨️ **Easy Exit:** Press ESC to exit translation mode and return to the webpage.
- 🔑 **API Key Settings:** Save your OCR.space API key locally in Chrome.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Extension interface |
| CSS3 | Styling and layout |
| JavaScript | Extension functionality |
| Chrome Extension Manifest V3 | Chrome extension framework |
| OCR.space API | Korean text recognition |
| MyMemory Translation API | Korean to English translation |

---

# 🚀 Installation Guide (Manual Installation)

Since K-E Translator is not available on the Chrome Web Store, you need to install it manually.

**Don't worry! You don't need programming knowledge to install it. Just follow these steps.**

## Step 1 – Download the Project

1. Open the K-E Translator GitHub repository.
2. Click the green **Code** button.
3. Select **Download ZIP**.
4. Wait for the ZIP file to download.

Alternatively, if you already have the project ZIP file, you can use that.

## Step 2 – Extract the ZIP File

1. Open your Downloads folder.
2. Find the downloaded `K-E Translator.zip` file.
3. Right-click the ZIP file.
4. Select **Extract All** (Windows) or use your archive utility (Mac).
5. Extract the project into a folder.

**Important:** Do not select the ZIP file itself in Chrome. You must extract it first.

## Step 3 – Open Chrome Extensions

1. Open Google Chrome.
2. Copy the following address:

   `chrome://extensions/`

3. Paste it into the Chrome address bar.
4. Press Enter.

You will now see the Chrome Extensions management page.

## Step 4 – Enable Developer Mode

1. Look at the top-right corner of the Extensions page.
2. Find the **Developer mode** toggle.
3. Turn it ON.

<details>
<summary>What does Developer Mode look like?</summary>

Developer Mode is a switch located in the top-right area of the Chrome Extensions page.

When enabled, Chrome displays additional options, including:

- Load unpacked
- Pack extension
- Update

You need the **Load unpacked** option to install K-E Translator.

</details>

## Step 5 – Load the Extension

1. Click the **Load unpacked** button.
2. A folder selection window will appear.
3. Navigate to the location where you extracted K-E Translator.
4. Select the main project folder containing `manifest.json`.
5. Click **Select Folder**.

**Important:** Select
