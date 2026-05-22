// ─── Provider configs ───────────────────────────────────────────────────────
const PROVIDERS = {
  claude:      { name: 'Claude',       url: 'https://api.anthropic.com',                          model: 'claude-opus-4-5',          adapter: 'anthropic', hint: 'sk-ant-api03-...' },
  openai:      { name: 'ChatGPT',      url: 'https://api.openai.com/v1',                          model: 'gpt-4o-mini',              adapter: 'openai',    hint: 'sk-...' },
  deepseek:    { name: 'DeepSeek',     url: 'https://api.deepseek.com/v1',                        model: 'deepseek-chat',            adapter: 'openai',    hint: 'sk-...' },
  groq:        { name: 'Groq',         url: 'https://api.groq.com/openai/v1',                     model: 'llama-3.3-70b-versatile',  adapter: 'openai',    hint: 'gsk_...' },
  gemini:      { name: 'Gemini',       url: 'https://generativelanguage.googleapis.com',          model: 'gemini-2.0-flash',         adapter: 'gemini',    hint: 'AIza...' },
  mistral:     { name: 'Mistral',      url: 'https://api.mistral.ai/v1',                          model: 'mistral-small-latest',     adapter: 'openai',    hint: '...' },
  openrouter:  { name: 'OpenRouter',   url: 'https://openrouter.ai/api/v1',                       model: 'openai/gpt-4o-mini',       adapter: 'openai',    hint: 'sk-or-...' },
  grok:        { name: 'Grok (xAI)',   url: 'https://api.x.ai/v1',                                model: 'grok-3-mini',              adapter: 'openai',    hint: 'xai-...' },
  qwen:        { name: 'Qwen',         url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',  model: 'qwen-turbo',               adapter: 'openai',    hint: 'sk-...' },
  kimi:        { name: 'Kimi',         url: 'https://api.moonshot.cn/v1',                         model: 'moonshot-v1-8k',           adapter: 'openai',    hint: 'sk-...' },
  together:    { name: 'Together AI',  url: 'https://api.together.xyz/v1',                        model: 'meta-llama/Llama-3-8b-chat-hf', adapter: 'openai', hint: '...' },
  perplexity:  { name: 'Perplexity',   url: 'https://api.perplexity.ai',                          model: 'llama-3.1-sonar-small-128k-online', adapter: 'openai', hint: 'pplx-...' },
  custom:      { name: 'Custom URL',   url: '',                                                    model: '',                         adapter: 'openai',    hint: 'API key' },
};

const CHROME_COLORS = ['blue','red','yellow','green','pink','purple','cyan','orange','grey'];

// ─── Message handler ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'groupTabs') {
    handleGroupTabs(msg)
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.action === 'getProviders') {
    sendResponse({ providers: PROVIDERS });
    return false;
  }
});

// ─── Auto-group listener ──────────────────────────────────────────────────────
let autoGroupTimer = null;

chrome.tabs.onCreated.addListener(() => {
  clearTimeout(autoGroupTimer);
  autoGroupTimer = setTimeout(checkAutoGroup, 1500); // debounce
});

async function checkAutoGroup() {
  const data = await chrome.storage.local.get(['autoGroup', 'autoThreshold', 'selectedProvider', 'apiKeys', 'models', 'customUrl']);
  if (!data.autoGroup) return;

  const threshold = data.autoThreshold ?? 10;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length < threshold) return;

  const provider = data.selectedProvider ?? 'claude';
  const apiKey = (data.apiKeys ?? {})[provider];
  if (!apiKey) return;

  const model = (data.models ?? {})[provider] || PROVIDERS[provider]?.model || '';
  const customUrl = data.customUrl ?? '';

  await handleGroupTabs({ tabs: tabs.map(t => ({ id: t.id, title: t.title || '', url: t.url || '' })), provider, apiKey, model, customUrl });
}

// ─── Core grouping logic ──────────────────────────────────────────────────────
async function handleGroupTabs({ tabs, provider, apiKey, model, customUrl }) {
  const cfg = PROVIDERS[provider] ?? PROVIDERS.custom;
  const baseUrl = (provider === 'custom' ? customUrl : cfg.url) || customUrl;

  // Separate valid tabs from system tabs (chrome://, about:, etc.)
  const validTabs = tabs.filter(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about') && !t.url.startsWith('edge') && t.title);
  const systemTabs = tabs.filter(t => !validTabs.includes(t));

  let groups = [];

  if (validTabs.length > 0) {
    groups = await askAI({ tabs: validTabs, provider, baseUrl, apiKey, model, adapter: cfg.adapter });
  }

  // Add system/untitled tabs to "Other"
  if (systemTabs.length > 0) {
    groups.push({ name: 'Other', tabIds: systemTabs.map(t => t.id) });
  }

  // Apply Chrome Tab Groups
  const windowId = (await chrome.windows.getCurrent()).id;
  const result = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const validIds = group.tabIds.filter(id => tabs.some(t => t.id === id));
    if (validIds.length === 0) continue;

    try {
      const groupId = await chrome.tabs.group({ tabIds: validIds, createProperties: { windowId } });
      await chrome.tabGroups.update(groupId, {
        title: group.name,
        color: CHROME_COLORS[i % CHROME_COLORS.length],
      });
      result.push({ name: group.name, tabIds: validIds, color: CHROME_COLORS[i % CHROME_COLORS.length] });
    } catch (e) {
      console.warn('Group error:', e);
    }
  }

  return { groups: result };
}

// ─── AI call dispatcher ──────────────────────────────────────────────────────
async function askAI({ tabs, provider, baseUrl, apiKey, model, adapter }) {
  const prompt = buildPrompt(tabs);

  let text;
  if (adapter === 'anthropic') {
    text = await callAnthropic(baseUrl, apiKey, model, prompt);
  } else if (adapter === 'gemini') {
    text = await callGemini(baseUrl, apiKey, model, prompt);
  } else {
    text = await callOpenAI(baseUrl, apiKey, model, prompt);
  }

  return parseGroups(text, tabs);
}

// ─── Prompt builder ───────────────────────────────────────────────────────
function buildPrompt(tabs) {
  const list = tabs.map(t => `[${t.id}] ${t.title} | ${t.url}`).join('\n');
  return `Group these browser tabs into 2-7 logical categories by topic.

Tabs:
${list}

Rules:
- Every tab ID must appear in exactly one group
- Group names: short (1-3 words), match language of majority of tabs
- Good names: Work, Shopping, Research, Social, News, YouTube, Dev, Finance, etc.

Respond ONLY with valid JSON array, no markdown, no explanation:
[{"name":"Work","tabIds":[1,2,3]},{"name":"Shopping","tabIds":[4]}]`;
}

// ─── Adapters ─────────────────────────────────────────────────────────
async function callAnthropic(baseUrl, apiKey, model, prompt) {
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  }).catch(e => {
    throw new Error(`Network error: ${e.message}`);
  });
  
  if (!res.ok) throw new Error(await extractError(res, 'anthropic'));
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callOpenAI(baseUrl, apiKey, model, prompt) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  }).catch(e => {
    throw new Error(`Network error: ${e.message}`);
  });
  
  if (!res.ok) throw new Error(await extractError(res, 'openai'));
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── FIX: Gemini API key in header, not URL ───────────────────────────────
async function callGemini(baseUrl, apiKey, model, prompt) {
  const url = `${baseUrl}/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,  // FIXED: Key in header, not URL
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  }).catch(e => {
    throw new Error(`Network error: ${e.message}`);
  });
  
  if (!res.ok) throw new Error(await extractError(res, 'gemini'));
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function extractError(res, type) {
  try {
    const d = await res.json();
    return d?.error?.message || d?.message || `${type} API error ${res.status}`;
  } catch {
    return `${type} API error ${res.status}`;
  }
}

// ─── JSON parser with improved error handling ────────────────────────────────
function parseGroups(text, tabs) {
  if (!text || typeof text !== 'string') {
    throw new Error('AI returned empty or invalid response');
  }

  // Attempt 1: Clean markdown code blocks
  let clean = text.replace(/```json|```/g, '').trim();
  let match = clean.match(/\[[\s\S]*\]/);
  
  // Attempt 2: If first attempt failed, try more flexible parsing
  if (!match) {
    const lines = clean.split('\n').filter(l => l.includes('{') || l.includes('['));
    clean = lines.join('');
    match = clean.match(/\[[\s\S]*\]/);
  }

  if (!match) {
    throw new Error('AI returned invalid JSON format. Please try again.');
  }

  let groups;
  try {
    groups = JSON.parse(match[0]);
  } catch (e) {
    throw new Error(`Failed to parse AI response: ${e.message}`);
  }

  if (!Array.isArray(groups)) {
    throw new Error('AI response must be a JSON array');
  }

  // Validate: ensure all tab IDs are valid numbers
  const validTabIds = new Set(tabs.map(t => t.id));
  const validated = groups
    .filter(g => g.name && Array.isArray(g.tabIds) && g.tabIds.length > 0)
    .map(g => ({ ...g, tabIds: g.tabIds.filter(id => validTabIds.has(Number(id))).map(Number) }))
    .filter(g => g.tabIds.length > 0);

  if (validated.length === 0) {
    throw new Error('No valid groups were created from AI response');
  }

  return validated;
}
