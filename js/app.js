
/* Ajanda v10.2.6 */
const $ = (sel, el=document)=>el.querySelector(sel);
const $$ = (sel, el=document)=>Array.from(el.querySelectorAll(sel));

const state = {
  items: [],
  selectedDate: new Date(),
  filter: 'all',
  editingId: null
};

const colors = { note:'#9B8CFF', call:'#2DD36F', place:'#4DA3FF' };

const fmt = {
  ymd(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; },
  time(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; },
  title(d){ return d.toLocaleDateString('tr-TR',{ weekday:'long', day:'numeric', month:'long', year:'numeric' }); },
  monthTitle(d){ return d.toLocaleDateString('tr-TR',{ month:'long', year:'numeric' }); }
};

function save(){ localStorage.setItem('ajanda.items', JSON.stringify(state.items)); }
function load(){
  try{ state.items = JSON.parse(localStorage.getItem('ajanda.items')||'[]'); }catch(e){ state.items=[]; }
}

function byDay(dateStr){
  return state.items.filter(x=>x.date===dateStr).sort((a,b)=> (a.time||'00:00').localeCompare(b.time||'00:00'));
}

function renderHeader(){
  $('#monthLabel').textContent = fmt.monthTitle(state.selectedDate);
}

function renderTimeline(){
  const day = fmt.ymd(state.selectedDate);
  const list = byDay(day);
  const wrap = $('#timeline');
  wrap.innerHTML = '';
  if(!list.length){ $('#emptyState').style.display='block'; return; }
  $('#emptyState').style.display='none';
  for(const it of list){
    const row = document.createElement('div');
    row.className='list-row';
    row.dataset.id = it.id;
    row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span class="dot ${it.type}"></span><div class="row-card-title">${it.title||cap(it.type)}</div></div><div class="muted">${it.time||''}</div>`;
    row.addEventListener('pointerup',()=>openDetail(it.id));
    wrap.appendChild(row);
  }
}

function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* Calendar */
function buildCalendar(container, date){
  container.innerHTML='';
  const head = document.createElement('div');
  head.className='cal-head';
  const prev = btn('‹'); const next = btn('›');
  prev.addEventListener('pointerup', ()=>{ const d=new Date(date); d.setMonth(d.getMonth()-1); state.selectedDate=d; renderCalendar(); });
  next.addEventListener('pointerup', ()=>{ const d=new Date(date); d.setMonth(d.getMonth()+1); state.selectedDate=d; renderCalendar(); });
  const title = document.createElement('div'); title.textContent = fmt.monthTitle(date);
  head.append(prev,title,next);
  container.appendChild(head);

  const weekdays = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const gridHead = document.createElement('div'); gridHead.className='cal-grid';
  weekdays.forEach(w=>{ const c=document.createElement('div'); c.style.opacity=.6; c.textContent=w; gridHead.appendChild(c);});
  container.appendChild(gridHead);

  const grid = document.createElement('div'); grid.className='cal-grid';
  const y = date.getFullYear(), m = date.getMonth();
  const first = new Date(y, m, 1);
  const startIdx = (first.getDay()+6)%7; // Monday first
  const daysInMonth = new Date(y, m+1, 0).getDate();
  // fill blanks
  for(let i=0;i<startIdx;i++){ const d=document.createElement('div'); grid.appendChild(d); }
  for(let day=1; day<=daysInMonth; day++){
    const d = new Date(y,m,day);
    const cell = document.createElement('div'); cell.className='cal-cell'; cell.textContent=day;
    const today = new Date(); today.setHours(0,0,0,0);
    if(d.getTime()===today.getTime()) cell.classList.add('today');
    if(fmt.ymd(d)===fmt.ymd(state.selectedDate)) cell.classList.add('sel');
    cell.addEventListener('pointerup',()=>{ state.selectedDate=d; closeSheet('#sheetCal'); renderHeader(); renderTimeline(); });
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}
function btn(txt){ const b=document.createElement('button'); b.className='icon-btn'; b.textContent=txt; return b;}
function renderCalendar(){ buildCalendar($('#calendar'), state.selectedDate); }

/* Sheets */
function openSheet(sel){ $('#scrim').classList.add('show'); $(sel).classList.add('show'); }
function closeSheet(sel){ $(sel).classList.remove('show'); $('#scrim').classList.remove('show'); }
document.addEventListener('pointerup', (e)=>{
  const back = e.target.closest('[data-back]'); if(back){ const sheet=back.closest('.sheet'); sheet && sheet.classList.remove('show'); $('#scrim').classList.remove('show'); }
});

/* FAB */
$('#btnMainFab').addEventListener('pointerup', ()=>{
  const p = $('#fabPanel'); const s=$('#scrim');
  const on = p.classList.toggle('show');
  if(on){ s.classList.add('show'); } else { s.classList.remove('show'); }
});
$('#scrim').addEventListener('pointerup', ()=>{
  $('#fabPanel').classList.remove('show'); $('#scrim').classList.remove('show');
});

$$('.fab-item').forEach(b=> b.addEventListener('pointerup', ()=>{
  const type = b.dataset.action;
  $('#fabPanel').classList.remove('show');
  openEditor(type);
}));

/* Editor */
function openEditor(type, id=null){
  state.editingId = id;
  $('#editTitle').textContent = id? 'Düzenle' : 'Yeni ' + cap(type);
  $('#sheetEdit').dataset.type = type;
  if(id){
    const it = state.items.find(x=>x.id===id);
    $('#iTitle').value = it.title||'';
    $('#iText').value = it.text||'';
    $('#iTags').value = (it.tags||[]).join(', ');
    $('#iTime').value = it.time||'';
  } else {
    $('#iTitle').value = ''; $('#iText').value=''; $('#iTags').value=''; $('#iTime').value='';
  }
  openSheet('#sheetEdit');
}
$('#btnSave').addEventListener('pointerup', ()=>{
  const type = $('#sheetEdit').dataset.type || 'note';
  const it = state.editingId ? state.items.find(x=>x.id===state.editingId) : { id: 'i'+Date.now(), type, date: fmt.ymd(state.selectedDate) };
  it.title = $('#iTitle').value.trim()||cap(type);
  it.text  = $('#iText').value.trim();
  it.tags  = $('#iTags').value.split(',').map(s=>s.trim()).filter(Boolean);
  it.time  = $('#iTime').value.trim() || fmt.time();
  if(!state.editingId) state.items.push(it);
  state.editingId=null; save(); renderTimeline(); closeSheet('#sheetEdit');
});

/* Detail */
function openDetail(id){
  const it = state.items.find(x=>x.id===id); if(!it) return;
  $('#detailBody').innerHTML = `
    <div class="list-row"><span class="dot ${it.type}"></span><strong style="margin-left:8px">${cap(it.type)}</strong> <span style="margin-left:auto">${it.date}${it.time?' • '+it.time:''}</span></div>
    <div class="row"><div class="label">Not</div><div class="value">${escapeHtml(it.text||'')}</div></div>
  `;
  $('#btnEdit').onclick = ()=>openEditor(it.type, it.id);
  $('#btnDel').onclick = ()=>{ if(confirm('Silinsin mi?')){ state.items = state.items.filter(x=>x.id!==it.id); save(); renderTimeline(); closeSheet('#sheetDetail'); } };
  openSheet('#sheetDetail');
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* Search */
$('#btnSearch').addEventListener('pointerup', ()=> openSheet('#sheetSearch'));
$('#openCal').addEventListener('pointerup', ()=> openSheet('#sheetCal'));
$('.chips').addEventListener('pointerup', (e)=>{
  const c=e.target.closest('.chip'); if(!c) return; state.filter=c.dataset.filter; renderSearch();
});
$('#q').addEventListener('input', renderSearch);

function renderSearch(){
  const q = $('#q').value.toLowerCase();
  const list = $('#searchList'); list.innerHTML='';
  const data = state.items.filter(it=> (state.filter==='all'||it.type===state.filter) && (it.title||'').toLowerCase().includes(q) || (it.text||'').toLowerCase().includes(q) );
  data.forEach(it=>{
    const row = document.createElement('div');
    row.className='list-row';
    row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span class="dot ${it.type}"></span><div class="row-card-title">${it.title||cap(it.type)}</div></div><div>${it.date}</div>`;
    row.addEventListener('pointerup', ()=>{ closeSheet('#sheetSearch'); openDetail(it.id); });
    list.appendChild(row);
  });
}

/* Settings */
$('#btnSettings').addEventListener('pointerup', ()=> openSheet('#sheetSettings'));
$('#btnExport').addEventListener('pointerup', ()=>{
  const blob = new Blob([ JSON.stringify(state.items, null, 2) ], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='ajanda-data.json'; a.click();
});
$('#btnImport').addEventListener('pointerup', ()=> $('#fileImport').click() );
$('#fileImport').addEventListener('change', (e)=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=()=>{ try{ state.items=JSON.parse(r.result); save(); renderTimeline(); alert('İçe aktarıldı'); }catch(err){ alert('Geçersiz JSON'); } };
  r.readAsText(f);
});
$('#btnClearCache').addEventListener('pointerup', async ()=>{
  if('serviceWorker' in navigator){
    const regs = await navigator.serviceWorker.getRegistrations(); for(const r of regs) await r.unregister();
  }
  if('caches' in window){ const names = await caches.keys(); await Promise.all(names.map(n=>caches.delete(n))); }
  alert('Önbellek temizlendi. Sayfayı yenileyin.');
});
$('#btnWipe').addEventListener('pointerup', ()=>{ if(confirm('Tüm kayıtlar silinsin mi?')){ state.items=[]; save(); renderTimeline(); } });

/* Init */
function init(){
  load();
  renderHeader();
  renderTimeline();
  renderCalendar();
  renderSearch();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js'); }
}
document.addEventListener('DOMContentLoaded', init);
