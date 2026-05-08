// Element references — IDs match popup.html
const blurAllBtn   = document.getElementById('blurAll');
const unblurAllBtn = document.getElementById('unblurAll');
const rescanBtn    = document.getElementById('rescanBtn');
const detectedEl   = document.getElementById('detected');
const blurredEl    = document.getElementById('blurred');
const statusEl     = document.getElementById('status');

// Checkbox references
const cbEmails  = document.getElementById('detect-emails');
const cbApiKeys = document.getElementById('detect-apikeys');
const cbCards   = document.getElementById('detect-cards');
const cbPhones  = document.getElementById('detect-phones');

// Preserve SVG icons — setting textContent nukes them
const blurAllHTML   = blurAllBtn.innerHTML;
const unblurAllHTML = unblurAllBtn.innerHTML;
const rescanHTML    = rescanBtn.innerHTML;

let statusTimer = null;

// ── Helpers ───────────────────────────────────────────────────────────────

function showStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.className = `status-msg show ${type}`;
  clearTimeout(statusTimer);
}

function hideStatus() {
  statusEl.className = 'status-msg';
  statusEl.textContent = '';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// Returns { ready: true } or { ready: false, reason }
// Accepts the tab object so callers don't query twice
async function isContentScriptReady(tab) {
  if (!tab || !tab.url) return { ready: false, reason: 'no_tab' };

  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('data:')
  ) {
    return { ready: false, reason: 'restricted' };
  }

  // Fastest path — ping the already-running content script
  const alive = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
      resolve(!chrome.runtime.lastError && !!response);
    });
  });
  if (alive) return { ready: true };

  // Not present — inject JS + CSS programmatically
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    await new Promise((r) => setTimeout(r, 500));
    return { ready: true };
  } catch {
    return { ready: false, reason: 'injection_failed' };
  }
}

// Returns the data-type values that should be blurred based on checkbox state
// SSN, JWT, password, ipAddress are always included (critical / no toggle)
function getEnabledTypes() {
  const types = ['ssn', 'jwt', 'password', 'ipAddress'];
  if (cbEmails.checked)  types.push('email');
  if (cbApiKeys.checked) types.push('apiKey');
  if (cbCards.checked)   types.push('creditCard');
  if (cbPhones.checked)  types.push('phone');
  return types;
}

// ── Checkbox persistence ─────────────────────────────────────────────────

function saveCheckboxStates() {
  chrome.storage.local.set({
    qbDetectEmail:  cbEmails.checked,
    qbDetectApiKey: cbApiKeys.checked,
    qbDetectCard:   cbCards.checked,
    qbDetectPhone:  cbPhones.checked,
  });
}

chrome.storage.local.get(
  ['qbDetectEmail', 'qbDetectApiKey', 'qbDetectCard', 'qbDetectPhone'],
  (data) => {
    // Default true if key not yet set
    cbEmails.checked  = data.qbDetectEmail  !== false;
    cbApiKeys.checked = data.qbDetectApiKey !== false;
    cbCards.checked   = data.qbDetectCard   !== false;
    cbPhones.checked  = data.qbDetectPhone  !== false;
  }
);

[cbEmails, cbApiKeys, cbCards, cbPhones].forEach((cb) => {
  cb.addEventListener('change', saveCheckboxStates);
});

// ── Stats ─────────────────────────────────────────────────────────────────

async function updateStats() {
  const tab   = await getActiveTab();
  const state = await isContentScriptReady(tab);

  if (!state.ready) {
    detectedEl.textContent = '—';
    blurredEl.textContent  = '—';
    if (state.reason === 'restricted') showStatus('Cannot run on this page', 'error');
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: 'getStats' }, (response) => {
    if (chrome.runtime.lastError || !response) return;

    const detected = response.detected ?? 0;
    const blurred  = response.blurred  ?? 0;

    detectedEl.textContent = detected;
    blurredEl.textContent  = blurred;

    if (blurred > 0) {
      showStatus(`${blurred} item${blurred === 1 ? '' : 's'} blurred`, 'success');
    } else if (detected > 0) {
      showStatus('Items found — click Blur Everything', 'info');
    } else {
      hideStatus();
    }
  });
}

// ── Button handlers ──────────────────────────────────────────────────────

blurAllBtn.addEventListener('click', async () => {
  const tab   = await getActiveTab();
  const state = await isContentScriptReady(tab);

  if (!state.ready) {
    showStatus(
      state.reason === 'restricted' ? 'Cannot blur on this page' : 'Could not load on this page',
      'error'
    );
    return;
  }

  blurAllBtn.disabled   = true;
  blurAllBtn.textContent = 'Blurring…';

  chrome.tabs.sendMessage(tab.id, { action: 'blurAll', enabledTypes: getEnabledTypes() }, () => {
    // Auto-close so the user sees the blurred page immediately.
    // Restore markup first in case window.close() is delayed.
    blurAllBtn.innerHTML = blurAllHTML;
    blurAllBtn.disabled  = false;
    window.close();
  });
});

unblurAllBtn.addEventListener('click', async () => {
  const tab   = await getActiveTab();
  const state = await isContentScriptReady(tab);

  if (!state.ready) {
    showStatus('Cannot access this page', 'error');
    return;
  }

  unblurAllBtn.disabled   = true;
  unblurAllBtn.textContent = 'Unblurring…';

  chrome.tabs.sendMessage(tab.id, { action: 'unblurAll' }, () => {
    unblurAllBtn.innerHTML = unblurAllHTML;
    unblurAllBtn.disabled  = false;
    setTimeout(updateStats, 200);
  });
});

rescanBtn.addEventListener('click', async () => {
  const tab   = await getActiveTab();
  const state = await isContentScriptReady(tab);

  if (!state.ready) {
    showStatus('Cannot scan this page', 'error');
    return;
  }

  rescanBtn.disabled   = true;
  rescanBtn.textContent = 'Scanning…';

  chrome.tabs.sendMessage(tab.id, { action: 'rescan' }, () => {
    rescanBtn.innerHTML = rescanHTML;
    rescanBtn.disabled  = false;
    setTimeout(updateStats, 300);
    showStatus('Page rescanned', 'success');
  });
});

// ── Init ─────────────────────────────────────────────────────────────────

updateStats();
const interval = setInterval(updateStats, 2000);
window.addEventListener('unload', () => clearInterval(interval));
