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
  function errorMessage(e){
    if(e?.code===429)return 'Massa intents. Espera uns minuts abans de tornar-ho a provar.';
    if(e?.type==='user_invalid_credentials')return 'Correu o contrasenya incorrectes.';
    if(e?.type==='user_already_exists')return 'Aquest correu ja té un compte. Prem Iniciar sessió.';
    if(e?.type==='user_invalid_token')return 'Codi incorrecte o caducat. Revisa el correu o demana un altre codi.';
    return e?.message||String(e||'Hi ha hagut un error.');
  }
  function msg(text,bad=false){const box=document.querySelector('#feedback');if(box){box.textContent=text;box.className='message'+(bad?' error':' ok');box.hidden=false;}}
  // L'estat d'autenticació és sempre el d'Appwrite, no un indicador desat localment.
  const needsMfa = e => e?.type === 'user_more_factors_required' || e?.code === 401 && String(e?.message||'').toLowerCase().includes('more factors');
  const alreadyActive = e => e?.type === 'user_session_already_exists' || e?.code === 401 && String(e?.message||'').toLowerCase().includes('session already active');


  const cache={
    get(k){try{return JSON.parse(localStorage.getItem('lexic4:'+k)||'null')}catch{return null}},
    set(k,v){try{localStorage.setItem('lexic4:'+k,JSON.stringify(v))}catch{}},
    remove(k){try{localStorage.removeItem('lexic4:'+k)}catch{}}
  };
  const draftKey=()=> 'draft:'+state.user?.$id+':'+state.run;
  function saveChallenge(){
    try{sessionStorage.setItem('lexic4:challenge',JSON.stringify({mode:state.authMode,id:state.challengeId,userId:state.tokenUserId,email:state.email,created:Date.now()}))}catch{}
  }
  function clearChallenge(){try{sessionStorage.removeItem('lexic4:challenge')}catch{}}
  async function enterHome(){
    clearChallenge();cache.set('device',{email:state.user.email,lastUsed:Date.now()});
    state.authMode=null;await home();
  }
  async function openRun(mode){
    let r=await api({action:'resume',mode});
    if(!r.partida)r=await api({action:'start',mode});
    state.mode=r.mode||mode;state.run=r.partida;state.question=r.pregunta;
    state.points=r.puntuacio;state.answerReply=null;renderQuestion();
  }
  function activateSession(){
    sess.innerHTML=state.user?'<span>'+escapeHTML(state.user.name||'Jugador')+'</span><button class="btn small" id="logout">Sortir</button>':'';
    document.getElementById('logout')?.addEventListener('click',async()=>{
      if(state.busy)return;
      state.busy=true;
      let saveError='';
      try {
        // Un error desant una partida no ha de deixar bloquejat el botó de sortir.
        // Submitted answers are already saved; keep the run resumable on logout.
        try{await account.deleteSession({sessionId:'current'});}catch(e){if(e.code!==401)throw e;}
        clearChallenge();
        state.user=null;state.run=null;state.question=null;state.answerReply=null;
        state.authMode=null;state.challengeId='';state.tokenUserId='';
        state.tab='login';
        renderAuth();
        if(saveError)msg(saveError,true);
      }catch(e){msg('No s\'ha pogut tancar la sessió: '+(e?.message||'Error'),true);}
      finally{state.busy=false;}
    });
  }
  async function api(body){
    const r=await functions.createExecution({functionId:'motor',body:JSON.stringify(body),async:false,method:'POST'});
    if(r.status==='failed')throw Error('La funció del servidor ha fallat.');
    let data={};try{data=JSON.parse(r.responseBody||'{}')}catch{throw Error('Resposta no vàlida del servidor.')}
    if(data.error||r.responseStatusCode>=400)throw Object.assign(Error(data.error||'Error del servidor.'),{code:r.responseStatusCode});
    if(!r.responseBody)throw Error('El servidor no ha retornat dades. Torna-ho a provar.');
    return data;
  }
  async function enviaCodiMfa(){
    const challenge=await account.createMfaChallenge({factor:'email'});
    state.authMode='mfa';
    state.challengeId=challenge.$id;
    saveChallenge();renderOTP();
  }
  async function completarInici(){
    try{
      const user=await account.get();
      state.email=user.email;
      if(!user.emailVerification){
        // El primer accés es verifica amb un codi, sense destruir la sessió de contrasenya.
        const token=await account.createEmailVerificationOTP();
        state.tokenUserId=token.userId;
        state.authMode='verify-email';
        saveChallenge();renderOTP();
        return;
      }
      if(!user.mfa){
        // MFA real: email + contrasenya; no creem ni esborrem sessions artificiosament.
        await account.updateMFA({mfa:true});
        await enviaCodiMfa();
        return;
      }
      state.user=user;
      state.authMode=null;
      await enterHome();
    }catch(e){
      if(needsMfa(e)){await enviaCodiMfa();return;}
      throw e;
    }
  }
  async function iniciarAmbContrasenya(email,password){
    state.email=email;
    try{
      await account.createEmailPasswordSession({email,password});
    }catch(e){
      if(alreadyActive(e)){
        // Una pestanya antiga pot conservar una sessió (inclosa MFA pendent).
        try {
          const user=await account.get();
          if(user.email.toLowerCase()!==email.toLowerCase()){
            await account.deleteSession({sessionId:'current'});
            await account.createEmailPasswordSession({email,password});
          }
        }catch(inner) {
          if(needsMfa(inner)){await enviaCodiMfa();return;}
          throw e;
        }
      }else{
        // Alguns projectes poden exigir MFA immediatament després d'enviar la contrasenya.
        if(needsMfa(e)){await enviaCodiMfa();return;}
        throw e;
      }
    }
    await completarInici();
  }
  function renderAuth(){
    activateSession();if(state.user)return home();
    const registration=state.tab==='register';
    show('<div class="panel narrow"><div class="eyebrow">Benvingut al teu entrenament</div><h1>Aprèn català. Suma punts.</h1><p class="sub">Entra amb el teu compte per conservar la teva puntuació i competir al rànquing.</p><div class="tabs"><button id="toLogin" class="'+(!registration?'active':'')+'">Iniciar sessió</button><button id="toRegister" class="'+(registration?'active':'')+'">Registrar-se</button></div><form id="authForm" class="stack">'+(registration?'<label>Nom per al rànquing<input name="name" maxlength="60" required autocomplete="nickname" placeholder="El teu nom de jugador"></label>':'')+'<label>Correu electrònic<input name="email" type="email" required autocomplete="email" placeholder="correu@exemple.cat"></label><label>Contrasenya<input name="password" type="password" required minlength="8" autocomplete="'+(registration?'new-password':'current-password')+'" placeholder="8 caràcters com a mínim"></label><button id="submitAuth" class="btn primary full" type="submit">'+(registration?'Crear el meu compte':'Continuar')+'</button><div id="feedback" hidden></div><p class="hint">'+(registration?'Després del registre, inicia sessió. El primer codi confirmarà el teu correu.':'El codi per correu es verifica dins la sessió, sense eliminar-la. Aquest dispositiu conservarà la sessió fins que premis «Sortir».')+'</p></form></div>');
    document.querySelector('[name=email]').value=state.email||cache.get('device')?.email||'';
    document.getElementById('toLogin').onclick=()=>{state.tab='login';renderAuth()};
    document.getElementById('toRegister').onclick=()=>{state.tab='register';renderAuth()};
    document.getElementById('authForm').onsubmit=async(e)=>{
      e.preventDefault();if(state.busy)return;
      state.busy=true;
      const button=document.getElementById('submitAuth');
      button.disabled=true;
      const formData=new FormData(e.currentTarget);
      const email=String(formData.get('email')).trim().toLowerCase(),password=String(formData.get('password'));
      try{
        if(registration){
          const name=String(formData.get('name')||'').trim();
          if(name.length<2)throw Error('Escriu un nom de com a mínim 2 caràcters.');
          await account.create({userId:ID.unique(),email,password,name});
          state.tab='login';
          renderAuth();
          msg('Compte creat. Inicia sessió amb la mateixa contrasenya.',false);
        }else{
          await iniciarAmbContrasenya(email,password);
        }
      }catch(err){
        msg(errorMessage(err),true);
        if(button.isConnected)button.disabled=false;
      }finally{state.busy=false;}
    };
  }
  function renderOTP(){
    const isVerify=state.authMode==='verify-email';
    show('<div class="panel narrow"><div class="eyebrow">'+(isVerify?'Verificació del correu':'Segon factor de seguretat')+'</div><h1>Revisa el correu</h1><p>Hem enviat un codi a <strong>'+escapeHTML(state.email||'el teu correu')+'</strong>.</p><form id="codeForm" class="stack"><label>Codi de sis xifres<input name="otp" type="text" inputmode="numeric" pattern="[0-9]{6}" required autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="btn primary full" id="codeButton">Verificar i entrar</button><div id="feedback" hidden></div></form><div class="stack" style="margin-top:18px"><button class="btn secondary full" id="resendCode" type="button">Reenviar el codi</button><button class="btn link" id="backLogin" type="button">Tornar a iniciar sessió</button><p class="hint">No comparteixis el codi amb ningú. La sessió quedarà recordada fins que tanquis sessió expressament.</p></div></div>');
    document.getElementById('codeForm').onsubmit=async(e)=>{
      e.preventDefault();if(state.busy)return;state.busy=true;
      const btn=document.getElementById('codeButton');btn.disabled=true;
      try{
        const otp=String(new FormData(e.currentTarget).get('otp')).trim();
        if(state.authMode==='mfa'){
          await account.updateMfaChallenge({challengeId:state.challengeId,otp});
          state.user=await account.get();state.authMode=null;
          await enterHome();
        }else if(state.authMode==='verify-email'){
          await account.updateEmailVerificationOTP({userId:state.tokenUserId,secret:otp});
          await completarInici();
        }else throw Error('La verificació ha caducat. Torna a iniciar sessió.');
      }catch(err){msg(errorMessage(err),true);if(btn.isConnected)btn.disabled=false;}
      finally{state.busy=false;}
    };
    document.getElementById('resendCode').onclick=async()=>{
      if(state.busy)return;state.busy=true;
      const btn=document.getElementById('resendCode');btn.disabled=true;
      try {
        if(state.authMode==='mfa')await enviaCodiMfa();
        else if(state.authMode==='verify-email'){
          const token=await account.createEmailVerificationOTP();
          state.tokenUserId=token.userId;saveChallenge();renderOTP();
        }
        msg('T\'hem enviat un altre codi al correu.');
      }catch(err){msg(errorMessage(err),true);if(btn.isConnected)btn.disabled=false;}
      finally{state.busy=false;}
    };
    document.getElementById('backLogin').onclick=async()=>{
      if(state.busy)return;state.busy=true;
      try{await account.deleteSession({sessionId:'current'});}catch(e){/* sessió parcial o ja caducada */}
      clearChallenge();state.authMode=null;state.challengeId='';state.tokenUserId='';state.user=null;
      state.tab='login';state.busy=false;renderAuth();
    };
  }
  async function home(){
    activateSession();show('<div class="panel"><div class="eyebrow">Tauler personal</div><h1>Hola, '+escapeHTML(state.user?.name||'jugador')+'</h1><p class="sub">Aprèn les paraules dels apunts i puja posicions al rànquing.</p><div id="stats" class="score-row"><div class="scorebox"><strong>...</strong><small>Els teus punts</small></div></div><div class="stack"><button class="btn primary full" id="practice">PRACTICAR</button><button class="btn secondary full" id="ranking">RÀNQUING</button></div><p class="hint" style="margin-top:22px">+10 punts per resposta correcta · −5 punts per error · 10.000 punts: EXAMEN DOMINADO</p><div id="feedback" hidden></div></div>');
    document.getElementById('practice').onclick=pickMode;
    document.getElementById('ranking').onclick=ranking;
    try{
      const p=await api({action:'me'});
      if(!document.getElementById('stats'))return;
      document.getElementById('stats').innerHTML='<div class="scorebox"><strong>'+p.punts+'</strong><small>Punts acumulats</small></div><div class="scorebox"><strong>'+p.partides+'</strong><small>Partides</small></div><div class="scorebox"><strong>'+p.encerts+'</strong><small>Encerts</small></div>';
      if(p.dominat){document.getElementById('stats').insertAdjacentHTML('beforebegin','<div class="banner">EXAMEN DOMINADO</div>');}
    }catch(err){msg(errorMessage(err),true);}
  }
  function pickMode(){
    show('<div class="panel"><div class="eyebrow">Pràctica</div><h1>Què vols estudiar?</h1><p class="sub">Si tens una partida pendent, es reprendrà automàticament. Cada resposta enviada queda desada.</p><div class="grid2"><section class="mode"><h3>LÈXIC</h3><p>Significats de totes les paraules dels lèxics 37–40, preguntes tipus test, escriptura i buits.</p><button class="btn primary" data-mode="lexic">JUGAR</button></section><section class="mode"><h3>DITES</h3><p>Significats, expressions equivalents i correcció de dites utilitzades amb un sentit inadequat.</p><button class="btn primary" data-mode="dites">JUGAR</button></section><section class="mode"><h3>CATANYOL</h3><p>Textos formats amb exemples dels apunts. Detecta i corregeix les construccions inadequades.</p><button class="btn primary" data-mode="catanyol">JUGAR</button></section><section class="mode"><h3>PUNTUACIÓ</h3><p>+10 encert · −5 error. La puntuació de la partida es desa al final.</p></section></div><div id="feedback" hidden></div><p style="margin-top:24px"><button class="btn" id="backHome">← Tornar</button></p></div>');
    document.getElementById('backHome').onclick=home;
    document.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=async()=>{if(state.busy)return;state.busy=true;btn.disabled=true;try{await openRun(btn.dataset.mode);}catch(err){msg(errorMessage(err),true);btn.disabled=false;}finally{state.busy=false;}});
  }
  function renderQuestion(){
    const q=state.question;if(!q)return home();
    const pct=Math.round((q.index-1)/q.total*100);
    const canTest=q.tipus==='test';
    show('<div class="panel"><div class="bar"><div class="eyebrow">'+escapeHTML(label(state.mode))+' · '+escapeHTML(q.fase)+'</div><strong>'+q.index+' / '+q.total+'</strong></div><div class="progress"><div style="width:'+pct+'%"></div></div><div class="bar"><span class="muted">Punts d\'aquesta partida</span><strong>'+state.points+'</strong></div><div class="question">'+escapeHTML(q.enunciat)+'</div><form id="answerForm" class="stack large-gap">'+(canTest?'<div class="stack">'+q.opcions.map((x,i)=>'<label class="option"><input type="radio" name="answer" value="'+escapeHTML(x)+'" required><span>'+escapeHTML(x)+'</span></label>').join('')+'</div>':q.tipus==='text'?'<label>Text corregit (una frase per línia)<textarea name="answer" required spellcheck="true" placeholder="Reescriu aquí tot el text corregit..."></textarea></label>':'<label>Escriu la resposta<input name="answer" required autocomplete="off" spellcheck="true" placeholder="La teva resposta"></label>')+'<button class="btn primary full" type="submit" id="answerButton">Comprovar resposta</button><div id="feedback" hidden></div></form><p class="hint" style="margin-top:24px">No pots avançar fins que hagis enviat una resposta.</p><button type="button" class="btn secondary full" id="leaveGame" style="margin-top:12px">SORTIR I DESAR PUNTS</button></div>');

    const form=document.getElementById('answerForm'),saved=cache.get(draftKey());
    if(saved?.index===q.index){
      if(canTest)form.querySelectorAll('[name=answer]').forEach(i=>{i.checked=i.value===saved.value});
      else form.elements.answer.value=String(saved.value||'');
    }
    form.addEventListener('input',()=>cache.set(draftKey(),{index:q.index,value:String(new FormData(form).get('answer')||'')}));
    const pause=document.createElement('button');pause.type='button';pause.className='btn full';
    pause.textContent='PAUSAR I CONTINUAR MÉS TARD';
    pause.onclick=()=>{if(state.busy)return;state.run=null;state.question=null;state.answerReply=null;home();};
    document.getElementById('leaveGame').before(pause);
    document.getElementById('leaveGame').onclick=sortirIGuardar;
    document.getElementById('answerForm').onsubmit=async(e)=>{
      e.preventDefault();if(state.busy)return;
      const inp=String(new FormData(e.currentTarget).get('answer')||'').trim();if(!inp){msg('Introdueix una resposta.',true);return}
      state.busy=true;document.getElementById('answerButton').disabled=true;
      try{
        const reply=await api({action:'answer',partida:state.run,index:q.index,resposta:inp});
        cache.remove(draftKey());state.points=reply.puntuacio;state.answerReply=reply;renderFeedback(reply);
      }catch(err){
        try{
          const current=await api({action:'resume',mode:state.mode});
          if(current.partida===state.run&&current.pregunta?.index>q.index){
            cache.remove(draftKey());state.question=current.pregunta;state.points=current.puntuacio;renderQuestion();
            msg('La resposta ja estava desada. Hem recuperat la pregunta actual.');return;
          }
          if(!current.partida){state.run=null;await home();msg('La partida ja està desada.');return;}
        }catch{}
        msg(errorMessage(err),true);const button=document.getElementById('answerButton');if(button)button.disabled=false;
      }
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
      cache.remove(draftKey());state.run=null;state.question=null;state.answerReply=null;
      await home();
      const result=resposta.resultat;
      msg('Partida guardada! '+(result.punts>=0?'+':'')+result.punts+' punts. Ara tens '+result.total+' punts acumulats.',false);
    }catch(e){
      msg('Error en desar els punts: '+errorMessage(e),true);
      if(button){button.disabled=false;button.textContent='SORTIR I DESAR PUNTS';}
    }finally{state.busy=false;}
  }
  function renderFinish(result){
    const good=result.encerts,bad=result.errors;
    show('<div class="panel narrow center"><div class="eyebrow">Partida completada · '+escapeHTML(label(state.mode))+'</div>'+(result.dominat?'<div class="banner">EXAMEN DOMINADO</div>':'')+'<h1>Resultats de la partida</h1><p class="sub">La nota i els punts s\'han desat al teu perfil.</p><div class="score-row" style="justify-content:center"><div class="scorebox"><strong>'+result.nota+' / 10</strong><small>Nota</small></div><div class="scorebox"><strong>'+result.punts+'</strong><small>Punts d\'aquesta partida</small></div><div class="scorebox"><strong>'+result.total+'</strong><small>Punts totals</small></div></div><div class="dues"><p><strong>'+good+'</strong> encerts · <strong>'+bad+'</strong> errors</p></div><div class="stack" style="margin-top:22px"><button class="btn primary full" id="again">Tornar a practicar</button><button class="btn secondary full" id="viewRanking">Veure el rànquing</button></div></div>');
    document.getElementById('again').onclick=pickMode;document.getElementById('viewRanking').onclick=ranking;
    cache.remove(draftKey());state.run=null;state.question=null;
  }
  async function ranking(){
    show('<div class="panel"><div class="eyebrow">Classificació pública</div><h1>Rànquing de jugadors</h1><p class="sub">Jugadors ordenats de més punts a menys punts.</p><div id="list"><p>Carregant puntuacions...</p></div><button class="btn" id="backHome">← Tornar</button><div id="feedback" hidden></div></div>');
    document.getElementById('backHome').onclick=home;
    try{
      const data=await api({action:'ranking'});
      if(!document.getElementById('list'))return;
      document.getElementById('list').innerHTML=data.ranking.length?'<table class="ranking"><thead><tr><th>Posició</th><th>Jugador</th><th>Punts</th></tr></thead><tbody>'+data.ranking.map((p,i)=>'<tr'+(p.nom===state.user?.name?' class="me"':'')+'><td>'+(i+1)+'</td><td>'+escapeHTML(p.nom)+'</td><td><strong>'+p.punts+'</strong></td></tr>').join('')+'</tbody></table>':'<p>Encara no hi ha jugadors al rànquing. Comença la primera partida!</p>';
    }catch(e){msg(errorMessage(e),true);const list=document.getElementById('list');if(list)list.innerHTML='';}
  }
  async function bootstrap(){
    try{
      let pending;try{pending=JSON.parse(sessionStorage.getItem('lexic4:challenge')||'null')}catch{}
      if(pending&&Date.now()-pending.created<14*60*1000){
        state.email=pending.email;state.authMode=pending.mode;state.challengeId=pending.id;state.tokenUserId=pending.userId;
        renderOTP();return;
      }
      clearChallenge();await completarInici();
    }catch(e){
      state.user=null;renderAuth();
      if(e.code!==401)msg('No hem pogut recuperar la sessió. '+(e.message||'Comprova la connexió.'),true);
    }
  }
  window.addEventListener('online',()=>msg('Connexió recuperada. Ja pots continuar.'));
  window.addEventListener('offline',()=>msg('Sense connexió. La resposta escrita queda en aquest dispositiu; envia-la quan torni Internet.',true));
  bootstrap();
})();