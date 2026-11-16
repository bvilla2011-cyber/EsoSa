// Joc interactiu de català — interfície sense animacions.
(() => {
  'use strict';
  const {Client,Account,Functions,ID}=window.Appwrite||{};
  const el=document.getElementById('app'),sess=document.getElementById('session');
  if(!Client){el.innerHTML='<div class="panel"><h2>No s\'ha pogut carregar el joc.</h2><p>Comprova la connexió a Internet i torna a carregar la pàgina.</p></div>';return;}
  const sdk=new Client().setEndpoint('https://fra.cloud.appwrite.io/v1').setProject('lexico-4t-joc');
  const account=new Account(sdk),functions=new Functions(sdk);
  const state={user:null,tab:'login',email:'',tokenUserId:'',run:null,question:null,answerReply:null,points:0,mode:'',busy:false};
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=mode=>({lexic:'Lèxic',dites:'Dites',catanyol:'Catanyol'})[mode]||'Practicar';
  function show(html){el.innerHTML=html;}
  function errorMessage(e){return escapeHTML(e?.message||String(e||'Hi ha hagut un error.'))}
  function msg(text,bad=false){const box=document.querySelector('#feedback');if(box){box.textContent=text;box.className='message'+(bad?' error':' ok');box.hidden=false;}}
  function activateSession(){
    sess.innerHTML=state.user?'<span>'+escapeHTML(state.user.name||'Jugador')+'</span><button class="btn small" id="logout">Sortir</button>':'';
    document.getElementById('logout')?.addEventListener('click',async()=>{
      if(state.busy)return;
      state.busy=true;
      try{
        if(state.run) await api({action:'leave',partida:state.run});
        await account.deleteSession({sessionId:'current'});
        state.user=null;state.run=null;state.question=null;renderAuth();
      }catch(e){msg('No s\\'ha pogut desar i sortir: '+errorMessage(e),true);}
      finally{state.busy=false;}
    });
  }
  async function api(body){
    const r=await functions.createExecution({functionId:'motor',body:JSON.stringify(body),async:false,method:'POST'});
    if(r.status==='failed')throw Error('La funció del servidor ha fallat.');
    let data={};try{data=JSON.parse(r.responseBody||'{}')}catch{throw Error('Resposta no vàlida del servidor.')}
    if(data.error)throw Error(data.error);
    return data;
  }
  function renderAuth(){
    activateSession();if(state.user)return home();
    const registration=state.tab==='register';
    show('<div class="panel narrow"><div class="eyebrow">Benvingut al teu entrenament</div><h1>Aprèn català. Suma punts.</h1><p class="sub">Entra amb el teu compte per conservar la teva puntuació i competir al rànquing.</p><div class="tabs"><button id="toLogin" class="'+(!registration?'active':'')+'">Iniciar sessió</button><button id="toRegister" class="'+(registration?'active':'')+'">Registrar-se</button></div><form id="authForm" class="stack">'+(registration?'<label>Nom per al rànquing<input name="name" maxlength="60" required autocomplete="nickname" placeholder="El teu nom de jugador"></label>':'')+'<label>Correu electrònic<input name="email" type="email" required autocomplete="email" placeholder="correu@exemple.cat"></label><label>Contrasenya<input name="password" type="password" required minlength="8" autocomplete="'+(registration?'new-password':'current-password')+'" placeholder="8 caràcters com a mínim"></label><button id="submitAuth" class="btn primary full" type="submit">'+(registration?'Crear el meu compte':'Continuar')+'</button><div id="feedback" hidden></div><p class="hint">'+(registration?'Després del registre, inicia sessió. El codi per correu es demana en entrar.':'Quan introdueixis una contrasenya correcta, t\'enviarem un codi al correu. El navegador conservarà la sessió després de verificar-la.')+'</p></form></div>');
    document.getElementById('toLogin').onclick=()=>{state.tab='login';renderAuth()};
    document.getElementById('toRegister').onclick=()=>{state.tab='register';renderAuth()};
    document.getElementById('authForm').onsubmit=async(e)=>{
      e.preventDefault();if(state.busy)return;state.busy=true;const button=document.getElementById('submitAuth');button.disabled=true;
      const data=new FormData(e.currentTarget),email=String(data.get('email')).trim(),password=String(data.get('password'));
      try{
        if(registration){
          const name=String(data.get('name')||'').trim();
          if(name.length<2)throw Error('Escriu un nom de com a mínim 2 caràcters.');
          await account.create({userId:ID.unique(),email,password,name});
          state.tab='login';renderAuth();msg('Compte creat. Inicia sessió per rebre el codi al correu.');
        }else{
          await account.createEmailPasswordSession({email,password});
          // Després de validar la contrasenya, no donem accés fins a verificar el codi.
          await account.deleteSession({sessionId:'current'});
          const token=await account.createEmailToken({userId:ID.unique(),email});
          state.email=email;state.tokenUserId=token.userId;renderOTP();
        }
      }catch(err){msg(errorMessage(err),true);button.disabled=false;}
      finally{state.busy=false;}
    };
  }
  function renderOTP(){
    show('<div class="panel narrow"><div class="eyebrow">Verificació d\'inici de sessió</div><h1>Revisa el correu</h1><p>Hem enviat un codi d\'un sol ús a <strong>'+escapeHTML(state.email)+'</strong>.</p><form id="codeForm" class="stack"><label>Codi de verificació<input name="otp" required autocomplete="one-time-code" inputmode="numeric" maxlength="16" placeholder="Introdueix el codi"></label><button class="btn primary full" id="codeButton">Verificar i entrar</button><div id="feedback" hidden></div></form><p class="hint">El dispositiu conservarà la sessió mentre sigui vàlida. No comparteixis mai el codi.</p><button class="btn link" id="backLogin">Tornar a l\'inici</button></div>');
    document.getElementById('backLogin').onclick=renderAuth;
    document.getElementById('codeForm').onsubmit=async(e)=>{
      e.preventDefault();const btn=document.getElementById('codeButton');btn.disabled=true;
      try{
        await account.createSession({userId:state.tokenUserId,secret:String(new FormData(e.currentTarget).get('otp')).trim()});
        state.user=await account.get();activateSession();await home();
      }catch(err){msg(errorMessage(err),true);btn.disabled=false;}
    };
  }
  async function home(){
    activateSession();show('<div class="panel"><div class="eyebrow">Tauler personal</div><h1>Hola, '+escapeHTML(state.user?.name||'jugador')+'</h1><p class="sub">Aprèn les paraules dels apunts i puja posicions al rànquing.</p><div id="stats" class="score-row"><div class="scorebox"><strong>...</strong><small>Els teus punts</small></div></div><div class="stack"><button class="btn primary full" id="practice">PRACTICAR</button><button class="btn secondary full" id="ranking">RÀNQUING</button></div><p class="hint" style="margin-top:22px">+10 punts per resposta correcta · −5 punts per error · 10.000 punts: EXAMEN DOMINADO</p><div id="feedback" hidden></div></div>');
    document.getElementById('practice').onclick=pickMode;
    document.getElementById('ranking').onclick=ranking;
    try{
      const p=await api({action:'me'});
      document.getElementById('stats').innerHTML='<div class="scorebox"><strong>'+p.punts+'</strong><small>Punts acumulats</small></div><div class="scorebox"><strong>'+p.partides+'</strong><small>Partides</small></div><div class="scorebox"><strong>'+p.encerts+'</strong><small>Encerts</small></div>';
      if(p.dominat){document.getElementById('stats').insertAdjacentHTML('beforebegin','<div class="banner">EXAMEN DOMINADO</div>');}
    }catch(err){msg(errorMessage(err),true);}
  }
  function pickMode(){
    show('<div class="panel"><div class="eyebrow">Pràctica</div><h1>Què vols estudiar?</h1><p class="sub">Les preguntes canvien d\'ordre en cada partida. No pots passar de pregunta sense respondre-la.</p><div class="grid2"><section class="mode"><h3>LÈXIC</h3><p>Significats de totes les paraules dels lèxics 37–40, preguntes tipus test, escriptura i buits.</p><button class="btn primary" data-mode="lexic">JUGAR</button></section><section class="mode"><h3>DITES</h3><p>Significats, expressions equivalents i correcció de dites utilitzades amb un sentit inadequat.</p><button class="btn primary" data-mode="dites">JUGAR</button></section><section class="mode"><h3>CATANYOL</h3><p>Textos formats amb exemples dels apunts. Detecta i corregeix les construccions inadequades.</p><button class="btn primary" data-mode="catanyol">JUGAR</button></section><section class="mode"><h3>PUNTUACIÓ</h3><p>+10 encert · −5 error. La puntuació de la partida es desa al final.</p></section></div><div id="feedback" hidden></div><p style="margin-top:24px"><button class="btn" id="backHome">← Tornar</button></p></div>');
    document.getElementById('backHome').onclick=home;
    document.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=async()=>{if(state.busy)return;state.busy=true;btn.disabled=true;try{const r=await api({action:'start',mode:btn.dataset.mode});state.mode=btn.dataset.mode;state.run=r.partida;state.question=r.pregunta;state.points=r.puntuacio;state.answerReply=null;renderQuestion();}catch(err){msg(errorMessage(err),true);btn.disabled=false;}finally{state.busy=false;}});
  }
  function renderQuestion(){
    const q=state.question;if(!q)return home();
    const pct=Math.round((q.index-1)/q.total*100);
    const canTest=q.tipus==='test';
    show('<div class="panel"><div class="bar"><div class="eyebrow">'+escapeHTML(label(state.mode))+' · '+escapeHTML(q.fase)+'</div><strong>'+q.index+' / '+q.total+'</strong></div><div class="progress"><div style="width:'+pct+'%"></div></div><div class="bar"><span class="muted">Punts d\'aquesta partida</span><strong>'+state.points+'</strong></div><div class="question">'+escapeHTML(q.enunciat)+'</div><form id="answerForm" class="stack large-gap">'+(canTest?'<div class="stack">'+q.opcions.map((x,i)=>'<label class="option"><input type="radio" name="answer" value="'+escapeHTML(x)+'" required><span>'+escapeHTML(x)+'</span></label>').join('')+'</div>':q.tipus==='text'?'<label>Text corregit (una frase per línia)<textarea name="answer" required spellcheck="true" placeholder="Reescriu aquí tot el text corregit..."></textarea></label>':'<label>Escriu la resposta<input name="answer" required autocomplete="off" spellcheck="true" placeholder="La teva resposta"></label>')+'<button class="btn primary full" type="submit" id="answerButton">Comprovar resposta</button><div id="feedback" hidden></div></form><p class="hint" style="margin-top:24px">No pots avançar fins que hagis enviat una resposta.</p><button type="button" class="btn secondary full" id="leaveGame" style="margin-top:12px">SORTIR I DESAR PUNTS</button></div>');
    document.getElementById('leaveGame').onclick=sortirIGuardar;
    document.getElementById('answerForm').onsubmit=async(e)=>{
      e.preventDefault();if(state.busy)return;
      const inp=String(new FormData(e.currentTarget).get('answer')||'').trim();if(!inp){msg('Introdueix una resposta.',true);return}
      state.busy=true;document.getElementById('answerButton').disabled=true;
      try{
        const reply=await api({action:'answer',partida:state.run,index:q.index,resposta:inp});
        state.points=reply.puntuacio;state.answerReply=reply;renderFeedback(reply);
      }catch(err){msg(errorMessage(err),true);document.getElementById('answerButton').disabled=false;}
      finally{state.busy=false;}
    };
  }
  function renderFeedback(r){
    const form=document.getElementById('answerForm');if(!form)return;
    form.querySelectorAll('input,textarea,button').forEach(e=>e.disabled=true);
    const next=document.createElement('section');next.className='stack';
    const sol=String(r.solucio??'');
    next.innerHTML='<div class="result '+(r.correcte?'ok':'bad')+'"><strong>'+(r.correcte?'Resposta correcta: +10 punts':'Resposta incorrecta: −5 punts')+'</strong><div>'+escapeHTML(r.correcte?'Molt bé!':('Solució:\n'+sol)).replace(/\n/g,'<br>')+'</div></div><button class="btn primary full" id="nextQuestion">'+(r.final?'VEURE EL RESULTAT':'PREGUNTA SEGÜENT')+'</button>';
    form.insertAdjacentElement('afterend',next);
    if(r.final) document.getElementById('leaveGame')?.remove();
    document.getElementById('nextQuestion').onclick=()=>{if(r.final){renderFinish(r.resultat)}else{state.question=r.pregunta;state.answerReply=null;renderQuestion()}};
  }
  async function sortirIGuardar(){
    if(!state.run||state.busy)return;
    state.busy=true;
    const button=document.getElementById('leaveGame');
    if(button){button.disabled=true;button.textContent='DESANT ELS PUNTS...';}
    try{
      const resposta=await api({action:'leave',partida:state.run});
      state.run=null;state.question=null;state.answerReply=null;
      await home();
      const result=resposta.resultat;
      msg('Partida guardada! '+(result.punts>=0?'+':'')+result.punts+' punts. Ara tens '+result.total+' punts acumulats.',false);
    }catch(e){
      msg('No s\\'han pogut desar els punts: '+errorMessage(e),true);
      if(button){button.disabled=false;button.textContent='SORTIR I DESAR PUNTS';}
    }finally{state.busy=false;}
  }
  function renderFinish(result){
    const good=result.encerts,bad=result.errors;
    show('<div class="panel narrow center"><div class="eyebrow">Partida completada · '+escapeHTML(label(state.mode))+'</div>'+(result.dominat?'<div class="banner">EXAMEN DOMINADO</div>':'')+'<h1>Resultats de la partida</h1><p class="sub">La nota i els punts s\'han desat al teu perfil.</p><div class="score-row" style="justify-content:center"><div class="scorebox"><strong>'+result.nota+' / 10</strong><small>Nota</small></div><div class="scorebox"><strong>'+result.punts+'</strong><small>Punts d\'aquesta partida</small></div><div class="scorebox"><strong>'+result.total+'</strong><small>Punts totals</small></div></div><div class="dues"><p><strong>'+good+'</strong> encerts · <strong>'+bad+'</strong> errors</p></div><div class="stack" style="margin-top:22px"><button class="btn primary full" id="again">Tornar a practicar</button><button class="btn secondary full" id="viewRanking">Veure el rànquing</button></div></div>');
    document.getElementById('again').onclick=pickMode;document.getElementById('viewRanking').onclick=ranking;
    state.run=null;state.question=null;
  }
  async function ranking(){
    show('<div class="panel"><div class="eyebrow">Classificació pública</div><h1>Rànquing de jugadors</h1><p class="sub">Jugadors ordenats de més punts a menys punts.</p><div id="list"><p>Carregant puntuacions...</p></div><button class="btn" id="backHome">← Tornar</button><div id="feedback" hidden></div></div>');
    document.getElementById('backHome').onclick=home;
    try{
      const data=await api({action:'ranking'});
      document.getElementById('list').innerHTML=data.ranking.length?'<table class="ranking"><thead><tr><th>Posició</th><th>Jugador</th><th>Punts</th></tr></thead><tbody>'+data.ranking.map((p,i)=>'<tr'+(p.nom===state.user?.name?' class="me"':'')+'><td>'+(i+1)+'</td><td>'+escapeHTML(p.nom)+'</td><td><strong>'+p.punts+'</strong></td></tr>').join('')+'</tbody></table>':'<p>Encara no hi ha jugadors al rànquing. Comença la primera partida!</p>';
    }catch(e){msg(errorMessage(e),true);document.getElementById('list').innerHTML='';}
  }
  async function bootstrap(){
    try{state.user=await account.get();await home();}catch{renderAuth();}
  }
  bootstrap();
})();