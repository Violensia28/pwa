import { state, load, save, uid } from './state.js';
import { switchTab, setNet } from './ui.js';
import { loadSeed } from './db.js';

for(const b of document.querySelectorAll('nav button')) b.onclick=()=>switchTab(b.dataset.tab);
window.addEventListener('online',()=>setNet(true));
window.addEventListener('offline',()=>setNet(false));
setNet(navigator.onLine);

load();
await loadSeed();

function openRoomModal(mode){
  const sel=document.getElementById('fRoom');
  const cur=sel.value;
  document.getElementById('roomId').value='';
  document.getElementById('roomName').value='';
  const floorSel=document.getElementById('roomFloor');
  floorSel.innerHTML='';
  const floors=state.db.locations.filter(x=>x.type==='floor');
  const path=(fid)=>{const f=state.db.locations.find(x=>x.id===fid); const b=f?state.db.locations.find(x=>x.id===f.parent):null; const s=b?state.db.locations.find(x=>x.id===b.parent):null; return [s?.name,b?.name,f?.name].filter(Boolean).join(' / ')};
  floors.forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=path(f.id);floorSel.appendChild(o);});

  if(mode==='edit'){
    const r=state.db.locations.find(x=>x.id===cur&&x.type==='room');
    if(!r) return alert('Pilih ruang dulu');
    document.getElementById('roomTitle').textContent='Edit Ruang (C2)';
    document.getElementById('roomId').value=r.id;
    document.getElementById('roomName').value=r.name;
    floorSel.value=r.parent;
  } else {
    document.getElementById('roomTitle').textContent='Tambah Ruang';
  }
  document.getElementById('mRoom').classList.add('open');
}

function closeRoom(){document.getElementById('mRoom').classList.remove('open');}

document.getElementById('btnCloseRoom').onclick=closeRoom;

document.getElementById('btnFilterRoomAdd').onclick=()=>openRoomModal('add');
document.getElementById('btnFilterRoomEdit').onclick=()=>openRoomModal('edit');
document.getElementById('btnFilterRoomDel').onclick=()=>{
  const id=document.getElementById('fRoom').value; if(!id) return alert('Pilih ruang dulu');
  const used=state.db.assets.some(a=>a.location_id===id); if(used) return alert('Tidak bisa hapus: dipakai aset');
  state.db.locations = state.db.locations.filter(x=>x.id!==id);
  save();
  renderFilters();
};

document.getElementById('btnFilterRoomManage').onclick=()=>alert('Kelola lokasi lengkap tersedia di versi full repo kamu.');

function renderFilters(){
  // For demo package: only room dropdown
  const roomSel=document.getElementById('fRoom');
  roomSel.innerHTML='<option value="">Semua</option>';
  state.db.locations.filter(x=>x.type==='room').forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.name;roomSel.appendChild(o);});
  roomSel.onchange=()=>{renderAssets();};
}

function renderAssets(){
  const list=document.getElementById('assetList');
  const empty=document.getElementById('emptyAssets');
  const rid=document.getElementById('fRoom').value;
  const items = rid ? state.db.assets.filter(a=>a.location_id===rid) : state.db.assets;
  empty.classList.toggle('hide', state.db.assets.length!==0);
  list.innerHTML = items.map(a=>`<div class="item"><div class="badge b-info">${a.type||'Aset'}</div><div style="font-weight:900;margin-top:6px">${a.asset_code||a.id}</div><div class="muted">${a.brand||''} ${a.model||''}</div></div>`).join('');
}

document.getElementById('roomForm').onsubmit=(e)=>{
  e.preventDefault();
  const id=document.getElementById('roomId').value;
  const name=document.getElementById('roomName').value.trim();
  const floor=document.getElementById('roomFloor').value;
  if(!name) return alert('Nama wajib');
  if(id){
    const r=state.db.locations.find(x=>x.id===id&&x.type==='room');
    if(!r) return alert('Ruang tidak ditemukan');
    r.name=name; r.parent=floor;
  } else {
    state.db.locations.push({id:uid('room'),type:'room',parent:floor,name});
  }
  save();
  closeRoom();
  renderFilters();
};

renderFilters();
renderAssets();
