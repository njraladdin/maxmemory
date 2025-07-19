<div align="center">
  <img src="icons/icon128.png" alt="MaxMemory Logo" width="128" height="128">

  # MaxMemory
  
  <h3>Infinite Memory for AI Chatbots 🧠</h3>

  <p>
    <a href="https://chromewebstore.google.com/detail/memory-vault-infinite-lon/bdmhcmmcjkgnecahmeahfbjjelkbliea">
      <img src="https://img.shields.io/badge/Chrome-Install_Now-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store" />
    </a>
    <img src="https://img.shields.io/chrome-web-store/users/bdmhcmmcjkgnecahmeahfbjjelkbliea?style=for-the-badge&color=4285F4" alt="Users" />
  </p>
</div>

## Overview

MaxMemory enables ChatGPT and Claude to remember your memories past conversations, providing context-aware responses by seamlessly injecting relevant memories from your chat history into new conversations.

## ✨ Features

### 🔒 Privacy First
All your chat memories are stored locally in your browser using IndexedDB - no external servers, no data collection. Your conversations stay private and under your control.

### 🛠 How It Works
1. The extension monitors your chat interactions and stores them locally along with their semantic embeddings (using Google's text-embedding-004 model)
2. When you start a new conversation, it:
   - Generates an embedding for your current message
   - Uses cosine similarity to find the most semantically relevant past conversations
   - Automatically injects these relevant memories into your prompt
3. This allows the AI to maintain semantic context across sessions without sending your data to external servers

## 🚀 Getting Started

### Option 1: Chrome Web Store (Recommended)
Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/memory-vault-infinite-lon/bdmhcmmcjkgnecahmeahfbjjelkbliea)

### Option 2: Manual Setup
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the repository folder
5. Get a Google API key and add it in the extension popup (required for embeddings)

## 💬 Supported Platforms

<p>
  <img src="https://img.shields.io/badge/ChatGPT-74aa9c?style=for-the-badge&logo=openai&logoColor=white" alt="ChatGPT" />
  <img src="https://img.shields.io/badge/Claude-black?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude" />
</p>

MaxMemory transforms these chatbots into powerful personal assistants that truly understand your context and history.