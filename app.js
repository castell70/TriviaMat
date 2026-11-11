// Simple, modular trivia app implementing requirements
const CATEGORIES = [
  "Aritmética",
  "Álgebra",
  "Geometría",
  "Cálculo",
  "Probabilidad",
  "Lógica",
  "Teoría de Números",
  "Estadística",
  "Combinatoria",
  "Rompecabezas"
];

importQuestionsDefault();

let state = {
  questionsByCategory: {}, // {category: [q,...]}
  currentCategory: null,
  currentSet: [],
  currentIndex: 0,
  score: 0,
  player: "",
  history: loadHistory(),
  lastCategory: null // track last played category to prevent immediate repeat
};

const els = {
  categories: document.getElementById("categories"),
  tips: document.getElementById("category-tip"),
  startBtn: document.getElementById("start-btn"),
  playerName: document.getElementById("player-name"),
  gameArea: document.getElementById("game-area"),
  currentCat: document.getElementById("current-cat"),
  progress: document.getElementById("progress"),
  questionText: document.getElementById("question-text"),
  answers: document.getElementById("answers"),
  nextBtn: document.getElementById("next-btn"),
  scorebox: document.getElementById("scorebox"),
  // tools/menu elements (dropdown replaces modal)
  btnTools: document.getElementById("btn-tools"),
  toolsDropdown: document.getElementById("tools-dropdown"),
  toolsLoad: document.getElementById("tools-load"),
  toolsDownload: document.getElementById("tools-download"),
  toolsReset: document.getElementById("tools-reset"),
  // file input
  fileLoad: document.getElementById("file-load"),
  // example modal
  btnExample: document.getElementById("btn-example"),
  exampleModal: document.getElementById("example-modal"),
  closeExample: document.getElementById("close-example"),
  exQuestionText: document.getElementById("ex-question-text"),
  exAnswers: document.getElementById("ex-answers"),
  exScorebox: document.getElementById("ex-scorebox"),
  exCurrentCat: document.getElementById("ex-current-cat"),
  exProgress: document.getElementById("ex-progress"),
  // other existing
  btnHistory: document.getElementById("btn-history"),
  historyArea: document.getElementById("history-area"),
  historyTable: document.querySelector("#history-table tbody"),
  closeHistory: document.getElementById("close-history"),
  helpBtn: document.getElementById("help-btn"),
  helpModal: document.getElementById("help-modal"),
  closeHelp: document.getElementById("close-help")
};

// lightweight toast container
let toastTimer = null;
function showMessage(text, ms = 1400){
  // remove existing toast
  const existing = document.getElementById("mt_toast");
  if (existing){ existing.remove(); if (toastTimer) clearTimeout(toastTimer); }
  const t = document.createElement("div");
  t.id = "mt_toast";
  t.textContent = text;
  Object.assign(t.style, {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "84px",
    background: "rgba(15,23,36,0.96)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    zIndex: 60,
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
    maxWidth: "92%",
    textAlign: "center",
    fontWeight: 600,
    fontSize: "14px"
  });
  document.body.appendChild(t);
  toastTimer = setTimeout(()=>{ t.remove(); toastTimer=null; }, ms);
  return new Promise(res=> setTimeout(res, ms));
}

renderCategoryList();
attachListeners();
updateUI();

function importQuestionsDefault(){
  // Load bundled questions (questions.json)
  fetch('questions.json').then(r=>r.json()).then(data=>{
    state.questionsByCategory = data;
    // ensure categories exist
    for (const c of CATEGORIES){
      if(!state.questionsByCategory[c]) state.questionsByCategory[c]=[];
    }
    renderCategoryList();
  }).catch(e=>{
    // create empty categories fallback
    for (const c of CATEGORIES) state.questionsByCategory[c]=[];
  });
}

function renderCategoryList(){
  els.categories.innerHTML = "";
  for (const cat of CATEGORIES){
    const btn = document.createElement("button");
    btn.className = "cat-btn";
    btn.textContent = cat;
    btn.onclick = ()=>selectCategory(cat, btn);
    // visually indicate disabled (if it's the lastCategory) and prevent click via pointer-events when appropriate
    if (state.lastCategory && state.lastCategory === cat){
      btn.style.opacity = "0.6";
      btn.title = "No puedes elegir esta categoría inmediatamente, selecciona otra.";
    } else {
      btn.style.opacity = "";
      btn.title = "";
    }
    els.categories.appendChild(btn);
  }
}

function selectCategory(cat, btnEl){
  // Require a player name before allowing category selection
  if (!state.player){
    showMessage("Ingrese su nombre y presione 'Iniciar juego' antes de seleccionar una categoría.");
    return;
  }
  // Prevent choosing the same category twice in a row
  if (state.lastCategory && state.lastCategory === cat){
    showMessage("Debe elegir otra categoría: no se puede repetir la misma categoría consecutivamente.");
    return;
  }

  document.querySelectorAll(".cat-btn").forEach(b=>b.classList.remove("active"));
  btnEl.classList.add("active");
  state.currentCategory = cat;
  els.tips.textContent = sampleTip(cat);
  updateUI();
}

function sampleTip(cat){
  // short tips per category
  const tips = {
    "Aritmética":"Revisa operaciones básicas y descomposición en factores.",
    "Álgebra":"Busca variables que puedas aislar y simplifica antes de sustituir.",
    "Geometría":"Dibuja figuras y marca ángulos y lados conocidos.",
    "Cálculo":"Identifica si es derivada o integral y reglas aplicables.",
    "Probabilidad":"Cuenta casos favorables y totales; usa combinatoria si aplica.",
    "Lógica":"Establece tablas de verdad o traduce al lenguaje formal.",
    "Teoría de Números":"Piensa en divisibilidad, residuos y propiedades de primos.",
    "Estadística":"Identifica media, mediana y moda; cuidado con sesgos.",
    "Combinatoria":"Determina si el orden importa y si hay repetición.",
    "Rompecabezas":"Busca patrones y prueba con ejemplos pequeños."
  };
  return tips[cat]||"Consejo general: analiza con calma y descarta opciones absurdas.";
}

function attachListeners(){
  els.startBtn.onclick = ()=> {
    const name = els.playerName.value.trim();
    if (!name) return showMessage("Ingrese su nombre para iniciar.");
    state.player = name;
    showMessage(`Bienvenido ${name}. Seleccione una categoría para comenzar.`, 1500);
  };

  els.nextBtn.onclick = ()=>nextQuestion();

  // Tools dropdown toggles
  els.btnTools.onclick = (ev)=> {
    // toggle dropdown; position is fixed to top-right area
    if (els.toolsDropdown.hidden){
      els.toolsDropdown.hidden = false;
      els.toolsDropdown.setAttribute('aria-hidden','false');
    } else {
      els.toolsDropdown.hidden = true;
      els.toolsDropdown.setAttribute('aria-hidden','true');
    }
    // stop propagation so outside click handler won't immediately close it
    ev.stopPropagation();
  };

  // clicking outside should close the dropdown
  document.addEventListener('click', (ev)=>{
    if (!els.toolsDropdown) return;
    if (!els.toolsDropdown.hidden){
      // if click is outside the dropdown and not on the tools button, close
      const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
      if (!path.includes(els.toolsDropdown) && ev.target !== els.btnTools){
        els.toolsDropdown.hidden = true;
        els.toolsDropdown.setAttribute('aria-hidden','true');
      }
    }
  });

  // Use tools dropdown buttons to trigger file load / download / reset
  els.toolsLoad.onclick = ()=> { els.fileLoad.click(); els.toolsDropdown.hidden = true; };
  els.fileLoad.onchange = handleFileLoad;
  els.toolsDownload.onclick = ()=> { downloadQuestions(); els.toolsDropdown.hidden = true; };
  els.toolsReset.onclick = ()=> {
    // use in-app confirmation dialog instead of native confirm
    confirmDialog("¿Quieres reiniciar el historial? Esta acción borrará todos los datos guardados.").then(ok=>{
      if (!ok) {
        els.toolsDropdown.hidden = true;
        return;
      }
      localStorage.removeItem("mt_history");
      state.history = [];
      populateHistoryTable();
      showMessage("Historial reiniciado.", 1200);
      els.toolsDropdown.hidden = true;
    });
  };

  // Example modal
  els.btnExample.onclick = ()=> showExample();
  els.closeExample.onclick = ()=> els.exampleModal.hidden = true;

  els.btnHistory.onclick = showHistory;
  els.closeHistory.onclick = ()=>els.historyArea.hidden=true;
  els.helpBtn.onclick = ()=>els.helpModal.hidden=false;
  els.closeHelp.onclick = ()=>els.helpModal.hidden=true;
}

function prepareSetForCategory(cat){
  const pool = (state.questionsByCategory[cat]||[]).slice();
  // choose 10 random (or fewer if not enough)
  shuffle(pool);
  state.currentSet = pool.slice(0,10);
  // store original options and correct index but DO NOT fix a single shuffled order here;
  // rendering will shuffle each time to ensure randomness on every attempt
  state.currentSet = state.currentSet.map(q=>{
    return {
      text: q.question,
      optsOriginal: q.options.slice(),   // keep original order
      answerOriginal: q.answer,          // original correct index
      tip: q.tip||""
    };
  });
  state.currentIndex = 0;
  state.score = 0;
}

function updateUI(){
  els.currentCat.textContent = `Categoría: ${state.currentCategory||"-"}`;
  els.progress.textContent = `Pregunta ${Math.min(state.currentIndex+1,10)} / 10`;
  els.scorebox.textContent = `Puntaje: ${state.score}`;
  if (!state.currentCategory){
    els.questionText.textContent = "Presiona 'Iniciar juego' y selecciona una categoría para empezar.";
    els.answers.innerHTML = "";
    els.nextBtn.disabled = true;
    return;
  }
  // if set not prepared, prepare
  if (!state.currentSet.length || state.currentSet.length===0) prepareSetForCategory(state.currentCategory);
  renderQuestion();
}

function renderQuestion(){
  const q = state.currentSet[state.currentIndex];
  if (!q){
    els.questionText.textContent = "No hay preguntas en esta categoría.";
    els.answers.innerHTML = "";
    els.nextBtn.disabled = true;
    return;
  }
  els.questionText.textContent = q.text;
  els.answers.innerHTML = "";

  // Shuffle options on each render so the order is different each attempt
  const opts = q.optsOriginal.map((o,i)=>({o,i}));
  shuffle(opts);
  // determine which shuffled index corresponds to the original correct option
  const correctIndex = opts.findIndex(x=>x.i===q.answerOriginal);

  for (let i=0;i<opts.length;i++){
    const a = document.createElement("button");
    a.className = "answer";
    a.textContent = opts[i].o;
    a.onclick = ()=>selectAnswer(i, a, correctIndex); // pass correctIndex for comparison
    els.answers.appendChild(a);
  }
  els.nextBtn.disabled = true;
  els.progress.textContent = `Pregunta ${state.currentIndex+1} / ${state.currentSet.length}`;
}

function selectAnswer(i, el, correctIndex){
  const q = state.currentSet[state.currentIndex];
  disableAnswers();
  if (i===correctIndex){
    el.classList.add("correct");
    state.score += 1;
    els.scorebox.textContent = `Puntaje: ${state.score}`;
    // show in-app message then auto-advance
    showMessage("Respuesta correcta ✔", 1000).then(()=> {
      // after message, proceed to next question
      // if we're at last question, finishRound will handle resetting
      if (state.currentIndex + 1 >= state.currentSet.length){
        finishRound();
      } else {
        state.currentIndex += 1;
        renderQuestion();
      }
    });
  } else {
    el.classList.add("wrong");
    // NOTE: do NOT reveal the correct answer when incorrect (per requirement)
    els.scorebox.textContent = `Puntaje: ${state.score}`;
    // show tip or incorrect message then auto-advance
    const msg = q.tip ? `Incorrecto ✖ — Consejo: ${q.tip}` : "Incorrecto ✖";
    showMessage(msg, 1600).then(()=>{
      if (state.currentIndex + 1 >= state.currentSet.length){
        finishRound();
      } else {
        state.currentIndex += 1;
        renderQuestion();
      }
    });
  }
  // ensure nextBtn state remains consistent (we auto-advance so keep disabled)
  els.nextBtn.disabled = true;
}

function disableAnswers(){
  Array.from(document.querySelectorAll(".answer")).forEach(b=>b.onclick=null);
}

function nextQuestion(){
  state.currentIndex += 1;
  if (state.currentIndex >= state.currentSet.length){
    finishRound();
  } else renderQuestion();
}

function finishRound(){
  showMessage(`Ronda finalizada. Puntaje: ${state.score} / ${state.currentSet.length}`, 1800).then(()=>{
    saveHistoryEntry();
    // remember last category and clear current so player must pick another
    state.lastCategory = state.currentCategory;
    state.currentSet = [];
    state.currentIndex = 0;
    state.score = 0;
    state.currentCategory = null; // force user to choose a new category
    renderCategoryList();
    updateUI();
  });
}

function handleFileLoad(e){
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    try {
      const json = JSON.parse(ev.target.result);
      // Expect object with category keys and array of questions
      for (const cat of Object.keys(json)){
        if (!state.questionsByCategory[cat]) state.questionsByCategory[cat]=[];
        // append validated questions
        for (const q of json[cat]){
          if (q.question && Array.isArray(q.options) && typeof q.answer !== "undefined"){
            state.questionsByCategory[cat].push(q);
          }
        }
      }
      showMessage("Preguntas cargadas correctamente.", 1400);
      renderCategoryList();
    } catch(err){
      showMessage("JSON inválido.", 1400);
    }
  };
  reader.readAsText(f);
  e.target.value = "";
}

function downloadQuestions(){
  const data = JSON.stringify(state.questionsByCategory, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "questions_export.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showMessage("Exportando preguntas...", 1000);
}

/**
 * confirmDialog(message) -> Promise<boolean>
 * Creates an in-app modal confirmation box (text box) and returns a promise that resolves true/false.
 * This avoids native confirm() and keeps all decisions in styled UI elements.
 */
function confirmDialog(message){
  return new Promise(res=>{
    // build modal elements
    const overlay = document.createElement("div");
    overlay.className = "modal";
    overlay.style.zIndex = 200;
    const card = document.createElement("div");
    card.className = "modal-card";
    card.style.maxWidth = "420px";
    const top = document.createElement("div");
    top.className = "modal-top";
    top.style.marginBottom = "8px";
    const h = document.createElement("div");
    h.style.fontWeight = 700;
    h.textContent = "Confirmación";
    const p = document.createElement("p");
    p.style.margin = "8px 0 16px";
    p.textContent = message;
    const row = document.createElement("div");
    row.className = "confirm-row";
    // create buttons with consistent sizing and distinct colors
    const no = document.createElement("button");
    no.className = "btn confirm-btn cancel-btn";
    no.textContent = "Cancelar";
    const yes = document.createElement("button");
    yes.className = "primary confirm-btn accept-btn";
    yes.textContent = "Aceptar";
    // append in order (cancel left, accept right)
    row.appendChild(no);
    row.appendChild(yes);
    card.appendChild(top);
    top.appendChild(h);
    card.appendChild(p);
    card.appendChild(row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function cleanup(val){
      overlay.remove();
      res(val);
    }
    no.onclick = ()=> cleanup(false);
    yes.onclick = ()=> cleanup(true);
    // close on outside click -> treat as cancel
    overlay.onclick = (ev)=> { if (ev.target === overlay) cleanup(false); };
  });
}

function showExample(){
  // build an example question and render it into the example modal using same styles/interaction
  const ex = {
    question:"¿Cuánto es 2 + 2?",
    options:["3","4","5","6"],
    answer:1,
    tip:"Suma básica."
  };
  // populate UI
  els.exQuestionText.textContent = ex.question;
  els.exCurrentCat.textContent = "Ejemplo";
  els.exProgress.textContent = "Pregunta 1 / 1";
  els.exScorebox.textContent = "Puntaje: 0";
  els.exAnswers.innerHTML = "";
  // shuffle options for realism
  const opts = ex.options.map((o,i)=>({o,i}));
  shuffle(opts);
  const correctIndex = opts.findIndex(x=>x.i===ex.answer);
  // create buttons with same classes
  for (let i=0;i<opts.length;i++){
    const a = document.createElement("button");
    a.className = "answer";
    a.textContent = opts[i].o;
    a.onclick = ()=> {
      // disable further clicks
      Array.from(els.exAnswers.querySelectorAll(".answer")).forEach(b=>b.onclick=null);
      if (i===correctIndex){
        a.classList.add("correct");
        els.exScorebox.textContent = "Puntaje: 1";
      } else {
        a.classList.add("wrong");
        // do not reveal the correct answer in the example either
      }
    };
    els.exAnswers.appendChild(a);
  }
  els.exampleModal.hidden = false;
}

function showHistory(){
  populateHistoryTable();
  els.historyArea.hidden = false;
}

function loadHistory(){
  try{
    return JSON.parse(localStorage.getItem("mt_history"))||[];
  }catch{
    return [];
  }
}

function saveHistory(){
  localStorage.setItem("mt_history", JSON.stringify(state.history));
}

function saveHistoryEntry(){
  const entry = {
    player: state.player || "Anónimo",
    category: state.currentCategory || "N/A",
    score: `${state.score} / ${state.currentSet.length || 10}`,
    attempts: 1,
    date: new Date().toISOString()
  };
  // aggregate attempts per player-category
  const found = state.history.find(h=>h.player===entry.player && h.category===entry.category);
  if (found){
    found.results = found.results || [];
    found.results.push({score:entry.score, date: entry.date});
    found.attempts = (found.attempts||0)+1;
  } else {
    state.history.push({
      player: entry.player,
      category: entry.category,
      results: [{score:entry.score,date:entry.date}],
      attempts: 1
    });
  }
  saveHistory();
}

function populateHistoryTable(){
  els.historyTable.innerHTML = "";
  for (const h of state.history){
    const tr = document.createElement("tr");
    const td1 = document.createElement("td"); td1.textContent=h.player;
    const td2 = document.createElement("td"); td2.textContent=h.category;
    const td3 = document.createElement("td"); td3.textContent = (h.results||[]).map(r=>`${r.score}`).join(" | ");
    const td4 = document.createElement("td"); td4.textContent = h.attempts;
    tr.appendChild(td1);tr.appendChild(td2);tr.appendChild(td3);tr.appendChild(td4);
    els.historyTable.appendChild(tr);
  }
}

function recordAttemptInstant(q, correct){
  // store per-question attempt into session-level temp structure if desired (kept simple)
}

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } }