// v9.3 - core
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const state = {
  items: JSON.parse(localStorage.getItem('aj_items')||'[]'),
  day: new Date(),
  editor: {type:null, data:null},
  map: { instance:null, marker:null, resolve:null }
};

function saveAll(){
  localStorage.setItem('aj_items', JSON.stringify(state.items));
}

function fmtDay(d){
  const days = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${days[(d.getDay()+6)%7]}`;
}

function init(){
  // Header day
  qs('#currentDay').textContent = fmtDay(state.day);
  // Calendar toggler
  qs('#btnToggleCal').addEventListener('click', () => {
    const cal = qs('#calendar');
    const hidden = cal.hasAttribute('hidden');
    if(hidden){ buildCalendar(); cal.removeAttribute('hidden'); qs('#btnToggleCal .btn-text').textContent = 'Takvimi gizle'; }
    else { cal.setAttribute('hidden',''); qs('#btnToggleCal .btn-text').textContent = 'Takvimi aç'; }
  });

  // FAB
  const fab = qs('#fab');
  const sd = qs('#speedDial');
  fab.addEventListener('click', () => {
    if(sd.hasAttribute('hidden')) {
      sd.removeAttribute('hidden');
      requestAnimationFrame(() => qsa('.dial').forEach(d=>d.classList.add('show')));
      document.addEventListener('click', closeDialOnce, {once:true});
    } else closeDial();
  });
  qsa('.dial').forEach(d => d.addEventListener('click', (e)=>{
    e.stopPropagation();
    const type = d.dataset.type;
    closeDial();
    openEditor(type);
  }));

  // Tabs
  qsa('.tab').forEach(btn=> btn.addEventListener('click', ()=> switchTab(btn.dataset.tab)));

  buildTimeline();
  switchTab('home');
}
function closeDial(){ const sd=qs('#speedDial'); sd.setAttribute('hidden',''); qsa('.dial').forEach(d=>d.classList.remove('show')); }
function closeDialOnce(){ closeDial(); }

function switchTab(name){
  qsa('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  ['pageMap','pageSearch','pageSettings'].forEach(id=>qs('#'+id).hidden = true);
  if(name==='map'){ renderMapPage(); qs('#pageMap').hidden=false; }
  else if(name==='search'){ qs('#pageSearch').hidden=false; }
  else if(name==='settings'){ qs('#pageSettings').hidden=false; wireSettings(); }
  else { /* home */ }
}

function buildCalendar(){
  const el = qs('#calendar'); el.innerHTML = '';
  const grid = document.createElement('div');
  grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(7,1fr)'; grid.style.gap='8px';
  for(let i=1;i<=31;i++){
    const b=document.createElement('button');
    b.textContent=i; b.className='btn btn-glass'; b.style.padding='12px 0';
    b.addEventListener('click', ()=>{
      state.day = new Date(2025,7,i);
      qs('#currentDay').textContent = fmtDay(state.day);
      buildTimeline();
    });
    grid.appendChild(b);
  }
  el.appendChild(grid);
}

function buildTimeline(){
  const wrap = qs('#timeline'); wrap.innerHTML='';
  const todayStr = ymd(state.day);
  const items = state.items.filter(x=>x.date===todayStr);
  if(!items.length){ wrap.classList.add('empty'); wrap.textContent='Bu gün için kayıt yok.'; return; }
  wrap.classList.remove('empty');
  items.sort((a,b)=> (a.time||'').localeCompare(b.time||''));
  items.forEach(it=>{
    const card=document.createElement('div');
    card.className='glass section';
    const title= it.type==='note' ? 'Not' : (it.type==='call'?'Çağrı':'Konum');
    card.innerHTML = `<div class="row between"><div><strong>${it.time||''} — ${title}</strong></div><div class="row gap"><button class="btn btn-glass" data-act="edit">Düzenle</button><button class="btn btn-danger" data-act="del">Sil</button></div></div><div style="opacity:.85;margin-top:8px">${escapeHtml(it.title||it.name||it.address||'')}</div>`;
    card.querySelector('[data-act="edit"]').addEventListener('click', ()=> openEditor(it.type, it));
    card.querySelector('[data-act="del"]').addEventListener('click', ()=>{ const idx=state.items.indexOf(it); if(idx>-1){ state.items.splice(idx,1); saveAll(); buildTimeline(); }});
    wrap.appendChild(card);
  });
}

function escapeHtml(str){ return (str||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

// Editor (type-specific)
function openEditor(type, data=null){
  state.editor = {type, data: data? {...data}:null};
  const overlay = qs('#editorOverlay');
  const body = qs('#editorBody'); body.innerHTML='';
  const title = qs('#editorTitle');
  document.body.style.overflow='hidden';
  overlay.hidden=false;

  if(type==='note'){ title.textContent='Yeni Not';
    body.appendChild(formRow('Başlık (opsiyonel)', 'note_title', data?.title||'', 'text'));
    body.appendChild(formRow('Not', 'note_body', data?.body||'', 'textarea'));
    body.appendChild(formRow('Etiketler (virgülle)', 'note_tags', (data?.tags||[]).join(', '), 'text'));
  } else if(type==='call'){ title.textContent='Yeni Çağrı';
    body.appendChild(formRow('Kişi adı', 'call_person', data?.person||'', 'text'));
    const typ = formRow('Tür', 'call_type', data?.callType||'gelen', 'seg', ['gelen','giden','cevapsız']);
    body.appendChild(typ);
    body.appendChild(formRow('Not (opsiyonel)', 'call_note', data?.note||'', 'textarea'));
  } else if(type==='place'){ title.textContent='Yeni Konum';
    body.appendChild(formRow('Yer adı', 'place_name', data?.name||'', 'text', 'örn. Ev, İş, Kafe'));
    body.appendChild(formRow('Adres', 'place_addr', data?.address||'', 'text', 'Cadde, No, İlçe...'));
    const coordRow = formRow('Koordinat', 'place_coord', data?.coord||'', 'text');
    body.appendChild(coordRow);
    const pickBtn = document.createElement('button');
    pickBtn.className='btn btn-glass'; pickBtn.textContent='Haritada seç'; pickBtn.addEventListener('click', openMapPicker);
    body.appendChild(pickBtn);
  }

  qs('#editorBack').onclick = closeEditor;
  qs('#editorSave').onclick = () => saveEditor();
}

function formRow(label, id, value='', type='text', placeholder='', options){
  const wrap = document.createElement('div'); wrap.className='form-row';
  const lab = document.createElement('div'); lab.className='label'; lab.textContent=label; wrap.appendChild(lab);
  let input;
  if(type==='textarea'){
    input = document.createElement('textarea'); input.className='input'; input.rows=5;
  } else if(type==='seg'){
    input = document.createElement('div'); input.className='row gap';
    options.forEach(opt=>{
      const b=document.createElement('button'); b.className='btn btn-glass'; b.textContent=opt[0].toUpperCase()+opt.slice(1);
      if(opt===value) b.style.outline='2px solid rgba(255,255,255,.25)';
      b.addEventListener('click', ()=>{ input.dataset.value=opt; qsa('.btn', input).forEach(x=>x.style.outline='none'); b.style.outline='2px solid rgba(255,255,255,.25)'; });
      input.appendChild(b);
    });
    input.dataset.value = value || options[0];
  } else {
    input = document.createElement('input'); input.type='text'; input.className='input'; if(placeholder) input.placeholder=placeholder;
  }
  input.id=id; if(type!=='seg') input.value=value||'';
  wrap.appendChild(input);
  return wrap;
}

function closeEditor(){
  qs('#editorOverlay').hidden=true;
  qs('#mapPicker').hidden=true;
  document.body.style.overflow='auto';
}

function saveEditor(){
  const t = state.editor.type;
  const d = state.editor.data || {};
  const date = ymd(state.day);
  const time = new Date().toTimeString().slice(0,5);
  if(t==='note'){
    const title = qs('#note_title')?.value?.trim();
    const body = qs('#note_body')?.value?.trim();
    const tags = (qs('#note_tags')?.value || '').split(',').map(s=>s.trim()).filter(Boolean);
    if(!body){ alertBox('Not metni boş olamaz.'); return; }
    Object.assign(d, {type:'note', date, time, title, body, tags});
  } else if(t==='call'){
    const person = qs('#call_person')?.value?.trim();
    const callType = qs('#call_type')?.dataset?.value || 'gelen';
    const note = qs('#call_note')?.value?.trim();
    if(!person){ alertBox('Kişi adı gerekli.'); return; }
    Object.assign(d, {type:'call', date, time, person, callType, note});
  } else if(t==='place'){
    const name = qs('#place_name')?.value?.trim();
    const address = qs('#place_addr')?.value?.trim();
    const coord = qs('#place_coord')?.value?.trim();
    if(!(name||address)){ alertBox('En azından isim ya da adres gir.'); return; }
    Object.assign(d, {type:'place', date, time, name, address, coord});
  }
  if(!state.editor.data){ state.items.push(d); } else { Object.assign(state.editor.data, d); }
  saveAll();
  // brief beam
  const beam = qs('#beam'); beam.classList.remove('beam-idle'); beam.classList.add('beam-ok');
  setTimeout(()=>{ beam.classList.remove('beam-ok'); beam.classList.add('beam-idle'); }, 900);
  closeEditor();
  buildTimeline();
}

function alertBox(msg){
  const d=document.createElement('div');
  d.className='glass section';
  d.style.position='fixed'; d.style.left='12px'; d.style.right='12px'; d.style.bottom='88px'; d.style.zIndex='200';
  d.textContent=msg;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 1500);
}

// Map picker
function openMapPicker(){
  const mp = qs('#mapPicker'); mp.hidden=false;
  // init once
  if(!state.map.instance){
    const map = L.map('leafletMap', { zoomControl:true }).setView([39.925,32.85], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    map.on('click', (e)=>{
      if(state.map.marker) state.map.marker.remove();
      state.map.marker = L.marker(e.latlng).addTo(map);
    });
    state.map.instance = map;
  }
  // buttons
  qs('#mapCancel').onclick = ()=>{ mp.hidden=true; };
  qs('#mapConfirm').onclick = async ()=>{
    if(!state.map.marker){ alertBox('Bir nokta seç.'); return; }
    const {lat,lng} = state.map.marker.getLatLng();
    qs('#place_coord').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    // Reverse geocode via Nominatim
    try{
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {headers:{'Accept':'application/json'}});
      if(res.ok){
        const j = await res.json();
        if(j && j.display_name){
          qs('#place_addr').value = j.display_name;
        }
      }
    }catch(e){ /* silently ignore */ }
    mp.hidden=true;
  };
}

function renderMapPage(){
  const list = qs('#mapList');
  const places = state.items.filter(x=>x.type==='place');
  if(!places.length){ list.textContent='Henüz konum kaydı yok.'; return; }
  list.innerHTML='';
  places.forEach(p=>{
    const div = document.createElement('div'); div.className='section glass';
    div.innerHTML = `<strong>${p.name||'(adsız)'}:</strong> ${p.address||p.coord||''}`;
    list.appendChild(div);
  });
}

// Settings
function wireSettings(){
  qs('#btnExport').onclick = ()=>{
    const rows = [['tip','tarih','saat','başlık/ad','detay','ek']];
    state.items.forEach(it=>{
      if(it.type==='note') rows.push(['not', it.date, it.time, it.title||'', it.body||'', (it.tags||[]).join('|')]);
      else if(it.type==='call') rows.push(['çağrı', it.date, it.time, it.person||'', it.callType||'', it.note||'']);
      else if(it.type==='place') rows.push(['konum', it.date, it.time, it.name||'', it.address||'', it.coord||'']);
    });
    const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='ajanda.csv'; a.click();
  };
  qs('#fileImport').onchange = async (e)=>{
    const f = e.target.files[0]; if(!f) return; const txt = await f.text();
    const arr = JSON.parse(txt); if(Array.isArray(arr)){ state.items = arr; saveAll(); buildTimeline(); alertBox('İçe aktarıldı'); }
  };
  qs('#btnWipe').onclick = ()=>{
    if(confirm('Tüm kayıtlar silinsin mi?')){ state.items=[]; saveAll(); buildTimeline(); }
  };
}

// Search
qs('#searchBtn')?.addEventListener('click', ()=>{
  const q = (qs('#searchInput').value||'').toLowerCase();
  const res = state.items.filter(it => JSON.stringify(it).toLowerCase().includes(q));
  const box = qs('#searchResults'); box.innerHTML='';
  if(!res.length){ box.textContent='Sonuç yok.'; return; }
  res.forEach(it=>{
    const div=document.createElement('div'); div.className='section glass';
    div.innerHTML = `<div><strong>${it.date} ${it.time||''}</strong> • ${it.type}</div><div style="opacity:.85">${escapeHtml(it.title||it.person||it.name||'')}</div>`;
    box.appendChild(div);
  });
});

document.addEventListener('DOMContentLoaded', init);
