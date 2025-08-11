/* Ajanda v10.2.1 — liquid glass, TR takvim, PWA cache-safe */

const VERSION = '10.2.1';

// ================== State & Storage ==================
const storeKey = 'ajanda.items';
const state = {
  today: new Date(),
  selected: new Date(),
  items: [],
  calCursor: null, // ay görünümü
};

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function load() {
  try { state.items = JSON.parse(localStorage.getItem(storeKey) || '[]'); }
  catch { state.items = []; }
}
function save() {
  localStorage.setItem(storeKey, JSON.stringify(state.items));
}
function uid() { return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function fmtDateISO(d){ return d.toISOString().slice(0,10); }

// ================== Locale ==================
const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DOW = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"]; // Görsel başlık için
const TR_DOW_MON_FIRST = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"]; // grid için

function prettyDayText(d){
  const dowLong = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"][d.getDay()];
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()} ${dowLong}`;
}

// ================== Calendar (Monday-first, TR-correct) ==================
function buildCalendar(date){
  const y = date.getFullYear();
  const m = date.getMonth();
  const first = new Date(y,m,1);
  const last = new Date(y,m+1,0);
  const firstDowSun0 = first.getDay();      // 0..6, 0=Sun
  const lead = (firstDowSun0 + 6) % 7;      // Monday-first boşluk

  const grid = $("#calGrid");
  grid.innerHTML = '';

  // DOW header
  TR_DOW_MON_FIRST.forEach(d => {
    const el = document.createElement('div');
    el.className = 'dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  // lead blanks
  for(let i=0;i<lead;i++){
    const c = document.createElement('div');
    c.className = 'cell muted';
    grid.appendChild(c);
  }

  // days
  const selISO = fmtDateISO(state.selected);
  for(let d=1; d<=last.getDate(); d++){
    const c = document.createElement('button');
    c.className = 'cell glass';
    const cur = new Date(y,m,d);
    c.textContent = d;
    c.dataset.date = cur.toISOString();
    if(fmtDateISO(cur) === selISO) c.classList.add('sel');
    c.addEventListener('click', () => {
      state.selected = cur;
      $('#prettyDay').textContent = prettyDayText(state.selected);
      $('#prettyMonth').textContent = TR_MONTHS[state.selected.getMonth()] + ' ' + state.selected.getFullYear();
      renderTimeline();
      buildCalendar(state.calCursor); // yeniden çiz
    });
    grid.appendChild(c);
  }

  $('#calTitle').textContent = `${TR_MONTHS[m]} ${y}`;
}

// ================== Timeline ==================
function renderTimeline(){
  const list = $('#timelineList');
  const dayISO = fmtDateISO(state.selected);
  const items = state.items.filter(it => it.date === dayISO)
                  .sort((a,b)=> (a.time||'00:00').localeCompare(b.time||'00:00'));
  list.classList.toggle('empty', items.length===0);
  list.innerHTML = items.length? '' : `<div class="empty-note glass">Bu gün için kayıt yok.</div>`;

  for(const it of items){
    const row = document.createElement('button');
    row.className = 'tli';
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = it.kind==='note' ? 'var(--dot-note)' :
                           it.kind==='call' ? 'var(--dot-call)' : 'var(--dot-place)';
    const body = document.createElement('div');
    const title = document.createElement('div');
    title.className='title'; title.textContent = it.title || (
      it.kind==='note' ? 'Not' : it.kind==='call' ? (it.who || 'Çağrı') : 'Konum'
    );
    const meta = document.createElement('div');
    meta.className='meta';
    meta.textContent = [(it.time||''), it.kind==='call' ? (it.callType||'') : '', it.kind==='place' ? (it.address||'') : '']
      .filter(Boolean).join(' • ');
    body.appendChild(title); body.appendChild(meta);
    row.appendChild(dot); row.appendChild(body);
    row.addEventListener('click', ()=>openDetail(it.id));
    list.appendChild(row);
  }
}

// ================== FAB & Quick Add ==================
const overlay = $('#quickAdd');
$('#fab').addEventListener('click', openQuickAdd);
overlay.addEventListener('click', (e)=> { if(e.target.classList.contains('overlay-bg')) closeQuickAdd(); });

function openQuickAdd(){
  overlay.classList.remove('hidden');
  requestAnimationFrame(()=>{
    $$('.qa-btn').forEach((el,i)=>{
      el.style.transitionDelay = `${60*i}ms`;
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    });
  });
}
function closeQuickAdd(){
  $$('.qa-btn').forEach(el=>{ el.style.transitionDelay='0ms'; el.style.transform='translateY(40px)'; el.style.opacity='0'; });
  setTimeout(()=>overlay.classList.add('hidden'), 200);
}
$$('.qa-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    closeQuickAdd();
    const kind = btn.dataset.kind;
    openForm(kind);
  });
});

// ================== Forms ==================
const formHost = $('#formHost');
function openForm(kind, existing){
  formHost.classList.add('active');
  const isEdit = !!existing;
  const ttl = isEdit ? 'Düzenle' : (`Yeni ${kind==='note'?'Not':kind==='call'?'Çağrı':'Konum'}`);
  const saveId = existing?.id;

  const html = `
    <div class="sheet enter" role="dialog" aria-modal="true">
      <div class="bar">
        <button class="glass icon-btn" id="fBack"><svg><use href="#i-back"/></svg></button>
        <div class="ttl">${ttl}</div>
        <button class="glass icon-btn" id="fSave"><svg><use href="#i-check"/></svg></button>
      </div>

      ${kind==='note'? `
        <div class="field"><div class="label">Başlık (opsiyonel)</div>
          <input id="fTitle" class="input" placeholder="örn. Fikir, yapılacak..."></div>
        <div class="field"><div class="label">Not</div>
          <textarea id="fBody" class="textarea" placeholder="Metni yaz..."></textarea></div>
        <div class="field"><div class="label">Etiketler (virgülle)</div>
          <input id="fTags" class="input" placeholder="iş, spor, aile"></div>
      `: kind==='call'? `
        <div class="field"><div class="label">Kişi adı</div>
          <input id="fWho" class="input" placeholder="örn. Ayşe Yılmaz"></div>
        <div class="field"><div class="label">Tür</div>
          <div class="chips">
            <button class="chip" data-val="Gelen">Gelen</button>
            <button class="chip" data-val="Giden">Giden</button>
            <button class="chip" data-val="Cevapsız">Cevapsız</button>
          </div>
        </div>
        <div class="field"><div class="label">Not (opsiyonel)</div>
          <input id="fBody" class="input" placeholder="Kısa not..."></div>
      `: `
        <div class="field"><div class="label">Yer adı</div>
          <input id="fTitle" class="input" placeholder="örn. Ev, İş, Kafe"></div>
        <div class="field"><div class="label">Adres</div>
          <input id="fAddress" class="input" placeholder="Cadde, No, ilçe..."></div>
        <div class="field"><div class="label">Koordinat</div>
          <input id="fCoord" class="input mono" placeholder="enlem,boylam"></div>
      `}
      <div class="field">
        <div class="label">Saat</div>
        <input id="fTime" class="input" type="time">
      </div>
    </div>
  `;
  formHost.innerHTML = html;

  // prefills for edit
  if(existing){
    $('#fTitle') && ($('#fTitle').value = existing.title || '');
    $('#fBody') && ($('#fBody').value = existing.body || '');
    $('#fTags') && ($('#fTags').value = (existing.tags||[]).join(', '));
    $('#fWho') && ($('#fWho').value = existing.who || '');
    $('#fAddress') && ($('#fAddress').value = existing.address || '');
    $('#fCoord') && ($('#fCoord').value = existing.coord || '');
    $('#fTime') && ($('#fTime').value = existing.time || '');
    if(existing.callType){
      $$('.chip').forEach(c => { if(c.dataset.val===existing.callType) c.classList.add('sel'); });
    }
  }

  // Call chips
  $$('.chip').forEach(c=> c.addEventListener('click', ()=>{
    $$('.chip').forEach(x=>x.classList.remove('sel'));
    c.classList.add('sel');
  }));

  $('#fBack').addEventListener('click', closeForm);
  $('#fSave').addEventListener('click', ()=>{
    const date = fmtDateISO(state.selected);
    if(kind==='note'){
      const title = $('#fTitle').value.trim();
      const body = $('#fBody').value.trim();
      const tags = $('#fTags').value.split(',').map(s=>s.trim()).filter(Boolean);
      if(!body){ toast("Not boş olamaz."); return; }
      upsert({ id: saveId||uid(), kind, title, body, tags,
               date, time: $('#fTime').value || null });
    } else if(kind==='call'){
      const who = $('#fWho').value.trim();
      const callType = $('.chip.sel')?.dataset.val || 'Gelen';
      const body = $('#fBody').value.trim();
      upsert({ id: saveId||uid(), kind, who, callType, body,
               date, time: $('#fTime').value || null, title: who });
    } else {
      const title = $('#fTitle').value.trim();
      const address = $('#fAddress').value.trim();
      const coord = $('#fCoord').value.trim();
      if(!(title || address)){ toast("En azından isim ya da adres gir."); return; }
      upsert({ id: saveId||uid(), kind, title, address, coord,
               date, time: $('#fTime').value || null });
    }
    closeForm();
    renderTimeline();
  });
}
function closeForm(){ formHost.classList.remove('active'); formHost.innerHTML=''; }
function upsert(obj){
  const idx = state.items.findIndex(it=>it.id===obj.id);
  if(idx>=0) state.items[idx] = {...state.items[idx], ...obj};
  else state.items.push(obj);
  save();
}

// ================== Detail ==================
const detailHost = $('#detailHost');
function openDetail(id){
  const it = state.items.find(x=>x.id===id); if(!it) return;
  detailHost.classList.add('active');
  const ttl = it.title || (it.kind==='note'?'Not':it.kind==='call'?'Çağrı':'Konum');
  const color = it.kind==='note'?'var(--dot-note)':it.kind==='call'?'var(--dot-call)':'var(--dot-place)';
  detailHost.innerHTML = `
    <div class="sheet enter">
      <div class="bar">
        <button class="glass icon-btn" id="dBack"><svg><use href="#i-back"/></svg></button>
        <div class="ttl">${ttl}</div>
        <div style="display:flex; gap:8px">
          <button class="glass icon-btn" id="dEdit"><svg><use href="#i-edit"/></svg></button>
          <button class="glass icon-btn" id="dDel"><svg><use href="#i-trash"/></svg></button>
        </div>
      </div>
      <div class="field">
        <div class="label">Tarih & Saat</div>
        <div class="input" style="display:flex; gap:8px; align-items:center;">
          <span class="dot" style="background:${color}"></span>
          <span>${prettyDayText(new Date(it.date))} ${it.time? ('• '+it.time):''}</span>
        </div>
      </div>
      ${it.kind==='note' ? `
        ${it.title? `<div class="field"><div class="label">Başlık</div><div class="input">${esc(it.title)}</div></div>`:''}
        ${it.body? `<div class="field"><div class="label">Not</div><div class="input">${nl2br(esc(it.body))}</div></div>`:''}
        ${(it.tags&&it.tags.length)? `<div class="chips">${it.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>`:''}
      `: it.kind==='call' ? `
        <div class="field"><div class="label">Kişi</div><div class="input">${esc(it.who||'—')}</div></div>
        <div class="field"><div class="label">Tür</div><div class="input">${esc(it.callType||'—')}</div></div>
        ${it.body? `<div class="field"><div class="label">Not</div><div class="input">${esc(it.body)}</div></div>`:''}
      `: `
        ${it.title? `<div class="field"><div class="label">Yer</div><div class="input">${esc(it.title)}</div></div>`:''}
        ${it.address? `<div class="field"><div class="label">Adres</div><div class="input">${esc(it.address)}</div></div>`:''}
        ${it.coord? `<div class="field"><div class="label">Koordinat</div><div class="input mono">${esc(it.coord)}</div></div>`:''}
      `}
    </div>
  `;
  $('#dBack').addEventListener('click', ()=>{ detailHost.classList.remove('active'); detailHost.innerHTML=''; });
  $('#dEdit').addEventListener('click', ()=>{ detailHost.classList.remove('active'); detailHost.innerHTML=''; openForm(it.kind, it); });
  $('#dDel').addEventListener('click', ()=>{
    if(confirm('Silinsin mi?')){
      state.items = state.items.filter(x=>x.id!==id); save(); renderTimeline();
      detailHost.classList.remove('active'); detailHost.innerHTML='';
    }
  });
}
function esc(s){ return s.replace(/[&<>"]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[m]); }
function nl2br(s){ return s.replace(/\n/g,'<br>'); }

// ================== Search ==================
const searchHost = $('#searchHost');
$('#btnSearch').addEventListener('click', openSearch);
function openSearch(){
  searchHost.classList.add('active');
  searchHost.innerHTML = `
    <div class="sheet enter">
      <div class="bar">
        <button class="glass icon-btn" id="sBack"><svg><use href="#i-back"/></svg></button>
        <div class="ttl">Arama</div>
        <span style="width:40px"></span>
      </div>
      <div class="field"><input id="sQuery" class="input" placeholder="kelime, kişi..."></div>
      <div class="chips">
        <button class="chip sel" data-k="all">Tümü</button>
        <button class="chip" data-k="note">Not</button>
        <button class="chip" data-k="call">Çağrı</button>
        <button class="chip" data-k="place">Konum</button>
      </div>
      <div id="sResults" class="tl-list" style="margin-top:12px"></div>
    </div>`;
  const q = $('#sQuery'), r = $('#sResults');
  const chips = $$('.chip');
  chips.forEach(c=>c.addEventListener('click', ()=>{ chips.forEach(x=>x.classList.remove('sel')); c.classList.add('sel'); doSearch(); }));
  q.addEventListener('input', doSearch);
  $('#sBack').addEventListener('click', ()=>{ searchHost.classList.remove('active'); searchHost.innerHTML=''; });
  doSearch();
  function doSearch(){
    const text = q.value.trim().toLowerCase();
    const filt = $('.chip.sel').dataset.k;
    const items = state.items.filter(it => (filt==='all'||it.kind===filt) &&
      (text==='' || JSON.stringify(it).toLowerCase().includes(text)));
    r.innerHTML = '';
    for(const it of items){
      const row = document.createElement('button');
      row.className='tli';
      const dot = document.createElement('div'); dot.className='dot';
      dot.style.background = it.kind==='note' ? 'var(--dot-note)' :
                             it.kind==='call' ? 'var(--dot-call)' : 'var(--dot-place)';
      const meta = document.createElement('div'); meta.className='meta';
      meta.textContent = `${it.date}${it.time? ' • '+it.time:''}`;
      const title = document.createElement('div'); title.className='title'; title.textContent = it.title || (it.kind==='call'?(it.who||'Çağrı'): (it.kind==='note'?'Not':'Konum'));
      const body = document.createElement('div'); body.appendChild(title); body.appendChild(meta);
      row.appendChild(dot); row.appendChild(body);
      row.addEventListener('click', ()=>openDetail(it.id));
      r.appendChild(row);
    }
    if(!items.length) r.innerHTML = `<div class="empty-note glass">Sonuç yok.</div>`;
  }
}

// ================== Settings ==================
$('#btnSettings').addEventListener('click', openSettings);
function openSettings(){
  const host = $('#formHost'); host.classList.add('active');
  host.innerHTML = `
    <div class="sheet enter">
      <div class="bar">
        <button class="glass icon-btn" id="stBack"><svg><use href="#i-back"/></svg></button>
        <div class="ttl">Ayarlar</div>
        <span style="width:40px"></span>
      </div>
      <div class="field"><div class="label">Sürüm</div><div class="input mono">v${VERSION}</div></div>
      <div class="field"><button id="btnExport" class="chip">Verileri JSON olarak indir</button></div>
      <div class="field">
        <label class="chip" for="imp">JSON içe aktar</label>
        <input id="imp" type="file" accept="application/json" style="display:none">
      </div>
      <div class="field"><button id="btnClear" class="chip" style="background:#3b82f6;border-color:#3b82f6;">Önbelleği Temizle (SW + Cache)</button></div>
      <div class="field"><button id="btnWipe" class="chip" style="background:#ef4444;border-color:#ef4444;">Tüm Kayıtları Sil</button></div>
    </div>
  `;
  $('#stBack').addEventListener('click', closeForm);
  $('#btnExport').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state.items,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ajanda-data.json'; a.click();
  });
  $('#imp').addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    try{
      const txt = await f.text(); const arr = JSON.parse(txt);
      if(Array.isArray(arr)){ state.items = arr; save(); renderTimeline(); toast('İçe aktarıldı.'); }
    }catch{ toast('Dosya okunamadı.'); }
  });
  $('#btnWipe').addEventListener('click', ()=>{
    if(confirm('Tüm kayıtlar silinsin mi?')){ state.items=[]; save(); renderTimeline(); toast('Silindi.'); }
  });
  $('#btnClear').addEventListener('click', clearAppCache);
}

async function clearAppCache(){
  try{
    const regs = await navigator.serviceWorker.getRegistrations(); for(const r of regs) await r.unregister();
    const keys = await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k)));
    toast('Önbellek temizlendi. Sayfa yenileniyor...');
    setTimeout(()=>location.reload(), 400);
  }catch{
    location.reload();
  }
}

// ================== Toast ==================
function toast(msg){
  const t = document.createElement('div');
  t.className='glass'; t.style.position='fixed'; t.style.left='50%'; t.style.bottom='calc(env(safe-area-inset-bottom,0) + 90px)';
  t.style.transform='translateX(-50%)'; t.style.padding='12px 16px'; t.style.borderRadius='14px'; t.textContent=msg;
  t.style.zIndex='2147483900'; document.body.appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .3s ease, transform .3s ease'; t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(6px)'; }, 1300);
  setTimeout(()=>t.remove(), 1700);
}

// ================== Init ==================
function init(){
  // header date lines
  $('#prettyDay').textContent = prettyDayText(state.selected);
  $('#prettyMonth').textContent = `${TR_MONTHS[state.selected.getMonth()]} ${state.selected.getFullYear()}`;

  // Calendar
  state.calCursor = new Date(state.selected.getFullYear(), state.selected.getMonth(), 1);
  buildCalendar(state.calCursor);
  $('#btnToggleCal').addEventListener('click', ()=>{
    $('#calendarWrap').classList.toggle('hidden');
  });
  $('#calPrev').addEventListener('click', ()=>{ state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth()-1, 1); buildCalendar(state.calCursor); });
  $('#calNext').addEventListener('click', ()=>{ state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth()+1, 1); buildCalendar(state.calCursor); });

  renderTimeline();

  // register SW
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js?v=10.2.1');
  }
}

// Load
load();
document.addEventListener('DOMContentLoaded', init);

// ================== Helpers for demo ==================
// (İstersen ilk açılışta örnek kayıtlar için buraya seed ekleyebilirsin)
