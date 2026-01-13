import { state } from './state.js';
export function switchTab(tab){state.ui.tab=tab; document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); ['assets','wo','activity','finance','reports'].forEach(t=>document.getElementById('view-'+t).classList.toggle('hide',t!==tab));}
export function setNet(on){document.getElementById('netText').textContent=on?'Online':'Offline'; document.getElementById('netDot').style.background=on?'var(--ok)':'var(--warn)';}
