(() => {
'use strict';
const VERSION='0.24.0';
const SCHEMA='osgard.cascade-lab.mission-director.v1';
const INVITE_SCHEMA='osgard.cascade-lab.mission-invite.v1';
const STORE_KEY=SCHEMA,MAX_HISTORY=24,MAX_ATTEMPTS=6,MAX_INVITE_URL_LENGTH=7000,INVITE_TTL_MS=30*24*60*60*1000;
const LEVELS=[{id:1,name:'Первый каскад'},{id:2,name:'Второй этаж'},{id:3,name:'Магнитная аномалия'},{id:4,name:'Красный шлюз'},{id:5,name:'Хрупкий груз'}];
const KINDS=new Set(['first-clear','recovery','leaner','faster','consistency']),STATUSES=new Set(['active','complete','expired']);
let sequence=0;
const clean=(v,n=220)=>String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function normalizeRun(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const id=clean(raw.id,100),levelId=Number(raw.levelId),stamp=Date.parse(raw.at),timeSeconds=Number(raw.timeSeconds),deviceCount=Number(raw.deviceCount);
 if(!id||!Number.isInteger(levelId)||!LEVELS.some(x=>x.id===levelId)||!['won','lost'].includes(raw.status)||!Number.isFinite(stamp))return null;
 if(!Number.isFinite(timeSeconds)||timeSeconds<0||timeSeconds>120||!Number.isInteger(deviceCount)||deviceCount<0||deviceCount>12)return null;
 return{id,levelId,levelTitle:clean(raw.levelTitle||LEVELS.find(x=>x.id===levelId).name,100),status:raw.status,at:new Date(stamp).toISOString(),mode:clean(raw.mode,40),dailyDate:typeof raw.dailyDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate)?raw.dailyDate:null,timeSeconds,deviceCount,par:Number.isInteger(raw.par)&&raw.par>=0&&raw.par<=12?raw.par:null,parTime:Number.isFinite(Number(raw.parTime))&&Number(raw.parTime)>0?clamp(Number(raw.parTime),.1,120):null,grade:clean(raw.grade||'—',8)};
}
function campaignRuns(raw){return(Array.isArray(raw)?raw:[]).map(normalizeRun).filter(x=>x&&x.mode==='campaign'&&x.dailyDate===null).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));}
function baselineOf(r){return r?{id:r.id,status:r.status,at:r.at,timeSeconds:r.timeSeconds,deviceCount:r.deviceCount,par:r.par,parTime:r.parTime,grade:r.grade}:null;}
function recommendationFor(levelId,runs){
 const level=LEVELS.find(x=>x.id===levelId),attempts=runs.filter(x=>x.levelId===levelId),latest=attempts[0]||null;
 const wins=attempts.filter(x=>x.status==='won'),efficient=wins.slice().sort((a,b)=>a.deviceCount-b.deviceCount||a.timeSeconds-b.timeSeconds)[0]||null,fastest=wins.slice().sort((a,b)=>a.timeSeconds-b.timeSeconds||a.deviceCount-b.deviceCount)[0]||null;
 if(!latest)return{id:'first-clear-'+levelId,levelId,kind:'first-clear',priority:42-levelId,levelTitle:level.name,title:'Сними первое доказательство',goalText:'Заверши протокол успешной доставкой.',reason:'Для этого протокола ещё нет сохранённых сюжетных результатов. Нужен базовый замер.',instruction:'Собери механизм, запусти симуляцию и добейся статуса «Выполнено».',baseline:null,baselineAt:null};
 if(latest.status==='lost')return{id:'recovery-'+levelId+'-'+latest.id,levelId,kind:'recovery',priority:100,levelTitle:level.name,title:'Верни доставку',goalText:'Добейся успешной доставки после последнего отказа.',reason:'Последний обычный результат протокола завершился отказом '+new Date(latest.at).toLocaleDateString('ru-RU')+'.',instruction:'Используй журнал событий и меняй одну причину за попытку. Не перестраивай всю схему сразу.',baseline:baselineOf(latest),baselineAt:latest.at};
 if(efficient&&efficient.par!==null&&efficient.deviceCount>efficient.par&&efficient.deviceCount>1)return{id:'leaner-'+levelId+'-'+efficient.id,levelId,kind:'leaner',priority:82,levelTitle:level.name,title:'Убери одну лишнюю деталь',goalText:'Повтори доставку хотя бы на одну деталь меньше.',reason:'Экономный успешный результат использовал '+efficient.deviceCount+' деталей при ориентире '+efficient.par+'.',instruction:'Сохрани базовую схему. Убери ровно одну деталь и сравни результат; если доставка сорвётся, восстанови базу.',baseline:baselineOf(efficient),baselineAt:efficient.at};
 if(fastest&&fastest.parTime!==null&&fastest.timeSeconds>fastest.parTime*1.03)return{id:'faster-'+levelId+'-'+fastest.id,levelId,kind:'faster',priority:72,levelTitle:level.name,title:'Улучши время на 5%',goalText:'Заверши успешный запуск минимум на 5% быстрее базового замера.',reason:'Самое быстрое сохранённое прохождение — '+fastest.timeSeconds.toFixed(2)+' с; ориентир уровня — '+fastest.parTime.toFixed(2)+' с.',instruction:'Меняй один параметр: положение, угол или момент срабатывания. Цель — '+(fastest.timeSeconds*.95).toFixed(2)+' с или быстрее без потери доставки.',baseline:baselineOf(fastest),baselineAt:fastest.at};
 return{id:'consistency-'+levelId+'-'+latest.id,levelId,kind:'consistency',priority:55,levelTitle:level.name,title:'Закрепи стабильный результат',goalText:'Выполни две успешные доставки подряд в обычном режиме.',reason:'Уже есть успешный результат. Теперь проверь, можешь ли повторить его стабильно.',instruction:'Повтори успешную конструкцию. Два успешных запуска подряд завершают контракт; отказ сбрасывает серию.',baseline:baselineOf(fastest||latest),baselineAt:(fastest||latest).at};
}
function buildRecommendations(rawRuns,limit=3){const runs=campaignRuns(rawRuns);return LEVELS.map(level=>recommendationFor(level.id,runs)).sort((a,b)=>b.priority-a.priority||(Date.parse(b.baselineAt||'1970-01-01')-Date.parse(a.baselineAt||'1970-01-01'))||a.levelId-b.levelId).slice(0,clamp(Math.round(Number(limit)||3),1,5));}
function createContract(rec,options={}){
 if(!rec||!KINDS.has(rec.kind)||!LEVELS.some(x=>x.id===rec.levelId))return null;
 const stamp=options.now&&Number.isFinite(Date.parse(options.now))?new Date(options.now).toISOString():new Date().toISOString();sequence++;
 const baselineRun=rec.baseline?normalizeRun({...rec.baseline,levelId:rec.levelId,levelTitle:rec.levelTitle,mode:'campaign',dailyDate:null,at:rec.baseline.at||stamp}):null;
 const c={id:clean(options.id||('director-'+Date.parse(stamp).toString(36)+'-'+sequence.toString(36)),100),schema:SCHEMA,version:VERSION,recommendationId:clean(rec.id,140),kind:rec.kind,levelId:rec.levelId,levelTitle:clean(rec.levelTitle,100),title:clean(rec.title,140),goalText:clean(rec.goalText,300),reason:clean(rec.reason,420),instruction:clean(rec.instruction,600),baseline:baselineOf(baselineRun),createdAt:stamp,status:'active',attempts:[],streak:0,progress:0,xpAwarded:false};
 return c.id&&c.title&&c.goalText?c:null;
}
function sanitizeContract(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==SCHEMA||!KINDS.has(raw.kind)||!STATUSES.has(raw.status)||!LEVELS.some(x=>x.id===raw.levelId)||!Number.isFinite(Date.parse(raw.createdAt))||typeof raw.id!=='string'||!raw.id||raw.id.length>100)return null;
 const c=createContract({id:clean(raw.recommendationId,140),levelId:raw.levelId,kind:raw.kind,levelTitle:clean(raw.levelTitle,100),title:clean(raw.title,140),goalText:clean(raw.goalText,300),reason:clean(raw.reason,420),instruction:clean(raw.instruction,600),baseline:raw.baseline||null},{now:raw.createdAt,id:raw.id});
 if(!c)return null;c.status=raw.status;c.attempts=(Array.isArray(raw.attempts)?raw.attempts:[]).slice(-MAX_ATTEMPTS).map(x=>({runId:clean(x.runId,100),at:Number.isFinite(Date.parse(x.at))?new Date(x.at).toISOString():c.createdAt,status:x.status==='won'?'won':'lost',timeSeconds:clamp(Number(x.timeSeconds)||0,0,120),deviceCount:clamp(Math.round(Number(x.deviceCount)||0),0,12),passed:x.passed===true})).filter(x=>x.runId);
 c.streak=clamp(Math.round(Number(raw.streak)||0),0,2);c.progress=clamp(Math.round(Number(raw.progress)||0),0,2);c.xpAwarded=raw.xpAwarded===true;c.completedAt=Number.isFinite(Date.parse(raw.completedAt))?new Date(raw.completedAt).toISOString():null;
 if(c.status==='complete'&&!c.completedAt)return null;return c;
}
function invitationNow(options={}){const n=Date.parse(options.now||'');return Number.isFinite(n)?n:Date.now();}
function normalizeInvitation(raw,options={}){
 const fail=reason=>({ok:false,reason});
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==INVITE_SCHEMA)return fail('Ссылка не содержит корректный контракт CASCADE LAB.');
 if(raw.version!==VERSION)return fail('Версия приглашения не поддерживается. Создай новую ссылку в актуальной версии игры.');
 if(!KINDS.has(raw.kind)||!Number.isInteger(raw.levelId)||!LEVELS.some(x=>x.id===raw.levelId))return fail('В приглашении указан неизвестный тип или протокол.');
 const issuedMs=Date.parse(raw.issuedAt),expiresMs=Date.parse(raw.expiresAt),nowMs=invitationNow(options);
 if(!Number.isFinite(issuedMs)||!Number.isFinite(expiresMs)||expiresMs<=issuedMs||expiresMs-issuedMs>INVITE_TTL_MS+1000)return fail('Срок действия приглашения задан некорректно.');
 if(issuedMs>nowMs+5*60*1000)return fail('Время создания приглашения находится в будущем.');
 if(expiresMs<=nowMs)return fail('Приглашение истекло. Попроси друга создать новую ссылку.');
 const invitationId=clean(raw.invitationId,100);
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(invitationId))return fail('Идентификатор приглашения не прошёл проверку.');
 const level=LEVELS.find(x=>x.id===raw.levelId),levelTitle=clean(raw.levelTitle||level.name,100);
 let baseline=null;
 if(raw.baseline!==null&&raw.baseline!==undefined){
  const run=normalizeRun({...raw.baseline,levelId:raw.levelId,levelTitle,mode:'campaign',dailyDate:null,at:raw.baseline.at||new Date(issuedMs).toISOString()});
  if(!run)return fail('Исходный замер приглашения повреждён.');
  baseline=baselineOf(run);
 }
 if(['leaner','faster'].includes(raw.kind)&&!baseline)return fail('Для этого контракта отсутствует базовый замер.');
 const title=clean(raw.title,140),goalText=clean(raw.goalText,300),instruction=clean(raw.instruction,600),reason=clean(raw.reason,420);
 if(!title||!goalText||!instruction||!reason)return fail('В приглашении отсутствует описание цели.');
 return{ok:true,invitation:{schema:INVITE_SCHEMA,version:VERSION,invitationId,kind:raw.kind,levelId:raw.levelId,levelTitle,title,goalText,instruction,reason,baseline,issuedAt:new Date(issuedMs).toISOString(),expiresAt:new Date(expiresMs).toISOString()}};
}
function createInvitation(rawContract,options={}){
 const c=sanitizeContract(rawContract);
 if(!c||c.status!=='active')return{ok:false,reason:'Можно передавать только активный контракт.'};
 const issuedMs=invitationNow(options),issuedAt=new Date(issuedMs).toISOString();
 const invitationId=clean(options.invitationId||('clmd-'+issuedMs.toString(36)+'-'+c.levelId+'-'+(++sequence).toString(36)),100);
 const raw={schema:INVITE_SCHEMA,version:VERSION,invitationId,kind:c.kind,levelId:c.levelId,levelTitle:c.levelTitle,title:c.title,goalText:c.goalText,instruction:c.instruction,reason:c.reason,baseline:c.baseline,issuedAt,expiresAt:new Date(issuedMs+INVITE_TTL_MS).toISOString()};
 const checked=normalizeInvitation(raw,{now:issuedAt});if(!checked.ok)return checked;
 const previewUrl=new URL('https://osgard.world/games/invite/cascade-lab/');
// In the OSGARD catalogue, reuse the canonical invite code and attribution tags.
// Standalone/offline runs still receive a branded preview link, but no claimed referral attribution.
try {
 const host=window.parent;
 if(host&&host!==window&&host.OSGARDInvite&&typeof host.OSGARDInvite.createLink==='function'){
  const canonical=new URL(host.OSGARDInvite.createLink('cascade-lab'));
  const code=canonical.searchParams.get('og_ref')||'';
  const validCanonical=canonical.origin==='https://osgard.world'&&
   canonical.pathname==='/games/invite/cascade-lab/'&&
   /^og_[a-f0-9]{8}$/.test(code)&&
   canonical.searchParams.get('og_game')==='cascade-lab'&&
   canonical.searchParams.get('utm_source')==='osgard_play'&&
   canonical.searchParams.get('utm_medium')==='referral'&&
   canonical.searchParams.get('utm_campaign')==='play_with_friends'&&
   canonical.searchParams.get('utm_content')==='cascade-lab';
  if(validCanonical){
   for(const key of ['og_ref','og_game','utm_source','utm_medium','utm_campaign','utm_content']){
    previewUrl.searchParams.set(key,canonical.searchParams.get(key));
   }
  }
 }
} catch { /* Fail safely: standalone sharing does not require the host bridge. */ }
previewUrl.searchParams.set('clmd',JSON.stringify(checked.invitation));
const url=previewUrl.href;
 if(url.length>MAX_INVITE_URL_LENGTH)return{ok:false,reason:'Приглашение получилось слишком длинным. Создай контракт с более коротким описанием.'};
 return{ok:true,invitation:checked.invitation,url};
}
function queryInvitation(search){
 const raw=String(search||'').replace(/^\?/,'');
 for(const part of raw.split('&')){if(!part)continue;const i=part.indexOf('=');let key;try{key=decodeURIComponent((i<0?part:part.slice(0,i)).replace(/\+/g,' '));}catch{continue;}if(key!=='clmd')continue;if(i<0)return{ok:false,reason:'В ссылке отсутствует содержимое приглашения.'};let value;try{value=decodeURIComponent(part.slice(i+1).replace(/\+/g,' '));}catch{return{ok:false,reason:'Не удалось декодировать ссылку приглашения.'};}if(value.length>MAX_INVITE_URL_LENGTH)return{ok:false,reason:'Ссылка приглашения превышает допустимый размер.'};try{return{ok:true,raw:JSON.parse(value)};}catch{return{ok:false,reason:'Данные приглашения не являются корректным JSON.'};}}
 return{ok:false,reason:'Ссылка не содержит параметр clmd.'};
}
function parseInvitation(search,options={}){
 const query=queryInvitation(search);if(!query.ok)return query;return normalizeInvitation(query.raw,options);
}
function createContractFromInvitation(raw,options={}){
 const checked=normalizeInvitation(raw,options);if(!checked.ok)return checked;const invitation=checked.invitation;
 const rec={id:'invite-'+invitation.invitationId,levelId:invitation.levelId,kind:invitation.kind,levelTitle:invitation.levelTitle,title:invitation.title,goalText:invitation.goalText,instruction:invitation.instruction,reason:invitation.reason,baseline:invitation.baseline,baselineAt:invitation.baseline?.at||null};
 const stamp=Number.isFinite(Date.parse(options.now||''))?new Date(options.now).toISOString():new Date().toISOString();
 const contract=createContract(rec,{now:stamp,id:clean(options.id||('accepted-'+Date.parse(stamp).toString(36)+'-'+invitation.invitationId.slice(-12)),100)});
 return contract?{ok:true,contract}:{ok:false,reason:'Не удалось создать локальный контракт из приглашения.'};
}
function observeContract(rawContract,rawRun){
 const c=sanitizeContract(rawContract),r=normalizeRun(rawRun);
 if(!c||c.status!=='active'||!r||r.mode!=='campaign'||r.dailyDate!==null||r.levelId!==c.levelId)return{applied:false,reason:'Этот результат не подходит к активному контракту.',contract:c||null,completed:false,xpAward:0};
 if(c.attempts.some(x=>x.runId===r.id))return{applied:false,reason:'Запуск уже учтён.',contract:c,completed:false,xpAward:0};
 const next={...c,attempts:c.attempts.slice(),streak:c.streak,progress:c.progress};let passed=false;
 if(c.kind==='first-clear'||c.kind==='recovery')passed=r.status==='won';
 else if(c.kind==='leaner')passed=r.status==='won'&&Boolean(c.baseline)&&r.deviceCount<c.baseline.deviceCount;
 else if(c.kind==='faster')passed=r.status==='won'&&Boolean(c.baseline)&&r.timeSeconds<=c.baseline.timeSeconds*.95;
 else if(c.kind==='consistency'){next.streak=r.status==='won'?next.streak+1:0;next.progress=next.streak;passed=next.streak>=2;}
 next.attempts.push({runId:r.id,at:r.at,status:r.status,timeSeconds:r.timeSeconds,deviceCount:r.deviceCount,passed});next.attempts=next.attempts.slice(-MAX_ATTEMPTS);
 if(c.kind!=='consistency')next.progress=passed?1:0;
 if(passed)next.status='complete';else if(next.attempts.length>=MAX_ATTEMPTS)next.status='expired';
 const completed=next.status==='complete'&&c.status!=='complete';if(completed){next.completedAt=r.at;next.xpAwarded=true;}
 return{applied:true,reason:completed?'Контракт выполнен.':next.status==='expired'?'Контракт закрыт после шести попыток.':'Запуск записан. Продолжай.',contract:next,completed,xpAward:completed?100:0};
}
function freshState(){return{schema:SCHEMA,schemaVersion:1,xp:0,active:null,history:[]};}
function validateState(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==SCHEMA||raw.schemaVersion!==1)return{ok:false,state:freshState(),reason:'Неизвестная схема локального плана.'};
 const active=raw.active==null?null:sanitizeContract(raw.active),history=(Array.isArray(raw.history)?raw.history:[]).slice(-MAX_HISTORY).map(sanitizeContract).filter(x=>x&&x.status!=='active');
 if(raw.active!=null&&(!active||active.status!=='active'))return{ok:false,state:freshState(),reason:'Активный контракт повреждён; создан пустой план.'};
 return{ok:true,state:{schema:SCHEMA,schemaVersion:1,xp:clamp(Math.round(Number(raw.xp)||0),0,1000000),active,history}};
}
const api=Object.freeze({version:VERSION,schema:SCHEMA,inviteSchema:INVITE_SCHEMA,levels:LEVELS,normalizeRun,campaignRuns,buildRecommendations,createContract,sanitizeContract,createInvitation,parseInvitation,normalizeInvitation,createContractFromInvitation,observeContract,freshState,validateState,maxHistory:MAX_HISTORY,maxAttempts:MAX_ATTEMPTS,maxInviteUrlLength:MAX_INVITE_URL_LENGTH});
if(typeof window==='undefined'||!window.document){globalThis.__CASCADELAB024_TEST__=api;return;}
if(window.CASCADELAB024)return;
const engine=window.CASCADELAB019,host=document.querySelector('.cl-engineering');if(!host||!engine||typeof engine.getRuns!=='function')return;
const css='.cl-director-invite{margin:0 0 16px;padding:15px;border:1px solid #e9ba6a67;border-radius:12px;background:linear-gradient(120deg,#e9ba6a17,transparent 72%),#0b141c;color:#edf5fa}.cl-director-invite h4{margin:7px 0;color:#f5edda;font:400 23px/1.15 Georgia,serif}.cl-director-invite p{margin:6px 0;color:#aebdc6;font-size:10px;line-height:1.7}.cl-director-invite[hidden],.cl-director-invite [hidden]{display:none!important}.cl-director{margin:18px 0 22px;padding:clamp(15px,2vw,24px);border:1px solid #b6a0ff48;border-radius:17px;background:radial-gradient(ellipse at 92% 0%,#8a69ff18,transparent 44%),linear-gradient(145deg,#12121f,#07121a);color:#edf5fa;box-shadow:0 18px 50px #0003}.cl-director *{box-sizing:border-box}.cl-director-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.cl-director-eyebrow{margin:0 0 8px;color:#b6a0ff;font:8px ui-monospace,monospace;letter-spacing:.18em}.cl-director h3{margin:0;color:#f3f0ff;font:400 clamp(25px,3vw,36px)/1.08 Georgia,serif}.cl-director-lead{max-width:760px;margin:9px 0 15px;color:#a7b6c6;font-size:11px;line-height:1.7}.cl-director-badge{padding:7px 10px;border:1px solid #b6a0ff4d;border-radius:7px;color:#d7cbff;font:9px ui-monospace,monospace}.cl-director-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.cl-director-card{display:flex;flex-direction:column;gap:9px;min-width:0;padding:13px;border:1px solid #89b9d32c;border-radius:12px;background:linear-gradient(150deg,#0b1924,#080e15)}.cl-director-card[data-kind=recovery]{border-color:#ffb66d66}.cl-director-card[data-kind=leaner]{border-color:#68d7ff5c}.cl-director-card[data-kind=faster]{border-color:#72efc15c}.cl-director-card[data-kind=consistency]{border-color:#b6a0ff55}.cl-director-card-top{display:flex;justify-content:space-between;gap:8px}.cl-director-label,.cl-director-kind{color:#a8bdc9;font:8px ui-monospace,monospace}.cl-director-kind{padding:4px 6px;border:1px solid #89b9d32b;border-radius:5px}.cl-director-card h4{margin:2px 0;color:#f7f4e9;font:400 21px/1.15 Georgia,serif}.cl-director-card p{margin:0;color:#a3b7c2;font-size:10px;line-height:1.65}.cl-director-goal{padding:9px 10px;border-left:2px solid #b6a0ff;background:#b6a0ff0d;color:#e2dcff!important}.cl-director-button{display:inline-flex;align-items:center;justify-content:center;min-height:39px;padding:9px 11px;border:1px solid #8ba8b944;border-radius:8px;background:#0a1722;color:#e6f4fb;font:750 9px ui-monospace,monospace;cursor:pointer;text-decoration:none}.cl-director-button.primary{border-color:#e9ba6a70;background:linear-gradient(130deg,#f1d69a,#d39a43);color:#241a08}.cl-director-button:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}.cl-director-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto}.cl-director-current{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.48fr);gap:13px;margin-top:17px;padding:15px;border:1px solid #b6a0ff3d;border-radius:13px;background:#090f18}.cl-director-current h4{margin:7px 0;color:#f5f0ff;font:400 25px/1.12 Georgia,serif}.cl-director-current p{margin:6px 0;color:#a7b7c5;font-size:10px;line-height:1.7}.cl-director-progress{display:grid;gap:9px;align-content:center;padding:12px;border:1px solid #89b9d326;border-radius:10px;background:#060b12}.cl-director-track{height:6px;overflow:hidden;border-radius:99px;background:#223140}.cl-director-track span{display:block;height:100%;background:linear-gradient(90deg,#8e7bff,#68d7ff);transition:width .2s}.cl-director-share{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.cl-director-share a{color:#b7dcec;text-decoration:none;border-bottom:1px solid #68d7ff35;font-size:9px;padding:4px}.cl-director-share button{min-height:30px;padding:5px 8px;border:1px solid #e9ba6a60;border-radius:6px;background:#e9ba6a12;color:#f3d99c;font:9px ui-monospace,monospace;cursor:pointer}.cl-director-empty{padding:15px;border:1px dashed #89b9d32f;border-radius:10px;color:#a0b4c1;font-size:11px;line-height:1.7}.cl-director-history{display:grid;gap:7px;margin-top:17px}.cl-director-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:10px;border:1px solid #89b9d21c;border-radius:8px;background:#080f17}.cl-director-history-row strong{display:block;color:#d9e6ed;font-size:10px}.cl-director-history-row small{display:block;margin-top:4px;color:#8298a8;font-size:9px;line-height:1.5}.cl-director-status{min-height:20px;margin:12px 0 0;color:#a6e9c8;font-size:10px;line-height:1.6}.cl-director-status[data-kind=error]{color:#ffaaa8}.cl-director-foot{margin:10px 0 0;color:#718b9b;font-size:9px;line-height:1.65}.cl-director[hidden],.cl-director [hidden]{display:none!important}@media(max-width:880px){.cl-director-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-director-current{grid-template-columns:1fr}}@media(max-width:600px){.cl-director-grid{grid-template-columns:1fr}.cl-director-actions .cl-director-button{width:100%}}@media(prefers-reduced-motion:reduce){.cl-director *{transition:none!important;animation:none!important}}';
const style=document.createElement('style');style.dataset.cascadeLabDirectorStyle=VERSION;style.textContent=css;document.head.append(style);
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function btn(label,action,cls){const n=el('button',cls||'cl-director-button',label);n.type='button';n.dataset.action=action;return n;}
const panel=el('section','cl-director');panel.id='cascade-adaptive-mission-director';panel.setAttribute('aria-labelledby','cl-director-title');
const top=el('div','cl-director-top'),intro=el('div','');intro.append(el('p','cl-director-eyebrow','CASCADE LAB / ADAPTIVE MISSION DIRECTOR · 0.23'));
const heading=el('h3','','Следующая попытка должна что-то доказать.');heading.id='cl-director-title';intro.append(heading,el('p','cl-director-lead','Контракты строятся по сохранённым результатам этой лаборатории. Выбери одну проверяемую цель, выполни протокол и получи исследовательский опыт за подтверждённый результат.'));
const rank=el('div','cl-director-badge'),rankValue=el('strong','','EXPLORER');rankValue.id='cl-director-rank';rank.append(el('span','','LOCAL RESEARCH RANK'),rankValue);
const xpLine=el('p','cl-director-lead','RESEARCH XP: '),xpValue=el('strong','','0');xpValue.id='cl-director-xp';xpLine.append(xpValue);top.append(intro,rank,xpLine);
const inbound=el('section','cl-director-invite');inbound.id='cl-director-invitation';inbound.hidden=true;inbound.setAttribute('aria-labelledby','cl-director-invite-title');
const inboundBody=el('div','');const inboundActions=el('div','cl-director-actions');const inboundAccept=btn('Принять и открыть протокол ↗','accept-invite','cl-director-button primary');const inboundDismiss=btn('Скрыть приглашение','dismiss-invite','cl-director-button');inboundActions.append(inboundAccept,inboundDismiss);inbound.append(inboundBody,inboundActions);
let incomingInvitation=null,incomingInvitationError='';
const queryHasInvite=/(?:^|[?&])clmd(?:=|&|$)/.test(String(window.location&&window.location.search||''));
if(queryHasInvite){const initial=parseInvitation(window.location.search);if(initial.ok)incomingInvitation=initial.invitation;else incomingInvitationError=initial.reason;}
const current=el('div','cl-director-current');current.id='cl-director-current';current.hidden=true;
const recs=el('div',''),recHead=el('div','cl-director-card-top');recHead.append(el('p','cl-director-label','РЕКОМЕНДАЦИИ ПО ТВОИМ ЗАПУСКАМ'));
const runCount=el('span','cl-director-kind','0 ЗАМЕРОВ');runCount.id='cl-director-run-count';recHead.append(runCount);
const grid=el('div','cl-director-grid');grid.id='cl-director-grid';recs.append(recHead,grid);
const history=el('div','cl-director-history');history.id='cl-director-history';history.hidden=true;history.append(el('h4','','ЛЕТОПИСЬ КОНТРАКТОВ'));const historyRows=el('div','');historyRows.id='cl-director-history-rows';history.append(historyRows);
const status=el('p','cl-director-status','Данные читаются локально.');status.id='cl-director-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
panel.append(top,inbound,current,recs,history,status,el('p','cl-director-foot','Контракты, Research XP и история хранятся только в этом браузере. Это не деньги, не глобальный рейтинг и не серверная аналитика. Диагноз — подсказка по игровой модели, а не доказательство физической причинности.'));
const passportPanel=host.querySelector('.cl-passport'),archivePanel=host.querySelector('.cl-eng-archive');
const insertionPoint=passportPanel?.parentNode===host?passportPanel:archivePanel?.parentNode===host?archivePanel:null;
host.insertBefore(panel,insertionPoint);
const $=s=>panel.querySelector(s);
function rankFor(xp){return xp>=2000?'MASTER':xp>=1000?'ARCHITECT':xp>=500?'ANALYST':xp>=200?'TESTER':'EXPLORER';}
let state=readState();
function readState(){try{const raw=localStorage.getItem(STORE_KEY);if(!raw)return freshState();const c=validateState(JSON.parse(raw));return c.ok?c.state:freshState();}catch{return freshState();}}
function saveState(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));return true;}catch{return false;}}
function setStatus(msg,kind='info'){$('#cl-director-status').textContent=msg;$('#cl-director-status').dataset.kind=kind;}
function kindLabel(kind){return({'first-clear':'ПЕРВОЕ ПРОХОЖДЕНИЕ',recovery:'ВОССТАНОВЛЕНИЕ',leaner:'ЭФФЕКТИВНОСТЬ',faster:'СКОРОСТЬ',consistency:'СТАБИЛЬНОСТЬ'})[kind]||'ИССЛЕДОВАНИЕ';}
function shareLinks(c){const invitation=createInvitation(c),u=invitation.ok?invitation.url:'https://osgard.world/games/cascade-lab/',txt='CASCADE LAB / '+c.title+'. Цель: '+c.goalText+'. Ссылка открывает тот же контракт локально на устройстве друга: '+u,e=encodeURIComponent(txt),eu=encodeURIComponent(u);return[['Telegram','https://t.me/share/url?url='+eu+'&text='+e],['WhatsApp','https://wa.me/?text='+e],['VK','https://vk.com/share.php?url='+eu+'&title='+encodeURIComponent(c.title)],['X','https://twitter.com/intent/tweet?url='+eu+'&text='+encodeURIComponent(c.title+' — '+c.goalText)],['LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+eu]];}
function notifyPortalShare(url,method){
 try{
  if(!window.parent||window.parent===window)return;
  const target=new URL(url);
  const code=target.searchParams.get('og_ref')||'';
  const message={type:'osgard:game-lifecycle',game:'cascade-lab',state:'share_created',at:Date.now(),flowType:'friend-invite',shareMethod:method};
  if(/^og_[a-f0-9]{8}$/.test(code))message.referralCode=code;
  window.parent.postMessage(message,window.location.origin);
 }catch{/* Sharing must work when the game is standalone or embedded elsewhere. */}
}
function copyInvitation(c){const result=createInvitation(c);if(!result.ok){setStatus(result.reason,'error');return;}if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){navigator.clipboard.writeText(result.url).then(()=>{notifyPortalShare(result.url,'clipboard');setStatus('Ссылка на тот же контракт скопирована. Она действует 30 дней и не переносит твои личные результаты.','info');}).catch(()=>{if(window.prompt)window.prompt('Скопируй приглашение в контракт:',result.url);setStatus('Если ссылка не скопировалась автоматически, скопируй её из окна.','info');});}else if(window.prompt){window.prompt('Скопируй приглашение в контракт:',result.url);setStatus('Ссылка подготовлена. Передача не означает подтверждённое прохождение.','info');}else setStatus('Не удалось открыть копирование. Используй одну из кнопок соцсетей.','error');}
function addShares(root,c){const row=el('div','cl-director-share');row.append(el('span','','Передать именно это испытание (срок 30 дней):'));row.append(btn('Скопировать ссылку','copy-invite','cl-director-button'));for(const [name,href] of shareLinks(c)){const a=el('a','',name+' ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}root.append(row);}
function openProtocol(id){const currentLevel=Number(document.querySelector('#chamberLabel')?.textContent||0),target=document.querySelector('[data-level="'+id+'"]');if(!target){setStatus('Не найден элемент протокола. Открой список уровней вручную.','error');return;}if(currentLevel!==id)target.click();window.setTimeout(()=>{const node=document.querySelector('.stage-layout')||document.querySelector('#levelList')||document.querySelector('#canvas');if(node&&node.scrollIntoView)node.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});},120);setStatus('Открываем протокол '+String(id).padStart(2,'0')+'. Витрину OSGARD можно пропустить и вернуться к испытанию.','info');}
function addHistory(c){state.history=[c,...state.history.filter(x=>x.id!==c.id)].slice(0,MAX_HISTORY);}
function accept(id){if(state.active&&state.active.status==='active'){setStatus('Сначала заверши или закрой текущий контракт.','error');return;}const rec=buildRecommendations(engine.getRuns(),5).find(x=>x.id===id),c=createContract(rec);if(!c){setStatus('Контракт изменился или не прошёл проверку. Обнови рекомендации.','error');return;}state.active=c;setStatus(saveState()?'Контракт принят. Проверь одну цель за запуск.':'Браузер блокирует сохранение; контракт действует до закрытия вкладки.','info');render();}
function exportArchive(){const data={schema:SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),localOnly:true,uploaded:false,xp:state.xp,active:state.active,history:state.history},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cascade-lab-mission-director-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);setStatus('Летопись подготовлена локально; файл не отправлялся на сервер.','info');}
function renderInvitation(){const root=$('#cl-director-invitation'),body=root.querySelector('div');body.replaceChildren();if(!incomingInvitation&&!incomingInvitationError){root.hidden=true;return;}root.hidden=false;body.append(el('p','cl-director-eyebrow','OSGARD PLAY / ПРИГЛАШЕНИЕ НА ИСПЫТАНИЕ'));if(incomingInvitation){const invite=incomingInvitation;const title=el('h4','',invite.title);title.id='cl-director-invite-title';body.append(title,el('p','',invite.goalText),el('p','','Протокол '+String(invite.levelId).padStart(2,'0')+' · тип «'+kindLabel(invite.kind)+'» · действует до '+new Date(invite.expiresAt).toLocaleDateString('ru-RU')+'.'),el('p','','Это копия условия испытания, не результат друга. Твои результаты, Research XP и история останутся на этом устройстве.')) ;inboundAccept.disabled=Boolean(state.active&&state.active.status==='active');inboundAccept.textContent=inboundAccept.disabled?'Сначала заверши текущий контракт':'Принять и открыть протокол ↗';inboundDismiss.hidden=false;}else{const title=el('h4','','Приглашение не принято');title.id='cl-director-invite-title';body.append(title,el('p','',incomingInvitationError),el('p','','Ссылка не загружает код и не отправляет данные на сервер. Попроси создать новое приглашение.'));inboundAccept.hidden=true;inboundDismiss.hidden=false;}}
function clearInvitationFromAddress(){try{const u=new URL(window.location.href);u.searchParams.delete('clmd');window.history.replaceState(null,'',u.pathname+(u.search?'?'+u.searchParams.toString():'')+u.hash);}catch{}}
function acceptIncomingInvitation(){if(!incomingInvitation)return;if(state.active&&state.active.status==='active'){setStatus('Сначала заверши текущий контракт или откажись от него; чужое приглашение не заменяет твой прогресс.','error');return;}const created=createContractFromInvitation(incomingInvitation,{now:new Date().toISOString()});if(!created.ok){incomingInvitationError=created.reason;incomingInvitation=null;clearInvitationFromAddress();render();setStatus(created.reason,'error');return;}state.active=created.contract;incomingInvitation=null;incomingInvitationError='';clearInvitationFromAddress();const saved=saveState();render();setStatus(saved?'Контракт принят. Открываем протокол; результаты будут записаны только в этом браузере.':'Контракт принят в текущей вкладке, но браузер не подтвердил сохранение.','info');openProtocol(created.contract.levelId);}
function dismissInvitation(){incomingInvitation=null;incomingInvitationError='';clearInvitationFromAddress();render();setStatus('Приглашение скрыто. Твой текущий прогресс не изменён.','info');}
function renderCurrent(){const root=$('#cl-director-current');root.replaceChildren();const c=state.active;if(!c||c.status!=='active'){root.hidden=true;return;}root.hidden=false;const left=el('div','');left.append(el('p','cl-director-eyebrow','АКТИВНЫЙ КОНТРАКТ / ПРОТОКОЛ '+String(c.levelId).padStart(2,'0')),el('h4','',c.title),el('p','',c.goalText),el('p','',c.instruction),el('p','','Попытки: '+c.attempts.length+' из '+MAX_ATTEMPTS+'. '+c.reason));const actions=el('div','cl-director-actions');actions.append(btn('Открыть протокол ↗','open-active','cl-director-button primary'),btn('Экспортировать летопись ↓','export','cl-director-button'),btn('Отказаться от контракта','abandon','cl-director-button'));left.append(actions);addShares(left,c);const right=el('div','cl-director-progress');right.append(el('div','cl-director-progress-row','ПРОГРЕСС КОНТРАКТА'));const bar=el('div','cl-director-track'),fill=el('span','');fill.style.width=(c.kind==='consistency'?Math.min(100,c.streak*50):c.progress*100)+'%';bar.append(fill);right.append(bar,el('div','cl-director-progress-row','Попытки: '+c.attempts.length+' / '+MAX_ATTEMPTS),el('div','cl-director-progress-row',c.kind==='consistency'?'Успешная серия: '+c.streak+' / 2':c.progress?'Цель достигнута':'Цель ещё не достигнута'),el('div','cl-director-progress-row','За выполнение: +100 XP'));root.append(left,right);}
function renderRecommendations(){const root=$('#cl-director-grid');root.replaceChildren();$('#cl-director-run-count').textContent=campaignRuns(engine.getRuns()).length+' ЗАМЕРОВ';if(state.active&&state.active.status==='active'){root.append(el('p','cl-director-empty','Сначала выполни текущий контракт или откажись от него. Новые предложения появятся после этого.'));return;}for(const c of buildRecommendations(engine.getRuns(),3)){const card=el('article','cl-director-card');card.dataset.kind=c.kind;const top=el('div','cl-director-card-top');top.append(el('span','cl-director-label','ПРОТОКОЛ '+String(c.levelId).padStart(2,'0')),el('span','cl-director-kind',kindLabel(c.kind)));const actions=el('div','cl-director-actions');actions.append(btn('Принять контракт','accept:'+c.id,'cl-director-button primary'));card.append(top,el('h4','',c.title),el('p','',c.reason),el('p','cl-director-goal',c.goalText),el('p','',c.instruction),actions);root.append(card);}}
function renderHistory(){const root=$('#cl-director-history'),rows=$('#cl-director-history-rows');rows.replaceChildren();if(!state.history.length){root.hidden=true;return;}root.hidden=false;for(const c of state.history.slice(0,8)){const row=el('div','cl-director-history-row'),copy=el('div','');copy.append(el('strong','',c.title),el('small','','Протокол '+String(c.levelId).padStart(2,'0')+' · '+c.attempts.length+' попыток · '+new Date(c.createdAt).toLocaleDateString('ru-RU')));row.append(copy,el('span','cl-director-kind',c.status==='complete'?'ВЫПОЛНЕНО':'ЗАКРЫТО'));rows.append(row);}}
function render(){$('#cl-director-xp').textContent=String(state.xp);$('#cl-director-rank').textContent=rankFor(state.xp);renderInvitation();renderCurrent();renderRecommendations();renderHistory();}
function onRunFinished(event){if(!state.active||state.active.status!=='active'){render();return;}const d=event&&event.detail||{},stamp=d.at&&Number.isFinite(Date.parse(d.at))?new Date(d.at).toISOString():'';const r=engine.getRuns().find(x=>x.levelId===Number(d.levelId)&&x.status===d.status&&stamp&&x.at===stamp);if(!r){setStatus('Журнал ещё не подтвердил ID запуска; прогресс не засчитан.','error');return;}const result=observeContract(state.active,r);if(!result.applied){render();return;}if(result.completed){state.xp=clamp(state.xp+result.xpAward,0,1000000);addHistory(result.contract);state.active=null;setStatus('Контракт выполнен. +100 Research XP. Это локальный прогресс, не денежная награда.','info');}else if(result.contract.status==='expired'){addHistory(result.contract);state.active=null;setStatus('Контракт закрыт после шести попыток. История осталась в летописи.','info');}else{state.active=result.contract;setStatus(result.reason+' '+result.contract.attempts.length+' / '+MAX_ATTEMPTS+' попыток.','info');}if(!saveState())setStatus('Браузер не подтвердил запись в localStorage.','error');render();}
panel.addEventListener('click',event=>{const node=event.target instanceof Element?event.target.closest('[data-action]'):null;if(!node)return;const a=node.dataset.action||'';if(a==='copy-invite'&&state.active){copyInvitation(state.active);return;}if(a==='accept-invite'){acceptIncomingInvitation();return;}if(a==='dismiss-invite'){dismissInvitation();return;}if(a.startsWith('accept:')){accept(a.slice(7));return;}if(a==='open-active'&&state.active){openProtocol(state.active.levelId);return;}if(a==='export'){exportArchive();return;}if(a==='abandon'&&state.active){if(!window.confirm('Закрыть текущий контракт? Его попытки останутся в летописи.'))return;state.active.status='expired';addHistory(state.active);state.active=null;saveState();setStatus('Контракт закрыт. История сохранена локально.','info');render();}});
window.addEventListener('cascade-lab:run-finished',onRunFinished);
window.addEventListener('storage',event=>{if(event.key===STORE_KEY){state=readState();render();}});
render();try{Object.defineProperty(window,'CASCADELAB024',{value:api,configurable:false,enumerable:false,writable:false});}catch{}
})();