# Google AdMob — Privacy & GDPR Consent Setup Guide for VaultPop

Last updated: July 30, 2026
Audience: the VaultPop owner. This guide walks you through the AdMob console
"Privacy & messaging" setup. **Nothing is published on your behalf — you
create and publish the consent message yourself.**

What the app already does (verified in source, `src/ads/ad-service.ts`):

- Calls Google UMP `AdsConsent.gatherConsent()` before ads initialize, so the
  GDPR message you publish in the console is displayed automatically to users
  in the EEA/UK/Switzerland.
- Gates the App Tracking Transparency (ATT) prompt before any personalized
  advertising on iOS; declined ATT → non-personalized ads.
- Caps rewarded ads at 30/day; rewards are credited only via Google's
  server-side verification (SSV) callback.

You only need to configure the console side. Until a GDPR message is
published, EEA/UK users may receive limited or no ads.

---

## Part A — Publish the GDPR (EU/UK) consent message

1. Sign in at https://apps.admob.com
2. Left sidebar → **Privacy & messaging**.
3. Open **GDPR** (called "European regulations" in some console versions) →
   **Create message** (or **Manage** → edit an existing one).
4. **Select apps**: choose **VaultPop (iOS)**.
5. **Privacy policy URL**: enter `https://vaultpop-api.fly.dev/privacy`
6. **User consent options**: Google requires "Consent" and "Manage options";
   adding the "Do not consent" button is your choice.
   **OWNER CONFIRMATION REQUIRED** — a visible "Do not consent" option is the
   more user-friendly configuration; pick per your preference.
7. **Ad partners**: keep Google's "commonly used ad partners" list unless you
   have a specific reason to customize.
   **UNVERIFIED — OWNER CONFIRMATION REQUIRED**: the exact partner list is an
   account-level choice only you can see.
8. **Styling**: defaults are fine; optionally match VaultPop's dark theme.
9. Click **Publish**. The app needs no update — the UMP SDK fetches the
   published message automatically.

## Part B — (Recommended) IDFA / ATT explainer message

1. Privacy & messaging → **IDFA** → **Create message**.
2. Select **VaultPop (iOS)**, write a short benefit-focused explainer (e.g.
   "Ads keep VaultPop free. Allow tracking for more relevant ads."), publish.
3. This shows Google's pre-ATT explainer before the iOS system prompt. The
   system ATT prompt itself is already handled by the app.

## Part C — (Optional) US state regulations message

1. Privacy & messaging → **US state regulations** → create and publish a
   message for VaultPop (iOS) if you want CCPA/CPRA-style opt-outs handled by
   Google. **OWNER CONFIRMATION REQUIRED** — business decision.

## Part D — App-level settings to verify in the console

1. **Apps → VaultPop → App settings**: confirm the app store listing link is
   attached once the app is live (improves fill; not possible pre-release).
2. **app-ads.txt**: after the App Store listing is public, add the
   `app-ads.txt` entry Google shows you to the domain that hosts your
   developer website. **UNVERIFIED — OWNER CONFIRMATION REQUIRED**: depends on
   which marketing domain you attach to the listing.
3. **Child-directed settings** (Settings → Account/App level): VaultPop's code
   does not tag requests as child-directed. If you declare the app as directed
   at children anywhere, the AdMob configuration and the app code must both
   change. **OWNER CONFIRMATION REQUIRED**: confirm VaultPop's intended
   audience declaration is "not primarily child-directed".

## Part E — Verify it works

1. After publishing the GDPR message, run the app with an EEA test device or
   set your test device's debug geography to EEA (Google UMP debug settings) —
   the consent form should appear on first launch before ads.
2. Confirm ads still load after each consent choice ("Consent" → personalized
   where ATT is also granted; "Do not consent"/limited → non-personalized or
   limited ads).

## Honest expectations

- Publishing consent messages correctly does **not** guarantee ad fill or
  revenue; fill depends on Google's marketplace.
- Nothing here guarantees Apple App Review approval.
