/* ===== Adaptateur : artefact Claude. Données dans la base de l'artefact, progression privée par personne, « Contredis-moi ». ===== */
let wq=Promise.resolve();
const PLATFORM={
  useHistory:false, install:false,
  txtProg:"Ta progression est enregistrée dans ton espace privé : personne d'autre ne la voit.",
  txtProgShort:"Ta progression n'est visible que par toi.",
  writeProg(o){ if(!S.progRef||S.readOnly) return; wq=wq.then(()=>S.progRef.update(o)).catch(e=>{ if(e&&e.code==="invalid_argument") S.readOnly=true }) },
  fullCard(date){ return S.cartes.find(c=>c.date===date)||null },
  toiHTML(card){
    return `<div class="block note toi"><p class="label">À toi d'écrire</p><p class="q">${esc(card.question||"")}</p>
     <label for="rep" class="hint">Dix lignes. Ce que tu penses vraiment, pas ce qu'il faudrait penser.</label>
     <textarea id="rep" style="min-height:170px;margin-top:6px"></textarea>
     <div class="row"><button class="btn" id="contre">Contredis-moi</button><button class="btn ghost" id="save">Garder</button><span class="hint" id="st" aria-live="polite"></span></div>
     <div class="reply" id="reply" aria-live="polite"></div></div>`;
  },
  wireToi(card){
    const r=S.reponses[card.date]||{}; $("#rep").value=r.texte||""; $("#reply").textContent=r.contradiction||"";
    $("#contre").hidden=!S.sample; $("#save").hidden=!S.progRef||S.readOnly;
    $("#contre").onclick=()=>contredis(card); $("#save").onclick=()=>saveRep(card);
  },
  refreshToi(card){ const r=S.reponses[card.date], el=$("#reply"); if(el&&r&&r.contradiction&&!S.streaming) el.textContent=r.contradiction },
  reviserNotice(){ return !S.progRef||S.readOnly?`<p class="note" style="margin-top:16px">Tu peux jouer, mais ta progression ne sera pas enregistrée${S.uid?" : demande à la personne qui t'a partagé cette page un accès qui permet d'enregistrer.":" : connecte-toi à ton compte Claude."}</p>`:"" },
  canChoose(){ return S.owner },
  wireChoix(host){
    host.querySelectorAll("button.pick[data-n]").forEach(b=>b.onclick=()=>setChoix((S.plan.suivantes||[]).find(s=>s.notion===b.dataset.n)));
    if($("#unpick")) $("#unpick").onclick=()=>setChoix(null);
    if($("#libgo")) $("#libgo").onclick=()=>{const v=$("#libre").value.trim(); if(!v){$("#pst").textContent="Écris d'abord une notion.";return} setChoix({notion:v.charAt(0).toUpperCase()+v.slice(1),domaine:"Ton choix",question:""})};
  }
};
async function saveRep(card,contradiction){
  const texte=$("#rep").value.trim(), prev=S.reponses[card.date]||{};
  const doc={texte,contradiction:contradiction??prev.contradiction??"",semaine:card.semaine,rang:card.rang,maj:today()};
  S.reponses[card.date]=doc;
  if(!S.progRef||S.readOnly){ $("#st").textContent="Ton accès ne permet pas d'enregistrer ta réponse."; return }
  try{ await S.progRef.collection("reponses").doc(card.date).set(doc); $("#st").textContent="Gardé, visible par toi uniquement." }
  catch(e){ $("#st").textContent= e&&e.code==="invalid_argument" ? "Ton accès ne permet pas d'enregistrer ta réponse." : "Pas pu enregistrer, réessaie dans un instant." }
}
async function contredis(card){
  const texte=$("#rep").value.trim(); if(!texte){$("#st").textContent="Écris d'abord ta réponse.";$("#rep").focus();return}
  const sem=S.semaines.find(s=>s.id===card.semaine);
  const prompt=`Tu es un professeur de philosophie et de lettres exigeant et chaleureux. Ton élève a fait des lettres, travaille aujourd'hui en stratégie de communication, et veut retrouver des références et faire bouger sa pensée. Elle retient mal les noms : chaque fois que tu nommes un auteur, rappelle en trois mots qui il est (ex. « Spinoza, le philosophe hollandais de l'Éthique »).
Notion de la semaine : ${sem?sem.notion:""}. Carte du jour : « ${card.titre} » (${card.etape}).
Question posée : ${card.question}
Sa réponse : """${texte}"""

Reconnais d'abord en une phrase ce qui tient dans sa position. Puis oppose-lui les meilleurs arguments contraires, en t'appuyant sur 2 auteurs réels avec l'œuvre précise, et si possible sur un exemple tiré d'un roman, d'un film ou d'une série. N'invente aucune citation : reformule. Termine par une question qui l'oblige à préciser sa pensée.
Écris en français, à la deuxième personne (tu), en texte simple sans markdown ni listes, 170 mots maximum, en 3 ou 4 courts paragraphes.`;
  const btn=$("#contre"),out=$("#reply"); btn.disabled=true; $("#st").textContent="Claude réfléchit…"; out.textContent=""; S.streaming=true;
  try{ const r=await S.sample(prompt,{cache:false,onText:({text})=>{out.textContent=text}}); out.textContent=r.text; $("#st").textContent=""; await saveRep(card,r.text) }
  catch(e){ if(e&&e.code==="not_granted"){btn.hidden=true;$("#st").textContent="Claude n'a pas l'autorisation de répondre sur cette page."} else if(e&&e.code==="rate_limited") $("#st").textContent="Trop de demandes d'un coup. Réessaie dans une minute."; else $("#st").textContent="La réponse n'est pas arrivée. Réessaie." }
  finally{ btn.disabled=false; S.streaming=false }
}
async function setChoix(c){
  if(!S.db){$("#pst").textContent="Le choix ne peut pas être enregistré ici.";return}
  const plan=Object.assign({suivantes:[]},S.plan||{}); plan.choix=c;
  try{ await S.db.collection("parcours").doc("plan").set(plan); S.plan=plan; renderIndex(); $("#pst").textContent=c?`« ${c.notion} » sera la notion de la semaine prochaine.`:"Choix annulé." }
  catch(e){ $("#pst").textContent="Pas pu enregistrer, réessaie dans un instant." }
}
bootCommon();
(async()=>{
  if(!window.claude||!window.claude.use) return;
  claude.use("sample").then(s=>{S.sample=s; const b=$("#contre"); if(b) b.hidden=!s});
  const db=await claude.use("db"); if(!db){ $("#cardHost").innerHTML='<p class="notice">Ouvre cette page connectée à ton compte Claude pour voir tes cartes.</p>'; return }
  S.db=db; const err=()=>{};
  const rr=()=>{ if(!(S.view==="reviser"&&S.game)) render() };
  const user=await claude.use("user");
  if(user){ try{ S.owner=await user.isOwner() }catch(e){} try{ S.uid=await user.id() }catch(e){} }
  if(S.uid){
    S.progRef=db.doc("data/users/"+S.uid+"/progres");
    try{ const snap=await S.progRef.get(); if(!snap.exists) await S.progRef.set({etat:{},derniereGrande:null}) }
    catch(e){ S.readOnly=true }
    S.progRef.onSnapshot(s=>{ const d=s.exists?s.data():{}; S.etat=JSON.parse(JSON.stringify(d.etat||{}));
      S.stats=JSON.parse(JSON.stringify({derniereGrande:d.derniereGrande||null,jours:d.jours||[],lues:d.lues||[],parties:d.parties||0,sansFaute:d.sansFaute||0,defis:d.defis||0,grandes:d.grandes||0,badges:d.badges||{},maitrise:d.maitrise||{},grandeScore:d.grandeScore??null,notion:d.notion||null}));
      S.ready=!S.readOnly; rr() },err);
    S.progRef.collection("reponses").limit(400).onSnapshot(s=>{S.reponses={};s.docs.forEach(d=>S.reponses[d.id]=d.data()); if(S.view==="jour") renderJour()},err);
  }
  db.collection("cartes").orderBy("date","desc").limit(400).onSnapshot(s=>{S.cartes=s.docs.map(d=>({...d.data(),date:d.id}));rr()},err);
  db.collection("semaines").limit(400).onSnapshot(s=>{S.semaines=s.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.numero-b.numero);rr()},err);
  db.collection("fiches").limit(1000).onSnapshot(s=>{S.fiches=s.docs.map(d=>({...d.data(),id:d.id})); if(!(document.activeElement&&document.activeElement.id==="lq")) rr()},err);
  db.doc("parcours/plan").onSnapshot(s=>{S.plan=s.exists?s.data():null; if(S.view==="index") renderIndex()},err);
})();
