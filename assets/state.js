export const state={db:null, ui:{tab:'assets'}};
const LS='tp65_db';
export function load(){try{const raw=localStorage.getItem(LS); if(raw) state.db=JSON.parse(raw);}catch(e){}}
export function save(){try{localStorage.setItem(LS, JSON.stringify(state.db));}catch(e){}}
export function uid(p='id'){return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}
