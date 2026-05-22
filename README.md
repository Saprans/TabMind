<h1 align="center">🧠 TabMind</h1>

<p align="center">
  <strong>Organize your tab chaos using the power of AI — directly in your browser.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue.svg?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-yellow.svg?style=flat-square" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Browser-Chromium-lightgrey.svg?style=flat-square" alt="Chromium Browsers">
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License MIT">
</p>

<p align="center">
  <!-- TODO: Replace with the actual link to your screenshot/GIF -->
  <img src="https://via.placeholder.com/800x400.png?text=TabMind+Screenshot+or+Demo+GIF" alt="TabMind Demo">
</p>

---

**TabMind** is a minimalist and user-friendly extension for Chromium-based browsers (Google Chrome, Edge, Brave, Yandex, etc.) that organizes the chaos in your tabs using Artificial Intelligence. With just one click, your tabs are neatly grouped by topic.

Unlike alternatives, TabMind is not tied to a specific service and allows you to use **any AI provider** of your choice (including local, offline models).

## ⚡️ Key Features

* **Multi-provider Support** — switch between 12+ AI services in a single click. API keys and model settings are saved individually for each provider.
* **Smart Auto-grouping** — automatically triggers grouping when you exceed your custom limit of open tabs (e.g., more than 10).
* **System Page Handling** — service tabs (`chrome://`, `about:`, blank pages) are never sent to the AI. They are safely and automatically collected into an "Other" group.
* **Local Model Support** — seamlessly integrate with Ollama, LM Studio, or any other local/custom API compatible with the OpenAI format.
* **Privacy-Focused** — the extension communicates directly with provider APIs without any intermediate servers. Your API keys are stored locally in your browser.

## 🛠 Supported Providers & Models

| Provider | API Adapter | Default Model |
| :--- | :--- | :--- |
| **Claude** (Anthropic) | Anthropic (Native) | `claude-opus-4-5` |
| **ChatGPT** (OpenAI) | OpenAI | `gpt-4o-mini` |
| **DeepSeek** | OpenAI-compatible | `deepseek-chat` |
| **Gemini** (Google) | Gemini (Native) | `gemini-2.0-flash` |
| **Groq** | OpenAI-compatible | `llama-3.3-70b-versatile` |
| **Mistral** | OpenAI-compatible | `mistral-small-latest` |
| **Grok** (xAI) | OpenAI-compatible | `grok-3-mini` |
| **OpenRouter** | OpenAI-compatible | `openai/gpt-4o-mini` |
| **Qwen** (Alibaba) | OpenAI-compatible | `qwen-turbo` |
| **Kimi** (Moonshot) | OpenAI-compatible | `moonshot-v1-8k` |
| **Together AI** | OpenAI-compatible | `meta-llama/Llama-3-8b-chat-hf` |
| **Perplexity** | OpenAI-compatible | `llama-3.1-sonar-small-128k-online` |
| **Custom URL** | OpenAI-compatible | *User-configurable* |

## 🚀 Installation & Setup

Since the extension is currently in active development, you can install it manually via Developer mode:

1. Download the project files and extract them into a separate folder (or clone this repository).
2. Open your browser and navigate to `chrome://extensions/`.
3. In the top right corner, toggle on **Developer mode**.
4. Click the **Load unpacked** button that appears in the top left corner.
5. Select the folder containing the extracted project files.
6. Pin the TabMind icon to your extensions toolbar, open it, select your desired provider, paste your API key, and click **✦ Group my tabs**.

## 💻 Using Local Models (Ollama / LM Studio)

You can use TabMind completely free of charge and offline by running models locally on your machine:

1. Select the **Custom** provider (⚙ gear icon).
2. In the **Base URL** field, enter the address of your local server:
   * **For Ollama:** `http://localhost:11434/v1` *(You can type any random characters into the API key field, e.g., `ollama`)*.
   * **For LM Studio:** `http://localhost:1234/v1`.
3. In the **Model** field, enter the exact name of your downloaded model (e.g., `llama3` or `mistral`).

## 🧱 Tech Stack

* **[Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)** — the modern and secure standard for Chrome extensions.
* **Vanilla JS** — pure JavaScript without heavy frameworks, bundlers, or unnecessary dependencies.
* **Chrome Tab Groups API** — native and seamless Chrome tab group management.

## 📝 License

This project is open-source and distributed under the **[MIT License](LICENSE)**. You are free to use, modify, and distribute this code.
