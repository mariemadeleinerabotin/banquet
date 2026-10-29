/* ===== Adaptateur : site public (GitHub Pages). Données en JSON statiques, progression dans le navigateur. ===== */
const KEY="banquet.progres.v1";
function loadLocal(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||"{}"); S.etat=d.etat||{}; S.stats=d.stats||{derniereGrande:d.derniereGrande||null}; S.reponses=d.reponses||{} }catch(e){} }
function saveLocal(){ try{ localStorage.setItem(KEY,JSON.stringify({etat:S.etat,stats:S.stats,reponses:S.reponses})) }catch(e){} }
async function getJSON(path){
  const v=Math.floor(Date.now()/300000);
  const r=await fetch(path+"?v="+v,{cache:"no-cache"}); if(!r.ok) throw new Error(r.status); return r.json();
}
async function loadCard(date){
  if(S.loading===date) return; S.loading=date;
  $("#cardHost").innerHTML='<p class="notice">Ouverture de la carte…</p>';
  try{ S.full[date]=await getJSON("data/cartes/"+date+".json"); S.loading=null; $("#cardHost").dataset.d=""; if(S.view==="jour") renderJour() }
  catch(e){ S.loading=null; $("#cardHost").innerHTML='<p class="notice">La carte ne s\'est pas chargée. Vérifiez la connexion et rechargez la page.</p>' }
}
const PLATFORM={
  useHistory:true, install:true,
  txtProg:"Sans compte ni inscription : la progression reste enregistrée sur ce téléphone.",
  txtProgShort:"La progression reste sur ce téléphone.",
  writeProg(o){ saveLocal() },
  fullCard(date){ if(S.full[date]) return S.full[date]; loadCard(date); return null },
  toiHTML(card){
    return `<div class="block note toi"><p class="label">À vous d'écrire</p><p class="q">${esc(card.question||"")}</p>
     <label for="rep" class="hint">Une dizaine de lignes, pour vous. La réponse reste sur ce téléphone.</label>
     <textarea id="rep" style="min-height:170px;margin-top:6px"></textarea>
     <div class="row"><button class="btn" id="save">Garder la réponse</button><span class="hint" id="st" aria-live="polite"></span></div></div>`;
  },
  wireToi(card){
    const r=S.reponses[card.date]||{}; $("#rep").value=r.texte||"";
    $("#save").onclick=()=>{ S.reponses[card.date]={texte:$("#rep").value.trim(),semaine:card.semaine,rang:card.rang,maj:today()}; saveLocal(); $("#st").textContent="Gardé sur ce téléphone." };
  },
  reviserNotice(){ return "" },
  canChoose(){ return false },
  wireChoix(host){}
};
(async()=>{
  loadLocal(); S.ready=true; bootCommon();
  try{
    const [idx,fi]=await Promise.all([getJSON("data/index.json"),getJSON("data/fiches.json")]);
    S.cartes=idx.cartes||[]; S.semaines=(idx.semaines||[]).sort((a,b)=>a.numero-b.numero); S.plan={suivantes:idx.aVenir||[],choix:idx.prochaine||null};
    S.fiches=Object.entries(fi.fiches||{}).map(([id,f])=>({...f,id}));
    render();
  }catch(e){ $("#cardHost").innerHTML='<p class="notice">Le Banquet ne s\'est pas chargé. Vérifiez la connexion et rechargez la page.</p>' }
})();
