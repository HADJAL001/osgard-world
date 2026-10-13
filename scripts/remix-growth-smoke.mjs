import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read=(path)=>readFileSync(path,'utf8');
const remix=read('public/games/remix/index.html');
const partners=read('public/games/partners/partners.js');
const manifest=read('src/core/manifest.ts');
const checks=[];
function check(name,fn){
  try{fn();checks.push({name,pass:true});console.log('PASS',name)}
  catch(error){checks.push({name,pass:false,error:String(error)});console.error('FAIL',name,error.message)}
}
check('inline REMIX browser script parses',()=>{
  const blocks=[...remix.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.ok(blocks.length>0,'no inline scripts');
  blocks.forEach((source)=>new vm.Script(source,{filename:'remix-inline.js'}));
});
check('same UTC date produces a stable daily seed',()=>{
  assert.match(remix,/const dailyDate=new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
  assert.match(remix,/const dailySeed=Number\(dailyDate\.replace\(\/-\/g,''\)\)/);
  assert.match(remix,/title:'OSGARD DAILY '\+dailyDate[^}]*seed:dailySeed/);
});
check('shared URL preserves challenge id and seed',()=>{
  for(const marker of ["searchParams.set('challenge',activeChallengeId)","searchParams.set('seed',String(activeChallengeSeed))","incomingChallengeId","challenge_invite_accepted"])assert.ok(remix.includes(marker),marker);
  assert.match(remix,/body:JSON\.stringify\(\{challengeId:activeChallengeId,maxPlayers:2\}\)/);
});
check('native share and clipboard fallback exist',()=>{
  assert.match(remix,/navigator\.share\(\{title:'REMIX — Challenge a friend'/);
  assert.match(remix,/navigator\.clipboard\.writeText\(link\)/);
  assert.ok(remix.includes('share_dialog_opened'));
  assert.ok(remix.includes('share_link_copied'));
});
check('result card can be rendered as a downloadable PNG',()=>{
  assert.ok(remix.includes('canvas.width=1200;canvas.height=630'));
  assert.ok(remix.includes("canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not encode result card.')),'image/png')") || remix.includes("canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not encode the result card.')),'image/png')"));
  assert.ok(remix.includes("downloadBlob(blob,'osgard-remix-challenge-'"));
});
check('native file sharing has a compatibility fallback',()=>{
  assert.ok(remix.includes('navigator.canShare({files:[file]})'));
  assert.ok(remix.includes('result_card_shared'));
  assert.ok(remix.includes('result_card_exported'));
  assert.ok(remix.includes('This browser cannot share files directly'));
});
check('sponsor CTA is hidden until a server RESULTS state',()=>{
  assert.match(remix,/<div id=\\?"sponsor-slot\\?" hidden/);
  assert.ok(remix.includes("querySelector('#sponsor-slot')"));
  assert.ok(remix.includes("reportEvent('game_session_completed'"));
});
check('sponsor CTA is inquiry-only and carries campaign UTM',()=>{
  assert.ok(remix.includes('PARTNER SLOT / INQUIRY ONLY'));
  assert.ok(remix.includes('No sponsor campaign is currently represented as active'));
  assert.ok(remix.includes("partnerUrl.searchParams.set('utm_medium','post_session')"));
  assert.ok(remix.includes("partnerUrl.searchParams.set('format','Спонсорское событие или уровень')"));
  assert.ok(remix.includes("reportEvent('partner_cta_clicked'"));
});
check('first-party event upload is only attempted for authenticated players',()=>{
  const fn=remix.slice(remix.indexOf('function reportEvent(name,payload){'),remix.indexOf('function resetForRematch'));
  assert.ok(fn.includes("localStorage.getItem('osgard.auth.accessToken')"));
  assert.ok(fn.includes('if(!token)return'));
  assert.ok(fn.includes("fetch('/api/v1/player/events'"));
  assert.ok(fn.includes("credentials:'same-origin'"));
  assert.ok(!/https?:\/\//.test(fn));
});
check('new events are typed in the shared OSGARD analytics contract',()=>{
  for(const name of ['challenge_created','challenge_invite_accepted','share_link_copied','share_dialog_opened','partner_cta_clicked','result_card_exported','result_card_shared'])assert.ok(manifest.includes("'"+name+"'"),name);
});
check('partner brief preselects format and preserves UTM fields',()=>{
  for(const marker of ['campaignParams','formatParam','utm_source','utm_medium','utm_campaign','utm_content',"attribution.join(' · ')"])assert.ok(partners.includes(marker),marker);
  assert.ok(partners.includes('item.value === formatParam'));
});
check('existing Unity player route remains intact',()=>{
  assert.ok(remix.includes('href="/games/remix/player/index.html"'));
  assert.ok(remix.includes('/v1/matches/'));
  assert.ok(remix.includes('/v1/challenges'));
});
check('player events require explicit analytics consent and authentication',()=>{
  assert.ok(remix.includes("localStorage.getItem('osgard.games.analytics-consent.v1')==='yes'"),'explicit OSGARD analytics consent gate missing');
  assert.ok(remix.includes('if(!consent||!token)return;'),'unauthorized or non-consenting player must not submit optional events');
});
check('sponsor enquiry opens outside the embedded game',()=>{
  assert.ok(remix.includes(String.raw`target=\"_blank\" rel=\"noopener noreferrer\"`),'sponsor CTA must open safely in a new tab');
});
check('no fake active ads, fake payments, or third-party ad SDK',()=>{
  for(const forbidden of ['googletagmanager','doubleclick.net','adsbygoogle','checkout.stripe.com','Buy now for $'])assert.ok(!remix.toLowerCase().includes(forbidden),forbidden);
});
const report={version:'remix-growth-v1',passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks};
console.log('SUMMARY',report.passed,'PASS /',report.failed,'FAIL');
if(report.failed)process.exitCode=1;
