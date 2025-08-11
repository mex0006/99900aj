
// AJANDA v10.2 – TR calendar, safe FAB, liquid glass, 60fps animations

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const state = {
  selected: todayLocal(),
  monthCursor: curMonthStart(todayLocal()),
  items: loadItems()
};

// ---- Utils (timezone-safe, Monday-first calendar) ----
function todayLocal(){
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function curMonthStart(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function dowMon0(d){
  // JS getDay: 0=Sun..6=Sat ; convert to Monday=0..Sunday=6
  const g = d.getDay(); return (g+6)%7;
}
const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

// ---- Storage ----
function loadItems(){
  try{ return JSON.parse(localStorage.getItem("ajanda_items")||"[]"); }catch(e){ return []; }
}
function saveItems(){ localStorage.setItem("ajanda_items", JSON.stringify(state.items)); }

// ---- Rendering ----
function fmtDateLabel(d){
  const day = d.getDate();
  const month = TR_MONTHS[d.getMonth()];
  const weekdayFull = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"][ (d.getDay()+6)%7 ];
  return `${day} ${month} ${d.getFullYear()} ${weekdayFull}`;
}

function refreshHeader(){
  $("#dateLabel").textContent = fmtDateLabel(state.selected);
  $("#monthLabel").textContent = TR_MONTHS[state.selected.getMonth()] + " " + state.selected.getFullYear();
}

function renderCalendar(){
  const wrap = $("#calendarWrap");
  const grid = $("#calGrid");
  const y = state.monthCursor.getFullYear();
  const m = state.monthCursor.getMonth();
  $("#calMonthTitle").textContent = `${TR_MONTHS[m]} ${y}`;

  grid.innerHTML = "";
  // headers Mon..Sun
  TR_DAYS.forEach(txt=>{
    const el = document.createElement("div");
    el.className = "dow";
    el.textContent = txt;
    grid.appendChild(el);
  });

  const dim = daysInMonth(y, m);
  const first = new Date(y,m,1);
  const pad = dowMon0(first); // blanks before 1st so that Monday is column 1

  for(let i=0;i<pad;i++){
    const b = document.createElement("div");
    b.className="day blank";
    grid.appendChild(b);
  }
  for(let d=1; d<=dim; d++){
    const el = document.createElement("div");
    el.className = "day";
    el.textContent = d;
    const cur = new Date(y,m,d);
    if(sameDate(cur, todayLocal())) el.classList.add("today");
    if(sameDate(cur, state.selected)) el.classList.add("selected");
    el.addEventListener("click", ()=>{
      state.selected = cur;
      refreshHeader();
      renderCalendar();
      renderList();
      vibrate(10);
    });
    grid.appendChild(el);
  }
}

function sameDate(a,b){ return a.getFullYear()==b.getFullYear() && a.getMonth()==b.getMonth() && a.getDate()==b.getDate(); }

function renderList(){
  const list = $("#entries");
  list.innerHTML = "";
  const dayItems = state.items.filter(x=> sameDate(new Date(x.when), state.selected))
                              .sort((a,b)=> new Date(a.when)-new Date(b.when));
  $("#noEntries").style.display = dayItems.length? "none":"block";
  dayItems.forEach(item=>{
    const row = document.createElement("div");
    row.className = "entry";
    const dot = document.createElement("div");
    dot.className = "dot " + item.type;
    const text = document.createElement("div");
    text.innerHTML = `<div><strong>${item.type==='note'?'Not':(item.type==='call'?'Çağrı':'Konum')}</strong></div>
                      <div class="meta">${timeOf(new Date(item.when))}${item.type==='call'&&item.person? ' · '+item.person:''}${item.type==='place'&&item.address? ' · '+item.address:''}</div>`;
    row.appendChild(dot); row.appendChild(text);
    row.addEventListener("click", ()=> openDetail(item.id));
    list.appendChild(row);
  });
}

function timeOf(d){
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ---- Overlay / FAB ----
const overlay = $("#overlay");
$("#fab").addEventListener("click", ()=>{
  overlay.classList.toggle("show");
  overlay.classList.toggle("hidden");
  vibrate(8);
});
overlay.addEventListener("click", (e)=>{
  if(e.target === overlay) closeOverlay();
});
function closeOverlay(){ overlay.classList.remove("show"); setTimeout(()=>overlay.classList.add("hidden"), 180); }

$$(".opt").forEach(btn=> btn.addEventListener("click", ()=>{
  const type = btn.dataset.type;
  closeOverlay();
  openSheet(type);
}));

// ---- Sheets (forms) ----
const sheet = $("#sheet");
const sheetBody = $("#sheetBody");
let editId = null;
function openSheet(type, existing=null){
  editId = existing? existing.id : null;
  $("#sheetTitle").textContent = (existing? "Düzenle: " : "Yeni ") + (type==='note'?'Not': type==='call'?'Çağrı':'Konum');
  sheetBody.innerHTML = buildForm(type, existing);
  sheet.classList.remove("hidden");
  requestAnimationFrame(()=>sheet.classList.add("show"));
  sheet.dataset.type = type;
}
function closeSheet(){
  sheet.classList.remove("show");
  setTimeout(()=>sheet.classList.add("hidden"), 180);
}
$("#sheetBack").addEventListener("click", closeSheet);
$("#sheetSave").addEventListener("click", ()=>{
  const type = sheet.dataset.type;
  const payload = readForm(type);
  if(!payload) return;
  if(editId){
    const idx = state.items.findIndex(x=>x.id===editId);
    state.items[idx] = {...state.items[idx], ...payload};
  }else{
    state.items.push({id:crypto.randomUUID(), type, when: new Date().toISOString(), ...payload});
  }
  saveItems(); renderList(); closeSheet(); vibrate(15);
});

function buildForm(type, existing){
  const v = existing||{};
  if(type==='note'){
    return `
      <div class="field"><label>Başlık</label><input class="input" id="fTitle" placeholder="opsiyonel" value="${v.title||''}"></div>
      <div class="field"><label>Not</label><textarea class="input" id="fText" rows="6" placeholder="Metni yaz...">${v.text||''}</textarea></div>
      <div class="field"><label>Etiketler (virgülle)</label><input class="input" id="fTags" placeholder="iş, kişisel" value="${(v.tags||[]).join(', ')}"></div>`;
  }
  if(type==='call'){
    return `
      <div class="field"><label>Kişi</label><input class="input" id="fPerson" placeholder="örn. Ayşe" value="${v.person||''}"></div>
      <div class="field"><label>Tür</label>
        <div class="row">
          ${["Gelen","Giden","Cevapsız"].map(kind=>{
            const k = {Gelen:"in",Giden:"out",Cevapsız:"miss"}[kind];
            const checked = (v.kind||"in")===(k) ? 'checked':'';
            return `<label class="chip"><input type="radio" name="kind" value="${k}" ${checked}> ${kind}</label>`;
          }).join("")}
        </div>
      </div>
      <div class="field"><label>Kısa not</label><input class="input" id="fNote" placeholder="opsiyonel" value="${v.note||''}"></div>`;
  }
  // place
  return `
    <div class="field"><label>Yer adı</label><input class="input" id="fPlaceName" placeholder="örn. Ev, Ofis" value="${v.placeName||''}"></div>
    <div class="field"><label>Adres</label><input class="input" id="fAddress" placeholder="Cadde, No, İlçe..." value="${v.address||''}"></div>
    <div class="row">
      <div class="field" style="flex:1"><label>Enlem</label><input class="input" id="fLat" placeholder="39.9" value="${v.lat||''}"></div>
      <div class="field" style="flex:1"><label>Boylam</label><input class="input" id="fLng" placeholder="32.8" value="${v.lng||''}"></div>
    </div>`;
}
function readForm(type){
  if(type==='note'){
    const title = $("#fTitle").value.trim();
    const text = $("#fText").value.trim();
    if(!title && !text){ alert("En azından bir başlık ya da not gir."); return null; }
    const tags = $("#fTags").value.split(",").map(s=>s.trim()).filter(Boolean);
    return {title, text, tags};
  }
  if(type==='call'){
    const person = $("#fPerson").value.trim();
    const kind = (document.querySelector('input[name="kind"]:checked')||{value:"in"}).value;
    const note = $("#fNote").value.trim();
    return {person, kind, note};
  }
  const placeName = $("#fPlaceName").value.trim();
  const address = $("#fAddress").value.trim();
  const lat = $("#fLat").value.trim();
  const lng = $("#fLng").value.trim();
  if(!placeName && !address){ alert("En azından isim ya da adres gir."); return null; }
  return {placeName, address, lat, lng};
}

// ---- Details ----
const ds = {
  show:false, id:null
};
function openDetail(id){
  ds.id = id;
  const item = state.items.find(x=>x.id===id);
  $("#detailTitle").textContent = item.type==='note'?'Not':item.type==='call'?'Çağrı':'Konum';
  $("#detailBody").innerHTML = detailHtml(item);
  $("#detail").classList.remove("hidden");
  requestAnimationFrame(()=>$("#detail").classList.add("show"));
}
function closeDetail(){
  $("#detail").classList.remove("show");
  setTimeout(()=>$("#detail").classList.add("hidden"), 180);
}
$("#detailBack").addEventListener("click", closeDetail);
$("#detailEdit").addEventListener("click", ()=>{
  const it = state.items.find(x=>x.id===ds.id);
  closeDetail();
  openSheet(it.type, it);
});
$("#detailDelete").addEventListener("click", ()=>{
  if(confirm("Silinsin mi?")){
    state.items = state.items.filter(x=>x.id!==ds.id);
    saveItems(); renderList(); closeDetail();
  }
});
function detailHtml(it){
  const when = new Date(it.when);
  if(it.type==='note'){
    return `<div class="field"><label>Başlık</label><div>${it.title||'—'}</div></div>
            <div class="field"><label>Not</label><div>${(it.text||'—').replace(/\n/g,'<br>')}</div></div>
            <div class="field"><label>Etiketler</label><div>${(it.tags||[]).join(', ')||'—'}</div></div>
            <div class="field"><label>Saat</label><div>${timeOf(when)}</div></div>`;
  }
  if(it.type==='call'){
    return `<div class="field"><label>Kişi</label><div>${it.person||'Bilinmiyor'}</div></div>
            <div class="field"><label>Tür</label><div>${{in:'Gelen',out:'Giden',miss:'Cevapsız'}[it.kind||'in']}</div></div>
            <div class="field"><label>Not</label><div>${it.note||'—'}</div></div>
            <div class="field"><label>Saat</label><div>${timeOf(when)}</div></div>`;
  }
  return `<div class="field"><label>Yer</label><div>${it.placeName||'—'}</div></div>
          <div class="field"><label>Adres</label><div>${it.address||'—'}</div></div>
          <div class="field"><label>Koordinat</label><div>${(it.lat&&it.lng)? it.lat+', '+it.lng : '—'}</div></div>
          <div class="field"><label>Saat</label><div>${timeOf(when)}</div></div>`;
}

// ---- Calendar controls ----
$("#btnCalendar").addEventListener("click", ()=>{
  $("#calendarWrap").classList.toggle("hidden");
});
$("#calPrev").addEventListener("click", ()=>{
  const c = state.monthCursor; state.monthCursor = new Date(c.getFullYear(), c.getMonth()-1, 1);
  renderCalendar();
});
$("#calNext").addEventListener("click", ()=>{
  const c = state.monthCursor; state.monthCursor = new Date(c.getFullYear(), c.getMonth()+1, 1);
  renderCalendar();
});

// ---- Search (placeholder) ----
$("#btnSearch").addEventListener("click", ()=>{
  alert("Arama: kelime ve tür filtreleri (Not/Çağrı/Konum). v10.3'te tam ekran cam panel gelecektir.");
});

// ---- Haptics ----
function vibrate(ms){ if(navigator.vibrate) navigator.vibrate(ms); }

// ---- Init ----
function init(){
  refreshHeader();
  renderCalendar();
  renderList();
}
init();
