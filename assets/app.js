// assets/app.js
import { state, loadLocal, saveLocal, saveConfig, resetLocal, uid } from './state.js';
import { githubPull, githubPush, exportBackup, importBackup } from './db.js';
import { switchTab, setNet, initLocationFilters, initTypeFilter, initSearchAndCond, renderAssets, renderWO, renderActivities, renderFinance, renderReportSummary, setRoleUI } from './ui.js';
import { newWO, upsertWO, deleteWO, markVerified } from './wo.js';
import { scanQRCode, parseQRPayload } from './qr.js';
import { computeNextDue } from './pm.js';

// ---------- PWA: register service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './' });
    } catch (e) {
      console.warn('SW register failed', e);
    }
  });
}

// ---------- Basic navigation ----------
document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

// ---------- Online/offline indicator ----------
function netUpdate(){ setNet(navigator.onLine); }
window.addEventListener('online', netUpdate);
window.addEventListener('offline', netUpdate);
netUpdate();

// ---------- Load local DB ----------
loadLocal();

// ---------- Init filters ----------
initLocationFilters();
initTypeFilter();
initSearchAndCond();

// ---------- Paging buttons ----------
document.getElementById('prevPage').onclick = () => { state.ui.page = Math.max(1, state.ui.page-1); renderAssets(); };
document.getElementById('nextPage').onclick = () => { state.ui.page = state.ui.page+1; renderAssets(); };

// ---------- Buttons ----------
document.getElementById('btnSettings').onclick = () => openSettings();
document.getElementById('btnCloseSettings').onclick = () => closeModal('mSettings');
document.getElementById('btnSync').onclick = () => syncNow();

// Backup/restore
const filePick = (accept) => new Promise((resolve)=>{
  const inp = document.createElement('input');
  inp.type='file'; inp.accept=accept;
  inp.onchange = () => resolve(inp.files[0] || null);
  inp.click();
});

document.getElementById('btnBackup').onclick = () => exportBackup();
document.getElementById('btnRestore').onclick = async () => {
  const f = await filePick('application/json');
  if (!f) return;
  const mode = confirm('OK = Merge, Cancel = Replace?') ? 'merge' : 'replace';
  await importBackup(f, mode);
  refreshAll();
};

document.getElementById('btnScan').onclick = async () => {
  const text = await scanQRCode();
  if (!text) return;
  const p = parseQRPayload(text);
  if (p.kind==='asset') {
    openAsset(p.id);
  } else if (p.kind==='location') {
    // filter to location
    alert('QR lokasi terdeteksi. Silakan pilih filter ruang sesuai lokasi (fitur detail lokasi akan disempurnakan).');
  } else {
    alert('QR tidak dikenali: ' + text);
  }
};

// Assets
window.appOpenAsset = (id) => openAsset(id);
document.getElementById('btnAddAsset').onclick = () => openAsset(null);
document.getElementById('btnCloseAsset').onclick = () => closeModal('mAsset');
document.getElementById('btnDeleteAsset').onclick = () => deleteAsset();
document.getElementById('assetForm').onsubmit = (e) => saveAsset(e);

// WO
window.appOpenWO = (id, assetId) => openWO(id, assetId);
document.getElementById('btnAddWO').onclick = () => openWO(null, null);
document.getElementById('btnCloseWO').onclick = () => closeModal('mWO');
document.getElementById('btnDeleteWO').onclick = () => deleteCurrentWO();
document.getElementById('btnVerifyWO').onclick = () => verifyCurrentWO();
document.getElementById('woForm').onsubmit = (e) => saveWO(e);

// Activity
window.appOpenAct = (id) => openAct(id);
document.getElementById('btnAddAct').onclick = () => openAct(null);
document.getElementById('btnCloseAct').onclick = () => closeModal('mAct');
document.getElementById('btnDeleteAct').onclick = () => deleteCurrentAct();
document.getElementById('actForm').onsubmit = (e) => saveAct(e);

// Finance
window.appOpenFin = (id) => openFin(id);
document.getElementById('btnAddFin').onclick = () => openFin(null);
document.getElementById('btnCloseFin').onclick = () => closeModal('mFin');
document.getElementById('btnDeleteFin').onclick = () => deleteCurrentFin();
document.getElementById('finForm').onsubmit = (e) => saveFin(e);

// Reports
const today = new Date().toISOString().slice(0,10);
document.getElementById('repEnd').value = today;
document.getElementById('repStart').value = today;
document.getElementById('btnWebSummary').onclick = () => renderReportSummary();
document.getElementById('btnPDFStd').onclick = () => alert('PDF generator akan ditambahkan tahap berikutnya.');
document.getElementById('btnPDFFormal').onclick = () => alert('PDF formal akan ditambahkan tahap berikutnya.');

// Settings save

document.getElementById('btnSaveSettings').onclick = () => {
  state.config.gh_owner = document.getElementById('ghOwner').value.trim();
  state.config.gh_repo = document.getElementById('ghRepo').value.trim();
  state.config.gh_path = document.getElementById('ghPath').value.trim() || 'data/db_partner.json';
  state.config.gh_token = document.getElementById('ghToken').value.trim();
  state.config.pin_admin = document.getElementById('pinAdmin').value.trim();
  state.config.pin_viewer = document.getElementById('pinViewer').value.trim();
  state.config.role = document.getElementById('modeRole').value;
  saveConfig();
  closeModal('mSettings');
  setRoleUI();
};

document.getElementById('btnClearLocal').onclick = () => {
  if (!confirm('Reset semua data lokal? (data GitHub tidak terhapus)')) return;
  resetLocal();
  refreshAll();
};

function openSettings(){
  document.getElementById('ghOwner').value = state.config.gh_owner;
  document.getElementById('ghRepo').value = state.config.gh_repo;
  document.getElementById('ghPath').value = state.config.gh_path;
  document.getElementById('ghToken').value = state.config.gh_token;
  document.getElementById('pinAdmin').value = state.config.pin_admin;
  document.getElementById('pinViewer').value = state.config.pin_viewer;
  document.getElementById('modeRole').value = state.config.role;
  openModal('mSettings');
}

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

async function syncNow(){
  try {
    await githubPull();
    await githubPush('Sync (pull+push)');
    alert('Sync sukses');
  } catch (e) {
    alert('Sync gagal: ' + e.message);
  }
  refreshAll();
}

function refreshAll(){
  saveLocal();
  renderAssets();
  renderWO();
  renderActivities();
  renderFinance();
  setRoleUI();
  refreshWOAssetOptions();
  refreshActWOOptions();
  refreshFinOptions();
}

// ---------- Assets CRUD ----------
function refreshAssetTypeOptions(){
  const sel = document.getElementById('assetType');
  sel.innerHTML='';
  state.db.asset_types.forEach(t=>{
    const o=document.createElement('option');
    o.value=t.id; o.textContent=t.name;
    sel.appendChild(o);
  });
}

function refreshRoomOptions(){
  const sel = document.getElementById('assetRoom');
  sel.innerHTML='';
  const rooms = state.db.locations.filter(x=>x.type==='room');
  if (rooms.length===0) {
    const o=document.createElement('option'); o.value=''; o.textContent='(Buat ruang dulu di data locations)';
    sel.appendChild(o);
    return;
  }
  rooms.forEach(r=>{
    const o=document.createElement('option'); o.value=r.id; o.textContent=r.name;
    sel.appendChild(o);
  });
}

function openAsset(id){
  refreshAssetTypeOptions();
  refreshRoomOptions();
  const a = id ? state.db.assets.find(x=>x.id===id) : null;
  document.getElementById('assetId').value = a?.id || '';
  document.getElementById('assetCode').value = a?.asset_code || '';
  document.getElementById('assetSerial').value = a?.serial || '';
  document.getElementById('assetType').value = a?.type || 'AC';
  document.getElementById('assetSubtype').value = a?.subtype || '';
  document.getElementById('assetBrand').value = a?.brand || '';
  document.getElementById('assetModel').value = a?.model || '';
  document.getElementById('assetRoom').value = a?.location_id || (document.getElementById('assetRoom').options[0]?.value || '');
  document.getElementById('assetCrit').value = a?.criticality || 'Sedang';
  document.getElementById('assetCond').value = a?.cond || 'Normal';
  document.getElementById('assetPM').value = a?.pm_interval_days || 90;
  document.getElementById('assetInstall').value = a?.install_date || '';
  document.getElementById('assetLast').value = a?.last_service || '';
  document.getElementById('assetIssue').value = a?.issue || '';
  openModal('mAsset');
}

function saveAsset(e){
  e.preventDefault();
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa edit.');

  const id = document.getElementById('assetId').value || uid('AST');
  const last = document.getElementById('assetLast').value;
  const iv = Number(document.getElementById('assetPM').value || 0);
  const next = computeNextDue(last, iv);

  const item = {
    id,
    asset_code: document.getElementById('assetCode').value.trim(),
    serial: document.getElementById('assetSerial').value.trim(),
    type: document.getElementById('assetType').value,
    subtype: document.getElementById('assetSubtype').value.trim(),
    brand: document.getElementById('assetBrand').value.trim(),
    model: document.getElementById('assetModel').value.trim(),
    location_id: document.getElementById('assetRoom').value,
    criticality: document.getElementById('assetCrit').value,
    cond: document.getElementById('assetCond').value,
    pm_interval_days: iv,
    install_date: document.getElementById('assetInstall').value,
    last_service: last,
    next_due: next,
    issue: document.getElementById('assetIssue').value.trim(),
    updated_at: new Date().toISOString()
  };
  const idx = state.db.assets.findIndex(x=>x.id===id);
  if (idx>=0) state.db.assets[idx]=item; else state.db.assets.push(item);
  saveLocal();
  closeModal('mAsset');
  refreshAll();
}

function deleteAsset(){
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa hapus.');
  const id = document.getElementById('assetId').value;
  if (!id) return;
  if (!confirm('Hapus aset ini?')) return;
  state.db.assets = state.db.assets.filter(x=>x.id!==id);
  saveLocal();
  closeModal('mAsset');
  refreshAll();
}

// ---------- WO CRUD ----------
function refreshWOAssetOptions(){
  const sel = document.getElementById('woAsset');
  sel.innerHTML = '<option value="">(Tidak terkait aset)</option>';
  state.db.assets.slice(0,800).forEach(a=>{
    const o=document.createElement('option');
    o.value=a.id;
    o.textContent=`${a.asset_code||a.id} — ${a.type} — ${a.brand||''} ${a.model||''}`.trim();
    sel.appendChild(o);
  });
  const loc = document.getElementById('woLoc');
  loc.innerHTML = '<option value="">(Pilih lokasi)</option>';
  state.db.locations.filter(x=>x.type==='room').forEach(r=>{
    const o=document.createElement('option'); o.value=r.id; o.textContent=r.name; loc.appendChild(o);
  });
}

function openWO(id, assetId=null){
  refreshWOAssetOptions();
  const w = id ? state.db.work_orders.find(x=>x.id===id) : newWO();
  if (assetId) w.asset_id = assetId;

  document.getElementById('woId').value = w.id;
  document.getElementById('woDate').value = w.date;
  document.getElementById('woStatus').value = w.status;
  document.getElementById('woPrio').value = w.priority;
  document.getElementById('woAsset').value = w.asset_id || '';
  document.getElementById('woLoc').value = w.location_id || '';
  document.getElementById('woTitle').value = w.title || '';
  document.getElementById('woFinding').value = w.finding || '';
  document.getElementById('woAction').value = w.action || '';
  document.getElementById('woResult').value = w.result || '';
  openModal('mWO');
}

function saveWO(e){
  e.preventDefault();
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa edit WO.');

  const id = document.getElementById('woId').value;
  const w = state.db.work_orders.find(x=>x.id===id) || newWO();
  w.id = id;
  w.date = document.getElementById('woDate').value;
  w.status = document.getElementById('woStatus').value;
  w.priority = document.getElementById('woPrio').value;
  w.asset_id = document.getElementById('woAsset').value;
  w.location_id = document.getElementById('woLoc').value;
  w.title = document.getElementById('woTitle').value.trim();
  w.finding = document.getElementById('woFinding').value.trim();
  w.action = document.getElementById('woAction').value.trim();
  w.result = document.getElementById('woResult').value.trim();

  upsertWO(w);
  closeModal('mWO');
  refreshAll();
}

function deleteCurrentWO(){
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa hapus.');
  const id = document.getElementById('woId').value;
  if (!id) return;
  if (!confirm('Hapus WO ini?')) return;
  deleteWO(id);
  closeModal('mWO');
  refreshAll();
}

function verifyCurrentWO(){
  const id = document.getElementById('woId').value;
  const w = state.db.work_orders.find(x=>x.id===id);
  if (!w) return;
  // viewer can verify
  const who = state.config.role === 'viewer' ? 'Atasan' : 'Admin';
  markVerified(w, who);
  closeModal('mWO');
  refreshAll();
}

// ---------- Activity CRUD ----------
function refreshActWOOptions(){
  const sel = document.getElementById('actWO');
  sel.innerHTML = '<option value="">(Tidak terkait WO)</option>';
  state.db.work_orders.slice(0,800).forEach(w=>{
    const o=document.createElement('option'); o.value=w.id; o.textContent=`${w.id} — ${w.title||'-'}`;
    sel.appendChild(o);
  });
}

function openAct(id){
  refreshActWOOptions();
  const today = new Date().toISOString().slice(0,10);
  const now = new Date();
  const a = id ? state.db.activities.find(x=>x.id===id) : {
    id: uid('ACT'),
    date: today,
    time: now.toTimeString().slice(0,5),
    tag: 'Umum',
    wo_id: '',
    title: '',
    desc: ''
  };
  document.getElementById('actId').value = a.id;
  document.getElementById('actDate').value = a.date;
  document.getElementById('actTime').value = a.time;
  document.getElementById('actTag').value = a.tag;
  document.getElementById('actWO').value = a.wo_id || '';
  document.getElementById('actTitle').value = a.title;
  document.getElementById('actDesc').value = a.desc;
  openModal('mAct');
}

function saveAct(e){
  e.preventDefault();
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa edit.');
  const id = document.getElementById('actId').value;
  const item = {
    id,
    date: document.getElementById('actDate').value,
    time: document.getElementById('actTime').value,
    tag: document.getElementById('actTag').value,
    wo_id: document.getElementById('actWO').value,
    title: document.getElementById('actTitle').value.trim(),
    desc: document.getElementById('actDesc').value.trim()
  };
  const idx = state.db.activities.findIndex(x=>x.id===id);
  if (idx>=0) state.db.activities[idx]=item; else state.db.activities.unshift(item);
  saveLocal();
  closeModal('mAct');
  refreshAll();
}

function deleteCurrentAct(){
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa hapus.');
  const id = document.getElementById('actId').value;
  if (!id) return;
  if (!confirm('Hapus kegiatan ini?')) return;
  state.db.activities = state.db.activities.filter(x=>x.id!==id);
  saveLocal();
  closeModal('mAct');
  refreshAll();
}

// ---------- Finance CRUD ----------
function refreshFinOptions(){
  const wo = document.getElementById('finWO');
  wo.innerHTML = '<option value="">(Tidak terkait WO)</option>';
  state.db.work_orders.slice(0,800).forEach(w=>{
    const o=document.createElement('option'); o.value=w.id; o.textContent=`${w.id} — ${w.title||'-'}`;
    wo.appendChild(o);
  });
  const as = document.getElementById('finAsset');
  as.innerHTML = '<option value="">(Tidak terkait aset)</option>';
  state.db.assets.slice(0,800).forEach(a=>{
    const o=document.createElement('option'); o.value=a.id; o.textContent=`${a.asset_code||a.id} — ${a.type}`;
    as.appendChild(o);
  });
}

function openFin(id){
  refreshFinOptions();
  const today = new Date().toISOString().slice(0,10);
  const f = id ? state.db.finances.find(x=>x.id===id) : {
    id: uid('FIN'),
    date: today,
    category: 'Sparepart',
    item: '',
    cost: 0,
    wo_id: '',
    asset_id: '',
    note_no: ''
  };
  document.getElementById('finId').value = f.id;
  document.getElementById('finDate').value = f.date;
  document.getElementById('finCat').value = f.category;
  document.getElementById('finItem').value = f.item;
  document.getElementById('finCost').value = f.cost;
  document.getElementById('finWO').value = f.wo_id || '';
  document.getElementById('finAsset').value = f.asset_id || '';
  document.getElementById('finNote').value = f.note_no || '';
  openModal('mFin');
}

function saveFin(e){
  e.preventDefault();
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa edit.');
  const id = document.getElementById('finId').value;
  const item = {
    id,
    date: document.getElementById('finDate').value,
    category: document.getElementById('finCat').value,
    item: document.getElementById('finItem').value.trim(),
    cost: Number(document.getElementById('finCost').value || 0),
    wo_id: document.getElementById('finWO').value,
    asset_id: document.getElementById('finAsset').value,
    note_no: document.getElementById('finNote').value.trim()
  };
  const idx = state.db.finances.findIndex(x=>x.id===id);
  if (idx>=0) state.db.finances[idx]=item; else state.db.finances.unshift(item);
  saveLocal();
  closeModal('mFin');
  refreshAll();
}

function deleteCurrentFin(){
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa hapus.');
  const id = document.getElementById('finId').value;
  if (!id) return;
  if (!confirm('Hapus item bon ini?')) return;
  state.db.finances = state.db.finances.filter(x=>x.id!==id);
  saveLocal();
  closeModal('mFin');
  refreshAll();
}

// ---------- Boot ----------
function ensureMinimalRooms() {
  // Create one default building/floor/room under Kantor if none exist, to avoid empty selects.
  const hasRoom = state.db.locations.some(x=>x.type==='room');
  if (hasRoom) return;
  const b = { id: uid('b'), type:'building', parent:'site-kantor', name:'Gedung Utama' };
  const f = { id: uid('f'), type:'floor', parent:b.id, name:'Lt.1' };
  const r = { id: uid('r'), type:'room', parent:f.id, name:'Ruang Umum' };
  state.db.locations.push(b,f,r);
  saveLocal();
}

ensureMinimalRooms();
setRoleUI();
refreshAll();

