export const STORAGE_KEY = "courtiq_elite_modular_state_v1";
export const WELCOME_KEY = "courtiq_elite_modular_welcome_seen";

export const state = {
  mode: "live",
  quarter: 1,
  shotMode: "made",
  nextId: 1,
  players: [],
  shots: [],
  games: [],
  historyStack: [],
  isPro: false
};

export function eq(){
  return { p2m:0,p2a:0,p3m:0,p3a:0,ftm:0,fta:0,reb:0,ast:0,tov:0,stl:0,blk:0,fouls:0 };
}

export function makePlayer(num,name,phone,id){
  return { id:id ?? state.nextId++, num, name, phone:phone || "", q:{ 1:eq(), 2:eq(), 3:eq(), 4:eq(), OT:eq() } };
}

export function snapshot(){
  return structuredClone({
    mode: state.mode,
    quarter: state.quarter,
    shotMode: state.shotMode,
    nextId: state.nextId,
    players: state.players,
    shots: state.shots,
    games: state.games,
    isPro: state.isPro
  });
}

export function pushHistory(){
  state.historyStack.push(snapshot());
  if(state.historyStack.length > 50) state.historyStack.shift();
}

export function undoLast(){
  const prev = state.historyStack.pop();
  if(!prev) return false;
  state.mode = prev.mode;
  state.quarter = prev.quarter;
  state.shotMode = prev.shotMode;
  state.nextId = prev.nextId;
  state.players = prev.players;
  state.shots = prev.shots;
  state.games = prev.games;
  return true;
}

export function saveState(meta){
  const payload = { ...snapshot(), meta };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadState(setMeta){
  try{
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if(!raw) return;
    state.mode = raw.mode || "live";
    state.quarter = raw.quarter ?? 1;
    state.shotMode = raw.shotMode || "made";
    state.nextId = raw.nextId || 1;
    state.players = Array.isArray(raw.players) ? raw.players : [];
    state.shots = Array.isArray(raw.shots) ? raw.shots : [];
    state.games = Array.isArray(raw.games) ? raw.games : [];
    state.isPro = raw.isPro || localStorage.getItem("courtiq_pro_demo") === "1";
    setMeta(raw.meta || {});
  }catch(err){
    console.error(err);
  }
}
