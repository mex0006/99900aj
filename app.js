// Simple state
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const state = { items: JSON.parse(localStorage.getItem('aj_items')||'[]') };

// Init
document.addEventListener('DOMContentLoaded', () => {
  setDayTitle();
  renderTimeline();
  bindUI();
});

function setDayTitle(){
  const now = new Date();
  const locale = 'tr-TR';
  const long = now.toLocaleDateString(locale, { day:'2-digit', month:'long', weekday:'long'});
  $('#dayTitle').textContent = long.charAt(0).toUpperCase()+long.slice(1);
}

function renderTimeline(){
  const tl = $('#timeline');
  if(!state.items.length){
    tl.classList.add('empty');
    tl.textContent = 'Bu gün için kayıt yok.';
    return;
  }
  tl.classList.remove('empty');
  tl.innerHTML = state.items.map(renderItem).join('');
}
function renderItem(it){
  if(it.type==='note'){
    return `<div class="card" style="margin-top:10px"><b>📝 ${escapeHtml(it.title||'Not')}</b><div>${escapeHtml(it.text||'')}</div></div>`;
  }
  if(it.type==='call'){
    return `<div class="card" style="margin-top:10px"><b>📞 ${escapeHtml(it.name||'Kişi')}</b> — ${it.kind}</div>`;
  }
  if(it.type==='place'){
    return `<div class="card" style="margin-top:10px"><b>📍 ${escapeHtml(it.name||'Yer')}</b><div>${escapeHtml(it.addr||'')}</div></div>`;
  }
  return '';
}
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m])); }

function bindUI(){
  // calendar toggle placeholder
  $('#btnToggleCal').addEventListener('click',()=> $('#calendar').classList.toggle('hidden'));

  // FAB radial
  const fab = $('#fabAdd');
  const qa = $('#quickAdd');
  fab.addEventListener('click', ()=> {
    qa.classList.toggle('show');
    qa.classList.toggle('hidden');
    setTimeout(()=>qa.classList.add('show'),0);
  });
  qa.addEventListener('click', (e)=>{
    if(!e.target.closest('.qbtn')) return;
    const t = e.target.dataset.type;
    openComposer(t);
    qa.classList.add('hidden'); qa.classList.remove('show');
  });

  // segmented control
  $$('#callType button').forEach(btn=> btn.addEventListener('click',()=>{
    $$('#callType button').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
  }));

  // composer nav
  $('#cmpBack').addEventListener('click', closeComposer);
  $('#cmpSave').addEventListener('click', saveComposer);

  // map picker
  $('#pickOnMap').addEventListener('click', showMapPicker);
  $('#mapBack').addEventListener('click', hideMapPicker);
  $('#mapOk').addEventListener('click', confirmMapPick);
}

let composerType = null;
function openComposer(type){
  composerType = type;
  $('#cmpTitle').textContent = type==='note' ? 'Yeni Not' : (type==='call' ? 'Yeni Çağrı' : 'Yeni Konum');
  $$('#composer .form').forEach(f=>f.classList.add('hidden'));
  $('#composer').classList.remove('hidden');
  $('#composer').classList.add('show');
  if(type==='note') $('#form-note').classList.remove('hidden');
  if(type==='call') $('#form-call').classList.remove('hidden');
  if(type==='place') $('#form-place').classList.remove('hidden');
}

function closeComposer(){
  $('#composer').classList.remove('show');
  setTimeout(()=>$('#composer').classList.add('hidden'),200);
}

function saveComposer(){
  if(composerType==='note'){
    const title = $('#noteTitle').value.trim();
    const text = $('#noteText').value.trim();
    const tags = $('#noteTags').value.trim();
    if(!title && !text){ alert('Bir şeyler yaz.'); return; }
    state.items.unshift({type:'note', title, text, tags, t: Date.now()});
  }
  if(composerType==='call'){
    const name = $('#callName').value.trim();
    const kind = $('#callType .on')?.dataset.v || 'gelen';
    const note = $('#callNote').value.trim();
    if(!name){ alert('Kişi adı gerekli.'); return; }
    state.items.unshift({type:'call', name, kind, note, t: Date.now()});
  }
  if(composerType==='place'){
    const name = $('#placeName').value.trim();
    const addr = $('#placeAddr').value.trim();
    const coord = $('#placeCoord').value.trim();
    if(!name && !addr){ alert('En azından isim ya da adres gir.'); return; }
    state.items.unshift({type:'place', name, addr, coord, t: Date.now()});
  }
  localStorage.setItem('aj_items', JSON.stringify(state.items));
  renderTimeline();
  closeComposer();
}

/* Map pick */
let map, marker, pickedLatLng=null;
function showMapPicker(){
  $('#mapWrap').classList.remove('hidden');
  setTimeout(()=>{
    if(!map){
      map = L.map('map',{ zoomControl:true }).setView([39.925,32.8369], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom:19, attribution:'&copy; OpenStreetMap'
      }).addTo(map);
      map.on('click', onMapClick);
    } else {
      map.invalidateSize();
    }
  },50);
}
function hideMapPicker(){
  $('#mapWrap').classList.add('hidden');
}
function onMapClick(e){
  pickedLatLng = e.latlng;
  if(!marker){ marker = L.marker(e.latlng).addTo(map); }
  else{ marker.setLatLng(e.latlng); }
}
async function confirmMapPick(){
  if(!pickedLatLng){ hideMapPicker(); return; }
  const coord = `${pickedLatLng.lat.toFixed(6)}, ${pickedLatLng.lng.toFixed(6)}`;
  $('#placeCoord').value = coord;
  // Reverse geocode
  try{
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pickedLatLng.lat}&lon=${pickedLatLng.lng}&accept-language=tr`;
    const res = await fetch(url, { headers: { 'User-Agent':'ajanda-pwa-demo' } });
    const data = await res.json();
    $('#placeAddr').value = data.display_name || '';
  }catch(err){ console.warn('reverse geocode fail', err); }
  hideMapPicker();
}
