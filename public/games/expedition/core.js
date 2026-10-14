(() => {
  'use strict';
  const GAMES = Object.freeze([
    {id:'null-shift',title:'NULL//SHIFT',genre:'Тактика',short:'Точное движение и ограниченный ресурс.',href:'/games/null-shift-godot/'},
    {id:'time',title:'Империя времени',genre:'Стратегия',short:'Строй город и управляй последствиями.',href:'/games/time'},
    {id:'swarm',title:'SWARM',genre:'Аркада',short:'Решайся быстро, держи ритм.',href:'/games/swarm/'},
    {id:'inherit',title:'INHERIT',genre:'История',short:'Продолжи семейную летопись.',href:'/games/inherit/'},
    {id:'remix',title:'REMIX',genre:'Эксперименты',short:'Меняй правила и ищи новый исход.',href:'/games/remix/'},
    {id:'civic-cascade',title:'CIVIC CASCADE',genre:'Системы',short:'Принимай решения под давлением.',href:'/games/civic-cascade/'},
    {id:'patina',title:'PATINA Atelier',genre:'Творчество',short:'Создавай собственные визуальные миры.',href:'/games/patina/'},
    {id:'signal-run',title:'SIGNAL RUN',genre:'Реакция',short:'Проходи сигнал за сигналом.',href:'/games/signal-run/'},
    {id:'cascade-lab',title:'CASCADE LAB',genre:'Физика',short:'Собирай и проверяй причинные цепочки.',href:'/games/cascade-lab/'},
    {id:'afterimage-run',title:'AFTERIMAGE//RUN',genre:'Спидран',short:'Побей свой маршрут и призрака.',href:'/games/afterimage-run/'},
    {id:'aether-grid',title:'AETHER GRID',genre:'Логика',short:'Соедини источник с ядром.',href:'/games/aether-grid/'}
  ]);
  const THEMES = Object.freeze({
    discovery:{label:'Путешествие',description:'Разноплановый маршрут по мирам OSGARD.'},
    night:{label:'Ночная операция',description:'Мрачные и напряжённые игровые этапы.'},
    systems:{label:'Системный вызов',description:'Стратегия, причинность и логика.'},
    arcade:{label:'Реакция и скорость',description:'Короткие раунды и быстрые решения.'}
  });
  const GAME_MAP = new Map(GAMES.map(game=>[game.id,game]));
  function normalizeTheme(value){const theme=String(value||'discovery');return Object.prototype.hasOwnProperty.call(THEMES,theme)?theme:'discovery'}
  function routeCode(ids,theme){
    const input=normalizeTheme(theme)+'|'+ids.join('|');let hash=2166136261;
    for(let index=0;index<input.length;index++){hash^=input.charCodeAt(index);hash=Math.imul(hash,16777619)}
    return (hash>>>0).toString(16).padStart(8,'0');
  }
  function parseRoute(value,theme){
    const raw=Array.isArray(value)?value:typeof value==='string'?value.split(','):[];
    const ids=raw.map(id=>String(id||'').trim().toLowerCase());
    if(ids.length<2||ids.length>5||ids.some(id=>!GAME_MAP.has(id))||new Set(ids).size!==ids.length)return null;
    const normalizedTheme=normalizeTheme(theme);
    return Object.freeze({ids:Object.freeze(ids),theme:normalizedTheme,code:routeCode(ids,normalizedTheme)});
  }
  function normalizeProgress(route,raw){
    const valid=raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.schemaVersion===1&&raw.routeCode===route.code;
    const input=valid?raw:{},done=Array.isArray(input.completedIds)?input.completedIds:[],completedIds=[];
    for(let index=0;index<route.ids.length;index++){if(done[index]===route.ids[index])completedIds.push(route.ids[index]);else break}
    const sessionIds=Array.isArray(input.sessionIds)?Array.from(new Set(input.sessionIds.filter(value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(value)))).slice(-100):[];
    return {schemaVersion:1,routeCode:route.code,completedIds,sessionIds,nextIndex:completedIds.length,complete:completedIds.length===route.ids.length};
  }
  function advanceProgress(route,raw,gameId,sessionId){
    const state=normalizeProgress(route,raw);
    if(typeof sessionId!=='string'||!/^[a-zA-Z0-9:_-]{1,160}$/.test(sessionId))return {changed:false,reason:'session-invalid',state};
    if(state.sessionIds.includes(sessionId))return {changed:false,reason:'session-duplicate',state};
    if(state.complete)return {changed:false,reason:'route-complete',state};
    if(route.ids[state.nextIndex]!==gameId)return {changed:false,reason:'wrong-stage',state};
    const completedIds=[...state.completedIds,gameId],sessionIds=[...state.sessionIds,sessionId].slice(-100);
    const next={schemaVersion:1,routeCode:route.code,completedIds,sessionIds,nextIndex:completedIds.length,complete:completedIds.length===route.ids.length};
    return {changed:true,reason:'stage-completed',state:next,completedGame:gameId,stageIndex:state.nextIndex};
  }
  function routePageUrl(route,origin){
    const url=new URL('/games/expedition/',origin||'https://osgard.world');
    url.searchParams.set('route',route.ids.join(','));url.searchParams.set('theme',route.theme);
    url.searchParams.set('utm_source','osgard_play');url.searchParams.set('utm_medium','expedition');url.searchParams.set('utm_campaign','friend_route');url.searchParams.set('utm_content',route.code);
    return url.href;
  }
  function catalogUrl(route,origin){
    const url=new URL('/games/',origin||'https://osgard.world');
    url.searchParams.set('og_expedition',route.ids.join(','));url.searchParams.set('og_expedition_theme',route.theme);url.searchParams.set('og_expedition_code',route.code);
    url.searchParams.set('utm_source','osgard_play');url.searchParams.set('utm_medium','expedition');url.searchParams.set('utm_campaign','friend_route');url.searchParams.set('utm_content',route.code);
    return url.href;
  }
  window.OSGARDExpeditionCore=Object.freeze({GAMES,THEMES,normalizeTheme,routeCode,parseRoute,normalizeProgress,advanceProgress,routePageUrl,catalogUrl});
})();