import { DEFAULT_INPUTS, SCENARIOS, calculateScenario, calculateRequiredMonthlyVisitors, normalizeInputs } from '/games/monetization/model.js';

const GAME_REGISTRY = [
  {id:'null-shift',title:'NULL//SHIFT',route:'/games/null-shift-godot/',kind:'TACTICAL / WEBGL'},
  {id:'time',title:'Империя времени',route:'/games/time',kind:'STRATEGY'},
  {id:'swarm',title:'SWARM',route:'/games/swarm/',kind:'CO-OP'},
  {id:'inherit',title:'INHERIT',route:'/games/inherit/',kind:'LIVING WORLD'},
  {id:'remix',title:'REMIX',route:'/games/remix/',kind:'CHALLENGE'},
  {id:'civic-cascade',title:'CIVIC CASCADE',route:'/games/civic-cascade/',kind:'CRISIS STRATEGY'},
  {id:'patina',title:'PATINA Atelier',route:'/games/patina/',kind:'RESTORATION'},
  {id:'signal-run',title:'SIGNAL RUN',route:'/games/signal-run/',kind:'ARCADE'},
  {id:'cascade-lab',title:'CASCADE LAB',route:'/games/cascade-lab/',kind:'PHYSICS PUZZLE'},
  {id:'afterimage-run',title:'AFTERIMAGE//RUN',route:'/games/afterimage-run/',kind:'SPEEDRUN'},
  {id:'aether-grid',title:'AETHER GRID',route:'/games/aether-grid/',kind:'LOGIC PUZZLE'}
];
const PROJECTS = [
  {id:'osgardbewworld',name:'OSGARD BEW WORLD',host:'https://osgardbewworld.com/',role:'Разработка продуктов'},
  {id:'o2system',name:'O2 SYSTEM',host:'https://o2system.art/',role:'Учёт для обменников'},
  {id:'senjorio',name:'SENJORIO',host:'https://senjorio.com/',role:'Премиальное такси'},
  {id:'superday',name:'SUPER DAY',host:'https://superday.run/',role:'Карта и планировщик'},
  {id:'marcosa',name:'MARCOSA',host:'https://marcosa.club/',role:'Социальная сеть'},
  {id:'myosa',name:'MYOSA',host:'https://myosa.world/',role:'AI-платформа'},
  {id:'gold-glamour',name:'GOLD GLAMOUR',host:'https://gold-glamour.online/',role:'Премиальные услуги'},
  {id:'gardvpn',name:'GARD VPN',host:'https://gardvpn.is/',role:'VPN-сервис'},
  {id:'osgardos',name:'OSGARD OS',host:'https://osgardos.com/',role:'Развитие бизнеса'},
  {id:'osgardvanguard',name:'OSGARD VANGUARD STUDIO',host:'https://osgardvanguard.studio/',role:'Создание видео'}
];
const PLATFORM_CHECKS = [
  ...GAME_REGISTRY.map(game=>({id:'game-'+game.id,label:game.title,path:game.route,group:'Игровая точка входа',optional:false})),
  {id:'games-hub',label:'OSGARD PLAY — каталог',path:'/games/',group:'Каталог',optional:false},
  {id:'entertainment',label:'OSGARD ENTERTAINMENT',path:'/entertainment/',group:'Каталог',optional:false},
  {id:'monetization',label:'Финансовая модель',path:'/games/monetization/',group:'Коммерция',optional:false},
  {id:'model-engine',label:'Общий модуль модели',path:'/games/monetization/model.js',group:'Коммерция',optional:false,expectedType:'javascript'},
  {id:'campaign-manager',label:'Менеджер кампаний',path:'/games/admin/campaigns/',group:'Коммерция',optional:false},
  {id:'commerce-config',label:'Конфигурация Commerce API',path:'/games/commerce-config.json',group:'Интеграция',optional:false,kind:'json'},
  {id:'commerce-health',label:'Commerce API healthz',path:'/commerce-api/healthz',group:'Интеграция',optional:true,kind:'commerce-health'},
  {id:'operations',label:'Операторская диагностика',path:'/games/operations/',group:'Качество',optional:false},
  {id:'growth-studio',label:'Growth Studio',path:'/games/growth-studio/',group:'Рост',optional:false},
  {id:'partners',label:'Партнёрский каталог',path:'/games/partners/',group:'Рост',optional:false},
  {id:'ecosystem',label:'Каталог OSGARD',path:'/games/ecosystem/',group:'Экосистема',optional:false},
  {id:'command-deck',label:'OSGARD Command Deck',path:'/games/command-deck/',group:'Экосистема',optional:false}
];
const $ = selector => document.querySelector(selector);
const usd = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number.isFinite(Number(value))?Number(value):0);
const count = value => new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number.isFinite(Number(value))?Number(value):0);
const node = (tag,className,text) => { const el=document.createElement(tag); if(className)el.className=className; if(text!==undefined)el.textContent=String(text); return el; };
const option = (value,text) => { const el=node('option','',text); el.value=value; return el; };
let lastAudit = null;
let lastModel = null;

function renderGameCards(results=new Map()){
  const grid=$('#game-grid');grid.replaceChildren();
  for(const [index,game] of GAME_REGISTRY.entries()){
    const result=results.get('game-'+game.id);
    const card=node('article','game-card');
    const meta=node('div','game-meta');meta.append(node('span','game-number',String(index+1).padStart(2,'0')),node('span','',game.kind));card.append(meta);
    card.append(node('h3','',game.title),node('p','',game.route));
    const footer=node('div','game-footer');const badge=node('span','game-status',result?result.statusLabel:'НЕ ПРОВЕРЕНА');badge.dataset.state=result?result.state:'idle';footer.append(badge);
    const link=node('a','game-open','Открыть ↗');link.href=game.route;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Открыть '+game.title+' в отдельной вкладке');footer.append(link);card.append(footer);grid.append(card);
  }
  $('#game-count').textContent=String(GAME_REGISTRY.length);
}

function renderChecks(results){
  const body=$('#check-results');body.replaceChildren();
  if(!results.length){const row=node('tr');const cell=node('td','empty','Нет результатов');cell.colSpan=5;row.append(cell);body.append(row);return;}
  for(const result of results){
    const row=node('tr');row.append(node('td','',result.label),node('td','route-path',result.path));
    const statusCell=node('td');const badge=node('span','row-status',result.statusLabel);badge.dataset.state=result.state;statusCell.append(badge);row.append(statusCell);
    row.append(node('td','',result.httpStatus===null?'—':String(result.httpStatus)));
    row.append(node('td','detail-cell',result.detail+(result.latencyMs===null?'':' · '+result.latencyMs+' мс')));body.append(row);
  }
}

async function checkRoute(item){
  const started=performance.now();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
  let response=null;
  try{
    const wantsBody=item.kind==='json'||item.kind==='commerce-health';
    response=await fetch(item.path,{method:wantsBody?'GET':'HEAD',cache:'no-store',credentials:'omit',redirect:'follow',signal:controller.signal});
    if(!wantsBody&&(response.status===405||response.status===501)){
      response=await fetch(item.path,{method:'GET',cache:'no-store',credentials:'omit',redirect:'follow',signal:controller.signal});
    }
    const latencyMs=Math.max(0,Math.round(performance.now()-started));
    const contentType=response.headers.get('content-type')||'';
    let detail='HTTP-маршрут отвечает';let state=response.ok?'ok':'fail';let statusLabel=response.ok?'ДОСТУПЕН':'ОШИБКА';
    if(item.kind==='json'&&response.ok){
      let data=null;try{data=await response.json()}catch{}
      if(!data||typeof data.apiBaseUrl!=='string'){state='fail';statusLabel='НЕВЕРНЫЙ JSON';detail='Не удалось разобрать безопасную конфигурацию'}
      else if(data.apiBaseUrl.trim()===''){state='warn';statusLabel='SAFE FALLBACK';detail='API URL пуст — платёжный API не считается активным'}
      else {detail='Публичный API base задан; проверка платежей и авторизации отдельная'}
    }else if(item.kind==='commerce-health'){
      let data=null;try{data=await response.json()}catch{}
      if(response.ok&&data&&data.service==='osgard-commerce-api'&&data.databaseReady===true){state='ok';statusLabel='READY';detail='Сервис и база подтверждены ответом healthz'}
      else {state='warn';statusLabel='НЕ ПОДКЛЮЧЁН';detail='Не подтверждены service/databaseReady; опциональная интеграция не активна'}
    }else if(response.ok&&item.expectedType==='javascript'&&!/javascript|ecmascript/i.test(contentType)){
      state='warn';statusLabel='ТИП НЕОЖИДАН';detail='HTTP успешен, но Content-Type не указывает на JavaScript'
    }else if(!response.ok&&item.optional){state='warn';statusLabel='НЕ ПОДКЛЮЧЁН';detail='Опциональный сервис не ответил; основные игры не блокируются'}
    if(!wantsBody)try{await response.body?.cancel()}catch{}
    return {...item,state,statusLabel,httpStatus:response.status,latencyMs,contentType,detail};
  }catch(error){
    const aborted=error&&error.name==='AbortError';
    return {...item,state:item.optional?'warn':'fail',statusLabel:item.optional?'НЕ ПОДКЛЮЧЁН':aborted?'TIMEOUT':'НЕДОСТУПЕН',httpStatus:null,latencyMs:Math.max(0,Math.round(performance.now()-started)),contentType:'',detail:item.optional?'Опциональная интеграция не ответила':aborted?'Превышен лимит ожидания 7 секунд':'Нет ответа от same-origin маршрута'};
  }finally{clearTimeout(timer)}
}

async function runAudit(){
  const button=$('#run-audit');button.disabled=true;$('#export-audit').disabled=true;
  $('#audit-state').textContent='Проверяю игровые точки входа и ключевую инфраструктуру…';$('#engine-status').textContent='ПРОВЕРКА ИДЁТ';
  const results=new Array(PLATFORM_CHECKS.length);let cursor=0;
  async function worker(){while(true){const index=cursor++;if(index>=PLATFORM_CHECKS.length)return;results[index]=await checkRoute(PLATFORM_CHECKS[index]);}}
  try{await Promise.all(Array.from({length:Math.min(4,PLATFORM_CHECKS.length)},()=>worker()));}
  catch(error){$('#audit-state').textContent='Проверка остановлена: '+(error instanceof Error?error.message:'неизвестная ошибка');button.disabled=false;return;}
  const required=results.filter(r=>!r.optional);const passed=required.filter(r=>r.state==='ok').length;const failures=required.filter(r=>r.state==='fail').length;const warnings=results.filter(r=>r.state==='warn').length;
  lastAudit={reportType:'osgard-play-command-deck-audit',schemaVersion:1,createdAt:new Date().toISOString(),scope:'same-origin HTTP route reachability only',analyticsSent:false,personalDataCollected:false,gameplayExecutionVerified:false,results};
  renderGameCards(new Map(results.filter(r=>r.id.startsWith('game-')).map(r=>[r.id,r])));renderChecks(results);
  $('#check-count').textContent=results.filter(r=>r.state==='ok').length+' / '+results.length;
  $('#routes-ready').textContent=passed+' / '+required.length;$('#routes-detail').textContent=failures===0?(warnings?warnings+' опциональных предупреждений':'Ошибок не обнаружено'):failures+' обязательных маршрута требуют внимания';
  const measured=results.filter(r=>r.id.startsWith('game-')).map(r=>r.latencyMs).filter(v=>v!==null);
  $('#routes-latency').textContent=measured.length?Math.round(measured.reduce((a,b)=>a+b,0)/measured.length)+' ms':'—';
  $('#audit-time').textContent=new Date(lastAudit.createdAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  $('#audit-state').textContent=failures===0?'Проверка завершена: '+passed+'/'+required.length+' обязательных маршрутов доступны. '+warnings+' предупреждений.':'Проверка завершена: '+failures+' обязательных маршрутов требуют внимания.';
  $('#engine-status').textContent=failures===0?(warnings?'МАРШРУТЫ OK / ОПЦИИ OFF':'ОСНОВНЫЕ МАРШРУТЫ OK'):'ТРЕБУЕТ ВНИМАНИЯ';
  $('#export-audit').disabled=false;button.disabled=false;
}
function downloadJson(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function readInputs(){
  const input={...DEFAULT_INPUTS};
  document.querySelectorAll('[data-input]').forEach(field=>{const key=field.dataset.input;const text=field.value.trim();if(text!==''){const value=Number(text);if(Number.isFinite(value))input[key]=value;}});
  return normalizeInputs(input);
}
function writeInputs(values){
  document.querySelectorAll('[data-input]').forEach(field=>{const key=field.dataset.input;if(Object.hasOwn(values,key))field.value=String(values[key]);});
}
function renderScenario(result,scenario){
  const card=node('article','scenario-card');card.dataset.scenario=scenario.id;card.append(node('span','scenario-name',scenario.label.toUpperCase()));
  card.append(node('h4','',usd(result.netOperatingUsd)),node('span','net','чистый результат / месяц'));
  const list=node('div','mini-list');
  for(const [label,value] of [
    ['Выручка всего',usd(result.totalRevenueUsd)],['Реклама',usd(result.adRevenueUsd)],['Покупки',usd(result.paidRevenueUsd)],
    ['Подписка',usd(result.subscriptionRevenueUsd)],['Услуги',usd(result.servicesRevenueUsd)],['Спонсоры',usd(result.sponsorRevenueUsd)],
    ['Посещения',count(result.visitors)],['Игровые старты',count(result.gameStarts)],['K-factor модели',Number(result.kFactor).toFixed(3)]
  ]){const row=node('div','mini-row');row.append(node('span','',label),node('b','',value));list.append(row);}
  card.append(list,node('p','scenario-foot',scenario.note+' · Расчёт, не факт'));return card;
}
function updateModel(){
  if(!SCENARIOS||!SCENARIOS.length)throw new Error('Финансовые сценарии не найдены');
  const input=readInputs();const results=SCENARIOS.map(scenario=>({scenario,result:calculateScenario(input,scenario.id)}));
  if(results.some(x=>!Number.isFinite(x.result.netOperatingUsd)||!Number.isFinite(x.result.totalRevenueUsd)))throw new Error('Модель вернула нечисловой результат');
  const required=calculateRequiredMonthlyVisitors(input,input.annualRevenueTargetUsd);
  lastModel={reportType:'osgard-play-commercial-model',schemaVersion:1,createdAt:new Date().toISOString(),dataType:'modelled-assumptions-not-live-metrics',currency:'USD',assumptions:input,scenarios:Object.fromEntries(results.map(x=>[x.scenario.id,x.result])),sensitivity:{trafficMinus25:calculateScenario({...input,monthlyVisitors:input.monthlyVisitors*.75},'base').netOperatingUsd,base:calculateScenario(input,'base').netOperatingUsd,trafficPlus25:calculateScenario({...input,monthlyVisitors:input.monthlyVisitors*1.25},'base').netOperatingUsd},requiredMonthlyVisitors:required,sourceModel:'/games/monetization/model.js'};
  const grid=$('#scenario-grid');grid.replaceChildren();for(const item of results)grid.append(renderScenario(item.result,item.scenario));
  $('#sensitivity-low').textContent=usd(lastModel.sensitivity.trafficMinus25);$('#sensitivity-base').textContent=usd(lastModel.sensitivity.base);$('#sensitivity-high').textContent=usd(lastModel.sensitivity.trafficPlus25);
  $('#required-visitors').textContent=required===null?'Не достигается':count(required);
  $('#target-note').textContent=required===null?'Текущие предпосылки не достигают целевой годовой выручки даже на лимите модели.':required===0?'Текущая модель уже покрывает цель без дополнительного трафика.':'Модельный месячный прямой трафик для годовой валовой цели '+usd(input.annualRevenueTargetUsd)+'.';
  $('#model-status').textContent='Пересчитано '+new Date(lastModel.createdAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})+'. Все значения локальные.';
}
function resetModel(){writeInputs(DEFAULT_INPUTS);updateModel();}
function renderProjectTools(){
  const projectSelect=$('#project-select');const gameSelect=$('#source-game');const list=$('#owned-list');
  for(const project of PROJECTS){projectSelect.append(option(project.id,project.name));const row=node('div','owned-project');const copy=node('span');copy.append(node('strong','',project.name),node('small','',project.role));row.append(copy,node('small','',new URL(project.host).hostname));list.append(row);}
  for(const game of GAME_REGISTRY)gameSelect.append(option(game.id,game.title));
}
function buildCampaignLink(){
  const project=PROJECTS.find(p=>p.id===$('#project-select').value);const game=GAME_REGISTRY.find(g=>g.id===$('#source-game').value);const campaign=$('#campaign-slug').value.trim();
  if(!project||!game||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(campaign))throw new Error('Выберите проект и игру; код используйте в формате a-z, 0-9 и дефисов.');
  const url=new URL(project.host);url.searchParams.set('utm_source','osgard_play');url.searchParams.set('utm_medium','owned_cross_promo');url.searchParams.set('utm_campaign',campaign);url.searchParams.set('utm_content',project.id);url.searchParams.set('og_game',game.id);
  $('#campaign-url').value=url.toString();$('#copy-campaign').disabled=false;$('#campaign-status').textContent='Ссылка собрана для '+project.name+' из игры '+game.title+'. UTM не подтверждает конверсию без аналитики сайта назначения.';
  return url.toString();
}
async function copyCampaign(){
  const input=$('#campaign-url');if(!input.value)return;
  try{await navigator.clipboard.writeText(input.value);$('#campaign-status').textContent='Ссылка скопирована. Сетевые запросы не выполнялись.';}
  catch{input.focus();input.select();const ok=document.execCommand('copy');$('#campaign-status').textContent=ok?'Ссылка скопирована.':'Автокопирование недоступно — выделите поле и скопируйте ссылку.';}
}
function showModelError(error){$('#model-status').textContent='Модель недоступна: '+(error instanceof Error?error.message:'ошибка загрузки')+'. Проверьте общий модуль и обновите страницу.';}
function bind(){
  $('#run-audit').addEventListener('click',()=>{void runAudit();});
  $('#export-audit').addEventListener('click',()=>{if(lastAudit)downloadJson('osgard-command-deck-audit.json',lastAudit);});
  $('#assumptions-form').addEventListener('submit',event=>{event.preventDefault();try{updateModel();}catch(error){showModelError(error);}});
  $('#assumptions-form').addEventListener('input',()=>{try{updateModel();}catch(error){showModelError(error);}});
  $('#reset-model').addEventListener('click',resetModel);
  $('#export-model').addEventListener('click',()=>{if(lastModel)downloadJson('osgard-commercial-scenarios.json',lastModel);});
  $('#campaign-link-form').addEventListener('submit',event=>{event.preventDefault();try{buildCampaignLink();}catch(error){$('#campaign-status').textContent=error instanceof Error?error.message:'Не удалось собрать ссылку';}});
  $('#copy-campaign').addEventListener('click',()=>{void copyCampaign();});
}
renderGameCards();renderProjectTools();writeInputs(DEFAULT_INPUTS);bind();
try{updateModel();}catch(error){showModelError(error);}
