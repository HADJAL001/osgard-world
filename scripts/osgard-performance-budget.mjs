import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants as zc } from 'node:zlib';
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const DEFAULT_REPORT=resolve(ROOT,process.env.OSGARD_PERFORMANCE_REPORT||'osgard-performance-budget.json');
const KiB=1024;
export const BUDGETS=Object.freeze({
  htmlGzipBytes:16*KiB, jsFileRawBytes:600*KiB, jsFileGzipBytes:180*KiB,
  jsTotalGzipBytes:380*KiB, cssFileRawBytes:360*KiB, cssTotalGzipBytes:110*KiB,
  criticalGzipBytes:512*KiB, jsFileCount:20, cssFileCount:10, advisoryJsRawBytes:500*KiB,
});
const sha=value=>createHash('sha256').update(value).digest('hex');
function compressed(data){return {rawBytes:data.byteLength,gzipBytes:gzipSync(data,{level:9,mtime:0}).byteLength,
  brotliBytes:brotliCompressSync(data,{params:{[zc.BROTLI_PARAM_QUALITY]:4}}).byteLength};}
function safePath(path){
  const p=path.split(sep).join('/');
  if(!p||p.startsWith('/')||p.includes('\\')||p.split('/').some(x=>!x||x==='.'||x==='..'))throw new Error('Unsafe build asset path: '+path);
  return p;
}
async function scanAssets(root){
  const files=[];
  async function visit(dir){
    for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      const full=resolve(dir,entry.name), info=await lstat(full), path=safePath(relative(root,full));
      if(info.isSymbolicLink())throw new Error('Symlink in critical build assets: '+path);
      if(info.isDirectory()){await visit(full);continue;}
      if(!info.isFile())throw new Error('Unsupported build entry: '+path);
      const ext=entry.name.toLowerCase();
      const kind=ext.endsWith('.js')||ext.endsWith('.mjs')?'js':ext.endsWith('.css')?'css':ext.endsWith('.map')?'map':'other';
      if(kind!=='other')files.push({path,kind,...compressed(await readFile(full))});
    }
  }
  await visit(resolve(root,'assets'));
  return files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
function summarize(files,kind){
  const list=files.filter(f=>f.kind===kind);
  const largest=list.slice().sort((a,b)=>b.rawBytes-a.rawBytes||a.path.localeCompare(b.path,'en'))[0]||null;
  return {count:list.length,rawBytes:list.reduce((n,f)=>n+f.rawBytes,0),gzipBytes:list.reduce((n,f)=>n+f.gzipBytes,0),
    brotliBytes:list.reduce((n,f)=>n+f.brotliBytes,0),
    largestFile:largest?{path:largest.path,rawBytes:largest.rawBytes,gzipBytes:largest.gzipBytes,brotliBytes:largest.brotliBytes}:null};
}
export async function auditPerformanceBudget(rootPath=resolve('dist'),outputPath=DEFAULT_REPORT){
  const root=resolve(rootPath),output=resolve(outputPath),rootInfo=await lstat(root).catch(()=>null);
  if(!rootInfo?.isDirectory()||rootInfo.isSymbolicLink())throw new Error('Build root must be a real directory.');
  const outRel=relative(root,output);
  if(outRel===''||(!outRel.startsWith('..'+sep)&&outRel!=='..'&&!/^[A-Za-z]:[\\/]/.test(outRel)))throw new Error('Performance report must be outside dist.');
  const htmlPath=resolve(root,'index.html'),htmlInfo=await lstat(htmlPath).catch(()=>null);
  if(!htmlInfo?.isFile()||htmlInfo.isSymbolicLink())throw new Error('A regular root index.html is required.');
  const assetsInfo=await lstat(resolve(root,'assets')).catch(()=>null);
  if(!assetsInfo?.isDirectory()||assetsInfo.isSymbolicLink())throw new Error('A real assets directory is required.');
  const html={path:'index.html',...compressed(await readFile(htmlPath))};
  const files=await scanAssets(root),js=summarize(files,'js'),css=summarize(files,'css');
  const metrics={html,js,css,sourceMapFiles:files.filter(f=>f.kind==='map').map(f=>f.path),
    criticalGzipBytes:html.gzipBytes+js.gzipBytes+css.gzipBytes,
    inventorySha256:sha(files.map(f=>[f.path,f.rawBytes,f.gzipBytes,f.brotliBytes].join('\0')).join('\n')+'\n'+[html.rawBytes,html.gzipBytes,html.brotliBytes].join('\0'))};
  const checks=[];
  const add=(id,title,ok,detail,severity='error')=>checks.push({id,title,status:ok?'passed':severity==='warning'?'warning':'failed',detail});
  add('perf:html-gzip','HTML gzip budget',html.gzipBytes<=BUDGETS.htmlGzipBytes,html.gzipBytes+' / '+BUDGETS.htmlGzipBytes+' bytes');
  add('perf:js-file-raw','Largest JS raw size',!js.largestFile||js.largestFile.rawBytes<=BUDGETS.jsFileRawBytes,(js.largestFile?.path||'none')+': '+(js.largestFile?.rawBytes||0)+' / '+BUDGETS.jsFileRawBytes);
  add('perf:js-file-gzip','Largest JS gzip size',!js.largestFile||js.largestFile.gzipBytes<=BUDGETS.jsFileGzipBytes,(js.largestFile?.path||'none')+': '+(js.largestFile?.gzipBytes||0)+' / '+BUDGETS.jsFileGzipBytes);
  add('perf:js-total-gzip','Total JS gzip size',js.gzipBytes<=BUDGETS.jsTotalGzipBytes,js.gzipBytes+' / '+BUDGETS.jsTotalGzipBytes+' bytes');
  add('perf:css-file-raw','Largest CSS raw size',!css.largestFile||css.largestFile.rawBytes<=BUDGETS.cssFileRawBytes,(css.largestFile?.path||'none')+': '+(css.largestFile?.rawBytes||0)+' / '+BUDGETS.cssFileRawBytes);
  add('perf:css-total-gzip','Total CSS gzip size',css.gzipBytes<=BUDGETS.cssTotalGzipBytes,css.gzipBytes+' / '+BUDGETS.cssTotalGzipBytes+' bytes');
  add('perf:critical-gzip','Critical app shell transfer',metrics.criticalGzipBytes<=BUDGETS.criticalGzipBytes,metrics.criticalGzipBytes+' / '+BUDGETS.criticalGzipBytes+' bytes');
  add('perf:js-count','JS chunk count',js.count>0&&js.count<=BUDGETS.jsFileCount,js.count+' / '+BUDGETS.jsFileCount);
  add('perf:css-count','CSS chunk count',css.count>0&&css.count<=BUDGETS.cssFileCount,css.count+' / '+BUDGETS.cssFileCount);
  const large=files.filter(f=>f.kind==='js'&&f.rawBytes>BUDGETS.advisoryJsRawBytes);
  add('perf:large-chunk-advisory','Chunks near maximum are visible to reviewers',large.length===0,
    large.length?large.map(f=>f.path+' ('+f.rawBytes+' bytes)').join('; '):'No JS chunk exceeds '+BUDGETS.advisoryJsRawBytes+' bytes','warning');
  add('perf:source-map-advisory','Public source maps are reported',metrics.sourceMapFiles.length===0,
    metrics.sourceMapFiles.join(', ')||'No source maps under dist/assets.','warning');
  const summary={checks:checks.length,passed:checks.filter(c=>c.status==='passed').length,
    failed:checks.filter(c=>c.status==='failed').length,warnings:checks.filter(c=>c.status==='warning').length};
  const stable={budgets:BUDGETS,metrics,checks:checks.map(c=>({id:c.id,status:c.status}))};
  const report={schema:'osgard.performance-budget.v1',generatedAt:new Date().toISOString(),
    status:summary.failed===0?'ready':'blocked',summary,budgets:BUDGETS,metrics,budget:{sha256:sha(JSON.stringify(stable))},checks};
  await writeFile(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  return report;
}
async function main(){
  const args=process.argv.slice(2);let root=resolve(process.env.OSGARD_BUILD_ROOT||'dist'),output=DEFAULT_REPORT;
  while(args.length){const flag=args.shift(),value=args.shift();if(!value)throw new Error('Missing value for '+flag);
    if(flag==='--root')root=resolve(value);else if(flag==='--output')output=resolve(value);else throw new Error('Unknown argument: '+flag);}
  const r=await auditPerformanceBudget(root,output);
  console.log(JSON.stringify({schema:r.schema,status:r.status,metrics:r.metrics,summary:r.summary,output},null,2));
  if(r.status!=='ready')process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('OSGARD performance budget failed: '+String(error.message||error));process.exitCode=1;});
