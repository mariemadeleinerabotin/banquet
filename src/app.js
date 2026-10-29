/* ===== Le Banquet : cœur commun au site et à l'artefact. L'adaptateur (fin de fichier) fournit PLATFORM. ===== */
const S = {cartes:[], semaines:[], fiches:[], plan:null, reponses:{}, stats:{}, etat:{}, full:{}, sel:null, view:"jour", idx:"notions", filt:"Tout", q:"", game:null, ready:false};
const $ = s => document.querySelector(s);
const NNBSP = " ";
const typo = s => s.replace(/ ([?!;:»])/g, NNBSP+"$1").replace(/« /g, "«"+NNBSP);
const esc = s => typo(String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])));
const ETAPES = ["La question","La thèse","La contre-thèse","La littérature","Aujourd'hui","À toi","La synthèse"];
const INTERVALLES = [2,7,21,60,150,365];
const VIEWS = ["jour","reviser","penseurs","index"];
const JOURS_C = ["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const SMOOTH = () => reduceMotion() ? "auto" : "smooth";
const plur = (n,s,p) => `${n} ${n>1?(p||s+"s"):s}`;
const dropDot = s => String(s||"").trim().replace(/[.\s]+$/,"");
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function lsGet(k){ try{ return localStorage.getItem(k) }catch(e){ return null } }
function lsSet(k,v){ try{ localStorage.setItem(k,v) }catch(e){} }

function today(){
  const p = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const g = t => p.find(x=>x.type===t).value; return `${g("year")}-${g("month")}-${g("day")}`;
}
function addDays(d,n){const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
function daysBetween(a,b){return Math.round((new Date(b+"T12:00:00Z")-new Date(a+"T12:00:00Z"))/864e5)}
function frDate(d){return new Date(d+"T12:00:00Z").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"})}
function frJour(d){ const n=daysBetween(today(),d); if(n===0) return "aujourd'hui"; if(n===1) return "demain"; if(n>1&&n<7) return new Date(d+"T12:00:00Z").toLocaleDateString("fr-FR",{weekday:"long",timeZone:"UTC"}); return frDate(d) }
const paras = a => (Array.isArray(a)?a:String(a||"").split("\n")).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join("");
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a };
function splitName(t){ const parts=String(t).trim().split(/\s+/); if(parts.length<2) return ["",t]; const p2=[...parts]; let ln=p2.pop(); while(p2.length && /^(de|d'|von|van|la|le|du|des)$/i.test(p2[p2.length-1])) ln=p2.pop()+" "+ln; return [p2.join(" "), ln] }
function hk(t){ let h=0; for(const c of String(t)) h=(h*31+c.charCodeAt(0))|0; return (h>>>0).toString(36) }

/* ---------- données dérivées ---------- */
const fiche = id => S.fiches.find(f=>f.id===id);
const penseurs = () => S.fiches.filter(f=>f.type==="Penseur");
function currentCard(){ const t=today(); return S.cartes.filter(c=>c.date<=t).sort((a,b)=>b.date.localeCompare(a.date))[0] || null }
function semaineCourante(){ const c=S.cartes.find(c=>c.date===S.sel); return c?S.semaines.find(s=>s.id===c.semaine):maNotion() }
/* parcours personnel : chacun suit une notion à son rythme, du jour 1 au jour 7 */
const publiees = id => S.cartes.filter(c=>c.semaine===id && c.date<=today()).sort((a,b)=>a.rang-b.rang);
const luesDe = id => publiees(id).filter(c=>isRead(c));
const semsAsc = () => [...S.semaines].sort((a,b)=>a.numero-b.numero);
function maNotion(){
  const id=S.stats.notion; const choisie=id&&S.semaines.find(s=>s.id===id); if(choisie) return choisie;
  const ss=semsAsc(); return ss.find(s=>publiees(s.id).some(c=>!isRead(c))) || ss[ss.length-1] || null;
}
function prochaineCarte(sem){ return sem ? (publiees(sem.id).find(c=>!isRead(c))||null) : null }
function choisirNotion(id){ saveStat({notion:id}); S.sel=null; $("#cardHost").dataset.d=""; show("jour") }
const nextOf = (e,t) => e.prochaine || addDays(e.vu||t,2);
function dueFiches(){ const t=today(); return S.fiches.filter(f=>{const e=S.etat[f.id]; return e && nextOf(e,t)<=t}).sort((a,b)=>nextOf(S.etat[a.id],t).localeCompare(nextOf(S.etat[b.id],t))) }
function nextDueDate(){ const t=today(); const ds=S.fiches.map(f=>S.etat[f.id]).filter(Boolean).map(e=>nextOf(e,t)).filter(d=>d>t).sort(); return ds[0]||null }
function anciennes(){ const t=today(); return S.fiches.filter(f=>{const e=S.etat[f.id]; return e && e.vu && daysBetween(e.vu,t)>=7}) }
function grandeDue(){ const last=S.stats.derniereGrande; return anciennes().length>=3 && (!last || daysBetween(last,today())>=7) }
function grandeDate(){ const vus=S.fiches.map(f=>S.etat[f.id]).filter(e=>e&&e.vu).map(e=>e.vu).sort(); return vus.length>=3 ? addDays(vus[2],7) : null }
function sujetDu(sem, rang){ const p=(sem&&sem.programme||[]).find(x=>x.rang===rang); return p ? dropDot(String(p.sujet).split(/ ?[:(]/)[0]) : "" }
const writeProg = o => PLATFORM.writeProg(o);
function markSeen(card){
  const t=today(), add={};
  (card.fiches||[]).concat(card.penseurs||[]).forEach(id=>{ if(fiche(id) && !S.etat[id]) add[id]={vu:t} });
  if(!Object.keys(add).length) return;
  Object.assign(S.etat,add); writeProg({etat:add});
}

/* ---------- navigation ---------- */
function show(v){
  S.view=v; if(isSheetOpen()) closeSheet(true);
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===v?"page":"false"));
  VIEWS.forEach(k=>$("#v-"+k).hidden=k!==v);
  try{ if(location.hash.slice(1)!==v) history.replaceState(history.state,"","#"+v) }catch(e){}
  window.scrollTo(0,0); render();
}
document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>show(b.dataset.v));
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1); if(VIEWS.includes(h)&&h!==S.view) show(h)});
window.addEventListener("popstate",()=>{
  if(isSheetOpen()){ closeSheet(true); return }
  if(S.game){ S.game=null; renderReviser() }
});
function pushLayer(kind){ if(PLATFORM.useHistory){ try{ history.pushState({layer:kind},"",location.href) }catch(e){} } }
function popLayer(fallback){ if(PLATFORM.useHistory && history.state && history.state.layer){ history.back() } else fallback() }

function render(){
  const sem=semaineCourante();
  const nl=sem?luesDe(sem.id).length:0;
  $("#sem").innerHTML = sem ? `${esc(sem.domaine||"Notion")}<br><b>${esc(sem.notion)}</b> · ${nl}/7` : "Une notion par semaine";
  const n=dueFiches().length + (grandeDue()?1:0); $("#due").hidden=!n; $("#due").textContent=n;
  if(S.view==="jour") renderJour();
  if(S.view==="reviser" && !S.game) renderReviser();
  if(S.view==="penseurs") renderPenseurs();
  if(S.view==="index") renderIndex();
}

/* ---------- accueil d'un nouveau visiteur ---------- */
const INTRO_KEY="banquet.intro.v1";
function howHTML(court){
  return `<p>Une notion de philosophie ou de littérature, racontée en 7 cartes courtes. Tu commences au jour 1 et tu avances à ton rythme. Une nouvelle notion s'ajoute chaque semaine.</p>
    <p>${esc(PLATFORM.txtProg)}</p>
    ${court?"":`<p>Les 7 cartes : une question, une thèse, une contre-thèse, un roman, aujourd'hui, à toi, la synthèse. Tu choisis tes notions dans Parcours.</p><p>Réviser te propose de petits jeux. Ce que tu rates revient le lendemain ; ce que tu sais revient de plus en plus tard.</p>`}
    ${PLATFORM.install?`<details class="howto"><summary>Ajouter Le Banquet à l'écran d'accueil</summary><p>C'est aussi ce qui protège ta progression : sur iPhone, Safari efface les données d'un site qu'on n'a pas ouvert depuis 7 jours, sauf s'il est sur l'écran d'accueil.</p><p><b>iPhone</b> : dans Safari, touche Partager, puis « Sur l'écran d'accueil ».</p><p><b>Android</b> : dans Chrome, touche ⋮, puis « Ajouter à l'écran d'accueil ».</p></details>`:""}`;
}
function introHTML(sem){
  if(lsGet(INTRO_KEY)) return "";
  const debut = sem && !luesDe(sem.id).length;
  return `<div class="note intro" id="intro"><p class="label" style="color:var(--accent)">Bienvenue au Banquet</p>${howHTML(true)}
    ${debut?`<p><b>Tu commences par « ${esc(sem.notion)} », au jour 1.</b></p>`:""}
    <div class="row"><button class="btn" id="introOk">${debut?"C'est parti":"C'est noté"}</button>${S.semaines.length>1?`<button class="btn ghost" id="introPick">Choisir une autre notion</button>`:""}</div></div>`;
}

/* ---------- Aujourd'hui ---------- */
function slidesFor(card){
  const out=[];
  out.push(`<div class="slide"><p class="eyebrow">Jour ${card.rang} · ${esc(card.etape||ETAPES[card.rang-1])}</p><h2>${esc(card.titre)}</h2>${card.accroche?`<p class="accroche">${esc(card.accroche)}</p>`:""}<p class="hint" style="margin-top:22px">Fais glisser →</p></div>`);
  (card.essentiel||[]).forEach((p,i)=>out.push(`<div class="slide"><div class="num" aria-hidden="true">${i+1}</div><p class="txt">${esc(p)}</p></div>`));
  if(card.extrait&&card.extrait.texte) out.push(`<div class="slide quote"><blockquote>« ${esc(card.extrait.texte)} »</blockquote><cite>${esc(card.extrait.auteur)}, <i>${esc(card.extrait.oeuvre)}</i>${card.extrait.date?" ("+esc(card.extrait.date)+")":""}${card.extrait.traduction?" · trad. "+esc(card.extrait.traduction):""}</cite></div>`);
  (card.exemples||[]).forEach(e=>out.push(`<div class="slide ex"><span class="kind">${esc(e.type||"Exemple")}</span><h3>${esc(e.titre)}</h3><p class="by">${esc(e.auteur||"")}</p><p class="txt">${esc(e.texte)}</p></div>`));
  if(card.idee) out.push(`<div class="slide idee"><p class="eyebrow">L'idée à retenir</p><p>${esc(card.idee)}</p></div>`);
  return out.map((h,i,a)=>h.replace('<div class="slide','<div role="group" aria-roledescription="diapositive" aria-label="'+(i+1)+' sur '+a.length+'" class="slide'));
}
function quizHTML(list, key){
  return `<div class="qblock">${list.map((q,i)=>`<div data-k="${key}" data-q="${i}"><p class="qq">${esc(q.question)}</p><div class="opts">${q.options.map((o,j)=>`<button data-j="${j}">${esc(o)}</button>`).join("")}</div><p class="ex" hidden aria-live="polite"></p></div>`).join("")}</div>`;
}
function verdict(good, bonne, expl){
  return good ? `<span class="verdict good">Bien vu.</span> ${esc(expl||"")}`
              : `<span class="verdict bad">Raté.</span> C'était <b>${esc(bonne)}</b>. ${esc(expl||"")}`;
}
function wireQuiz(host, lists){
  host.querySelectorAll("[data-k][data-q]").forEach(div=>{
    const q=lists[div.dataset.k][+div.dataset.q];
    div.querySelectorAll("button").forEach(b=>b.onclick=()=>{
      const good=+b.dataset.j===q.answer;
      div.querySelectorAll("button").forEach(x=>{x.disabled=true; if(+x.dataset.j===q.answer) x.classList.add("ok")});
      if(!good) b.classList.add("ko");
      const ex=div.querySelector(".ex"); ex.hidden=false; ex.innerHTML=verdict(good,q.options[q.answer],q.explication);
    });
  });
}
function weekHTML(sem){
  const t=today();
  return ETAPES.map((e,i)=>{
    const c=S.cartes.find(x=>x.semaine===sem.id&&x.rang===i+1), ok=c&&c.date<=t, lu=ok&&isRead(c);
    const lab=lu?"lue":ok?"à lire":"bientôt";
    return `<button class="${ok?"has":"future"} ${lu?"done":""} ${c&&c.date===S.sel?"on":""}" data-d="${ok?c.date:""}" data-r="${i+1}" data-day="${addDays(sem.debut,i)}" aria-label="Jour ${i+1}, ${esc(e)}, ${lab}"><span class="dot">${lu?"✓":i+1}</span><span class="lab">${lab}</span></button>`}).join("");
}
function renderJour(){
  const t=today(); let sem=semaineCourante();
  if(!S.sel || !S.cartes.find(c=>c.date===S.sel)){
    const mine=maNotion(), nx=prochaineCarte(mine), lus=mine?luesDe(mine.id):[];
    S.sel = nx ? nx.date : (lus.length ? lus[lus.length-1].date : (currentCard()||{}).date || null);
    sem=semaineCourante();
  }
  const wk=$("#week");
  if(sem){
    wk.innerHTML=weekHTML(sem);
    wk.querySelectorAll("button").forEach(b=>b.onclick=()=>{
      if(b.dataset.d){ $("#weekHint").textContent=""; S.sel=b.dataset.d; render(); return }
      const r=+b.dataset.r, sujet=sujetDu(sem,r);
      $("#weekHint").textContent=`Jour ${r} · ${ETAPES[r-1]} : cette carte sera publiée ${frJour(b.dataset.day)} vers 7h${sujet?". Au programme : "+sujet+".":"."}`.replace(/ ([?!;:])/g,NNBSP+"$1");
    });
  } else wk.innerHTML="";
  let top=introHTML(sem);
  if(sem && S.stats.notion!==sem.id && S.semaines.length>1 && lsGet(INTRO_KEY) && sem.id!==(maNotion()||{}).id) top+=`<div class="note banner"><p>Tu relis « ${esc(sem.notion)} ».</p><button class="btn ghost" id="suivre">En faire ma notion</button></div>`;
  if(grandeDue()) top+=`<div class="note banner"><p><b>Grande révision de la semaine.</b> Dix questions sur ce que tu as vu il y a plus d'une semaine.</p><button class="btn" id="goGrande">Jouer</button></div>`;
  $("#bannerHost").innerHTML=top;
  if($("#goGrande")) $("#goGrande").onclick=()=>{show("reviser");startGame("grande")};
  if($("#introOk")) $("#introOk").onclick=()=>{ lsSet(INTRO_KEY,"1"); if(sem&&!S.stats.notion) saveStat({notion:sem.id}); $("#intro").remove() };
  if($("#introPick")) $("#introPick").onclick=()=>{ lsSet(INTRO_KEY,"1"); S.idx="notions"; show("index"); setTimeout(()=>{const n=$("#notions"); if(n) n.scrollIntoView({block:"start"})},50) };
  if($("#suivre")) $("#suivre").onclick=()=>choisirNotion(sem.id);
  if(!S.cartes.find(c=>c.date===S.sel)) return;
  const host=$("#cardHost");
  const card=PLATFORM.fullCard(S.sel); if(!card) return;
  if(card.date<=t) markSeen(card);
  if(host.dataset.d===card.date && host.dataset.m===String(card.maj||"")+S.fiches.length){ PLATFORM.refreshToi&&PLATFORM.refreshToi(card); return }
  host.dataset.d=card.date; host.dataset.m=String(card.maj||"")+S.fiches.length;
  const sl=slidesFor(card);
  const ppl=(card.penseurs||[]).map(fiche).filter(Boolean);
  const others=(card.fiches||[]).filter(id=>!(card.penseurs||[]).includes(id)).map(fiche).filter(Boolean);
  let extra="";
  if(card.synthese) extra+=`<div class="block"><p class="label">Qui pense quoi</p><div class="duel">${(card.synthese.positions||[]).map(p=>`<div class="pos"><b>${esc(p.qui)}</b>${esc(p.these)}</div>`).join("")}</div>${card.synthese.fil?`<p style="margin-top:12px">${esc(card.synthese.fil)}</p>`:""}</div>`;
  if(card.quiz&&card.quiz.length) extra+=`<div class="block"><p class="label">Le quiz de la semaine</p>${quizHTML(card.quiz,"quiz")}</div>`;
  if(card.flashback&&card.flashback.length) extra+=`<div class="block"><p class="label">Retour en arrière</p><p class="hint" style="margin:-4px 0 12px">Des questions sur les semaines passées.</p>${quizHTML(card.flashback,"flashback")}</div>`;
  host.innerHTML=`<div class="deck"><div class="bars" aria-hidden="true">${sl.map((_,i)=>`<i class="${i===0?"on":""}"></i>`).join("")}</div><div class="slides" id="slides" role="region" aria-roledescription="carrousel" aria-label="La carte">${sl.join("")}</div>
     <div class="navbtns"><button id="prev" disabled>← Précédent</button><span class="hint" id="pos" aria-live="polite">1 / ${sl.length}</span><button id="next">Suivant →</button></div></div>
   ${ppl.length?`<div class="block"><p class="label">Les penseurs du jour</p><div class="people">${ppl.map(pcard).join("")}</div></div>`:""}
   ${extra}
   ${avantToi(card)}
   ${card.rang===6?PLATFORM.toiHTML(card):""}
   ${card.plusLoin?`<div class="block"><details class="loin"><summary>Pour aller plus loin${card.plusLoin.duree?" · "+esc(card.plusLoin.duree):""}</summary><div class="inner">${card.plusLoin.titre?`<p><b>${esc(card.plusLoin.titre)}</b></p>`:""}${paras(card.plusLoin.paragraphes)}${(card.plusLoin.lectures||[]).length?`<p class="label" style="margin-top:14px">À lire</p><ul class="lectures">${card.plusLoin.lectures.map(l=>`<li><b style="font-weight:500">${esc(l.auteur)}</b>, <i>${esc(l.titre)}</i>${l.note?" · "+esc(l.note):""}</li>`).join("")}</ul>`:""}</div></details></div>`:""}
   ${others.length?`<div class="block"><p class="label">Les fiches du jour</p><div class="row" style="margin-top:0">${others.map(f=>`<button class="chip" data-f="${esc(f.id)}">${esc(f.terme)}</button>`).join("")}</div></div>`:""}
   <div id="closingHost">${closingHTML(card,sl.length)}</div>`;
  const sc=$("#slides"), bars=[...host.querySelectorAll(".bars i")];
  const upd=()=>{const i=Math.round(sc.scrollLeft/sc.clientWidth); bars.forEach((b,k)=>b.classList.toggle("on",k<=i)); $("#pos").textContent=`${i+1} / ${sl.length}`; $("#prev").disabled=i===0; $("#next").disabled=i===sl.length-1; if(i===sl.length-1) finishReading(card,sl.length)};
  sc.addEventListener("scroll",()=>requestAnimationFrame(upd),{passive:true});
  $("#prev").onclick=()=>sc.scrollBy({left:-sc.clientWidth,behavior:SMOOTH()});
  $("#next").onclick=()=>sc.scrollBy({left:sc.clientWidth,behavior:SMOOTH()});
  wireQuiz(host,{quiz:card.quiz||[],flashback:card.flashback||[]});
  host.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>openFiche(b.dataset.f));
  wireDefi(host,card,sl.length);
  wireClosing(card);
  if(card.rang===6) PLATFORM.wireToi(card);
}

/* lecture : comptée quand on arrive à la dernière diapositive ou qu'on finit le défi */
function isRead(card){ return (S.stats.lues||[]).includes(card.date) }
function finishReading(card,nSlides){
  if(!S.ready || !card || card.date>today() || isRead(card)) return;
  const t=today(), o={lues:[...(S.stats.lues||[]),card.date].slice(-1000)};
  if(!(S.stats.jours||[]).includes(t)) o.jours=[...(S.stats.jours||[]),t].slice(-400);
  if(!S.stats.notion) o.notion=card.semaine;
  saveStat(o); checkBadges();
  const h=$("#closingHost"); if(h){ h.innerHTML=closingHTML(card,nSlides); wireClosing(card) }
  const wk=$("#week"), sem=S.semaines.find(x=>x.id===card.semaine); if(wk&&sem){ wk.innerHTML=weekHTML(sem); }
  
}
function wireClosing(card){
  const nx=$("#goNext"); if(nx) nx.onclick=()=>{ S.sel=nx.dataset.d; window.scrollTo({top:0,behavior:SMOOTH()}); render() };
  const pk=$("#goPick"); if(pk) pk.onclick=()=>{ S.idx="notions"; show("index"); setTimeout(()=>{const n=$("#notions"); if(n) n.scrollIntoView({block:"start"})},50) };
  const pr=$("#goParcours"); if(pr) pr.onclick=()=>{ S.idx="notions"; show("index") };
}
function closingHTML(card,nSlides){
  if(!card) return "";
  const set=new Set(S.stats.jours||[]), t=today(), days=[...Array(7)].map((_,i)=>addDays(t,i-6)), st=streak();
  const dots=`<span class="dots7" aria-hidden="true">${days.map(d=>`<i class="${set.has(d)?"on":""}"></i>`).join("")}</span>`;
  if(!isRead(card)){
    const nd=defiList(card).length;
    return `<div class="closing"><span class="pl-row"><span class="pl-txt">${plur(nSlides,"diapositive")}${nd?" · "+plur(nd,"question"):""} · la carte compte quand tu arrives au bout</span>${dots}</span></div>`;
  }
  const got=S.stats.badges||{}, neuf=BADGES.filter(b=>got[b.id]===t);
  const sem=S.semaines.find(s=>s.id===card.semaine);
  const suiv=S.cartes.find(c=>c.semaine===card.semaine&&c.rang===card.rang+1);
  let next="";
  if(suiv && suiv.date<=t && !isRead(suiv)) next=`<button class="btn ghost" id="goNext" data-d="${suiv.date}">Carte suivante : jour ${suiv.rang}</button>`;
  else if(suiv && suiv.date>t) next=`<p class="pl-txt" style="margin:0">La suite, jour ${suiv.rang}${sujetDu(sem,suiv.rang)?" ("+esc(sujetDu(sem,suiv.rang))+")":""}, arrive ${esc(frJour(suiv.date))} vers 7h.</p>`;
  else if(!suiv && card.rang<7){ const d=addDays(sem.debut,card.rang); next=`<p class="pl-txt" style="margin:0">La suite arrive ${esc(frJour(d))} vers 7h.</p>` }
  else if(sem && luesDe(sem.id).length>=7) next=`<p class="pl-txt" style="margin:0 0 8px">Tu as bouclé « ${esc(sem.notion)} ».</p><button class="btn ghost" id="goPick">Choisir ma prochaine notion</button>`;
  return `<div class="closing"><span class="pl-row"><span class="pl-txt">Carte lue${st>1?` · ${st} jours d'affilée`:""}</span>${dots}</span>${neuf.length?`<p class="pl-txt" style="margin:6px 0 0">Nouvelle médaille : ${neuf.map(b=>esc(b.n)).join(", ")}</p>`:""}<div style="margin-top:12px">${next}</div></div>`;
}

function defiList(card){
  if(card.defi&&card.defi.length) return card.defi;
  const out=[]; (card.fiches||[]).forEach(id=>{const f=fiche(id); if(f&&f.qcm&&f.qcm[0]&&out.length<2) out.push(f.qcm[0])}); return out;
}
function avantToi(card){
  if(card.rang===6) return "";
  const d=defiList(card), a=card.aRetenir;
  let h="";
  if(a&&(a.titre||a.texte)) h+=`<div class="block fait"><p class="label">Did you know?</p>${a.titre?`<p class="ft">${esc(a.titre)}</p>`:""}${a.texte?`<p class="tx">${esc(a.texte)}</p>`:""}${a.source?`<p class="src">${esc(a.source)}</p>`:""}</div>`;
  if(d.length) h+=`<div class="block"><div class="defi-head"><p class="label">Le défi du jour</p><span class="hint" id="dpos">1 / ${d.length}</span></div><div class="ddeck" id="ddeck">${d.map((q,i)=>`<div class="dcard${d.length===1?" solo":""}" data-i="${i}" ${i>0?"hidden":""}><span class="n">Question ${i+1} sur ${d.length}</span><p class="q">${esc(q.question)}</p><div class="opts">${q.options.map((o,j)=>`<button data-j="${j}">${esc(o)}</button>`).join("")}</div><div class="res" hidden aria-live="polite"></div><button class="btn ghost go" hidden>${i<d.length-1?"Question suivante":"Voir mon score"}</button></div>`).join("")}<div class="dcard fin" hidden><span class="n">Ton score</span><div class="sc" id="dsc"></div><p id="dmsg"></p></div></div></div>`;
  return h;
}
function wireDefi(host,card,nSlides){
  const d=defiList(card), deck=host.querySelector("#ddeck"); if(!d.length||!deck) return;
  let ok=0; const answered=new Set();
  const cards=[...deck.querySelectorAll(".dcard")];
  const go=i=>{ const c=cards[i]; if(!c) return; c.hidden=false; c.classList.add("solo"); cards.forEach((x,k)=>{ if(k!==i) x.hidden=true }); deck.scrollTo({left:0,behavior:"auto"}); const p=$("#dpos"); if(p) p.textContent=i<d.length?`${i+1} / ${d.length}`:"Terminé" };
  cards.forEach(c=>c.classList.add("solo"));
  cards.slice(0,d.length).forEach((c,i)=>{
    const q=d[i];
    c.querySelectorAll(".opts button").forEach(b=>b.onclick=()=>{
      if(answered.has(i)) return; answered.add(i);
      const good=+b.dataset.j===q.answer; if(good) ok++;
      c.querySelectorAll(".opts button").forEach(x=>{x.disabled=true; if(+x.dataset.j===q.answer) x.classList.add("ok")});
      if(!good) b.classList.add("ko");
      const r=c.querySelector(".res"); r.hidden=false; r.innerHTML=verdict(good,q.options[q.answer],q.explication);
      c.querySelector(".go").hidden=false;
      if(answered.size===d.length){
        const o={defis:stat("defis")+1}; if(ok===d.length) o.sansFaute=stat("sansFaute")+1; saveStat(o);
        $("#dsc").innerHTML=`${ok}<small> / ${d.length}</small>`;
        $("#dmsg").textContent= ok===d.length?"Sans faute. Tu peux briller ce soir.":"Les questions ratées reviendront dans tes révisions.";
        finishReading(card,nSlides); checkBadges();
      }
    });
    c.querySelector(".go").onclick=()=>go(i+1);
  });
}
function pcard(f){ const [fn,ln]=splitName(f.terme); return `<button class="pcard" data-f="${esc(f.id)}"><span class="fn">${esc(fn)}</span><span class="ln">${esc(ln)}</span><span class="d">${esc(f.dates||"")}</span>${f.enUnMot?`<span class="mot">${esc(f.enUnMot)}</span>`:""}</button>` }

/* ---------- progression et médailles ---------- */
const RANGS=[[0,"Convive"],[15,"Disciple"],[45,"Exégète"],[100,"Philosophe"],[200,"Sage"],[400,"Hôte du Banquet"]];
function stat(k){ return S.stats[k]||0 }
function streak(){ const set=new Set(S.stats.jours||[]); let d=today(); if(!set.has(d)) d=addDays(d,-1); let n=0; while(set.has(d)){ n++; d=addDays(d,-1) } return n }
function bestStreak(){ const js=[...(S.stats.jours||[])].sort(); let best=0,cur=0,prev=null; js.forEach(d=>{ cur = prev && addDays(prev,1)===d ? cur+1 : 1; best=Math.max(best,cur); prev=d }); return best }
function progress(){
  const vus=Object.keys(S.etat).filter(id=>fiche(id));
  const niv=vus.reduce((a,id)=>a+(S.etat[id].niveau||0),0);
  const ancres=vus.filter(id=>(S.etat[id].niveau||0)>=3).length;
  const penseursVus=vus.filter(id=>(fiche(id)||{}).type==="Penseur").length;
  const xp=vus.length+niv*2+stat("parties")*2+stat("defis")+stat("grandes")*5;
  let r=0; RANGS.forEach((x,i)=>{ if(xp>=x[0]) r=i });
  return {vus:vus.length,niv,ancres,penseursVus,xp,r};
}
function notionsBouclees(){ const lues=new Set(S.stats.lues||[]); return S.semaines.filter(s=>{ const cs=S.cartes.filter(c=>c.semaine===s.id); return cs.length>=7 && cs.every(c=>lues.has(c.date)) }).length }
const BADGES=[
  {id:"premier",m:"I",n:"Premier couvert",d:"Lire ta première carte en entier",ok:p=>(S.stats.lues||[]).length>=1},
  {id:"serie3",m:"3",n:"Pilier de table",d:"3 jours d'affilée",ok:p=>bestStreak()>=3},
  {id:"serie7",m:"7",n:"Une semaine à table",d:"7 jours d'affilée",ok:p=>bestStreak()>=7},
  {id:"sansfaute",m:"✓",n:"Sans faute",d:"Un défi ou un jeu parfait",ok:p=>stat("sansFaute")>=1},
  {id:"gourmande",m:"V",n:"Bon appétit",d:"5 parties de révision",ok:p=>stat("parties")>=5},
  {id:"dix",m:"X",n:"Dix convives",d:"10 penseurs rencontrés",ok:p=>p.penseursVus>=10},
  {id:"grande",m:"G",n:"Grande révision",d:"Ta première grande révision",ok:p=>stat("grandes")>=1},
  {id:"notion",m:"N",n:"Notion bouclée",d:"Les 7 cartes d'une semaine",ok:p=>notionsBouclees()>=1},
  {id:"marbre",m:"M",n:"Gravé dans le marbre",d:"Une fiche retenue 3 fois de suite",ok:p=>p.ancres>=1},
  {id:"mois",m:"30",n:"Un mois de banquet",d:"30 jours de lecture",ok:p=>(S.stats.jours||[]).length>=30},
  {id:"biblio",m:"L",n:"Bibliothèque",d:"50 fiches dans ta mémoire",ok:p=>p.vus>=50},
  {id:"quatre",m:"IV",n:"Quatre notions",d:"4 notions bouclées",ok:p=>notionsBouclees()>=4}
];
function checkBadges(){
  if(!S.ready) return;
  const p=progress(), got=Object.assign({},S.stats.badges||{}), nouveaux=[];
  BADGES.forEach(b=>{ if(!got[b.id] && b.ok(p)){ got[b.id]=today(); nouveaux.push(b) } });
  if(nouveaux.length){ saveStat({badges:got}); nouveaux.forEach((b,i)=>setTimeout(()=>toast(b),600+i*3800)) }
}
function toast(b){
  const t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status");
  t.innerHTML=`<span class="medal" aria-hidden="true">${esc(b.m)}</span><span>Médaille : ${esc(b.n)}</span>`;
  document.body.appendChild(t); setTimeout(()=>t.remove(),3500);
}
function progressHTML(){
  const p=progress(), cur=RANGS[p.r], next=RANGS[p.r+1];
  const pct=next?Math.round((p.xp-cur[0])/(next[0]-cur[0])*100):100;
  const set=new Set(S.stats.jours||[]), t=today(), days=[...Array(7)].map((_,i)=>addDays(t,i-6)), st=streak();
  return `<div class="plite">
    <p class="label">Ton parcours</p>
    <div class="pl-row"><span class="pl-txt"><span class="pl-rang">${esc(cur[1])}</span>${next?` · ${plur(next[0]-p.xp,"point")} avant ${esc(next[1])}`:""}</span><span class="dots7" title="Tes 7 derniers jours" aria-label="Carte lue ${set.size?[...days].filter(d=>set.has(d)).length:0} jours sur les 7 derniers">${days.map(d=>`<i class="${set.has(d)?"on":""}"></i>`).join("")}</span></div>
    <div class="bar hair"><i style="width:${Math.max(2,pct)}%"></i></div>
    ${st>1?`<p class="hint" style="margin:0">${st} jours d'affilée.</p>`:""}
  </div>`;
}
function badgesHTML(){
  const got=S.stats.badges||{}, won=BADGES.filter(b=>got[b.id]), rest=BADGES.filter(b=>!got[b.id]);
  const chip=(b,ok)=>`<span class="bchip ${ok?"":"locked"}" title="${esc(b.d)}"><span class="medal" aria-hidden="true">${esc(b.m)}</span><span>${esc(b.n)}${ok?"":` · <span style="opacity:.85">${esc(b.d)}</span>`}</span></span>`;
  return `<div class="block" style="margin-top:24px"><div class="defi-head"><p class="label">Médailles</p><span class="hint">${won.length} / ${BADGES.length}</span></div>
    ${won.length?`<div class="badges">${won.map(b=>chip(b,true)).join("")}</div>`:`<p class="hint" style="margin:0">Lis ta première carte jusqu'au bout pour gagner ta première médaille.</p>`}
    ${rest.length?`<details class="more"><summary><span class="s-closed">Voir les ${rest.length} médailles à gagner</span><span class="s-open">Masquer les médailles à gagner</span></summary><div class="badges">${rest.map(b=>chip(b,false)).join("")}</div></details>`:""}</div>`;
}

/* ---------- Réviser ---------- */
const DISTRACTEURS=["Platon","Aristote","Épicure","Sénèque","Montaigne","Descartes","Pascal","Spinoza","Rousseau","Kant","Hegel","Schopenhauer","Nietzsche","Bergson","Simone de Beauvoir","Sartre","Camus","Hannah Arendt","Simone Weil","Freud"];
function pools(){
  const P=penseurs();
  const quotes=[]; P.forEach(p=>{(p.citations||[]).forEach(c=>quotes.push({p,texte:c.texte,source:c.source,cit:true,key:"q:"+p.id+":"+hk(c.texte)})); (p.theses||[]).forEach(t=>quotes.push({p,texte:t,cit:false,key:"q:"+p.id+":"+hk(t)}))});
  const qcm=[]; S.fiches.forEach(f=>(f.qcm||[]).forEach((q,i)=>qcm.push({f,q,key:"c:"+f.id+":"+i})));
  return {P,quotes,qcm};
}
function mastery(){
  const {P,quotes,qcm}=pools(), m=S.stats.maitrise||{}, ok=k=>(m[k]||0)>=2, enc=k=>(m[k]||0)===1;
  const vus=Object.keys(S.etat).filter(id=>fiche(id));
  return {
    cartes:{n:vus.filter(id=>(S.etat[id].niveau||0)>=2).length,e:vus.filter(id=>(S.etat[id].niveau||0)===1).length,t:vus.length,u:"ancrées"},
    quiadit:{n:quotes.filter(q=>ok(q.key)).length,e:quotes.filter(q=>enc(q.key)).length,t:quotes.length,u:"reconnues"},
    nom:{n:P.filter(p=>ok("n:"+p.id)).length,e:P.filter(p=>enc("n:"+p.id)).length,t:P.length,u:"reconnus"},
    qcm:{n:qcm.filter(q=>ok(q.key)).length,e:qcm.filter(q=>enc(q.key)).length,t:qcm.length,u:"maîtrisées"}
  };
}
function tile(g,titre,desc,mm,extra,disabled){
  const pn=mm.t?mm.n/mm.t*100:0, pe=mm.t?mm.e/mm.t*100:0, reste=mm.t-mm.n-mm.e;
  const etat = !mm.t ? "" : `<b>${mm.n}/${mm.t}</b> ${mm.u}${mm.e?` · ${mm.e} en cours`:""}${reste>0&&!mm.e&&!mm.n?` · ${reste} à découvrir`:""}${mm.n===mm.t?" · tout est là":""}`;
  return `<button class="game" data-g="${g}" ${disabled?"disabled":""}><span class="gt">${titre}</span><span class="gd">${desc}</span>
    <span class="mbar" aria-hidden="true"><i style="width:${pn}%"></i><i class="half" style="width:${pe}%"></i></span><span class="mtx">${extra?esc(extra):etat}</span></button>`;
}
function renderReviser(){
  const host=$("#v-reviser"), due=dueFiches(), {P,quotes,qcm}=pools(), old=anciennes();
  const gd=grandeDue(), M=mastery(), nd=nextDueDate(), gdate=grandeDate();
  const tiles=[
    {play:!!due.length, h:tile("cartes","Les cartes","Retourne la carte, dis si tu savais.",M.cartes, due.length?plur(due.length,"fiche")+" à revoir aujourd'hui":(nd?"Tes fiches reviennent "+frJour(nd):"Après ta première carte"), !due.length)},
    {play:quotes.length>0, h:tile("quiadit","Qui a dit ça ?","Une phrase, une idée : retrouve son auteur.",M.quiadit,"",!quotes.length)},
    {play:P.length>0, h:tile("nom","Le bon nom","Un portrait : mets un nom dessus.",M.nom,"",!P.length)},
    {play:qcm.length>0, h:tile("qcm","QCM","Concepts, œuvres, distinctions.",M.qcm,"",!qcm.length)}
  ].sort((a,b)=>(b.play?1:0)-(a.play?1:0));
  const grande = old.length>=3
    ? `<button class="game wide" data-g="grande"><span class="gt">La grande révision</span><span class="gd">Dix questions mêlées sur tout ce que tu as vu il y a plus d'une semaine.</span><span class="gc">${gd?"À faire cette semaine":"Faite le "+esc(frDate(S.stats.derniereGrande))+" · rejouer"}${S.stats.grandeScore!=null?" · dernier score "+S.stats.grandeScore+"/10":""}</span></button>`
    : "";
  host.innerHTML=`<h2 class="page">Réviser</h2><p class="hint page-intro">Quelques minutes par jour. Ce que tu rates revient le lendemain ; ce que tu sais revient de plus en plus tard. ${esc(PLATFORM.txtProgShort)}</p>
   ${PLATFORM.reviserNotice()}
   <div class="games">${grande}${tiles.map(x=>x.h).join("")}</div>
   ${old.length<3?`<p class="hint lock">La grande révision : dix questions sur ce que tu as vu il y a plus d'une semaine. ${gdate?"Ta première : "+esc(frDate(gdate))+".":"Elle s'ouvre après une semaine de lecture."}</p>`:""}`;
  host.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>startGame(b.dataset.g));
}
const court = p => /^(Simone|Hannah)$/.test(splitName(p.terme)[0]) ? p.terme : splitName(p.terme)[1];
function nameOptions(correctName, others, n){
  const pool=[...new Set([...shuffle(others), ...shuffle(DISTRACTEURS)])].filter(x=>norm(x)!==norm(correctName) && !norm(correctName).includes(norm(x)) && !norm(x).includes(norm(correctName)));
  const o=shuffle([correctName, ...pool.slice(0,n-1)]);
  return {options:o, answer:o.indexOf(correctName)};
}
function makeQ(kind, src){
  const {P}=pools(), n=P.length>=4?4:3;
  if(kind==="quiadit"){ const q=src, others=P.filter(p=>p.id!==q.p.id).map(court); const {options,answer}=nameOptions(court(q.p),others,n);
    return {kind:"Qui a dit ça ?",prompt:q.texte,quote:q.cit,src:q.cit&&q.source?q.source:"",options,answer,fiche:q.p.id,key:q.key,explication:dropDot(q.p.enUnMot||q.p.resume)+"."} }
  if(kind==="nom"){ const p=src, others=P.filter(x=>x.id!==p.id).map(court); const {options,answer}=nameOptions(court(p),others,n); const th=(p.theses||[])[0]||p.resume;
    return {kind:"Le bon nom",prompt:th,src:[p.dates,p.pays].filter(Boolean).join(", "),options,answer,fiche:p.id,key:"n:"+p.id,explication:p.memo||p.resume} }
  if(kind==="qcm"){ return {kind:"QCM · "+src.f.terme,prompt:src.q.question,options:src.q.options,answer:src.q.answer,fiche:src.f.id,key:src.key,explication:src.q.explication||""} }
}
function startGame(g){
  const {P,quotes,qcm}=pools(); let qs=[];
  if(g==="cartes"){ const c=dueFiches(); if(!c.length) return; S.game={g,cards:c,i:0,shown:false,score:0}; pushLayer("game"); return renderGame() }
  if(g==="quiadit") qs=shuffle(quotes).slice(0,Math.min(8,quotes.length)).map(q=>makeQ("quiadit",q));
  if(g==="nom") qs=shuffle(P).slice(0,Math.min(8,P.length)).map(p=>makeQ("nom",p));
  if(g==="qcm") qs=shuffle(qcm).slice(0,Math.min(8,qcm.length)).map(q=>makeQ("qcm",q));
  if(g==="grande"){
    const oldIds=new Set(anciennes().map(f=>f.id));
    const w=x=>1/(((S.etat[x.fiche]||{}).niveau||0)+1);
    const pool=[...quotes.filter(q=>oldIds.has(q.p.id)).map(q=>makeQ("quiadit",q)),
                ...P.filter(p=>oldIds.has(p.id)).map(p=>makeQ("nom",p)),
                ...qcm.filter(q=>oldIds.has(q.f.id)).map(q=>makeQ("qcm",q))];
    qs=shuffle(pool).sort((a,b)=>w(b)-w(a)+(Math.random()-.5)).slice(0,10);
  }
  if(!qs.length) return;
  S.game={g,qs,i:0,score:0,picked:null,enRoute:new Set()}; pushLayer("game"); renderGame();
}
function quitGame(){ popLayer(()=>{ S.game=null; renderReviser() }) }
function renderGame(){
  const host=$("#v-reviser"), G=S.game;
  const total=G.g==="cartes"?G.cards.length:G.qs.length;
  if(G.i>=total){
    const enRoute=G.enRoute?[...G.enRoute].filter(k=>((S.stats.maitrise||{})[k]||0)===1).length:0;
    host.innerHTML=`<div class="play"><div class="score"><p class="label">Terminé</p><div class="big">${G.score}<small> / ${total}</small></div>
      <p>${G.score===total?"Sans faute.":G.score>=total*0.7?"Solide. Les ratées reviendront demain.":"Les ratées reviendront demain : c'est comme ça que ça rentre."}</p>
      ${enRoute?`<p class="hint">${plur(enRoute,"réponse")} en route : réussis-${enRoute>1?"les":"la"} encore une fois pour ${enRoute>1?"les":"l'"}ancrer.</p>`:""}
      <div class="row" style="margin-top:16px"><button class="btn" id="again">Rejouer</button><button class="btn ghost" id="back">Retour</button></div></div></div>`;
    if(!G.done){ G.done=true; const o={parties:stat("parties")+1}; if(G.score===total) o.sansFaute=stat("sansFaute")+1; if(G.g==="grande"){ o.derniereGrande=today(); o.grandes=stat("grandes")+1; o.grandeScore=G.score } saveStat(o); checkBadges() }
    $("#again").onclick=()=>{ const g=G.g; S.game=null; if(PLATFORM.useHistory&&history.state&&history.state.layer){ history.replaceState(null,"",location.href) } startGame(g) };
    $("#back").onclick=quitGame; return;
  }
  let body="";
  if(G.g==="cartes"){
    const f=G.cards[G.i];
    body=`<div class="qcard"><span class="kind">${esc(f.type)}${f.dates?" · "+esc(f.dates):""}</span><div class="terme">${esc(f.terme)}</div><p class="ask">${esc(f.question||"Que sais-tu de cette fiche ?")}</p>
      ${G.shown?`<div class="back">${f.formule?`<p class="formule">${esc(f.formule)}</p>`:""}<p>${esc(f.resume)}</p>${f.memo?`<p class="hint">Pour retenir : ${esc(f.memo)}</p>`:""}</div>`:""}
      <div class="acts row">${G.shown?`<button class="btn" id="ok">Je savais</button><button class="btn ghost" id="ko">À revoir</button>`:`<button class="btn" id="flip">Retourner la carte</button>`}</div></div>`;
  } else {
    const q=G.qs[G.i], done=G.picked!==null, good=done&&G.picked===q.answer;
    body=`<div class="qcard"><span class="kind">${esc(q.kind)}</span><p class="prompt">${q.quote?"« ":""}${esc(q.prompt)}${q.quote?" »":""}</p>${q.src?`<p class="src">${esc(q.src)}</p>`:""}
      <div class="opts">${q.options.map((o,j)=>`<button data-j="${j}" ${done?"disabled":""} class="${done&&j===q.answer?"ok":""} ${done&&j===G.picked&&j!==q.answer?"ko":""}">${esc(o)}</button>`).join("")}</div>
      <div aria-live="polite">${done?`<p class="feedback"><span class="verdict ${good?"good":"bad"}">${good?"Bien vu.":"Raté."}</span><span class="who">${good?"":"C'était "}${esc(q.options[q.answer])}</span>${esc(q.explication)}</p>`:""}</div>
      <div class="acts row">${done?`<button class="btn" id="nextq">${G.i<total-1?"Suivante":"Voir mon score"}</button>${q.fiche?`<button class="btn ghost" data-f="${esc(q.fiche)}">Voir la fiche</button>`:""}`:""}</div></div>`;
  }
  host.innerHTML=`<div class="play"><div class="top"><button id="quit">← Arrêter</button><span class="hint">${G.i+1} / ${total}</span></div><div class="prog"><i style="width:${G.i/total*100}%"></i></div>${body}</div>`;
  $("#quit").onclick=quitGame;
  if(G.g==="cartes"){
    if($("#flip")) $("#flip").onclick=()=>{G.shown=true;renderGame()};
    if($("#ok")) $("#ok").onclick=()=>{grade(G.cards[G.i],true,true);G.score++;G.i++;G.shown=false;renderGame()};
    if($("#ko")) $("#ko").onclick=()=>{grade(G.cards[G.i],false,true);G.i++;G.shown=false;renderGame()};
  } else {
    host.querySelectorAll(".opts button").forEach(b=>b.onclick=()=>{
      const q=G.qs[G.i]; G.picked=+b.dataset.j; const ok=G.picked===q.answer; if(ok)G.score++;
      const f=fiche(q.fiche); if(f) grade(f,ok,false);
      if(q.key){ const m=Object.assign({},S.stats.maitrise||{}); m[q.key]=ok?Math.min((m[q.key]||0)+1,9):0; S.stats.maitrise=m; writeProg({maitrise:{[q.key]:m[q.key]}}); if(ok) G.enRoute.add(q.key) }
      renderGame();
    });
    if($("#nextq")) $("#nextq").onclick=()=>{G.i++;G.picked=null;renderGame()};
    host.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>openFiche(b.dataset.f));
  }
}
function grade(f, ok, force){
  const t=today(), e=S.etat[f.id]||{vu:t}, due=nextOf(e,t)<=t;
  let niveau=e.niveau||0, prochaine=e.prochaine;
  if(!ok){ niveau=0; prochaine=addDays(t,1) }
  else if(due||force){ niveau=Math.min(niveau+1,INTERVALLES.length); prochaine=addDays(t,INTERVALLES[niveau-1]) }
  else if(S.etat[f.id]) return;
  const ne={vu:e.vu||t,niveau,...(prochaine?{prochaine}:{})};
  S.etat[f.id]=ne;
  const n=dueFiches().length+(grandeDue()?1:0); $("#due").hidden=!n; $("#due").textContent=n;
  writeProg({etat:{[f.id]:ne}});
}
function saveStat(o){ S.stats=Object.assign({},S.stats,o); writeProg(o) }

/* ---------- Penseurs ---------- */
const ERAS=[["Antiquité",-9999,400],["Moyen Âge",400,1450],["Renaissance et âge classique",1450,1700],["Lumières",1700,1790],["XIXe siècle",1790,1880],["XXe siècle",1880,1950],["Aujourd'hui",1950,9999]];
function renderPenseurs(){
  const host=$("#v-penseurs"), P=penseurs().sort((a,b)=>(a.naissance??0)-(b.naissance??0));
  let html=`<h2 class="page">Penseurs</h2><p class="hint page-intro">Rangés dans l'ordre du temps, pour savoir qui répond à qui. Touche une carte pour voir le portrait complet.</p>`;
  if(!P.length) html+=`<p class="empty">Chaque penseur rencontré dans les cartes aura ici son portrait.</p>`;
  ERAS.forEach(([nom,a,b])=>{const L=P.filter(p=>(p.naissance??0)>=a&&(p.naissance??0)<b); if(L.length) html+=`<div class="era"><h3>${nom}</h3><div class="people">${L.map(pcard).join("")}</div></div>`});
  host.innerHTML=html; host.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>openFiche(b.dataset.f));
}

/* ---------- Parcours ---------- */
function venirPour(nom){
  const sem=semaineCourante(); if(!sem) return null;
  const p=(sem.programme||[]).find(x=>norm(x.sujet).includes(norm(nom)));
  return p ? addDays(sem.debut,p.rang-1) : null;
}
function searchText(f){ return norm([f.terme,f.resume,f.enUnMot,f.memo,f.formule,f.explication,(f.oeuvres||[]).join(" "),(f.theses||[]).join(" "),(f.citations||[]).map(c=>c.texte).join(" ")].join(" ")) }
function renderIndex(){
  const host=$("#v-index"), keep=document.activeElement&&document.activeElement.id==="lq";
  let html=`<h2 class="page">Parcours</h2><div class="seg" role="tablist"><button aria-pressed="${S.idx==="notions"}" data-s="notions">Notions</button><button aria-pressed="${S.idx==="fiches"}" data-s="fiches">Toutes les fiches</button></div>`;
  if(S.idx==="notions"){
    const sems=[...S.semaines].sort((a,b)=>b.numero-a.numero), cur=semaineCourante(), t=today();
    html+=progressHTML()+badgesHTML();
    const mine=maNotion();
    html+=`<p class="label" style="margin-top:32px" id="notions">Les notions</p><p class="hint" style="margin:-4px 0 6px">Chacune se lit en 7 cartes, à ton rythme. Commence par celle qui te tente.</p>`;
    html+= S.semaines.length ? semsAsc().map(s=>{ const pub=publiees(s.id), lu=luesDe(s.id).length, enCours=mine&&mine.id===s.id;
      const btn = enCours ? `<span class="hint">ta notion</span>` : `<button class="pick" data-notion="${esc(s.id)}">${lu>=7?"Relire":lu?"Reprendre":"Commencer"}</button>`;
      return `<div class="wk"><div class="h"><span class="n">${String(s.numero).padStart(2,"0")}</span><span><span class="dom">${esc(s.domaine)}${enCours?" · en cours":""}</span><span class="nt">${esc(s.notion)}</span><span class="qs">${esc(s.question)}</span>
        <span class="pl-row" style="margin-top:8px"><span class="pl-txt">${lu}/7 lues${pub.length<7?` · ${pub.length} publiées sur 7`:""}</span>${btn}</span></span></div>
       <div class="days">${pub.map(c=>`<button class="chip ${isRead(c)?"lu":""}" data-d="${c.date}">${isRead(c)?"✓ ":""}${c.rang}. ${esc(c.titre)}</button>`).join("")}</div></div>`}).join("") : `<p class="empty">La première notion apparaîtra ici.</p>`;
    const plan=S.plan||{suivantes:[]}, choix=plan.choix&&plan.choix.notion, o=PLATFORM.canChoose();
    html+=`<p class="label" style="margin-top:32px">Bientôt publiées</p><p class="hint" style="margin:-4px 0 6px">${o?"Choisis celle qui sera publiée la semaine prochaine.":"Une nouvelle notion arrive chaque semaine."}</p>
      ${choix?`<div class="up"><span><span class="dom">${esc(plan.choix.domaine||"Choisie")}</span><span class="nt">${esc(plan.choix.notion)}</span>${plan.choix.question?`<span class="qs">${esc(plan.choix.question)}</span>`:""}</span>${o?`<button class="pick" aria-pressed="true" id="unpick">Choisie · annuler</button>`:`<span class="hint">semaine prochaine</span>`}</div>`:""}
      ${(plan.suivantes||[]).filter(s=>s.notion!==choix).map(s=>`<div class="up"><span><span class="dom">${esc(s.domaine)}</span><span class="nt">${esc(s.notion)}</span><span class="qs">${esc(s.question||"")}</span></span>${o?`<button class="pick" aria-pressed="false" data-n="${esc(s.notion)}">Semaine prochaine</button>`:"<span></span>"}</div>`).join("")}
      ${o?`<div style="margin-top:18px"><label for="libre" class="label" style="display:block">Une notion qui te tente</label><input type="text" id="libre" placeholder="la jalousie, l'ennui, Montaigne…"><div class="row"><button class="btn" id="libgo">Pour la semaine prochaine</button></div><div class="status" id="pst"></div></div>`:""}
      <details class="how"><summary>Comment ça marche</summary><div class="inner">${howHTML()}</div></details>`;
  } else {
    const types=["Tout",...[...new Set(S.fiches.map(f=>f.type).filter(Boolean))].sort()], q=norm(S.q.trim());
    const list=S.fiches.filter(f=>(S.filt==="Tout"||f.type===S.filt)&&(!q||searchText(f).includes(q))).sort((a,b)=>a.terme.localeCompare(b.terme,"fr"));
    let vide="Aucune fiche ne correspond pour l'instant.";
    if(q && !list.length){ const d=venirPour(S.q.trim()); vide=`Pas encore de fiche pour « ${esc(S.q.trim())} ».${d?" Elle arrive "+esc(frJour(d))+".":" Elle viendra peut-être avec une prochaine carte."}` }
    html+=`<div style="margin-top:16px"><label for="lq" class="hint">Chercher un nom, une œuvre, une idée</label><input type="search" id="lq" value="${esc(S.q)}" autocomplete="off"></div>
      <div class="filters">${types.map(t=>`<button aria-pressed="${t===S.filt}" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      ${list.length?`<ul class="az">${list.map(f=>`<li><button data-f="${esc(f.id)}"><span class="t">${esc(f.terme)}</span><span class="k">${esc(f.type)}${f.semaineNotion?" · "+esc(f.semaineNotion):""}</span></button></li>`).join("")}</ul>`:`<p class="empty">${S.fiches.length?vide:"Les fiches arriveront avec les cartes."}</p>`}`;
  }
  host.innerHTML=html;
  host.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{S.idx=b.dataset.s;renderIndex()});
  host.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{S.sel=b.dataset.d;show("jour")});
  host.querySelectorAll("[data-notion]").forEach(b=>b.onclick=()=>choisirNotion(b.dataset.notion));
  host.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>openFiche(b.dataset.f));
  host.querySelectorAll(".filters button").forEach(b=>b.onclick=()=>{S.filt=b.dataset.t;renderIndex()});
  PLATFORM.wireChoix(host);
  const inp=$("#lq"); if(inp){ inp.oninput=()=>{S.q=inp.value;renderIndex()}; if(keep){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length)} }
}

/* ---------- fiche plein écran ---------- */
let lastFocus=null;
const isSheetOpen = () => !$("#sheet").hidden;
function openFiche(id){
  const f=fiche(id); if(!f) return; const t=today();
  if(!isSheetOpen()){ lastFocus=document.activeElement; pushLayer("sheet") }
  let h=`<div class="closebar"><button class="close" id="closeSheet">← Retour</button></div>`;
  if(f.type==="Penseur"){
    const [fn,ln]=splitName(f.terme);
    h+=`<div class="idcard"><div class="fn">${esc(fn)}</div><h2 class="ln" id="sheetTitle" tabindex="-1" style="margin:0">${esc(ln)}</h2><div class="meta">${f.dates?`<span>${esc(f.dates)}</span>`:""}${f.pays?`<span>${esc(f.pays)}</span>`:""}${f.oeuvres&&f.oeuvres.length?`<span>${esc(f.oeuvres.join(" · "))}</span>`:""}</div>${f.enUnMot?`<div class="mot">${esc(f.enUnMot)}</div>`:""}</div>`;
    if(f.memo) h+=`<div class="sec note"><p class="label">Pour retenir son nom</p><p>${esc(f.memo)}</p></div>`;
    if((f.theses||[]).length) h+=`<div class="sec"><p class="label">Ce qu'il pense</p><ul class="theses">${f.theses.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
    if((f.citations||[]).length) h+=`<div class="sec"><p class="label">Ce qu'il a dit</p>${f.citations.map(c=>`<div class="cit"><p>« ${esc(c.texte)} »</p><span>${esc(c.source||"")}</span></div>`).join("")}</div>`;
    if(f.explication) h+=`<div class="sec prose"><p class="label">Le contexte</p>${paras(f.explication)}</div>`;
    if((f.dialogue||[]).length) h+=`<div class="sec"><p class="label">Avec qui il dialogue</p><div class="rows">${f.dialogue.map(d=>{const o=fiche(d.id), nom=o?o.terme:(d.nom||d.id), quand=o?null:venirPour(nom);
      return o?`<button class="rowline" data-f="${esc(d.id)}"><span class="k">${esc(d.relation)}</span><span class="v">${esc(nom)}</span>${d.note?` <span class="s">· ${esc(d.note)}</span>`:""}</button>`
              :`<div class="rowline later"><span class="k">${esc(d.relation)}</span><span class="v">${esc(nom)}</span> <span class="s">· ${quand?"fiche à venir "+esc(frJour(quand)):"pas encore de fiche"}</span></div>`}).join("")}</div></div>`;
  } else {
    h+=`<div class="idcard"><div class="fn">${esc(f.type)}${f.dates?" · "+esc(f.dates):""}</div><h2 class="ln small" id="sheetTitle" tabindex="-1" style="margin:0">${esc(f.terme)}</h2>${f.formule?`<div class="mot">${esc(f.formule)}</div>`:""}</div>`;
    h+=`<div class="sec prose"><p><b style="font-weight:500">${esc(f.resume)}</b></p>${paras(f.explication)}</div>`;
    if(f.memo) h+=`<div class="sec note"><p class="label">Pour retenir</p><p>${esc(f.memo)}</p></div>`;
  }
  if((f.popCulture||[]).length) h+=`<div class="sec"><p class="label">Dans les romans, les films, les séries</p><div class="rows">${f.popCulture.map(p=>`<div class="rowline"><span class="k" style="color:var(--mark)">${esc(p.type||"")}</span><span class="v">${esc(p.titre)}</span>${p.texte?`<span class="s" style="display:block">${esc(p.texte)}</span>`:""}</div>`).join("")}</div></div>`;
  const liens=(f.liens||[]).map(fiche).filter(Boolean);
  if(liens.length) h+=`<div class="sec"><p class="label">Voir aussi</p><div class="row" style="margin-top:0">${liens.map(l=>`<button class="chip" data-f="${esc(l.id)}">${esc(l.terme)}</button>`).join("")}</div></div>`;
  const e=S.etat[f.id];
  h+=`<p class="hint sec">${f.semaineNotion?"Vu pendant la semaine « "+esc(f.semaineNotion)+" ». ":""}${e?"Prochaine révision : "+esc(frDate(nextOf(e,t)))+".":""}</p>`;
  const sh=$("#sheet");
  $("#sheetIn").innerHTML=h; sh.hidden=false; sh.scrollTop=0; document.body.style.overflow="hidden";
  document.querySelectorAll(".wrap, nav.tabs").forEach(x=>x.inert=true);
  $("#closeSheet").onclick=()=>popLayer(()=>closeSheet(true));
  $("#sheetIn").querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>openFiche(b.dataset.f));
  const tt=$("#sheetTitle"); if(tt) tt.focus({preventScroll:true});
}
function closeSheet(){
  $("#sheet").hidden=true; document.body.style.overflow="";
  document.querySelectorAll(".wrap, nav.tabs").forEach(x=>x.inert=false);
  if(lastFocus&&lastFocus.focus&&document.contains(lastFocus)) lastFocus.focus({preventScroll:true}); lastFocus=null;
}
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && isSheetOpen()) popLayer(()=>closeSheet(true)) });

/* ---------- démarrage (l'adaptateur appelle bootCommon puis charge les données) ---------- */
function bootCommon(){ const h=location.hash.slice(1); if(VIEWS.includes(h)&&h!=="jour") show(h); else render() }
