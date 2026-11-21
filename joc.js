// Joc interactiu de català — interfície sense animacions.
(() => {
  'use strict';
  const {Client,Account,Functions,ID}=window.Appwrite||{};
  const el=document.getElementById('app'),sess=document.getElementById('session');
  if(!Client){el.innerHTML='<div class="panel"><h2>No s\'ha pogut carregar el joc.</h2><p>Comprova la connexió a Internet i torna a carregar la pàgina.</p></div>';return;}
  const sdk=new Client().setEndpoint('https://fra.cloud.appwrite.io/v1').setProject('lexico-4t-joc');
  const account=new Account(sdk),functions=new Functions(sdk);
  const state={user:null,tab:'login',email:'',tokenUserId:'',run:null,question:null,answerReply:null,points:0,mode:'',busy:false,pendingCourse:null};
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=mode=>({lexic:'Lèxic',dites:'Dites',catanyol:'Catanyol',mix:'MIX',infinite:'RECOMANACIÓ INFINITA'})[mode]||'Practicar';
  let viewVersion=0,autoTimers=[];
  function show(html){viewVersion++;autoTimers.forEach(clearTimeout);autoTimers=[];el.innerHTML=html;sendPresence();}
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
    clearChallenge();
    if(state.pendingCourse&&state.user?.email?.toLowerCase()===state.pendingCourse.email){await account.updatePrefs({course:state.pendingCourse.course,level:state.pendingCourse.level,classGroup:state.pendingCourse.classGroup});state.user=await account.get();state.pendingCourse=null;}
    const course=state.user?.prefs?.course;
    if(course&&course!=='4t ESO'){
      await account.deleteSession({sessionId:'current'}).catch(()=>{});state.user=null;
      show('<div class="panel narrow center"><div class="eyebrow">Accés restringit</div><h1>Aquest curs encara no està disponible</h1><p class="sub">EsoSa està preparat, de moment, per a alumnes de 4t d’ESO. No hem obert el teu compte ni modificat cap puntuació.</p><button class="btn primary" id="restrictedBack">Tornar a l’inici de sessió</button></div>');
      document.getElementById('restrictedBack').onclick=renderAuth;return;
    }
    if(!course||!state.user?.prefs?.level||!state.user?.prefs?.classGroup){renderOnboarding();return;}
    cache.set('device',{email:state.user.email,lastUsed:Date.now()});
    state.authMode=null;await home();
  }

  function renderOnboarding(){
    activateSession();
    show('<div class="panel narrow"><div class="eyebrow">Abans de començar</div><h1>Confirma les teves dades</h1><p class="sub">EsoSa està disponible ara mateix per a 4t d’ESO. Indica també el nivell de les assignatures flexibles i el teu grup classe.</p><form id="courseForm" class="stack"><label>Curs<select name="course" required><option value="">Tria el teu curs</option><option value="1r ESO">1r d’ESO</option><option value="2n ESO">2n d’ESO</option><option value="3r ESO">3r d’ESO</option><option value="4t ESO">4t d’ESO</option></select></label><label id="levelField" hidden>Nivell de mitjana a les assignatures flexibles<select name="level"><option value="">Tria el teu nivell</option><option>A</option><option>B</option><option>C1</option><option>C2</option></select></label><label id="classGroupField" hidden>Grup classe<select name="classGroup"><option value="">Tria el teu grup</option><option>A</option><option>B</option><option>C</option></select></label><button class="btn primary full" id="courseSubmit">Continuar</button><div id="feedback" hidden></div></form></div>');
    const courseSelect=document.querySelector('#courseForm [name=course]'),levelField=document.getElementById('levelField'),levelSelect=levelField.querySelector('select'),classGroupField=document.getElementById('classGroupField'),classGroupSelect=classGroupField.querySelector('select');
    courseSelect.onchange=()=>{levelField.hidden=courseSelect.value!=='4t ESO';levelSelect.required=!levelField.hidden;classGroupField.hidden=!levelField.hidden;classGroupSelect.required=!classGroupField.hidden;};
    document.getElementById('courseForm').onsubmit=async e=>{
      e.preventDefault();if(state.busy)return;state.busy=true;
      const button=document.getElementById('courseSubmit');button.disabled=true;
      const data=new FormData(e.currentTarget),course=String(data.get('course')),level=String(data.get('level')),classGroup=String(data.get('classGroup'));
      try{
        if(course!=='4t ESO')throw Error('De moment, EsoSa només deixa entrar alumnes de 4t d’ESO.');
        if(!['A','B','C1','C2'].includes(level))throw Error('Tria el teu nivell de mitjana.');
        if(!['A','B','C'].includes(classGroup))throw Error('Tria el teu grup classe.');
        await account.updatePrefs({course,level,classGroup});state.user=await account.get();await enterHome();
      }catch(err){msg(errorMessage(err),true);if(button.isConnected)button.disabled=false;}
      finally{state.busy=false;}
    };
  }
  async function openRun(mode){
    if(mode==='infinite')return startInfinite();
    let r=await api({action:'resume',mode});
    if(!r.partida)r=await api({action:'start',mode});
    state.mode=r.mode||mode;state.run=r.partida;state.question=r.pregunta;
    state.points=r.puntuacio;state.answerReply=null;renderQuestion();
  }

  const presenceTab=crypto.randomUUID();
  let presenceQueue=Promise.resolve(),lastPresence='',lastPresenceAt=0;
  function sendPresence(override){
    if(!state.user)return Promise.resolve();
    const status=override||(state.run&&state.question&&!state.answerReply?.final?'playing':'online');
    if(!override&&status===lastPresence&&Date.now()-lastPresenceAt<20000)return presenceQueue;
    lastPresence=status;lastPresenceAt=Date.now();
    presenceQueue=presenceQueue.catch(()=>{}).then(()=>api({action:'presence',tab:presenceTab,status})).catch(()=>{lastPresenceAt=0;});
    return presenceQueue;
  }
  function presenceDot(p){
    const status=p.presencia;
    if(status!=='online'&&status!=='playing')return '';
    const title=status==='playing'?'En partida':'Connectat';
    return '<span class="presence-dot '+status+'" role="img" aria-label="'+title+'" title="'+title+'"></span>';
  }
  setInterval(()=>{
    sendPresence();
    if(state.user&&document.getElementById('list'))ranking(true);
  },25000);
  window.addEventListener('pagehide',()=>{sendPresence('offline');});
  window.addEventListener('pageshow',()=>{lastPresenceAt=0;sendPresence();});
  function activateSession(){
    sess.innerHTML=state.user?'<span>'+escapeHTML(state.user.name||'Jugador')+'</span><button class="btn small" id="logout">Sortir</button>':'';
    document.getElementById('logout')?.addEventListener('click',async()=>{
      if(state.busy)return;
      state.busy=true;
      let saveError='';
      try {
        // Un error desant una partida no ha de deixar bloquejat el botó de sortir.
        // Submitted answers are already saved; keep the run resumable on logout.
        await sendPresence('offline');
        lastPresence='';lastPresenceAt=0;
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
    show('<div class="panel narrow"><div class="eyebrow">Benvingut a EsoSa</div><h1>Aprèn. Practica. Suma punts.</h1><p class="sub">Entra amb el teu compte per conservar la puntuació i competir al rànquing.</p><div class="tabs"><button id="toLogin" class="'+(!registration?'active':'')+'">Iniciar sessió</button><button id="toRegister" class="'+(registration?'active':'')+'">Registrar-se</button></div><form id="authForm" class="stack">'+(registration?'<label>Nom per al rànquing<input name="name" maxlength="60" required autocomplete="nickname" placeholder="El teu nom de jugador"></label><label>Curs<select name="course" required><option value="">Tria el teu curs</option><option value="1r ESO">1r d’ESO</option><option value="2n ESO">2n d’ESO</option><option value="3r ESO">3r d’ESO</option><option value="4t ESO">4t d’ESO</option></select></label><label id="registrationLevel" hidden>Nivell de mitjana a les assignatures flexibles<select name="level"><option value="">Tria el teu nivell</option><option>A</option><option>B</option><option>C1</option><option>C2</option></select></label><label id="registrationGroup" hidden>Grup classe<select name="classGroup"><option value="">Tria el teu grup</option><option>A</option><option>B</option><option>C</option></select></label>':'')+'<label>Correu electrònic<input name="email" type="email" required autocomplete="email" placeholder="correu@exemple.cat"></label><label>Contrasenya<input name="password" type="password" required minlength="8" autocomplete="'+(registration?'new-password':'current-password')+'" placeholder="8 caràcters com a mínim"></label><button id="submitAuth" class="btn primary full" type="submit">'+(registration?'Crear el meu compte':'Continuar')+'</button><div id="feedback" hidden></div><p class="hint">'+(registration?'Cal ser de 4t d’ESO per accedir-hi. El primer codi confirmarà el teu correu.':'En iniciar sessió, et demanarem el curs i el nivell si encara no els has indicat.')+'</p></form></div>');
    document.querySelector('[name=email]').value=state.email||cache.get('device')?.email||'';
    if(registration){const courseInput=document.querySelector('#authForm [name=course]'),levelLabel=document.getElementById('registrationLevel'),levelInput=levelLabel.querySelector('select'),groupLabel=document.getElementById('registrationGroup'),groupInput=groupLabel.querySelector('select');courseInput.onchange=()=>{levelLabel.hidden=courseInput.value!=='4t ESO';levelInput.required=!levelLabel.hidden;groupLabel.hidden=!levelLabel.hidden;groupInput.required=!groupLabel.hidden;};}
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
          const name=String(formData.get('name')||'').trim(),course=String(formData.get('course')||''),level=String(formData.get('level')||''),classGroup=String(formData.get('classGroup')||'');
          if(name.length<2)throw Error('Escriu un nom de com a mínim 2 caràcters.');
          if(course!=='4t ESO')throw Error('De moment, EsoSa només deixa entrar alumnes de 4t d’ESO.');
          if(!['A','B','C1','C2'].includes(level))throw Error('Tria el teu nivell de mitjana.');
          if(!['A','B','C'].includes(classGroup))throw Error('Tria el teu grup classe.');
          await account.create({userId:ID.unique(),email,password,name});
          state.pendingCourse={course,level,classGroup,email};
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

  async function loadPendingGames(version){
    const modes=['lexic','dites','catanyol','mix'];
    const results=await Promise.allSettled(modes.map(mode=>api({action:'resume',mode})));
    if(viewVersion!==version||!state.user)return;
    const box=document.getElementById('pendingGames');if(!box)return;
    box.innerHTML='';
    const pending=results.filter(r=>r.status==='fulfilled'&&r.value.partida&&r.value.pregunta).map(r=>r.value);
    if(pending.length){
      const heading=document.createElement('div');heading.className='eyebrow';heading.style.marginBottom='0';
      heading.textContent=pending.length===1?'Tens una partida pendent':'Les teves partides pendents';box.append(heading);
      for(const saved of pending){
        const button=document.createElement('button');button.type='button';button.className='btn secondary full';
        button.textContent='CONTINUAR PARTIDA · '+label(saved.mode)+' · '+saved.pregunta.index+' / '+saved.pregunta.total;
        button.onclick=async()=>{
          if(state.busy)return;state.busy=true;button.disabled=true;
          try{
            // Fetch again so another device cannot leave this menu pointing at an old question.
            const current=await api({action:'resume',mode:saved.mode});
            if(viewVersion!==version)return;
            if(!current.partida||!current.pregunta){await home();msg('Aquesta partida ja no està pendent.');return;}
            state.mode=current.mode;state.run=current.partida;state.question=current.pregunta;
            state.points=current.puntuacio;state.answerReply=null;renderQuestion();
          }catch(e){if(viewVersion===version){msg(errorMessage(e),true);button.disabled=false;}}
          finally{state.busy=false;}
        };
        box.append(button);
      }
    }
    if(results.some(r=>r.status==='rejected')){
      const retry=document.createElement('button');retry.type='button';retry.className='btn small';
      retry.textContent='Tornar a buscar partides pendents';
      retry.onclick=()=>{retry.disabled=true;loadPendingGames(version);};box.append(retry);
    }
    box.hidden=!box.children.length;
  }

  async function home(){
    activateSession();show('<div class="panel"><div class="eyebrow">Tauler personal</div><h1>Hola, '+escapeHTML(state.user?.name||'jugador')+'</h1><p class="sub">La teva puntuació i el rànquing continuen guardats a EsoSa.</p><div id="stats" class="score-row"><div class="scorebox"><strong>...</strong><small>Puntuació en Lèxic · primer trimestre</small></div></div><div class="grid2"><button class="btn primary full" id="practice">PRACTICAR</button><button class="btn secondary full" id="ranking">RÀNQUING</button><button class="btn full" id="calendar">CALENDARI</button></div><div id="feedback" hidden></div></div>');
    document.getElementById('practice').onclick=pickMode;
    document.getElementById('ranking').onclick=chooseRanking;
    document.getElementById('calendar').onclick=calendarView;
    try{
      const p=await api({action:'me'});
      if(!document.getElementById('stats'))return;
      document.getElementById('stats').innerHTML='<div class="scorebox"><strong>'+p.punts+'</strong><small>Puntuació en Lèxic · primer trimestre</small></div>';
    }catch(err){msg(errorMessage(err),true);}
  }
  const upcomingExams=[
    {id:'socials',name:'Socials',date:'24 de novembre',first:true},
    {id:'angles',name:'Anglès',date:'25 de novembre'},
    {id:'catala',name:'Català',date:'26 de novembre'},
    {id:'biologia',name:'Biologia i Geologia',date:'27 de novembre'},
    {id:'matematiques',name:'Matemàtiques',date:'2 de desembre'},
    {id:'fisica',name:'Física i Química',date:'3 de desembre'}
  ];
  function pickMode(){
    show('<div class="panel"><div class="eyebrow">Pràctica</div><h1>Tria un examen</h1><p class="sub">Entra a una assignatura per veure les modalitats de pràctica.</p><div class="grid2">'+upcomingExams.map(exam=>'<section class="mode"><h3>'+exam.name+'</h3><p>Examen · '+exam.date+'</p><span class="hint">En desenvolupament'+(exam.first?' · Començarem per Socials':'')+'</span><button class="btn secondary" data-exam="'+exam.id+'">VEURE MODALITATS</button></section>').join('')+'</div><button class="btn full" id="backHome" style="margin-top:20px">← Tornar</button></div>');
    document.getElementById('backHome').onclick=home;
    document.querySelectorAll('[data-exam]').forEach(button=>button.onclick=()=>examPractice(button.dataset.exam));
  }
  function examPractice(id){
    const exam=upcomingExams.find(item=>item.id===id);if(!exam)return pickMode();
    const modes=[['Quiz','Preguntes per comprovar què recordes.'],['Targetes de memòria','Recorda la resposta abans de descobrir-la.'],['Repàs dels errors','Torna a practicar allò que més et costa.']];
    show('<div class="panel"><div class="eyebrow">Examen · '+exam.date+'</div><h1>'+exam.name+'</h1><p class="sub">Tria com vols practicar. Les modalitats estaran disponibles quan hi afegim els continguts de l’examen.</p><div class="grid2">'+modes.map(([name,description])=>'<section class="mode"><h3>'+name+' · '+exam.name+'</h3><p>'+description+'</p><button class="btn full" disabled>EN DESENVOLUPAMENT</button></section>').join('')+'</div><button class="btn full" id="backExams" style="margin-top:20px">← Tornar als exàmens</button></div>');
    document.getElementById('backExams').onclick=pickMode;
  }


  const practice={pool:[],count:0,last:null};
  const practiceNormalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/[‘’´]/g,"'").replace(/[^a-z0-9çñ·' ]/g,' ').replace(/\s+/g,' ').trim();
  function nextPractice(){
    const candidates=practice.pool;
    const weight=x=>x.errors*(x.q.id===practice.last?0.35:1);
    let draw=Math.random()*candidates.reduce((sum,x)=>sum+weight(x),0),chosen=candidates[candidates.length-1];
    for(const item of candidates){draw-=weight(item);if(draw<0){chosen=item;break;}}
    practice.last=chosen.q.id;
    const q={...chosen.q,index:++practice.count,total:'∞'};
    if(q.opcions){q.opcions=[...q.opcions];for(let i=q.opcions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q.opcions[i],q.opcions[j]]=[q.opcions[j],q.opcions[i]];}}
    return q;
  }
  async function startInfinite(){
    const data=await api({action:'recommendations'});
    if(!data.preguntes?.length){
      msg('Encara no tens errors detallats desats. Juga una modalitat normal; aquí apareixeran les preguntes que fallis.');return;
    }
    practice.pool=data.preguntes;practice.count=0;practice.last=null;
    state.mode='infinite';state.run='practice:'+crypto.randomUUID();state.points=0;
    state.answerReply=null;state.question=nextPractice();renderQuestion();
  }
  function practiceAnswer(q,input){
    const parts=String(input).split(/\n+/).map(practiceNormalize);
    const correcte=q.tipus==='text'?parts.length===q.respostes.length&&parts.every((x,i)=>x===practiceNormalize(q.respostes[i])):practiceNormalize(input)===practiceNormalize(q.correcta);
    return {correcte,solucio:q.correcta,puntuacio:0,final:false,pregunta:nextPractice(),practica:true};
  }

  function renderQuestion(){
    const q=state.question;if(!q)return home();
    const infinite=state.mode==='infinite';
    const pct=infinite?0:Math.round((q.index-1)/q.total*100),canTest=q.tipus==='test';
    const section=state.mode==='mix'?'MIX · '+label(q.apartat):infinite?'RECOMANACIÓ INFINITA · '+label(q.apartat):label(state.mode);
    show('<div class="panel"><div class="bar"><div class="eyebrow">'+escapeHTML(section)+' · '+escapeHTML(q.fase)+'</div><strong>'+q.index+' / '+q.total+'</strong></div><div class="progress"'+(infinite?' hidden':'')+'><div style="width:'+pct+'%"></div></div><div class="bar"><span class="muted">'+(infinite?'Pràctica lliure · no modifica punts ni domini':'Punts d’aquesta partida')+'</span><strong id="livePoints">'+(infinite?'∞':state.points)+'</strong></div><div class="question">'+escapeHTML(q.enunciat)+'</div><form id="answerForm" class="stack large-gap">'+(canTest?'<div class="stack">'+q.opcions.map(x=>'<label class="option"><input type="radio" name="answer" value="'+escapeHTML(x)+'" required><span>'+escapeHTML(x)+'</span></label>').join('')+'</div>':q.tipus==='text'?'<label>Text corregit (una frase per línia)<textarea name="answer" required spellcheck="true" placeholder="Reescriu aquí tot el text corregit..."></textarea></label>':'<label>Escriu la resposta<input name="answer" required autocomplete="off" spellcheck="true" placeholder="La teva resposta"></label>')+'<button class="btn primary full" type="submit" id="answerButton"'+(canTest?' hidden':'')+'>Comprovar resposta</button><div id="feedback" hidden role="status"></div></form><p class="hint" style="margin-top:24px">'+(canTest?'Tria una opció. Es corregirà i avançarà automàticament.':'Envia la resposta per veure la correcció.')+'</p><button type="button" class="btn secondary full" id="leaveGame" style="margin-top:12px">SORTIR I DESAR PUNTS</button></div>');
    const version=viewVersion,run=state.run;
    const form=document.getElementById('answerForm'),saved=cache.get(draftKey());
    if(!canTest&&saved?.index===q.index)form.elements.answer.value=String(saved.value||'');
    form.addEventListener('input',()=>cache.set(draftKey(),{index:q.index,value:String(new FormData(form).get('answer')||'')}));
    const pause=document.createElement('button');pause.type='button';pause.className='btn full';
    pause.textContent='PAUSAR I CONTINUAR MÉS TARD';
    pause.onclick=()=>{if(state.busy)return;state.run=null;state.question=null;state.answerReply=null;home();};
    if(!infinite)document.getElementById('leaveGame').before(pause);
    const exitButton=document.getElementById('leaveGame');
    if(infinite)exitButton.textContent='SORTIR DE LA PRÀCTICA';
    exitButton.onclick=infinite?()=>{if(state.busy)return;cache.remove(draftKey());state.run=null;state.question=null;state.answerReply=null;practice.pool=[];home();}:sortirIGuardar;
    form.onsubmit=async(e)=>{
      e.preventDefault();if(state.busy||state.answerReply)return;
      const inp=String(new FormData(form).get('answer')||'').trim();if(!inp){msg('Introdueix una resposta.',true);return;}
      state.busy=true;
      form.querySelectorAll('input,textarea,button').forEach(n=>n.disabled=true);
      if(canTest)msg(infinite?'Comprovant…':'Desant la resposta…');
      try{
        const reply=infinite?practiceAnswer(q,inp):await api({action:'answer',partida:run,index:q.index,resposta:inp});
        if(viewVersion!==version||state.run!==run)return;
        cache.remove(draftKey());state.points=reply.puntuacio;state.answerReply=reply;sendPresence();
        document.getElementById('livePoints').textContent=infinite?'∞':state.points;
        if(canTest)renderTestFeedback(reply,inp,version);else renderFeedback(reply);
      }catch(err){
        if(viewVersion!==version||state.run!==run)return;
        try{
          if(infinite)throw err;
          const current=await api({action:'resume',mode:state.mode});
          if(viewVersion!==version||state.run!==run)return;
          if(current.partida===run&&current.pregunta?.index>q.index){
            cache.remove(draftKey());state.question=current.pregunta;state.points=current.puntuacio;renderQuestion();
            msg('La resposta ja estava desada. Hem recuperat la pregunta actual.');return;
          }
          if(!current.partida){state.run=null;await home();msg('La partida ja està desada.');return;}
        }catch{}
        if(viewVersion!==version)return;
        msg(errorMessage(err),true);form.querySelectorAll('input,textarea,button').forEach(n=>n.disabled=false);
        const button=document.getElementById('answerButton');button.hidden=false;button.textContent='Tornar a enviar';
      }finally{state.busy=false;}
    };
    if(canTest)form.addEventListener('change',e=>{if(e.target.name==='answer'&&!state.busy&&!state.answerReply)form.requestSubmit();});
  }
  function advanceAnswer(r){
    if(r.final){renderFinish(r.resultat);}
    else{state.question=r.pregunta;state.answerReply=null;renderQuestion();}
  }
  function renderTestFeedback(r,selected,version){
    const options=[...document.querySelectorAll('#answerForm .option')];
    const chosen=options.find(n=>n.querySelector('input').value===selected);
    const correct=options.find(n=>n.querySelector('input').value===r.solucio);
    chosen?.classList.add(r.correcte?'answer-good':'answer-bad');
    msg(r.practica?(r.correcte?'Correcte!':'Incorrecte. Repassem-ho.'):(r.correcte?'Correcte! +10 punts':'Incorrecte. −5 punts'),!r.correcte);
    if(!r.correcte){
      autoTimers.push(setTimeout(()=>{
        if(viewVersion!==version)return;
        // Requested presentation: the solution is red too, with an explicit label.
        correct?.classList.add('answer-solution');
        if(correct){const badge=document.createElement('small');badge.className='answer-label';badge.textContent='Resposta correcta';correct.append(badge);}
        msg('Resposta correcta: '+r.solucio,true);
      },500));
    }
    if(r.final)document.getElementById('leaveGame')?.remove();
    autoTimers.push(setTimeout(()=>{if(viewVersion===version)advanceAnswer(r);},2000));
  }
  function renderFeedback(r){
    const form=document.getElementById('answerForm');if(!form)return;
    form.querySelectorAll('input,textarea,button').forEach(e=>e.disabled=true);
    const next=document.createElement('section');next.className='stack';
    next.innerHTML='<div class="result '+(r.correcte?'ok':'bad')+'"><strong>'+(r.practica?(r.correcte?'Resposta correcta':'Resposta incorrecta'):(r.correcte?'Resposta correcta: +10 punts':'Resposta incorrecta: −5 punts'))+'</strong><div class="preserve-lines">'+escapeHTML(r.correcte?'Molt bé!':('Solució: '+String(r.solucio??'')))+'</div></div><button class="btn primary full" id="nextQuestion">'+(r.final?'VEURE EL RESULTAT':'PREGUNTA SEGÜENT')+'</button>';
    form.insertAdjacentElement('afterend',next);
    if(r.final)document.getElementById('leaveGame')?.remove();
    document.getElementById('nextQuestion').onclick=()=>advanceAnswer(r);
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

  const displayDate=value=>new Date(value).toLocaleString('ca-ES',{dateStyle:'short',timeStyle:'short'});
  async function historyView(){
    show('<div class="panel"><div class="eyebrow">El teu progrés</div><h1>Historial i domini</h1><p class="sub">Revisa les partides i descobreix què et falta practicar.</p><div id="mastery" class="mastery-grid"><p class="hint">Calculant el domini…</p></div><p class="hint">Domini = preguntes amb l’última resposta correcta ÷ totes les preguntes de l’apartat × 100. Les no practicades no sumen. Repetir una pregunta no la compta dues vegades. Les respostes anteriors a aquesta actualització no es poden reconstruir.</p><h2 class="history-heading">Les teves partides</h2><div id="historyList"><p class="hint">Carregant…</p></div><button class="btn small" id="moreHistory" hidden>Carregar-ne més</button><div id="feedback" hidden></div><button class="btn history-back" id="historyHome">← Tornar al menú</button></div>');
    const version=viewVersion;
    document.getElementById('historyHome').onclick=home;
    let cursor=null,loading=false;
    const loadPage=async()=>{
      if(loading)return;loading=true;
      const button=document.getElementById('moreHistory');button.disabled=true;
      try{
        const data=await api({action:'history',cursor});
        if(viewVersion!==version)return;
        const list=document.getElementById('historyList');
        if(!cursor)list.innerHTML='';
        data.partides.forEach(p=>{
          const item=document.createElement('button');item.className='history-row';item.type='button';
          const status=!p.acabat?'En curs':p.respostes<p.total?'Desada parcialment':'Completada';
          item.innerHTML='<span><strong>'+escapeHTML(label(p.mode))+'</strong><small>'+escapeHTML(displayDate(p.data))+' · '+status+'</small></span><span class="history-row-score"><strong>'+p.encerts+' / '+p.total+' encerts</strong><small>'+(p.punts>=0?'+':'')+p.punts+' punts · Veure detalls →</small></span>';
          item.onclick=()=>historyDetail(p.id);list.append(item);
        });
        if(!list.children.length)list.innerHTML='<p class="sub">Encara no tens partides. Comença a practicar!</p>';
        cursor=data.cursor;button.hidden=!cursor;
      }catch(e){if(viewVersion===version){msg(errorMessage(e),true);button.hidden=false;button.textContent='Tornar a provar';}}
      finally{loading=false;button.disabled=false;}
    };
    document.getElementById('moreHistory').onclick=loadPage;
    const mastery=async()=>{
      try{
        const data=await api({action:'mastery'});
        if(viewVersion!==version)return;
        document.getElementById('mastery').innerHTML=data.apartats.map(a=>'<section class="mastery-card"><div class="bar"><strong>'+escapeHTML(label(a.mode))+'</strong><strong class="mastery-value">'+a.percentatge.toLocaleString('ca-ES')+'%</strong></div><div class="progress" role="progressbar" aria-label="'+escapeHTML(label(a.mode))+'" aria-valuenow="'+a.percentatge+'" aria-valuemin="0" aria-valuemax="100"><div style="width:'+a.percentatge+'%"></div></div><small>'+a.correctes+' de '+a.total+' dominades · '+a.practicades+' practicades</small></section>').join('');
      }catch(e){if(viewVersion===version)document.getElementById('mastery').textContent='No hem pogut calcular el domini. Torna a obrir l’historial.';}
    };
    await Promise.all([loadPage(),mastery()]);
  }
  async function historyDetail(id){
    show('<div class="panel"><button class="btn small" id="backHistory">← Historial</button><div id="historyDetail"><p class="sub history-back">Carregant la partida…</p></div><div id="feedback" hidden></div></div>');
    document.getElementById('backHistory').onclick=historyView;
    const version=viewVersion;
    try{
      const p=await api({action:'historyDetail',partida:id});
      if(viewVersion!==version)return;
      const section=document.getElementById('historyDetail');
      section.innerHTML='<div class="eyebrow history-back">'+escapeHTML(displayDate(p.data))+'</div><h1>'+escapeHTML(label(p.mode))+'</h1><p class="sub">'+p.encerts+' encerts · '+p.errors+' errors · '+p.respostes+' / '+p.total+' respostes · '+p.punts+' punts</p>'+p.preguntes.map(q=>{
        const status=q.estat==='antiga'?'Resposta antiga no desada':q.estat==='pendent'?'Sense respondre':q.encert?'Correcta':'Incorrecta';
        return '<details class="history-question"><summary><span>'+q.index+'. '+escapeHTML(label(q.apartat))+' · '+escapeHTML(q.fase)+'</span><span class="history-status '+(q.encert===true?'is-good':q.encert===false?'is-bad':'')+'">'+status+'</span></summary><div class="history-answer"><p class="preserve-lines"><strong>'+escapeHTML(q.enunciat)+'</strong></p><p class="preserve-lines"><span class="muted">La teva resposta:</span> '+escapeHTML(q.resposta??(q.estat==='antiga'?'No es guardava en aquesta versió.':'Encara no has respost.'))+'</p>'+(q.solucio!==null?'<p class="preserve-lines"><span class="muted">Resposta correcta:</span> '+escapeHTML(q.solucio)+'</p>':'')+'</div></details>';
      }).join('');
    }catch(e){if(viewVersion===version)msg(errorMessage(e),true);}
  }
  function chooseRanking(){
    show('<div class="panel"><div class="eyebrow">Classificació</div><h1>Tria una disciplina</h1><p class="sub">Consulta els punts de cada matèria.</p><button class="mode full" id="lexicRanking"><h3>Lèxic · primer trimestre</h3><p>Inclou lèxic, dictats i català.</p><span class="btn primary">VEURE PUNTUACIONS</span></button><button class="btn" id="backHome" style="margin-top:18px">← Tornar</button></div>');
    document.getElementById('lexicRanking').onclick=()=>ranking();document.getElementById('backHome').onclick=home;
  }
  const examEvents={
    '2026-11-24':[{subject:'Socials',title:'Examen trimestral',group:'C'}],
    '2026-11-25':[{subject:'Anglès',title:'Trimestral',group:''}],
    '2026-11-26':[{subject:'Català',title:'Trimestral',group:''}],
    '2026-11-27':[{subject:'Biologia i Geologia',title:'Trimestral',group:''}],
    '2026-12-02':[{subject:'Matemàtiques',title:'Trimestral',group:''}],
    '2026-12-03':[{subject:'Física i Química',title:'Examen 1r trimestre',group:''}]
  };
  let calendarWeek=0;
  function calendarView(){
    const today=new Date();today.setHours(0,0,0,0);
    const monday=new Date(today);monday.setDate(today.getDate()-((today.getDay()+6)%7)+calendarWeek*7);
    const days=['Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte','Diumenge'];
    const months=['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'];
    const formatDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const dayCards=Array.from({length:7},(_,i)=>{
      const d=new Date(monday);d.setDate(monday.getDate()+i);
      const key=formatDate(d),events=(examEvents[key]||[]).filter(e=>!e.group||e.group===state.user?.prefs?.classGroup);
      const status=d<today?'past':d.getTime()===today.getTime()?'today':'future';
      return '<article class="calendar-day '+status+'"><div class="calendar-date"><span>'+days[i]+'</span><strong>'+d.getDate()+'</strong></div><div class="calendar-events">'+(events.length?events.map(e=>'<div class="calendar-event"><strong>'+escapeHTML(e.subject)+'</strong><span>'+escapeHTML(e.title)+'</span>'+(e.group?'<small>'+escapeHTML(e.group)+'</small>':'')+'</div>').join(''):'<span class="calendar-empty">—</span>')+'</div></article>';
    }).join('');
    const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);
    const period=monday.getDate()+' '+months[monday.getMonth()]+' – '+sunday.getDate()+' '+months[sunday.getMonth()]+' '+sunday.getFullYear();
    show('<div class="panel"><div class="eyebrow">Planificació</div><div class="calendar-heading"><h1>Calendari</h1><div class="calendar-nav"><button class="btn" id="previousWeek" aria-label="Setmana anterior">←</button><button class="btn" id="nextWeek" aria-label="Setmana següent">→</button></div></div><p class="sub calendar-period">'+period+'</p><div class="calendar-week">'+dayCards+'</div><p class="hint">Els dies anteriors, avui i els dies futurs tenen colors diferents.</p><button class="btn" id="calendarHome">← Tornar</button></div>');
    document.getElementById('previousWeek').onclick=()=>{calendarWeek--;calendarView();};
    document.getElementById('nextWeek').onclick=()=>{calendarWeek++;calendarView();};
    document.getElementById('calendarHome').onclick=home;
  }
  async function ranking(refresh=false){
    refresh=refresh===true;
    if(!refresh)show('<div class="panel"><div class="eyebrow">Classificació pública · Lèxic · primer trimestre</div><h1>Rànquing de Lèxic · primer trimestre</h1><p class="sub">Inclou lèxic, dictats i català. La puntuació i les posicions anteriors es conserven.</p><p class="presence-legend"><span><i class="presence-dot online" aria-hidden="true"></i> Connectat</span><span><i class="presence-dot playing" aria-hidden="true"></i> En partida</span></p><div id="list"><p>Carregant puntuacions...</p></div><button class="btn secondary" id="chooseDiscipline">← Tria una altra disciplina</button><div id="feedback" hidden></div></div>');
    if(!refresh)document.getElementById('chooseDiscipline').onclick=chooseRanking;
    try{
      const data=await api({action:'ranking'});
      if(!document.getElementById('list'))return;
      const players=data.ranking.filter(p=>Number(p.partides)>0);
      const fmt=n=>Number(n||0).toLocaleString('ca-ES');
      const ordinal=n=>n===1?'1r':n===2?'2n':n===3?'3r':n===4?'4t':n+'è';
      // Older server responses have no user ID; avoid marking duplicate names as the current player.
      const uniqueName=players.filter(p=>p.nom===state.user?.name).length===1;
      const isMe=p=>p.id?p.id===state.user?.$id:uniqueName&&p.nom===state.user?.name;
      const medals=['🥇','🥈','🥉'],titles=['Primer','Segon','Tercer'];
      const podium=players.slice(0,3).map((p,i)=>
        '<article class="podium-card podium-'+i+'"><span class="podium-medal" aria-hidden="true">'+medals[i]+'</span><span class="podium-place">'+titles[i]+'</span><strong class="podium-name">'+escapeHTML(p.nom)+presenceDot(p)+'</strong><span class="podium-points">'+fmt(p.punts)+' <small>punts</small></span></article>'
      ).join('');
      document.getElementById('list').innerHTML=players.length?
        '<div class="rank-podium" aria-label="Podi del rànquing">'+podium+'</div><div class="rank-caption"><span>Classificació · '+players.length+' jugadors'+(players.length===100?' (top 100)':'')+'</span><span>+10 per encert</span></div><table class="ranking ranking-fresh"><thead><tr><th scope="col">Posició</th><th scope="col">Jugador</th><th scope="col">Punts</th></tr></thead><tbody>'+
        players.map((p,i)=>'<tr'+(isMe(p)?' class="me"':'')+'><td><span class="rank-position">'+(i<3?'<span aria-hidden="true">'+medals[i]+'</span>':'')+ordinal(i+1)+'</span></td><td><span class="rank-name">'+escapeHTML(p.nom)+presenceDot(p)+'</span>'+(isMe(p)?'<span class="rank-you">Tu</span>':'')+'<small class="rank-games">'+fmt(p.partides)+' partides</small></td><td><strong>'+fmt(p.punts)+'</strong></td></tr>').join('')+
        '</tbody></table><p class="hint rank-footnote">Cada resposta compta. Practica una mica més i puja posicions.</p>':
        '<div class="rank-empty"><span aria-hidden="true">🏆</span><h2>El primer lloc t’espera</h2><p class="sub">Completa una partida i estrena el rànquing.</p></div>';

    }catch(e){if(!refresh){msg(errorMessage(e),true);const list=document.getElementById('list');if(list)list.innerHTML='';}}
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
