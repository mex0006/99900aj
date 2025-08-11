
(()=>{'use strict';
const VERSION='v10.3.0';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));

// State
const state={selected:soD(new Date()), data:load(), editing:null, filter:'all'};
function soD(d){const x=new Date(d); x.setHours(0,0,0,0); return x; }
function keyOf(d){return d.toISOString().slice(0,10);}
function load(){ try{return JSON.parse(localStorage.getItem('aj.data'))||{}}catch(e){return {}} }
function save(){ localStorage.setItem('aj.data', JSON.stringify(state.data)); }

// Header
function setMonthLabel(d){ $('#monthLabel').textContent=d.toLocaleDateString('tr-TR',{month:'long', year:'numeric'}); }

// Calendar
let calMonth=new Date(state.selected.getFullYear(), state.selected.getMonth(), 1);
function renderCalendar(){ 
  $('#calTitle').textContent=calMonth.toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  const g=$('#calGrid'); g.innerHTML='';
  const dow=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  dow.forEach(d=>{const el=document.createElement('div'); el.className='dow'; el.textContent=d; g.appendChild(el);});
  const first=((new Date(calMonth.getFullYear(), calMonth.getMonth(),1)).getDay()+6)%7; // Mon start
  const days=new Date(calMonth.getFullYear(), calMonth.getMonth()+1,0).getDate();
  const prev=new Date(calMonth.getFullYear(), calMonth.getMonth(),0).getDate();
  for(let i=first;i>0;i--) add(prev-i+1,true);
  for(let d=1; d<=days; d++) add(d,false);
  const total=first+days, post=Math.ceil(total/7)*7-total; 
  for(let i=1;i<=post;i++) add(i,true);
  function add(day,muted){
    const el=document.createElement('button'); el.className='cal-day'+(muted?' muted':'');
    el.textContent=String(day);
    const dt=new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
    if(+soD(dt)===+soD(new Date())) el.classList.add('today');
    if(keyOf(dt)===keyOf(state.selected)) el.classList.add('selected');
    el.addEventListener('pointerup',()=>{ state.selected=soD(dt); setMonthLabel(state.selected); renderTimeline(); $('#calendarDrawer').classList.remove('show'); });
    g.appendChild(el);
  }
}
$('#btnCalendar').addEventListener('pointerup',()=>{ const c=$('#calendarDrawer'); c.classList.toggle('show'); if(c.classList.contains('show')) renderCalendar(); });
$('#calPrev').addEventListener('pointerup',()=>{ calMonth=new Date(calMonth.getFullYear(), calMonth.getMonth()-1,1); renderCalendar(); });
$('#calNext').addEventListener('pointerup',()=>{ calMonth=new Date(calMonth.getFullYear(), calMonth.getMonth()+1,1); renderCalendar(); });

// Timeline
function renderTimeline(){ setMonthLabel(state.selected); const k=keyOf(state.selected); const list=state.data[k]||[]; const el=$('#timeline');
  if(!list.length){ el.classList.add('empty'); el.innerHTML='<div class="empty-line"><span class="dot dot-note"></span> Bu gün için kayıt yok.</div>'; return; }
  el.classList.remove('empty');
  list.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  el.innerHTML = list.map((it,i)=>row(it,i)).join('');
  $$('#timeline .row-card').forEach((n,i)=> n.addEventListener('pointerup',()=> openEditor((state.data[k][i]||{}).type,i)));
}
function row(it,i){ const dot= it.type==='note' ? 'dot-note' : (it.type==='call' ? (it.subtype==='cevapsız'?'dot-missed':'dot-call') : 'dot-place');
  const ttl = it.title || it.person || it.address || (it.type==='place'?'Konum': it.type==='call'?'Çağrı':'Not');
  const tm = it.time || ''; return `<div class="row-card" data-idx="${i}"><span class="dot ${dot}"></span><div>${esc(ttl)}</div><div class="item_right">${tm}</div></div>`; }
function esc(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);}

// FAB & Dock
const dock=$('#actionDock'), scrim=$('#scrim');
$('#btnFab').addEventListener('pointerup',toggleDock);
scrim.addEventListener('pointerup',closeAll);
function toggleDock(){ const show=!dock.classList.contains('show'); scrim.classList.toggle('show',show); dock.classList.toggle('show',show); }
function closeDock(){ scrim.classList.remove('show'); dock.classList.remove('show'); }
function closeAll(){ closeDock(); hide('#sheet'); hide('#sheetSearch'); hide('#sheetSettings'); }

// Dock actions
dock.querySelectorAll('.tile').forEach(b=> b.addEventListener('pointerup',()=> openEditor(b.dataset.type)));

// Sheets helpers
function show(sel){ const s=$(sel); s.classList.add('show'); s.setAttribute('aria-hidden','false'); }
function hide(sel){ const s=$(sel); s.classList.remove('show'); s.setAttribute('aria-hidden','true'); }
document.addEventListener('pointerup',e=>{ const back=e.target.closest('[data-back]'); if(back) closeAll(); });

// Editor
function openEditor(type,index=null){ closeDock(); state.editing={type,index}; $('#btnDelete').classList.toggle('hide', index===null);
  $('#panelTitle').textContent= index===null ? 'Yeni ' + label(type) : 'Düzenle';
  $('#panelBody').innerHTML=formHtml(type,index);
  show('#sheet');
  if(type==='place') initLeafletPicker();
}
function label(t){return t==='note'?'Not':t==='call'?'Çağrı':'Konum';}
function formHtml(type,index){ const k=keyOf(state.selected); const it=index!=null?(state.data[k][index]||{}):{type};
  return `
    <div class="field"><input class="input" id="fTitle" placeholder="Başlık (opsiyonel)" value="${att(it.title)}" /></div>
    ${ type!=='call' ? '<div class="field"><textarea id="fText" placeholder="Not...">'+(esc(it.text))+'</textarea></div>' : '' }
    ${ type==='call' ? callFields(it) : '' }
    ${ type==='place' ? placeFields(it) : '' }
    <div class="field"><input class="input" id="fTags" placeholder="Etiketler (virgülle)" value="${att((it.tags||[]).join(', '))}" /></div>
    <div class="field"><input class="input" id="fTime" placeholder="Saat (örn. 14:30)" value="${att(it.time||'')}" inputmode="time" /></div>
  `;
}
function callFields(it){ const sub=it.subtype||'genel';
  return `
  <div class="row"><div class="label">Tür</div><div class="field">
    <select id="fSubtype" class="input">
      <option value="genel" ${sub==='genel'?'selected':''}>Genel</option>
      <option value="gelen" ${sub==='gelen'?'selected':''}>Gelen</option>
      <option value="giden" ${sub==='giden'?'selected':''}>Giden</option>
      <option value="cevapsız" ${sub==='cevapsız'?'selected':''}>Cevapsız</option>
    </select></div></div>
  <div class="field"><input class="input" id="fPerson" placeholder="Kim?" value="${att(it.person||'')}" /></div>
  <div class="field"><input class="input" id="fDuration" placeholder="Süre (sn veya mm:ss)" value="${att(it.duration||'')}" inputmode="numeric"/></div>
  <div class="field"><textarea id="fText" placeholder="Görüşme detayı...">${esc(it.text||'')}</textarea></div>`;
}
function placeFields(it){ return `
  <div class="field"><input class="input" id="fAddress" placeholder="Adres" value="${att(it.address||'')}" /></div>
  <div class="row" style="gap:8px">
    <button id="btnPickMap" class="pill ghost" type="button">Haritadan Seç</button>
    <button id="btnGeo" class="pill ghost" type="button">Mevcut Konum</button>
  </div>
  <div id="mapWrap" class="field hide">
    <div id="map" style="height:260px; border-radius:18px;"></div>
    <div class="row" style="justify-content:flex-end;"><button id="btnUsePoint" class="pill" type="button">Bu konumu kullan</button></div>
  </div>
  <input id="fLat" class="input hide" value="${att(it.lat||'')}"><input id="fLng" class="input hide" value="${att(it.lng||'')}">
`; }
function att(s){return (s||'').replace(/"/g,'&quot;');}

// Save / Delete
$('#btnSave').addEventListener('pointerup', saveCurrent);
$('#btnDelete').addEventListener('pointerup',()=>{ if(state.editing.index==null) return; const k=keyOf(state.selected); state.data[k].splice(state.editing.index,1); save(); hide('#sheet'); renderTimeline(); });
function saveCurrent(){ const k=keyOf(state.selected); const list = state.data[k] || (state.data[k]=[]); const t=state.editing.type;
  const base={ type:t, title:$('#fTitle')?.value.trim()||'', text:$('#fText')?.value?.trim()||'', tags: ($('#fTags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean), time: $('#fTime')?.value.trim()||'' };
  if(t==='call'){ base.subtype=$('#fSubtype').value; base.person=$('#fPerson').value.trim(); base.duration=$('#fDuration').value.trim(); }
  if(t==='place'){ base.address=$('#fAddress').value.trim(); base.lat=$('#fLat').value||null; base.lng=$('#fLng').value||null; }
  if(state.editing.index==null) list.push(base); else list[state.editing.index]=base;
  save(); hide('#sheet'); renderTimeline();
}

// Leaflet picker
let map, marker;
function initLeafletPicker(){
  const wrap=$('#mapWrap'); const mdiv=$('#map');
  $('#btnPickMap').addEventListener('pointerup',()=>{ wrap.classList.remove('hide'); setTimeout(initMap,0); });
  $('#btnGeo').addEventListener('pointerup',()=> navigator.geolocation.getCurrentPosition((pos)=>{ wrap.classList.remove('hide'); setTimeout(()=>initMap([pos.coords.latitude,pos.coords.longitude]),0); },()=>alert('Konum alınamadı.')));
  $('#btnUsePoint').addEventListener('pointerup', async ()=>{ if(!marker) return; const p=marker.getLatLng(); $('#fLat').value=p.lat.toFixed(6); $('#fLng').value=p.lng.toFixed(6);
    try{ const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}`,{headers:{'Accept':'application/json'}}); const j=await r.json(); if(j?.display_name) $('#fAddress').value=j.display_name; }catch(e){}
    wrap.classList.add('hide');
  });
  function initMap(center){ if(!map){ map=L.map(mdiv).setView(center||[41.015137,28.97953],13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map); map.on('click',e=>setMarker(e.latlng)); } else { map.invalidateSize(); if(center) map.setView(center,13); } if(center) setMarker(L.latLng(center[0],center[1])); }
  function setMarker(latlng){ if(marker) marker.setLatLng(latlng); else marker=L.marker(latlng).addTo(map); }
}

// Search
$('#btnSearch').addEventListener('pointerup',()=>{ show('#sheetSearch'); refreshSearch(); });
$('#q').addEventListener('input', refreshSearch);
$$('#sheetSearch .chip').forEach(ch=> ch.addEventListener('pointerup',()=>{ $$('#sheetSearch .chip').forEach(x=>x.classList.remove('active')); ch.classList.add('active'); state.filter=ch.dataset.filter; refreshSearch(); }));
function refreshSearch(){ const q=($('#q').value||'').toLowerCase(); const list=[]; for(const [date,items] of Object.entries(state.data)){ items.forEach((it,i)=> list.push({date,index:i,...it})); }
  const filtered=list.filter(it=> (state.filter==='all'||it.type===state.filter) && ((it.title||'').toLowerCase().includes(q) || (it.text||'').toLowerCase().includes(q) || (it.person||'').toLowerCase().includes(q) || (it.tags||[]).join(',').toLowerCase().includes(q)));
  const el=$('#searchList');
  el.innerHTML = filtered.map(it=>{ const dot= it.type==='note'?'dot-note':(it.type==='call'?(it.subtype==='cevapsız'?'dot-missed':'dot-call'):'dot-place'); const ttl=it.title||it.person||it.address||'Kayıt'; return `<div class="list-row"><span class="dot ${dot}"></span><div class="title">${esc(ttl)}</div><div class="date">${it.date} · ${it.time||''}</div></div>`; }).join('');
}

// Settings
$('#btnSettings').addEventListener('pointerup',()=> show('#sheetSettings'));
$('#btnExport').addEventListener('pointerup',()=>{ const blob=new Blob([JSON.stringify(state.data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ajanda-data.json'; a.click(); });
$('#fileImport').addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{ state.data=JSON.parse(fr.result); save(); renderTimeline(); alert('İçe aktarıldı.'); }catch(e){ alert('Geçersiz JSON.'); } }; fr.readAsText(f); });
$('#btnWipe').addEventListener('pointerup',()=>{ if(confirm('Tüm kayıtları sil?')){ state.data={}; save(); renderTimeline(); } });
$('#btnClearCache').addEventListener('pointerup', async ()=>{ if('caches' in window){ const n=await caches.keys(); await Promise.all(n.map(x=>caches.delete(x))); alert('Önbellek temizlendi.'); location.reload(); } });

// Init
function init(){ setMonthLabel(state.selected); renderTimeline(); if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js'); }
window.addEventListener('load', init);
})();
