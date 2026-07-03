export function adminPage(): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VaultPop Admin</title>
<style>
  :root{color-scheme:dark;font:15px/1.45 system-ui;background:#080b12;color:#f7f9ff}
  *{box-sizing:border-box}body{margin:0}header,main{padding:20px;max-width:1100px;margin:auto}
  header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #283247}
  h1,h2{margin:0 0 12px}section{padding:20px 0;border-bottom:1px solid #283247}
  form,.row{display:flex;flex-wrap:wrap;gap:10px;align-items:end}
  label{display:grid;gap:5px;color:#aebbd2}input,select,button{min-height:44px;border:1px solid #3a465e;border-radius:6px;background:#111827;color:#fff;padding:10px 12px}
  button{border-color:#eac15b;font-weight:700;cursor:pointer}button:disabled{opacity:.45}
  table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;padding:10px;border-bottom:1px solid #283247;vertical-align:top}
  th{color:#aebbd2}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#111827;padding:12px;border-radius:6px}
  .status{color:#70d8ff}.danger{border-color:#f36f7f}.muted{color:#aebbd2}
</style>
<header><div><h1>VaultPop Admin</h1><div class="muted">Owner operations</div></div><button id="logout" hidden>Log Out</button></header>
<main>
  <section id="login-panel">
    <h2>Admin Sign In</h2>
    <form id="login-form">
      <label>Email<input id="email" type="email" autocomplete="username" required></label>
      <label>Password<input id="password" type="password" autocomplete="current-password" required></label>
      <button>Sign In</button>
    </form>
  </section>
  <section id="workspace" hidden>
    <div class="row">
      <label>Search<input id="query" placeholder="Email, account ID, or install ID"></label>
      <label>Role<select id="role"><option value="">All</option><option>player</option><option>reviewer</option><option>admin</option></select></label>
      <button id="search">Search</button>
    </div>
    <div id="accounts"></div>
    <section id="editor" hidden>
      <h2>Account State</h2>
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
    </section>
    <section><h2>Audit Log</h2><button id="refresh-audit">Refresh</button><pre id="audit"></pre></section>
  </section>
  <p id="status" class="status" role="status"></p>
</main>
<script>
let token="",selected="";
const $=id=>document.getElementById(id);
async function api(path,options={}){
  const response=await fetch(path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.headers||{})}});
  const body=await response.json();
  if(!response.ok)throw new Error(body.error||"Request failed.");
  return body;
}
function status(message){$("status").textContent=message}
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
    button.textContent="Manage";button.onclick=()=>selectAccount(item.account.id);action.appendChild(button);row.appendChild(action);body.appendChild(row);
  });
  table.appendChild(body);$("accounts").replaceChildren(table);
}
async function selectAccount(id){
  selected=id;const state=await api("/v1/admin/accounts/"+id);$("state").textContent=JSON.stringify(state,null,2);$("editor").hidden=false;
}
async function audit(){$("audit").textContent=JSON.stringify((await api("/v1/admin/audit")).entries,null,2)}
$("login-form").onsubmit=async event=>{
  event.preventDefault();
  try{
    const result=await api("/v1/auth/login",{method:"POST",body:JSON.stringify({email:$("email").value,password:$("password").value,installId:"web-admin"})});
    if(result.state.account.role!=="admin")throw new Error("Admin role required.");
    token=result.token;$("password").value="";$("login-panel").hidden=true;$("workspace").hidden=false;$("logout").hidden=false;status("Signed in.");await search();await audit();
  }catch(error){status(error.message)}
};
$("logout").onclick=async()=>{try{await api("/v1/auth/logout",{method:"POST"})}catch{}token="";selected="";$("workspace").hidden=true;$("login-panel").hidden=false;$("logout").hidden=true;status("Signed out.")};
$("search").onclick=()=>search().catch(error=>status(error.message));
$("refresh-audit").onclick=()=>audit().catch(error=>status(error.message));
$("inventory-form").onsubmit=async event=>{
  event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget),delta={};
  ["vaultCoins","bonusLives","chainBoosts","vaultBursts"].forEach(key=>delta[key]=Number(data.get(key)||0));
  try{await api("/v1/admin/accounts/"+selected+"/inventory",{method:"POST",body:JSON.stringify({delta,reason:data.get("reason")})});status("Inventory updated.");await selectAccount(selected);await search();await audit()}catch(error){status(error.message)}
};
$("entitlement-form").onsubmit=async event=>{
  event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget),payload={reason:data.get("reason")};
  if(data.get("removeAds")!=="")payload.removeAds=data.get("removeAds")==="true";
  if(data.get("clearVaultPass"))payload.vaultPassExpiresAt=null;else if(data.get("vaultPassExpiresAt"))payload.vaultPassExpiresAt=new Date(data.get("vaultPassExpiresAt")).toISOString();
  try{await api("/v1/admin/accounts/"+selected+"/entitlements",{method:"POST",body:JSON.stringify(payload)});status("Entitlements updated.");await selectAccount(selected);await search();await audit()}catch(error){status(error.message)}
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
