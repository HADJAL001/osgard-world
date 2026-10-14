import { extractResponsesText } from "./game-coach.mjs";

const SCENARIOS = new Set(["flood", "blackout", "blockade"]);
const OBJECTIVES = new Set(["balanced", "risk", "protect", "conserve"]);
const ACTIONS = new Set(["pump", "grid", "route", "repair"]);
const NODES = new Set(["hub", "substation", "pump", "bridge", "hospital", "shelter"]);
const ROLES = new Set(["pareto", "reserve"]);
const FAMILIES = ["water-surge", "grid-overload", "weak-node-shock"];
const SEVERITIES = new Set(["mild", "moderate", "severe"]);
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]{1,80}$/i;
const object = v => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const finite = (v,min,max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v,min,max) => Number.isSafeInteger(v) && v >= min && v <= max;
const ACTION_LABELS = Object.freeze({pump:"Укрепить водоотвод",grid:"Стабилизировать энергосеть",route:"Открыть маршруты",repair:"Адресный ремонт"});

export const CIVIC_CASCADE_ADVISOR_SCHEMA = Object.freeze({
 type:"object", additionalProperties:false,
 properties:{
  title:{type:"string"},
  recommendedRank:{type:"string",enum:["1","2","3","none"]},
  summary:{type:"string"},evidence:{type:"string"},tradeoff:{type:"string"},caution:{type:"string"},nextExperiment:{type:"string"}
 },
 required:["title","recommendedRank","summary","evidence","tradeoff","caution","nextExperiment"]
});

export function validateCivicCascadeAdvisorInput(input){
 if(!object(input))return{ok:false,status:400,code:"CIVIC_ADVISOR_INPUT_INVALID"};
 if(input.consent!==true)return{ok:false,status:400,code:"CIVIC_ADVISOR_CONSENT_REQUIRED"};
 if(!SCENARIOS.has(input.scenario))return{ok:false,status:400,code:"CIVIC_ADVISOR_SCENARIO_INVALID"};
 if(!OBJECTIVES.has(input.objective))return{ok:false,status:400,code:"CIVIC_ADVISOR_OBJECTIVE_INVALID"};
 if(input.locale!==undefined&&input.locale!=="ru"&&input.locale!=="en")return{ok:false,status:400,code:"CIVIC_ADVISOR_LOCALE_INVALID"};
 if(!integer(input.evaluatedCandidateCount,0,1000))return{ok:false,status:400,code:"CIVIC_ADVISOR_METRICS_INVALID"};
 if(!object(input.baseline)||!finite(input.baseline.riskT90,0,100)||!finite(input.baseline.weakestIntegrityT90,0,100)||!integer(input.baseline.criticalNodesT90,0,6))return{ok:false,status:400,code:"CIVIC_ADVISOR_BASELINE_INVALID"};
 if(!Array.isArray(input.candidates)||input.candidates.length<1||input.candidates.length>3)return{ok:false,status:400,code:"CIVIC_ADVISOR_CANDIDATES_INVALID"};
 const ranks=new Set(),candidates=[];
 for(const raw of input.candidates){
  if(!object(raw)||!integer(raw.rank,1,input.candidates.length)||ranks.has(raw.rank)||!ROLES.has(raw.role))return{ok:false,status:400,code:"CIVIC_ADVISOR_CANDIDATE_INVALID"};
  ranks.add(raw.rank);
  if(!Array.isArray(raw.orders)||raw.orders.length<1||raw.orders.length>4)return{ok:false,status:400,code:"CIVIC_ADVISOR_ORDERS_INVALID"};
  const orders=[];
  for(const order of raw.orders){
   if(!object(order)||!ACTIONS.has(order.action))return{ok:false,status:400,code:"CIVIC_ADVISOR_ORDER_INVALID"};
   if(order.action==="repair"){
    if(typeof order.nodeId!=="string"||!NODES.has(order.nodeId))return{ok:false,status:400,code:"CIVIC_ADVISOR_NODE_INVALID"};
    orders.push({action:order.action,actionLabel:ACTION_LABELS[order.action],nodeId:order.nodeId});
   }else{
    if(order.nodeId!==null)return{ok:false,status:400,code:"CIVIC_ADVISOR_NODE_INVALID"};
    orders.push({action:order.action,actionLabel:ACTION_LABELS[order.action],nodeId:null});
   }
  }
  if(!integer(raw.resourceCost,0,10000)||!integer(raw.crewsUsed,0,4)||!finite(raw.nominalScore,0,100000)||!finite(raw.stressAdjustedScore,0,100000)||!finite(raw.riskT90,0,100)||!finite(raw.riskDeltaT90,-100,100)||!finite(raw.weakestIntegrityT90,0,100)||!integer(raw.stableProfiles,0,9)||raw.profileCount!==9)return{ok:false,status:400,code:"CIVIC_ADVISOR_METRICS_INVALID"};
  if(!Array.isArray(raw.worstStressByFamily)||raw.worstStressByFamily.length!==3)return{ok:false,status:400,code:"CIVIC_ADVISOR_STRESS_INVALID"};
  const familyMap=new Map();
  for(const p of raw.worstStressByFamily){
   if(!object(p)||!FAMILIES.includes(p.family)||familyMap.has(p.family)||!SEVERITIES.has(p.severity)||!finite(p.riskDelta90,-100,100)||!finite(p.weakestIntegrityDelta,-100,100)||!integer(p.criticalNodeDelta,-6,6))return{ok:false,status:400,code:"CIVIC_ADVISOR_STRESS_INVALID"};
   familyMap.set(p.family,{family:p.family,severity:p.severity,riskDelta90:p.riskDelta90,weakestIntegrityDelta:p.weakestIntegrityDelta,criticalNodeDelta:p.criticalNodeDelta});
  }
  if(FAMILIES.some(f=>!familyMap.has(f)))return{ok:false,status:400,code:"CIVIC_ADVISOR_STRESS_INVALID"};
  candidates.push({rank:raw.rank,role:raw.role,orders,resourceCost:raw.resourceCost,crewsUsed:raw.crewsUsed,nominalScore:raw.nominalScore,stressAdjustedScore:raw.stressAdjustedScore,riskT90:raw.riskT90,riskDeltaT90:raw.riskDeltaT90,weakestIntegrityT90:raw.weakestIntegrityT90,stableProfiles:raw.stableProfiles,profileCount:9,worstStressByFamily:FAMILIES.map(f=>familyMap.get(f))});
 }
 if(ranks.size!==input.candidates.length)return{ok:false,status:400,code:"CIVIC_ADVISOR_CANDIDATE_INVALID"};
 return{ok:true,data:{scenario:{id:input.scenario},objective:input.objective,locale:input.locale==="en"?"en":"ru",evaluatedCandidateCount:input.evaluatedCandidateCount,baseline:{riskT90:input.baseline.riskT90,weakestIntegrityT90:input.baseline.weakestIntegrityT90,criticalNodesT90:input.baseline.criticalNodesT90},candidates:candidates.sort((a,b)=>a.rank-b.rank)}};
}

export function isCivicCascadeAdvisorConfigured(env=process.env){
 const apiKey=typeof env.OPENAI_API_KEY==="string"?env.OPENAI_API_KEY.trim():"";
 const enabled=env.OPENAI_CIVIC_CASCADE_ADVISOR_ENABLED==="true";
 const requested=env.OPENAI_CIVIC_CASCADE_ADVISOR_MODEL||env.OPENAI_GAME_COACH_MODEL||"gpt-6-luna";
 const model=typeof requested==="string"&&MODEL_PATTERN.test(requested)?requested:"gpt-6-luna";
 return{enabled:enabled&&apiKey.length>0,model,apiKey};
}
export function extractCivicCascadeAdvisorText(payload){
 if(typeof payload?.output_text==="string"&&payload.output_text.trim())return payload.output_text.trim();
 const chunks=[];
 for(const item of Array.isArray(payload?.output)?payload.output:[])if(item?.type==="message"&&Array.isArray(item.content))for(const part of item.content)if(part?.type==="output_text"&&typeof part.text==="string")chunks.push(part.text);
 return chunks.join("\n").trim();
}
export function validateCivicCascadeAdvisorOutput(value,candidateCount){
 if(!object(value)||!["1","2","3","none"].includes(value.recommendedRank))return null;
 const limits={title:90,summary:320,evidence:360,tradeoff:280,caution:280,nextExperiment:240},result={recommendedRank:value.recommendedRank};
 for(const [key,max] of Object.entries(limits)){if(typeof value[key]!=="string")return null;const text=value[key].trim();if(!text||text.length>max)return null;result[key]=text}
 if(result.recommendedRank!=="none"&&Number(result.recommendedRank)>candidateCount)return null;
 return result;
}
export async function generateCivicCascadeAdvice(input,{env=process.env,fetchImpl=globalThis.fetch,timeoutMs=12000}={}){
 const checked=validateCivicCascadeAdvisorInput(input);if(!checked.ok)return checked;
 const config=isCivicCascadeAdvisorConfigured(env);
 if(!config.enabled)return{ok:false,status:503,code:"OPENAI_CIVIC_ADVISOR_NOT_CONFIGURED"};
 if(typeof fetchImpl!=="function")return{ok:false,status:503,code:"OPENAI_CIVIC_ADVISOR_UNAVAILABLE"};
 const instructions=checked.data.locale==="en"
  ?"You are a cautious strategy auditor for CIVIC CASCADE, a deterministic crisis simulation. Use only supplied structured metrics. Do not invent rules, outcomes, weather, future random incidents or causal evidence. The local engine remains the source of truth. Recommend a listed candidate only when evidence supports it; otherwise set recommendedRank to none. Explain measurable benefit, trade-off, limitation and one falsifiable experiment. Never execute or modify a plan. Return only the strict JSON schema."
  :"Ты — осторожный аудитор стратегий CIVIC CASCADE. Используй только переданные метрики. Не выдумывай правила, исходы, погоду, будущие инциденты или причинность. Локальный движок остаётся источником истины. Рекомендуй вариант только если измерения это оправдывают, иначе укажи recommendedRank=none. Объясни выгоду, компромисс, ограничение и один проверяемый эксперимент. Не выполняй и не меняй план. Верни только строгий JSON Schema.";
 let response;
 try{response=await fetchImpl("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+config.apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:config.model,store:false,max_output_tokens:500,input:[{role:"system",content:instructions},{role:"user",content:JSON.stringify(checked.data)}],text:{format:{type:"json_schema",name:"osgard_civic_cascade_advisor",strict:true,schema:CIVIC_CASCADE_ADVISOR_SCHEMA}}}),signal:AbortSignal.timeout(timeoutMs)})}
 catch{return{ok:false,status:503,code:"OPENAI_CIVIC_ADVISOR_UNAVAILABLE"}}
 if(!response?.ok)return{ok:false,status:503,code:response?.status===429?"OPENAI_CIVIC_ADVISOR_BUSY":"OPENAI_CIVIC_ADVISOR_UNAVAILABLE"};
 let payload;try{payload=await response.json()}catch{return{ok:false,status:502,code:"OPENAI_CIVIC_ADVISOR_BAD_RESPONSE"}}
 const output=extractCivicCascadeAdvisorText(payload);if(!output)return{ok:false,status:502,code:"OPENAI_CIVIC_ADVISOR_EMPTY_RESPONSE"};
 let parsed;try{parsed=JSON.parse(output)}catch{return{ok:false,status:502,code:"OPENAI_CIVIC_ADVISOR_BAD_RESPONSE"}}
 const advice=validateCivicCascadeAdvisorOutput(parsed,checked.data.candidates.length);
 if(!advice)return{ok:false,status:502,code:"OPENAI_CIVIC_ADVISOR_BAD_SCHEMA"};
 return{ok:true,advice};
}
