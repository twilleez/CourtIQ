
import { state } from "./state.js";
import { activeQuarterKey, totalPlayer, totalTeam, pointsOf, fgm, fga, pct, benchInsights } from "./statsEngine.js";

const byId = id => document.getElementById(id);
const qsa = sel => Array.from(document.querySelectorAll(sel));

export function toast(msg){
  const el = byId("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove("show"), 1800);
}

export function setAutosaveStatus(msg){
  const el = byId("autosaveStatus");
  if(el) el.textContent = msg;
}

export function render(onAdjust, onDelete, onCopy, onLoadGame, onDeleteGame){
  renderMode();
  renderQuarter();
  renderSummary();
  renderPlayers(onAdjust, onDelete, onCopy);
  renderInsights();
  renderShotPlayerOptions();
  renderShots();
  renderHistory(onLoadGame, onDeleteGame);
}

function renderMode(){
  qsa("#modeTabs .seg").forEach(btn=>btn.classList.toggle("active", btn.dataset.mode === state.mode));
}
function renderQuarter(){
  qsa("#quarterTabs .qbtn").forEach(btn=>btn.classList.toggle("active", String(btn.dataset.q) === String(state.quarter)));
}
function renderSummary(){
  const t = totalTeam();
  byId("teamPts").textContent = pointsOf(t);
  byId("teamReb").textContent = t.reb;
  byId("teamAst").textContent = t.ast;
  byId("teamTov").textContent = t.tov;
  byId("teamFg").textContent = `${pct(fgm(t), fga(t))}%`;
  byId("team3p").textContent = `${pct(t.p3m, t.p3a)}%`;
}
function renderPlayers(onAdjust, onDelete, onCopy){
  const container = byId("players");
  if(!state.players.length){
    container.innerHTML = `<div class="empty">No players yet. Add a player below to start tracking.</div>`;
    return;
  }
  const advanced = state.mode === "advanced";
  container.innerHTML = state.players.map(player=>{
    const total = totalPlayer(player);
    const quarterStats = player.q[activeQuarterKey()];
    return `
      <article class="player-card">
        <div class="player-top">
          <div class="player-id">
            <div class="badge">#${escapeHtml(player.num)}</div>
            <div>
              <div class="player-name">${escapeHtml(player.name)}</div>
              <div class="player-sub">${player.phone ? escapeHtml(player.phone) : "No phone saved"} · Quarter ${String(activeQuarterKey())}</div>
            </div>
          </div>
          <div class="points">
            <div class="label">Points</div>
            <div class="value">${pointsOf(total)}</div>
          </div>
        </div>

        <div class="live-grid">
          ${statTile(player.id, "reb", "Reb", quarterStats.reb)}
          ${statTile(player.id, "ast", "Ast", quarterStats.ast)}
          ${statTile(player.id, "tov", "Tov", quarterStats.tov)}
          ${statTile(player.id, "stl", "Stl", quarterStats.stl)}
        </div>

        ${advanced ? `
        <div class="advanced-grid">
          ${shotCounter(player.id, "p2m", "Made 2PT", quarterStats.p2m)}
          ${shotCounter(player.id, "p2a", "2PT Attempts", quarterStats.p2a)}
          ${shotCounter(player.id, "p3m", "Made 3PT", quarterStats.p3m)}
          ${shotCounter(player.id, "p3a", "3PT Attempts", quarterStats.p3a)}
          ${shotCounter(player.id, "ftm", "Made FT", quarterStats.ftm)}
          ${shotCounter(player.id, "fta", "FT Attempts", quarterStats.fta)}
          ${shotCounter(player.id, "blk", "Blocks", quarterStats.blk)}
          ${shotCounter(player.id, "fouls", "Fouls", quarterStats.fouls)}
          <div class="mini">
            <h4>Quarter Shooting</h4>
            <div>FG: <strong>${fgm(quarterStats)}/${fga(quarterStats)}</strong></div>
            <div>FG%: <strong>${pct(fgm(quarterStats), fga(quarterStats))}%</strong></div>
            <div>3PT%: <strong>${pct(quarterStats.p3m, quarterStats.p3a)}%</strong></div>
            <div>FT: <strong>${quarterStats.ftm}/${quarterStats.fta}</strong></div>
          </div>
        </div>` : ""}

        <div class="small-actions" style="margin-top:12px">
          <button class="btn btn-secondary sms-btn" data-player="${player.id}">Copy Summary</button>
          <button class="btn btn-danger delete-btn" data-player="${player.id}">Remove</button>
        </div>
      </article>`;
  }).join("");

  qsa(".stepper button").forEach(btn=>btn.addEventListener("click",()=>{
    onAdjust(Number(btn.dataset.player), btn.dataset.stat, Number(btn.dataset.delta));
  }));
  qsa(".delete-btn").forEach(btn=>btn.addEventListener("click",()=>onDelete(Number(btn.dataset.player))));
  qsa(".sms-btn").forEach(btn=>btn.addEventListener("click",()=>onCopy(Number(btn.dataset.player))));
}
function statTile(id, stat, label, value){
  return `
    <div class="stat-tile">
      <div class="stat-header">
        <div class="stat-name">${label}</div>
        <div class="stat-val">${value}</div>
      </div>
      <div class="stepper">
        <button class="minus" data-player="${id}" data-stat="${stat}" data-delta="-1">−</button>
        <div class="display">${value}</div>
        <button class="plus" data-player="${id}" data-stat="${stat}" data-delta="1">+</button>
      </div>
    </div>`;
}
function shotCounter(id, stat, label, value){
  return `
    <div class="mini">
      <h4>${label}</h4>
      <div class="stepper">
        <button class="minus" data-player="${id}" data-stat="${stat}" data-delta="-1">−</button>
        <div class="display">${value}</div>
        <button class="plus" data-player="${id}" data-stat="${stat}" data-delta="1">+</button>
      </div>
    </div>`;
}
function renderInsights(){
  const box = byId("insights");
  const insights = benchInsights();
  box.innerHTML = insights.map(i=>`<div class="insight"><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(i.body)}</span></div>`).join("");
}
function renderShotPlayerOptions(){
  const sel = byId("shotPlayer");
  const current = sel.value;
  sel.innerHTML = state.players.map(p=>`<option value="${p.id}">#${escapeHtml(p.num)} ${escapeHtml(p.name)}</option>`).join("");
  if(state.players.some(p=>String(p.id)===String(current))) sel.value = current;
}
function renderShots(){
  const g = byId("shotLayer");
  g.innerHTML = state.shots.map(shot=>{
    const color = shot.type === "made" ? "#22c55e" : shot.type === "miss" ? "#ef4444" : shot.type === "three" ? "#60a5fa" : "#fbbf24";
    return `<circle cx="${shot.x}" cy="${shot.y}" r="5.3" fill="${color}" stroke="rgba(0,0,0,.28)" stroke-width="1.1"></circle>`;
  }).join("");
  qsa(".pill[data-shot]").forEach(btn=>btn.classList.toggle("active", btn.dataset.shot === state.shotMode));
}
function renderHistory(onLoadGame, onDeleteGame){
  const wrap = byId("history");
  if(!state.games.length){
    wrap.innerHTML = `<div class="empty">No saved games yet. Save your current game to build history.</div>`;
    return;
  }
  wrap.innerHTML = state.games.slice().reverse().map((game, index)=>`
    <div class="history-card">
      <div class="history-top">
        <div>
          <strong>${escapeHtml(game.home)} vs ${escapeHtml(game.away)}</strong>
          <div class="history-meta">${escapeHtml(game.date)} · ${game.players.length} players</div>
        </div>
        <div><strong>${game.summary.points} pts</strong></div>
      </div>
      <div class="history-meta" style="margin-top:8px">REB ${game.summary.rebounds} · AST ${game.summary.assists} · TOV ${game.summary.turnovers} · FG ${game.summary.fgPct}%</div>
      <div class="small-actions" style="margin-top:10px">
        <button class="btn btn-secondary load-game" data-idx="${index}">Load</button>
        <button class="btn btn-danger delete-game" data-idx="${index}">Delete</button>
      </div>
    </div>
  `).join("");

  qsa(".load-game").forEach(btn=>btn.addEventListener("click", ()=>onLoadGame(Number(btn.dataset.idx))));
  qsa(".delete-game").forEach(btn=>btn.addEventListener("click", ()=>onDeleteGame(Number(btn.dataset.idx))));
}
function escapeHtml(str){
  return String(str ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
