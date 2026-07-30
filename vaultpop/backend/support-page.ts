/**
 * Public VaultPop support landing page.
 * Served at GET /support — must always look like a credible product page,
 * never raw backend output. No secrets, no debug output, no env values.
 */

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is VaultPop?",
    a: "VaultPop is a fictional arcade puzzle game for iPhone. Tap groups of matching coins to build combos, charge the vault meter, and chase high scores across four modes: Classic, Daily Vault, Streak, and Blitz."
  },
  {
    q: "Are Vault Coins or scores worth real money?",
    a: "No. Vault Coins, boosters, style points, rewards, scores, and leaderboard entries are fictional in-game content only. They have no real-world value and cannot be exchanged, transferred, traded, or cashed out."
  },
  {
    q: "Do I need an account to play?",
    a: "No. VaultPop works fully offline. An optional free account only adds inventory sync and support history across reinstalls."
  },
  {
    q: "A purchase did not arrive. What do I do?",
    a: "Open Shop and tap Restore Purchases first. Consumable packs are delivered after Apple confirms the purchase. If something is still missing, contact support with your approximate purchase time."
  },
  {
    q: "How does VaultPass Plus work?",
    a: "VaultPass Plus is a monthly auto-renewing subscription managed by Apple. It includes ad-free play, premium themes, priority support routing, and a monthly booster refill. Manage or cancel it anytime in your Apple account settings."
  },
  {
    q: "What is Premium Support vs Standard Support?",
    a: "Everyone receives support — free. Tickets from players with an active VaultPass Plus subscription are routed as Premium Support and sorted first in our queue; all other tickets are Standard Support. Both tiers are answered on a best-effort basis; no response time is guaranteed for either tier."
  },
  {
    q: "How do I delete my account?",
    a: "Open VaultPop and go to Settings → Account → Delete Account. Deletion is permanent: it removes your email, sign-in access, server-side inventory, leaderboard entries, and support history. Deleting your VaultPop account does not cancel an Apple subscription — manage VaultPass Plus separately in your Apple account settings."
  },
  {
    q: "How do rewarded ads work?",
    a: "Watching an optional rewarded ad grants a small fictional in-game reward such as 1 Bonus Life or 10 Vault Coins. Rewarded ads are limited to 30 per day in total and are never required to play."
  },
  {
    q: "Why is my score not on the global leaderboard?",
    a: "Scores submit automatically when a round ends and an internet connection is available. Only your best score per mode is kept. If you play offline, your local best is saved and the global board updates on a later online round."
  },
  {
    q: "How is my privacy handled?",
    a: "Core game progress stays on your device. The optional account links only an email address and inventory. Support requests include just the details you type plus basic app version info. See the full privacy policy below."
  }
];

const CATEGORIES: { title: string; body: string }[] = [
  {
    title: "Account help",
    body: "Creating an account, signing in, syncing inventory, or signing out. Accounts are optional and free, and can be permanently deleted in-app."
  },
  {
    title: "Purchases & IAP",
    body: "Coin packs, booster packs, the Ad-Free Upgrade, restoring purchases, and Apple billing questions."
  },
  {
    title: "VaultPass Plus",
    body: "Subscription benefits, renewal, cancellation, and priority support routing."
  },
  {
    title: "Rewarded ads",
    body: "Optional ads that grant small fictional rewards, daily limits, and missing-reward reports."
  },
  {
    title: "Leaderboards",
    body: "Global vault ranks, score submission, mode filters, and display handles."
  },
  {
    title: "Gameplay",
    body: "Rules for Classic, Daily Vault, Streak, and Blitz, plus boosters, combos, and the vault meter."
  }
];

export function renderSupportPage(): string {
  const faqHtml = FAQ_ITEMS.map(
    (item) =>
      `<details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`
  ).join("");
  const categoriesHtml = CATEGORIES.map(
    (item) =>
      `<div class="card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div>`
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VaultPop Support</title>
<meta name="description" content="Official support for VaultPop, the fictional arcade coin-popping puzzle game. FAQ, account help, purchase help, and contact.">
<style>
:root{--bg:#070A12;--panel:#101528;--panel2:#0C1120;--border:#232B45;--text:#F2F5FF;--muted:#9AA6C4;--gold:#F6C65B;--violet:#A875FF;--cyan:#36D9FF}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:880px;margin:0 auto;padding:0 20px 64px}
header{padding:44px 0 8px;text-align:center}
.logo{font-size:44px;font-weight:900;font-style:italic;letter-spacing:-1px}
.logo .pop{color:var(--gold)}
.tagline{color:var(--muted);letter-spacing:3px;text-transform:uppercase;font-size:12px;margin-top:6px}
.hero{background:linear-gradient(160deg,#181240,#0B0820);border:1px solid var(--border);border-radius:16px;padding:28px;margin-top:28px;text-align:center}
.hero p{color:var(--muted);max-width:620px;margin:10px auto 0}
.hero h1{font-size:26px}
.contact{display:inline-block;margin-top:18px;background:var(--gold);color:#140F02;font-weight:800;padding:12px 22px;border-radius:999px;text-decoration:none}
.contact:hover{filter:brightness(1.08)}
h2{margin:44px 0 16px;font-size:20px;color:var(--gold);letter-spacing:1px;text-transform:uppercase}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px}
.card h3{font-size:16px;margin-bottom:6px;color:var(--cyan)}
.card p{color:var(--muted);font-size:14px}
details{background:var(--panel2);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;padding:14px 18px}
summary{cursor:pointer;font-weight:700;color:var(--text)}
details p{color:var(--muted);margin-top:10px;font-size:14.5px}
.disclaimer{background:rgba(246,198,91,.08);border:1px solid rgba(246,198,91,.35);border-radius:12px;padding:18px;color:var(--muted);font-size:14px;margin-top:36px}
.disclaimer strong{color:var(--gold)}
.privacy{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px;color:var(--muted);font-size:14px;margin-top:14px}
.privacy strong{color:var(--cyan)}
footer{margin-top:44px;text-align:center;color:var(--muted);font-size:13px}
footer a{color:var(--cyan);text-decoration:none}
.steps{color:var(--muted);font-size:14.5px;padding-left:20px;margin-top:8px}
.steps li{margin-bottom:6px}
@media(max-width:520px){.logo{font-size:34px}.hero{padding:20px}.wrap{padding:0 14px 48px}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo">VAULT<span class="pop">POP</span></div>
    <div class="tagline">Pop Coins &middot; Complete the Chain</div>
  </header>

  <section class="hero">
    <h1>VaultPop Support</h1>
    <p>VaultPop is a fictional arcade puzzle game for iPhone. Pop matching coins, build combos, open vaults, and climb the global ranks. We're here to help with anything — accounts, purchases, gameplay, or feedback.</p>
    <a class="contact" href="mailto:support@vaultpop.app">Email support@vaultpop.app</a>
  </section>

  <h2>Support categories</h2>
  <div class="grid">${categoriesHtml}</div>

  <h2>Frequently asked questions</h2>
  ${faqHtml}

  <h2>Submit a support request</h2>
  <div class="card">
    <p>The fastest route is the in-app support form — it attaches your app version automatically and never requires an account:</p>
    <ol class="steps">
      <li>Open VaultPop and go to <strong>Settings &rarr; Support</strong>.</li>
      <li>Choose a category, describe the issue, and optionally add an email for a reply.</li>
      <li>Submit — active VaultPass Plus members receive Premium Support routing; all other requests are Standard Support. Everyone receives support, and no response time is guaranteed for either tier.</li>
    </ol>
    <p style="margin-top:10px">Prefer email? Write to <a href="mailto:support@vaultpop.app" style="color:var(--gold)">support@vaultpop.app</a> and we'll get back to you.</p>
  </div>

  <div class="disclaimer">
    <strong>Fictional in-game content.</strong> Vault Coins, boosters, style points, rewards, scores, and leaderboard entries are fictional in-game content only. They have no real-world monetary value and cannot be exchanged, transferred, traded, sold, or redeemed outside of VaultPop.
  </div>

  <div class="privacy">
    <strong>Privacy &amp; safety.</strong> Your game progress lives on your device. Optional accounts link only an email address and in-game inventory. We never sell personal data, and support messages are used solely to resolve your request. Read the full <a href="/privacy" style="color:var(--cyan)">privacy policy</a> and <a href="/terms" style="color:var(--cyan)">terms of use</a>.
  </div>

  <footer>
    VaultPop &middot; <a href="/privacy">Privacy Policy</a> &middot; <a href="/terms">Terms of Use</a> &middot; <a href="mailto:support@vaultpop.app">support@vaultpop.app</a>
  </footer>
</div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
