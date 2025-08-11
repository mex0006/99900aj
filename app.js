
/* Ajanda v9.4 - single-file JS */
const $ = (sel, ctx=document)=>ctx.querySelector(sel);
const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));

// State
const state = {
  date: new Date(),
  items: JSON.parse(localStorage.getItem('ajanda.items')||'[]'), // {type:"note|call|place", title, body, person, callType, place, address, coord, ts}
};

function save(){ localStorage.setItem('ajanda.items', JSON.stringify(state.items)); }

function fmtDate(d){
  return d.toLocaleDateString('tr-TR',{ day:'2-digit', month:'long', weekday:'long', year:'numeric' });
}
function fmtShortMonth(d){
  return d.toLocaleDateString('tr-TR',{ month:'long', year:'numeric' });
}
function fmtTime(d){ return d.toLocaleTimeString('tr-TR',{hour:'2-digit', minute:'2-digit'}); }

function renderHeader(){
  $('#titleDate').textContent = fmtDate(state.date);
  $('#titleMonth').textContent = fmtShortMonth(state.date);
}

function renderTimeline(){
  const target = $('#timeline');
  target.innerHTML = '';
  const dayKey = state.date.toDateString();
  const dayItems = state.items.filter(x => new Date(x.ts).toDateString() === dayKey);
  if(dayItems.length===0){
    const empty = document.createElement('div');
    empty.className = 'item';
    empty.innerHTML = '<div class="meta">Bu gün için kayıt yok.</div>';
    target.appendChild(empty);
    return;
  }
  dayItems.sort((a,b)=>a.ts-b.ts);
  for(const it of dayItems){
    const el = document.createElement('div');
    el.className = 'item';
    const title = (it.type==='note'?'Not': it.type==='call'?'Çağrı':'Konum');
    let primary = '';
    if(it.type==='note'){ primary = it.title || 'Başlıksız not'; }
    if(it.type==='call'){ primary = it.person || 'Kişi'; }
    if(it.type==='place'){ primary = it.place || 'Yer'; }
    el.innerHTML = `<div class="title">${title}</div>
    <div class="meta">${fmtTime(new Date(it.ts))}</div>
    <div style="margin-top:6px">${escapeHTML(primary)}</div>`;
    target.appendChild(el);
  }
}

function escapeHTML(str){ return (str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* Dock navigation */
function setTab(tab){
  for(const s of $$('.tab')) s.classList.remove('active');
  $('#tab-'+tab).classList.add('active');
  for(const b of $$('.dock .btn')) b.classList.remove('active');
  $('#btn-'+tab).classList.add('active');
}
$('#btn-home').addEventListener('click', ()=>setTab('home'));
$('#btn-map').addEventListener('click', ()=>setTab('map'));
$('#btn-search').addEventListener('click', ()=>setTab('search'));
$('#btn-settings').addEventListener('click', ()=>setTab('settings'));

/* Calendar toggle */
$('#btnCal').addEventListener('click', ()=>$('#cal').classList.toggle('show'));

/* FAB & FAB menu */
const fab = $('#fab');
const fabMenu = $('#fabMenu');
function toggleFab(){
  const show = !fabMenu.classList.contains('show');
  fabMenu.classList.toggle('show', show);
}
fab.addEventListener('click', toggleFab);
$('#act-note').addEventListener('click', ()=>{ openSheet('note'); });
$('#act-call').addEventListener('click', ()=>{ openSheet('call'); });
$('#act-place').addEventListener('click', ()=>{ openSheet('place'); });

/* SHEETS */
const sheets = {
  note: $('#sheet-note'),
  call: $('#sheet-call'),
  place: $('#sheet-place'),
};
function openSheet(type){
  for(const k in sheets){ sheets[k].style.display = 'none'; }
  sheets[type].style.display = 'block';
  fabMenu.classList.remove('show');
}
function closeSheets(){ for(const k in sheets){ sheets[k].style.display = 'none'; } }

$$('.sheet .btn-close').forEach(b=>b.addEventListener('click', closeSheets));

// Save handlers
$('#save-note').addEventListener('click', ()=>{
  const title = $('#note-title').value.trim();
  const body = $('#note-body').value.trim();
  const tags = $('#note-tags').value.trim();
  if(!title && !body){ alert('Lütfen not yazın.'); return; }
  state.items.push({type:'note', title, body, tags, ts: Date.now()});
  save(); closeSheets(); renderTimeline();
});

$('#save-call').addEventListener('click', ()=>{
  const person = $('#call-person').value.trim();
  const callType = $('input[name=call-type]:checked').value;
  const note = $('#call-note').value.trim();
  if(!person){ alert('Kişi adı gerekli.'); return; }
  state.items.push({type:'call', person, callType, note, ts: Date.now()});
  save(); closeSheets(); renderTimeline();
});

$('#save-place').addEventListener('click', ()=>{
  const place = $('#pl-name').value.trim();
  const address = $('#pl-addr').value.trim();
  const coord = $('#pl-coord').value.trim();
  if(!place && !address){ alert('En azından isim ya da adres gir.'); return; }
  state.items.push({type:'place', place, address, coord, ts: Date.now()});
  save(); closeSheets(); renderTimeline();
});

/* SEARCH (simple text filter) */
$('#searchInput').addEventListener('input', e=>{
  const q = e.target.value.toLowerCase();
  const matches = state.items.filter(it=>JSON.stringify(it).toLowerCase().includes(q));
  const target = $('#searchResults'); target.innerHTML = '';
  for(const it of matches){
    const el = document.createElement('div');
    el.className='item';
    el.innerHTML = `<div class="title">${it.type}</div><div>${escapeHTML(it.title||it.person||it.place||'')}</div>`;
    target.appendChild(el);
  }
});

/* PWA */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

renderHeader();
setTab('home');
renderTimeline();
