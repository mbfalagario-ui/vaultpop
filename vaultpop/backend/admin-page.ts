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

export function adminPage(): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VaultPop Admin Console</title>
<style>
  :root{color-scheme:dark;font:15px/1.5 system-ui;background:${PALETTE.background};color:${PALETTE.textPrimary}}
  *{box-sizing:border-box}
  [hidden]{display:none!important}
  body{margin:0;min-height:100vh;background:
    radial-gradient(700px 340px at 15% -10%, #FFC93E14, transparent),
    radial-gradient(700px 340px at 95% 0%, #9D6BFF14, transparent),
    ${PALETTE.background}}
  header,main{max-width:1100px;margin:auto;padding:20px}
  header{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .brand{display:flex;align-items:center;gap:12px}
  .brand .coin{width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 32% 30%, #FFE18F, ${PALETTE.gold} 55%, #B8770B);box-shadow:0 0 18px #FFC93E55;display:grid;place-items:center;color:#140F02;font-weight:900;font-size:18px}
  h1{margin:0;font-size:19px;letter-spacing:.4px}
  h2{margin:0;font-size:15px}
  .eyebrow{font-size:10px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:${PALETTE.textMuted}}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}
  .card{background:${PALETTE.surface};border:1px solid ${PALETTE.border};border-radius:16px;padding:18px;display:grid;gap:12px;align-content:start;box-shadow:0 12px 28px #00000055}
  .card.wide{grid-column:1/-1}
  .card-head{display:flex;align-items:center;gap:10px}
  .dot{width:8px;height:8px;border-radius:50%}
  .kv{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid ${PALETTE.border};padding:7px 0;font-size:13.5px}
  .kv:last-child{border-bottom:none}
  .kv .k{color:${PALETTE.textSecondary}}
  .kv .v{font-weight:700;text-align:right;overflow-wrap:anywhere}
  .pill{display:inline-block;border-radius:999px;padding:3px 10px;font-size:10.5px;font-weight:900;letter-spacing:1px}
  .pill.ok{background:#3BE88C22;border:1px solid #3BE88C66;color:${PALETTE.emerald}}
  .pill.bad{background:#FF4D8D22;border:1px solid #FF4D8D66;color:${PALETTE.ruby}}
  .pill.gold{background:#FFC93E22;border:1px solid #FFC93E66;color:${PALETTE.gold}}
  form,.row{display:flex;flex-wrap:wrap;gap:10px;align-items:end}
  label{display:grid;gap:5px;color:${PALETTE.textSecondary};font-size:12.5px}
  input,select,button{min-height:44px;border:1px solid ${PALETTE.border};border-radius:10px;background:${PALETTE.raised};color:${PALETTE.textPrimary};padding:10px 12px;font-size:14px}
  button{border-color:#FFC93E88;background:linear-gradient(180deg,#FFC93E,#E9A81E);color:#140F02;font-weight:800;cursor:pointer}
  button.quiet{background:${PALETTE.raised};border-color:${PALETTE.border};color:${PALETTE.textSecondary}}
  button:disabled{opacity:.45;cursor:default}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:13.5px}
  th,td{text-align:left;padding:9px 8px;border-bottom:1px solid ${PALETTE.border};vertical-align:top}
  th{color:${PALETTE.textMuted};font-size:11px;letter-spacing:1.2px;text-transform:uppercase}
  pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#04030C;border:1px solid ${PALETTE.border};padding:12px;border-radius:10px;font-size:12.5px;color:${PALETTE.textSecondary};margin:0}
  .status{color:${PALETTE.cyan};font-size:13.5px;min-height:20px;font-weight:700}
  .status.error{color:${PALETTE.ruby}}
  .muted{color:${PALETTE.textMuted};font-size:12.5px}
  .restricted{max-width:460px;margin:40px auto;text-align:center}
  .restricted .lock{font-size:36px}
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
      <div class="card" id="owner-card">
        <div class="card-head"><span class="dot" style="background:${PALETTE.gold};box-shadow:0 0 8px ${PALETTE.gold}"></span><h2>Owner Status</h2><span class="pill gold" style="margin-left:auto">OWNER</span></div>
        <div>
          <div class="kv"><span class="k">Signed in as</span><span class="v" id="owner-email">&mdash;</span></div>
          <div class="kv"><span class="k">Role</span><span class="v" id="owner-role">&mdash;</span></div>
          <div class="kv"><span class="k">Session</span><span class="v" id="owner-session">&mdash;</span></div>
          <div class="kv"><span class="k">Console</span><span class="v">Build 11 patch</span></div>
        </div>
      </div>
      <div class="card" id="ops-card">
        <div class="card-head"><span class="dot" style="background:${PALETTE.cyan};box-shadow:0 0 8px ${PALETTE.cyan}"></span><h2>Operations Health</h2><button id="run-checks" class="quiet" style="margin-left:auto;min-height:36px;padding:6px 12px">Run Checks</button></div>
        <div>
          <div class="kv"><span class="k">API health</span><span class="v" id="health-state">Checking&hellip;</span></div>
          <div class="kv"><span class="k">Latency</span><span class="v" id="health-latency">&mdash;</span></div>
          <div class="kv"><span class="k">Accounts service</span><span class="v" id="accounts-state">Checking&hellip;</span></div>
        </div>
      </div>
      <div class="card" id="monetization-card">
        <div class="card-head"><span class="dot" style="background:${PALETTE.violet};box-shadow:0 0 8px ${PALETTE.violet}"></span><h2>Monetization Status</h2></div>
        <div>
          <div class="kv"><span class="k">Purchase verification</span><span class="v" id="verify-state">Checking&hellip;</span></div>
          <div class="kv"><span class="k">Rewarded SSV endpoint</span><span class="v" id="ssv-state">Checking&hellip;</span></div>
          <div class="kv"><span class="k">Production SSV URL</span><span class="v">/support</span></div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card wide">
        <div class="card-head"><span class="dot" style="background:${PALETTE.emerald};box-shadow:0 0 8px ${PALETTE.emerald}"></span><h2>Support &amp; Account Tools</h2></div>
        <div class="row">
          <label>Search<input id="query" placeholder="Email, account ID, or install ID"></label>
          <label>Role<select id="role"><option value="">All</option><option>player</option><option>reviewer</option><option>admin</option></select></label>
          <button id="search">Search</button>
        </div>
        <div id="accounts"></div>
        <div id="editor" hidden style="display:grid;gap:12px">
          <div class="eyebrow">Account state</div>
          <pre id="state"></pre>
          <form id="inventory-form">
            <label>Vault Coins delta<input name="vaultCoins" type="number" value="0"></label>
            <label>Bonus Lives delta<input name="bonusLives" type="number" value="0"></label>
            <label>Chain Boosts delta<input name="chainBoosts" type="number" value="0"></label>
            <label>Vault Bursts delta<input name="vaultBursts" type="number" value="0"></label>
            <label>Reason<input name="reason" required></label>
            <button>Apply Inventory</button>
          </form>
          <form id="entitlement-form">
            <label>Remove Ads<select name="removeAds"><option value="">No change</option><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
            <label>VaultPass expiration<input name="vaultPassExpiresAt" type="datetime-local"></label>
            <label><input name="clearVaultPass" type="checkbox"> Clear VaultPass</label>
            <label>Reason<input name="reason" required></label>
            <button>Apply Entitlements</button>
          </form>
        </div>
        <div class="row" style="justify-content:space-between">
          <div class="eyebrow">Audit log</div>
          <button id="refresh-audit" class="quiet" style="min-height:36px;padding:6px 12px">Refresh</button>
        </div>
        <pre id="audit"></pre>
      </div>
    </div>
  </section>
  <p id="status" class="status" role="status"></p>
</main>
<script>
let token="",selected="";
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

// Read-only probe that never throws: used by the health/monetization cards.
async function probe(path,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  const startedAt=Date.now();
  try{
    const response=await fetch(path,{...options,signal:controller.signal});
    await response.text().catch(()=> "");
    return{reachable:true,status:response.status,ms:Date.now()-startedAt};
  }catch{
    return{reachable:false,status:0,ms:Date.now()-startedAt};
  }finally{
    clearTimeout(timer);
  }
}

function status(message,isError){const node=$("status");node.textContent=message||"";node.className=isError?"status error":"status"}
function setState(id,text,ok){const node=$(id);node.innerHTML='<span class="pill '+(ok?"ok":"bad")+'">'+text+"</span>"}

function showView(view){
  $("login-panel").hidden=view!=="login";
  $("restricted-panel").hidden=view!=="restricted";
  $("workspace").hidden=view!=="dashboard";
  $("logout").hidden=view!=="dashboard";
}

async function runChecks(){
  const health=await probe("/health");
  setState("health-state",health.reachable&&health.status===200?"ONLINE":"UNREACHABLE",health.reachable&&health.status===200);
  $("health-latency").textContent=health.reachable?health.ms+" ms":"\\u2014";
  // Empty-body probe: a 400 rejection proves the verifier is live and fail-closed.
  const verify=await probe("/v1/purchases/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  setState("verify-state",verify.reachable&&verify.status===400?"LIVE \\u00B7 FAIL-CLOSED":"UNREACHABLE",verify.reachable&&verify.status===400);
  const ssv=await probe("/api/ads/ssv_callback");
  setState("ssv-state",ssv.reachable&&ssv.status===200?"READY \\u00B7 FAIL-CLOSED":"UNREACHABLE",ssv.reachable&&ssv.status===200);
  const accounts=await probe("/v1/admin/accounts",{headers:token?{Authorization:"Bearer "+token}:{}});
  setState("accounts-state",accounts.reachable&&accounts.status===200?"ONLINE":"DEGRADED",accounts.reachable&&accounts.status===200);
}

async function search(){
  const data=await api("/v1/admin/accounts?q="+encodeURIComponent($("query").value)+"&role="+encodeURIComponent($("role").value));
  const table=document.createElement("table");
  table.innerHTML="<thead><tr><th>Email</th><th>Role</th><th>Install</th><th>Inventory</th><th></th></tr></thead>";
  const body=document.createElement("tbody");
  data.accounts.forEach(item=>{
    const row=document.createElement("tr");
    [item.account.email,item.account.role,item.linkedInstallId||"Not linked",
      item.balance.vaultCoins+" coins; "+item.balance.bonusLives+"/"+item.balance.chainBoosts+"/"+item.balance.vaultBursts+" boosters"
    ].forEach(value=>{const cell=document.createElement("td");cell.textContent=value;row.appendChild(cell)});
    const action=document.createElement("td"),button=document.createElement("button");
    button.textContent="Manage";button.className="quiet";button.style.minHeight="36px";button.onclick=()=>selectAccount(item.account.id).catch(error=>status(error.message,true));action.appendChild(button);row.appendChild(action);body.appendChild(row);
  });
  table.appendChild(body);$("accounts").replaceChildren(table);
}
async function selectAccount(id){
  selected=id;const state=await api("/v1/admin/accounts/"+id);$("state").textContent=JSON.stringify(state,null,2);$("editor").hidden=false;
}
async function audit(){
  const entries=(await api("/v1/admin/audit")).entries;
  $("audit").textContent=entries.length?JSON.stringify(entries,null,2):"No audit entries yet.";
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
      // Revoke the non-admin session immediately and show Restricted Access.
      const issued=result.token;
      if(issued){fetch("/v1/auth/logout",{method:"POST",headers:{Authorization:"Bearer "+issued}}).catch(()=>{})}
      showView("restricted");status("");
      return;
    }
    token=result.token;
    $("owner-email").textContent=result.state.account.email;
    $("owner-role").textContent="Owner (admin)";
    $("owner-session").textContent="Active until "+new Date(result.expiresAt).toLocaleString();
    showView("dashboard");status("Signed in.");
    await Promise.all([
      runChecks().catch(()=>{}),
      search().catch(error=>status(error.message,true)),
      audit().catch(()=>{$("audit").textContent="Audit log is unavailable right now."})
    ]);
  }catch(error){
    if(error.name==="AccessError"){showView("restricted");status("")}
    else status(error.message,true);
  }finally{
    button.disabled=false;
  }
};
$("restricted-back").onclick=()=>{showView("login");status("")};
$("logout").onclick=async()=>{try{await api("/v1/auth/logout",{method:"POST"})}catch{}token="";selected="";showView("login");status("Signed out.")};
$("search").onclick=()=>search().catch(error=>handleError(error));
$("refresh-audit").onclick=()=>audit().catch(error=>handleError(error));
$("run-checks").onclick=()=>{status("Running checks...");runChecks().then(()=>status("Checks complete.")).catch(()=>status("Checks could not finish.",true))};
function handleError(error){
  if(error.name==="AccessError"){token="";selected="";showView("login");status("Your session ended. Sign in again.",true)}
  else status(error.message,true);
}
$("inventory-form").onsubmit=async event=>{
  event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget),delta={};
  ["vaultCoins","bonusLives","chainBoosts","vaultBursts"].forEach(key=>delta[key]=Number(data.get(key)||0));
  try{await api("/v1/admin/accounts/"+selected+"/inventory",{method:"POST",body:JSON.stringify({delta,reason:data.get("reason")})});status("Inventory updated.");await selectAccount(selected);await search();await audit()}catch(error){handleError(error)}
};
$("entitlement-form").onsubmit=async event=>{
  event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget),payload={reason:data.get("reason")};
  if(data.get("removeAds")!=="")payload.removeAds=data.get("removeAds")==="true";
  if(data.get("clearVaultPass"))payload.vaultPassExpiresAt=null;else if(data.get("vaultPassExpiresAt"))payload.vaultPassExpiresAt=new Date(data.get("vaultPassExpiresAt")).toISOString();
  try{await api("/v1/admin/accounts/"+selected+"/entitlements",{method:"POST",body:JSON.stringify(payload)});status("Entitlements updated.");await selectAccount(selected);await search();await audit()}catch(error){handleError(error)}
};
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
