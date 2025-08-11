// Ajanda v10.1 — minimalist Liquid Glass PWA
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const state = {
  current: new Date(),
  monthCursor: new Date(),
  entries: load('entries', []),
  filters: new Set(['note','call','place'])
};

// ---- utils
function save(key, v){ localStorage.setItem(key, JSON.stringify(v)); }
function load(key, d){ try{ return JSON.parse(localStorage.getItem(key)) ?? d }catch(e){ return d }}
function formatDate(d){ return new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'long', weekday:'long', year:'numeric'}).format(d) }
function monthText(d){ return new Intl.DateTimeFormat('tr-TR', { month:'long', year:'numeric'}).format(d) }
function atStartOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x }
function sameDay(a,b){ return atStartOfDay(a).getTime() === atStartOfDay(b).getTime() }
function haptic(){ if (navigator.vibrate) navigator.vibrate(8); }

// ---- header & date
const selectedDay = $('#selectedDay');
const monthLabel = $('#monthLabel');

function refreshHeader(){
  selectedDay.textContent = formatDate(state.current);
  monthLabel.textContent = new Intl.DateTimeFormat('tr-TR',{ month:'long', year:'numeric'}).format(state.current);
}

// ---- calendar (week starts Monday in TR)
const cal = $('#calendar'), calGrid = $('#calGrid'), calMonthText = $('#calMonthText');
$('#toggleCal').addEventListener('click', () => {
  cal.classList.toggle('hidden');
  if (!cal.classList.contains('hidden')) renderCalendar();
});

$('#calPrev').addEventListener('click', ()=>{ state.monthCursor.setMonth(state.monthCursor.getMonth()-1); renderCalendar(); });
$('#calNext').addEventListener('click', ()=>{ state.monthCursor.setMonth(state.monthCursor.getMonth()+1); renderCalendar(); });

function renderCalendar(){
  calMonthText.textContent = monthText(state.monthCursor);
  calGrid.innerHTML = '';
  const dow = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']; // Monday first
  dow.forEach(d => {
    const el = document.createElement('div'); el.textContent = d; el.className='dow'; calGrid.appendChild(el);
  });
  const y = state.monthCursor.getFullYear(), m = state.monthCursor.getMonth();
  const first = new Date(y, m, 1);
  // JS getDay: 0 Sun ... 6 Sat. For TR (Mon first) index = (getDay+6)%7
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m+1, 0).getDate();
  for(let i=0;i<offset;i++){ const sp = document.createElement('div'); calGrid.appendChild(sp); }
  for(let d=1; d<=daysInMonth; d++){
    const el = document.createElement('button'); el.className='day'; el.textContent = d;
    const dt = new Date(y, m, d);
    if (sameDay(dt, new Date())) el.classList.add('today');
    if (sameDay(dt, state.current)) el.classList.add('selected');
    el.addEventListener('click', () => {
      state.current = dt; refreshHeader(); renderTimeline(); haptic();
      $$('.day.selected').forEach(x=>x.classList.remove('selected')); el.classList.add('selected');
    });
    calGrid.appendChild(el);
  }
}

// ---- entries
function addEntry(e){
  e.id = crypto.randomUUID();
  state.entries.push(e);
  save('entries', state.entries);
  renderTimeline();
}
function entriesForDay(d){
  const start = atStartOfDay(d).getTime(), end = start + 86400000;
  return state.entries.filter(x => {
    const t = new Date(x.time).getTime();
    return t>=start && t<end;
  }).sort((a,b)=> new Date(a.time)-new Date(b.time));
}

const timeline = $('#timeline');

function renderTimeline(){
  const list = entriesForDay(state.current);
  if (!list.length){
    timeline.classList.add('empty');
    timeline.innerHTML = `<div class="empty-card">Bu gün için kayıt yok.</div>`;
    return;
  }
  timeline.classList.remove('empty');
  timeline.innerHTML = list.map(item => {
    const color = item.type;
    const title = item.type==='note' ? (item.title || 'Not')
                 : item.type==='call' ? (item.person || 'Çağrı')
                 : item.name || 'Konum';
    const meta = new Intl.DateTimeFormat('tr-TR',{ hour:'2-digit', minute:'2-digit'}).format(new Date(item.time))
                 + (item.type==='call' && item.callType ? ` • ${item.callType[0].toUpperCase()+item.callType.slice(1)}` : '')
                 + (item.type==='place' && item.address ? ` • ${item.address}` : '');
    return `<button class="item" data-id="${item.id}">
      <span class="dot ${color}"></span>
      <div style="text-align:left">
        <div style="font-weight:700">${title}</div>
        <div class="meta">${meta}</div>
      </div>
    </button>`;
  }).join('');

  $$('#timeline .item').forEach(btn => btn.addEventListener('click', () => openDetail(btn.dataset.id)));
}

// ---- FAB quick actions
const fab = $('#fab');
const overlay = $('#overlay');
const quick = $('#quick');

function openQuick(){
  overlay.classList.add('show'); overlay.classList.remove('hidden');
  quick.classList.remove('hidden'); requestAnimationFrame(()=> quick.classList.add('show'));
}
function closeQuick(){
  quick.classList.remove('show'); setTimeout(()=> quick.classList.add('hidden'), 250);
  overlay.classList.remove('show'); setTimeout(()=> overlay.classList.add('hidden'), 250);
}
fab.addEventListener('click', ()=>{openQuick(); haptic();});
overlay.addEventListener('click', ()=>{ closeQuick(); });

$$('#quick .quick-btn').forEach(b => b.addEventListener('click', () => {
  closeQuick(); openEditor(b.dataset.open);
}));

// ---- Editor
const editorSheet = $('#editorSheet');
const editTitle = $('#editTitle');
const editBody = $('#editBody');
$('#editBack').addEventListener('click', ()=> closeEditor());
function openEditor(type, existing){
  overlay.classList.add('show'); overlay.classList.remove('hidden');
  editorSheet.classList.remove('hidden'); requestAnimationFrame(()=> editorSheet.classList.add('show'));
  const isEdit = !!existing;
  editTitle.textContent = isEdit ? 'Düzenle' : type==='note'?'Yeni Not': type==='call'?'Yeni Çağrı':'Yeni Konum';
  editBody.innerHTML = '';
  const now = new Date();
  if (type==='note'){
    editBody.innerHTML = `
      <label>Başlık (opsiyonel)</label>
      <input id="f_title" type="text" placeholder="örn. Fikir, yapılacak…">
      <label>Not</label>
      <textarea id="f_text" placeholder="Metni yaz…"></textarea>
      <label>Etiketler (virgülle)</label>
      <input id="f_tags" type="text" placeholder="iş, spor, aile">
    `;
    if (existing){ $('#f_title').value=existing.title||''; $('#f_text').value=existing.text||''; $('#f_tags').value=(existing.tags||[]).join(', '); }
  }else if (type==='call'){
    editBody.innerHTML = `
      <label>Kişi adı</label>
      <input id="c_person" type="text" placeholder="örn. Ayşe Yılmaz">
      <label>Tür</label>
      <div class="chips">
        <button class="chip toggle" data-val="Gelen">Gelen</button>
        <button class="chip toggle" data-val="Giden">Giden</button>
        <button class="chip toggle" data-val="Cevapsız">Cevapsız</button>
      </div>
      <label>Not (opsiyonel)</label>
      <input id="c_note" type="text" placeholder="Kısa not…">
    `;
    if (existing){ $('#c_person').value=existing.person||''; $('#c_note').value=existing.note||''; }
  }else{ // place
    editBody.innerHTML = `
      <label>Yer adı</label>
      <input id="p_name" type="text" placeholder="örn. Ev, İş, Kafe">
      <label>Adres</label>
      <input id="p_addr" type="text" placeholder="Cadde, No, ilçe…">
      <label>Koordinat</label>
      <input id="p_coord" type="text" placeholder="enlem, boylam">
    `;
    if (existing){ $('#p_name').value=existing.name||''; $('#p_addr').value=existing.address||''; $('#p_coord').value=existing.coords||''; }
  }

  $('#editSave').onclick = () => {
    haptic();
    if (type==='note'){
      const title=$('#f_title').value.trim(), text=$('#f_text').value.trim(), tags=$('#f_tags').value.split(',').map(s=>s.trim()).filter(Boolean);
      if (!title && !text){ alert('En azından başlık ya da not gir.'); return;}
      if (existing){
        Object.assign(existing, {title,text,tags, time: existing.time});
        save('entries', state.entries);
      }else{
        addEntry({type:'note', title, text, tags, time: new Date().toISOString()});
      }
    }else if (type==='call'){
      const person=$('#c_person').value.trim();
      const selected = $$('#editorSheet .chip.toggle').find(x=>x.classList.contains('active'));
      const callType = selected ? selected.dataset.val : 'Gelen';
      const note=$('#c_note').value.trim();
      if (!person){ alert('Kişi adı gir.'); return;}
      if (existing){
        Object.assign(existing, {person, callType, note});
        save('entries', state.entries);
      }else{
        addEntry({type:'call', person, callType, note, time: new Date().toISOString()});
      }
    }else{
      const name=$('#p_name').value.trim();
      const address=$('#p_addr').value.trim();
      const coords=$('#p_coord').value.trim();
      if (!name && !address){ alert('En azından isim ya da adres gir.'); return;}
      if (existing){
        Object.assign(existing, {name,address,coords});
        save('entries', state.entries);
      }else{
        addEntry({type:'place', name, address, coords, time: new Date().toISOString()});
      }
    }
    closeEditor();
  };

  // toggle chips inside editor
  $$('#editorSheet .chip.toggle').forEach(ch => ch.addEventListener('click', ()=>{
    $$('#editorSheet .chip.toggle').forEach(x=>x.classList.remove('active')); ch.classList.add('active');
  }));
}
function closeEditor(){
  editorSheet.classList.remove('show'); setTimeout(()=> editorSheet.classList.add('hidden'), 250);
  overlay.classList.remove('show'); setTimeout(()=> overlay.classList.add('hidden'), 250);
}

// ---- Detail
const detailSheet = $('#detailSheet');
let detailId = null;
function openDetail(id){
  detailId=id;
  const item = state.entries.find(x=>x.id===id);
  if (!item) return;
  overlay.classList.add('show'); overlay.classList.remove('hidden');
  detailSheet.classList.remove('hidden'); requestAnimationFrame(()=> detailSheet.classList.add('show'));
  $('#detailTitle').textContent = item.type==='note'?'Not': item.type==='call'?'Çağrı':'Konum';
  $('#detailBody').innerHTML = renderDetail(item);
  $('#detailEdit').onclick = ()=>{ closeDetail(); openEditor(item.type, item); };
  $('#detailDelete').onclick = ()=>{
    if (confirm('Silinsin mi?')){
      state.entries = state.entries.filter(x=>x.id!==id);
      save('entries', state.entries);
      renderTimeline(); closeDetail();
    }
  };
}
function closeDetail(){ detailSheet.classList.remove('show'); setTimeout(()=> detailSheet.classList.add('hidden'), 250); overlay.classList.remove('show'); setTimeout(()=> overlay.classList.add('hidden'), 250); }
$$('#detailSheet [data-close="detail"]').forEach(b=> b.addEventListener('click', closeDetail));

function renderDetail(item){
  const t = new Date(item.time);
  const time = new Intl.DateTimeFormat('tr-TR',{ dateStyle:'medium', timeStyle:'short'}).format(t);
  if (item.type==='note'){
    return `<div class="row"><span class="dot note"></span><strong>${item.title||'Not'}</strong></div>
    <p style="white-space:pre-wrap">${item.text || ''}</p>
    <div class="meta">${time}</div>`;
  }else if (item.type==='call'){
    return `<div class="row"><span class="dot call"></span><strong>${item.person||'Çağrı'}</strong></div>
    <div>${item.callType||''}</div>
    <div class="meta">${time}${item.note? ' • '+item.note : ''}</div>`;
  }else{
    return `<div class="row"><span class="dot place"></span><strong>${item.name||'Konum'}</strong></div>
    <div>${item.address||''}</div>
    <div class="meta">${time}${item.coords? ' • '+item.coords : ''}</div>`;
  }
}

// ---- Search
const searchSheet = $('#searchSheet');
function openSearch(){
  overlay.classList.add('show'); overlay.classList.remove('hidden');
  searchSheet.classList.remove('hidden'); requestAnimationFrame(()=> searchSheet.classList.add('show'));
  performSearch();
}
function closeSearch(){ searchSheet.classList.remove('show'); setTimeout(()=> searchSheet.classList.add('hidden'), 250); overlay.classList.remove('show'); setTimeout(()=> overlay.classList.add('hidden'), 250);}
$('#btnSearch').addEventListener('click', openSearch);
$('#floatingSearch').addEventListener('click', openSearch);
$$('#searchSheet [data-close="search"]').forEach(b=> b.addEventListener('click', closeSearch));
$('#searchInput').addEventListener('input', performSearch);
$$('#searchSheet .chip.toggle').forEach(ch => ch.addEventListener('click', ()=>{
  ch.classList.toggle('active');
  const key = ch.dataset.filter;
  if (ch.classList.contains('active')) state.filters.add(key); else state.filters.delete(key);
  performSearch();
}));
function performSearch(){
  const q = $('#searchInput').value?.toLowerCase() ?? '';
  const list = state.entries.filter(x => state.filters.has(x.type)).filter(x => {
    const hay = JSON.stringify(x).toLowerCase();
    return hay.includes(q);
  }).sort((a,b)=> new Date(b.time)-new Date(a.time));
  $('#searchList').innerHTML = list.map(item => {
    const title = item.type==='note'?(item.title||'Not') : item.type==='call'?(item.person||'Çağrı') : (item.name||'Konum');
    const dot = `<span class="dot ${item.type}"></span>`;
    const meta = new Intl.DateTimeFormat('tr-TR',{ dateStyle:'medium', timeStyle:'short'}).format(new Date(item.time));
    return `<button class="item" data-id="${item.id}">${dot}<div><div style="font-weight:700">${title}</div><div class="meta">${meta}</div></div></button>`;
  }).join('');
  $$('#searchList .item').forEach(b=> b.addEventListener('click', ()=>{ closeSearch(); openDetail(b.dataset.id); }));
}

// ---- Settings (placeholder)
$('#btnSettings').addEventListener('click', ()=>{
  alert('Ayarlar: Beta — tema ve veri dışa/içe aktarımı yakında.');
});

// ---- Floating Search button also in list-head
$('#floatingSearch').addEventListener('click', haptic);

// ---- boot
function boot(){
  state.monthCursor = new Date(state.current);
  refreshHeader();
  renderTimeline();
  renderCalendar();
  // Mark all chips active
  $$('#searchSheet .chip.toggle').forEach(ch => ch.classList.add('active'));
}
boot();

// ---- PWA
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(console.warn));
}
