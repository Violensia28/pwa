// assets/ui.js
import { state, fmtRp } from './state.js';
import { computeNextDue, overdueDays, priorityScore } from './pm.js';

export function setNet(online) {
  const dot = document.getElementById('netDot');
  const txt = document.getElementById('netText');
  dot.style.background = online ? 'var(--ok)' : 'var(--warn)';
  txt.textContent = online ? 'Online' : 'Offline';
}

export function switchTab(tab) {
  state.ui.tab = tab;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  ['assets','wo','activity','finance','reports'].forEach(t => {
    document.getElementById('view-' + t).classList.toggle('hide', t !== tab);
  });
}

function firstThumb(urls){
  const u = (urls && urls.length) ? urls[0] : '';
  if (!u) return '';
  return `<img src="${u}" style="width:100%;max-width:160px;height:90px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;cursor:pointer" onclick="window.open('${u}','_blank')">`;
}

function childrenOf(parentId, type) { return state.db.locations.filter(x => x.parent === parentId && x.type === type); }
function byType(type) { return state.db.locations.filter(x => x.type === type); }

export function initLocationFilters() {
  const fSite = document.getElementById('fSite');
  const fBuilding = document.getElementById('fBuilding');
  const fFloor = document.getElementById('fFloor');
  const fRoom = document.getElementById('fRoom');

  const fill = (sel, items, includeAll=true) => {
    sel.innerHTML = '';
    if (includeAll) { const o=document.createElement('option'); o.value=''; o.textContent='Semua'; sel.appendChild(o); }
    items.forEach(it => { const o=document.createElement('option'); o.value=it.id; o.textContent=it.name; sel.appendChild(o); });
  };

  fill(fSite, byType('site'));
  fill(fBuilding, []);
  fill(fFloor, []);
  fill(fRoom, []);

  fSite.onchange = () => {
    state.ui.filters.site = fSite.value;
    state.ui.filters.building = ''; state.ui.filters.floor=''; state.ui.filters.room='';
    fill(fBuilding, fSite.value ? childrenOf(fSite.value,'building') : []);
    fill(fFloor, []); fill(fRoom, []);
    renderAssets();
  };
  fBuilding.onchange = () => {
    state.ui.filters.building = fBuilding.value;
    state.ui.filters.floor=''; state.ui.filters.room='';
    fill(fFloor, fBuilding.value ? childrenOf(fBuilding.value,'floor') : []);
    fill(fRoom, []);
    renderAssets();
  };
  fFloor.onchange = () => {
    state.ui.filters.floor = fFloor.value;
    state.ui.filters.room='';
    fill(fRoom, fFloor.value ? childrenOf(fFloor.value,'room') : []);
    renderAssets();
  };
  fRoom.onchange = () => { state.ui.filters.room = fRoom.value; renderAssets(); };
}

export function initTypeFilter() {
  const fType = document.getElementById('fType');
  fType.innerHTML = '<option value="">Semua</option>';
  state.db.asset_types.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.name; fType.appendChild(o); });
  fType.onchange = () => { state.ui.filters.type = fType.value; renderAssets(); };
}

export function initSearchAndCond() {
  document.getElementById('q').oninput = (e) => { state.ui.filters.q = e.target.value.toLowerCase(); state.ui.page=1; renderAssets(); };
  document.getElementById('fCond').onchange = (e) => { state.ui.filters.cond = e.target.value; state.ui.page=1; renderAssets(); };
}

function fullLocation(roomId) {
  const room = state.db.locations.find(x=>x.id===roomId);
  if (!room) return '-';
  const floor = state.db.locations.find(x=>x.id===room.parent);
  const building = floor ? state.db.locations.find(x=>x.id===floor.parent) : null;
  const site = building ? state.db.locations.find(x=>x.id===building.parent) : null;
  return [site?.name, building?.name, floor?.name, room?.name].filter(Boolean).join(' / ');
}

export function renderAssets() {
  const list = document.getElementById('assetList');
  const empty = document.getElementById('emptyAssets');
  const today = new Date().toISOString().slice(0,10);

  state.db.assets.forEach(a => { a.next_due = a.next_due || computeNextDue(a.last_service, a.pm_interval_days); });

  const f = state.ui.filters;
  let items = [...state.db.assets];

  if (f.room) items = items.filter(a => a.location_id === f.room);
  else if (f.floor) {
    const rooms = state.db.locations.filter(x => x.parent === f.floor && x.type==='room').map(x=>x.id);
    items = items.filter(a => rooms.includes(a.location_id));
  } else if (f.building) {
    const floors = state.db.locations.filter(x => x.parent === f.building && x.type==='floor').map(x=>x.id);
    const rooms = state.db.locations.filter(x => floors.includes(x.parent) && x.type==='room').map(x=>x.id);
    items = items.filter(a => rooms.includes(a.location_id));
  } else if (f.site) {
    const buildings = state.db.locations.filter(x => x.parent === f.site && x.type==='building').map(x=>x.id);
    const floors = state.db.locations.filter(x => buildings.includes(x.parent) && x.type==='floor').map(x=>x.id);
    const rooms = state.db.locations.filter(x => floors.includes(x.parent) && x.type==='room').map(x=>x.id);
    items = items.filter(a => rooms.includes(a.location_id));
  }

  if (f.type) items = items.filter(a => a.type === f.type);
  if (f.cond) items = items.filter(a => a.cond === f.cond);

  if (f.q) {
    const term = f.q;
    items = items.filter(a => {
      const hay = [a.asset_code,a.brand,a.model,a.serial,a.subtype,fullLocation(a.location_id),a.issue].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }

  items.sort((a,b) => priorityScore(b,today) - priorityScore(a,today));

  document.getElementById('kTotal').textContent = state.db.assets.length;
  document.getElementById('kOver').textContent = state.db.assets.filter(a => overdueDays(a.next_due,today)>0).length;
  document.getElementById('kBad').textContent = state.db.assets.filter(a => a.cond==='Rusak').length;

  const pageSize = state.ui.pageSize;
  const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
  state.ui.page = Math.min(state.ui.page, maxPage);
  const start = (state.ui.page-1)*pageSize;
  const pageItems = items.slice(start, start+pageSize);
  document.getElementById('pageInfo').textContent = `${state.ui.page} / ${maxPage}`;

  empty.classList.toggle('hide', state.db.assets.length !== 0);

  list.innerHTML = pageItems.map(a => {
    const od = overdueDays(a.next_due, today);
    const badge = a.cond==='Rusak' ? 'b-bad' : a.cond==='Perlu Servis' ? 'b-warn' : (od>0 ? 'b-info' : 'b-ok');
    const badgeTxt = a.cond !== 'Normal' ? a.cond : (od>0 ? `Overdue ${od} hari` : 'Normal');
    return `
      <div class="item">
        <div class="row" style="justify-content:space-between; align-items:flex-start">
          <div>
            <div class="badge ${badge}">${badgeTxt}</div>
            <div style="font-weight:1000; font-size:16px; margin-top:8px">${fullLocation(a.location_id)}</div>
            <div class="muted">${a.type || '-'} • ${a.brand||'-'} ${a.model||''} • SN: ${a.serial||'-'}</div>
            <div class="muted">Inventaris: <b>${a.asset_code||'-'}</b> • Kritikal: <b>${a.criticality||'Sedang'}</b></div>
            ${a.issue?`<div class="card" style="margin-top:10px; border-color:rgba(239,68,68,.18); background:rgba(239,68,68,.05)"><b style="color:#991b1b">Catatan:</b> <span class="small">${escapeHtml(a.issue)}</span></div>`:''}
            <div class="muted" style="margin-top:10px">Last: ${a.last_service||'-'} • Next: ${a.next_due||'-'} • Interval: ${a.pm_interval_days||'-'} hari</div>
          </div>
          <div class="actions">
            <button class="pbtn" data-edit-asset="${a.id}">Edit</button>
            <button class="pbtn" data-wo-asset="${a.id}">WO</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-edit-asset]').forEach(btn => btn.onclick = () => window.appOpenAsset(btn.dataset.editAsset));
  list.querySelectorAll('[data-wo-asset]').forEach(btn => btn.onclick = () => window.appOpenWO(null, btn.dataset.woAsset));
}

export function renderWO() {
  const list = document.getElementById('woList');
  const empty = document.getElementById('emptyWO');
  const items = [...state.db.work_orders];
  empty.classList.toggle('hide', items.length !== 0);

  const assetMap = new Map(state.db.assets.map(a=>[a.id,a]));

  list.innerHTML = items.map(w => {
    const badge = w.status==='Verified' ? 'b-ok' : w.status==='Done' ? 'b-info' : w.status==='On Progress' ? 'b-warn' : 'b-bad';
    const a = w.asset_id ? assetMap.get(w.asset_id) : null;
    const loc = a ? fullLocation(a.location_id) : (w.location_id || '-');
    const beforeThumb = firstThumb(w.photos?.before);
    const afterThumb = firstThumb(w.photos?.after);
    return `
      <div class="item">
        <div class="row" style="justify-content:space-between; align-items:flex-start">
          <div>
            <div class="badge ${badge}">${w.status}</div>
            <div style="font-weight:1000; font-size:16px; margin-top:8px">${escapeHtml(w.title||'(Tanpa judul)')}</div>
            <div class="muted">${w.date} • Prioritas: <b>${w.priority}</b></div>
            <div class="muted">Lokasi: ${escapeHtml(loc)}</div>
            <div class="muted small" style="margin-top:8px"><b>Temuan:</b> ${escapeHtml(w.finding||'-')}</div>
            <div class="muted small"><b>Tindakan:</b> ${escapeHtml(w.action||'-')}</div>
            <div class="muted small"><b>Hasil:</b> ${escapeHtml(w.result||'-')}</div>
            ${w.verified_at?`<div class="muted small">Verified: ${escapeHtml(w.verified_by||'Atasan')} • ${new Date(w.verified_at).toLocaleString('id-ID')}</div>`:''}
            ${(beforeThumb||afterThumb)?`<div class="row" style="margin-top:10px; gap:10px"><div style="min-width:160px">${beforeThumb}</div><div style="min-width:160px">${afterThumb}</div></div>`:''}
          </div>
          <div class="actions"><button class="pbtn" data-edit-wo="${w.id}">Edit</button></div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-edit-wo]').forEach(btn => btn.onclick = () => window.appOpenWO(btn.dataset.editWo));
}

export function renderActivities() {
  const list = document.getElementById('actList');
  const empty = document.getElementById('emptyAct');
  const items = [...state.db.activities];
  empty.classList.toggle('hide', items.length !== 0);

  list.innerHTML = items.map(a => `
    <div class="item">
      <div class="badge b-info">${escapeHtml(a.tag||'Umum')}</div>
      <div style="font-weight:1000; font-size:16px; margin-top:8px">${escapeHtml(a.title||'(Tanpa judul)')}</div>
      <div class="muted">${a.date} • ${a.time||''} • WO: ${escapeHtml(a.wo_id||'-')}</div>
      <div class="muted small" style="margin-top:8px">${escapeHtml(a.desc||'')}</div>
      ${(a.photos?.before?.length||a.photos?.after?.length)?`<div class="row" style="margin-top:10px; gap:10px"><div style="min-width:160px">${firstThumb(a.photos?.before)}</div><div style="min-width:160px">${firstThumb(a.photos?.after)}</div></div>`:''}
      <div class="actions" style="margin-top:10px"><button class="pbtn" data-edit-act="${a.id}">Edit</button></div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-act]').forEach(btn => btn.onclick = () => window.appOpenAct(btn.dataset.editAct));
}

export function renderFinance() {
  const list = document.getElementById('finList');
  const empty = document.getElementById('emptyFin');
  const items = [...state.db.finances];
  empty.classList.toggle('hide', items.length !== 0);
  document.getElementById('finTotal').textContent = fmtRp(items.reduce((acc,x)=>acc+(Number(x.cost)||0),0));

  list.innerHTML = items.map(f => `
    <div class="item">
      <div class="badge b-ok">${escapeHtml(f.category||'Lainnya')}</div>
      <div style="font-weight:1000; font-size:16px; margin-top:8px">${escapeHtml(f.item||'(Tanpa item)')}</div>
      <div class="muted">${f.date} • ${fmtRp(f.cost)}</div>
      <div class="muted small">WO: ${escapeHtml(f.wo_id||'-')} • Aset: ${escapeHtml(f.asset_id||'-')} • Nota: ${escapeHtml(f.note_no||'-')}</div>
      ${f.receipts?.length?`<div style="margin-top:10px">${firstThumb(f.receipts)}</div>`:''}
      <div class="actions" style="margin-top:10px"><button class="pbtn" data-edit-fin="${f.id}">Edit</button></div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-fin]').forEach(btn => btn.onclick = () => window.appOpenFin(btn.dataset.editFin));
}

export function renderReportSummary(start, end) {
  const box = document.getElementById('repBox');
  const s = start || document.getElementById('repStart').value;
  const e = end || document.getElementById('repEnd').value;
  const inRange = (d) => d >= s && d <= e;

  const wo = state.db.work_orders.filter(x => x.date && inRange(x.date));
  const fin = state.db.finances.filter(x => x.date && inRange(x.date));

  const done = wo.filter(x => x.status==='Done' || x.status==='Verified').length;
  const open = wo.filter(x => x.status==='Open' || x.status==='On Progress').length;
  const verified = wo.filter(x => x.status==='Verified').length;
  const cost = fin.reduce((acc,x)=>acc+(Number(x.cost)||0),0);

  box.innerHTML = `
    <div style="display:flex; gap:10px; flex-wrap:wrap">
      <div class="card" style="flex:1; min-width:220px"><div class="muted">WO total</div><div style="font-size:22px;font-weight:1000">${wo.length}</div></div>
      <div class="card" style="flex:1; min-width:220px"><div class="muted">WO selesai</div><div style="font-size:22px;font-weight:1000">${done}</div></div>
      <div class="card" style="flex:1; min-width:220px"><div class="muted">WO pending</div><div style="font-size:22px;font-weight:1000">${open}</div></div>
      <div class="card" style="flex:1; min-width:220px"><div class="muted">Verified</div><div style="font-size:22px;font-weight:1000">${verified}</div></div>
      <div class="card" style="flex:1; min-width:220px"><div class="muted">Total Biaya</div><div style="font-size:22px;font-weight:1000">${fmtRp(cost)}</div></div>
    </div>
    <hr style="border:none;border-top:1px solid var(--line); margin:12px 0">
    <div class="muted">Periode: <b>${s}</b> s/d <b>${e}</b></div>
  `;
}

export function escapeHtml(s){
  return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}

export function setRoleUI() {
  const viewer = state.config.role === 'viewer';
  document.querySelectorAll('#btnAddAsset,#btnAddWO,#btnAddAct,#btnAddFin,#btnLocations').forEach(el=>{
    el.style.display = viewer ? 'none' : '';
  });
}
