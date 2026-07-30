# Apple App Privacy Questionnaire — Completion Guide for VaultPop

Last updated: July 30, 2026
Audience: the VaultPop owner. This guide tells you exactly what to click and
what to answer in App Store Connect. **Nothing is submitted on your behalf —
you complete and publish these answers yourself.**

Every answer below is derived from the verified source audit
(`DATA_PRACTICES_AUDIT.md`) plus Google's published disclosure for the Google
Mobile Ads SDK. Where Google's current matrix must be confirmed against your
own AdMob configuration, the item is marked
**UNVERIFIED — OWNER CONFIRMATION REQUIRED**.

Authoritative Google reference (open it side-by-side while you answer):
https://developers.google.com/admob/ios/data-disclosure

---

## Step 0 — Where to go

1. Sign in at https://appstoreconnect.apple.com
2. Apps → **VaultPop** → left sidebar → **App Privacy**.
3. Set the **Privacy Policy URL** to: `https://vaultpop-api.fly.dev/privacy`
4. Click **Get Started** (or **Edit**) on the data-collection questionnaire.

## Step 1 — "Do you or your third-party partners collect data from this app?"

Answer: **Yes** (required — Google AdMob collects data, and the optional
account/support/leaderboard features collect data).

## Step 2 — Data types to declare

Tick exactly these data types, then configure each per the tables below.

| Apple data type | Why |
|---|---|
| Contact Info → **Email Address** | Optional account sign-in; optional email on support tickets |
| Identifiers → **User ID** | Account ID + app-generated install ID |
| Identifiers → **Device ID** | Google AdMob advertising identifier (ATT-gated) |
| Purchases → **Purchase History** | Apple transaction verification ledger |
| User Content → **Customer Support** | Support ticket messages |
| User Content → **Gameplay Content** | Leaderboard handle + best score |
| Location → **Coarse Location** | AdMob derives coarse location from IP (per Google's disclosure) |
| Usage Data → **Product Interaction** | AdMob ad-interaction data (per Google's disclosure) |
| Usage Data → **Advertising Data** | AdMob ad data (per Google's disclosure) |
| Diagnostics → **Crash Data** | AdMob SDK diagnostics (per Google's disclosure) |
| Diagnostics → **Performance Data** | AdMob SDK diagnostics (per Google's disclosure) |
| Diagnostics → **Other Diagnostic Data** | AdMob SDK diagnostics (per Google's disclosure) |

Do NOT declare: Health & Fitness, Financial Info (payment details are Apple's,
never received by VaultPop), Contacts, Photos/Videos, Audio, Browsing History,
Search History, Precise Location, Sensitive Info.

## Step 3 — Per-type answers

For each data type Apple asks three things: purpose(s), whether it is
**linked to the user's identity**, and whether it is **used for tracking**.

### First-party (VaultPop's own collection)

| Data type | Purposes | Linked to user? | Used for tracking? |
|---|---|---|---|
| Email Address | App Functionality | **Yes** | **No** |
| User ID (account ID + install ID) | App Functionality | **Yes** (when signed in) | **No** |
| Purchase History | App Functionality | **Yes** | **No** |
| Customer Support (ticket message + device model/app version attached to it) | App Functionality | **Yes** (linked when an email is provided) | **No** |
| Gameplay Content (leaderboard handle + score) | App Functionality | **No** (pseudonymous handle + random install ID) | **No** |

### Third-party (Google Mobile Ads SDK) — mirror Google's page

**UNVERIFIED — OWNER CONFIRMATION REQUIRED**: confirm against
https://developers.google.com/admob/ios/data-disclosure at the moment you
answer, because Google updates its matrix. The mapping below reflects that
guidance as audited:

| Data type | Purposes | Linked to user? | Used for tracking? |
|---|---|---|---|
| Device ID (advertising identifier) | Third-Party Advertising | No (not linked by VaultPop) | **Yes** (when the user grants ATT) |
| Coarse Location (IP-derived) | Third-Party Advertising | No | No |
| Product Interaction | Third-Party Advertising, App Functionality | No | No |
| Advertising Data | Third-Party Advertising | No | **Yes** (when the user grants ATT) |
| Crash Data | App Functionality | No | No |
| Performance Data | App Functionality | No | No |
| Other Diagnostic Data | App Functionality | No | No |

## Step 4 — Tracking section

- "Is this data used to track users?" → For **Device ID** and **Advertising
  Data**: answer **Yes**. VaultPop shows Apple's App Tracking Transparency
  prompt before any personalized advertising; if the user declines, ads are
  non-personalized and the IDFA is not accessed.
- All first-party data: **No** tracking. VaultPop's own servers never receive
  the IDFA and run no analytics SDK.

## Step 5 — Publish

Review the summary, click **Publish**. The App Privacy label updates on the
App Store listing. **This guide does not publish anything for you.**

---

## Known review-risk items (decide before submitting for review)

1. ~~Account deletion (Guideline 5.1.1(v))~~ **RESOLVED (Build 18)**: VaultPop
   now includes in-app self-service account deletion (Settings → Account →
   Delete Account) with reauthentication and typed confirmation. No App
   Privacy answer changes are required for this feature — it collects no new
   data types (the password check reuses existing credentials).
2. **ATT prompt** — the app requests ATT only when advertising initialization
   requires it. This is compliant; do not also claim "no tracking" in the
   questionnaire (Device ID/Advertising Data must stay "Yes" for tracking).
3. **No guarantee of approval** — completing this questionnaire correctly does
   not guarantee Apple approval; App Review evaluates the whole app.
