import { Client, TablesDB, Users, ID, Query } from 'node-appwrite';
import { LEXIC, DITES, CATANYOL } from '../../src/banc.js';

const DB='lexico4t', PERFILS='perfils', PARTIDES='partides';
const barreja=(items)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const normalitza=(s)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/[‘’´]/g,"'").replace(/[^a-z0-9çñ·' ]/g,' ').replace(/\s+/g,' ').trim();
const pregVisible=(p,index,total)=>p?({index:index+1,total,tipus:p.tipus,fase:p.fase,enunciat:p.enunciat,opcions:p.opcions??null}):null;
const punts=(ok)=>ok?10:-5;
function fabrica(mode){
 if(mode==='lexic'||mode==='dites'){
   const data=mode==='lexic'?LEXIC:DITES;
   const tipus=mode==='lexic'?'Lèxic':'Dites';
   const ordre=barreja(data);
   const test=ordre.map(([mot,def])=>{
      // Evitem opcions sinònimes que puguin ser totes correctes.
      const iguals=[
        ["n'estic tip","n'estic fart"],
        ["m'és igual","tant me fa","tant se me'n dóna"],
        ["tant se val","això rai!","no hi fa res"],
        ["què hi farem!","què vols fer-hi!","no hi ha res a fer"],
        ["remugar","rondinar","renegar"],
        ["desmanegar-se","desmuntar-se"],
        ["caure","estimbar-se","ensorrar-se","enfonsar"],
        ["plegar","enllestir","exhaurir-se"]
      ];
      const massaSemblant=altra=>iguals.some(g=>g.includes(mot)&&g.includes(altra));
      const errors=barreja([...new Set(data.filter(x=>x[0]!==mot && x[1]!==def && !massaSemblant(x[0])).map(x=>x[1]))]).slice(0,2);
      return {tipus:'test',fase:'TEST',enunciat:'Què vol dir «'+mot+'»?',opcions:barreja([def,...errors]),correcta:def};
   });
   const escriu=barreja(data).slice(0,mode==='lexic'?15:10).map(([mot,def])=>({
      tipus:'escriure',fase:'ESCRIURE',enunciat:'Quina paraula o expressió correspon a la definició?\n'+def,correcta:mot
   }));
   if(mode==='lexic'){
     // Frases i col·locacions d'exercicis dels apunts; només s'usen respostes documentades.
     const buits=[
       ['El petard ha ___.','esclatat'],['El mirall s\'ha ___.','entelat'],
       ['La primera edició del llibre ja s\'ha ___.','exhaurit'],['La barana de ferro s\'ha ___.','rovellat'],
       ['Han acabat l\'edifici i han ___ la grua.','desmuntat'],
       ['___ una paret perquè no caigui.','apuntalar'],
       ['___ una notícia.','escampar'],['___ un amic.','aconsellar'],
       ['___ en un projecte complicat.','embrancar-se'],
       ['___ un full per fer un avió de paper.','doblegar'],
       ['___ les maletes per tot l\'aeroport.','traginar'],
       ['___ el vi en una copa.','abocar'],
       ['___ el pernil amb un ganivet.','tallar'],
       ['___ un cinturó.','estrènyer'],['___ un vis.','cargolar'],
       ['___ el so d\'un aparell.','apujar'],
       ['___ una autopista a tres carrils.','eixamplar'],
       ['___ un llibre per protegir-lo.','folrar'],
       ['___ la roba al calaix de qualsevol manera.','entaforar'],
       ['___ una ampolla abans de llençar-la al contenidor.','buidar']
     ];
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
   const parelles=barreja(CATANYOL);
   const frases=[];
   for(let i=0;i<parelles.length;i+=2){
     const p=parelles.slice(i,i+2);
     frases.push({tipus:'text',fase:'DETECTAR I CORREGIR',enunciat:'Detecta les construccions inadequades i reescriu TOT el text en català correcte. Separa les frases amb un salt de línia.\n\n'+p.map(x=>x[0]).join('\n'),correcta:p.map(x=>x[1]).join('\n'),respostes:p.map(x=>x[1])});
   }
   return frases;
 }
 throw Error('Modalitat desconeguda.');
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
  const read=async (table,rowId)=>tables.getRow({databaseId:DB,tableId:table,rowId});
  const write=async (table,rowId,data)=>tables.updateRow({databaseId:DB,tableId:table,rowId,data});
  const inicial=()=>({nom:String(me.name||'Jugador').slice(0,80),punts:0,partides:0,encerts:0,errors:0});
  const perfil=async()=>{
    try{return await read(PERFILS,userId);}
    catch(e){if(e.code!==404)throw e;try{return await tables.createRow({databaseId:DB,tableId:PERFILS,rowId:userId,data:inicial()});}catch(x){if(x.code===409)return read(PERFILS,userId);throw x;}}
  };
  if(action==='me'){
    const p=await perfil();
    return res.json({nom:p.nom,punts:p.punts,partides:p.partides,encerts:p.encerts,errors:p.errors,dominat:p.punts>=10000});
  }
  if(action==='ranking'){
    const r=await tables.listRows({databaseId:DB,tableId:PERFILS,queries:[Query.orderDesc('punts'),Query.limit(100)]});
    return res.json({ranking:(r.rows||r.documents||[]).map((x,i)=>({posicio:i+1,nom:x.nom,punts:x.punts,partides:x.partides}))});
  }
  if(action==='history'){
    const all=await tables.listRows({databaseId:DB,tableId:PARTIDES,queries:[Query.equal('usuari',userId),Query.equal('acabat',true),Query.orderDesc('$createdAt'),Query.limit(15)]});
    const partides=(all.rows||all.documents||[]).map(x=>{
      let quantitat=0;
      try{quantitat=JSON.parse(x.preguntes).length;}catch{}
      return {mode:x.mode,nota:quantitat?Math.round(10*x.encerts/quantitat*10)/10:0,punts:x.guany,encerts:x.encerts,errors:x.errors,data:x.$createdAt};
    });
    return res.json({partides});
  }
  if(action==='start'){
    if(!['lexic','dites','catanyol'].includes(body.mode))return res.json({error:'Modalitat incorrecta.'},400);
    await perfil();
    const preguntes=fabrica(body.mode);
    const run=await tables.createRow({databaseId:DB,tableId:PARTIDES,rowId:ID.unique(),data:{usuari:userId,mode:body.mode,preguntes:JSON.stringify(preguntes),posicio:0,guany:0,encerts:0,errors:0,acabat:false}});
    return res.json({partida:run.$id,mode:body.mode,pregunta:pregVisible(preguntes[0],0,preguntes.length),puntuacio:0});
  }
  if(action==='resume'){
    const all=await tables.listRows({databaseId:DB,tableId:PARTIDES,queries:[Query.equal('usuari',userId),Query.equal('acabat',false),Query.orderDesc('$createdAt'),Query.limit(5)]});
    const run=(all.rows||all.documents||[]).find(x=>!body.mode||x.mode===body.mode);
    if(!run)return res.json({partida:null});
    const qs=JSON.parse(run.preguntes);
    return res.json({partida:run.$id,mode:run.mode,pregunta:pregVisible(qs[run.posicio],run.posicio,qs.length),puntuacio:run.guany});
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
    const final=pos+1===qs.length;
    await write(PARTIDES,run.$id,{posicio:pos+1,guany,encerts:correctes,errors:fallades,acabat:final});
    if(final){
      const p=await perfil();
      const np=await write(PERFILS,userId,{nom:p.nom,punts:p.punts+guany,partides:p.partides+1,encerts:p.encerts+correctes,errors:p.errors+fallades});
      return res.json({correcte:ok,solucio:q.correcta||q.respostes?.join('\n'),puntuacio:guany,final:true,resultat:{nota:Math.round(correctes/qs.length*100)/10,encerts:correctes,errors:fallades,punts:guany,total:np.punts,dominat:np.punts>=10000}});
    }
    return res.json({correcte:ok,solucio:q.correcta,puntuacio:guany,final:false,pregunta:pregVisible(qs[pos+1],pos+1,qs.length)});
  }
  return res.json({error:'Acció desconeguda.'},400);
 }catch(e){
  error(e?.stack||String(e));
  return res.json({error:e?.code===404?'Partida o registre no trobat.':'No s\'ha pogut completar l\'operació. Torna-ho a provar.'},e?.code===404?404:500);
 }
};