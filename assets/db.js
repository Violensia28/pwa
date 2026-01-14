import { state, save } from './state.js';
export async function loadSeed(){ if(state.db) return; const r=await fetch('./data/db_partner.json'); state.db = await r.json(); save(); }
