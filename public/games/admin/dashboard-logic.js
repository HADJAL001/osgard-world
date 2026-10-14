(function(root){
  'use strict';
  const labels=Object.freeze({
    events:'Игровые события',eventCount:'Игровые события',
    distinctPlayers:'Уникальные игроки',players:'Игроки',playerCount:'Игроки',
    results:'Результаты',resultCount:'Результаты',games:'Игры с активностью',
    reports:'Жалобы',openReports:'Открытые жалобы',sessions:'Сессии'
  });
  const MAX_RANGE_MS=366*24*60*60*1000;
  function parseDateRange(fromValue,toValue,nowMs=Date.now()){
    const shape=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    const from=Date.parse(fromValue),to=Date.parse(toValue);
    if(typeof fromValue!=='string'||typeof toValue!=='string'||!shape.test(fromValue)||!shape.test(toValue)||!Number.isFinite(from)||!Number.isFinite(to)||from>=to)
      throw new Error('Укажите корректный диапазон: начало должно быть раньше конца.');
    if(to>nowMs+5*60*1000)
      throw new Error('Конец периода находится в будущем. Выберите прошедшее время.');
    const durationMs=to-from;
    if(durationMs>MAX_RANGE_MS)
      throw new Error('Период ограничен 366 днями, чтобы не перегружать аналитику.');
    return {from,to,durationMs};
  }
  function previousPeriod(range){
    const durationMs=range.to-range.from;
    return {from:range.from-durationMs,to:range.from,durationMs};
  }
  function collectMetrics(source){
    const found=[],seen=new Set();
    function visit(value,depth){
      if(!value||typeof value!=='object'||Array.isArray(value)||depth>3)return;
      for(const [key,item] of Object.entries(value)){
        const nice=labels[key]||labels[key[0]?.toLowerCase()+key.slice(1)];
        if(nice&&typeof item==='number'&&Number.isFinite(item)&&!seen.has(nice)){
          seen.add(nice);found.push({label:nice,value:item});
        } else if(item&&typeof item==='object')visit(item,depth+1);
      }
    }
    visit(source,0);
    return found.slice(0,9);
  }
  function compareMetricRows(currentRows,previousRows){
    const previous=new Map(previousRows.map(row=>[row.label,row.value]));
    return currentRows.filter(row=>previous.has(row.label))
      .map(row=>{
        const before=previous.get(row.label),delta=row.value-before;
        return {
          label:row.label,current:row.value,previous:before,delta,
          percentChange:before===0?null:(delta/before)*100,
          direction:delta>0?'up':delta<0?'down':'flat',
          zeroBaseline:before===0
        };
      });
  }
  function rangeForPreset(preset,nowMs=Date.now()){
    const durations={day:24,week:7*24,month:30*24,quarter:90*24};
    if(!Object.prototype.hasOwnProperty.call(durations,preset))throw new Error('Неизвестный период.');
    const to=new Date(nowMs);
    const from=new Date(nowMs-durations[preset]*60*60*1000);
    return {from,to};
  }
  root.OSGARDLiveOpsDashboard=Object.freeze({
    MAX_RANGE_MS,parseDateRange,previousPeriod,collectMetrics,compareMetricRows,rangeForPreset
  });
})(typeof window!=='undefined'?window:globalThis);
