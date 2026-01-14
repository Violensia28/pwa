// assets/app.js
import { state, loadLocal, saveLocal, saveConfig, resetLocal, uid } from './state.js';
import { githubPull, githubPush, exportBackup, importBackup } from './db.js';
import { switchTab, setNet, initLocationFilters, initTypeFilter, initSearchAndCond, renderAssets, renderWO, renderActivities, renderFinance, renderReportSummary, setRoleUI } from './ui.js';
import { newWO, upsertWO, deleteWO, markVerified } from './wo.js';
import { parseQRPayload } from './qr.js';
import { computeNextDue } from './pm.js';
import { compressMany, renderThumbs } from './media.js';
import { downloadPDFStandard, downloadPDFFormal, downloadExcel } from './reports.js';
import { startScan, stopScan, toggleTorch } from './qrscan.js';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); }
    catch (e) { console.warn('SW register failed', e); }
  });
}

for (const btn of document.querySelectorAll('nav button')) {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
}

function netUpdate(){ setNet(navigator.onLine); }
window.addEventListener('online', netUpdate);
window.addEventListener('offline', netUpdate);
netUpdate();

loadLocal();

function bindPhotoPreviews(){
  const woBefore = document.getElementById('woBefore');
  const woAfter = document.getElementById('woAfter');
  const actBefore = document.getElementById('actBefore');
  const actAfter = document.getElementById('actAfter');
  const finReceipt = document.getElementById('finReceipt');

  woBefore.onchange = async () => renderThumbs(document.getElementById('woBeforePrev'), await compressMany(woBefore.files));
  woAfter.onchange = async () => renderThumbs(document.getElementById('woAfterPrev'), await compressMany(woAfter.files));
  actBefore.onchange = async () => renderThumbs(document.getElementById('actBeforePrev'), await compressMany(actBefore.files));
  actAfter.onchange = async () => renderThumbs(document.getElementById('actAfterPrev'), await compressMany(actAfter.files));
  finReceipt.onchange = async () => renderThumbs(document.getElementById('finReceiptPrev'), await compressMany(finReceipt.files));
}
bindPhotoPreviews();

initLocationFilters();
initTypeFilter();
initSearchAndCond();

// Paging

document.getElementById('prevPage').onclick = () => { state.ui.page = Math.max(1, state.ui.page-1); renderAssets(); };
document.getElementById('nextPage').onclick = () => { state.ui.page = state.ui.page+1; renderAssets(); };

// Backup/restore

document.getElementById('btnBackup').onclick = () => exportBackup();
document.getElementById('btnRestore').onclick = async () => {
  const f = await filePick('application/json');
  if (!f) return;
  const mode = confirm('OK = Merge, Cancel = Replace?') ? 'merge' : 'replace';
  await importBackup(f, mode);
  refreshAll();
};

// Settings
document.getElementById('btnSettings').onclick = () => openSettings();
document.getElementById('btnCloseSettings').onclick = () => closeModal('mSettings');
document.getElementById('btnSync').onclick = () => syncNow();

// Reports
const today = new Date().toISOString().slice(0,10);
document.getElementById('repEnd').value = today;
document.getElementById('repStart').value = today;
document.getElementById('btnWebSummary').onclick = () => renderReportSummary();
document.getElementById('btnPDFStd').onclick = () => downloadPDFStandard();
document.getElementById('btnPDFFormal').onclick = () => downloadPDFFormal();
document.getElementById('btnExcel').onclick = () => downloadExcel();

// Scan modal

document.getElementById('btnScan').onclick = async () => {
  openModal('mScan');
  try { await startScan({ onResult: (raw) => handleScanResult(raw) }); }
  catch (e) { document.getElementById('scanStatus').textContent = 'Tidak bisa akses kamera. Klik Manual atau cek izin kamera.'; }
};

document.getElementById('btnCloseScan').onclick = () => { stopScan(); closeModal('mScan'); };
document.getElementById('btnStartScan').onclick = async () => {
  try { await startScan({ onResult: (raw) => handleScanResult(raw) }); }
  catch (e) { document.getElementById('scanStatus').textContent = 'Tidak bisa akses kamera. Cek izin.'; }
};
document.getElementById('btnStopScan').onclick = () => stopScan();
document.getElementById('btnManualScan').onclick = async () => {
  const val = prompt('Tempel/ketik isi QR:');
  if (val) handleScanResult(val.trim());
};
document.getElementById('btnTorch').onclick = async () => {
  const ok = await toggleTorch();
  if (!ok) alert('Torch tidak didukung di perangkat/browser ini.');
};

// Locations manager
document.getElementById('btnLocations').onclick = () => openLocations();
document.getElementById('btnCloseLoc').onclick = () => closeModal('mLoc');
document.getElementById('btnAddLoc').onclick = (e) => { e.preventDefault(); addLocation(); };

// Room quick modal (C2)
document.getElementById('btnCloseRoom').onclick = () => closeModal('mRoom');
document.getElementById('btnOpenLocMgr').onclick = () => { closeModal('mRoom'); openLocations(); };
document.getElementById('roomForm').onsubmit = (e) => saveRoom(e);

// Assets
window.appOpenAsset = (id) => openAsset(id);
document.getElementById('btnAddAsset').onclick = () => openAsset(null);
document.getElementById('btnCloseAsset').onclick = () => closeModal('mAsset');
document.getElementById('btnDeleteAsset').onclick = () => deleteAsset();
document.getElementById('btnAssetQR').onclick = () => showAssetQR();
document.getElementById('assetForm').onsubmit = (e) => saveAsset(e);

// Inline room buttons (asset modal)
document.getElementById('btnRoomAdd').onclick = () => openRoomQuick('add', 'asset');
document.getElementById('btnRoomEdit').onclick = () => openRoomQuick('edit', 'asset');
document.getElementById('btnRoomDel').onclick = () => deleteRoomFrom('asset');
document.getElementById('btnRoomManage').onclick = () => openLocations();

// WO
window.appOpenWO = (id, assetId) => openWO(id, assetId);
document.getElementById('btnAddWO').onclick = () => openWO(null, null);
document.getElementById('btnCloseWO').onclick = () => closeModal('mWO');
document.getElementById('btnDeleteWO').onclick = () => deleteCurrentWO();
document.getElementById('btnVerifyWO').onclick = () => verifyCurrentWO();
document.getElementById('woForm').onsubmit = (e) => saveWO(e);

// Inline room buttons (WO modal)
document.getElementById('btnWORoomAdd').onclick = () => openRoomQuick('add', 'wo');
document.getElementById('btnWORoomEdit').onclick = () => openRoomQuick('edit', 'wo');
document.getElementById('btnWORoomDel').onclick = () => deleteRoomFrom('wo');
document.getElementById('btnWORoomManage').onclick = () => openLocations();

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

// Settings save

document.getElementById('btnSaveSettings').onclick = () => {
  state.config.gh_owner = document.getElementById('ghOwner').value.trim();
  state.config.gh_repo = document.getElementById('ghRepo').value.trim() || 'pwa';
  state.config.gh_path = document.getElementById('ghPath').value.trim() || 'data/db_partner.json';
  state.config.gh_token = document.getElementById('ghToken').value.trim();
  state.config.pin_admin = document.getElementById('pinAdmin').value.trim();
  state.config.pin_viewer = document.getElementById('pinViewer').value.trim();
  state.config.role = document.getElementById('modeRole').value;

  state.db.meta = state.db.meta || {};
  state.db.meta.org_name = document.getElementById('orgName').value.trim();
  state.db.meta.doc_prefix = document.getElementById('docPrefix').value.trim() || 'OPS-LOG';
  state.db.meta.doc_format = document.getElementById('docFormat').value.trim() || '{PREFIX}/{SEQ3}/{ROMAN}/{YYYY}';

  saveLocal();
  saveConfig();
  closeModal('mSettings');
  setRoleUI();
  applyRoleLocks();
};

document.getElementById('btnClearLocal').onclick = () => {
  if (!confirm('Reset semua data lokal? (data GitHub tidak terhapus)')) return;
  resetLocal();
  refreshAll();
};

function filePick(accept) {
  return new Promise((resolve)=>{
    const inp = document.createElement('input');
    inp.type='file'; inp.accept=accept;
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

async function syncNow(){
  try { await githubPull(); await githubPush('Sync (pull+push)'); alert('Sync sukses'); }
  catch (e) { alert('Sync gagal: ' + e.message); }
  refreshAll();
}

function refreshAll(){
  saveLocal();
  renderAssets();
  renderWO();
  renderActivities();
  renderFinance();
  setRoleUI();
  applyRoleLocks();
  refreshWOAssetOptions();
  refreshActWOOptions();
  refreshFinOptions();
  initLocationFilters();
  initTypeFilter();
}

function openSettings(){
  document.getElementById('ghOwner').value = state.config.gh_owner;
  document.getElementById('ghRepo').value = state.config.gh_repo || 'pwa';
  document.getElementById('ghPath').value = state.config.gh_path;
  document.getElementById('ghToken').value = state.config.gh_token;
  document.getElementById('pinAdmin').value = state.config.pin_admin;
  document.getElementById('pinViewer').value = state.config.pin_viewer;
  document.getElementById('modeRole').value = state.config.role;
  document.getElementById('orgName').value = state.db.meta?.org_name || '';
  document.getElementById('docPrefix').value = state.db.meta?.doc_prefix || 'OPS-LOG';
  document.getElementById('docFormat').value = state.db.meta?.doc_format || '{PREFIX}/{SEQ3}/{ROMAN}/{YYYY}';
  openModal('mSettings');
}

function applyRoleLocks(){
  const viewer = state.config.role === 'viewer';
  // hide inline room controls for viewer
  ['btnRoomAdd','btnRoomEdit','btnRoomDel','btnRoomManage','btnWORoomAdd','btnWORoomEdit','btnWORoomDel','btnWORoomManage'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.style.display = viewer ? 'none' : '';
  });
}

function handleScanResult(raw){
  const p = parseQRPayload(raw);
  if (p.kind === 'asset') {
    stopScan();
    closeModal('mScan');
    openAsset(p.id);
    return;
  }
  if (p.kind === 'location') {
    stopScan();
    closeModal('mScan');
    state.ui.filters.site='';
    state.ui.filters.building='';
    state.ui.filters.floor='';
    state.ui.filters.room=p.id;
    state.ui.page=1;
    const fRoom = document.getElementById('fRoom');
    if (fRoom) fRoom.value = p.id;
    switchTab('assets');
    renderAssets();
    alert('Lokasi terdeteksi. Aset difilter ke ruang tersebut.');
    return;
  }
  alert('QR tidak dikenali: ' + raw);
}

function showAssetQR(){
  const id = document.getElementById('assetId').value;
  if (!id) return alert('Simpan aset dulu agar punya ID.');
  const payload = `tp6://asset/${id}`;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  window.open(url, '_blank');
}

// ---------- Locations Manager ----------
function openLocations(){
  fillLocParent();
  document.getElementById('locType').onchange = () => fillLocParent();
  renderLocList();
  openModal('mLoc');
}

function fillLocParent(){
  const parentSel = document.getElementById('locParent');
  const type = document.getElementById('locType').value;
  parentSel.innerHTML = '';
  const addOpt = (id, text) => {
    const o = document.createElement('option');
    o.value = id; o.textContent = text;
    parentSel.appendChild(o);
  };

  if (type === 'building') {
    state.db.locations.filter(x=>x.type==='site').forEach(s => addOpt(s.id, `SITE: ${s.name}`));
  } else if (type === 'floor') {
    state.db.locations.filter(x=>x.type==='building').forEach(b => {
      const site = state.db.locations.find(x=>x.id===b.parent);
      addOpt(b.id, `GEDUNG: ${b.name} (${site?site.name:'-'})`);
    });
  } else {
    // room -> parent must be floor
    state.db.locations.filter(x=>x.type==='floor').forEach(f => {
      const path = fullFloorPath(f.id);
      addOpt(f.id, path);
    });
  }
}

function addLocation(){
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa edit lokasi.');
  const type = document.getElementById('locType').value;
  const parent = document.getElementById('locParent').value;
  const name = document.getElementById('locName').value.trim();
  if (!parent) return alert('Parent wajib dipilih.');
  if (!name) return alert('Nama lokasi wajib diisi.');

  state.db.locations.push({ id: uid('loc'), type, parent, name });
  document.getElementById('locName').value = '';
  saveLocal();
  renderLocList();
  refreshAll();
}

function renderLocList(){
  const box = document.getElementById('locList');
  box.innerHTML = '';
  const order = {site:1, building:2, floor:3, room:4};
  const locs = [...state.db.locations].sort((a,b) => (order[a.type]-order[b.type]) || a.name.localeCompare(b.name));

  locs.forEach(l => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.gridColumn = 'span 12';
    div.style.cursor = 'pointer';
    div.innerHTML = `<b>${l.type.toUpperCase()}</b> — ${escapeHtml(l.name)}<div class="muted small">id: ${escapeHtml(l.id)} • parent: ${escapeHtml(l.parent||'-')}</div>`;
    div.onclick = () => {
      if (l.type === 'site') return alert('Site default tidak disarankan dihapus.');
      if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa hapus.');
      const hasChild = state.db.locations.some(x => x.parent === l.id);
      const usedByAsset = state.db.assets.some(a => a.location_id === l.id);
      if (hasChild) return alert('Tidak bisa hapus: masih ada child location.');
      if (usedByAsset) return alert('Tidak bisa hapus: masih dipakai oleh aset.');
      if (!confirm(`Hapus lokasi: ${l.name}?`)) return;
      state.db.locations = state.db.locations.filter(x => x.id !== l.id);
      saveLocal();
      renderLocList();
      refreshAll();
    };
    box.appendChild(div);
  });
}

function escapeHtml(s){
  return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}

function fullFloorPath(floorId){
  const f = state.db.locations.find(x=>x.id===floorId);
  if (!f) return '(Lantai tidak ditemukan)';
  const b = state.db.locations.find(x=>x.id===f.parent);
  const s = b ? state.db.locations.find(x=>x.id===b.parent) : null;
  return [s?.name, b?.name, f?.name].filter(Boolean).join(' / ');
}

// ---------- Room Quick CRUD (Opsi C2) ----------
function openRoomQuick(mode, from){
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa edit.');
  const roomSel = document.getElementById(from === 'wo' ? 'woLoc' : 'assetRoom');
  const currentId = roomSel?.value || '';

  document.getElementById('roomId').value = '';
  document.getElementById('roomName').value = '';

  // Fill floor options with full path (Option 2)
  const floorSel = document.getElementById('roomFloor');
  floorSel.innerHTML = '';
  const floors = state.db.locations.filter(x=>x.type==='floor');
  floors.forEach(f => {
    const o = document.createElement('option');
    o.value = f.id;
    o.textContent = fullFloorPath(f.id);
    floorSel.appendChild(o);
  });

  if (mode === 'edit') {
    if (!currentId) return alert('Pilih ruang dulu.');
    const r = state.db.locations.find(x=>x.id===currentId && x.type==='room');
    if (!r) return alert('Ruang tidak ditemukan.');
    document.getElementById('roomTitle').textContent = 'Edit Ruang (C2)';
    document.getElementById('roomId').value = r.id;
    document.getElementById('roomName').value = r.name;
    // parent = floor
    floorSel.value = r.parent || floors[0]?.id || '';
  } else {
    document.getElementById('roomTitle').textContent = 'Tambah Ruang';
    // default: use current room's floor if any
    if (currentId) {
      const r = state.db.locations.find(x=>x.id===currentId && x.type==='room');
      if (r?.parent) floorSel.value = r.parent;
    }
  }

  openModal('mRoom');
}

function saveRoom(e){
  e.preventDefault();
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa edit.');

  const id = document.getElementById('roomId').value;
  const name = document.getElementById('roomName').value.trim();
  const floorId = document.getElementById('roomFloor').value;
  if (!name) return alert('Nama ruang wajib diisi.');
  if (!floorId) return alert('Lantai tujuan wajib dipilih.');

  // validate target is floor
  const floor = state.db.locations.find(x=>x.id===floorId && x.type==='floor');
  if (!floor) return alert('Parent tidak valid (harus lantai).');

  if (id) {
    // edit room (rename + move parent)
    const r = state.db.locations.find(x=>x.id===id && x.type==='room');
    if (!r) return alert('Ruang tidak ditemukan.');
    r.name = name;
    r.parent = floorId;
  } else {
    // add new room
    const newId = uid('room');
    state.db.locations.push({ id: newId, type:'room', parent: floorId, name });
  }

  saveLocal();
  closeModal('mRoom');
  // Refresh dropdown sources everywhere
  refreshRoomOptions();
  refreshWOAssetOptions();
  initLocationFilters();
  refreshAll();
}

function deleteRoomFrom(from){
  if (state.config.role === 'viewer') return alert('Mode atasan: tidak bisa hapus.');
  const sel = document.getElementById(from === 'wo' ? 'woLoc' : 'assetRoom');
  const id = sel?.value || '';
  if (!id) return alert('Pilih ruang dulu.');
  const r = state.db.locations.find(x=>x.id===id && x.type==='room');
  if (!r) return alert('Ruang tidak ditemukan.');
  const usedByAsset = state.db.assets.some(a => a.location_id === id);
  if (usedByAsset) return alert('Tidak bisa hapus: ruang masih dipakai oleh aset.');
  if (!confirm(`Hapus ruang: ${r.name}?`)) return;
  state.db.locations = state.db.locations.filter(x => x.id !== id);
  saveLocal();
  refreshRoomOptions();
  refreshWOAssetOptions();
  initLocationFilters();
  refreshAll();
}

// ---------- Assets CRUD ----------
function refreshAssetTypeOptions(){
  const sel = document.getElementById('assetType');
  sel.innerHTML='';
  state.db.asset_types.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.name; sel.appendChild(o); });
}

function refreshRoomOptions(){
  const sel = document.getElementById('assetRoom');
  sel.innerHTML='';
  const rooms = state.db.locations.filter(x=>x.type==='room');
  if (rooms.length===0) {
    const o=document.createElement('option'); o.value=''; o.textContent='(Buat ruang dulu)';
    sel.appendChild(o);
    return;
  }
  rooms.forEach(r => {
    const f = state.db.locations.find(x=>x.id===r.parent);
    const label = `${r.name} (${fullFloorPath(f?.id)})`;
    const o=document.createElement('option');
    o.value=r.id; o.textContent=label;
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
  state.db.assets.slice(0,1200).forEach(a => {
    const o=document.createElement('option');
    o.value=a.id;
    o.textContent=`${a.asset_code||a.id} — ${a.type} — ${a.brand||''} ${a.model||''}`.trim();
    sel.appendChild(o);
  });
  const loc = document.getElementById('woLoc');
  loc.innerHTML = '<option value="">(Pilih ruang)</option>';
  state.db.locations.filter(x=>x.type==='room').forEach(r => {
    const o=document.createElement('option');
    o.value=r.id;
    o.textContent = `${r.name} (${fullFloorPath(r.parent)})`;
    loc.appendChild(o);
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

  document.getElementById('woBefore').value = '';
  document.getElementById('woAfter').value = '';
  renderThumbs(document.getElementById('woBeforePrev'), w.photos?.before || []);
  renderThumbs(document.getElementById('woAfterPrev'), w.photos?.after || []);

  openModal('mWO');
}

async function saveWO(e){
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

  const beforeFiles = document.getElementById('woBefore').files;
  const afterFiles = document.getElementById('woAfter').files;
  if (beforeFiles && beforeFiles.length) w.photos.before = await compressMany(beforeFiles);
  if (afterFiles && afterFiles.length) w.photos.after = await compressMany(afterFiles);

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
  const who = state.config.role === 'viewer' ? 'Atasan' : 'Admin';
  markVerified(w, who);
  closeModal('mWO');
  refreshAll();
}

// ---------- Activity CRUD ----------
function refreshActWOOptions(){
  const sel = document.getElementById('actWO');
  sel.innerHTML = '<option value="">(Tidak terkait WO)</option>';
  state.db.work_orders.slice(0,1200).forEach(w => {
    const o=document.createElement('option'); o.value=w.id; o.textContent=`${w.id} — ${w.title||'-'}`;
    sel.appendChild(o);
  });
}

function openAct(id){
  refreshActWOOptions();
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const a = id ? state.db.activities.find(x=>x.id===id) : {
    id: uid('ACT'), date: today, time: now.toTimeString().slice(0,5), tag: 'Umum', wo_id: '', title: '', desc: '',
    photos: { before: [], after: [] }
  };
  document.getElementById('actId').value = a.id;
  document.getElementById('actDate').value = a.date;
  document.getElementById('actTime').value = a.time;
  document.getElementById('actTag').value = a.tag;
  document.getElementById('actWO').value = a.wo_id || '';
  document.getElementById('actTitle').value = a.title;
  document.getElementById('actDesc').value = a.desc;

  document.getElementById('actBefore').value='';
  document.getElementById('actAfter').value='';
  renderThumbs(document.getElementById('actBeforePrev'), a.photos?.before || []);
  renderThumbs(document.getElementById('actAfterPrev'), a.photos?.after || []);

  openModal('mAct');
}

async function saveAct(e){
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
    desc: document.getElementById('actDesc').value.trim(),
    photos: { before: [], after: [] }
  };

  const bFiles = document.getElementById('actBefore').files;
  const aFiles = document.getElementById('actAfter').files;
  if (bFiles && bFiles.length) item.photos.before = await compressMany(bFiles);
  if (aFiles && aFiles.length) item.photos.after = await compressMany(aFiles);

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
  state.db.work_orders.slice(0,1200).forEach(w => {
    const o=document.createElement('option'); o.value=w.id; o.textContent=`${w.id} — ${w.title||'-'}`;
    wo.appendChild(o);
  });
  const as = document.getElementById('finAsset');
  as.innerHTML = '<option value="">(Tidak terkait aset)</option>';
  state.db.assets.slice(0,1200).forEach(a => {
    const o=document.createElement('option'); o.value=a.id; o.textContent=`${a.asset_code||a.id} — ${a.type}`;
    as.appendChild(o);
  });
}

function openFin(id){
  refreshFinOptions();
  const today = new Date().toISOString().slice(0,10);
  const f = id ? state.db.finances.find(x=>x.id===id) : {
    id: uid('FIN'), date: today, category:'Sparepart', item:'', cost:0, wo_id:'', asset_id:'', note_no:'', receipts: []
  };
  document.getElementById('finId').value = f.id;
  document.getElementById('finDate').value = f.date;
  document.getElementById('finCat').value = f.category;
  document.getElementById('finItem').value = f.item;
  document.getElementById('finCost').value = f.cost;
  document.getElementById('finWO').value = f.wo_id || '';
  document.getElementById('finAsset').value = f.asset_id || '';
  document.getElementById('finNote').value = f.note_no || '';

  document.getElementById('finReceipt').value='';
  renderThumbs(document.getElementById('finReceiptPrev'), f.receipts || []);

  openModal('mFin');
}

async function saveFin(e){
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
    note_no: document.getElementById('finNote').value.trim(),
    receipts: []
  };

  const rFiles = document.getElementById('finReceipt').files;
  if (rFiles && rFiles.length) item.receipts = await compressMany(rFiles);

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

// Boot minimal rooms
(function ensureMinimalRooms(){
  const hasRoom = state.db.locations.some(x=>x.type==='room');
  if (hasRoom) return;
  const b = { id: uid('b'), type:'building', parent:'site-kantor', name:'Gedung Utama' };
  const f = { id: uid('f'), type:'floor', parent:b.id, name:'Lt.1' };
  const r = { id: uid('r'), type:'room', parent:f.id, name:'Ruang Umum' };
  state.db.locations.push(b,f,r);
  saveLocal();
})();

setRoleUI();
applyRoleLocks();
refreshAll();
