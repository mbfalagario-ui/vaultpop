/**
 * Public VaultPop legal pages: GET /privacy and GET /terms.
 * Mobile-responsive static HTML in the same visual language as /support.
 * Content mirrors docs/legal/PRIVACY_POLICY.md and docs/legal/TERMS_OF_USE.md
 * (public-facing portions only). No secrets, no debug output, no env values.
 */

const LEGAL_CSS = `
:root{--bg:#070A12;--panel:#101528;--panel2:#0C1120;--border:#232B45;--text:#F2F5FF;--muted:#9AA6C4;--gold:#F6C65B;--cyan:#36D9FF}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:0 20px 64px}
header{padding:40px 0 4px;text-align:center}
.logo{font-size:36px;font-weight:900;font-style:italic;letter-spacing:-1px}
.logo a{color:inherit;text-decoration:none}
.logo .pop{color:var(--gold)}
h1{font-size:26px;margin-top:26px}
.updated{color:var(--muted);font-size:13px;margin-top:6px}
h2{margin:34px 0 10px;font-size:18px;color:var(--gold)}
p{color:var(--muted);margin-top:10px;font-size:15px}
ul{color:var(--muted);margin:10px 0 0 22px;font-size:15px}
li{margin-bottom:6px}
strong{color:var(--text)}
a{color:var(--cyan);text-decoration:none}
.callout{background:rgba(246,198,91,.08);border:1px solid rgba(246,198,91,.35);border-radius:12px;padding:16px 18px;margin-top:28px;font-size:14px;color:var(--muted)}
.callout strong{color:var(--gold)}
footer{margin-top:48px;text-align:center;color:var(--muted);font-size:13px;border-top:1px solid var(--border);padding-top:22px}
@media(max-width:520px){.logo{font-size:30px}.wrap{padding:0 14px 48px}h1{font-size:22px}}
`;

function legalShell(options: {
  title: string;
  description: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${options.title} — VaultPop</title>
<meta name="description" content="${options.description}">
<style>${LEGAL_CSS}</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo"><a href="/support">VAULT<span class="pop">POP</span></a></div>
  </header>
  ${options.body}
  <footer>
    VaultPop &middot; <a href="/support">Support</a> &middot; <a href="/privacy">Privacy Policy</a> &middot; <a href="/terms">Terms of Use</a> &middot; <a href="mailto:support@vaultpop.app">support@vaultpop.app</a>
  </footer>
</div>
</body>
</html>`;
}

export function renderPrivacyPage(): string {
  return legalShell({
    title: "Privacy Policy",
    description:
      "VaultPop privacy policy: what stays on your device, what the optional account collects, and how Apple and Google AdMob process data.",
    body: `
<h1>Privacy Policy</h1>
<p class="updated">Last updated: July 30, 2026</p>

<h2>1. Who this policy covers</h2>
<p>This Privacy Policy explains how VaultPop (the &ldquo;app&rdquo;) and its companion online service at vaultpop-api.fly.dev (the &ldquo;service&rdquo;) handle information. VaultPop is an arcade puzzle game for iPhone. In this policy, &ldquo;we&rdquo; and &ldquo;us&rdquo; refer to the operator of VaultPop.</p>
<ul>
  <li>Core gameplay works fully offline and requires no account.</li>
  <li>Game progress, scores, settings, Vault Coins, and boosters are stored only on your device.</li>
  <li>An optional free account links an email address to the service for sign-in, inventory sync, and support history.</li>
  <li>Apple processes all payments. We never see your payment card details.</li>
  <li>Google AdMob serves ads and processes advertising data under Google&rsquo;s own disclosures. Personalized ads run only with your App Tracking Transparency permission and, where required, your consent.</li>
  <li>We do not sell personal data. The app contains no analytics SDK and no first-party crash-reporting SDK.</li>
</ul>

<h2>2. Information stored only on your device</h2>
<p>The following never leaves your device through VaultPop&rsquo;s own service:</p>
<ul>
  <li>Gameplay progress: scores, rounds, streaks, and game history.</li>
  <li>Settings and preferences.</li>
  <li>Vault Coins, boosters, and other virtual items in your local inventory. These are fictional in-game items with no real-world monetary value.</li>
  <li>Advertising diagnostics on the owner debug card (in-memory only, cleared when the app restarts).</li>
  <li>Your App Tracking Transparency permission state (managed by iOS).</li>
  <li>Your ad consent state (stored on the device by Google&rsquo;s consent SDK).</li>
</ul>
<p>Deleting the app removes this on-device data.</p>

<h2>3. Information we collect on our service</h2>
<p>We collect the following only when you use the related feature:</p>
<ul>
  <li><strong>Optional account</strong> (only if you sign up): email address; password stored only as a salted cryptographic hash (never plain text); session tokens stored hashed, expiring automatically after 24 hours; a random account ID; and the install ID linked to your account.</li>
  <li><strong>Install ID</strong>: an app-generated random identifier. It is not the Apple advertising identifier (IDFA) and not the vendor identifier. It links your inventory, verified purchases, rewarded-ad reward events, and support requests to your install without requiring an account.</li>
  <li><strong>Purchase records</strong>: Apple transaction ID, product ID, install ID, and timestamp &mdash; used to verify purchases, restore them, and prevent duplicate grants. We receive signed transaction data from Apple; we never receive payment card details. Your VaultPass entitlement expiry is stored to gate benefits and suppress ads while active.</li>
  <li><strong>Leaderboards</strong>: game mode, your chosen display handle, your best score, install ID, and timestamp. Your handle and score are displayed publicly in-app. Entries are pseudonymous.</li>
  <li><strong>Rewarded-ad reward events</strong>: when Google confirms a rewarded ad via its server-side verification callback, we record your install ID, whether the reward was granted or failed, the reward type, and a timestamp &mdash; used solely for reward crediting and fraud prevention.</li>
  <li><strong>Support requests</strong> (only if you submit one): the category you choose, your message, an optional email address, app version, build number, device model, install ID, and a priority-routing flag for VaultPass members.</li>
  <li><strong>Password-reset requests</strong>: the email address you submit, kept until the request is processed.</li>
</ul>

<h2>4. Advertising (Google AdMob)</h2>
<p>VaultPop shows ads through Google AdMob. Google&rsquo;s SDK may process device identifiers, coarse (IP-derived) location, ad interaction data, and performance, crash, and diagnostic data as described in Google&rsquo;s own disclosures: the <a href="https://policies.google.com/privacy" rel="noopener">Google Privacy Policy</a> and the <a href="https://developers.google.com/admob/ios/privacy" rel="noopener">AdMob iOS data disclosure</a>.</p>
<ul>
  <li>The Apple advertising identifier (IDFA) is accessed by the Google SDK only after you grant the App Tracking Transparency permission. If you decline, ads are non-personalized.</li>
  <li>In regions that require it, Google&rsquo;s consent flow is shown before ads and your choice is respected.</li>
  <li>VaultPop&rsquo;s own servers never receive the IDFA.</li>
  <li>Rewarded ads are optional, capped at 30 per day, and never required to play.</li>
</ul>
<p>You can change the tracking permission at any time in iOS Settings &rarr; Privacy &amp; Security &rarr; Tracking.</p>

<h2>5. Purchases (Apple)</h2>
<p>All purchases and subscriptions are processed by Apple through the App Store under Apple&rsquo;s own privacy policy. Our service only receives Apple&rsquo;s signed transaction data to verify purchases.</p>

<h2>6. What we do not do</h2>
<ul>
  <li>We do not sell personal data.</li>
  <li>We do not use your data for our own tracking or cross-app advertising.</li>
  <li>The app contains no analytics SDK and no first-party crash-reporting SDK.</li>
  <li>We do not request access to your contacts, photos, camera, microphone, precise location, health data, or browsing history.</li>
  <li>Vault Coins, boosters, scores, and rewards are fictional in-game items with no cash value; there is no real currency, gambling, or cash-out of any kind.</li>
</ul>

<h2>7. Server logs and hosting</h2>
<p>Our backend writes transient request logs containing only the HTTP method, path, parameter names (never values), response status, and duration. No IP addresses, tokens, or query values are stored in the app&rsquo;s database. The service is hosted on Fly.io (Toronto, Canada region), which processes IP addresses transiently for network routing and security as our hosting provider.</p>

<h2>8. Data retention and deletion</h2>
<ul>
  <li>Sessions expire automatically after 24 hours.</li>
  <li>Account, purchase, leaderboard, reward, and support records are kept while the account or record remains relevant; no other automated retention schedule currently runs.</li>
  <li><strong>You can permanently delete your account inside the app</strong>: Settings &rarr; Account &rarr; Delete Account. Deletion removes your email address, sign-in credentials, all sessions, the account-to-install link, server-side inventory grants, leaderboard entries (handle and scores), your support tickets, and pending password-reset requests. Verified purchase records are retained in de-identified form (detached from your install) for duplicate-grant fraud prevention and financial record-keeping; rewarded-ad verification records are de-identified the same way.</li>
  <li>Deleting your VaultPop account does <strong>not</strong> cancel an Apple subscription. Manage or cancel VaultPass Plus in your Apple account settings (Settings &rarr; Apple ID &rarr; Subscriptions).</li>
  <li>You can also request access to, or deletion of, your data through the in-app Support screen (choose &ldquo;Privacy request&rdquo;) or by emailing <a href="mailto:support@vaultpop.app">support@vaultpop.app</a>.</li>
</ul>

<h2>9. Your choices</h2>
<ul>
  <li>Play without an account &mdash; sign-in is optional.</li>
  <li>Permanently delete your account at any time from inside the app.</li>
  <li>Decline App Tracking Transparency &mdash; you still get ads, just non-personalized.</li>
  <li>Change or withdraw regional ad consent via the ad consent flow.</li>
  <li>Submit a privacy request in-app or by email at any time.</li>
</ul>

<h2>10. Children</h2>
<p>VaultPop does not knowingly collect personal information from children. The app requires no account, and an email address is collected only when voluntarily provided.</p>

<h2>11. Security</h2>
<p>Passwords are stored as salted scrypt hashes, session tokens are stored hashed, and all connections to the service are forced to HTTPS. No method of transmission or storage is perfectly secure, and we cannot guarantee absolute security.</p>

<h2>12. Changes to this policy</h2>
<p>If this policy changes, the updated version will be published at this address with a new &ldquo;Last updated&rdquo; date.</p>

<h2>13. Contact</h2>
<p>In-app: Settings &rarr; Support (choose &ldquo;Privacy request&rdquo;). Email: <a href="mailto:support@vaultpop.app">support@vaultpop.app</a>.</p>

<div class="callout"><strong>Fictional in-game content.</strong> Vault Coins, boosters, style points, rewards, scores, and leaderboard entries are fictional in-game content only. They have no real-world monetary value and cannot be exchanged, transferred, traded, sold, or redeemed outside of VaultPop.</div>
`
  });
}

export function renderTermsPage(): string {
  return legalShell({
    title: "Terms of Use",
    description:
      "VaultPop terms of use: fictional in-game items with no cash value, Apple-billed purchases, VaultPass Plus subscription, rewarded ads, and leaderboards.",
    body: `
<h1>Terms of Use</h1>
<p class="updated">Last updated: July 30, 2026</p>

<h2>1. Agreement</h2>
<p>These Terms of Use (&ldquo;Terms&rdquo;) are an agreement between you and the operator of VaultPop (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By downloading, installing, or playing VaultPop, you agree to these Terms. If you do not agree, do not use the app.</p>

<h2>2. The game</h2>
<p>VaultPop is an arcade puzzle game for iPhone. You pop matching coins, build combos, charge the vault meter, and chase high scores across game modes. VaultPop is entertainment software only. It does not include real cryptocurrency, mining, wallets, trading, staking, NFTs, gambling, cash-out, or real-world prizes of any kind.</p>

<h2>3. Virtual items have no real-world value</h2>
<p>Vault Coins, boosters, style points, rewards, scores, streaks, leaderboard entries, and all other in-game content are <strong>fictional in-game items only</strong>. They:</p>
<ul>
  <li>have no real-world monetary value;</li>
  <li>cannot be exchanged, transferred, traded, sold, or redeemed for money or anything of value outside the game;</li>
  <li>are licensed to you for use inside VaultPop, not sold to you; and</li>
  <li>may be adjusted, rebalanced, or reset as part of game operation.</li>
</ul>

<h2>4. Accounts</h2>
<p>An account is optional and free; core gameplay works without one. If you create an account you agree to provide a valid email address, keep your password confidential, and accept responsibility for activity under your account. We may suspend or disable accounts that violate these Terms, abuse the service, or attempt to defraud reward or purchase systems.</p>
<p>You can permanently delete your account at any time inside the app (Settings &rarr; Account &rarr; Delete Account). Deletion is permanent: your synced progress, inventory, and fictional virtual items are removed and cannot be restored, and your leaderboard identity is deleted. Deleting your VaultPop account does <strong>not</strong> cancel an Apple subscription &mdash; cancel VaultPass Plus separately in your Apple account settings.</p>

<h2>5. Purchases and subscriptions</h2>
<ul>
  <li>All purchases are processed by Apple through the App Store under Apple&rsquo;s terms and payment policies. We never receive your payment card details.</li>
  <li>Consumable packs contain fixed, listed contents only &mdash; no paid random rewards or chance-based contents.</li>
  <li>VaultPass Plus is a monthly auto-renewing subscription billed by Apple. It renews until cancelled in your Apple account settings (Settings &rarr; Apple ID &rarr; Subscriptions).</li>
  <li>Use &ldquo;Restore Purchases&rdquo; in the Shop to recover non-consumable entitlements and an active subscription on a new device or reinstall.</li>
  <li>Refunds are handled by Apple under Apple&rsquo;s refund policies, except where applicable law provides otherwise.</li>
</ul>

<h2>6. Rewarded ads</h2>
<p>Optional rewarded ads grant small fictional in-game rewards. Rewarded ads are capped at 30 per day, are never required to play, and depend on ad availability from the ad network &mdash; we do not guarantee that an ad will always be available.</p>

<h2>7. Leaderboards</h2>
<p>If you submit a score, your chosen display handle and best score are shown publicly in-app. Keep handles appropriate; we may remove entries or handles that are offensive, misleading, or produced by cheating, and we may remove leaderboard data on request.</p>

<h2>8. Acceptable use</h2>
<p>You agree not to:</p>
<ul>
  <li>cheat, exploit bugs, or use automation to manipulate scores, rewards, or purchases;</li>
  <li>reverse engineer, modify, or redistribute the app except where the law permits;</li>
  <li>interfere with the service, other players, or the ad and purchase verification systems;</li>
  <li>submit unlawful, abusive, or deceptive content through support or leaderboard handles.</li>
</ul>

<h2>9. Intellectual property</h2>
<p>VaultPop, its artwork, names, game design, and software are protected by intellectual-property law. You receive a personal, non-exclusive, non-transferable license to play the game on Apple-branded devices you own or control, as permitted by the App Store terms.</p>

<h2>10. Disclaimers</h2>
<p>VaultPop is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind to the maximum extent permitted by law. We do not guarantee uninterrupted availability of the service, leaderboards, ads, or any particular feature. Support requests are answered on a best-effort basis; we do not guarantee response times, including for Premium Support routing.</p>

<h2>11. Limitation of liability</h2>
<p>To the maximum extent permitted by applicable law, we are not liable for indirect, incidental, special, or consequential damages, or for loss of fictional in-game items, arising from your use of VaultPop. Nothing in these Terms limits liability that cannot be limited by law, and mandatory consumer-protection rights in your country of residence remain unaffected.</p>

<h2>12. Termination</h2>
<p>You may stop using VaultPop at any time by deleting the app. We may suspend or terminate access to online features (accounts, leaderboards, verification) for violations of these Terms. Sections 3, 9, 10, and 11 survive termination.</p>

<h2>13. Apple-specific terms</h2>
<p>These Terms are between you and the operator of VaultPop, not Apple. Apple has no obligation to provide maintenance or support for the app. Apple is not responsible for addressing claims relating to the app. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you.</p>

<h2>14. Changes to these Terms</h2>
<p>If these Terms change, the updated version will be published at this address with a new &ldquo;Last updated&rdquo; date. Continued use of VaultPop after changes take effect constitutes acceptance.</p>

<h2>15. Governing law</h2>
<p>These Terms are governed by the applicable law of the place where the operator of VaultPop is established, without prejudice to mandatory consumer-protection law of your country of residence.</p>

<h2>16. Contact</h2>
<p>In-app: Settings &rarr; Support. Email: <a href="mailto:support@vaultpop.app">support@vaultpop.app</a>.</p>

<div class="callout"><strong>Fictional in-game content.</strong> Vault Coins, boosters, style points, rewards, scores, and leaderboard entries are fictional in-game content only. They have no real-world monetary value and cannot be exchanged, transferred, traded, sold, or redeemed outside of VaultPop.</div>
`
  });
}
