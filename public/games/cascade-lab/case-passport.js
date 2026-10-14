(() => {
'use strict';
const VERSION='0.21.0',SCHEMA='osgard.cascade-lab.case-passport.v1',MAX_BYTES=200*1024;
const TOOLS=new Set(['spring','fan','belt','magnet','switch','bumper']);
const clean=(v,n=240)=>String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n);
function canonicalize(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return'['+v.map(canonicalize).join(',')+']';return'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonicalize(v[k])).join(',')+'}'}
function fnv1a(s){let h=0x811c9dc5;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
function fingerprintProject(p){return'CL21-'+fnv1a(canonicalize(p)).toUpperCase()}
function validDevice(d){return Boolean(d&&typeof d==='object'&&!Array.isArray(d)&&TOOLS.has(d.type)&&Number.isFinite(d.x)&&d.x>=0&&d.x<=1200&&Number.isFinite(d.y)&&d.y>=0&&d.y<=650&&Number.isFinite(d.angle)&&Math.abs(d.angle)<=Math.PI*100)}
function validRun(r){return Boolean(r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=80&&['won','lost'].includes(r.status)&&Number.isInteger(r.levelId)&&r.levelId>=1&&r.levelId<=5&&Number.isFinite(Date.parse(r.at))&&r.mode==='campaign'&&r.dailyDate==null&&Array.isArray(r.devices)&&r.devices.length<=12&&r.devices.every(validDevice))}
function validateShape(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==SCHEMA||raw.schemaVersion!==1)return{ok:false,reason:'Неверный формат паспорта. Ожидается CASCADE LAB Case Passport v1.'};
 if(typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt)))return{ok:false,reason:'В паспорте отсутствует корректная дата создания.'};
 if(!raw.payload||typeof raw.payload!=='object'||raw.payload.game!=='CASCADE LAB'||raw.payload.gameVersion!==VERSION||!raw.integrity||!['SHA-256','FNV-1A-32'].includes(raw.integrity.algorithm)||typeof raw.integrity.digest!=='string')return{ok:false,reason:'Версия паспорта или алгоритм контрольной суммы не поддерживается.'};
 const p=raw.payload,q=p.project;
 if(!validRun(p.run)||!q||typeof q!=='object'||q.app!=='CASCADE LAB'||q.schemaVersion!==1||q.levelId!==p.run.levelId||q.dailyDate!==null||!Array.isArray(q.devices)||q.devices.length>12||!q.devices.every(validDevice))return{ok:false,reason:'Запись запуска или чертёж не прошли проверку. Поддерживаются обычные сюжетные протоколы.'};
 const rd=p.run.devices.map(d=>({type:d.type,x:d.x,y:d.y,angle:d.angle}));
 if(canonicalize(rd)!==canonicalize(q.devices))return{ok:false,reason:'Чертёж не совпадает с конструкцией, записанной в результате.'};
 if(p.fingerprint!==fingerprintProject(q))return{ok:false,reason:'Отпечаток чертежа не совпадает. Файл мог быть повреждён.'};
 if(!p.analysis||typeof p.analysis.title!=='string'||!Array.isArray(p.analysis.evidence)||p.analysis.evidence.length>12||typeof p.analysis.hypothesis!=='string'||typeof p.analysis.nextTest!=='string')return{ok:false,reason:'Диагностическая сводка паспорта неполна.'};
 return{ok:true,raw,payload:p};
}
function integrityBody(raw,algorithm){return{schema:raw.schema,schemaVersion:raw.schemaVersion,createdAt:raw.createdAt,payload:raw.payload,algorithm}}
async function checksum(raw,algorithm){
 const bytes=new TextEncoder().encode(canonicalize(integrityBody(raw,algorithm)));
 if(algorithm==='SHA-256'){
  if(!globalThis.crypto||!globalThis.crypto.subtle)throw new Error('Для проверки SHA-256 открой игру через HTTPS или современный безопасный браузер.');
  const d=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,'0')).join('');
 }
 if(algorithm==='FNV-1A-32')return fnv1a(canonicalize(integrityBody(raw,algorithm)));
 throw new Error('Неизвестный алгоритм контрольной суммы.');
}
async function verifyPassport(raw){const shape=validateShape(raw);if(!shape.ok)return shape;let actual;try{actual=await checksum(raw,raw.integrity.algorithm)}catch(e){return{ok:false,reason:clean(e&&e.message||'Не удалось проверить контрольную сумму.')}}if(actual!==raw.integrity.digest)return{ok:false,reason:'Контрольная сумма не совпала. Паспорт не импортирован.'};return{ok:true,payload:raw.payload,algorithm:raw.integrity.algorithm}}
const pureApi=Object.freeze({version:VERSION,schema:SCHEMA,canonicalize,fnv1a,fingerprintProject,validDevice,validRun,validateShape,verifyPassport});
if(typeof window==='undefined'||!window.document){globalThis.__CASCADELAB021_TEST__=pureApi;return}
if(window.CASCADELAB021)return;
const engine=window.CASCADELAB019,gameApi=window.CASCADELAB014,host=document.querySelector('.cl-engineering');
if(!host||!engine||typeof engine.getRuns!=='function'||typeof engine.importRun!=='function'||!gameApi||typeof gameApi.restoreProject!=='function')return;
const style=document.createElement('style');style.dataset.cascadeLabPassportStyle=VERSION;
style.textContent=[
'.cl-passport{margin:16px 0 20px;padding:clamp(14px,2vw,22px);border:1px solid #d8b87345;border-radius:16px;background:radial-gradient(ellipse at 90% 0%,#b48b3918,transparent 45%),linear-gradient(145deg,#17170f,#09131a);color:#edf4f7;box-shadow:0 16px 45px #0002}',
'.cl-passport-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.cl-passport-kicker{margin:0;color:#f0c978;font:8px ui-monospace,monospace;letter-spacing:.17em}.cl-passport-pill{padding:5px 8px;border:1px solid #e9ba6a40;border-radius:5px;color:#e9ba6a;font:8px ui-monospace,monospace}',
'.cl-passport h4{margin:9px 0;color:#f6f5ee;font:400 clamp(21px,2.8vw,30px)/1.12 Georgia,serif}.cl-passport-copy{margin:7px 0 12px;color:#a5b5bd;font-size:10px;line-height:1.65;max-width:780px}',
'.cl-passport-actions{display:flex;flex-wrap:wrap;gap:8px}.cl-passport-button{min-height:39px;padding:9px 12px;border:1px solid #86bacb3f;border-radius:8px;background:#0b1c27;color:#d9edf4;font:750 9px/1.35 ui-monospace,monospace;cursor:pointer}.cl-passport-button:hover{border-color:#8adfff;color:#fff}.cl-passport-button.primary{border-color:#f0c97870;background:linear-gradient(135deg,#f3d99c,#dcae5e);color:#231b0a}.cl-passport-button:focus-visible,.cl-passport input:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}.cl-passport-button:disabled{opacity:.42;cursor:not-allowed}',
'.cl-passport-note{display:flex;align-items:flex-start;gap:8px;margin:12px 0 0;color:#859faa;font-size:9px;line-height:1.6}.cl-passport-note input{margin:2px 0 0;accent-color:#f0c978}.cl-passport-status{min-height:1.5em;margin:10px 0 0;color:#a8c1ce;font-size:10px;line-height:1.6;overflow-wrap:anywhere}.cl-passport-status[data-kind=error]{color:#ff9f9f}.cl-passport-status[data-kind=success]{color:#9bebc6}.cl-passport-fingerprint{display:inline-block;color:#f0c978;font:9px ui-monospace,monospace;overflow-wrap:anywhere}',
'.cl-passport[hidden],.cl-passport [hidden]{display:none!important}@media(max-width:620px){.cl-passport-actions{display:grid;grid-template-columns:1fr}.cl-passport-button{width:100%;text-align:left}}@media(prefers-reduced-motion:reduce){.cl-passport *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'
].join('');document.head.append(style);
const panel=document.createElement('section');panel.className='cl-passport';panel.setAttribute('aria-labelledby','cl-passport-title');
const head=document.createElement('div');head.className='cl-passport-head';
const kicker=document.createElement('p');kicker.className='cl-passport-kicker';kicker.textContent='CASCADE LAB / REPRODUCIBLE CASE';
const badge=document.createElement('span');badge.className='cl-passport-pill';badge.textContent='VERSION '+VERSION;head.append(kicker,badge);
const title=document.createElement('h4');title.id='cl-passport-title';title.textContent='Паспорт эксперимента';
const copy=document.createElement('p');copy.className='cl-passport-copy';copy.textContent='Один файл объединяет чертёж, исход запуска, измерения и диагностическую гипотезу. Импорт добавляет результат в локальный журнал; чертёж можно восстановить и повторить.';
const actions=document.createElement('div');actions.className='cl-passport-actions';
const exportButton=document.createElement('button');exportButton.type='button';exportButton.className='cl-passport-button primary';exportButton.textContent='↓ Экспорт паспорта';
const shareButton=document.createElement('button');shareButton.type='button';shareButton.className='cl-passport-button';shareButton.textContent='↗ Передать файл';
const importButton=document.createElement('button');importButton.type='button';importButton.className='cl-passport-button';importButton.textContent='↑ Проверить и импортировать';
const restoreButton=document.createElement('button');restoreButton.type='button';restoreButton.className='cl-passport-button';restoreButton.textContent='⟳ Восстановить чертёж';restoreButton.hidden=true;
actions.append(exportButton,shareButton,importButton,restoreButton);
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;
const notesLabel=document.createElement('label');notesLabel.className='cl-passport-note';
const notesCheckbox=document.createElement('input');notesCheckbox.type='checkbox';
const notesText=document.createElement('span');notesText.textContent='Добавить мои личные заметки, гипотезу и план теста. По умолчанию эти поля не попадают в передаваемый файл.';notesLabel.append(notesCheckbox,notesText);
const status=document.createElement('p');status.className='cl-passport-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
panel.append(head,title,copy,actions,fileInput,notesLabel,status);
const archive=host.querySelector('.cl-eng-archive');if(archive)archive.before(panel);else host.append(panel);
let activePassport=null;
function setStatus(message,kind){status.textContent=message;status.dataset.kind=kind||'info'}
function latestRun(){const items=engine.getRuns();return items.length?items[0]:null}
function fileName(run){return'cascade-lab-passport-L'+run.levelId+'-'+run.id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28)+'.json'}
async function createPassport(){
 const source=latestRun();if(!source)throw new Error('Сначала заверши обычный сюжетный протокол — появится измеренный результат.');
 if(source.mode!=='campaign'||source.dailyDate!=null)throw new Error('Для точного восстановления нужен новый обычный сюжетный запуск. Ежедневные и дуэльные условия не подменяются обычным протоколом.');
 const run=JSON.parse(JSON.stringify(source));if(!notesCheckbox.checked){run.note='';run.hypothesis='';run.nextTest=''}
 const project={app:'CASCADE LAB',schemaVersion:1,levelId:run.levelId,dailyDate:null,devices:run.devices.map(d=>({type:d.type,x:d.x,y:d.y,angle:d.angle}))};
 const diagnosis=engine.diagnoseRun(run);
 const payload={game:'CASCADE LAB',gameVersion:VERSION,run,project,fingerprint:fingerprintProject(project),analysis:{
  kind:clean(diagnosis.kind,40),title:clean(diagnosis.title,160),confidence:clean(diagnosis.confidence,16),
  evidence:diagnosis.evidence.slice(0,12).map(v=>clean(v,240)),hypothesis:clean(diagnosis.hypothesis,500),nextTest:clean(diagnosis.nextTest,700)
 },personalAnnotationsIncluded:notesCheckbox.checked};
 const envelope={schema:SCHEMA,schemaVersion:1,createdAt:new Date().toISOString(),payload};
 const algorithm=globalThis.crypto&&globalThis.crypto.subtle?'SHA-256':'FNV-1A-32';
 envelope.integrity={algorithm,digest:await checksum(envelope,algorithm)};
 const content=JSON.stringify(envelope,null,2);if(new Blob([content]).size>MAX_BYTES)throw new Error('Паспорт превышает лимит 200 KiB.');
 return{envelope,content,fileName:fileName(run)};
}
function download(name,content){const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200)}
async function exportPassport(share){
 try{
  const result=await createPassport();const file=new File([result.content],result.fileName,{type:'application/json'});
  if(share&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]})){
   await navigator.share({title:'CASCADE LAB · Паспорт эксперимента',text:'Чертёж, измерения и диагностическая гипотеза для воспроизведения игрового испытания.',files:[file]});
   setStatus('Файл передан в системное меню отправки. Публикация или доставка адресату не подтверждается.','success');
  }else{download(result.fileName,result.content);setStatus('Паспорт сохранён. Контрольная сумма: '+result.envelope.integrity.algorithm+'. Отправь файл удобным способом.','success')}
  const fp=document.createElement('span');fp.className='cl-passport-fingerprint';fp.textContent=result.envelope.payload.fingerprint;status.append(document.createTextNode(' Отпечаток чертежа: '),fp);
 }catch(error){setStatus(clean(error&&error.message||'Не удалось создать паспорт.'),'error')}
}
async function importPassport(file){
 if(!file)return;if(file.size>MAX_BYTES){setStatus('Файл больше 200 KiB. Паспорт не импортирован.','error');fileInput.value='';return}
 try{
  const raw=JSON.parse(await file.text());const verified=await verifyPassport(raw);if(!verified.ok)throw new Error(verified.reason);
  const imported=engine.importRun(verified.payload.run);if(!imported||!imported.ok)throw new Error(imported&&imported.reason||'Результат не прошёл проверку журнала.');
  activePassport=verified.payload;restoreButton.hidden=false;
  setStatus('Паспорт проверен ('+raw.integrity.algorithm+'). Результат добавлен в локальный журнал. Чертёж: '+raw.payload.fingerprint+'.','success');
 }catch(error){activePassport=null;restoreButton.hidden=true;setStatus(clean(error&&error.message||'Паспорт отклонён.'),'error')}finally{fileInput.value=''}
}
exportButton.addEventListener('click',()=>void exportPassport(false));shareButton.addEventListener('click',()=>void exportPassport(true));
importButton.addEventListener('click',()=>fileInput.click());fileInput.addEventListener('change',()=>void importPassport(fileInput.files&&fileInput.files[0]));
restoreButton.addEventListener('click',()=>{
 if(!activePassport){setStatus('Сначала импортируй и проверь паспорт.','error');return}
 const result=gameApi.restoreProject(activePassport.project);
 if(!result||!result.ok){setStatus(clean(result&&result.reason||'Чертёж не удалось восстановить.'),'error');return}
 setStatus('Чертёж восстановлен: протокол #'+result.levelId+', устройств '+result.devices+'. Запусти механизм и сравни исход с паспортом.','success');
 const launch=document.querySelector('#runButton');if(launch)launch.focus({preventScroll:true});
});
Object.defineProperty(window,'CASCADELAB021',{value:Object.freeze({version:VERSION,schema:SCHEMA,fingerprintProject,validateShape,verifyPassport}),configurable:false,enumerable:false,writable:false});
})();