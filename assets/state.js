// assets/state.js
export const SCHEMA_VERSION = 1;

export const defaults = {
  config: {
    gh_owner: localStorage.getItem('gh_owner') || '',
    gh_repo: localStorage.getItem('gh_repo') || 'pwa',
    gh_path: localStorage.getItem('gh_path') || 'data/db_partner.json',
    gh_token: localStorage.getItem('gh_token') || '',
    pin_admin: localStorage.getItem('pin_admin') || '',
    pin_viewer: localStorage.getItem('pin_viewer') || '',
    role: localStorage.getItem('role') || 'admin'
  },
  sha: null,
  db: {
    meta: {
      schema: SCHEMA_VERSION,
      org_name: '',
      doc_prefix: 'OPS-LOG',
      doc_format: '{PREFIX}/{SEQ3}/{ROMAN}/{YYYY}',
      last_doc_no: 0
    },
    locations: [
      { id: 'site-kantor', type: 'site', parent: null, name: 'Kantor' },
      { id: 'site-stui', type: 'site', parent: null, name: 'Rumah Dinas Stui' },
      { id: 'site-lampineung', type: 'site', parent: null, name: 'Rumah Dinas Lampineung' },
      { id: 'site-batoh', type: 'site', parent: null, name: 'Mess Batoh' }
    ],
    asset_types: [
      { id: 'AC', name: 'AC' },
      { id: 'Lampu', name: 'Lampu' },
      { id: 'UPS', name: 'UPS' },
      { id: 'CCTV', name: 'CCTV' },
      { id: 'Jaringan', name: 'Jaringan' },
      { id: 'Genset', name: 'Genset' },
      { id: 'Panel', name: 'Panel Listrik' },
      { id: 'Pompa', name: 'Pompa' },
      { id: 'Plumbing', name: 'Plumbing' },
      { id: 'Lainnya', name: 'Lainnya' }
    ],
    assets: [],
    work_orders: [],
    activities: [],
    finances: []
  }
};

export const state = {
  config: { ...defaults.config },
  sha: defaults.sha,
  db: structuredClone(defaults.db),
  ui: {
    tab: 'assets',
    page: 1,
    pageSize: 24,
    filters: { q:'', site:'', building:'', floor:'', room:'', type:'', cond:'' }
  }
};

const LS_KEY = 'tp6_db_local';

export function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.meta) state.db = parsed;
  } catch (e) { console.warn('loadLocal failed', e); }
}

export function saveLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state.db));
  } catch (e) { console.warn('saveLocal failed', e); }
}

export function saveConfig() {
  localStorage.setItem('gh_owner', state.config.gh_owner || '');
  localStorage.setItem('gh_repo', state.config.gh_repo || 'pwa');
  localStorage.setItem('gh_path', state.config.gh_path || 'data/db_partner.json');
  localStorage.setItem('gh_token', state.config.gh_token || '');
  localStorage.setItem('pin_admin', state.config.pin_admin || '');
  localStorage.setItem('pin_viewer', state.config.pin_viewer || '');
  localStorage.setItem('role', state.config.role || 'admin');
}

export function resetLocal() {
  localStorage.removeItem(LS_KEY);
  state.db = structuredClone(defaults.db);
}

export function uid(prefix='id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export function fmtRp(n) {
  const x = Number(n || 0);
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(x);
}
