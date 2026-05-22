// ─── Provider config (UI side) ────────────────────────────────────────────────
const PROVIDERS = {
  claude:     { name:'Claude',      icon:'◆', model:'claude-opus-4-5',           hint:'sk-ant-api03-...', custom:false },
  openai:     { name:'ChatGPT',     icon:'○', model:'gpt-4o-mini',               hint:'sk-...',           custom:false },
  deepseek:   { name:'DeepSeek',    icon:'≋', model:'deepseek-chat',             hint:'sk-...',           custom:false },
  groq:       { name:'Groq',        icon:'⚡', model:'llama-3.3-70b-versatile',   hint:'gsk_...',          custom:false },
  gemini:     { name:'Gemini',      icon:'✦', model:'gemini-2.0-flash',          hint:'AIza...',          custom:false },
  mistral:    { name:'Mistral',     icon:'〜', model:'mistral-small-latest',      hint:'...',              custom:false },
  openrouter: { name:'OpenRouter',  icon:'⊕', model:'openai/gpt-4o-mini',        hint:'sk-or-...',        custom:false },
  grok:       { name:'Grok',        icon:'✗', model:'grok-3-mini',               hint:'xai-...',          custom:false },
  qwen:       { name:'Qwen',        icon:'❋', model:'qwen-turbo',                hint:'sk-...',           custom:false },
  kimi:       { name:'Kimi',        icon:'◑', model:'moonshot-v1-8k',            hint:'sk-...',           custom:false },
  together:   { name:'Together',    icon:'⊗', model:'meta-llama/Llama-3-8b-chat-hf', hint:'...',         custom:false },
  perplexity: { name:'Perplexity',  icon:'⊘', model:'llama-3.1-sonar-small-128k-online', hint:'pplx-...', custom:false },
  custom:     { name:'Custom',      icon:'⚙', model:'',                          hint:'API key',          custom:true  },
};

const COLORS = ['blue','red','yellow','green','pink','purple','cyan','orange','grey'];

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
  selectedProvider: 'claude',
  apiKeys: {},
  models: {},
  autoGroup: false,
  autoThreshold: 10,
  customUrl: '',
};

// ─── Elements ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const providerGrid  = $('providerGrid');
const apiKeyInput   = $('apiKey');
const modelInput    = $('model');
const customSection = $('customSection');
const customUrlInput= $('customUrl');
const autoToggle    = $('autoToggle');
const thresholdRow  = $('thresholdRow');
const thresholdInp  = $('threshold');
const groupBtn      = $('groupBtn');
const ungroupBtn    = $('ungroupBtn');
const statusEl      = $('status');
const chipsEl       = $('chips');
const tabPill       = $('tabPill');
const eyeBtn        = $('eyeBtn');

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  // Load saved state
  const saved = await chrome.storage.local.get(Object.keys(state));
  Object.assign(state, saved);

  // Render provider buttons
  buildProviderGrid();
  selectProvider(state.selectedProvider, false);

  // Auto-group toggle
  autoToggle.checked = state.autoGroup;
  thresholdRow.classList.toggle('show', state.autoGroup);
  thresholdInp.value = state.autoThreshold;

  // Custom URL
  customUrlInput.value = state.customUrl;

  // Tab count
  chrome.tabs.query({ currentWindow: true }, tabs => {
    tabPill.textContent = `${tabs.length} tabs`;
  });
}

// ─── Provider grid builder ────────────────────────────────────────────────────
function buildProviderGrid() {
  providerGrid.innerHTML = '';
  Object.entries(PROVIDERS).forEach(([id, cfg]) => {
    const btn = document.createElement('button');
    btn.className = 'pvd-btn';
    btn.dataset.id = id;
    btn.innerHTML = `<span class="pvd-icon">${cfg.icon}</span><span>${cfg.name}</span>`;
    btn.addEventListener('click', () => selectProvider(id, true));
    providerGrid.appendChild(btn);
  });
}

function selectProvider(id, save = true) {
  // Save current key for previous provider
  if (save) {
    state.apiKeys[state.selectedProvider] = apiKeyInput.value.trim();
    state.models[state.selectedProvider]  = modelInput.value.trim();
  }

  state.selectedProvider = id;
  const cfg = PROVIDERS[id];

  // Update active button
  providerGrid.querySelectorAll('.pvd-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id));

  // Load saved key for this provider
  apiKeyInput.value   = state.apiKeys[id] ?? '';
  apiKeyInput.placeholder = cfg.hint;

  // Load saved or default model
  modelInput.value    = state.models[id] ?? cfg.model;

  // Show/hide custom URL
  const isCustom = cfg.custom;
  customSection.classList.toggle('show', isCustom);

  if (save) saveState();
}

// ─── Events ───────────────────────────────────────────────────────────────────
apiKeyInput.addEventListener('input', () => {
  state.apiKeys[state.selectedProvider] = apiKeyInput.value.trim();
  saveState();
});

modelInput.addEventListener('input', () => {
  state.models[state.selectedProvider] = modelInput.value.trim();
  saveState();
});

customUrlInput.addEventListener('input', () => {
  state.customUrl = customUrlInput.value.trim();
  saveState();
});

autoToggle.addEventListener('change', () => {
  state.autoGroup = autoToggle.checked;
  thresholdRow.classList.toggle('show', state.autoGroup);
  saveState();
});

thresholdInp.addEventListener('input', () => {
  state.autoThreshold = parseInt(thresholdInp.value) || 10;
  saveState();
});

eyeBtn.addEventListener('click', () => {
  const isPass = apiKeyInput.type === 'password';
  apiKeyInput.type = isPass ? 'text' : 'password';
  eyeBtn.textContent = isPass ? '🙈' : '👁';
});

// ─── Group button ─────────────────────────────────────────────────────────────
groupBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) { showStatus('Вставь API ключ выше', 'error'); return; }

  const model = modelInput.value.trim();
  if (!model) { showStatus('Укажи модель', 'error'); return; }

  if (state.selectedProvider === 'custom' && !customUrlInput.value.trim()) {
    showStatus('Укажи Base URL', 'error'); return;
  }

  setLoading(true);
  showStatus('<span class="spin"></span> Думаю...', '');
  chipsEl.innerHTML = '';

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const res = await chrome.runtime.sendMessage({
      action: 'groupTabs',
      tabs: tabs.map(t => ({ id: t.id, title: t.title || '', url: t.url || '' })),
      provider: state.selectedProvider,
      apiKey,
      model,
      customUrl: state.customUrl,
    });

    if (res.error) throw new Error(res.error);
    renderChips(res.groups);
    showStatus(`✓ Создано групп: ${res.groups.length}`, 'ok');

    // Update tab count
    tabPill.textContent = `${tabs.length} tabs`;

  } catch (e) {
    showStatus(e.message || 'Ошибка', 'error');
  } finally {
    setLoading(false);
  }
});

// ─── Ungroup ──────────────────────────────────────────────────────────────────
ungroupBtn.addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  // Ungroup all tabs
  const ids = tabs.map(t => t.id);
  try { await chrome.tabs.ungroup(ids); } catch (_) {}
  chipsEl.innerHTML = '';
  showStatus('Группы удалены', '');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setLoading(on) {
  groupBtn.disabled = on;
  $('btnSpinner').style.display = on ? 'inline' : 'none';
  $('btnText').textContent = on ? 'Группирую...' : '✦ Group my tabs';
}

function showStatus(html, type) {
  statusEl.innerHTML = html;
  statusEl.className = 'status' + (type ? ` ${type}` : '');
}

function renderChips(groups) {
  chipsEl.innerHTML = groups.map((g, i) => {
    const c = COLORS[i % COLORS.length];
    return `<span class="chip chip-${c}"><span class="chip-dot dot-${c}"></span>${g.name} (${g.tabIds.length})</span>`;
  }).join('');
}

function saveState() {
  chrome.storage.local.set({
    selectedProvider: state.selectedProvider,
    apiKeys: state.apiKeys,
    models: state.models,
    autoGroup: state.autoGroup,
    autoThreshold: state.autoThreshold,
    customUrl: state.customUrl,
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────────
init();
