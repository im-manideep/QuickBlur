# Privacy Policy for QuickBlur

**Last Updated: January 2025**

## Overview

QuickBlur is committed to protecting your privacy. This privacy policy explains how QuickBlur handles your information.

## Data Collection

**QuickBlur collects ZERO data.**

We do not:
- ❌ Collect any personal information
- ❌ Track your browsing activity
- ❌ Store any data on our servers
- ❌ Use analytics or tracking tools
- ❌ Send any information to third parties
- ❌ Require user accounts or authentication

## How QuickBlur Works

QuickBlur operates entirely within your browser:

1. **Local Processing**: All text scanning and pattern detection happens locally on your device
2. **No External Requests**: The extension makes zero network requests
3. **No Data Storage**: Nothing is saved beyond your browser session
4. **No Backend**: We don't have any servers or databases

## Permissions Used

QuickBlur requests the following Chrome permissions:

### `activeTab`
**Why**: To scan and blur text on the current webpage you're viewing  
**What we do**: Read page content to detect sensitive patterns  
**What we don't do**: Access pages you're not actively using

### `scripting`
**Why**: To inject our blur functionality into web pages  
**What we do**: Add detection and blur features to pages  
**What we don't do**: Execute malicious code or track behavior

### `storage`
**Why**: To remember your preferences (like which detection types are enabled)  
**What we do**: Store settings locally in your browser  
**What we don't do**: Send this data anywhere or access it from other devices

### `host_permissions: <all_urls>`
**Why**: To work on any website you choose to use it on  
**What we do**: Allow you to blur sensitive data on any site  
**What we don't do**: Automatically access all your browsing

## Your Data

- **Sensitive Information**: The text patterns QuickBlur detects (emails, API keys, etc.) are never transmitted, stored, or logged
- **Preferences**: Your toggle settings are stored locally using Chrome's storage API
- **Complete Privacy**: Since we have no backend, there's literally nowhere for your data to go

## Third-Party Services

QuickBlur does not use any third-party services, analytics, or tracking tools.

## Changes to This Policy

If we ever change how QuickBlur handles data, we will:
1. Update this policy
2. Update the "Last Updated" date
3. Notify users through the Chrome Web Store

## Open Source

QuickBlur is open source. You can audit the code yourself:  
https://github.com/im-manideep/QuickBlur

## Contact

Questions about privacy?  
- GitHub Issues: https://github.com/im-manideep/QuickBlur/issues

## Your Rights

Since we collect no data, there is no data to:
- Request access to
- Request deletion of
- Request correction of
- Port to another service

You maintain complete control and privacy at all times.

---

**TL;DR**: QuickBlur sees the text on pages you're actively using, processes it locally to find sensitive patterns, and blurs them. Nothing leaves your browser. Ever.
