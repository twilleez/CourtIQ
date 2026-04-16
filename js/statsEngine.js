import { state, eq } from "./state.js";

export function activeQuarterKey(){
  return state.quarter;
}

export function totalPlayer(player){
  const t = eq();
  for (const key of [1,2,3,4,"OT"]) {
    const s = player.q[key] || eq();
    for (const k in t) t[k] += s[k];
  }
  return t;
}

export function totalTeam(){
  const t = eq();
  state.players.forEach(p=>{
    const s = totalPlayer(p);
    for (const k in t) t[k] += s[k];
  });
  return t;
}

export function pointsOf(stats){
  return stats.p2m*2 + stats.p3m*3 + stats.ftm;
}

export function fgm(stats){ return stats.p2m + stats.p3m; }
export function fga(stats){ return stats.p2a + stats.p3a; }
export function pct(m,a){ return a ? Math.round((m/a)*100) : 0; }

export function currentGameSummary(meta){
  const t = totalTeam();
  return {
    ...meta,
    players: state.players.length,
    points: pointsOf(t),
    rebounds: t.reb,
    assists: t.ast,
    turnovers: t.tov,
    fg: `${fgm(t)}/${fga(t)}`,
    fgPct: pct(fgm(t), fga(t)),
    threePct: pct(t.p3m, t.p3a),
  };
}

export function validatePlayerInput(num,name){
  if(!name || name.trim().length < 2) return "Enter a player name.";
  if(!num || !/^\d{1,3}$/.test(num.trim())) return "Use a jersey number from 1 to 3 digits.";
  return "";
}

export function benchInsights(){
  if(!state.players.length) return [];
  const totals = state.players.map(p=>({player:p, total:totalPlayer(p)}));
  const leaderPts = [...totals].sort((a,b)=>pointsOf(b.total)-pointsOf(a.total))[0];
  const leaderReb = [...totals].sort((a,b)=>b.total.reb-a.total.reb)[0];
  const leaderAst = [...totals].sort((a,b)=>b.total.ast-a.total.ast)[0];
  const risky = [...totals].sort((a,b)=>b.total.tov-a.total.tov)[0];
  const insights = [];
  if(leaderPts && pointsOf(leaderPts.total) > 0) insights.push({title:"Scoring leader", body:`${leaderPts.player.name} leads with ${pointsOf(leaderPts.total)} points.`});
  if(leaderReb && leaderReb.total.reb > 0) insights.push({title:"Glass control", body:`${leaderReb.player.name} has ${leaderReb.total.reb} rebounds.`});
  if(leaderAst && leaderAst.total.ast > 0) insights.push({title:"Playmaker", body:`${leaderAst.player.name} leads with ${leaderAst.total.ast} assists.`});
  if(risky && risky.total.tov >= 3) insights.push({title:"Protect the ball", body:`${risky.player.name} has ${risky.total.tov} turnovers. Settle the pace.`});
  if(!insights.length) insights.push({title:"Game is live", body:"Log a few possessions and the bench reads will update automatically."});
  return insights;
}

/**
 * Determine if a shot coordinate (in SVG 400×360 space) is a 3-pointer.
 * The 3-point arc: center basket at (200, 17), radius ~174.
 * Corner 3s: x < 28 or x > 372 within y < 140.
 */
export function is3pt(x, y){
  if((x < 28 || x > 372) && y < 140) return true;
  const dx = x - 200, dy = y - 17;
  return Math.sqrt(dx*dx + dy*dy) > 174;
}
