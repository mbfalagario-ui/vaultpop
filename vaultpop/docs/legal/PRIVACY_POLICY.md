# VaultPop Privacy Policy

Last updated: July 30, 2026
Public URL: https://vaultpop-api.fly.dev/privacy

This policy is generated strictly from the verified source-code audit in
`DATA_PRACTICES_AUDIT.md`. Every collection statement below corresponds to code
that actually performs the collection. Nothing is inferred from SDK capability
alone.

---

## 1. Who this policy covers

This Privacy Policy explains how VaultPop (the "app") and its companion online
service at `vaultpop-api.fly.dev` (the "service") handle information. VaultPop
is an arcade puzzle game for iPhone. In this policy, "we" and "us" refer to the
operator of VaultPop.

**Summary at a glance**

- Core gameplay works fully offline and requires no account.
- Game progress, scores, settings, Vault Coins, and boosters are stored only on
  your device.
- An optional free account links an email address to the service for sign-in,
  inventory sync, and support history.
- Apple processes all payments. We never see your payment card details.
- Google AdMob serves ads and processes advertising data under Google's own
  disclosures. Personalized ads run only with your App Tracking Transparency
  permission and, where required, your consent.
- We do not sell personal data. The app contains no analytics SDK and no
  first-party crash-reporting SDK.

## 2. Information stored only on your device

The following never leaves your device through VaultPop's own service:

- Gameplay progress: scores, rounds, streaks, and game history.
- Settings and preferences.
- Vault Coins, boosters, and other virtual items in your local inventory.
  These are fictional in-game items with no real-world monetary value.
- Advertising diagnostics shown on the owner debug card (in-memory only,
  cleared when the app restarts).
- Your App Tracking Transparency permission state (managed by iOS).
- Your AdMob consent state (stored on the device by Google's UMP SDK).

Deleting the app removes this on-device data.

## 3. Information we collect on our service

We collect the following only when you use the related feature:

**Optional account (only if you sign up)**
- Email address — used for sign-in, recovery, and your account role.
- Password — stored only as a salted cryptographic hash (scrypt); never in
  plain text.
- Session tokens — stored hashed; sessions expire automatically after 24 hours.
- An account ID (random UUID) and the install ID linked to your account.

**Install ID**
- An app-generated random identifier. It is NOT the Apple advertising
  identifier (IDFA) and NOT the vendor identifier (IDFV). It links your
  inventory, verified purchases, rewarded-ad reward events, and support
  requests to your install without requiring an account.

**Purchase records**
- When a purchase is verified we record the Apple transaction ID, product ID,
  your install ID, and a timestamp. This is used for purchase verification,
  restoring purchases, and preventing duplicate grants. We receive signed
  transaction data FROM Apple; we never receive your payment card details.
- Your VaultPass entitlement expiry date is stored to gate benefits and
  suppress ads while active.

**Leaderboards**
- Game mode, your chosen display handle, your best score, your install ID, and
  a timestamp. Your handle and score are displayed publicly in-app. Entries
  are pseudonymous.

**Rewarded-ad reward events**
- When Google confirms a rewarded ad via its server-side verification
  callback, we record your install ID, whether the reward was granted or
  failed, the reward type, and a timestamp. Used solely for reward crediting
  and fraud prevention. This data originates from Google's callback.

**Support requests (only if you submit one)**
- The category you choose, your message, an optional email address if you
  provide one, your app version, build number, device model, install ID, and a
  priority-routing flag for VaultPass members.

**Password-reset requests**
- The email address you submit, kept until the request is processed.

## 4. Advertising (Google AdMob)

VaultPop shows ads through Google AdMob. Google's SDK may process device
identifiers, coarse (IP-derived) location, ad interaction data, and
performance, crash, and diagnostic data as described in Google's own
disclosures:

- Google Privacy Policy: https://policies.google.com/privacy
- AdMob iOS data disclosure: https://developers.google.com/admob/ios/privacy

Key facts verified in our source code:

- The Apple advertising identifier (IDFA) is accessed by the Google SDK only
  after you grant the App Tracking Transparency permission. If you decline,
  ads are non-personalized.
- In regions that require it, Google's UMP consent flow is shown before ads
  and your choice is respected.
- VaultPop's own servers never receive the IDFA.
- Rewarded ads are optional, capped at 30 per day, and never required to play.

You can change the tracking permission at any time in
iOS Settings → Privacy & Security → Tracking.

## 5. Purchases (Apple)

All purchases and subscriptions are processed by Apple through the App Store.
Apple handles your payment information under Apple's own privacy policy. Our
service only receives Apple's signed transaction data to verify purchases.

## 6. What we do NOT do

- We do not sell personal data.
- We do not use your data for our own tracking or cross-app advertising.
- The app contains no analytics SDK and no first-party crash-reporting SDK.
- We do not request access to your contacts, photos, camera, microphone,
  precise location, health data, or browsing history.
- Vault Coins, boosters, scores, and rewards are fictional in-game items with
  no cash value; there is no real currency, gambling, or cash-out of any kind.

## 7. Server logs and hosting

Our backend writes transient request logs containing only the HTTP method,
path, parameter names (never values), response status, and duration. No IP
addresses, tokens, or query values are stored in the app's database; these
logs go to ephemeral process output. The service is hosted on Fly.io
(Toronto, Canada region), which processes IP addresses transiently for network
routing and security as our hosting provider.

## 8. Data retention and deletion

- Sessions expire automatically after 24 hours.
- Account, purchase, leaderboard, reward, and support records are kept while
  the account or record remains relevant; no other automated retention
  schedule currently runs.
- **You can permanently delete your account inside the app**: Settings →
  Account → Delete Account. Deletion removes your email address, sign-in
  credentials, all sessions, the account-to-install link, server-side
  inventory grants, leaderboard entries (handle and scores), your support
  tickets, and pending password-reset requests. Verified purchase records are
  retained in de-identified form (detached from your install) for
  duplicate-grant fraud prevention and financial record-keeping; rewarded-ad
  verification records are de-identified the same way.
- Deleting your VaultPop account does **not** cancel an Apple subscription.
  Manage or cancel VaultPass Plus in your Apple account settings
  (Settings → Apple ID → Subscriptions).
- You can also request access to, or deletion of, your data through the
  in-app Support screen (choose the "Privacy request" category) or by
  emailing support@vaultpop.app.

## 9. Your choices

- Play without an account — sign-in is optional.
- Permanently delete your account at any time from inside the app.
- Decline App Tracking Transparency — you still get ads, just
  non-personalized.
- Change or withdraw regional ad consent via the ad consent flow.
- Submit a privacy request in-app or by email at any time.

## 10. Children

VaultPop does not knowingly collect personal information from children. The
app requires no account, and an email address is collected only when
voluntarily provided.

## 11. Security

Passwords are stored as salted scrypt hashes, session tokens are stored
hashed, and all connections to the service are forced to HTTPS. No method of
transmission or storage is perfectly secure, and we cannot guarantee absolute
security.

## 12. Changes to this policy

If this policy changes, the updated version will be published at
https://vaultpop-api.fly.dev/privacy with a new "Last updated" date.

## 13. Contact

- In-app: Settings → Support (choose "Privacy request")
- Email: support@vaultpop.app

---

## OWNER CONFIRMATION REQUIRED (internal notes — not shown on the public page)

1. **Legal entity, business address, and governing jurisdiction** — no entity
   exists in source. The public page uses neutral operator wording ("the
   operator of VaultPop"). Add your entity/address once confirmed.
2. **support@vaultpop.app mailbox** — confirm this mailbox is live and
   monitored; it is referenced throughout the app and site.
3. ~~Apple Guideline 5.1.1(v)~~ **RESOLVED (Build 18)**: in-app self-service
   account deletion now exists (Settings → Account → Delete Account,
   `POST /v1/account/delete`). See
   `docs/legal/ACCOUNT_DELETION_IMPLEMENTATION.md`.
