
// Ajanda v11 - core
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const state = {
  selected: new Date(),
  data: [], // {id,type:'note|call|loc', date:'YYYY-MM-DD', time:'HH:mm', title, body, tags, meta:{}}
  monthCursor: new Date(),
  map: null, mapMarker: null
};

// Utilities
const pad = n => String(n).padStart(2,'0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseTime = s => s && /^\d{1,2}:\d{2}$/.test(s) ? s : '';
const toLocalDate = (y,m,d)=>{const dt=new Date(y,m,d); dt.setHours(0,0,0,0); return dt;};
const today = ()=>{const t=new Date(); t.setHours(0,0,0,0); return t;};

// Storage (IndexedDB)
let db;
function dbOpen(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open('ajanda_v11',1);
    req.onupgradeneeded = e => {
      db = e.target.result;
      const store = db.createObjectStore('items',{keyPath:'id',autoIncrement:true});
      store.createIndex('by_date','date',{unique:false});
    };
    req.onsuccess = e => { db = e.target.result; res(); };
    req.onerror = e => rej(e);
  });
}
function dbAll(){
  return new Promise((res,rej)=>{
    const tx = db.transaction('items','readonly').objectStore('items').getAll();
    tx.onsuccess = () => res(tx.result||[]);
    tx.onerror = rej;
  });
}
function dbAdd(item){
  return new Promise((res,rej)=>{
    const tx = db.transaction('items','readwrite').objectStore('items').add(item);
    tx.onsuccess = ()=>res(tx.result);
    tx.onerror = rej;
  });
}
function dbPut(item){
  return new Promise((res,rej)=>{
    const tx = db.transaction('items','readwrite').objectStore('items').put(item);
    tx.onsuccess = ()=>res();
    tx.onerror = rej;
  });
}
function dbDel(id){
  return new Promise((res,rej)=>{
    const tx = db.transaction('items','readwrite').objectStore('items').delete(id);
    tx.onsuccess = ()=>res();
    tx.onerror = rej;
  });
}

// Migrasyon v10 -> v11 (localStorage'tan)
function migrate(){
  try{
    const old = JSON.parse(localStorage.getItem('ajanda_data')||'[]');
    if(old.length){
      old.forEach(o=>{ delete o._temp; });
      Promise.all(old.map(o=>dbAdd(o))).then(()=>{
        localStorage.removeItem('ajanda_data');
      });
    }
  }catch(_){}
}

// Calendar rendering
function renderCalendar(){
  const cur = state.monthCursor;
  const y = cur.getFullYear(), m = cur.getMonth();
  $('#calTitle').textContent = new Date(y,m,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  $('#calTitle').textContent = capitalize($('#calTitle').textContent);
  // Compute grid (Mon-first)
  const first = new Date(y,m,1);
  const startDay = (first.getDay()+6)%7; // Mon=0..Sun=6
  const daysInMonth = new Date(y,m+1,0).getDate();
  const grid = $('#calGrid'); grid.innerHTML='';
  // pre padding
  for(let i=0;i<startDay;i++){ grid.append(emptyCell()); }
  const selKey = dkey(state.selected);
  const todayKey = dkey(today());
  for(let d=1; d<=daysInMonth; d++){
    const dt = new Date(y,m,d); dt.setHours(0,0,0,0);
    const c = document.createElement('div'); c.className='cell';
    c.textContent = d;
    const key = dkey(dt);
    if(key===todayKey) c.classList.add('is-today');
    if(key===selKey) c.classList.add('is-selected');
    c.addEventListener('click', ()=>{ state.selected = dt; renderTimeline(); });
    grid.append(c);
  }
}
function emptyCell(){ const c=document.createElement('div'); c.className='cell'; c.style.visibility='hidden'; return c; }
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

// Timeline
function renderTimeline(){
  const key = dkey(state.selected);
  $('#monthLabel').textContent = state.selected.toLocaleDateString('tr-TR',{month:'long',year:'numeric'}).replace(/^./,m=>m.toUpperCase());
  const items = state.data.filter(x=>x.date===key).sort((a,b)=> (a.time||'00:00') < (b.time||'00:00') ? -1:1);
  const el = $('#timeline'); el.innerHTML='';
  $('#emptyState').style.display = items.length? 'none':'block';
  items.forEach(it=>{
    const row = document.createElement('div'); row.className='row';
    const left = document.createElement('div'); left.style.display='flex'; left.style.alignItems='center'; left.style.gap='10px';
    const dot = document.createElement('div'); dot.className='dot '+(it.type==='note'?'note':it.type==='call'?'call':'loc');
    left.append(dot);
    const title = document.createElement('div'); title.textContent = it.title|| (it.type==='note'?'Not': it.type==='call'?'Çağrı':'Konum');
    left.append(title);
    const right = document.createElement('div'); right.className='time'; right.textContent = it.time || '';
    row.append(left, right);
    row.addEventListener('click', ()=> openEditor(it.type, it));
    el.append(row);
  });
  renderCalendar(); // to refresh selected highlight
}

// Dock / Sheets
const scrim = $('#scrim'), dock = $('#dock');
function openDock(){ scrim.classList.add('show'); dock.classList.add('show'); }
function closeDock(){ scrim.classList.remove('show'); dock.classList.remove('show'); }
$('#btnFab').addEventListener('click', openDock);
scrim.addEventListener('click', ()=>{ closeDock(); closeAllSheets(); });

dock.addEventListener('click', e=>{
  const card = e.target.closest('.dock-card'); if(!card) return;
  closeDock(); openEditor(card.dataset.open);
});

function sheet(id, show){
  const el = $(id);
  if(show) el.classList.add('show'); else el.classList.remove('show');
}

function closeAllSheets(){ ['#sheet-note','#sheet-call','#sheet-loc','#sheet-search','#sheet-settings'].forEach(id=>$(id).classList.remove('show')); }

$$('[data-close]').forEach(btn=> btn.addEventListener('click', closeAllSheets));

// Editors open
function openEditor(kind, item=null){
  if(kind==='note'){
    $('#noteTitle').value = item?.title||'';
    $('#noteBody').value = item?.body||'';
    $('#noteTags').value = (item?.tags||[]).join(', ');
    $('#noteTime').value = item?.time||'';
    $('#saveNote').onclick = async ()=>{
      const payload = {type:'note', date: dkey(state.selected), time: parseTime($('#noteTime').value)||'', title: $('#noteTitle').value.trim(), body: $('#noteBody').value.trim(), tags: $('#noteTags').value.split(',').map(s=>s.trim()).filter(Boolean)};
      if(item?.id){ payload.id=item.id; await dbPut(payload);} else await dbAdd(payload);
      state.data = await dbAll(); renderTimeline(); closeAllSheets();
    };
    sheet('#sheet-note', true);
  }
  if(kind==='call'){
    $('#callPerson').value = item?.meta?.person||'';
    $('#callTime').value = item?.time||'';
    $('#callDur').value = item?.meta?.minutes||'';
    // chip
    $$('#callType .chip').forEach(c=> c.classList.toggle('active', (item?.meta?.kind||'genel')===c.dataset.type));
    $('#callNow').onclick = ()=>{
      const d=new Date(); $('#callTime').value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    $('#saveCall').onclick = async ()=>{
      const kind = $$('#callType .chip').find(c=>c.classList.contains('active')).dataset.type;
      const payload = {type:'call', date:dkey(state.selected), time:parseTime($('#callTime').value)||'', title: $('#callPerson').value||'Çağrı', body:'', tags:[], meta:{kind, person: $('#callPerson').value, minutes: parseInt($('#callDur').value||'0',10)}};
      if(item?.id){ payload.id=item.id; await dbPut(payload);} else await dbAdd(payload);
      state.data = await dbAll(); renderTimeline(); closeAllSheets();
    };
    sheet('#sheet-call', true);
  }
  if(kind==='loc'){
    $('#locTitle').value = item?.title||'';
    $('#locBody').value = item?.body||'';
    $('#locAddr').value = item?.meta?.addr||'';
    initMap(item?.meta?.lat, item?.meta?.lng);
    $('#useCurrent').onclick = ()=>{
      navigator.geolocation?.getCurrentPosition(pos=>{
        const {latitude, longitude} = pos.coords;
        setMapMarker(latitude, longitude);
      });
    };
    $('#pickOnMap').onclick = ()=>{
      // Toggle a one-time click
      state.map.once('click', (e)=>{
        setMapMarker(e.latlng.lat, e.latlng.lng);
      });
    };
    $('#saveLoc').onclick = async ()=>{
      const meta = {addr: $('#locAddr').value, lat: state.mapMarker?.getLatLng().lat, lng: state.mapMarker?.getLatLng().lng};
      const payload = {type:'loc', date:dkey(state.selected), time:'', title: $('#locTitle').value||'Konum', body: $('#locBody').value||'', tags:[], meta};
      if(item?.id){ payload.id=item.id; await dbPut(payload);} else await dbAdd(payload);
      state.data = await dbAll(); renderTimeline(); closeAllSheets();
    };
    sheet('#sheet-loc', true);
  }
}

function initMap(lat=41.0082, lng=28.9784){
  setTimeout(()=>{
    if(!state.map){
      state.map = L.map('map',{zoomControl:true, attributionControl:false}).setView([lat,lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(state.map);
    } else {
      state.map.invalidateSize();
      state.map.setView([lat,lng], 13);
    }
    setMapMarker(lat,lng);
  },10);
}
function setMapMarker(lat,lng){
  if(!state.map) return;
  if(state.mapMarker){ state.mapMarker.setLatLng([lat,lng]); }
  else { state.mapMarker = L.marker([lat,lng]).addTo(state.map); }
}

// Search
$('#btnSearch').addEventListener('click', ()=>{ $('#searchInput').value=''; $('#searchResults').innerHTML=''; $('#sheet-search').classList.add('show'); });
$('#searchInput').addEventListener('input', renderSearch);
$('#searchChips').addEventListener('click', e=>{
  const c = e.target.closest('.chip'); if(!c) return;
  $$('#searchChips .chip').forEach(x=>x.classList.remove('active')); c.classList.add('active');
  renderSearch();
});
function renderSearch(){
  const q = $('#searchInput').value.toLowerCase().trim();
  const kind = $$('#searchChips .chip').find(c=>c.classList.contains('active')).dataset.kind;
  let list = state.data;
  if(kind!=='all') list = list.filter(x=>x.type===kind);
  if(q) list = list.filter(x=>(x.title||'').toLowerCase().includes(q) || (x.body||'').toLowerCase().includes(q) || (x.tags||[]).join(',').toLowerCase().includes(q) || (x.meta?.person||'').toLowerCase().includes(q));
  const box = $('#searchResults'); box.innerHTML='';
  list.slice().sort((a,b)=> (a.date+a.time) > (b.date+b.time)?-1:1).forEach(it=>{
    const row = document.createElement('div'); row.className='row';
    row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div class="dot ${it.type==='note'?'note':it.type==='call'?'call':'loc'}"></div><div>${it.title||'(başlık yok)'}</div></div><div class="time">${it.date}${it.time?' • '+it.time:''}</div>`;
    row.addEventListener('click', ()=>openEditor(it.type,it));
    box.append(row);
  });
}

// Calendar open/close + nav
let calOpen = false;
function openCal(){ $('#calendar').classList.remove('hidden'); calOpen=true; renderCalendar(); }
function closeCal(){ $('#calendar').classList.add('hidden'); calOpen=false; }
$('#btnToggleCal').addEventListener('click', ()=> calOpen ? closeCal() : openCal());
$('#btnCloseCal').addEventListener('click', closeCal);
$('#btnToday').addEventListener('click', ()=>{ state.selected = today(); state.monthCursor = new Date(state.selected); renderTimeline(); });
$('#prevMonth').addEventListener('click', ()=>{ state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth()-1, 1); renderCalendar(); });
$('#nextMonth').addEventListener('click', ()=>{ state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth()+1, 1); renderCalendar(); });

// Settings
$('#btnSettings').addEventListener('click', ()=> $('#sheet-settings').classList.add('show'));
$('#btnClear').addEventListener('click', async ()=>{
  if('serviceWorker' in navigator){
    const regs = await navigator.serviceWorker.getRegistrations();
    for(const r of regs) await r.unregister();
    caches && caches.keys().then(keys=> keys.forEach(k=>caches.delete(k)));
    alert('Önbellek temizlendi. Sayfayı yenileyin.');
  }
});
$('#btnWipe').addEventListener('click', async ()=>{
  if(confirm('Tüm kayıtlar silinsin mi?')){
    const tx = db.transaction('items','readwrite').objectStore('items').clear();
    tx.onsuccess = async ()=>{ state.data=[]; renderTimeline(); alert('Silindi'); };
  }
});
$('#btnExport').addEventListener('click', async ()=>{
  const items = await dbAll();
  const blob = new Blob([JSON.stringify(items,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ajanda.json'; a.click();
});
$('#fileImport').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const txt = await file.text();
  let arr = [];
  try{ arr = JSON.parse(txt); }catch(err){ alert('JSON okunamadı'); return; }
  for(const it of arr) await dbAdd(it);
  state.data = await dbAll(); renderTimeline(); alert('İçe aktarıldı');
});

// Init
(async function(){
  await dbOpen();
  migrate();
  state.data = await dbAll();
  state.selected = today();
  state.monthCursor = new Date(state.selected);
  renderTimeline();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }
})();

// Input zoom fix is achieved by >=16px fonts in CSS
