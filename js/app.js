
(()=>{
'use strict';
const $ = (sel, el=document)=> el.querySelector(sel);
const $$ = (sel, el=document)=> [...el.querySelectorAll(sel)];

const VERSION = 'v10.2.7';

const store = {
  key:'ajanda_v10_records',
  load(){ try{ return JSON.parse(localStorage.getItem(this.key))||[] }catch(e){ return [] } },
  save(list){ localStorage.setItem(this.key, JSON.stringify(list)); }
};

// --- State ---
const today = new Date(); today.setHours(0,0,0,0);
let state = {
  selected: new Date(today),
  records: store.load(),
  cal: {y: today.getFullYear(), m: today.getMonth()},
  panel: null
};

// --- Utils ---
const pad = n=> String(n).padStart(2,'0');
const fmtDate = (d)=> d.toLocaleDateString('tr-TR', {year:'numeric', month:'long'});
const fmtWeekday = (d)=> d.toLocaleDateString('tr-TR', {weekday:'long'});
const ymd = (d)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseYMD = (s)=> { const [y,m,d]=s.split('-').map(Number); const dt = new Date(y, m-1, d); dt.setHours(0,0,0,0); return dt; };
const atTime = (d, hhmm)=> { const [h,m]=hhmm.split(':').map(Number); const dt=new Date(d); dt.setHours(h||0,m||0,0,0); return dt; };

// type colors
const DOT = {
  note: 'var(--purple)',
  call: 'var(--green)',
  call_missed: 'var(--red)',
  location: 'var(--cyan)'
};

// --- Render root ---
function renderHeader(){
  $('#monthLabel').textContent = fmtDate(state.selected);
}

function renderTimeline(){
  const list = $('#timeline'); list.innerHTML='';
  const selKey = ymd(state.selected);
  const dayRecords = state.records.filter(r=> r.date===selKey).sort((a,b)=> (a.time||'00:00').localeCompare(b.time||'00:00'));
  if (!dayRecords.length){
    const empty = document.createElement('div');
    empty.className='item';
    empty.innerHTML = `<span class="dot note"></span><div>Bu gün için kayıt yok.</div>`;
    list.appendChild(empty); return;
  }
  dayRecords.forEach(rec=>{
    const row = document.createElement('div');
    row.className='item';
    const dotClass = rec.type==='note'?'note': (rec.type==='call' && rec?.meta?.call?.kind==='cevapsız' ? 'call missed':'call');
    row.innerHTML = `<span class="dot ${rec.type==='location'?'loc':dotClass}"></span>
      <div>${escapeHTML(rec.title||'(Başlıksız)')}</div>
      <div class="item_right">${rec.time||''}</div>`;
    row.addEventListener('click', ()=> openDetail(rec.id));
    list.appendChild(row);
  });
}

function escapeHTML(s=''){ return s.replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }

// --- Panels infra ---
const panel = $('#panel'); const scrim = $('#scrim');
function openPanel(content){
  panel.innerHTML=''; panel.hidden=false; scrim.hidden=false;
  panel.insertAdjacentHTML('beforeend', `<div class="sheet"><div class="panel-head">
  <button class="panel-back" data-back aria-label="Geri">‹</button>
  <div class="title"></div>
  <span style="flex:1"></span>
  <button class="panel-ok" data-ok aria-label="Tamam">✓</button>
  </div><div class="panel-body"></div></div>`);
  $('.panel-body', panel).appendChild(content);
  // title is set by content.dataset.title if provided
  const t = content.dataset?.title || '';
  $('.title', panel).textContent = t;
  requestAnimationFrame(()=>{
    $('.sheet', panel).classList.add('show');
    scrim.classList.add('show');
  });
}
function closePanel(){
  const sh = $('.sheet', panel);
  if(!sh) return;
  sh.classList.remove('show'); scrim.classList.remove('show');
  setTimeout(()=>{ panel.hidden=true; scrim.hidden=true; panel.innerHTML=''; }, 180);
}

// Global back/ok handling
document.addEventListener('pointerup', (e)=>{
  const back = e.target.closest('[data-back]'); if(back){ e.preventDefault(); closePanel(); return; }
  const ok = e.target.closest('[data-ok]'); if(ok){ e.preventDefault(); if(typeof state._onOk==='function'){ state._onOk(); } }
});

scrim.addEventListener('click', ()=>{
  if (state._fabOpen){ toggleFab(false); }
  else closePanel();
});

// --- Calendar panel ---
function openCalendar(){
  const wrap = document.createElement('div');
  wrap.dataset.title='Takvim';
  wrap.className='calendar';
  const head = document.createElement('div');
  head.className='cal-head';
  const lbl = document.createElement('div'); lbl.className='cal-label';
  const prev = document.createElement('button'); prev.className='nav'; prev.textContent='‹';
  const next = document.createElement('button'); next.className='nav'; next.textContent='›';
  head.append(prev, lbl, next);
  const grid = document.createElement('div'); grid.className='cal-grid';
  wrap.append(head, grid);

  function build(){
    const y = state.cal.y, m = state.cal.m;
    lbl.textContent = new Date(y, m, 1).toLocaleDateString('tr-TR', {year:'numeric', month:'long'});

    grid.innerHTML='';
    const dows = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    dows.forEach(w=>{ const s=document.createElement('div'); s.className='dow'; s.textContent=w; grid.appendChild(s); });

    const first = new Date(y, m, 1); first.setHours(0,0,0,0);
    let startIndex = (first.getDay()+6)%7; // 0=Mon
    const daysInMonth = new Date(y, m+1, 0).getDate();

    // empty cells
    for(let i=0;i<startIndex;i++){ const emp=document.createElement('div'); grid.appendChild(emp); }

    for(let day=1; day<=daysInMonth; day++){
      const b=document.createElement('button'); b.textContent=String(day);
      const dt=new Date(y, m, day); dt.setHours(0,0,0,0);
      if (ymd(dt)===ymd(today)) b.classList.add('today');
      if (ymd(dt)===ymd(state.selected)) b.classList.add('selected');
      b.addEventListener('click', ()=>{ state.selected = dt; renderHeader(); renderTimeline(); closePanel(); });
      grid.appendChild(b);
    }
  }
  build();
  prev.onclick=()=>{ state.cal.m--; if(state.cal.m<0){ state.cal.m=11; state.cal.y--; } build(); };
  next.onclick=()=>{ state.cal.m++; if(state.cal.m>11){ state.cal.m=0; state.cal.y++; } build(); };
  openPanel(wrap);
  state._onOk = ()=> closePanel();
}

// --- Forms ---
function openForm(type, existingId=null){
  const rec = existingId ? state.records.find(r=>r.id===existingId) : null;
  const wrap = document.createElement('div'); wrap.dataset.title = rec? 'Düzenle' : 'Yeni ' + (type==='note'?'Not': type==='call'?'Çağrı':'Konum');
  const body = document.createElement('div');
  body.className='list';

  const titleRow = rowField('Başlık', 'text', rec?.title || '');
  const bodyRow = rowText('Not', rec?.body || '');
  const tagsRow = rowField('Etiketler (virgülle)', 'text', (rec?.tags||[]).join(', '));

  const timeRow = rowField('Saat', 'time', rec?.time || ''); 

  body.append(titleRow, bodyRow, tagsRow);

  if(type==='call'){
    const kinds = ['genel','gelen','giden','cevapsız'];
    const kindRow = rowSelect('Tür', kinds, rec?.meta?.call?.kind || 'genel');
    const durRow = rowField('Süre (sn)', 'number', rec?.meta?.call?.durationSec || '');
    body.append(kindRow, durRow);
  }

  if(type==='location'){
    const addrRow = rowField('Adres', 'text', rec?.meta?.location?.address || '');
    const coordRow = rowField('Koordinat', 'text', rec?.meta?.location?.lat && rec?.meta?.location?.lng ? `${rec.meta.location.lat}, ${rec.meta.location.lng}` : '');
    const mapBtn = document.createElement('button'); mapBtn.className='pill'; mapBtn.textContent='Haritadan seç';
    mapBtn.addEventListener('click', ()=> openMapPicker((lat,lng,addr)=>{
      $('.field', coordRow).value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      if(addr) $('.field', addrRow).value = addr;
    }));
    body.append(addrRow, coordRow, mapBtn);
  }

  body.append(timeRow);
  wrap.append(body);
  openPanel(wrap);

  state._onOk = ()=>{
    const title = $('.field', titleRow).value.trim();
    const bodyTxt = $('.textarea', bodyRow).value.trim();
    const tags = $('.field', tagsRow).value.split(',').map(s=>s.trim()).filter(Boolean);
    const time = $('.field', timeRow).value || '';
    const common = { title, body: bodyTxt, tags, time, date: ymd(state.selected) };

    let meta = {};
    if(type==='call'){
      const kind = $('select', body).value;
      const durationSec = parseInt($('.field', body, ).value)||undefined;
      meta.call = {kind, durationSec};
    }
    if(type==='location'){
      const address = $('.field', body.querySelectorAll('.row')[3]).value.trim(); // addr
      const coordStr = $('.field', body.querySelectorAll('.row')[4]).value.trim();
      let lat,lng; if(coordStr.includes(',')){ [lat,lng] = coordStr.split(',').map(s=>parseFloat(s)); }
      meta.location = {lat,lng,address};
    }

    if(rec){
      Object.assign(rec, common, {meta});
    }else{
      state.records.push({ id: crypto.randomUUID(), type, ...common, meta });
    }
    store.save(state.records);
    renderTimeline();
    closePanel();
  };
}

function rowField(label, type='text', value=''){
  const row = document.createElement('div'); row.className='row';
  row.innerHTML = `<div class="label">${label}</div><input class="field" type="${type}" value="${escapeHTML(String(value))}">`;
  return row;
}
function rowText(label, value=''){
  const row = document.createElement('div'); row.className='row';
  row.innerHTML = `<div class="label">${label}</div><textarea class="textarea" rows="4">${escapeHTML(String(value))}</textarea>`;
  return row;
}
function rowSelect(label, options=[], value){
  const row = document.createElement('div'); row.className='row';
  const opts = options.map(o=> `<option value="${o}" ${o===value?'selected':''}>${o[0].toUpperCase()+o.slice(1)}</option>`).join('');
  row.innerHTML = `<div class="label">${label}</div><select class="field">${opts}</select>`;
  return row;
}

// --- Detail ---
function openDetail(id){
  const rec = state.records.find(r=> r.id===id); if(!rec) return;
  const wrap = document.createElement('div'); wrap.dataset.title='Detay';
  const list = document.createElement('div'); list.className='list';

  const dot = document.createElement('span');
  dot.className = 'dot ' + (rec.type==='note'?'note': rec.type==='call' && rec?.meta?.call?.kind==='cevapsız' ? 'call missed': (rec.type==='call'?'call':'loc'));

  const row0 = document.createElement('div'); row0.className='row-card';
  row0.append(dot);
  const t = document.createElement('div'); t.className='title'; t.textContent = rec.title || '(Başlıksız)';
  row0.append(t);
  const tm = document.createElement('div'); tm.className='time'; tm.textContent = `${rec.date} • ${rec.time||''}`;
  row0.append(tm);
  list.append(row0);

  const body = document.createElement('div'); body.className='row';
  body.innerHTML = `<div class="label">Not</div><div class="value">${escapeHTML(rec.body||'')}</div>`;
  list.append(body);

  if(rec.tags?.length){
    const tg = document.createElement('div'); tg.className='row';
    tg.innerHTML = `<div class="label">Etiketler</div><div class="value">${rec.tags.map(x=>`<span class="pill">${escapeHTML(x)}</span>`).join(' ')}</div>`;
    list.append(tg);
  }

  if(rec.type==='call'){
    const k = rec?.meta?.call?.kind || 'genel';
    const dur = rec?.meta?.call?.durationSec ? `${rec.meta.call.durationSec} sn` : '-';
    const r = document.createElement('div'); r.className='row';
    r.innerHTML = `<div class="label">Çağrı</div><div class="value">${k} • ${dur}</div>`;
    list.append(r);
  }
  if(rec.type==='location'){
    const loc = rec?.meta?.location || {};
    const r = document.createElement('div'); r.className='row';
    const addr = [loc.address, (loc.lat!=null && loc.lng!=null)?`(${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`:null].filter(Boolean).join(' ');
    r.innerHTML = `<div class="label">Konum</div><div class="value">${escapeHTML(addr||'-')}</div>`;
    list.append(r);
  }

  // actions
  const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='12px'; actions.style.justifyContent='space-around'; actions.style.padding='10px';
  const edit = document.createElement('button'); edit.className='panel-ok'; edit.innerHTML='✎'; edit.title='Düzenle';
  const del = document.createElement('button'); del.className='panel-back'; del.innerHTML='🗑'; del.title='Sil';
  actions.append(edit, del);
  list.append(actions);

  edit.addEventListener('click', ()=>{ closePanel(); openForm(rec.type, rec.id); });
  del.addEventListener('click', ()=>{
    if(confirm('Silinsin mi?')){
      state.records = state.records.filter(x=> x.id!==rec.id);
      store.save(state.records); renderTimeline(); closePanel();
    }
  });

  wrap.append(list);
  openPanel(wrap);
  // hide OK button in detail
  $('[data-ok]', panel).style.display='none';
}

// --- Map picker (Leaflet) ---
let mapRef, mapMarker;
function openMapPicker(cb){
  const wrap = document.createElement('div'); wrap.dataset.title='Konum Seç';
  wrap.innerHTML = `<div id="map" style="width:min(900px,90vw);height:50vh;border-radius:18px;overflow:hidden;border:1px solid var(--stroke)"></div>
  <div style="display:flex;gap:10px;margin-top:10px;">
    <button class="pill" id="btnUse">Bu konumu kullan</button>
    <button class="pill" id="btnLocate">Mevcut konum</button>
  </div>`;
  openPanel(wrap);
  state._onOk = ()=> closePanel();

  setTimeout(()=>{
    mapRef = L.map('map', {zoomControl:false}).setView([41.015137,28.97953], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OSM'
    }).addTo(mapRef);
    mapRef.on('click', (e)=>{
      if(mapMarker) mapRef.removeLayer(mapMarker);
      mapMarker = L.marker(e.latlng).addTo(mapRef);
    });
    $('#btnLocate').onclick = ()=>{
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos=>{
          const lat=pos.coords.latitude, lng=pos.coords.longitude;
          mapRef.setView([lat,lng], 15);
          if(mapMarker) mapRef.removeLayer(mapMarker);
          mapMarker = L.marker([lat,lng]).addTo(mapRef);
        });
      }
    };
    $('#btnUse').onclick = async ()=>{
      if(!mapMarker){ alert('Önce haritada bir nokta seçin.'); return; }
      const {lat, lng} = mapMarker.getLatLng();
      // reverse geocode (best-effort)
      let addr = '';
      try{
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {headers:{'Accept-Language':'tr-TR'}});
        if(res.ok){
          const j = await res.json();
          addr = j.display_name || '';
        }
      }catch(e){}
      cb(lat, lng, addr);
      closePanel();
    };
  }, 50);
}

// --- FAB ---
const fabMain = $('#fabMain'), fabNote=$('#fabNote'), fabCall=$('#fabCall'), fabLoc=$('#fabLoc');
function toggleFab(show){
  state._fabOpen = show!==undefined? show : !state._fabOpen;
  if(state._fabOpen){
    scrim.hidden=false; scrim.classList.add('show');
    [fabNote,fabCall,fabLoc].forEach((b,i)=>{
      setTimeout(()=> b.classList.add('show'), 40*i);
    });
  }else{
    [fabNote,fabCall,fabLoc].forEach(b=> b.classList.remove('show'));
    scrim.classList.remove('show');
    setTimeout(()=>{ scrim.hidden=true; }, 180);
  }
}
fabMain.addEventListener('click', ()=> toggleFab());
fabNote.addEventListener('click', ()=>{ toggleFab(false); openForm('note'); });
fabCall.addEventListener('click', ()=>{ toggleFab(false); openForm('call'); });
fabLoc.addEventListener('click', ()=>{ toggleFab(false); openForm('location'); });

// --- Settings (export/import/cache clear) ---
$('#btnSettings').addEventListener('click', openSettings);
function openSettings(){
  const wrap = document.createElement('div'); wrap.dataset.title='Ayarlar';
  const body = document.createElement('div'); body.className='list';

  const ver = document.createElement('div'); ver.className='row'; ver.innerHTML = `<div class="label">Sürüm</div><div class="value">${VERSION}</div>`;
  const ex = document.createElement('button'); ex.className='pill'; ex.textContent='Verileri JSON olarak indir';
  ex.onclick = ()=>{
    const blob = new Blob([JSON.stringify(state.records,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ajanda-data.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  };
  const im = document.createElement('button'); im.className='pill'; im.textContent='JSON içe aktar';
  const input = document.createElement('input'); input.type='file'; input.accept='application/json'; input.style.display='none';
  im.onclick = ()=> input.click();
  input.onchange = async ()=>{
    const f = input.files[0]; if(!f) return;
    try{ const txt = await f.text(); const arr = JSON.parse(txt); if(Array.isArray(arr)){ state.records = arr; store.save(state.records); renderTimeline(); alert('Veriler içe aktarıldı.'); } }catch(e){ alert('Geçersiz JSON.'); }
  };
  const clear = document.createElement('button'); clear.className='pill'; clear.style.background='#3b82f6'; clear.textContent='Önbelleği Temizle (SW + Cache)';
  clear.onclick = async ()=> { if('serviceWorker' in navigator){ const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister())); caches && caches.keys().then(keys=> keys.forEach(k=>caches.delete(k))); alert('Önbellek temizlendi. Yenileyin.'); } };

  const wipe = document.createElement('button'); wipe.className='pill danger'; wipe.textContent='Tüm Kayıtları Sil';
  wipe.onclick=()=>{ if(confirm('Tüm kayıtlar silinsin mi?')){ state.records=[]; store.save(state.records); renderTimeline(); closePanel(); }};

  body.append(ver, ex, im, input, clear, wipe);
  wrap.append(body); openPanel(wrap); state._onOk = ()=> closePanel();
}

// --- Search (placeholder minimal) ---
$('#btnSearch').addEventListener('click', ()=>{
  const wrap = document.createElement('div'); wrap.dataset.title='Arama';
  const body = document.createElement('div'); body.className='list';
  const f = rowField('kelime, kişi...', 'search', '');
  body.append(f);
  const res = document.createElement('div'); body.append(res);
  const doSearch = ()=>{
    const q = $('.field', f).value.toLowerCase();
    res.innerHTML='';
    const filtered = state.records.filter(r=> [r.title, r.body, ...(r.tags||[])].join(' ').toLowerCase().includes(q));
    filtered.forEach(rec=>{
      const row = document.createElement('div'); row.className='row-card';
      row.innerHTML = `<span class="dot ${rec.type==='note'?'note': rec.type==='call' && rec?.meta?.call?.kind==='cevapsız' ? 'call missed': (rec.type==='call'?'call':'loc')}"></span>
        <div class="title">${escapeHTML(rec.title||'(Başlıksız)')}</div><div class="time">${rec.date} • ${rec.time||''}</div>`;
      row.addEventListener('click', ()=> openDetail(rec.id));
      body.append(row);
    });
  };
  $('.field', f).addEventListener('input', doSearch);
  doSearch();
  wrap.append(body); openPanel(wrap); state._onOk = ()=> closePanel();
});

// --- Init ---
$('#btnCalendar').addEventListener('click', openCalendar);
renderHeader(); renderTimeline();

})();