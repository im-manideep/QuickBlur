// QuickBlur Popup Script - CORRECTED VERSION
const blurAllBtn = document.getElementById('blurAll');
const unblurAllBtn = document.getElementById('unblurAll');
const rescanBtn = document.getElementById('rescanBtn');
const detectedSpan = document.getElementById('detected');  // FIXED: correct ID
const blurredSpan = document.getElementById('blurred');    // FIXED: correct ID
const statusMsg = document.getElementById('status');

// Detection type checkboxes
const detectEmails = document.getElementById('detect-emails');
const detectApiKeys = document.getElementById('detect-apikeys');
const detectCards = document.getElementById('detect-cards');
const detectPhones = document.getElementById('detect-phones');

function showStatus(message, type = 'info') {
  statusMsg.textContent = message;
  statusMsg.className = `status-msg show ${type}`;
  setTimeout(() => {
    statusMsg.classList.remove('show');
  }, 3000);
}

async function isContentScriptReady() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab.url.startsWith('chrome://') || 
      tab.url.startsWith('edge://') || 
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:')) {
    return { ready: false, reason: 'restricted' };
  }
  
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          setTimeout(() => resolve({ ready: true }), 500);
        }).catch(() => {
          resolve({ ready: false, reason: 'injection_failed' });
        });
      } else {
        resolve({ ready: true });
      }
    });
  });
}

async function updateStats() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const ready = await isContentScriptReady();
  
  if (!ready.ready) {
    if (ready.reason === 'restricted') {
      showStatus('Cannot run on this page', 'error');
    }
    detectedSpan.textContent = '0';
    blurredSpan.textContent = '0';
    return;
  }
  
  chrome.tabs.sendMessage(tab.id, { action: 'getStats' }, (response) => {
    if (chrome.runtime.lastError) {
      detectedSpan.textContent = '0';
      blurredSpan.textContent = '0';
      return;
    }
    
    if (response) {
      detectedSpan.textContent = response.detected || 0;
      blurredSpan.textContent = response.blurred || 0;
      
      if (response.blurred > 0) {
        showStatus(`${response.blurred} items protected`, 'success');
      }
    }
  });
}

// Get enabled detection types based on checkboxes
function getEnabledTypes() {
  const types = [];
  if (detectEmails.checked) types.push('email');
  if (detectApiKeys.checked) types.push('apiKey');
  if (detectCards.checked) types.push('creditCard');
  if (detectPhones.checked) types.push('phone');
  // Always include these critical types
  types.push('ssn', 'jwt', 'password', 'ipAddress');
  return types;
}

blurAllBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const ready = await isContentScriptReady();
  
  if (!ready.ready) {
    showStatus('Cannot blur on this page', 'error');
    return;
  }
  
  blurAllBtn.disabled = true;
  const originalText = blurAllBtn.innerHTML;
  blurAllBtn.innerHTML = '<span>Blurring...</span>';
  
  const enabledTypes = getEnabledTypes();
  
  chrome.tabs.sendMessage(tab.id, { action: 'blurAll', enabledTypes }, () => {
    window.close(); // Auto-close popup
  });
});

unblurAllBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const ready = await isContentScriptReady();
  
  if (!ready.ready) {
    showStatus('Cannot access this page', 'error');
    return;
  }
  
  unblurAllBtn.disabled = true;
  const originalText = unblurAllBtn.innerHTML;
  unblurAllBtn.innerHTML = '<span>Unblurring...</span>';
  
  chrome.tabs.sendMessage(tab.id, { action: 'unblurAll' }, () => {
    unblurAllBtn.disabled = false;
    unblurAllBtn.innerHTML = originalText;
    setTimeout(updateStats, 200);
  });
});

rescanBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const ready = await isContentScriptReady();
  
  if (!ready.ready) {
    showStatus('Cannot scan this page', 'error');
    return;
  }
  
  rescanBtn.disabled = true;
  const originalText = rescanBtn.textContent;
  rescanBtn.textContent = '🔄 Scanning...';
  
  chrome.tabs.sendMessage(tab.id, { action: 'rescan' }, () => {
    rescanBtn.disabled = false;
    rescanBtn.textContent = originalText;
    setTimeout(updateStats, 300);
    showStatus('Page rescanned', 'success');
  });
});

// Initial stats update
updateStats();

// Refresh stats every 2 seconds
setInterval(updateStats, 2000);