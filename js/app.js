// Ajanda v10 beta - core
(() => {
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
  const el = {
    fullDate: $("#fullDate"),
    monthLabel: $("#monthLabel"),
    btnCalendar: $("#btnCalendar"),
    calendarSheet: $("#calendarSheet"),
    calGrid: $("#calGrid"),
    calPrev: $("#calPrev"),
    calNext: $("#calNext"),
    calTitle: $("#calMonthTitle"),
    timelineList: $("#timelineList"),
    fabAdd: $("#fabAdd"),
    addMenu: $("#addMenu"),
    addBackdrop: $("#addMenuBackdrop"),
    panelBackdrop: $("#panelBackdrop"),
    searchFab: $("#btnSearch"),
    searchPanel: $("#searchPanel"),
    searchInput: $("#searchInput"),
    searchResults: $("#searchResults"),
    editPanel: $("#editPanel"),
    editForm: $("#editForm"),
    editTitle: $("#editTitle"),
    btnBackEdit: $("#btnBackEdit"),
    btnSaveEdit: $("#btnSaveEdit"),
    detailPanel: $("#detailPanel"),
    detailTitle: $("#detailTitle"),
    detailBody: $("#detailBody"),
    btnEditDetail: $("#btnEditDetail"),
    btnDeleteDetail: $("#btnDeleteDetail"),
    settingsPanel: $("#settingsPanel"),
    btnSettings: $("#btnSettings"),
    chReducedMotion: $("#chReducedMotion"),
    chHaptics: $("#chHaptics"),
    btnExportCSV: $("#btnExportCSV"),
    btnExportJSON: $("#btnExportJSON"),
    fileImport: $("#fileImport"),
    btnClearAll: $("#btnClearAll"),
  };

  const state = {
    selectedDate: new Date(),
    monthCursor: new Date(),
    data: loadData(),
    editingId: null,
    filter: null,
    reducedMotion: localStorage.getItem('aj_reduced') === '1',
    haptics: localStorage.getItem('aj_haptics') !== '0',
  };

  // Apply saved prefs
  if (state.reducedMotion) el.chReducedMotion.checked = true;
  if (state.haptics) el.chHaptics.checked = true;

  // ---------- Utilities ----------
  const tr = {
    months: ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],
    days: ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"],
    longDays: ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"],
  };
  const fmtDateKey = d => d.toISOString().slice(0,10);
  const parseKey = s => new Date(s+"T00:00:00");
  const pad = n => (n<10?"0":"")+n;

  const haptic = (light=true) => {
    try{
      if(!state.haptics) return;
      if (navigator.vibrate) navigator.vibrate(light?[8]:[12,40,12]);
    }catch(e){}
  };

  function loadData(){
    try{
      const j = localStorage.getItem("ajanda-data");
      return j ? JSON.parse(j) : [];
    }catch(e){ return []; }
  }
  function saveData(){ localStorage.setItem("ajanda-data", JSON.stringify(state.data)); }

  // ---------- Header & Date ----------
  function renderHeader(){
    const d = state.selectedDate;
    const label = `${d.getDate()} ${tr.months[d.getMonth()]} ${d.getFullYear()} ${tr.longDays[d.getDay()]}`;
    el.fullDate.textContent = label;
    el.monthLabel.textContent = `${tr.months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ---------- Calendar ----------
  function buildCalendar(){
    const c = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
    el.calTitle.textContent = `${tr.months[c.getMonth()]} ${c.getFullYear()}`;
    el.calGrid.innerHTML = "";
    // DOW row
    tr.days.forEach(d => {
      const s = document.createElement("div");
      s.textContent = d;
      s.className = "dow";
      el.calGrid.appendChild(s);
    });
    const start = new Date(c);
    const offset = (start.getDay()+6)%7 + 1; // start with Monday? adjust; we want Mon..Sun
    const daysInMonth = new Date(c.getFullYear(), c.getMonth()+1, 0).getDate();
    for(let i=1;i<offset;i++){
      const b = document.createElement("div"); el.calGrid.appendChild(b);
    }
    for(let d=1; d<=daysInMonth; d++){
      const btn = document.createElement("button");
      btn.textContent = d;
      const cur = new Date(c.getFullYear(), c.getMonth(), d);
      const today = fmtDateKey(new Date());
      const isToday = fmtDateKey(cur) === today;
      const isSel = fmtDateKey(cur) === fmtDateKey(state.selectedDate);
      if (isToday) btn.classList.add("today");
      if (isSel) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        state.selectedDate = cur;
        renderHeader();
        renderTimeline();
        buildCalendar();
        toggleCalendar(false);
        haptic();
      });
      el.calGrid.appendChild(btn);
    }
  }
  function toggleCalendar(show){
    el.calendarSheet.classList.toggle("hidden", !show);
  }

  // ---------- Timeline ----------
  function renderTimeline(){
    const key = fmtDateKey(state.selectedDate);
    const list = state.data.filter(x => x.date===key).sort((a,b)=> (a.time||"") < (b.time||"") ? -1:1);
    el.timelineList.innerHTML = "";
    if (!list.length){
      el.timelineList.classList.add("empty");
      el.timelineList.innerHTML = `<div class="empty-state">Bu gün için kayıt yok.</div>`;
      return;
    }
    el.timelineList.classList.remove("empty");
    list.forEach(item => {
      const row = document.createElement("div");
      row.className = "item";
      row.dataset.id = item.id;
      row.innerHTML = `
        <div class="icon">${iconFor(item.type, 22)}</div>
        <div style="flex:1">
          <div class="title">${titleFor(item)}</div>
          <div class="meta">${metaFor(item)}</div>
        </div>
      `;
      row.addEventListener("click", ()=> openDetail(item.id));
      el.timelineList.appendChild(row);
    });
  }
  function iconFor(type, size=18){
    if (type==="note") return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M4 3h12l4 4v14H4V3zm12 1.5V7h3.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
    if (type==="call") return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.6 19.6 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.2 1.2.5 2.3.9 3.4a2 2 0 0 1-.5 2L8.7 10a16 16 0 0 0 6 6l.9-1.8a2 2 0 0 1 2-1c1.1.4 2.2.7 3.4.9a2 2 0 0 1 1.8 1.8Z" fill="currentColor"/></svg>`;
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 21s7-5.3 7-11a7 7 0 0 0-14 0c0 5.7 7 11 7 11zM12 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
  }
  function titleFor(item){
    if (item.type==="note") return item.title || "Not";
    if (item.type==="call") return item.person || "Çağrı";
    if (item.type==="place") return item.name || "Konum";
  }
  function metaFor(item){
    const t = item.time ? `${item.time} • ` : "";
    if (item.type==="note") return `${t}${(item.tags||[]).join(", ")}` || t;
    if (item.type==="call") return `${t}${item.kind||"Bilinmeyen"}`;
    if (item.type==="place") return `${t}${item.address||""}`;
  }

  // ---------- Add Menu ----------
  function toggleAddMenu(show){
    el.addBackdrop.classList.toggle("show", show);
    el.addMenu.classList.toggle("show", show);
    el.addBackdrop.classList.toggle("hidden", !show);
    el.addMenu.classList.toggle("hidden", !show);
  }
  el.fabAdd.addEventListener("click", ()=>{ toggleAddMenu(true); haptic(); });
  el.addBackdrop.addEventListener("click", ()=> toggleAddMenu(false));
  $$(".add-item").forEach(b => b.addEventListener("click", ()=>{
    toggleAddMenu(false);
    openEdit(b.dataset.type);
  }));

  // ---------- Panels helpers ----------
  function openPanel(p){
    el.panelBackdrop.classList.add("show"); el.panelBackdrop.classList.remove("hidden");
    p.classList.add("show"); p.classList.remove("hidden");
  }
  function closePanel(p){
    p.classList.remove("show"); setTimeout(()=>p.classList.add("hidden"), 180);
    el.panelBackdrop.classList.remove("show"); setTimeout(()=>el.panelBackdrop.classList.add("hidden"), 180);
  }
  el.panelBackdrop.addEventListener("click", ()=> {
    [el.searchPanel, el.editPanel, el.detailPanel, el.settingsPanel].forEach(p=>{
      if (!p.classList.contains("hidden")) closePanel(p);
    });
  });

  // ---------- Search ----------
  el.searchFab.addEventListener("click", ()=> { openPanel(el.searchPanel); el.searchInput.focus(); });
  $$(".chip", el.searchPanel).forEach(ch => ch.addEventListener("click", ()=>{
    if (state.filter===ch.dataset.filter){ state.filter=null; ch.classList.remove("active");}
    else { state.filter = ch.dataset.filter; $$(".chip", el.searchPanel).forEach(c=>c.classList.remove("active")); ch.classList.add("active"); }
    runSearch();
  }));
  el.searchInput.addEventListener("input", runSearch);
  function runSearch(){
    const q = el.searchInput.value.trim().toLowerCase();
    let list = state.data;
    if (state.filter) list = list.filter(x => x.type===state.filter);
    if (q){
      list = list.filter(x => JSON.stringify(x).toLowerCase().includes(q));
    }
    renderList(list, el.searchResults);
  }
  function renderList(list, container){
    container.innerHTML = "";
    if (!list.length){ container.innerHTML = `<div class="empty-state">Sonuç yok.</div>`; return; }
    list.sort((a,b)=> (a.date+a.time) < (b.date+b.time) ? 1:-1);
    list.forEach(item => {
      const row = document.createElement("div");
      row.className = "item";
      row.dataset.id = item.id;
      row.innerHTML = `
        <div class="icon">${iconFor(item.type, 20)}</div>
        <div style="flex:1">
          <div class="title">${titleFor(item)}</div>
          <div class="meta">${item.date} ${item.time||""}</div>
        </div>
      `;
      row.addEventListener("click", ()=>{ openDetail(item.id); });
      container.appendChild(row);
    });
  }

  // ---------- Edit/Create ----------
  function openEdit(typeOrId){
    el.editPanel.dataset.mode = "create";
    state.editingId = null;
    let type = typeOrId;
    let data = null;
    if (typeof typeOrId === "string" && typeOrId.startsWith("id:")){
      const id = typeOrId.slice(3);
      state.editingId = id;
      data = state.data.find(x=>x.id===id);
      type = data.type;
      el.editPanel.dataset.mode = "edit";
    }
    buildForm(type, data);
    el.editTitle.textContent = (data? "Düzenle — " : "Yeni ") + (type==="note"?"Not": type==="call"?"Çağrı":"Konum");
    openPanel(el.editPanel);
  }
  function buildForm(type, data){
    const d = data || {date: fmtDateKey(state.selectedDate), time: `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`};
    let html = `<div class="form">`;
    html += fieldTimeDate(d);
    if (type==="note"){
      html += field("Başlık (opsiyonel)", `<input class="input" id="fTitle" value="${esc(d.title||"")}">`);
      html += field("Not", `<textarea class="textarea" id="fBody" placeholder="Metni yaz...">${esc(d.body||"")}</textarea>`);
      html += field("Etiketler (virgülle)", `<input class="input" id="fTags" value="${esc((d.tags||[]).join(", "))}" placeholder="iş, spor, aile">`);
    } else if (type==="call"){
      html += field("Kişi adı", `<input class="input" id="fPerson" value="${esc(d.person||"")}" placeholder="örn. Ayşe Yılmaz">`);
      html += field("Tür", `<div class="chip-row">
          ${chipSelect("kind","Gelen", d.kind==="Gelen")}
          ${chipSelect("kind","Giden", d.kind==="Giden")}
          ${chipSelect("kind","Cevapsız", d.kind==="Cevapsız")}
        </div>`);
      html += field("Not (opsiyonel)", `<input class="input" id="fNote" value="${esc(d.note||"")}" placeholder="Kısa not...">`);
    } else {
      html += field("Yer adı", `<input class="input" id="fName" value="${esc(d.name||"")}" placeholder="örn. Ev, İş, Kafe">`);
      html += field("Adres", `<input class="input" id="fAddress" value="${esc(d.address||"")}" placeholder="Cadde, No, ilçe...">`);
      html += field("Koordinat", `<input class="input" id="fCoord" value="${esc(d.coord||"")}" placeholder="enlem, boylam">`);
    }
    html += `</div>`;
    el.editForm.innerHTML = html;
    // chip behavior
    $$(".chip", el.editForm).forEach(ch=>ch.addEventListener("click", ()=>{
      $$(".chip[data-name='"+ch.dataset.name+"']", el.editForm).forEach(c=>c.classList.remove("active"));
      ch.classList.add("active");
    }));
    el.editForm.dataset.type = type;
  }
  function field(label, inner){ return `<div><div class="label">${label}</div>${inner}</div>`; }
  function chipSelect(name, label, active){ return `<button class="chip ${active?"active":""}" data-name="${name}" data-value="${label}">${label}</button>`; }
  function fieldTimeDate(d){
    return `<div class="row" style="gap:10px">
      <div style="flex:1">${field("Tarih", `<input class="input" id="fDate" type="date" value="${d.date||fmtDateKey(new Date())}">`)}</div>
      <div style="width:140px">${field("Saat", `<input class="input" id="fTime" type="time" value="${d.time||""}">`)}</div>
    </div>`;
  }
  function esc(s){ return (s||"").toString().replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  el.btnBackEdit.addEventListener("click", ()=> closePanel(el.editPanel));
  el.btnSaveEdit.addEventListener("click", onSaveEdit);
  function onSaveEdit(){
    const type = el.editForm.dataset.type;
    const val = {
      type,
      date: $("#fDate", el.editForm)?.value || fmtDateKey(new Date()),
      time: $("#fTime", el.editForm)?.value || "",
    };
    if (type==="note"){
      val.title = $("#fTitle", el.editForm).value.trim();
      val.body = $("#fBody", el.editForm).value.trim();
      val.tags = $("#fTags", el.editForm).value.split(",").map(s=>s.trim()).filter(Boolean);
      if (!val.title && !val.body){ alert("En azından başlık veya not girin."); return; }
    } else if (type==="call"){
      val.person = $("#fPerson", el.editForm).value.trim();
      const active = $(".chip.active[data-name='kind']", el.editForm);
      val.kind = active ? active.dataset.value : "Bilinmeyen";
    } else {
      val.name = $("#fName", el.editForm).value.trim();
      val.address = $("#fAddress", el.editForm).value.trim();
      val.coord = $("#fCoord", el.editForm).value.trim();
      if (!val.name && !val.address){ alert("En az isim ya da adres girin."); return; }
    }
    if (state.editingId){
      const idx = state.data.findIndex(x=>x.id===state.editingId);
      state.data[idx] = {...state.data[idx], ...val};
    } else {
      val.id = cryptoRandomId();
      state.data.push(val);
    }
    saveData();
    closePanel(el.editPanel);
    renderTimeline();
    haptic(false);
  }

  function cryptoRandomId(){
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "id-"+Math.random().toString(36).slice(2);
  }

  // ---------- Detail ----------
  function openDetail(id){
    const it = state.data.find(x=>x.id===id);
    if (!it) return;
    el.detailTitle.textContent = titleFor(it);
    const rows = [`<div class="field"><div class="label">Tarih</div>${it.date} ${it.time||""}</div>`];
    if (it.type==="note"){
      if (it.title) rows.push(`<div class="field"><div class="label">Başlık</div>${esc(it.title)}</div>`);
      rows.push(`<div class="field"><div class="label">Not</div>${esc(it.body||"")}</div>`);
      if (it.tags?.length) rows.push(`<div class="field"><div class="label">Etiketler</div>${it.tags.join(", ")}</div>`);
    } else if (it.type==="call"){
      if (it.person) rows.push(`<div class="field"><div class="label">Kişi</div>${esc(it.person)}</div>`);
      if (it.kind) rows.push(`<div class="field"><div class="label">Tür</div>${esc(it.kind)}</div>`);
      if (it.note) rows.push(`<div class="field"><div class="label">Not</div>${esc(it.note)}</div>`);
    } else {
      if (it.name) rows.push(`<div class="field"><div class="label">Yer adı</div>${esc(it.name)}</div>`);
      if (it.address) rows.push(`<div class="field"><div class="label">Adres</div>${esc(it.address)}</div>`);
      if (it.coord) rows.push(`<div class="field"><div class="label">Koordinat</div>${esc(it.coord)}</div>`);
    }
    el.detailBody.innerHTML = rows.join("");
    el.btnEditDetail.onclick = ()=> { closePanel(el.detailPanel); state.editingId = it.id; openEdit("id:"+it.id); };
    el.btnDeleteDetail.onclick = ()=> {
      if (!confirm("Bu kaydı silmek istiyor musun?")) return;
      state.data = state.data.filter(x=>x.id!==it.id);
      saveData(); closePanel(el.detailPanel); renderTimeline();
    };
    openPanel(el.detailPanel);
  }

  // ---------- Settings ----------
  el.btnSettings.addEventListener("click", ()=> openPanel(el.settingsPanel));
  $$(".swatch").forEach(sw=> sw.addEventListener("click", ()=>{
    document.documentElement.style.setProperty("--accent", sw.dataset.accent);
    localStorage.setItem("aj_accent", sw.dataset.accent);
  }));
  const savedAccent = localStorage.getItem("aj_accent");
  if (savedAccent) document.documentElement.style.setProperty("--accent", savedAccent);

  el.chReducedMotion.addEventListener("change", ()=>{
    state.reducedMotion = el.chReducedMotion.checked; localStorage.setItem("aj_reduced", state.reducedMotion?'1':'0');
    document.body.style.setProperty("scroll-behavior", state.reducedMotion? "auto" : "smooth");
  });
  el.chHaptics.addEventListener("change", ()=>{
    state.haptics = el.chHaptics.checked; localStorage.setItem("aj_haptics", state.haptics?'1':'0');
  });

  // Export / Import / Clear
  el.btnExportCSV.addEventListener("click", ()=>{
    const csv = toCSV(state.data);
    downloadFile("ajanda.csv", "text/csv", csv);
  });
  el.btnExportJSON.addEventListener("click", ()=>{
    downloadFile("ajanda.json", "application/json", JSON.stringify(state.data, null, 2));
  });
  el.fileImport.addEventListener("change", async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text();
    try{
      const arr = JSON.parse(text);
      if (Array.isArray(arr)){ state.data = arr; saveData(); renderTimeline(); alert("Veriler içe aktarıldı."); }
      else alert("Geçersiz JSON.");
    }catch(err){ alert("İçe aktarma hatası"); }
    e.target.value = "";
  });
  el.btnClearAll.addEventListener("click", ()=>{
    if (confirm("Tüm veriler silinsin mi?")){ localStorage.removeItem("ajanda-data"); state.data=[]; renderTimeline(); }
  });

  function toCSV(rows){
    const headers = ["id","type","date","time","title","body","tags","person","kind","note","name","address","coord"];
    const esc = v => {
      if (Array.isArray(v)) v = v.join("|");
      v = (v==null?"":String(v)).replace(/"/g,'""');
      return `"${v}"`;
    };
    const all = [headers.join(",")].concat(
      rows.map(r => headers.map(h => esc(r[h])).join(","))
    );
    return all.join("\n");
  }
  function downloadFile(name, mime, content){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], {type:mime}));
    a.download = name; a.click(); setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
  }

  // ---------- Events for calendar toggle ----------
  el.btnCalendar.addEventListener("click", ()=> { const show = el.calendarSheet.classList.contains("hidden"); toggleCalendar(show); if (show) buildCalendar(); haptic(); });
  el.calPrev.addEventListener("click", ()=>{ state.monthCursor.setMonth(state.monthCursor.getMonth()-1); buildCalendar(); });
  el.calNext.addEventListener("click", ()=>{ state.monthCursor.setMonth(state.monthCursor.getMonth()+1); buildCalendar(); });

  // General close buttons
  $$("[data-close]").forEach(b=> b.addEventListener("click", ()=>{
    const p = $(b.dataset.close);
    if (p) closePanel(p);
  }));

  // ---------- Init ----------
  function init(){
    renderHeader();
    renderTimeline();
    // register SW
    if ("serviceWorker" in navigator){
      navigator.serviceWorker.register("sw.js").catch(()=>{});
    }
  }
  init();

})(); 
