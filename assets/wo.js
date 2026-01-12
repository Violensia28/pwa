// assets/wo.js
import { state, uid, saveLocal } from './state.js';

export function upsertWO(wo) {
  const idx = state.db.work_orders.findIndex(x => x.id === wo.id);
  if (idx >= 0) state.db.work_orders[idx] = wo;
  else state.db.work_orders.unshift(wo);
  saveLocal();
}

export function deleteWO(id) {
  state.db.work_orders = state.db.work_orders.filter(x => x.id !== id);
  saveLocal();
}

export function newWO() {
  const today = new Date().toISOString().slice(0,10);
  return {
    id: uid('WO'),
    date: today,
    status: 'Open',
    priority: 'Sedang',
    asset_id: '',
    location_id: '',
    title: '',
    finding: '',
    action: '',
    result: '',
    verified_by: '',
    verified_at: ''
  };
}

export function markVerified(wo, who='Atasan') {
  wo.status = 'Verified';
  wo.verified_by = who;
  wo.verified_at = new Date().toISOString();
  upsertWO(wo);
}
