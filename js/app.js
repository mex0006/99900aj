const VERSION = 'v10.2.4';
const dom = sel => document.querySelector(sel);
const domAll = sel => Array.from(document.querySelectorAll(sel));
const fmt2 = n => n.toString().padStart(2,'0');

// State
let state = {
  date: new Date(),
  editingId: null,
  filterType: 'all'
};

// Records in localStorage
const DBKEY = 'ajanda:records';
const load = () => JSON.parse(localStorage.getItem(DBKEY) || '[]');
const save = (arr) => localStorage.setItem(DBKEY, JSON.stringify(arr));

// Dates & Calendar (TR, Monday first)
const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DOW = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

function normalizeDate(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function renderHeader(){
  const d = state.date;
  const wd = d.toLocaleDateString('tr-TR', { weekday:'long' });
  const dayName = wd.charAt(0).toUpperCase() + wd.slice(1);
  dom('#dayText').textContent = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${dayName}`;
  dom('#monthText').textContent = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function renderCalendar(){
  const view = new Date(state.date.getFullYear(), state.date.getMonth(), 1);
  dom('#calMonthLabel').textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;

  const grid = dom('#calGrid');
  grid.innerHTML = '';

  // DOW header Monday-first
  DOW.forEach(d => {
    const el = document.createElement('div');
    el.className = 'dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  // offset: convert JS Sunday=0..Saturday=6 to Monday-first 0..6
  const firstDay = (view.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
  const prevMonthDays = new Date(view.getFullYear(), view.getMonth(), 0).getDate();

  // previous month placeholders
  for(let i=0;i<firstDay;i++){
    const btn = document.createElement('button');
    btn.className='other';
    btn.textContent = (prevMonthDays - firstDay + 1 + i);
    btn.addEventListener('click', () => {
      state.date = new Date(view.getFullYear(), view.getMonth()-1, parseInt(btn.textContent));
      updateAll();
    });
    grid.appendChild(btn);
  }
  // month days
  for(let d=1; d<=daysInMonth; d++){
    const btn = document.createElement('button');
    btn.textContent = d;
    const today = normalizeDate(new Date());
    const cur = new Date(view.getFullYear(), view.getMonth(), d);
    if(+cur === +normalizeDate(state.date)) btn.classList.add('sel');
    if(+cur === +today) btn.classList.add('today');
    btn.addEventListener('click', ()=>{ state.date = cur; updateAll(); });
    grid.appendChild(btn);
  }
  // fill remainder to full weeks
  const total = 7 + firstDay + daysInMonth; // +7 for DOW header
  const remain = Math.ceil(total/7)*7 - total;
  for(let i=1;i<=remain;i++){
    const btn = document.createElement('button');
    btn.className='other';
    btn.textContent = i;
    btn.addEventListener('click', () => {
      state.date = new Date(view.getFullYear(), view.getMonth()+1, i);
      updateAll();
    });
    grid.appendChild(btn);
  }
}

function updateTimeline(){
  const list = dom('#timeline');
  const ds = load().filter(r => r.date.startsWith(dateKey(state.date)));
  list.innerHTML = '';
  if(ds.length===0){
    const empty = document.createElement('div');
    empty.className = 'item';
    empty.innerHTML = `<div class="dot note"></div><div>Bu gün için kayıt yok.</div>`;
    list.appendChild(empty);
    return;
  }
  ds.sort((a,b)=> a.time.localeCompare(b.time));
  for(const r of ds){
    const row = document.createElement('div');
    row.className = 'item';
    row.dataset.id = r.id;
    const dot = document.createElement('div');
    dot.className = `dot ${r.type}`;
    const title = document.createElement('div');
    title.innerHTML = `<strong>${r.title || (r.type==='call' ? (r.person || 'Çağrı') : r.type==='place' ? (r.place || 'Konum') : 'Not')}</strong>`;
    const right = document.createElement('div');
    right.className = 'right';
    right.textContent = r.time || '';
    row.append(dot, title, right);
    row.addEventListener('click', ()=>openDetail(r.id));
    list.appendChild(row);
  }
}

function dateKey(d){
  return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
}

// ---- Panels & Sheets
function openBackdrop(show){
  const bd = dom('#backdrop');
  bd.classList.toggle('hidden', !show);
  if(show){ requestAnimationFrame(()=>bd.classList.add('show')); }
  else{ bd.classList.remove('show'); }
}
function openSheet(id, show=true){
  const el = dom('#'+id);
  el.classList.toggle('show', show);
  el.classList.toggle('hidden', !show);
  openBackdrop(show);
}
// Backdrop click -> hepsini kapat
dom('#backdrop').addEventListener('click', ()=>{
  ['sheetPlus','sheetSearch','sheetForm','sheetDetail','sheetSettings'].forEach(id=>openSheet(id,false));
});

// Global back (çalışmıyordu → düzeltildi)
document.addEventListener('pointerup', (e)=>{
  const backBtn = e.target.closest('[data-close]');
  if(!backBtn) return;
  e.preventDefault();
  const id = backBtn.getAttribute('data-close');
  if(id) openSheet(id, false);
});

// ---- Event wiring
dom('#btnPlus').addEventListener('click', ()=> openSheet('sheetPlus', true));
dom('#btnSearch').addEventListener('click', ()=>{ renderSearch(); openSheet('sheetSearch', true); });
dom('#btnSettings').addEventListener('click', ()=> openSheet('sheetSettings', true));
dom('#btnOpenCalendar').addEventListener('click', ()=>{
  const cal = dom('#calendar');
  cal.classList.toggle('hidden');
  if(!cal.classList.contains('hidden')) renderCalendar();
});
dom('#calPrev').addEventListener('click', ()=>{ state.date = new Date(state.date.getFullYear(), state.date.getMonth()-1, 1); renderCalendar();});
dom('#calNext').addEventListener('click', ()=>{ state.date = new Date(state.date.getFullYear(), state.date.getMonth()+1, 1); renderCalendar();});

// PLUS menü
domAll('#sheetPlus .action').forEach(btn=> btn.addEventListener('click', ()=>{
  const kind = btn.dataset.action;
  buildForm(kind);
  openSheet('sheetPlus', false);
  setTimeout(()=>openSheet('sheetForm', true), 50);
}));

// Form kaydet
dom('#formSave').addEventListener('click', ()=>{
  const body = dom('#formBody');
  const kind = body.dataset.kind;
  const rec = { id: state.editingId || 'id_'+Date.now(), type: kind, date: dateKey(state.date), time: dom('#fTime').value || '' };
  if(kind==='note'){
    rec.title = dom('#fTitle').value.trim();
    rec.text = dom('#fText').value.trim();
    rec.tags = dom('#fTags').value.trim();
  }else if(kind==='call'){
    rec.person = dom('#fPerson').value.trim();
    rec.callType = dom('input[name=fCallType]:checked')?.value || 'missed';
    rec.note = dom('#fCallNote').value.trim();
  }else if(kind==='place'){
    rec.place = dom('#fPlaceName').value.trim();
    rec.address = dom('#fAddress').value.trim();
    rec.coord = dom('#fCoord').value.trim();
  }
  const arr = load().filter(x => x.id !== rec.id);
  arr.push(rec); save(arr);
  openSheet('sheetForm', false);
  updateTimeline();
});

// Detay
function openDetail(id){
  const rec = load().find(x=>x.id===id);
  if(!rec) return;
  dom('#detailBody').innerHTML = detailHTML(rec);
  dom('#detailEdit').onclick = ()=>{ buildForm(rec.type, rec); openSheet('sheetDetail', false); setTimeout(()=>openSheet('sheetForm', true),50)};
  dom('#detailDelete').onclick = ()=>{
    const arr = load().filter(x=>x.id!==id); save(arr); openSheet('sheetDetail', false); updateTimeline();
  };
  openSheet('sheetDetail', true);
}
function detailHTML(r){
  const rows = [];
  rows.push(`<div class="row"><div class="dot ${r.type}"></div><div class="value" style="font-weight:800">${r.title || r.person || r.place || (r.type==='note'?'Not':'Kayıt')}</div><div class="right">${r.date} • ${r.time||''}</div></div>`);
  if(r.text) rows.push(`<div class="row"><div class="label">Not</div><div class="value">${escapeHtml(r.text)}</div></div>`);
  if(r.tags) rows.push(`<div class="row"><div class="label">Etiketler</div><div class="value">${escapeHtml(r.tags)}</div></div>`);
  if(r.person) rows.push(`<div class="row"><div class="label">Kişi</div><div class="value">${escapeHtml(r.person)} (${r.callType})</div></div>`);
  if(r.note) rows.push(`<div class="row"><div class="label">Not</div><div class="value">${escapeHtml(r.note)}</div></div>`);
  if(r.place) rows.push(`<div class="row"><div class="label">Yer</div><div class="value">${escapeHtml(r.place)}</div></div>`);
  if(r.address) rows.push(`<div class="row"><div class="label">Adres</div><div class="value">${escapeHtml(r.address)}</div></div>`);
  if(r.coord) rows.push(`<div class="row"><div class="label">Koordinat</div><div class="value">${escapeHtml(r.coord)}</div></div>`);
  return rows.join('');
}

// Form builder
function input(label, id, placeholder=''){
  return `<div class="row"><div class="label">${label}</div><input id="${id}" class="field" placeholder="${placeholder}"/></div>`;
}
function texta(label, id, placeholder=''){
  return `<div class="row"><div class="label">${label}</div><textarea id="${id}" class="field" placeholder="${placeholder}"></textarea></div>`;
}
function buildForm(kind, rec=null){
  dom('#formBody').dataset.kind = kind;
  state.editingId = rec?.id || null;
  dom('#formTitle').textContent = rec ? 'Düzenle' : (kind==='note'?'Yeni Not': kind==='call'?'Yeni Çağrı':'Yeni Konum');
  let html = '';
  if(kind==='note'){
    html += input('Başlık (opsiyonel)','fTitle','örn. Fikir, yapılacak...');
    html += texta('Not','fText','Metni yaz...');
    html += input('Etiketler (virgülle)','fTags','iş, spor, aile');
  }else if(kind==='call'){
    html += input('Kişi adı','fPerson','örn. Ayşe Yılmaz');
    html += `<div class="row"><div class="label">Tür</div>
      <label class="chip"><input type="radio" name="fCallType" value="incoming"> Gelen</label>
      <label class="chip"><input type="radio" name="fCallType" value="outgoing"> Giden</label>
      <label class="chip"><input type="radio" name="fCallType" value="missed" checked> Cevapsız</label>
    </div>`;
    html += input('Not (opsiyonel)','fCallNote','Kısa not...');
  }else if(kind==='place'){
    html += input('Yer adı','fPlaceName','örn. Ev, İş, Kafe');
    html += input('Adres','fAddress','Cadde, No, ilçe...');
    html += input('Koordinat','fCoord','enlem, boylam');
  }
  html += input('Saat','fTime','09:30');
  dom('#formBody').innerHTML = html;
  // set values if editing
  if(rec){
    if(rec.title) dom('#fTitle').value = rec.title;
    if(rec.text) dom('#fText').value = rec.text;
    if(rec.tags) dom('#fTags').value = rec.tags;
    if(rec.person) dom('#fPerson').value = rec.person;
    if(rec.callType) { const r = domAll('input[name=fCallType]').find(x=>x.value===rec.callType); if(r) r.checked = true; }
    if(rec.note) dom('#fCallNote').value = rec.note;
    if(rec.place) dom('#fPlaceName').value = rec.place;
    if(rec.address) dom('#fAddress').value = rec.address;
    if(rec.coord) dom('#fCoord').value = rec.coord;
    if(rec.time) dom('#fTime').value = rec.time;
  }
}

// Search
function renderSearch(){
  const type = state.filterType || 'all';
  domAll('.filter').forEach(b=> b.classList.toggle('active', b.dataset.type===type));
  const q = (dom('#searchInput').value || '').toLowerCase();
  const data = load().filter(x => type==='all' || x.type===type)
    .filter(x => {
      const s = [x.title, x.text, x.tags, x.person, x.place, x.address].filter(Boolean).join(' ').toLowerCase();
      return s.includes(q);
    });
  const wrap = dom('#searchResults');
  wrap.innerHTML = '';
  for(const r of data){
    const row = document.createElement('div');
    row.className = 'row-card';
    row.innerHTML = `<div class="dot ${r.type}"></div><div class="title">${escapeHtml(r.title || r.person || r.place || r.type)}</div><div class="time">${r.date} • ${r.time||''}</div>`;
    row.addEventListener('click', ()=>openDetail(r.id));
    wrap.appendChild(row);
  }
}
domAll('.filter').forEach(b=> b.addEventListener('click', ()=>{ state.filterType = b.dataset.type; renderSearch(); }));
dom('#searchInput').addEventListener('input', renderSearch);

// Settings
dom('#appVersion').textContent = VERSION;
dom('#btnExport').addEventListener('click', ()=>{
  const blob = new Blob([localStorage.getItem(DBKEY) || '[]'], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ajanda-data.json';
  a.click();
});
dom('#importFile').addEventListener('change', (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{ localStorage.setItem(DBKEY, rd.result); updateTimeline(); alert('İçe aktarıldı.'); };
  rd.readAsText(f);
});
dom('#btnClearCaches').addEventListener('click', async()=>{
  try{
    if('caches' in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    if('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    alert('Önbellek temizlendi. Sayfayı yenileyin.');
  }catch(e){ alert('Temizleme sırasında hata: '+e); }
});
dom('#btnWipe').addEventListener('click', ()=>{
  if(confirm('Tüm kayıtlar silinsin mi?')){ localStorage.removeItem(DBKEY); updateTimeline(); }
});

function escapeHtml(s){ return s?.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])) || ''; }

function updateAll(){
  renderHeader();
  renderCalendar();
  updateTimeline();
}

// Service worker
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

updateAll();
