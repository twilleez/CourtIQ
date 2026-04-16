import { state, makePlayer, pushHistory, undoLast, saveState, loadState, WELCOME_KEY } from "./state.js";
import { activeQuarterKey, totalPlayer, pointsOf, fgm, fga, currentGameSummary, validatePlayerInput, is3pt } from "./statsEngine.js";
import { render, toast, setAutosaveStatus } from "./ui.js";

const byId = id => document.getElementById(id);
const qsa = sel => Array.from(document.querySelectorAll(sel));

function teamMeta(){
  return {
    home: byId("homeTeam").value.trim() || "HOME",
    away: byId("awayTeam").value.trim() || "AWAY",
    date: byId("gameDate").value || new Date().toISOString().slice(0,10)
  };
}
function persist(){
  saveState(teamMeta());
  setAutosaveStatus("Autosaved");
  clearTimeout(persist._t);
  persist._t = setTimeout(()=>setAutosaveStatus("Autosave ready"), 900);
}
function rerender(){
  render(adjustStat, removePlayer, copyPlayerSummary, loadGameByReverseIndex, deleteGameByReverseIndex);
  persist();
}
function setMeta(meta){
  byId("homeTeam").value = meta.home || "HOME";
  byId("awayTeam").value = meta.away || "AWAY";
  byId("gameDate").value = meta.date || new Date().toISOString().slice(0,10);
}
function seedDefaults(){
  if(state.players.length) return;
  state.players.push(makePlayer("1","Player 1",""));
  state.players.push(makePlayer("2","Player 2",""));
  state.players.push(makePlayer("3","Player 3",""));
}
function addPlayer(){
  const num = byId("addNum").value.trim();
  const name = byId("addName").value.trim();
  const phone = byId("addPhone").value.trim();
  const err = validatePlayerInput(num, name);
  if(err){ toast(err); return; }
  pushHistory();
  state.players.push(makePlayer(num, name, phone));
  byId("addNum").value = "";
  byId("addName").value = "";
  byId("addPhone").value = "";
  rerender();
  toast("Player added.");
}
function adjustStat(id, stat, delta){
  const player = state.players.find(p=>p.id === id);
  if(!player) return;
  const q = player.q[activeQuarterKey()];
  if(!q || !(stat in q)) return;
  pushHistory();
  if(["p2m","p3m","ftm","reb","ast","tov","stl","blk","fouls"].includes(stat)){
    q[stat] = Math.max(0, q[stat] + delta);
    if(stat === "p2m" && delta > 0) q.p2a += 1;
    if(stat === "p3m" && delta > 0) q.p3a += 1;
    if(stat === "ftm" && delta > 0) q.fta += 1;
    if(stat === "p2m" && delta < 0 && q.p2a > q.p2m - delta) q.p2a = Math.max(q.p2m, q.p2a - 1);
    if(stat === "p3m" && delta < 0 && q.p3a > q.p3m - delta) q.p3a = Math.max(q.p3m, q.p3a - 1);
    if(stat === "ftm" && delta < 0 && q.fta > q.ftm - delta) q.fta = Math.max(q.ftm, q.fta - 1);
  } else {
    q[stat] = Math.max(0, q[stat] + delta);
    if(stat === "p2a") q.p2m = Math.min(q.p2m, q.p2a);
    if(stat === "p3a") q.p3m = Math.min(q.p3m, q.p3a);
    if(stat === "fta") q.ftm = Math.min(q.ftm, q.fta);
  }
  rerender();
}
function removePlayer(id){
  pushHistory();
  state.players = state.players.filter(p=>p.id !== id);
  state.shots = state.shots.filter(s=>s.playerId !== id);
  rerender();
  toast("Player removed.");
}
function newGame(){
  if(!confirm("Start a new game? Current unsaved live stats will be cleared.")) return;
  pushHistory();
  state.players = [];
  state.shots = [];
  state.nextId = 1;
  state.mode = "live";
  state.quarter = 1;
  setMeta({});
  seedDefaults();
  rerender();
  toast("New game ready.");
}
function saveGame(){
  pushHistory();
  const summary = currentGameSummary(teamMeta());
  const game = {
    ...teamMeta(),
    savedAt: new Date().toISOString(),
    summary,
    players: structuredClone(state.players),
    shots: structuredClone(state.shots)
  };
  state.games.push(game);
  persist();
  rerender();
  toast("Game saved.");
}
function loadGameByReverseIndex(reverseIndex){
  pushHistory();
  const actualIndex = state.games.length - 1 - reverseIndex;
  const game = state.games[actualIndex];
  if(!game) return;
  setMeta(game);
  state.players = structuredClone(game.players);
  state.shots = structuredClone(game.shots || []);
  state.nextId = Math.max(1, ...state.players.map(p=>p.id || 0)) + 1;
  rerender();
  toast("Saved game loaded.");
}
function deleteGameByReverseIndex(reverseIndex){
  pushHistory();
  const actualIndex = state.games.length - 1 - reverseIndex;
  state.games.splice(actualIndex,1);
  rerender();
  toast("Saved game deleted.");
}
function exportCSV(){
  const rows = [["Date","Home","Away","Player #","Player","PTS","REB","AST","TOV","STL","BLK","FOULS","FGM","FGA","3PM","3PA","FTM","FTA"]];
  const sourceGames = state.games.length ? state.games : [{
    ...teamMeta(),
    players: state.players
  }];
  sourceGames.forEach(game=>{
    game.players.forEach(player=>{
      const t = totalPlayer(player);
      rows.push([
        game.date, game.home, game.away, player.num, player.name,
        pointsOf(t), t.reb, t.ast, t.tov, t.stl, t.blk, t.fouls,
        fgm(t), fga(t), t.p3m, t.p3a, t.ftm, t.fta
      ]);
    });
  });
  const csv = rows.map(r=>r.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CourtIQ_${teamMeta().home}_vs_${teamMeta().away}_${teamMeta().date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV exported.");
}
function copyPlayerSummary(id){
  const player = state.players.find(p=>p.id===id);
  if(!player) return;
  const t = totalPlayer(player);
  const text = `${player.name} (#${player.num}) — ${pointsOf(t)} PTS, ${t.reb} REB, ${t.ast} AST, ${t.tov} TOV, ${t.stl} STL, ${t.blk} BLK. FG ${fgm(t)}/${fga(t)}.`;
  navigator.clipboard.writeText(text).then(()=>toast("Player summary copied."));
}
function openReport(){
  const games = state.games.length ? state.games : [{...teamMeta(), players: state.players, summary: currentGameSummary(teamMeta())}];
  const playerMap = new Map();
  games.forEach(game=>{
    game.players.forEach(p=>{
      const t = totalPlayer(p);
      const key = `${p.num}-${p.name}`;
      if(!playerMap.has(key)) playerMap.set(key, {num:p.num, name:p.name, games:0, pts:0, reb:0, ast:0, tov:0});
      const row = playerMap.get(key);
      row.games += 1;
      row.pts += pointsOf(t);
      row.reb += t.reb;
      row.ast += t.ast;
      row.tov += t.tov;
    });
  });
  const rows = Array.from(playerMap.values()).sort((a,b)=>b.pts-a.pts);
  byId("reportSummary").textContent = `${games.length} game(s) included.`;
  byId("reportTable").innerHTML = rows.length ? `
    <table style="width:100%; border-collapse:collapse">
      <thead><tr>
      <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">Player</th>
      <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">G</th>
      <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">PTS</th>
      <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">REB</th>
      <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">AST</th>
      <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">TOV</th>
      </tr></thead>
      <tbody>
      ${rows.map(r=>`
        <tr>
          <td style="padding:8px; border-bottom:1px solid rgba(255,255,255,.05)">#${escapeHtml(r.num)} ${escapeHtml(r.name)}</td>
          <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.05)">${r.games}</td>
          <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.05)">${r.pts}</td>
          <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.05)">${r.reb}</td>
          <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.05)">${r.ast}</td>
          <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.05)">${r.tov}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<div class="empty">No report data yet.</div>`;
  byId("reportDialog").showModal();
}
function undoAction(){
  const ok = undoLast();
  if(!ok){ toast("Nothing to undo."); return; }
  rerender();
  toast("Last action undone.");
}

// ── SHOT CHART ──
function onCourtTap(evt){
  const playerId = Number(byId("shotPlayer").value);
  if(!playerId) { toast("Choose a player first."); return; }
  const svg = byId("court");
  const pt = svg.createSVGPoint();
  const src = evt.touches ? evt.touches[0] : evt;
  pt.x = src.clientX;
  pt.y = src.clientY;
  const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
  const x = Math.max(8, Math.min(392, cursor.x));
  const y = Math.max(8, Math.min(352, cursor.y));

  const p = state.players.find(pl=>pl.id===playerId);
  if(!p) return;
  pushHistory();

  // Determine shot type — FT mode always FT; Made/Miss auto-detects 2 vs 3
  let shotType = state.shotMode; // "made" | "miss" | "ft"
  let detectedAs = null; // "2pt" | "3pt" | "ft"

  const q = p.q[activeQuarterKey()];
  if(shotType === "ft"){
    q.ftm += 1; q.fta += 1;
    detectedAs = "ft";
  } else {
    const three = is3pt(x, y);
    detectedAs = three ? "3pt" : "2pt";
    if(shotType === "made"){
      if(three){ q.p3m += 1; q.p3a += 1; }
      else     { q.p2m += 1; q.p2a += 1; }
    } else { // miss
      if(three){ q.p3a += 1; }
      else     { q.p2a += 1; }
    }
  }

  state.shots.push({ playerId, x, y, quarter: activeQuarterKey(), type: shotType, detectedAs });

  // Toast feedback
  const label = detectedAs === "ft" ? "FT" : detectedAs === "3pt" ? "3PT" : "2PT";
  const result = shotType === "miss" ? "miss" : "make";
  toast(`${p.name} — ${label} ${result}`);

  rerender();
}

// ── SHARE ──
function getShareUrl(){
  // Use current location if hosted, otherwise fall back to GitHub Pages URL
  const loc = window.location.href.split("?")[0].split("#")[0];
  if(loc.startsWith("file://")) return "https://twilleez.github.io/CourtIQ/";
  return loc;
}
function openShare(){
  const url = getShareUrl();
  byId("shareUrlText").textContent = url;
  byId("shareDialog").showModal();
}

// ── UPGRADE / PRO ──
function openUpgrade(){
  byId("upgradeDialog").showModal();
}
function updateProUI(){
  const proLabel = byId("proLabel");
  if(state.isPro){
    proLabel.innerHTML = '<span style="color:var(--gold)">⭐ Pro Active</span>';
  } else {
    proLabel.innerHTML = 'Free plan · <a href="#" id="upgradeLink" style="color:var(--accent);text-decoration:none">Upgrade to Pro ⭐</a>';
    byId("upgradeLink")?.addEventListener("click", e=>{ e.preventDefault(); openUpgrade(); });
  }
}

function escapeHtml(str){
  return String(str ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

function wire(){
  // Mode / quarter / shot type toggles
  qsa("#modeTabs .seg").forEach(btn=>btn.addEventListener("click", ()=>{ state.mode = btn.dataset.mode; rerender(); }));
  qsa("#quarterTabs .qbtn").forEach(btn=>btn.addEventListener("click", ()=>{ state.quarter = btn.dataset.q === "OT" ? "OT" : Number(btn.dataset.q); rerender(); }));
  qsa(".pill[data-shot]").forEach(btn=>btn.addEventListener("click", ()=>{ state.shotMode = btn.dataset.shot; rerender(); }));

  // Player management
  byId("addBtn").addEventListener("click", addPlayer);
  byId("addName").addEventListener("keydown", e=>{ if(e.key==="Enter") addPlayer(); });

  // Header actions
  byId("saveBtn").addEventListener("click", saveGame);
  byId("newBtn").addEventListener("click", newGame);
  byId("undoBtn").addEventListener("click", undoAction);
  byId("csvBtn").addEventListener("click", exportCSV);
  byId("reportBtn").addEventListener("click", openReport);
  byId("shareBtn").addEventListener("click", openShare);
  byId("upgradeBtn").addEventListener("click", openUpgrade);
  byId("toggleModeBtn").addEventListener("click", ()=>{ state.mode = state.mode === "live" ? "advanced" : "live"; rerender(); });

  // Mobile footer
  byId("saveBtnMobile").addEventListener("click", saveGame);
  byId("newBtnMobile").addEventListener("click", newGame);
  byId("undoBtnMobile").addEventListener("click", undoAction);
  byId("shareBtnMobile").addEventListener("click", openShare);

  // Report dialog
  byId("printReportBtn").addEventListener("click", ()=>window.print());
  byId("closeReportBtn").addEventListener("click", ()=>byId("reportDialog").close());

  // Share dialog
  byId("closeShareBtn").addEventListener("click", ()=>byId("shareDialog").close());
  byId("sc-native").addEventListener("click", async ()=>{
    const url = getShareUrl();
    if(navigator.share){
      try{ await navigator.share({ title:"CourtIQ", text:"Free basketball stat tracker for coaches!", url }); }
      catch(e){ if(e.name !== "AbortError") copyUrl(); }
    } else { copyUrl(); }
  });
  byId("sc-copy").addEventListener("click", copyUrl);
  byId("copyUrlBtn").addEventListener("click", copyUrl);
  byId("sc-sms").addEventListener("click", ()=>{
    const url = getShareUrl();
    const msg = encodeURIComponent("Check out CourtIQ — free basketball stat tracker: " + url);
    window.location.href = `sms:?body=${msg}`;
  });
  byId("sc-email").addEventListener("click", ()=>{
    const url = getShareUrl();
    const sub = encodeURIComponent("CourtIQ — Basketball Stat Tracker");
    const body = encodeURIComponent(`Hey Coach,\n\nCheck out CourtIQ — a free basketball stat tracker that works on any phone or tablet.\n\n${url}\n\nNo download needed — just open the link and start tracking!`);
    window.location.href = `mailto:?subject=${sub}&body=${body}`;
  });

  // Welcome dialog
  byId("startBtn").addEventListener("click", ()=>byId("welcomeDialog").close());
  byId("dismissWelcomeBtn").addEventListener("click", ()=>byId("welcomeDialog").close());

  // Upgrade dialog
  byId("closeUpgradeBtn").addEventListener("click", ()=>byId("upgradeDialog").close());
  byId("checkoutBtn").addEventListener("click", ()=>{
    // Stripe checkout — replace with real link when ready
    toast("Redirecting to checkout…");
    setTimeout(()=>{ window.open("https://buy.stripe.com/test_placeholder", "_blank"); }, 600);
  });
  byId("activateDemoBtn").addEventListener("click", e=>{
    e.preventDefault();
    state.isPro = true;
    localStorage.setItem("courtiq_pro_demo", "1");
    byId("upgradeDialog").close();
    updateProUI();
    toast("⭐ Pro demo activated!");
  });

  // Shot chart
  byId("court").addEventListener("click", onCourtTap);
  byId("court").addEventListener("touchend", e=>{ e.preventDefault(); onCourtTap(e); }, {passive:false});
  byId("shotPlayer").addEventListener("change", ()=>{ rerender(); });

  // Meta inputs
  byId("homeTeam").addEventListener("input", persist);
  byId("awayTeam").addEventListener("input", persist);
  byId("gameDate").addEventListener("input", persist);

  // Upgrade link in header
  byId("upgradeLink")?.addEventListener("click", e=>{ e.preventDefault(); openUpgrade(); });

  // Close dialogs on backdrop click
  ["shareDialog","upgradeDialog","reportDialog","welcomeDialog"].forEach(id=>{
    byId(id).addEventListener("click", e=>{ if(e.target === byId(id)) byId(id).close(); });
  });
}

function copyUrl(){
  const url = getShareUrl();
  navigator.clipboard.writeText(url)
    .then(()=>toast("🔗 Link copied!"))
    .catch(()=>{
      const ta = document.createElement("textarea");
      ta.value = url; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast("🔗 Link copied!");
    });
}

function init(){
  byId("gameDate").value = new Date().toISOString().slice(0,10);
  loadState(setMeta);
  seedDefaults();
  wire();
  rerender();
  updateProUI();
  if(!localStorage.getItem(WELCOME_KEY)){
    byId("welcomeDialog").showModal();
    localStorage.setItem(WELCOME_KEY, "1");
  }
}
init();
