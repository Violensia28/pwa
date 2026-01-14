import { state, load, save, uid } from './state.js';
import { loadSeed } from './db.js';

// tabs
for(const b of document.querySelectorAll('nav button')){
  b.onclick=()=>{
    document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active', x===b));
    document.getElementById('view-assets').style.display = b.dataset.tab==='assets' ? '' : 'none';
    document.getElementById('view-wo').style.display = b.dataset.tab==='wo' ? '' : 'none';
    document.getElementById('view-reports').style.display = b.dataset.tab==='reports' ? '' : 'none';
  };
}

load();
await loadSeed();

function fullFloorPath(floorId){
  const f = state.db.locations.find(x=>x.id===floorId && x.type==='floor');
  if(!f) return '(Lantai?)';
  const b = state.db.locations.find(x=>x.id===f.parent && x.type==='building');
  const s = b ? state.db.locations.find(x=>x.id===b.parent && x.type==='site') : null;
  return [s?.name,b?.name,f?.name].filter(Boolean).join(' / ');
}

function fillFilters(){
  const byType=(t)=>state.db.locations.filter(x=>x.type===t);
  const children=(p,t)=>state.db.locations.filter(x=>x.parent===p && x.type===t);
  const fSite=document.getElementById('fSite');
  const fB=document.getElementById('fBuilding');
  const fF=document.getElementById('fFloor');
  const fR=document.getElementById('fRoom');

  const fill=(sel, items)=>{ sel.innerHTML='<option value="">Semua</option>'; items.forEach(it=>{const o=document.createElement('option');o.value=it.id;o.textContent=it.name;sel.appendChild(o);}); };

  fill(fSite, byType('site'));
  fill(fB, []); fill(fF, []); fill(fR, []);

  fSite.onchange=()=>{ fill(fB, fSite.value?children(fSite.value,'building'):[]); fill(fF,[]); fill(fR,[]); };
  fB.onchange=()=>{ fill(fF, fB.value?children(fB.value,'floor'):[]); fill(fR,[]); };
  fF.onchange=()=>{ fill(fR, fF.value?children(fF.value,'room'):[]); };
}

function ensureDemoLocations(){
  const hasRoom = state.db.locations.some(x=>x.type==='room');
  if(hasRoom) return;
  const site = state.db.locations.find(x=>x.type==='site')?.id || 'site-kantor';
  const b = {id:uid('b'),type:'building',parent:site,name:'Gedung Utama'};
  const f = {id:uid('f'),type:'floor',parent:b.id,name:'Lt.1'};
  const r = {id:uid('r'),type:'room',parent:f.id,name:'Ruang Umum'};
  state.db.locations.push(b,f,r);
  save();
}

ensureDemoLocations();
fillFilters();

// --- v6.5 inline filter controls + C2 ---
function openRoomModal(mode){
  const fRoom=document.getElementById('fRoom');
  const currentId=fRoom.value;
  document.getElementById('roomId').value='';
  document.getElementById('roomName').value='';
  const floorSel=document.getElementById('roomFloor');
  floorSel.innerHTML='';
  state.db.locations.filter(x=>x.type==='floor').forEach(fl=>{
    const o=document.createElement('option');
    o.value=fl.id;
    o.textContent=fullFloorPath(fl.id);
    floorSel.appendChild(o);
  });

  if(mode==='edit'){
    const r=state.db.locations.find(x=>x.id===currentId && x.type==='room');
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
  const id=document.getElementById('fRoom').value;
  if(!id) return alert('Pilih ruang dulu');
  const used = (state.db.assets||[]).some(a=>a.location_id===id);
  if(used) return alert('Tidak bisa hapus: ruang dipakai aset');
  state.db.locations = state.db.locations.filter(x=>x.id!==id);
  save();
  fillFilters();
};
document.getElementById('btnFilterRoomManage').onclick=()=>alert('Kelola lokasi lengkap ada di repo utama. Paket ini starter v6.5 untuk fitur lokasi.');

document.getElementById('roomForm').onsubmit=(e)=>{
  e.preventDefault();
  let newId='';
  const id=document.getElementById('roomId').value;
  const name=document.getElementById('roomName').value.trim();
  const floor=document.getElementById('roomFloor').value;
  if(!name) return alert('Nama wajib');
  if(!floor) return alert('Lantai wajib');
  if(id){
    const r=state.db.locations.find(x=>x.id===id && x.type==='room');
    if(!r) return alert('Ruang tidak ditemukan');
    r.name=name; r.parent=floor;
  } else {
    newId = uid('room');
    state.db.locations.push({id:newId,type:'room',parent:floor,name});
  }
  save();
  closeRoom();
  fillFilters();
  // auto-select edited/new room
  const target = id || newId;
  if(target) document.getElementById('fRoom').value = target;
};

// register SW
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
