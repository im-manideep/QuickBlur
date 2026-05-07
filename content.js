(function () {
  'use strict';

  if (window.__quickBlurInitialized) return;
  window.__quickBlurInitialized = true;

  const detectedItems = [];
  let blurModeActive = false;

  // Each entry: { regex, type (data-type on span), name (human label) }
  const PATTERNS = {
    email: {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      type: 'email', name: 'Email Address',
    },
    stripeKey: {
      regex: /\b(?:sk_live_[A-Za-z0-9]{24,}|sk_test_[A-Za-z0-9]{24,}|pk_live_[A-Za-z0-9]{24,}|pk_test_[A-Za-z0-9]{24,})\b/g,
      type: 'apiKey', name: 'Stripe Key',
    },
    awsKey: {
      regex: /\b(?:AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g,
      type: 'apiKey', name: 'AWS Key',
    },
    googleApiKey: {
      regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
      type: 'apiKey', name: 'Google API Key',
    },
    githubToken: {
      regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/g,
      type: 'apiKey', name: 'GitHub Token',
    },
    slackToken: {
      regex: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}\b/g,
      type: 'apiKey', name: 'Slack Token',
    },
    genericApiKey: {
      regex: /\b(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|secret[_-]?key)\s*[=:]\s*["']?[A-Za-z0-9_\-]{20,}["']?/gi,
      type: 'apiKey', name: 'API Key',
    },
    creditCard: {
      regex: /\b(?:\d{4}[\s\-]?){3}\d{1,4}\b/g,
      type: 'creditCard', name: 'Credit Card',
    },
    phone: {
      regex: /\b(?:\+?1[\-.\s]?)?\(?\d{3}\)?[\-.\s]\d{3}[\-.\s]\d{4}\b/g,
      type: 'phone', name: 'Phone Number',
    },
    ipAddress: {
      regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
      type: 'ipAddress', name: 'IP Address',
    },
    ssn: {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      type: 'ssn', name: 'Social Security Number',
    },
    jwt: {
      regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      type: 'jwt', name: 'JWT Token',
    },
    password: {
      regex: /(?:password|passwd|pwd)\s*[=:]\s*["']([^"']{6,})["']/gi,
      type: 'password', name: 'Password',
    },
    privateKey: {
      regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
      type: 'password', name: 'Private Key',
    },
    mongodbUri: {
      regex: /mongodb(?:\+srv)?:\/\/[^\s"'<>]+/g,
      type: 'password', name: 'MongoDB URI',
    },
    postgresUri: {
      regex: /postgres(?:ql)?:\/\/[^\s"'<>]+/g,
      type: 'password', name: 'Postgres URI',
    },
  };

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'TEXTAREA', 'INPUT', 'SELECT',
  ]);

  // ── Floating indicator ────────────────────────────────────────────────────

  function createFloatingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'quickblur-floating-indicator';
    indicator.innerHTML = `
      <div class="quickblur-indicator-content">
        <span class="quickblur-indicator-icon">&#x1F512;</span>
        <span class="quickblur-indicator-text">QuickBlur Active</span>
        <button class="quickblur-indicator-close" title="Turn off blur">&times;</button>
      </div>
    `;
    indicator.addEventListener('click', (e) => {
      if (!e.target.classList.contains('quickblur-indicator-close')) unblurAll();
    });
    indicator.querySelector('.quickblur-indicator-close').addEventListener('click', (e) => {
      e.stopPropagation();
      unblurAll();
    });
    document.body.appendChild(indicator);
    return indicator;
  }

  function updateFloatingIndicator(show) {
    let indicator = document.getElementById('quickblur-floating-indicator');
    if (show) {
      if (!indicator) indicator = createFloatingIndicator();
      indicator.style.display = 'flex';
    } else {
      if (indicator) indicator.style.display = 'none';
    }
  }

  // ── Detection ─────────────────────────────────────────────────────────────

  function findMatches(text) {
    const matches = [];
    for (const { regex, type, name } of Object.values(PATTERNS)) {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(text)) !== null) {
        matches.push({ index: m.index, length: m[0].length, text: m[0], type, name });
      }
    }
    matches.sort((a, b) => a.index - b.index);
    // Remove overlapping matches — keep whichever starts first
    const result = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.index >= lastEnd) {
        result.push(m);
        lastEnd = m.index + m.length;
      }
    }
    return result;
  }

  function processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text || !text.trim()) return;

    const matches = findMatches(text);
    if (matches.length === 0) return;

    const frag = document.createDocumentFragment();
    let pos = 0;

    for (const m of matches) {
      if (m.index > pos) {
        frag.appendChild(document.createTextNode(text.slice(pos, m.index)));
      }

      const span = document.createElement('span');
      span.className = 'quickblur-wrapper';
      span.dataset.type = m.type;
      span.textContent = m.text;
      span.title = `${m.name} — click to toggle blur`;

      if (blurModeActive) span.classList.add('quickblur-active');

      span.addEventListener('click', (e) => {
        e.stopPropagation();
        span.classList.toggle('quickblur-active');
      });

      frag.appendChild(span);
      detectedItems.push(span);
      pos = m.index + m.length;
    }

    if (pos < text.length) {
      frag.appendChild(document.createTextNode(text.slice(pos)));
    }

    textNode.parentNode.replaceChild(frag, textNode);
  }

  function scanPage() {
    if (!document.body) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.quickblur-wrapper')) return NodeFilter.FILTER_REJECT;
          if (parent.closest('#quickblur-floating-indicator')) return NodeFilter.FILTER_REJECT;
          if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processTextNode);
  }

  // ── Blur control ──────────────────────────────────────────────────────────

  // enabledTypes: string[] of data-type values to blur, or omit for all
  function blurAll(enabledTypes) {
    blurModeActive = true;
    scanPage();

    if (!enabledTypes || enabledTypes.length === 0) {
      document.querySelectorAll('.quickblur-wrapper').forEach((el) => {
        el.classList.add('quickblur-active');
      });
    } else {
      enabledTypes.forEach((type) => {
        document.querySelectorAll(`.quickblur-wrapper[data-type="${type}"]`).forEach((el) => {
          el.classList.add('quickblur-active');
        });
      });
    }

    updateFloatingIndicator(true);
  }

  function unblurAll() {
    blurModeActive = false;
    document.querySelectorAll('.quickblur-wrapper.quickblur-active').forEach((el) => {
      el.classList.remove('quickblur-active');
    });
    updateFloatingIndicator(false);
  }

  function toggleBlur() {
    const hasBlurred = document.querySelectorAll('.quickblur-wrapper.quickblur-active').length > 0;
    if (hasBlurred) unblurAll();
    else blurAll();
  }

  function getStats() {
    const byType = {};
    document.querySelectorAll('.quickblur-wrapper').forEach((el) => {
      const t = el.dataset.type || 'other';
      byType[t] = (byType[t] || 0) + 1;
    });
    return {
      detected: document.querySelectorAll('.quickblur-wrapper').length,
      blurred:  document.querySelectorAll('.quickblur-wrapper.quickblur-active').length,
      types:    byType,
    };
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanPage);
  } else {
    scanPage();
  }

  // Debounced MutationObserver — 2 s gives SPAs time to settle before rescanning
  let scanTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanPage();
      if (blurModeActive) {
        document.querySelectorAll('.quickblur-wrapper').forEach((el) => {
          el.classList.add('quickblur-active');
        });
      }
    }, 2000);
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ── Message listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'ping':
        sendResponse({ ready: true });
        break;
      case 'blurAll':
        blurAll(request.enabledTypes);
        sendResponse({ success: true, ...getStats() });
        break;
      case 'unblurAll':
        unblurAll();
        sendResponse({ success: true, ...getStats() });
        break;
      case 'toggleBlur':
        toggleBlur();
        sendResponse({ success: true, ...getStats() });
        break;
      case 'getStats':
        sendResponse(getStats());
        break;
      case 'scan':
      case 'rescan':
        scanPage();
        sendResponse({ success: true, ...getStats() });
        break;
      default:
        sendResponse({ success: false });
    }
    return true;
  });
})();
