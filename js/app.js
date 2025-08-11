// Ajanda v9.6R2 - liquid glass UI
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const storeKey = 'agendaEntries_v96R2';

const state = {
  entries: [],
  filter: { q:'', types: new Set(['note','call','place']) }
};

function vibrate(ms=10){ if('vibrate' in navigator) try{ navigator.vibrate(ms); }catch(e){} }

function uid(){ return Math.random().toString(36).slice(2) }

function fmtDate(d){
  const days = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${days[(d.getDay()+6)%7]}`;
}
function monthLabel(d){
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function load(){
  try{
    state.entries = JSON.parse(localStorage.getItem(storeKey) || '[]');
  }catch(e){ state.entries = [] }
}
function save(){ localStorage.setItem(storeKey, JSON.stringify(state.entries)); }

function initHeader(){
  const d = new Date();
  $('#headlineDate').textContent = fmtDate(d);
  $('#headlineMonth').textContent = monthLabel(d);
}

function renderTimeline(){
  const list = $('#timeline'); list.innerHTML='';
  const q = state.filter.q.toLowerCase();
  const types = state.filter.types;
  const entries = state.entries
    .filter(e => types.has(e.type))
    .filter(e => (e.title||'').toLowerCase().includes(q) || (e.note||'').toLowerCase().includes(q) || (e.person||'').toLowerCase().includes(q) || (e.address||'').toLowerCase().includes(q))
    .sort((a,b)=> (b.created||0)-(a.created||0));
  if(!entries.length){
    const empty = document.createElement('div');
    empty.className='card-item';
    empty.innerHTML = `<h4 class="muted">Bu gün için kayıt yok.</h4>`;
    list.appendChild(empty);
    return;
  }
  for(const e of entries){
    const item = document.createElement('button');
    item.className='card-item';
    let title = e.type==='note' ? 'Not' : e.type==='call' ? 'Çağrı' : 'Konum';
    let body = e.type==='note' ? (e.title||'Yeni not') :
               e.type==='call' ? (e.person||'Bilinmeyen') :
               (e.name||e.address||'Konum');
    item.innerHTML = `<h4>${title}</h4><p>${body}</p>`;
    item.onclick = ()=>{ vibrate(8); openDetail(e.id); };
    list.appendChild(item);
  }
}

/* ---------- Speed Dial ---------- */
function initDial(){
  const overlay = $('#dialOverlay');
  $('#btnPlus').addEventListener('click', ()=>{
    vibrate(20);
    overlay.classList.remove('hidden');
    requestAnimationFrame(()=> overlay.classList.add('show'));
  });
  overlay.addEventListener('click', (ev)=>{
    if(ev.target === overlay){ overlay.classList.remove('show'); setTimeout(()=>overlay.classList.add('hidden'), 200); }
  });
  $$('.dial-item').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const t = btn.dataset.type;
      overlay.classList.remove('show'); setTimeout(()=>overlay.classList.add('hidden'), 200);
      openSheet(t);
    });
  });
}

/* ---------- Sheets (create/edit) ---------- */
function sheetSkeleton(title){
  const el = $('#sheet');
  el.innerHTML = `
    <div class="sheet-header">
      <button class="corner-left" id="sheetBack" aria-label="Geri">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <div class="sheet-title" id="sheetTitle">${title}</div>
      <button class="corner-right" id="sheetOk" aria-label="Kaydet">
        <svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
      </button>
    </div>
    <div class="sheet-body"></div>
  `;
  $('#sheetBack').onclick = closeSheet;
  $('.sheet-backdrop').classList.add('show');
  el.classList.add('show');
}
function closeSheet(){
  $('.sheet-backdrop').classList.remove('show');
  $('#sheet').classList.remove('show');
  setTimeout(()=>{ $('#sheet').classList.add('hidden'); $('#sheet').innerHTML=''; },200);
}
function showSheet(){ $('#sheet').classList.remove('hidden'); }
function openSheet(type, id=null){
  showSheet(); 
  const isEdit = !!id;
  const e = isEdit ? state.entries.find(x=>x.id===id) : { id:uid(), type, created:Date.now() };
  const titleMap = {note:'Yeni Not', call:'Yeni Çağrı', place:'Yeni Konum'};
  sheetSkeleton(isEdit? 'Düzenle' : titleMap[type]);
  const body = $('#sheet .sheet-body');
  if(type==='note'){
    body.innerHTML = `
      <label class="label">Başlık (opsiyonel)</label>
      <input class="input" id="nTitle" placeholder="örn. Fikir, yapılacak..." value="${e.title||''}">
      <label class="label">Not</label>
      <textarea id="nText" placeholder="Metni yaz...">${e.note||''}</textarea>
      <label class="label">Etiketler (virgülle)</label>
      <input class="input" id="nTags" placeholder="iş, spor, aile" value="${(e.tags||[]).join(', ')}">
    `;
  } else if(type==='call'){
    body.innerHTML = `
      <div class="row" style="gap:10px">
        <div style="flex:1">
          <label class="label">Kişi adı</label>
          <input class="input" id="cPerson" placeholder="örn. Ayşe Yılmaz" value="${e.person||''}">
        </div>
        <div style="flex:1">
          <label class="label">Tür</label>
          <div class="chips">
            ${['gelen','giden','cevapsız'].map((x,i)=>{
              const map = {gelen:'Gelen',giden:'Giden',cevapsız:'Cevapsız'};
              const active = (e.kind||'gelen')===x ? 'active':'';
              return `<button type="button" data-v="${x}" class="chipbtn ${active}" onclick="selectCallKind(this)">${map[x]}</button>`
            }).join('')}
          </div>
        </div>
      </div>
      <label class="label">Not (opsiyonel)</label>
      <input class="input" id="cNote" placeholder="Kısa not..." value="${e.note||''}">
    `;
  } else if(type==='place'){
    body.innerHTML = `
      <label class="label">Yer adı</label>
      <input class="input" id="pName" placeholder="örn. Ev, İş, Kafe" value="${e.name||''}">
      <label class="label">Adres</label>
      <input class="input" id="pAddr" placeholder="Cadde, No, ilçe..." value="${e.address||''}">
      <div class="row" style="gap:10px">
        <div style="flex:1">
          <label class="label">Koordinat</label>
          <input class="input" id="pCoord" placeholder="enlem, boylam" value="${e.coord||''}">
        </div>
        <div><button class="chip" type="button" id="btnUseGeo">Mevcut</button></div>
      </div>
    `;
    $('#btnUseGeo').onclick = async ()=>{
      vibrate(10);
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos=>{
          const {latitude, longitude} = pos.coords;
          $('#pCoord').value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }, ()=>alert('Konum izni verilmedi.'));
      }
    }
  }
  window.selectCallKind = (el)=>{
    $$('#sheet .chipbtn').forEach(b=>b.classList.remove('active'));
    el.classList.add('active');
  };

  $('#sheetOk').onclick = ()=>{
    vibrate(15);
    if(type==='note'){
      e.title = $('#nTitle').value.trim();
      e.note = $('#nText').value.trim();
      e.tags = $('#nTags').value.split(',').map(s=>s.trim()).filter(Boolean);
    }else if(type==='call'){
      e.person = $('#cPerson').value.trim();
      e.kind = ($('#sheet .chipbtn.active')?.dataset.v)||'gelen';
      e.note = $('#cNote').value.trim();
    }else if(type==='place'){
      e.name = $('#pName').value.trim();
      e.address = $('#pAddr').value.trim();
      e.coord = $('#pCoord').value.trim();
    }
    if(isEdit){
      const i = state.entries.findIndex(x=>x.id===id); state.entries[i]=e;
    }else{
      state.entries.push(e);
    }
    save(); closeSheet(); renderTimeline();
  };
}

/* ---------- Detail Sheet ---------- */
function openDetail(id){
  const e = state.entries.find(x=>x.id===id); if(!e) return;
  const s = $('#detailSheet'); s.classList.remove('hidden');
  s.innerHTML = `
  <div class="sheet-header">
    <button class="corner-left" aria-label="Kapat" onclick="closeDetail()">
      <svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
    </button>
    <div class="sheet-title">${ e.type==='note' ? 'Not' : e.type==='call' ? 'Çağrı' : 'Konum' }</div>
    <div class="corner-right row" style="gap:6px; background:transparent; border:none">
      <button class="circle-btn" title="Düzenle" onclick="editEntry('${e.id}')">
        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm3.92 2.33H5v-1.92l8.06-8.06 1.92 1.92L6.92 19.58ZM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82Z"/></svg>
      </button>
      <button class="circle-btn" title="Sil" onclick="deleteEntry('${e.id}')">
        <svg viewBox="0 0 24 24"><path d="M6 7h12v2H6V7Zm2 3h8l-1 10H9L8 10Zm3-6h2l1 2H10l1-2Z"/></svg>
      </button>
    </div>
  </div>
  <div class="sheet-body detail">
    ${ e.type==='note' ? `
      <div><div class="label">Başlık</div><div>${e.title||'-'}</div></div>
      <div><div class="label">Not</div><div>${(e.note||'-').replace(/\n/g,'<br>')}</div></div>
      <div><div class="label">Etiketler</div><div>${(e.tags||[]).join(', ')||'-'}</div></div>
    `: e.type==='call' ? `
      <div class="row"><div class="label">Kişi</div><div>${e.person||'-'}</div></div>
      <div class="row"><div class="label">Tür</div><div>${e.kind||'-'}</div></div>
      <div><div class="label">Not</div><div>${e.note||'-'}</div></div>
    `: `
      <div class="row"><div class="label">Yer adı</div><div>${e.name||'-'}</div></div>
      <div><div class="label">Adres</div><div>${e.address||'-'}</div></div>
      <div class="row"><div class="label">Koordinat</div><div>${e.coord||'-'}</div></div>
    `}
  </div>`;
  $('.sheet-backdrop').classList.add('show'); s.classList.add('show');
}
function closeDetail(){
  $('.sheet-backdrop').classList.remove('show');
  const s = $('#detailSheet'); s.classList.remove('show');
  setTimeout(()=>{ s.classList.add('hidden'); s.innerHTML=''; },200);
}
window.closeDetail = closeDetail;
window.editEntry = (id)=>{
  closeDetail(); const e = state.entries.find(x=>x.id===id); if(!e) return; openSheet(e.type, id);
}
window.deleteEntry = (id)=>{
  if(confirm('Silinsin mi?')){
    const i = state.entries.findIndex(x=>x.id===id); if(i>-1){ state.entries.splice(i,1); save(); renderTimeline(); }
    closeDetail();
  }
};

/* ---------- Search ---------- */
function openSearch(){
  const s = $('#searchSheet'); s.classList.remove('hidden');
  s.innerHTML = `
    <div class="sheet-header">
      <button class="corner-left" onclick="closeSearch()"><svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
      <div class="sheet-title">Arama</div>
      <div class="corner-right"></div>
    </div>
    <div class="sheet-body">
      <input class="input" id="q" placeholder="kelime, kişi..." oninput="doSearch()" autofocus>
      <div class="chips">
        ${[['note','Not'],['call','Çağrı'],['place','Konum']].map(([t,l])=>`<button class="chipbtn active" data-t="${t}" onclick="toggleFilter(this)">${l}</button>`).join('')}
      </div>
      <div id="searchResults" class="list" style="margin-top:10px"></div>
    </div>
  `;
  $('.sheet-backdrop').classList.add('show'); s.classList.add('show');
  doSearch();
}
function closeSearch(){
  $('.sheet-backdrop').classList.remove('show');
  const s = $('#searchSheet'); s.classList.remove('show');
  setTimeout(()=>{ s.classList.add('hidden'); s.innerHTML=''; },200);
}
window.toggleFilter = (btn)=>{
  btn.classList.toggle('active'); doSearch();
}
window.doSearch = ()=>{
  const q = ($('#q')?.value||'').toLowerCase();
  const actives = $$('#searchSheet .chipbtn.active').map(b=>b.dataset.t);
  const box = $('#searchResults'); box.innerHTML='';
  const res = state.entries.filter(e=> actives.includes(e.type) && (
    (e.title||'').toLowerCase().includes(q) || (e.note||'').toLowerCase().includes(q) || (e.person||'').toLowerCase().includes(q) || (e.address||'').toLowerCase().includes(q)
  ));
  for(const e of res){
    const item = document.createElement('button');
    item.className='card-item'; item.innerHTML = `<h4>${e.type==='note'?'Not':e.type==='call'?'Çağrı':'Konum'}</h4><p>${(e.title||e.person||e.name||e.address||'')}</p>`;
    item.onclick = ()=>{ closeSearch(); openDetail(e.id); };
    box.appendChild(item);
  }
};
/* ---------- Settings (minimal) ---------- */
function openSettings(){
  showSheet();
  sheetSkeleton('Ayarlar');
  const body = $('#sheet .sheet-body');
  body.innerHTML = `
    <div class="chips" style="margin-bottom:8px"><div class="label">Veri</div></div>
    <div class="row" style="gap:8px">
      <button class="chip" onclick="exportCSV()">CSV indir</button>
      <label class="chip" style="cursor:pointer">
        İçe aktar <input type="file" accept=".csv" hidden onchange="importCSV(this.files[0])">
      </label>
      <button class="chip" onclick="if(confirm('Tüm kayıtlar silinsin mi?')){ localStorage.removeItem('${storeKey}'); load(); renderTimeline(); }">Tümünü Temizle</button>
    </div>
  `;
  $('#sheetOk').style.visibility='hidden';
  $('#sheetBack').onclick = closeSheet;
}
window.exportCSV = ()=>{
  const rows = [['id','type','title','note','tags','person','kind','name','address','coord','created']];
  state.entries.forEach(e=> rows.push([e.id,e.type,e.title||'',e.note||'',(e.tags||[]).join(';'),e.person||'',e.kind||'',e.name||'',e.address||'',e.coord||'',e.created||'']));
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ajanda.csv'; a.click();
};

window.importCSV = async (file)=>{
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const hdr = lines.shift().split(',').map(s=>s.replace(/^"|"$/g,''));
  const objs = lines.map(line=>{
    const cols = line.match(/("([^"]|"")*"|[^,]+)/g).map(c=>c.replace(/^"|"$/g,'').replace(/""/g,'"'));
    const obj = {}; hdr.forEach((h,i)=> obj[h]=cols[i]||''); return obj;
  });
  // merge by id
  const byId = new Map(state.entries.map(e=>[e.id,e]));
  objs.forEach(o=> byId.set(o.id || uid(), {...byId.get(o.id)||{}, ...o}));
  state.entries = Array.from(byId.values()); save(); renderTimeline(); alert('İçe aktarıldı.');
};

/* ---------- Boot ---------- */
function boot(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  load(); initHeader(); renderTimeline(); initDial();
  $('#btnSearch').onclick = ()=>{ vibrate(10); openSearch(); };
  $('#btnSettings').onclick = ()=>{ vibrate(10); openSettings(); };
  $('#navHome').onclick = ()=>{ window.scrollTo({top:0, behavior:'smooth'}); };
  $('#btnToggleCalendar').onclick = ()=>{ $('#calendar').classList.toggle('hidden'); };
}
document.addEventListener('DOMContentLoaded', boot);
