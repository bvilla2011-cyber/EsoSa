import { Client, TablesDB, Users, ID, Query } from 'node-appwrite';
import { opcionsDificils } from '../../src/distractors.js';
import { createHash } from 'node:crypto';
import { LEXIC, DITES, CATANYOL } from '../../src/banc.js';

const BUITS=[];

const DB='lexico4t', PERFILS='perfils', PARTIDES='partides';
const barreja=(items)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const normalitza=(s)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/[‘’´]/g,"'").replace(/[^a-z0-9çñ·' ]/g,' ').replace(/\s+/g,' ').trim();
const pregVisible=(p,index,total)=>p?({index:index+1,total,tipus:p.tipus,fase:p.fase,apartat:p.apartat||null,enunciat:p.enunciat,opcions:p.opcions??null}):null;
const punts=(ok)=>ok?10:-5;
function fabricaBase(mode,complet=false){
 if(mode==='lexic'||mode==='dites'){
   const data=mode==='lexic'?LEXIC:DITES;
   const tipus=mode==='lexic'?'Lèxic':'Dites';
   const ordre=barreja(data);
   const test=ordre.map(([mot,def])=>{
      return {tipus:'test',fase:'TEST',enunciat:'Què vol dir «'+mot+'»?',opcions:barreja(opcionsDificils(mode,mot,def)),correcta:def};
   });
   const escriu=barreja(data).slice(0,complet?data.length:mode==='lexic'?15:10).map(([mot,def])=>({
      tipus:'escriure',fase:'ESCRIURE',enunciat:'Quina paraula o expressió correspon a la definició?\n'+def,correcta:mot
   }));
   if(mode==='lexic'){
     // Frases i col·locacions d'exercicis dels apunts; només s'usen respostes documentades.
     const buits=BUITS;
     const omplir=barreja(buits).map(([e,c])=>({tipus:'escriure',fase:'OMPLIR BUITS',enunciat:'Escriu el mot que falta:\n'+e,correcta:c}));
     return [...test,...escriu,...omplir];
   }
   // Dites emprades en context incorrecte: cal trobar la dita adequada, no corregir accents.
   const corregir=barreja(data).map(([mot,significat],i)=>{
      const incorrecte=data.find(x=>x[0]!==mot && x[1]!==significat);
      return {tipus:'escriure',fase:'CORREGIR DITES',enunciat:'Per expressar «'+significat+'», algú ha escrit «'+incorrecte[0]+'». Quina dita hauria d\'haver escrit?',correcta:mot};
   });
   return [...test,...escriu,...corregir];
 }
 if(mode==='catanyol'){
   // Els textos són combinacions aleatòries de frases del PDF. La correcció esperada
   // és la suma literal de les correccions indicades en els apunts.
   const parelles=CATANYOL;
   const frases=[];
   for(let i=0;i<parelles.length;i+=2){
     const p=parelles.slice(i,i+2);
     frases.push({tipus:'text',fase:'DETECTAR I CORREGIR',enunciat:'Detecta les construccions inadequades i reescriu TOT el text en català correcte. Separa les frases amb un salt de línia.\n\n'+p.map(x=>x[0]).join('\n'),correcta:p.map(x=>x[1]).join('\n'),respostes:p.map(x=>x[1])});
   }
   return barreja(frases);
 }
 throw Error('Modalitat desconeguda.');
}

const MODES=['lexic','dites','catanyol'];
const questionId=(mode,q)=>createHash('sha256').update(mode+'|'+q.fase+'|'+(mode==='lexic'&&q.fase==='OMPLIR BUITS'?(BUITS.find(x=>x[1]===q.correcta)?.[2]?'Escriu el mot que falta:\n'+BUITS.find(x=>x[1]===q.correcta)[2]:q.enunciat):q.enunciat)+'|'+q.correcta).digest('hex').slice(0,24);
function fabrica(mode,complet=false){
 if(mode==='mix')return barreja(MODES.flatMap(m=>fabrica(m,complet)));
 return fabricaBase(mode,complet).map(q=>({...q,apartat:mode,id:questionId(mode,q)}));
}
function domini(partides){
 const latest=new Map();
 for(const run of partides){
  let qs=[];try{qs=JSON.parse(run.preguntes)}catch{}
  for(const q of qs){
   if(typeof q.encert!=='boolean'||!q.respostaData)continue;
   const mode=q.apartat||run.mode,id=q.id||questionId(mode,q);
   const at=Date.parse(q.respostaData);
   if(!Number.isFinite(at))continue;
   if(!latest.has(id)||at>latest.get(id).at)latest.set(id,{at,ok:q.encert});
  }
 }
 return MODES.map(mode=>{
  const keys=[...new Set(fabrica(mode,true).map(q=>q.id))];
  const correctes=keys.filter(k=>latest.get(k)?.ok).length;
  const practicades=keys.filter(k=>latest.has(k)).length;
  return {mode,total:keys.length,correctes,practicades,percentatge:correctes===keys.length?100:Math.floor(correctes/keys.length*1000)/10};
 });
}
function encertada(p,resposta){
 if(p.tipus==='text'){
   const parts=String(resposta||'').split(/\n+/).map(normalitza);
   return parts.length===p.respostes.length && parts.every((x,i)=>x===normalitza(p.respostes[i]));
 }
 return normalitza(resposta)===normalitza(p.correcta);
}
export default async ({req,res,error})=>{
 try{
  const body=req.bodyJson||(req.body?JSON.parse(req.body):{});
  const action=body.action;
  const userId=req.headers['x-appwrite-user-id'];
  const jwt=req.headers['x-appwrite-user-jwt'];
  if(!userId||!jwt) return res.json({error:'Cal iniciar sessió per jugar.'},401);
  const admin=new Client().setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT||'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID).setKey(req.headers['x-appwrite-key']);
  const tables=new TablesDB(admin),users=new Users(admin);
  // El JWT del jugador també es valida contra Appwrite, no es confia en un ID enviat pel client.
  const sessClient=new Client().setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT||'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID).setJWT(jwt);
  const me=await new (await import('node-appwrite')).Account(sessClient).get();
  if(me.$id!==userId) return res.json({error:'Sessió no vàlida.'},401);
  if(me.prefs?.course!=='4t ESO'||!['A','B','C1','C2'].includes(me.prefs?.level))
    return res.json({error:'Cal confirmar que ets de 4t d’ESO i indicar el teu nivell.'},403);
  const read=async (table,rowId)=>tables.getRow({databaseId:DB,tableId:table,rowId});
  const write=async (table,rowId,data)=>tables.updateRow({databaseId:DB,tableId:table,rowId,data});
  const inicial=()=>({nom:String(me.name||'Jugador').slice(0,80),punts:0,partides:0,encerts:0,errors:0});
  const perfil=async()=>{
    try{return await read(PERFILS,userId);}
    catch(e){if(e.code!==404)throw e;try{return await tables.createRow({databaseId:DB,tableId:PERFILS,rowId:userId,data:inicial()});}catch(x){if(x.code===409)return read(PERFILS,userId);throw x;}}
  };
  // Desa una partida sencera o interrompuda en una única transacció atòmica.
  // Això evita sumar els mateixos punts dos cops quan l'usuari prem sortir repetidament.
  const tancar=async (original,patch={})=>{
    for(let intent=0;intent<3;intent++){
      const run=intent===0?original:await read(PARTIDES,original.$id);
      if(run.usuari!==userId)throw Object.assign(new Error('Partida no autoritzada'),{code:403});
      const tot=JSON.parse(run.preguntes).length;
      if(run.acabat){
        const p=await perfil();
        return {jaDesada:true,parcial:run.posicio<tot,nota:run.posicio?Math.round(run.encerts/run.posicio*100)/10:0,encerts:run.encerts,errors:run.errors,respostes:run.posicio,preguntes:tot,punts:run.guany,total:p.punts,dominat:p.punts>=10000};
      }
      const pos=patch.posicio??run.posicio;
      const guany=patch.guany??run.guany;
      const encerts=patch.encerts??run.encerts;
      const errors=patch.errors??run.errors;
      const anterior=await perfil();
      const nouTotal=anterior.punts+guany;
      const tx=await tables.createTransaction();
      try{
        await tables.updateRow({databaseId:DB,tableId:PARTIDES,rowId:run.$id,transactionId:tx.$id,data:{posicio:pos,guany,encerts,errors,acabat:true,...(patch.preguntes?{preguntes:patch.preguntes}:{})}});
        await tables.updateRow({databaseId:DB,tableId:PERFILS,rowId:userId,transactionId:tx.$id,data:{
          punts:nouTotal,partides:anterior.partides+1,
          encerts:anterior.encerts+encerts,errors:anterior.errors+errors
        }});
        await tables.updateTransaction({transactionId:tx.$id,commit:true});
        return {jaDesada:false,parcial:pos<tot,nota:pos?Math.round(encerts/pos*100)/10:0,encerts,errors,respostes:pos,preguntes:tot,punts:guany,total:nouTotal,dominat:nouTotal>=10000};
      }catch(e){
        try{await tables.updateTransaction({transactionId:tx.$id,rollback:true});}catch{}
        if(e.code===409&&intent<2)continue;
        throw e;
      }
    }
  };
  const presenceMap=(raw)=>{
    let data={};try{data=JSON.parse(raw||'{}')}catch{}
    if(!data||typeof data!=='object'||Array.isArray(data))return {};
    return Object.fromEntries(Object.entries(data).filter(([k,v])=>v&&Number.isFinite(v.at)&&Date.now()-v.at<75000).slice(-12));
  };
  if(!['presence','me','ranking'].includes(action))
    return res.json({error:'Els nous continguts de EsoSa arribaran aviat.'},503);
  if(action==='presence'){
    const tab=String(body.tab||'');
    if(!/^[a-zA-Z0-9-]{8,64}$/.test(tab)||!['online','playing','offline'].includes(body.status))
      return res.json({error:'Presència no vàlida.'},400);
    const p=await perfil(),sessions=presenceMap(p.presencia);
    if(body.status==='offline')delete sessions[tab];
    else sessions[tab]={at:Date.now(),status:body.status};
    await write(PERFILS,userId,{presencia:JSON.stringify(sessions)});
    return res.json({ok:true});
  }
  if(action==='me'){
    const p=await perfil();
    return res.json({nom:p.nom,punts:p.punts,partides:p.partides,encerts:p.encerts,errors:p.errors,dominat:p.punts>=10000});
  }
  if(action==='ranking'){
    const r=await tables.listRows({databaseId:DB,tableId:PERFILS,queries:[Query.orderDesc('punts'),Query.limit(100)]});
    return res.json({ranking:(r.rows||r.documents||[]).map((x,i)=>({id:x.$id,posicio:i+1,nom:x.nom,punts:x.punts,partides:x.partides,presencia:Object.values(presenceMap(x.presencia)).some(v=>v.status==='playing')?'playing':Object.keys(presenceMap(x.presencia)).length?'online':null}))});
  }

  if(action==='recommendations'){
    // Read-only: practice never creates games, answers, points or mastery records.
    const failed=new Map();let cursor=null;
    do{
      const queries=[Query.equal('usuari',userId),Query.orderAsc('$id'),Query.limit(100)];
      if(cursor)queries.push(Query.cursorAfter(cursor));
      const result=await tables.listRows({databaseId:DB,tableId:PARTIDES,queries});
      const rows=result.rows||result.documents||[];
      for(const run of rows){
        let qs=[];try{qs=JSON.parse(run.preguntes)}catch{}
        for(const q of qs){
          if(q.encert!==false)continue;
          const apartat=q.apartat||run.mode,id=q.id||questionId(apartat,q);
          const previous=failed.get(id);
          if(previous){previous.errors++;continue;}
          let opcions=q.opcions;
          if(q.tipus==='test'){
            const mot=/^Què vol dir «(.+)»\?$/.exec(q.enunciat)?.[1];
            if(mot&&['lexic','dites'].includes(apartat))opcions=barreja(opcionsDificils(apartat,mot,q.correcta));
          }
          failed.set(id,{errors:1,q:{id,apartat,tipus:q.tipus,fase:q.fase,enunciat:apartat==='lexic'&&q.fase==='OMPLIR BUITS'&&BUITS.some(x=>x[1]===q.correcta)?'Escriu el mot que falta:\n'+BUITS.find(x=>x[1]===q.correcta)[0]:q.enunciat,opcions:opcions||null,correcta:q.correcta,respostes:q.respostes||null}});
        }
      }
      cursor=rows.length===100?rows[rows.length-1].$id:null;
    }while(cursor);
    return res.json({preguntes:[...failed.values()].sort((a,b)=>b.errors-a.errors)});
  }
  if(action==='mastery'){
    const runs=[];let cursor=null;
    do{
      const queries=[Query.equal('usuari',userId),Query.orderAsc('$id'),Query.limit(100)];
      if(cursor)queries.push(Query.cursorAfter(cursor));
      const result=await tables.listRows({databaseId:DB,tableId:PARTIDES,queries});
      const rows=result.rows||result.documents||[];runs.push(...rows);
      cursor=rows.length===100?rows[rows.length-1].$id:null;
    }while(cursor);
    return res.json({apartats:domini(runs)});
  }
  if(action==='history'){
    const queries=[Query.equal('usuari',userId),Query.orderDesc('$createdAt'),Query.limit(13)];
    if(body.cursor)queries.push(Query.cursorAfter(String(body.cursor)));
    const all=await tables.listRows({databaseId:DB,tableId:PARTIDES,queries});
    const rows=all.rows||all.documents||[];
    const partides=rows.slice(0,12).map(x=>{
      let quantitat=0;try{quantitat=JSON.parse(x.preguntes).length;}catch{}
      return {id:x.$id,mode:x.mode,nota:quantitat?Math.round(100*x.encerts/quantitat)/10:0,punts:x.guany,encerts:x.encerts,errors:x.errors,respostes:x.posicio,total:quantitat,acabat:x.acabat,data:x.$createdAt};
    });
    return res.json({partides,cursor:rows.length>12?rows[11].$id:null});
  }
  if(action==='historyDetail'){
    const run=await read(PARTIDES,String(body.partida||''));
    if(run.usuari!==userId)return res.json({error:'Aquesta partida no és teva.'},403);
    const qs=JSON.parse(run.preguntes);
    const preguntes=qs.map((q,i)=>({
      index:i+1,apartat:q.apartat||run.mode,fase:q.fase,enunciat:q.enunciat,
      resposta:q.respostaUsuari??null,encert:typeof q.encert==='boolean'?q.encert:null,
      solucio:i<run.posicio||run.acabat?q.correcta:null,
      estat:q.respostaUsuari!==undefined?'contestada':i<run.posicio?'antiga':'pendent'
    }));
    return res.json({mode:run.mode,data:run.$createdAt,punts:run.guany,encerts:run.encerts,errors:run.errors,respostes:run.posicio,total:qs.length,acabat:run.acabat,preguntes});
  }
  if(action==='start'){
    if(![...MODES,'mix'].includes(body.mode))return res.json({error:'Modalitat incorrecta.'},400);
    await perfil();
    const preguntes=fabrica(body.mode);
    const run=await tables.createRow({databaseId:DB,tableId:PARTIDES,rowId:ID.unique(),data:{usuari:userId,mode:body.mode,preguntes:JSON.stringify(preguntes),posicio:0,guany:0,encerts:0,errors:0,acabat:false}});
    return res.json({partida:run.$id,mode:body.mode,pregunta:pregVisible(preguntes[0],0,preguntes.length),puntuacio:0});
  }
  if(action==='resume'){
    const all=await tables.listRows({databaseId:DB,tableId:PARTIDES,queries:[Query.equal('usuari',userId),Query.equal('acabat',false),...(body.mode?[Query.equal('mode',body.mode)]:[]),Query.orderDesc('$createdAt'),Query.limit(1)]});
    const run=(all.rows||all.documents||[]).find(x=>!body.mode||x.mode===body.mode);
    if(!run)return res.json({partida:null});
    const qs=JSON.parse(run.preguntes);
    let actualitzada=false;
    for(let i=run.posicio;i<qs.length;i++){
      const q=qs[i],mode=q.apartat||run.mode;
      if(mode==='lexic'&&q.fase==='OMPLIR BUITS'){
        const phrase=BUITS.find(x=>x[1]===q.correcta)?.[0];
        if(phrase){const updated='Escriu el mot que falta:\n'+phrase;if(q.enunciat!==updated){q.enunciat=updated;actualitzada=true;}}
      }
      if(q.tipus!=='test'||q.opcions?.length===4)continue;
      const mot=/^Què vol dir «(.+)»\?$/.exec(q.enunciat)?.[1];
      if(!mot||!['lexic','dites'].includes(mode))continue;
      q.opcions=barreja(opcionsDificils(mode,mot,q.correcta));actualitzada=true;
    }
    if(actualitzada)await write(PARTIDES,run.$id,{preguntes:JSON.stringify(qs)});
    return res.json({partida:run.$id,mode:run.mode,pregunta:pregVisible(qs[run.posicio],run.posicio,qs.length),puntuacio:run.guany});
  }
  if(action==='leave'){
    const run=await read(PARTIDES,String(body.partida||''));
    if(run.usuari!==userId)return res.json({error:'Aquesta partida no és teva.'},403);
    const resultat=await tancar(run);
    return res.json({desat:true,final:true,resultat});
  }
  if(action==='answer'){
    if(typeof body.resposta!=='string'||body.resposta.length>2000)return res.json({error:'Resposta invàlida.'},400);
    const run=await read(PARTIDES,String(body.partida||''));
    if(run.usuari!==userId)return res.json({error:'Aquesta partida no és teva.'},403);
    if(run.acabat)return res.json({error:'La partida ja s\'ha acabat.'},409);
    const qs=JSON.parse(run.preguntes);
    const pos=run.posicio;
    if(!Number.isInteger(body.index)||body.index!==pos+1)return res.json({error:'Has de respondre la pregunta actual.'},409);
    const q=qs[pos],ok=encertada(q,body.resposta);
    const guany=run.guany+punts(ok),correctes=run.encerts+(ok?1:0),fallades=run.errors+(ok?0:1);
    q.respostaUsuari=body.resposta;q.encert=ok;q.respostaData=new Date().toISOString();
    q.apartat=q.apartat||run.mode;q.id=q.id||questionId(q.apartat,q);
    const preguntes=JSON.stringify(qs);
    const final=pos+1===qs.length;
    if(final){
      const resultat=await tancar(run,{posicio:pos+1,guany,encerts:correctes,errors:fallades,preguntes});
      return res.json({correcte:ok,solucio:q.correcta||q.respostes?.join('\\n'),puntuacio:guany,final:true,resultat});
    }
    await write(PARTIDES,run.$id,{posicio:pos+1,guany,encerts:correctes,errors:fallades,acabat:false,preguntes});
    return res.json({correcte:ok,solucio:q.correcta,puntuacio:guany,final:false,pregunta:pregVisible(qs[pos+1],pos+1,qs.length)});
  }
  return res.json({error:'Acció desconeguda.'},400);
 }catch(e){
  error(e?.stack||String(e));
  return res.json({error:e?.code===404?'Partida o registre no trobat.':'No s\'ha pogut completar l\'operació. Torna-ho a provar.'},e?.code===404?404:500);
 }
};
