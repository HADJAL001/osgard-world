(() => {
'use strict';
const core=window.OSGARDExpeditionCore;
if(!core)return;
const $=selector=>document.querySelector(selector);
const OPTIONS=$('#game-options'),PREVIEW=$('#stage-preview'),STATUS=$('#exp-status'),PANEL=$('#share-panel'),SHARESTATUS=$('#share-status');
const THEME=$('#route-theme'),COUNT=$('#selection-count'),PREVIEWLENGTH=$('#preview-length');
const STORE_KEY='osgard.games.expedition.saved.v1';
const DEFAULT_IDS=['null-shift','civic-cascade','signal-run'];
let selected=DEFAULT_IDS.slice(),currentRoute=null;
function randomHex(bytes){const data=new Uint8Array(bytes);try{crypto.getRandomValues(data)}catch{for(let i=0;i<data.length;i++)data[i]=Math.floor(Math.random()*256)}return Array.from(data,b=>b.toString(16).padStart(2,'0')).join('')}
function eventSession(){try{let id=sessionStorage.getItem('osgard.games.expedition-session.v1');if(/^session_[a-f0-9]{24}$/.test(id||''))return id;id='session_'+randomHex(12);sessionStorage.setItem('osgard.games.expedition-session.v1',id);return id}catch{return 'session_'+randomHex(12)}}
function track(name,route,source){try{if(localStorage.getItem('osgard.games.analytics-consent.v1')!=='yes')return;const queue=window.OSGARD_CONSENTED_ANALYTICS;if(!queue||typeof queue.enqueue!=='function')return;void queue.enqueue({eventId:'evt_'+randomHex(12),name,sessionId:eventSession(),gameId:route?.ids?.[0]||'unknown',source:String(source||'expedition-builder').slice(0,80),path:location.pathname,durationSeconds:0})}catch{}}
function readSaved(){try{const value=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');if(!Array.isArray(value))return [];return value.slice(0,5).map(item=>core.parseRoute(item?.ids,item?.theme)).filter(Boolean)}catch{return []}}
function saveRoute(route){try{const rows=[{ids:route.ids,theme:route.theme,code:route.code},...readSaved().filter(item=>item.code!==route.code).map(item=>({ids:item.ids,theme:item.theme,code:item.code}))].slice(0,5);localStorage.setItem(STORE_KEY,JSON.stringify(rows))}catch{}renderSaved()}
function renderOptions(){
 OPTIONS.replaceChildren();
 for(const game of core.GAMES){
  const label=document.createElement('label');label.className='exp-game-option';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=game.id;checkbox.checked=selected.includes(game.id);checkbox.setAttribute('aria-label','Добавить '+game.title);
  const copy=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small'),tag=document.createElement('span');
  title.textContent=game.title;detail.textContent=game.short;tag.className='exp-option-tag';tag.textContent=game.genre.toUpperCase();copy.append(title,detail);label.append(checkbox,copy,tag);
  checkbox.addEventListener('change',()=>{
   if(checkbox.checked){if(selected.length>=5){checkbox.checked=false;STATUS.textContent='В одной экспедиции может быть не больше пяти этапов.';return}selected=[...selected,game.id]}
   else selected=selected.filter(id=>id!==game.id);
   renderSelection();
   if(currentRoute&&selected.join(',')!==currentRoute.ids.join(',')){currentRoute=null;PANEL.hidden=true}
   STATUS.textContent=selected.length<2?'Добавь ещё один мир: минимум два этапа.':'Измени порядок стрелками, затем собери маршрут.';
  });
  OPTIONS.append(label);
 }
 renderSelection();
}
function move(id,delta){const index=selected.indexOf(id),next=index+delta;if(index<0||next<0||next>=selected.length)return;[selected[index],selected[next]]=[selected[next],selected[index]];currentRoute=null;PANEL.hidden=true;renderSelection()}
function renderSelection(){
 const chosen=selected.map(id=>core.GAMES.find(game=>game.id===id)).filter(Boolean);
 COUNT.textContent=String(selected.length).padStart(2,'0')+' / 05';PREVIEWLENGTH.textContent=String(selected.length).padStart(2,'0')+' STAGES';PREVIEW.replaceChildren();
 if(!chosen.length){const empty=document.createElement('li');empty.className='exp-muted';empty.textContent='Выбери два–пять игровых миров слева.';PREVIEW.append(empty);return}
 chosen.forEach((game,index)=>{
  const row=document.createElement('li');row.className='exp-stage';
  const no=document.createElement('span');no.className='exp-stage-no';no.textContent=String(index+1).padStart(2,'0');
  const details=document.createElement('span'),title=document.createElement('strong'),genre=document.createElement('small');title.className='exp-stage-title';title.textContent=game.title;genre.className='exp-stage-detail';genre.textContent=game.genre+' · '+game.short;details.append(title,genre);
  const tools=document.createElement('span');tools.className='exp-stage-tools';
  const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='Переместить этап вверх';up.setAttribute('aria-label','Переместить '+game.title+' вверх');up.disabled=index===0;up.addEventListener('click',()=>move(game.id,-1));
  const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='Переместить этап вниз';down.setAttribute('aria-label','Переместить '+game.title+' вниз');down.disabled=index===chosen.length-1;down.addEventListener('click',()=>move(game.id,1));
  tools.append(up,down);row.append(no,details,tools);PREVIEW.append(row);
 });
}
function saveStatus(message){STATUS.textContent=message;SHARESTATUS.textContent=message}
function routeLink(route){return core.routePageUrl(route,location.origin)}
function configureShare(route){
 const shareUrl=routeLink(route),launchUrl=core.catalogUrl(route,location.origin);
 $('#route-code').textContent=route.code.toUpperCase();$('#route-url').value=shareUrl;$('#open-catalog').href=launchUrl;
 const title='OSGARD PLAY · Экспедиция '+route.code.toUpperCase();
 const message='Пойдём пройдём этот маршрут в OSGARD PLAY: '+route.ids.map(id=>core.GAMES.find(game=>game.id===id).title).join(' → ');
 const encodedUrl=encodeURIComponent(shareUrl),encodedText=encodeURIComponent(message);
 $('#share-telegram').href='https://t.me/share/url?url='+encodedUrl+'&text='+encodedText;
 $('#share-whatsapp').href='https://wa.me/?text='+encodeURIComponent(message+' '+shareUrl);
 $('#share-vk').href='https://vk.com/share.php?url='+encodedUrl+'&title='+encodeURIComponent(title)+'&comment='+encodedText;
 $('#share-x').href='https://twitter.com/intent/tweet?url='+encodedUrl+'&text='+encodedText;
 $('#share-facebook').href='https://www.facebook.com/sharer/sharer.php?u='+encodedUrl;
 $('#share-description').textContent=core.THEMES[route.theme].description+' Прогресс каждого игрока хранится отдельно на его устройстве.';
 const host=$('#share-stage-list');host.replaceChildren();
 route.ids.forEach((id,index)=>{const game=core.GAMES.find(item=>item.id===id),item=document.createElement('li');item.className='exp-stage';const no=document.createElement('span');no.className='exp-stage-no';no.textContent=String(index+1).padStart(2,'0');const content=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=game.title;detail.className='exp-stage-detail';detail.textContent=game.genre+' · '+game.short;content.append(name,detail);item.append(no,content);host.append(item)});
}
function buildRoute(options={}){const route=core.parseRoute(selected,THEME.value);if(!route){saveStatus('Для экспедиции нужны 2–5 разных игровых миров.');return null}currentRoute=route;configureShare(route);PANEL.hidden=false;saveRoute(route);if(options.record!==false)track('expedition_route_created',route,'expedition-builder:'+route.code);saveStatus('Экспедиция собрана. Сохрани ссылку или передай её другу.');return route}
function applyRoute(route){currentRoute=route;selected=route.ids.slice();THEME.value=route.theme;renderOptions();configureShare(route);PANEL.hidden=false;saveRoute(route)}
async function copyRoute(){if(!currentRoute)return;try{await navigator.clipboard.writeText(routeLink(currentRoute));SHARESTATUS.textContent='Ссылка на экспедицию скопирована. Она передаёт маршрут, а не чужой прогресс.'}catch{const input=$('#route-url');input.focus();input.select();SHARESTATUS.textContent='Автоматическое копирование недоступно. Ссылка выделена — нажми Ctrl+C или ⌘C.'}}
async function nativeShare(){
 if(!currentRoute)return;
 const url=routeLink(currentRoute),message='Пойдём пройдём экспедицию в OSGARD PLAY: '+currentRoute.ids.map(id=>core.GAMES.find(game=>game.id===id).title).join(' → ');
 try{if(typeof navigator.share!=='function'){await copyRoute();return}await navigator.share({title:'OSGARD PLAY · EXPEDITION',text:message,url});track('expedition_share_intent',currentRoute,'expedition-share:'+currentRoute.code+':system');SHARESTATUS.textContent='Окно отправки закрыто. Факт публикации не подтверждается автоматически.'}
 catch(error){if(error?.name==='AbortError'){SHARESTATUS.textContent='Отправка отменена. Никакая награда не начислялась.';return}SHARESTATUS.textContent='Не удалось открыть системную отправку. Выбери одну из соцсетей ниже.'}
}
function renderSaved(){
 const host=$('#saved-routes'),routes=readSaved();host.replaceChildren();
 if(!routes.length){const p=document.createElement('p');p.className='exp-muted';p.textContent='Пока нет сохранённых маршрутов.';host.append(p);return}
 routes.forEach(route=>{const row=document.createElement('div');row.className='exp-saved-route';const copy=document.createElement('span'),title=document.createElement('strong'),desc=document.createElement('small');title.textContent=route.code.toUpperCase();desc.textContent=route.ids.map(id=>core.GAMES.find(game=>game.id===id).title).join(' → ');copy.append(title,desc);const button=document.createElement('button');button.type='button';button.className='exp-btn';button.textContent='Загрузить';button.addEventListener('click',()=>applyRoute(route));row.append(copy,button);host.append(row)});
}
$('#build-route').addEventListener('click',()=>buildRoute({record:true}));
$('#reset-route').addEventListener('click',()=>{selected=[];currentRoute=null;PANEL.hidden=true;renderOptions();saveStatus('Выбор очищен. Добавь два–пять игровых миров.')});
THEME.addEventListener('change',()=>{currentRoute=null;PANEL.hidden=true;renderSelection();STATUS.textContent='Настроение изменено. Собери обновлённый маршрут.'});
$('#copy-route').addEventListener('click',()=>void copyRoute());$('#native-share').addEventListener('click',()=>void nativeShare());
['share-telegram','share-whatsapp','share-vk','share-x','share-facebook'].forEach(id=>$('#'+id).addEventListener('click',()=>{if(!currentRoute)return;track('expedition_share_intent',currentRoute,'expedition-share:'+currentRoute.code+':'+id.replace('share-',''));SHARESTATUS.textContent='Открыта форма отправки. OSGARD не получает подтверждение, что пост опубликован.'}));
const params=new URLSearchParams(location.search),incoming=core.parseRoute(params.get('route')||'',params.get('theme')||'discovery');
if(incoming){applyRoute(incoming);if(params.get('utm_campaign')==='friend_route')track('expedition_link_opened',incoming,'expedition-builder:'+incoming.code);STATUS.textContent='Друг передал тебе готовый маршрут. Нажми «Открыть маршрут в PLAY», чтобы начать первый этап.'}
else{renderOptions();renderSaved()}
})();