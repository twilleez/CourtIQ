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
  renderShotStats();
  renderShotSyncNote();
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
    const p2Pct = pct(total.p2m, total.p2a);
    const p3Pct = pct(total.p3m, total.p3a);
    const ftPct  = pct(total.ftm, total.fta);
    return `
      <article class="player-card">
        <div class="player-top">
          <div class="player-id">
            <div class="badge">#${escapeHtml(player.num)}</div>
            <div>
              <div class="player-name">${escapeHtml(player.name)}</div>
              <div class="player-sub">${player.phone ? escapeHtml(player.phone) : "No phone"} · Q${String(activeQuarterKey())}</div>
            </div>
          </div>
          <div class="points">
            <div class="label">Points</div>
            <div class="value">${pointsOf(total)}</div>
          </div>
        </div>

        <!-- Game Totals Bar -->
        <div class="game-totals-bar">
          <div class="gtb-cell"><span class="gtb-v" style="color:var(--accent)">${pointsOf(total)}</span><span class="gtb-l">PTS</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#60a5fa">${total.p2m}/${total.p2a}</span><span class="gtb-l">2PT · ${p2Pct}%</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#f97316">${total.p3m}/${total.p3a}</span><span class="gtb-l">3PT · ${p3Pct}%</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#a78bfa">${total.ftm}/${total.fta}</span><span class="gtb-l">FT · ${ftPct}%</span></div>
          <div class="gtb-sep"></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#60a5fa">${total.reb}</span><span class="gtb-l">REB</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#22c55e">${total.ast}</span><span class="gtb-l">AST</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#ef4444">${total.tov}</span><span class="gtb-l">TOV</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#22d3ee">${total.stl}</span><span class="gtb-l">STL</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:#a78bfa">${total.blk}</span><span class="gtb-l">BLK</span></div>
          <div class="gtb-cell"><span class="gtb-v" style="color:${total.fouls>=5?'#ef4444':total.fouls>=4?'#fbbf24':'var(--muted)'}">${total.fouls}</span><span class="gtb-l">FOULS</span></div>
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
          <button class="btn btn-secondary sms-btn" data-player="${player.id}">📋 Copy Summary</button>
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
  sel.innerHTML = `<option value="">— Pick player —</option>` + state.players.map(p=>`<option value="${p.id}">#${escapeHtml(p.num)} ${escapeHtml(p.name)}</option>`).join("");
  if(state.players.some(p=>String(p.id)===String(current))) sel.value = current;
}
function renderShotSyncNote(){
  const note = byId("shotSyncNote");
  if(!note) return;
  const sel = byId("shotPlayer");
  const pid = Number(sel?.value);
  if(pid){
    const p = state.players.find(x=>x.id===pid);
    note.innerHTML = `<span class="live-badge">⚡ LIVE</span> Clicks add to <strong>${p ? escapeHtml(p.name) : "player"}</strong>'s stats`;
    note.style.color = "#22c55e";
  } else {
    note.textContent = "Select a player · clicks auto-update their stats";
    note.style.color = "";
  }
}
function renderShots(){
  const g = byId("shotLayer");
  g.innerHTML = state.shots.map(shot=>{
    // Color by detected zone: 2pt=blue, 3pt=orange, ft=gold; miss=red
    let color;
    if(shot.type === "miss")      color = "#ef4444";
    else if(shot.type === "ft")   color = "#fbbf24";
    else if(shot.detectedAs === "3pt") color = "#f97316";
    else                          color = "#22c55e";
    const symbol = shot.type === "miss" ? "✕" : shot.type === "ft" ? "F" : shot.detectedAs === "3pt" ? "3" : "2";
    return `<g>
      <circle cx="${shot.x}" cy="${shot.y}" r="8" fill="${color}44" stroke="${color}" stroke-width="1.8"/>
      <text x="${shot.x}" y="${shot.y+3.5}" text-anchor="middle" font-size="7.5" fill="${color}" font-family="DM Mono,monospace" font-weight="700">${symbol}</text>
    </g>`;
  }).join("");
  qsa(".pill[data-shot]").forEach(btn=>btn.classList.toggle("active", btn.dataset.shot === state.shotMode));
}
function renderShotStats(){
  // Aggregate shots for selected player (or all)
  const pid = Number(byId("shotPlayer")?.value);
  const relevant = pid ? state.shots.filter(s=>s.playerId===pid) : state.shots;
  const made2 = relevant.filter(s=>s.type==="made"&&s.detectedAs==="2pt").length;
  const att2  = relevant.filter(s=>s.type!=="ft"&&s.detectedAs==="2pt").length;
  const made3 = relevant.filter(s=>s.type==="made"&&s.detectedAs==="3pt").length;
  const att3  = relevant.filter(s=>s.type!=="ft"&&s.detectedAs==="3pt").length;
  const madeFt = relevant.filter(s=>s.type==="ft").length;
  const attFt  = madeFt; // FT mode always logs makes
  const totalMade = made2 + made3 + madeFt;
  const totalAtt  = att2 + att3 + attFt;
  const fg = totalAtt > 0 ? Math.round((totalMade/totalAtt)*100) : 0;
  const ss = (m,a) => `${m}/${a}`;
  byId("ss-fg").textContent = fg + "%";
  byId("ss-2pt").textContent = ss(made2, att2);
  byId("ss-3pt").textContent = ss(made3, att3);
  byId("ss-ft").textContent = ss(madeFt, attFt);
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
