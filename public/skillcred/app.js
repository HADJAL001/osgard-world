(function () {
"use strict";
var API_BASE=(document.querySelector('meta[name="api-base"]')||{}).content||"/skillcred-api";
var $=function(id){return document.getElementById(id);},credential=null,verified=false,revoked=false,busy=false,events=0,lastJson="",heroStarted=false,inspectorReady=false,eventLogVisible=false,eventScrollPending=false,eventScrollScheduled=false,pendingEvents=[],heroVerifiedAt=0,freshnessTimer=0;
var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var mobileLite=!!(window.matchMedia&&window.matchMedia("(max-width: 820px), (pointer: coarse)").matches);
var samples={
curl:{file:"terminal / issue.sh",text:"curl -sS -X POST \\\n  https://osgard.world/skillcred-api/demo/issue \\\n  -H 'Accept: application/json' \\\n  -H 'Content-Type: application/json' \\\n  -d '{}'"},
node:{file:"node / issue.mjs",text:'const base = "https://osgard.world/skillcred-api";\nconst response = await fetch(base + "/demo/issue", {\n  method: "POST",\n  headers: { "Accept": "application/json", "Content-Type": "application/json" },\n  body: "{}"\n});\nif (!response.ok) throw new Error("HTTP " + response.status);\nconst credential = await response.json();\nconsole.log(credential.id);'},
python:{file:"python / issue.py",text:'import requests\n\nbase = "https://osgard.world/skillcred-api"\nresponse = requests.post(base + "/demo/issue", json={}, timeout=15)\nresponse.raise_for_status()\ncredential = response.json()\nprint(credential["id"])'}
};
var explanations={
"@context":"Определяет контекст JSON-LD: как интерпретировать поля документа.",
"type":"Указывает тип удостоверения и совместимую модель Open Badges.",
"id":"Идентификатор удостоверения, не секрет авторизации.",
"issuer":"Издатель, чьему ключу должна доверять проверяющая сторона.",
"issuanceDate":"Дата выпуска удостоверения.",
"validFrom":"Момент, с которого документ действует, если поле используется.",
"credentialSubject":"Утверждения о получателе и подтверждаемом достижении.",
"proof":"Криптографическое доказательство для проверки подписи и целостности.",
"cryptosuite":"Указывает криптографическую схему доказательства.",
"proofValue":"Значение доказательства; само по себе не означает доверие.",
"credentialStatus":"Ссылка на механизм проверки статуса или отзыва."
};
if($("copyrightYear"))$("copyrightYear").textContent=String(new Date().getFullYear());
function updateHeroFreshness(){if(!heroVerifiedAt)return;if(freshnessTimer)window.clearTimeout(freshnessTimer);freshnessTimer=0;var age=Math.max(0,Math.floor((Date.now()-heroVerifiedAt)/1000));text("heroLiveTime",age<1?"Обновлено только что":"Обновлено "+age+" сек. назад");if(document.visibilityState!=="hidden")freshnessTimer=window.setTimeout(updateHeroFreshness,1000);}
function wait(ms){return new Promise(function(resolve){window.setTimeout(resolve,ms);});}
function escapeHtml(v){return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function plain(v,fallback){return typeof v==="string"&&v.trim()?v.trim():fallback;}
function dateLabel(v){if(!v)return"ДАТА НЕ УКАЗАНА";var d=new Date(v);return Number.isNaN(d.getTime())?String(v).slice(0,24):d.toLocaleDateString("ru-RU",{year:"numeric",month:"short",day:"2-digit"}).toUpperCase();}
function issuerOf(item){var v=item&&item.issuer;if(typeof v==="string")return v;return plain(v&&(v.name||v.id),"SkillCred Demo Issuer");}
function subjectOf(item){var s=item&&item.credentialSubject;if(!s||typeof s!=="object")return"Демонстрационный профиль";return s.name||(s.achievement&&s.achievement.name)||s.description||s.id||"Демонстрационный профиль";}
async function hash(value){try{if(!crypto||!crypto.subtle)return"ОТПЕЧАТОК В ПОДПИСИ";var digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map(function(b){return b.toString(16).padStart(2,"0");}).join("").slice(0,24);}catch(_){return"ОТПЕЧАТОК В ПОДПИСИ";}}
function time(){var d=new Date();return d.toLocaleTimeString("ru-RU",{hour12:false})+"."+String(d.getMilliseconds()).padStart(3,"0");}
function appendEvent(record){
var log=$("eventLog");if(!log)return;
var empty=log.querySelector(".event-empty");if(empty)empty.remove();
var li=document.createElement("li"),t=document.createElement("span"),body=document.createElement("span"),title=document.createElement("strong"),small=document.createElement("small"),status=document.createElement("span");
t.className="event-time";t.textContent=record.at;body.className="event-details";title.textContent=record.name;small.textContent=record.path+(record.detail?" · "+record.detail:"");body.append(title,small);
status.className="event-code"+(record.ok===true?" is-ok":record.ok===false?" is-bad":"");status.textContent=record.code==null?"HTTP —":"HTTP "+record.code;li.append(t,body,status);log.append(li);
while(log.children.length>18)log.firstElementChild.remove();
if(eventLogVisible){eventScrollPending=true;if(!eventScrollScheduled){eventScrollScheduled=true;window.requestAnimationFrame(function(){eventScrollScheduled=false;if(eventLogVisible){log.scrollTop=log.scrollHeight;eventScrollPending=false;}});}}else{eventScrollPending=true;}
}
function addEvent(name,path,code,detail,ok){
events++;
var record={name:name,path:path,code:code,detail:detail,ok:ok,at:time()};
if(!eventLogVisible){
if(pendingEvents.length>=18)pendingEvents.shift();
pendingEvents.push(record);
eventScrollPending=true;
return;
}
appendEvent(record);
}
async function request(path,method,body){
var opts={method:method||"GET",headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"};
if(body!==undefined){opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(body);}
var started=performance.now(),label=path.indexOf("/health")===0?"Проверка состояния API":path.indexOf("/ready")===0?"Проверка готовности":path.indexOf("/issuer")===0?"Проверка демо-издателя":path.indexOf("/issue")>=0?"Выпуск удостоверения":path.indexOf("/verify")>=0?"Проверка подписи и статуса":path.indexOf("/revoke")>=0?"Отзыв удостоверения":"Запрос API";
try{var res=await fetch(API_BASE+path,opts),raw=await res.text(),data={};try{data=raw?JSON.parse(raw):{};}catch(_){data={detail:raw.slice(0,200)};}
var elapsed=Math.round(performance.now()-started);addEvent(label,(method||"GET")+" "+path,res.status,elapsed+" ms"+(data.status?" · "+String(data.status).toUpperCase():""),res.ok);
return{ok:res.ok,status:res.status,data:data,duration:elapsed};
}catch(error){var elapsedError=Math.round(performance.now()-started);addEvent(label,(method||"GET")+" "+path,null,elapsedError+" ms · network error",false);throw new Error("Не удалось подключиться к API. Повторите запрос через несколько секунд.");}
}
function text(id,value){var el=$(id);if(el)el.textContent=value;}
function setResult(message,state){var el=$("demoResult");if(el){el.textContent=message;el.dataset.state=state||"info";}}
function apiStatus(message,mode){var el=$("apiStatus");if(el)el.textContent=message;var dot=el&&el.parentElement.querySelector(".status-dot");if(dot)dot.className="status-dot"+(mode==="ok"?" is-active":mode==="bad"?" is-error":"");}
function setStatus(state){
var trustSpine=$("trustSpine");if(trustSpine)trustSpine.dataset.state=state;
var labels={idle:"ОЖИДАЕМ ПРОВЕРКУ",active:"ПОДПИСЬ ВАЛИДНА",issued:"УДОСТОВЕРЕНИЕ ВЫДАНО",revoked:"ДОКУМЕНТ ОТОЗВАН",pending:"ОЖИДАЕМ ПРОВЕРКУ"};
var hero=$("heroStatus");if(hero){hero.className="credential-status "+(state==="active"?"status-active":state==="revoked"?"status-revoked":"status-pending");hero.textContent="";var dot=document.createElement("span");dot.className="status-dot";hero.append(dot,document.createTextNode(labels[state]||labels.idle));}
var badge=$("badgeStatus");if(badge){badge.className="badge-status "+(state==="active"?"status-active":state==="revoked"?"status-revoked":"status-pending");badge.textContent=state==="active"?"ACTIVE":state==="issued"?"ISSUED":state==="revoked"?"REVOKED":state==="pending"?"PENDING":"ОЖИДАНИЕ";}
var visual=document.querySelector(".hero-visual");if(visual){visual.dataset.state=state==="active"?"valid":state;text("validStamp",state==="active"?"VALID":state==="issued"?"ISSUED":state==="revoked"?"REVOKED":"WAIT");$("validStamp").setAttribute("aria-label",state==="active"?"Подпись валидна, статус active":state==="issued"?"Документ выдан; подпись ещё не проверена":state==="revoked"?"Документ отозван":"Проверка ещё не завершена");}
if(state==="active"){heroVerifiedAt=Date.now();updateHeroFreshness();text("heroLiveStatus","Подпись: валидна · статус: active");}else{heroVerifiedAt=0;if(freshnessTimer)window.clearTimeout(freshnessTimer);freshnessTimer=0;if(state==="revoked")text("heroLiveTime","Статус изменён");else if(state==="issued")text("heroLiveTime","Ожидает проверки");}
}
function setBusy(value,label){
busy=value;
["issueBtn","verifyBtn","revokeBtn","downloadBtn","restartBtn"].forEach(function(id){var b=$(id);if(!b)return;if(id==="issueBtn"||id==="restartBtn")b.disabled=value;else if(id==="verifyBtn")b.disabled=value||!credential;else if(id==="revokeBtn")b.disabled=value||!credential||!verified||revoked;else b.disabled=value||!credential;b.setAttribute("aria-busy",value?"true":"false");});
var live=$("demoLive");if(live){live.classList.toggle("is-online",!value&&!!credential);live.textContent="";var dot=document.createElement("span");dot.className="status-dot";live.append(dot,document.createTextNode(value?(label||"ВЫПОЛНЯЕМ ЗАПРОС"):revoked?"ОТОЗВАНО":verified?"ACTIVE / VALID":credential?"ДОКУМЕНТ ВЫДАН":"ОЖИДАЕМ"));}
var card=$("demoCard");if(card)card.setAttribute("aria-busy",value?"true":"false");
}
function steps(){var buttons=[$("issueBtn"),$("verifyBtn"),$("revokeBtn")];buttons.forEach(function(b,i){if(b)b.classList.toggle("is-complete",i===0?!!credential:i===1?!!verified:!!revoked);});var labels=[credential?"ISSUED":"WAIT",revoked?"REVOKED":verified?"VALID":credential?"PENDING":"WAIT",revoked?"REVOKED":verified?"READY":"WAIT"];buttons.forEach(function(b,i){var stamp=b&&b.querySelector(".action-stamp");if(!stamp)return;stamp.textContent=labels[i];stamp.className="action-stamp "+(revoked&&(i===1||i===2)?"stamp-revoked":i===1&&verified?"stamp-valid":i===0&&credential?"stamp-issued":"stamp-pending");});}
function renderJson(item,flash){
var target=$("credentialJson");
var json=item?JSON.stringify(item,null,2):'{\n  "@context": "https://www.w3.org/ns/credentials/v2",\n  "type": ["VerifiableCredential", "OpenBadgeCredential"],\n  "proof": "ожидаем ответ API"\n}';
var lines=json.split("\n");
text("heroJson",lines.length>12?lines.slice(0,10).join("\n")+"\n  …":json);
if(!target||(!inspectorReady&&item))return;
var old=lastJson.split("\n");
target.innerHTML="<code>"+lines.map(function(line,i){var match=line.match(/"([^"]+)"\s*:/),key=match&&match[1],exp=explanations[key]||"",changed=flash&&old[i]!==line;return'<span class="json-line'+(changed?" is-changed":"")+'"'+(exp?' tabindex="0" data-explain="'+escapeHtml(exp)+'" title="'+escapeHtml(exp)+'"':"")+'>'+escapeHtml(line)+"</span>";}).join("")+"</code>";
lastJson=json;
if(flash)window.setTimeout(function(){target.querySelectorAll(".is-changed").forEach(function(el){el.classList.remove("is-changed");});},1400);
}
async function renderCredential(item){
credential=item;verified=false;revoked=false;var heroCard=$("heroCredential");if(heroCard)heroCard.dataset.phase="issued";
var s=item.credentialSubject||{},a=s.achievement||{},title=plain(a.name||s.name||s.title,"Подтверждённый навык"),description=plain(a.description||s.description,"Переносимое цифровое подтверждение навыка."),issuer=issuerOf(item);
text("heroSkill",title);text("heroDescription",description);text("heroIssuer",issuer);text("heroSubject",subjectOf(item));text("heroDate",dateLabel(item.issuanceDate||item.validFrom||item.issued));
text("badgeTitle",title);text("badgeDescription",description);text("badgeIssuer",issuer);text("badgeId",item.id||"ID НЕ УКАЗАН");
text("heroProof","Подпись создана · ожидает проверки");text("heroProofSub","Теперь запустите проверку API");text("demoProofLabel","Подпись создана · ожидает проверки");text("demoProofSub","Дальше — реальная проверка подписи");text("heroLiveStatus","Документ получен · подпись ещё не проверена");text("heroFrameState","DOCUMENT ISSUED");
text("heroHash",await hash(JSON.stringify(item)));setStatus("issued");renderJson(item,true);apiStatus("API выпустил синтетический документ","ok");steps();setBusy(false);
}
async function prepareDemo(){
var checks=await Promise.all([request("/health","GET"),request("/ready","GET"),request("/issuer","GET")]),h=checks[0],r=checks[1],i=checks[2];
if(!h.ok||!r.ok||!i.ok)throw new Error("API не прошёл проверку состояния.");
if(h.data.demo_ready!==true||r.data.ready!==true)throw new Error("Сервис отвечает, но публичное демо сейчас не готово.");
text("heroLiveTime","API v"+plain(h.data.version,"0.3.0"));return{health:h.data,issuer:i.data};
}
function timeline(index){
var nodes=Array.from(document.querySelectorAll("[data-clock-step]")),p=$("clockProgress"),progress=Math.max(0,Math.min(100,(index+1)/nodes.length*100));
nodes.forEach(function(node,i){node.classList.toggle("is-active",i===index);node.classList.toggle("is-done",i<index||index===nodes.length);});
if(p)p.setAttribute("stroke-dashoffset",String(100-progress));
var track=$("clockTrack");if(track)track.setAttribute("aria-label",index>=nodes.length?"Четыре этапа проверки завершены":"Этап "+(index+1)+" из "+nodes.length);
}
function finishClock(state,ms,http){
timeline(4);text("timeElapsed",Math.max(0,Math.round(ms))+" ms");text("clockVerdict",state==="active"?"VALID":state==="revoked"?"REVOKED":"CHECK");text("clockHttp","HTTP "+http);
var bottom=document.querySelector(".clock-bottom");if(bottom)bottom.dataset.state=state==="active"?"active":state==="revoked"?"error":"error";
text("clockCaption",state==="active"?"Подпись корректна · статус ACTIVE":state==="revoked"?"Подпись корректна · статус REVOKED":"Проверка требует внимания");
}
function startClock(){
timeline(-1);text("timeElapsed","… ms");text("clockCaption","Сервер проверяет данные и актуальный статус");text("clockHttp","WAITING");
var bottom=document.querySelector(".clock-bottom");if(bottom)bottom.dataset.state="active";var i=0;
var timer=window.setInterval(function(){if(!busy||i>=3){window.clearInterval(timer);return;}timeline(i);i++;},270);
}
function verificationResult(state,res){
if(state==="active"){text("heroProof","Подпись: валидна ✓");text("heroProofSub","Bitstring Status List: ACTIVE");text("demoProofLabel","Подпись валидна · статус ACTIVE");text("demoProofSub","Сервер подтвердил подпись и статус");text("heroLiveStatus","Подпись: валидна · Статус: active · Обновлено только что");text("heroFrameState","SIGNATURE VALID");apiStatus("Подпись и активный статус подтверждены","ok");}
else if(state==="revoked"){text("heroProof","Подпись корректна · документ отозван");text("heroProofSub","Bitstring Status List: REVOKED");text("demoProofLabel","Подпись корректна · статус REVOKED");text("demoProofSub","Документ не должен считаться действительным");text("heroLiveStatus","Подпись корректна · статус revoked");text("heroFrameState","STATUS REVOKED");apiStatus("Отзыв подтверждён проверкой","bad");}
else{text("heroProof","Проверка не подтверждена");text("heroProofSub","Смотрите ответ сервера в журнале");text("demoProofLabel","Проверка не подтверждена");text("demoProofSub","Не считайте документ действительным");text("heroFrameState","CHECK REQUIRED");apiStatus("Ответ не подтвердил действительность","bad");}
finishClock(state,res.duration,res.status);
}
async function verifyCurrent(options){
if(!credential||busy)return;
setBusy(true,"ПРОВЕРЯЕМ ПОДПИСЬ");setResult("Проверяем подпись Ed25519 и актуальный статус на сервере…");startClock();var res;
try{
res=await request("/demo/verify","POST",{credential:credential});if(!res.ok)throw new Error("Проверка отклонена сервером (HTTP "+res.status+").");
var data=res.data||{},signature=data.signature_valid===true,status=String(data.status||"unknown").toLowerCase();
if(signature&&data.valid===true&&status==="active"){verified=true;revoked=false;setStatus("active");verificationResult("active",res);setResult("Подпись Ed25519 валидна. Bitstring Status List сообщает ACTIVE. Доверие к издателю оценивается отдельно.","ok");text("heroLiveTime","API · "+res.duration+" ms");}
else if(signature&&status==="revoked"){verified=false;revoked=true;setStatus("revoked");verificationResult("revoked",res);setResult("Подпись остаётся корректной, но статус REVOKED: документ больше нельзя считать действительным.","bad");}
else{verified=false;revoked=status==="revoked";setStatus(revoked?"revoked":"pending");verificationResult("unknown",res);setResult("Сервер не подтвердил одновременно подпись и активный статус. Изучите ответ API и журнал событий.","bad");}
steps();if(options&&options.auto&&!verified)throw new Error("Сервер не подтвердил активное удостоверение.");
return{verified:verified,revoked:revoked,response:res};
}catch(err){setResult(err.message||"Проверка не выполнена.","bad");text("heroLiveStatus","Проверка API не завершена");var bottom=document.querySelector(".clock-bottom");if(bottom)bottom.dataset.state="error";text("clockCaption","Проверка не завершена · смотрите журнал");text("clockHttp",res?"HTTP "+res.status:"NETWORK ERROR");throw err;}
finally{setBusy(false);steps();}
}
async function issueNew(){
if(busy)return;if($("demo")&&$("demo").getBoundingClientRect().top<window.innerHeight+80)activateInspector();setBusy(true,"ВЫПУСКАЕМ ДОКУМЕНТ");setResult("Проверяем API и выпускаем новый синтетический документ…");
try{await prepareDemo();var res=await request("/demo/issue","POST",{});if(!res.ok||!res.data||!res.data.credentialSubject||!res.data.proof)throw new Error("Выпуск не подтверждён API (HTTP "+res.status+").");await renderCredential(res.data);setResult("Документ получен. Следующий шаг — проверить подпись и актуальный статус.","ok");text("heroLiveStatus","Документ выпущен · проверка ожидается");}
catch(err){setResult("Не удалось выдать удостоверение: "+err.message,"bad");apiStatus("Выпуск не подтверждён","bad");}
finally{setBusy(false);steps();}
}
async function revokeCurrent(){
if(!credential||busy||!verified||revoked)return;setBusy(true,"ОТОЗЫВАЕМ ДОКУМЕНТ");setResult("Отправляем запрос на отзыв в Bitstring Status List…");
try{var res=await request("/demo/revoke","POST",{credential:credential});if(!res.ok||res.data.revoked!==true)throw new Error("Сервер не подтвердил отзыв (HTTP "+res.status+").");revoked=true;verified=false;setStatus("revoked");text("heroProof","Удостоверение отозвано");text("heroProofSub","Подпись сохранена · статус изменён");text("demoProofLabel","Отзыв сохранён · нужна повторная проверка");text("demoProofSub","Нажмите «Проверить», чтобы получить статус REVOKED");text("heroLiveStatus","Отзыв сохранён · требуется перепроверка");text("heroFrameState","REVOCATION REQUESTED");apiStatus("Отзыв записан на сервере","bad");setResult("Сервер подтвердил отзыв. Проверьте документ повторно: подпись останется прежней, но статус должен стать REVOKED.","ok");text("clockVerdict","RECHECK");text("clockCaption","Отзыв записан · повторите проверку статуса");steps();}
catch(err){setResult("Не удалось отозвать удостоверение: "+err.message,"bad");}
finally{setBusy(false);steps();}
}
function resetDemo(){
if(busy)return;credential=null;verified=false;revoked=false;lastJson="";setStatus("idle");
text("heroSkill","Практическая безопасность");text("heroDescription","Переносимое цифровое подтверждение навыка.");text("heroIssuer","SkillCred Demo Issuer");text("heroSubject","Демонстрационный профиль");text("heroDate","DEMO RECORD");text("heroHash","ЖДЁМ КРИПТОГРАФИЧЕСКУЮ ПОДПИСЬ");text("heroProof","Подпись ещё не проверена");text("heroProofSub","Начните с выдачи документа");text("heroLiveStatus","Демо сброшено · можно выдать новый документ");text("heroFrameState","READY FOR ISSUE");
text("badgeTitle","Практическая безопасность");text("badgeDescription","Переносимое цифровое подтверждение навыка.");text("badgeIssuer","SkillCred Demo Issuer");text("badgeId","ОЖИДАЕМ ВЫПУСКА");text("demoProofLabel","Подпись ещё не проверена");text("demoProofSub","Результат появится после ответа API");text("timeElapsed","— ms");text("clockVerdict","WAITING");text("clockHttp","HTTP —");text("clockCaption","Ожидаем действие пользователя");text("fieldExplainer","Выберите поле JSON, чтобы понять его роль.");setResult("Шаги сброшены. Начните с выдачи нового тестового удостоверения.");renderJson(null,false);timeline(-1);steps();setBusy(false);
}
function downloadCredential(){
if(!credential)return;var blob=new Blob([JSON.stringify(credential,null,2)],{type:"application/ld+json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="skillcred-demo-credential.json";document.body.appendChild(a);a.click();a.remove();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);addEvent("Экспорт документа","LOCAL DOWNLOAD","OK","JSON-LD",true);
}
function navSetup(){
var toggle=$("menuToggle"),nav=$("primaryNav");if(!toggle||!nav)return;
toggle.addEventListener("click",function(){var open=toggle.getAttribute("aria-expanded")!=="true";toggle.setAttribute("aria-expanded",open?"true":"false");toggle.setAttribute("aria-label",open?"Закрыть навигацию":"Открыть навигацию");nav.classList.toggle("is-open",open);});
nav.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Открыть навигацию");nav.classList.remove("is-open");});});
}
function faqSetup(){
document.querySelectorAll(".faq-question").forEach(function(button){button.addEventListener("click",function(){var item=button.closest(".faq-item"),open=button.getAttribute("aria-expanded")!=="true";document.querySelectorAll(".faq-question").forEach(function(other){other.setAttribute("aria-expanded","false");var parent=other.closest(".faq-item");if(parent)parent.classList.remove("is-open");});if(open&&item){button.setAttribute("aria-expanded","true");item.classList.add("is-open");}});});
}
function codeSetup(){
document.querySelectorAll("[data-code-tab]").forEach(function(tab){tab.addEventListener("click",function(){var sample=samples[tab.dataset.codeTab];if(!sample)return;document.querySelectorAll("[data-code-tab]").forEach(function(other){other.classList.toggle("is-active",other===tab);other.setAttribute("aria-selected",other===tab?"true":"false");});text("codeFileName",sample.file);text("codeSample",sample.text);});});
var copy=$("copyCode");if(copy)copy.addEventListener("click",async function(){var value=$("codeSample").textContent;try{await navigator.clipboard.writeText(value);copy.textContent="Скопировано ✓";}catch(_){var area=document.createElement("textarea");area.value=value;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();var ok=false;try{ok=document.execCommand("copy");}catch(__){}area.remove();copy.textContent=ok?"Скопировано ✓":"Выделите код вручную";}window.setTimeout(function(){copy.textContent="Копировать код ↗";},1500);});
}
function jsonSetup(){var pane=$("credentialJson");if(!pane)return;["pointerover","focusin","click"].forEach(function(type){pane.addEventListener(type,function(ev){var field=ev.target.closest&&ev.target.closest("[data-explain]");if(field)text("fieldExplainer",field.dataset.explain);});});}
function activateInspector(){
if(inspectorReady)return;
inspectorReady=true;
renderJson(credential,false);
}
function inspectorActivationSetup(){
var section=$("demo");if(!section)return;
if(!("IntersectionObserver" in window)||reduced)return;
var observer=new IntersectionObserver(function(entries){if(entries.some(function(entry){return entry.isIntersecting;})){activateInspector();observer.disconnect();}},{rootMargin:"180px 0px",threshold:0});
observer.observe(section);
}

function sectionMotionSetup(){if(mobileLite||!("IntersectionObserver" in window)||reduced)return;[[".journey-line","is-visible"],[".developers","is-tracing"]].forEach(function(pair){var section=document.querySelector(pair[0]);if(!section)return;var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){section.classList.toggle(pair[1],entry.isIntersecting);});},{rootMargin:"0px 0px 18% 0px",threshold:.01});observer.observe(section);});}
function eventLogVisibilitySetup(){
var log=$("eventLog");if(!log)return;
if(!("IntersectionObserver" in window)){eventLogVisible=true;if(pendingEvents.length){pendingEvents.splice(0).forEach(appendEvent);}return;}
var observer=new IntersectionObserver(function(entries){
entries.forEach(function(entry){
eventLogVisible=entry.isIntersecting;
if(eventLogVisible&&pendingEvents.length){
var batch=pendingEvents.splice(0);
batch.forEach(appendEvent);
}
if(eventLogVisible&&eventScrollPending&&!eventScrollScheduled){
eventScrollScheduled=true;
window.requestAnimationFrame(function(){eventScrollScheduled=false;if(eventLogVisible){log.scrollTop=log.scrollHeight;eventScrollPending=false;}});
}
});
},{threshold:.01});
observer.observe(log);
}
function wrapHeadingWords(head){
if(!head||head.dataset.worded==="true")return;
if(mobileLite){head.dataset.worded="true";return;}
if(head.classList.contains("hero-title")){head.dataset.worded="true";return;}
var walker=document.createTreeWalker(head,NodeFilter.SHOW_TEXT,{acceptNode:function(node){return node.nodeValue.trim()&&!node.parentElement.closest("svg,script,style,code")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
nodes.forEach(function(node){var parts=node.nodeValue.match(/\s+|[^\s]+/g)||[],fragment=document.createDocumentFragment(),index=0;
parts.forEach(function(part){if(/^\s+$/.test(part))fragment.appendChild(document.createTextNode(part));else{var span=document.createElement("span");span.className="heading-word w-"+(index%24);span.textContent=part;fragment.appendChild(span);index++;}});
node.parentNode.replaceChild(fragment,node);});
head.dataset.worded="true";
}
function revealSetup(){
var items=Array.from(document.querySelectorAll(".reveal,.kinetic-heading"));
// On small/coarse-pointer devices, render all copy immediately instead of creating dozens of reveal observers.
if(mobileLite||!("IntersectionObserver" in window)||reduced){items.forEach(function(item){item.classList.add("is-visible");});return;}
var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var target=entry.target;observer.unobserve(target);if(target.classList.contains("kinetic-heading")){window.setTimeout(function(){wrapHeadingWords(target);target.classList.add("is-visible");},0);}else{target.classList.add("is-visible");}});},{threshold:.12,rootMargin:"0px 0px -28px 0px"});
items.forEach(function(item){observer.observe(item);});
var heroHead=document.querySelector(".hero .kinetic-heading"),heroCopy=document.querySelector(".hero-copy.reveal");
if(heroHead){heroHead.classList.add("is-visible");}
if(heroCopy)heroCopy.classList.add("is-visible");
}
function tiltSetup(){
var card=$("heroCredential");if(!card||reduced||!window.matchMedia("(hover:hover) and (pointer:fine)").matches)return;
var computed=getComputedStyle(card),maxX=Number.parseFloat(computed.getPropertyValue("--tilt-x-max"))||4.4,maxY=Number.parseFloat(computed.getPropertyValue("--tilt-y-max"))||5,pending=null,frame=0;
function paint(){frame=0;if(!pending)return;var point=pending;pending=null;var rect=card.getBoundingClientRect(),x=Math.max(0,Math.min(1,(point.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(point.clientY-rect.top)/rect.height));card.style.setProperty("--pointer-x",(x*100).toFixed(1)+"%");card.style.setProperty("--pointer-y",(y*100).toFixed(1)+"%");card.style.transform="perspective(var(--perspective-depth)) rotateX("+((.5-y)*maxX).toFixed(2)+"deg) rotateY("+((x-.5)*maxY).toFixed(2)+"deg) translateY(-2px)";}
card.addEventListener("pointermove",function(ev){pending={clientX:ev.clientX,clientY:ev.clientY};if(!frame)frame=window.requestAnimationFrame(paint);});
card.addEventListener("pointerleave",function(){pending=null;if(frame)window.cancelAnimationFrame(frame);frame=0;card.style.transform="";card.style.removeProperty("--pointer-x");card.style.removeProperty("--pointer-y");});
}
function trustScrollSetup(){
var spine=$("trustSpine"),path=$("trustSpineProgress");if(!spine||!path)return;
var sections=["promise","problem","how","demo","audience","developers","invitation"].map(function(id){return $(id);}).filter(Boolean);
function paint(index,ratio){
var progress=Math.max(0,Math.min(1,(index+Math.max(.08,Math.min(.92,ratio)))/sections.length));
path.setAttribute("stroke-dashoffset",String(1000*(1-progress)));
}
paint(0,0.08);
// The scroll-following SVG is decorative; do not install seven section observers on mobile.
if(mobileLite||reduced||!("IntersectionObserver" in window))return;
var activeIndex=0;
var observer=new IntersectionObserver(function(entries){
entries.sort(function(a,b){return a.boundingClientRect.top-b.boundingClientRect.top;});
entries.forEach(function(entry){
if(!entry.isIntersecting)return;
var index=sections.indexOf(entry.target);
if(index<0)return;
activeIndex=index;
paint(activeIndex,entry.intersectionRatio);
});
},{rootMargin:"-28% 0px -62% 0px",threshold:[0,.05,.15,.3,.5,.75,1]});
sections.forEach(function(section){observer.observe(section);});
}
async function loadHeroArtifact(){
if(heroStarted||document.visibilityState==="hidden")return;heroStarted=true;var started=performance.now(),issued=null,visual=document.querySelector(".hero-visual"),card=$("heroCredential");
if(visual)visual.dataset.state="pending";if(card)card.dataset.phase="signature";text("heroFrameState","CALCULATING SIGNATURE");text("heroLiveStatus","Получаем документ у демо-издателя…");
try{
var issuePromise=request("/demo/issue","POST",{}).then(function(value){return{value:value};},function(error){return{error:error};});
var heroSceneDelay=mobileLite?0:(reduced?0:1850);await wait(Math.max(0,heroSceneDelay-(performance.now()-started)));
var issueResult=await issuePromise;if(issueResult.error)throw issueResult.error;var out=issueResult.value;if(!out.ok||!out.data||!out.data.credentialSubject||!out.data.proof)throw new Error("API не выдал проверяемое удостоверение.");issued=out.data;await renderCredential(issued);text("heroLiveStatus","Подпись вычисляется · запускаем проверку");
var check=await request("/demo/verify","POST",{credential:issued});if(!check.ok)throw new Error("API не подтвердил подпись.");var d=check.data||{};if(d.signature_valid!==true||d.valid!==true||String(d.status).toLowerCase()!=="active")throw new Error("Сервер не подтвердил подпись и статус ACTIVE.");
verified=true;revoked=false;setStatus("active");verificationResult("active",check);text("heroLiveStatus","Подпись: валидна · статус: active");text("heroFrameState","SIGNATURE VALID");setResult("Живое демо подключено. Это синтетическое удостоверение с настоящим ответом API, не статическая картинка. Можно выдать другое или отозвать его.","ok");setBusy(false);steps();if(card){card.dataset.phase="valid";card.setAttribute("aria-busy","false");}
}catch(err){
if(issued){try{await request("/demo/revoke","POST",{credential:issued});}catch(_){}}
if(visual)visual.dataset.state="pending";if(card){card.dataset.phase="document";card.setAttribute("aria-busy","false");}text("heroFrameState","API UNAVAILABLE");text("heroLiveStatus","API не ответил · используйте демо ниже");text("heroProof","Подпись не подтверждена");text("heroProofSub","Не показываем VALID без ответа сервера");setResult("Не удалось автоматически завершить демонстрацию: "+err.message+" Нажмите «Выдать удостоверение», чтобы повторить запрос.","bad");apiStatus("API недоступен или демо не готово","bad");addEvent("Автоматическое демо не завершено","HERO BOOTSTRAP",null,err.message,false);setBusy(false);steps();
}
}
if($("issueBtn"))$("issueBtn").addEventListener("click",issueNew);
if($("verifyBtn"))$("verifyBtn").addEventListener("click",function(){verifyCurrent().catch(function(){});});
if($("revokeBtn"))$("revokeBtn").addEventListener("click",revokeCurrent);
if($("downloadBtn"))$("downloadBtn").addEventListener("click",downloadCredential);
if($("restartBtn"))$("restartBtn").addEventListener("click",resetDemo);
navSetup();faqSetup();codeSetup();jsonSetup();revealSetup();tiltSetup();inspectorActivationSetup();eventLogVisibilitySetup();sectionMotionSetup();trustScrollSetup();
function afterFirstPaint(callback){if(typeof window.requestAnimationFrame==="function"){window.requestAnimationFrame(function(){window.requestAnimationFrame(callback);});}else window.setTimeout(callback,0);}
if("IntersectionObserver" in window){var observed=new IntersectionObserver(function(entries){if(entries.some(function(e){return e.isIntersecting;})){observed.disconnect();afterFirstPaint(loadHeroArtifact);}},{threshold:.08});var hero=document.querySelector(".hero-visual");if(hero)observed.observe(hero);}else afterFirstPaint(loadHeroArtifact);
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&!heroStarted)loadHeroArtifact();else if(document.visibilityState==="visible"&&heroVerifiedAt&&!freshnessTimer)updateHeroFreshness();});
window.SkillCredDemo={getState:function(){return{issued:!!credential,verified:verified,revoked:revoked,events:events};}};
})();