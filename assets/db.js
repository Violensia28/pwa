// assets/db.js
import { state, saveLocal } from './state.js';

function b64Enc(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m,p1)=>String.fromCharCode('0x'+p1)));
}
function b64Dec(str) {
  return decodeURIComponent(atob(str).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

export async function githubPull() {
  const { gh_owner, gh_repo, gh_path, gh_token } = state.config;
  if (!gh_owner || !gh_repo || !gh_token) throw new Error('GitHub config belum lengkap');
  const url = `https://api.github.com/repos/${gh_owner}/${gh_repo}/contents/${gh_path}`;
  const res = await fetch(url, { headers: { 'Authorization': `token ${gh_token}` } });
  if (res.status === 404) { await githubPush('Init DB'); return; }
  if (!res.ok) throw new Error(`GitHub pull gagal: ${res.status}`);
  const json = await res.json();
  state.sha = json.sha;
  const decoded = JSON.parse(b64Dec(json.content));
  state.db = { ...state.db, ...decoded };
  saveLocal();
}

export async function githubPush(message='Update DB') {
  const { gh_owner, gh_repo, gh_path, gh_token } = state.config;
  if (!gh_owner || !gh_repo || !gh_token) throw new Error('GitHub config belum lengkap');
  const url = `https://api.github.com/repos/${gh_owner}/${gh_repo}/contents/${gh_path}`;
  const body = { message, content: b64Enc(JSON.stringify(state.db)), sha: state.sha || undefined };
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `token ${gh_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(`GitHub push gagal: ${data.message || res.status}`);
  if (data?.content?.sha) state.sha = data.content.sha;
}

export function exportBackup() {
  const blob = new Blob([JSON.stringify(state.db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const dt = new Date().toISOString().slice(0,10).replaceAll('-','');
  a.href = URL.createObjectURL(blob);
  a.download = `tp6_backup_${dt}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importBackup(file, mode='merge') {
  const text = await file.text();
  const incoming = JSON.parse(text);
  state.db = (mode === 'replace') ? incoming : { ...state.db, ...incoming };
  saveLocal();
}
