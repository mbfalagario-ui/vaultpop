import { FAQ_CATEGORIES } from "../src/support/faq-data";

const PALETTE = {
  background: "#060512",
  surface: "#0E0C1F",
  raised: "#181432",
  border: "#272148",
  textPrimary: "#F7F5FF",
  textSecondary: "#ABA5C9",
  textMuted: "#6F6893",
  gold: "#FFC93E",
  cyan: "#35DBFF",
  emerald: "#3BE88C",
  violet: "#9D6BFF",
  ruby: "#FF4D8D"
};

const CATEGORY_CHIPS = FAQ_CATEGORIES.map(
  (category) => `<span class="chip">${category}</span>`
).join("");

export function adminPage(): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VaultPop Admin Console</title>
<style>
  :root{color-scheme:dark;font:14.5px/1.5 system-ui;background:${PALETTE.background};color:${PALETTE.textPrimary}}
  *{box-sizing:border-box}
  [hidden]{display:none!important}
  body{margin:0;min-height:100vh;background:
    radial-gradient(700px 340px at 15% -10%, #FFC93E14, transparent),
    radial-gradient(700px 340px at 95% 0%, #9D6BFF14, transparent),
    ${PALETTE.background}}
  header,main{max-width:1240px;margin:auto;padding:16px 20px}
  header{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .brand{display:flex;align-items:center;gap:12px}
  .brand .coin{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle at 32% 30%, #FFE18F, ${PALETTE.gold} 55%, #B8770B);box-shadow:0 0 18px #FFC93E55;display:grid;place-items:center;color:#140F02;font-weight:900;font-size:17px}
  h1{margin:0;font-size:18px;letter-spacing:.4px}
  h2{margin:0;font-size:14.5px}
  .eyebrow{font-size:10px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:${PALETTE.textMuted}}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px;margin-bottom:12px}
  .card{background:${PALETTE.surface};border:1px solid ${PALETTE.border};border-radius:14px;padding:16px;display:grid;gap:10px;align-content:start;box-shadow:0 12px 28px #00000055}
  .card.wide{grid-column:1/-1}
  .card-head{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
  .dot{width:8px;height:8px;border-radius:50%;flex:none}
  .kv{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid ${PALETTE.border};padding:6px 0;font-size:13px}
  .kv:last-child{border-bottom:none}
  .kv .k{color:${PALETTE.textSecondary}}
  .kv .v{font-weight:700;text-align:right;overflow-wrap:anywhere}
  .pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:10px;font-weight:900;letter-spacing:1px;white-space:nowrap}
  .pill.ok{background:#3BE88C22;border:1px solid #3BE88C66;color:${PALETTE.emerald}}
  .pill.bad{background:#FF4D8D22;border:1px solid #FF4D8D66;color:${PALETTE.ruby}}
  .pill.gold{background:#FFC93E22;border:1px solid #FFC93E66;color:${PALETTE.gold}}
  .pill.cyan{background:#35DBFF22;border:1px solid #35DBFF66;color:${PALETTE.cyan}}
  .pill.violet{background:#9D6BFF22;border:1px solid #9D6BFF66;color:${PALETTE.violet}}
  .pill.mut{background:${PALETTE.raised};border:1px solid ${PALETTE.border};color:${PALETTE.textMuted}}
  .chip{display:inline-block;background:${PALETTE.raised};border:1px solid ${PALETTE.border};border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;color:${PALETTE.textSecondary};margin:2px 4px 2px 0}
  form,.row{display:flex;flex-wrap:wrap;gap:9px;align-items:end}
  label{display:grid;gap:4px;color:${PALETTE.textSecondary};font-size:12px}
  input,select,textarea,button{min-height:40px;border:1px solid ${PALETTE.border};border-radius:9px;background:${PALETTE.raised};color:${PALETTE.textPrimary};padding:8px 11px;font-size:13.5px;font-family:inherit}
  textarea{width:100%;min-height:70px;resize:vertical}
  button{border-color:#FFC93E88;background:linear-gradient(180deg,#FFC93E,#E9A81E);color:#140F02;font-weight:800;cursor:pointer}
  button.quiet{background:${PALETTE.raised};border-color:${PALETTE.border};color:${PALETTE.textSecondary}}
  button.danger{background:linear-gradient(180deg,#FF4D8D,#D62E6C);border-color:#FF4D8D88;color:#fff}
  button.small{min-height:32px;padding:4px 11px;font-size:12px}
  button:disabled{opacity:.45;cursor:default}
  table{width:100%;border-collapse:collapse;font-size:12.8px}
  th,td{text-align:left;padding:8px 7px;border-bottom:1px solid ${PALETTE.border};vertical-align:top}
  th{color:${PALETTE.textMuted};font-size:10.5px;letter-spacing:1.1px;text-transform:uppercase;white-space:nowrap}
  td.preview{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${PALETTE.textSecondary}}
  .big{font-size:24px;font-weight:900;line-height:1.1}
  .big small{font-size:11px;color:${PALETTE.textMuted};font-weight:700;display:block;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
  .kpis{display:flex;gap:18px;flex-wrap:wrap}
  .status{color:${PALETTE.cyan};font-size:13px;min-height:19px;font-weight:700}
  .status.error{color:${PALETTE.ruby}}
  .muted{color:${PALETTE.textMuted};font-size:12px}
  .msgbox{background:#04030C;border:1px solid ${PALETTE.border};border-radius:9px;padding:11px;font-size:13px;color:${PALETTE.textSecondary};white-space:pre-wrap;overflow-wrap:anywhere}
  .reply{border-left:3px solid ${PALETTE.border};padding:6px 10px;margin:4px 0;font-size:13px;color:${PALETTE.textSecondary};overflow-wrap:anywhere}
  .reply.admin{border-left-color:${PALETTE.gold}}
  .reply .who{font-size:10.5px;font-weight:800;letter-spacing:1px;color:${PALETTE.textMuted};text-transform:uppercase}
  .panel{background:#0A0818;border:1px solid ${PALETTE.border};border-radius:11px;padding:14px;display:grid;gap:10px}
  .restricted{max-width:460px;margin:40px auto;text-align:center}
  .restricted .lock{font-size:36px}
  .tablewrap{overflow-x:auto}
</style>
<header>
  <div class="brand">
    <div class="coin">V</div>
    <div><h1>VaultPop Admin Console</h1><div class="eyebrow">Owner operations</div></div>
  </div>
  <button id="logout" class="quiet" hidden>Log Out</button>
</header>
<main>
  <section id="login-panel" class="card" style="max-width:460px;margin:24px auto">
    <div class="card-head"><span class="dot" style="background:${PALETTE.gold};box-shadow:0 0 8px ${PALETTE.gold}"></span><h2>Owner Sign In</h2></div>
    <p class="muted" style="margin:0">This console is restricted to the VaultPop owner account.</p>
    <form id="login-form" style="display:grid;gap:10px">
      <label>Email<input id="email" type="email" autocomplete="username" required></label>
      <label>Password<input id="password" type="password" autocomplete="current-password" required></label>
      <button id="login-button">Sign In</button>
    </form>
  </section>

  <section id="restricted-panel" class="card restricted" hidden>
    <div class="lock">&#128274;</div>
    <h2>Restricted Access</h2>
    <p class="muted" style="margin:0">This console is available to the VaultPop owner account only. Your account does not have admin access.</p>
    <button id="restricted-back" class="quiet">Back to Sign In</button>
  </section>

  <section id="workspace" hidden>
    <div class="grid">
      <div class="card">
        <div class="card-head"><span class="dot" style="background:${PALETTE.emerald};box-shadow:0 0 8px ${PALETTE.emerald}"></span><h2>Support Inbox</h2></div>
        <div class="kpis">
          <div class="big" id="kpi-open">&mdash;<small>Open tickets</small></div>
          <div class="big" id="kpi-escalated" style="color:${PALETTE.ruby}">&mdash;<small>Escalated open</small></div>
          <div class="big" id="kpi-closed" style="color:${PALETTE.textMuted}">&mdash;<small>Closed</small></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><span class="dot" style="background:${PALETTE.cyan};box-shadow:0 0 8px ${PALETTE.cyan}"></span><h2>Rewarded Ads (24h)</h2></div>
        <div class="kpis">
          <div class="big" id="kpi-ads-granted">&mdash;<small>Watched &amp; granted</small></div>
          <div class="big" id="kpi-ads-failed" style="color:${PALETTE.ruby}">&mdash;<small>Failed / unavailable</small></div>
        </div>
        <div>
          <div class="kv"><span class="k">1 Bonus Life</span><span class="v" id="ads-life">&mdash;</span></div>
          <div class="kv"><span class="k">10 Vault Coins</span><span class="v" id="ads-coins">&mdash;</span></div>
          <div class="kv"><span class="k">SSV-confirmed grants</span><span class="v" id="ads-ssv">&mdash;</span></div>
          <div class="kv"><span class="k">Shared daily cap</span><span class="v" id="ads-cap">&mdash;</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><span class="dot" style="background:${PALETTE.violet};box-shadow:0 0 8px ${PALETTE.violet}"></span><h2>Purchases &amp; Premium</h2></div>
        <div class="kpis">
          <div class="big" id="kpi-purch-total">&mdash;<small>Verified purchases</small></div>
          <div class="big" id="kpi-purch-24h" style="color:${PALETTE.cyan}">&mdash;<small>Last 24h</small></div>
        </div>
        <div>
          <div class="kv"><span class="k">Active VaultPass</span><span class="v" id="kpi-vaultpass">&mdash;</span></div>
          <div class="kv"><span class="k">Ad-Free users</span><span class="v" id="kpi-adfree">&mdash;</span></div>
          <div class="kv"><span class="k">Est. gross (USD)</span><span class="v" id="kpi-gross" style="color:${PALETTE.gold}">&mdash;</span></div>
        </div>
        <p class="muted" id="revenue-note" style="margin:0"></p>
      </div>
      <div class="card">
        <div class="card-head"><span class="dot" style="background:${PALETTE.gold};box-shadow:0 0 8px ${PALETTE.gold}"></span><h2>Operations</h2><button id="run-checks" class="quiet small" style="margin-left:auto">Run Checks</button></div>
        <div>
          <div class="kv"><span class="k">API health</span><span class="v" id="health-state">Checking&hellip;</span></div>
          <div class="kv"><span class="k">Latency</span><span class="v" id="health-latency">&mdash;</span></div>
          <div class="kv"><span class="k">Production SSV URL</span><span class="v" id="ops-ssv-url">&mdash;</span></div>
          <div class="kv"><span class="k">Signed in as</span><span class="v" id="owner-email">&mdash;</span></div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card wide">
        <div class="card-head">
          <span class="dot" style="background:${PALETTE.cyan};box-shadow:0 0 8px ${PALETTE.cyan}"></span><h2>AI Support Agent</h2>
          <span class="pill ok" style="margin-left:auto">ACTIVE &middot; ON-DEVICE</span>
        </div>
        <p class="muted" style="margin:0">Structured FAQ assistant with intent detection and guided troubleshooting runs inside the app (no external LLM, no player text leaves the device). Unresolved conversations escalate into the Support Inbox below.</p>
        <div class="row" style="align-items:center">
          <span class="pill bad" id="ai-escalated-pill">ESCALATED OPEN: &mdash;</span>
          <span class="muted">Coverage:</span>
          <span id="ai-categories">${CATEGORY_CHIPS}</span>
        </div>
        <div class="tablewrap"><table id="ai-escalations-table" hidden>
          <thead><tr><th>Ticket</th><th>Category</th><th>From</th><th>Preview</th><th>Updated</th><th></th></tr></thead>
          <tbody id="ai-escalations"></tbody>
        </table></div>
        <p class="muted" id="ai-none" style="margin:0">No escalated conversations right now.</p>
      </div>
    </div>

    <div class="grid">
      <div class="card wide">
        <div class="card-head">
          <span class="dot" style="background:${PALETTE.emerald};box-shadow:0 0 8px ${PALETTE.emerald}"></span><h2>Support Tickets</h2>
          <select id="ticket-filter" style="margin-left:auto"><option value="">All</option><option value="open">Open</option><option value="closed">Closed</option><option value="escalated">Escalated</option></select>
          <button id="ticket-refresh" class="quiet small">Refresh</button>
        </div>
        <div class="tablewrap"><table>
          <thead><tr><th>Ticket</th><th>Status</th><th>Category</th><th>From</th><th>Preview</th><th>Updated</th><th></th></tr></thead>
          <tbody id="ticket-rows"></tbody>
        </table></div>
        <p class="muted" id="ticket-empty" hidden style="margin:0">No tickets match this filter.</p>
        <div id="ticket-detail" class="panel" hidden>
          <div class="row" style="align-items:center">
            <strong id="td-id"></strong>
            <span class="pill" id="td-status"></span>
            <span class="pill bad" id="td-escalated" hidden>ESCALATED</span>
            <span class="pill gold" id="td-priority" hidden>PRIORITY</span>
            <button id="td-toggle" class="quiet small" style="margin-left:auto"></button>
          </div>
          <div>
            <div class="kv"><span class="k">Category</span><span class="v" id="td-category"></span></div>
            <div class="kv"><span class="k">From</span><span class="v" id="td-from"></span></div>
            <div class="kv"><span class="k">App / Device</span><span class="v" id="td-meta"></span></div>
            <div class="kv"><span class="k">Created</span><span class="v" id="td-created"></span></div>
          </div>
          <div class="msgbox" id="td-message"></div>
          <div id="td-replies"></div>
          <form id="reply-form" style="display:grid;gap:8px">
            <label>Admin reply<textarea id="reply-message" maxlength="2000" placeholder="Write a reply for this ticket..."></textarea></label>
            <div class="row"><button id="reply-send" class="small">Send Reply</button></div>
          </form>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card wide">
        <div class="card-head">
          <span class="dot" style="background:${PALETTE.violet};box-shadow:0 0 8px ${PALETTE.violet}"></span><h2>User Management</h2>
        </div>
        <div class="row">
          <label>Search<input id="query" placeholder="Email, account ID, or install ID"></label>
          <label>Role<select id="role"><option value="">All</option><option>player</option><option>reviewer</option><option>admin</option></select></label>
          <button id="search" class="small" style="min-height:40px">Search</button>
        </div>
        <div class="tablewrap"><table>
          <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Access</th><th>Install</th><th>Inventory</th><th></th></tr></thead>
          <tbody id="account-rows"></tbody>
        </table></div>
        <div id="editor" class="panel" hidden>
          <div class="row" style="align-items:center">
            <strong id="ed-email"></strong>
            <span class="pill" id="ed-status"></span>
            <span class="pill violet" id="ed-pass" hidden>VAULTPASS</span>
            <span class="pill cyan" id="ed-adfree" hidden>AD-FREE</span>
          </div>
          <div>
            <div class="kv"><span class="k">Account ID</span><span class="v" id="ed-id"></span></div>
            <div class="kv"><span class="k">Role</span><span class="v" id="ed-role"></span></div>
            <div class="kv"><span class="k">Install ID</span><span class="v" id="ed-install"></span></div>
            <div class="kv"><span class="k">Created</span><span class="v" id="ed-created"></span></div>
            <div class="kv"><span class="k">Inventory</span><span class="v" id="ed-inventory"></span></div>
            <div class="kv"><span class="k">VaultPass until</span><span class="v" id="ed-passuntil"></span></div>
            <div class="kv"><span class="k">Support tickets</span><span class="v" id="ed-tickets"></span></div>
          </div>
          <form id="inventory-form">
            <label>Coins &Delta;<input name="vaultCoins" type="number" value="0" style="width:90px"></label>
            <label>Lives &Delta;<input name="bonusLives" type="number" value="0" style="width:80px"></label>
            <label>Boosts &Delta;<input name="chainBoosts" type="number" value="0" style="width:80px"></label>
            <label>Bursts &Delta;<input name="vaultBursts" type="number" value="0" style="width:80px"></label>
            <label>Reason<input name="reason" required></label>
            <button class="small" style="min-height:40px">Apply Inventory</button>
          </form>
          <form id="entitlement-form">
            <label>Remove Ads<select name="removeAds"><option value="">No change</option><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
            <label>VaultPass expiration<input name="vaultPassExpiresAt" type="datetime-local"></label>
            <label style="align-self:center"><span><input name="clearVaultPass" type="checkbox"> Clear VaultPass</span></label>
            <label>Reason<input name="reason" required></label>
            <button class="small" style="min-height:40px">Apply Entitlements</button>
          </form>
          <div class="row">
            <label>Ban/unban reason<input id="ban-reason" placeholder="Required"></label>
            <button id="ban-button" class="danger small" style="min-height:40px">Ban User</button>
          </div>
          <div class="row">
            <label>Temporary password (min 12 chars)<input id="temp-password" type="text" autocomplete="off"></label>
            <label>Reason<input id="reset-reason" placeholder="Required"></label>
            <button id="reset-button" class="small" style="min-height:40px">Set Temporary Password</button>
          </div>
          <p class="muted" style="margin:0">Password resets revoke all sessions. Current passwords are never visible; reset values are not stored or logged.</p>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-head">
          <span class="dot" style="background:${PALETTE.ruby};box-shadow:0 0 8px ${PALETTE.ruby}"></span><h2>Password Resets</h2>
          <button id="resets-refresh" class="quiet small" style="margin-left:auto">Refresh</button>
        </div>
        <p class="muted" style="margin:0">Self-service email delivery is not configured — requests queue here for admin-assisted reset. Find the user above, set a temporary password, then mark handled.</p>
        <div class="tablewrap"><table>
          <thead><tr><th>Email</th><th>Status</th><th>Requested</th><th></th></tr></thead>
          <tbody id="reset-rows"></tbody>
        </table></div>
        <p class="muted" id="resets-empty" hidden style="margin:0">No reset requests.</p>
      </div>
      <div class="card">
        <div class="card-head">
          <span class="dot" style="background:${PALETTE.gold};box-shadow:0 0 8px ${PALETTE.gold}"></span><h2>Audit Log</h2>
          <button id="audit-refresh" class="quiet small" style="margin-left:auto">Refresh</button>
        </div>
        <div class="tablewrap"><table>
          <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead>
          <tbody id="audit-rows"></tbody>
        </table></div>
        <p class="muted" id="audit-empty" hidden style="margin:0">No audit entries yet.</p>
      </div>
    </div>
  </section>
  <p id="status" class="status" role="status"></p>
</main>
<script>
let token="",selected=null,selectedTicket=null;
const $=id=>document.getElementById(id);
function AccessError(message){const error=new Error(message);error.name="AccessError";return error}

// Safe API helper: hard 15s timeout, tolerates empty bodies, HTML error
// pages, and proxy failures. Never lets a raw JSON parse error escape.
async function api(path,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  let response;
  try{
    response=await fetch(path,{...options,signal:controller.signal,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.headers||{})}});
  }catch{
    throw new Error(controller.signal.aborted?"The request timed out. Please try again.":"The VaultPop service could not be reached. Please try again.");
  }finally{
    clearTimeout(timer);
  }
  const text=await response.text().catch(()=> "");
  let body=null;
  if(text){try{body=JSON.parse(text)}catch{body=null}}
  if(response.status===401||response.status===403)throw AccessError((body&&body.error)||"Restricted access.");
  if(!response.ok)throw new Error((body&&body.error)||("The VaultPop service returned an unexpected response ("+response.status+")."));
  if(body===null)throw new Error("The VaultPop service returned an unexpected response.");
  return body;
}
function status(message,isError){const node=$("status");node.textContent=message||"";node.className=isError?"status error":"status"}
function handleError(error){
  if(error&&error.name==="AccessError"){token="";selected=null;showView("login");status("Your session ended. Sign in again.",true)}
  else status(error&&error.message?error.message:"Something went wrong.",true);
}
function showView(view){
  $("login-panel").hidden=view!=="login";
  $("restricted-panel").hidden=view!=="restricted";
  $("workspace").hidden=view!=="dashboard";
  $("logout").hidden=view!=="dashboard";
}
function when(iso){try{return new Date(iso).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return iso}}
function cell(row,text){const td=document.createElement("td");td.textContent=text==null?"":String(text);row.appendChild(td);return td}
function pillCell(row,text,cls){const td=document.createElement("td");const span=document.createElement("span");span.className="pill "+cls;span.textContent=text;td.appendChild(span);row.appendChild(td)}
function actionCell(row,label,onClick,cls){const td=document.createElement("td");const button=document.createElement("button");button.className=(cls||"quiet")+" small";button.textContent=label;button.onclick=onClick;td.appendChild(button);row.appendChild(td)}

// ---- Analytics / KPI cards ----
async function loadAnalytics(){
  const data=await api("/v1/admin/analytics");
  $("kpi-open").firstChild.textContent=data.support.open;
  $("kpi-escalated").firstChild.textContent=data.support.escalatedOpen;
  $("kpi-closed").firstChild.textContent=data.support.closed;
  $("ai-escalated-pill").textContent="ESCALATED OPEN: "+data.support.escalatedOpen;
  $("kpi-ads-granted").firstChild.textContent=data.ads.granted24h;
  $("kpi-ads-failed").firstChild.textContent=data.ads.failed24h;
  $("ads-life").textContent=data.ads.byType.bonusLife+" granted";
  $("ads-coins").textContent=data.ads.byType.vaultCoins+" granted";
  $("ads-ssv").textContent=String(data.ads.ssvGranted24h);
  $("ads-cap").textContent=data.ads.dailyCap+" / day (shared)";
  $("ops-ssv-url").textContent=data.ads.ssvUrl;
  $("kpi-purch-total").firstChild.textContent=data.purchases.total;
  $("kpi-purch-24h").firstChild.textContent=data.purchases.last24h;
  $("kpi-vaultpass").textContent=String(data.purchases.activeVaultPass);
  $("kpi-adfree").textContent=String(data.purchases.removeAdsUsers);
  $("kpi-gross").textContent="$"+data.purchases.estimatedGrossUsd.toFixed(2);
  $("revenue-note").textContent=data.purchases.revenueNote;
}

// ---- AI escalations ----
async function loadEscalations(){
  const data=await api("/v1/admin/support/tickets?status=escalated");
  const open=data.tickets.filter(t=>t.status==="open").slice(0,5);
  const body=$("ai-escalations");body.replaceChildren();
  $("ai-escalations-table").hidden=open.length===0;
  $("ai-none").hidden=open.length>0;
  open.forEach(t=>{
    const row=document.createElement("tr");
    cell(row,t.id);cell(row,t.category);cell(row,t.email||t.installId);
    cell(row,t.message.slice(0,60)).className="preview";
    cell(row,when(t.updatedAt));
    actionCell(row,"Open",()=>openTicket(t.id).catch(handleError));
    body.appendChild(row);
  });
}

// ---- Support tickets ----
async function loadTickets(){
  const filter=$("ticket-filter").value;
  const data=await api("/v1/admin/support/tickets"+(filter?"?status="+filter:""));
  const body=$("ticket-rows");body.replaceChildren();
  $("ticket-empty").hidden=data.tickets.length>0;
  data.tickets.forEach(t=>{
    const row=document.createElement("tr");
    cell(row,t.id);
    pillCell(row,t.status.toUpperCase(),t.status==="open"?"ok":"mut");
    cell(row,t.category+(t.escalated?" (escalated)":""));
    cell(row,t.email||t.installId);
    cell(row,t.message.slice(0,70)).className="preview";
    cell(row,when(t.updatedAt));
    actionCell(row,"Open",()=>openTicket(t.id).catch(handleError));
    body.appendChild(row);
  });
}
async function openTicket(id){
  const data=await api("/v1/admin/support/tickets/"+encodeURIComponent(id));
  renderTicket(data.ticket);
  $("ticket-detail").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function renderTicket(t){
  selectedTicket=t.id;
  $("ticket-detail").hidden=false;
  $("td-id").textContent=t.id;
  const st=$("td-status");st.textContent=t.status.toUpperCase();st.className="pill "+(t.status==="open"?"ok":"mut");
  $("td-escalated").hidden=!t.escalated;
  $("td-priority").hidden=!t.priority;
  $("td-toggle").textContent=t.status==="open"?"Close Ticket":"Reopen Ticket";
  $("td-category").textContent=t.category;
  $("td-from").textContent=(t.email||"No email")+" \\u00B7 "+t.installId;
  $("td-meta").textContent="v"+t.appVersion+" ("+t.buildNumber+") \\u00B7 "+t.deviceInfo;
  $("td-created").textContent=when(t.createdAt);
  $("td-message").textContent=t.message;
  const replies=$("td-replies");replies.replaceChildren();
  t.replies.forEach(r=>{
    const div=document.createElement("div");div.className="reply "+(r.author==="admin"?"admin":"");
    const who=document.createElement("div");who.className="who";who.textContent=(r.author==="admin"?"VaultPop Support":"Player")+" \\u00B7 "+when(r.createdAt);
    const msg=document.createElement("div");msg.textContent=r.message;
    div.appendChild(who);div.appendChild(msg);replies.appendChild(div);
  });
}
$("reply-form").onsubmit=async event=>{
  event.preventDefault();
  if(!selectedTicket)return;
  const message=$("reply-message").value.trim();
  if(!message){status("Write a reply first.",true);return}
  try{
    const data=await api("/v1/admin/support/tickets/"+encodeURIComponent(selectedTicket)+"/reply",{method:"POST",body:JSON.stringify({message})});
    $("reply-message").value="";
    renderTicket(data.ticket);
    status("Reply added to "+data.ticket.id+".");
    await loadTickets();
  }catch(error){handleError(error)}
};
$("td-toggle").onclick=async()=>{
  if(!selectedTicket)return;
  try{
    const current=$("td-toggle").textContent.indexOf("Close")===0?"closed":"open";
    const data=await api("/v1/admin/support/tickets/"+encodeURIComponent(selectedTicket)+"/status",{method:"POST",body:JSON.stringify({status:current})});
    renderTicket(data.ticket);
    status(data.ticket.id+" is now "+data.ticket.status+".");
    await Promise.all([loadTickets(),loadAnalytics(),loadEscalations()]);
  }catch(error){handleError(error)}
};
$("ticket-filter").onchange=()=>loadTickets().catch(handleError);
$("ticket-refresh").onclick=()=>Promise.all([loadTickets(),loadEscalations(),loadAnalytics()]).then(()=>status("Tickets refreshed.")).catch(handleError);

// ---- User management ----
async function search(){
  const data=await api("/v1/admin/accounts?q="+encodeURIComponent($("query").value)+"&role="+encodeURIComponent($("role").value));
  const body=$("account-rows");body.replaceChildren();
  data.accounts.forEach(item=>{
    const row=document.createElement("tr");
    cell(row,item.account.email);
    cell(row,item.account.role);
    pillCell(row,item.account.active?"ACTIVE":"BANNED",item.account.active?"ok":"bad");
    const access=[];
    if(item.balance.vaultPassExpiresAt&&new Date(item.balance.vaultPassExpiresAt)>new Date())access.push("VaultPass");
    if(item.balance.removeAds)access.push("Ad-Free");
    cell(row,access.join(", ")||"\\u2014");
    cell(row,item.linkedInstallId||"Not linked");
    cell(row,item.balance.vaultCoins+"c \\u00B7 "+item.balance.bonusLives+"/"+item.balance.chainBoosts+"/"+item.balance.vaultBursts);
    actionCell(row,"Manage",()=>selectAccount(item.account.id).catch(handleError));
    body.appendChild(row);
  });
}
async function selectAccount(id){
  const state=await api("/v1/admin/accounts/"+encodeURIComponent(id));
  selected=state.account.id;
  $("editor").hidden=false;
  $("ed-email").textContent=state.account.email;
  const st=$("ed-status");st.textContent=state.account.active?"ACTIVE":"BANNED";st.className="pill "+(state.account.active?"ok":"bad");
  const passActive=state.balance.vaultPassExpiresAt&&new Date(state.balance.vaultPassExpiresAt)>new Date();
  $("ed-pass").hidden=!passActive;
  $("ed-adfree").hidden=!state.balance.removeAds;
  $("ed-id").textContent=state.account.id;
  $("ed-role").textContent=state.account.role;
  $("ed-install").textContent=state.linkedInstallId||"Not linked";
  $("ed-created").textContent=when(state.account.createdAt);
  $("ed-inventory").textContent=state.balance.vaultCoins+" coins \\u00B7 "+state.balance.bonusLives+" lives \\u00B7 "+state.balance.chainBoosts+" boosts \\u00B7 "+state.balance.vaultBursts+" bursts";
  $("ed-passuntil").textContent=state.balance.vaultPassExpiresAt?when(state.balance.vaultPassExpiresAt):"\\u2014";
  $("ed-tickets").textContent=String((state.supportTickets||[]).length);
  $("ban-button").textContent=state.account.active?"Ban User":"Unban User";
  $("ban-button").className=(state.account.active?"danger":"quiet")+" small";
  $("editor").scrollIntoView({behavior:"smooth",block:"nearest"});
}
$("search").onclick=()=>search().catch(handleError);
$("ban-button").onclick=async()=>{
  if(!selected)return;
  const reason=$("ban-reason").value.trim();
  if(!reason){status("Enter a reason for the ban/unban action.",true);return}
  const banning=$("ban-button").textContent.indexOf("Ban ")===0;
  try{
    await api("/v1/admin/accounts/"+encodeURIComponent(selected)+"/"+(banning?"disable":"enable"),{method:"POST",body:JSON.stringify({reason})});
    $("ban-reason").value="";
    status(banning?"User banned. Sessions revoked and sign-in blocked.":"User unbanned. Sign-in restored.");
    await Promise.all([selectAccount(selected),search(),loadAudit()]);
  }catch(error){handleError(error)}
};
$("reset-button").onclick=async()=>{
  if(!selected)return;
  const password=$("temp-password").value;
  const reason=$("reset-reason").value.trim();
  if(password.length<12){status("Temporary password must be at least 12 characters.",true);return}
  if(!reason){status("Enter a reason for the password reset.",true);return}
  try{
    await api("/v1/admin/accounts/"+encodeURIComponent(selected)+"/password",{method:"POST",body:JSON.stringify({password,reason})});
    $("temp-password").value="";$("reset-reason").value="";
    status("Temporary password set. All sessions revoked. Share it with the user securely.");
    await loadAudit();
  }catch(error){handleError(error)}
};
$("inventory-form").onsubmit=async event=>{
  event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget),delta={};
  ["vaultCoins","bonusLives","chainBoosts","vaultBursts"].forEach(key=>delta[key]=Number(data.get(key)||0));
  try{await api("/v1/admin/accounts/"+encodeURIComponent(selected)+"/inventory",{method:"POST",body:JSON.stringify({delta,reason:data.get("reason")})});status("Inventory updated.");await Promise.all([selectAccount(selected),search(),loadAudit()])}catch(error){handleError(error)}
};
$("entitlement-form").onsubmit=async event=>{
  event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget),payload={reason:data.get("reason")};
  if(data.get("removeAds")!=="")payload.removeAds=data.get("removeAds")==="true";
  if(data.get("clearVaultPass"))payload.vaultPassExpiresAt=null;else if(data.get("vaultPassExpiresAt"))payload.vaultPassExpiresAt=new Date(data.get("vaultPassExpiresAt")).toISOString();
  try{await api("/v1/admin/accounts/"+encodeURIComponent(selected)+"/entitlements",{method:"POST",body:JSON.stringify(payload)});status("Entitlements updated.");await Promise.all([selectAccount(selected),search(),loadAnalytics(),loadAudit()])}catch(error){handleError(error)}
};

// ---- Password resets ----
async function loadResets(){
  const data=await api("/v1/admin/password-resets");
  const body=$("reset-rows");body.replaceChildren();
  $("resets-empty").hidden=data.requests.length>0;
  data.requests.forEach(item=>{
    const row=document.createElement("tr");
    cell(row,item.email);
    pillCell(row,item.status.toUpperCase(),item.status==="pending"?"bad":"mut");
    cell(row,when(item.createdAt));
    if(item.status==="pending"){
      actionCell(row,"Mark Handled",async()=>{
        try{
          await api("/v1/admin/password-resets/"+encodeURIComponent(item.id)+"/handled",{method:"POST",body:"{}"});
          status("Reset request for "+item.email+" marked handled.");
          await Promise.all([loadResets(),loadAnalytics(),loadAudit()]);
        }catch(error){handleError(error)}
      });
    }else{cell(row,"")}
    body.appendChild(row);
  });
}
$("resets-refresh").onclick=()=>loadResets().then(()=>status("Reset requests refreshed.")).catch(handleError);

// ---- Audit log ----
async function loadAudit(){
  const data=await api("/v1/admin/audit?limit=50");
  const body=$("audit-rows");body.replaceChildren();
  $("audit-empty").hidden=data.entries.length>0;
  data.entries.forEach(entry=>{
    const row=document.createElement("tr");
    cell(row,when(entry.createdAt));
    cell(row,entry.adminEmail);
    cell(row,entry.action);
    cell(row,entry.targetAccountId);
    cell(row,entry.reason||"\\u2014");
    body.appendChild(row);
  });
}
$("audit-refresh").onclick=()=>loadAudit().then(()=>status("Audit log refreshed.")).catch(handleError);

// ---- Operations checks ----
async function runChecks(){
  const startedAt=Date.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  let ok=false;
  try{const response=await fetch("/health",{signal:controller.signal});await response.text().catch(()=> "");ok=response.status===200}catch{ok=false}
  finally{clearTimeout(timer)}
  $("health-state").innerHTML='<span class="pill '+(ok?"ok":"bad")+'">'+(ok?"ONLINE":"UNREACHABLE")+"</span>";
  $("health-latency").textContent=ok?(Date.now()-startedAt)+" ms":"\\u2014";
}
$("run-checks").onclick=()=>{status("Running checks...");Promise.all([runChecks(),loadAnalytics()]).then(()=>status("Checks complete.")).catch(handleError)};

// ---- Auth ----
async function refreshAll(){
  await Promise.all([
    loadAnalytics().catch(handleError),
    loadTickets().catch(()=>{}),
    loadEscalations().catch(()=>{}),
    search().catch(()=>{}),
    loadResets().catch(()=>{}),
    loadAudit().catch(()=>{}),
    runChecks().catch(()=>{})
  ]);
}
$("login-form").onsubmit=async event=>{
  event.preventDefault();
  const button=$("login-button");
  button.disabled=true;
  status("Signing in...");
  try{
    const result=await api("/v1/auth/login",{method:"POST",body:JSON.stringify({email:$("email").value,password:$("password").value,installId:"web-admin"})});
    $("password").value="";
    if(!result.state||result.state.account.role!=="admin"){
      const issued=result.token;
      if(issued){fetch("/v1/auth/logout",{method:"POST",headers:{Authorization:"Bearer "+issued}}).catch(()=>{})}
      showView("restricted");status("");
      return;
    }
    token=result.token;
    $("owner-email").textContent=result.state.account.email;
    showView("dashboard");status("Signed in.");
    await refreshAll();
  }catch(error){
    if(error&&error.name==="AccessError"){showView("restricted");status("")}
    else status(error.message,true);
  }finally{
    button.disabled=false;
  }
};
$("restricted-back").onclick=()=>{showView("login");status("")};
$("logout").onclick=async()=>{try{await api("/v1/auth/logout",{method:"POST"})}catch{}token="";selected=null;selectedTicket=null;showView("login");status("Signed out.")};
</script>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'"
      }
    }
  );
}
