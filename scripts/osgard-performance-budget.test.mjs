import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditPerformanceBudget } from './osgard-performance-budget.mjs';

async function fixture(){
  const base=await mkdtemp(join(tmpdir(),'osgard-perf-budget-'));
  const root=join(base,'dist');
  await mkdir(join(root,'assets'),{recursive:true});
  await writeFile(join(root,'index.html'),'<html><head></head><body>OSGARD</body></html>');
  await writeFile(join(root,'assets','app.js'),'export const ready = true;');
  await writeFile(join(root,'assets','app.css'),'body { color: #123; }');
  return {base,root,report:join(base,'osgard-performance-budget.json')};
}
test('performance gate reports gzip and Brotli sizes for the application shell',async()=>{
  const f=await fixture();
  try{
    const result=await auditPerformanceBudget(f.root,f.report);
    assert.equal(result.schema,'osgard.performance-budget.v1');
    assert.equal(result.status,'ready');
    assert.equal(result.summary.failed,0);
    assert.equal(result.metrics.js.count,1);
    assert.equal(result.metrics.css.count,1);
    assert.ok(result.metrics.js.gzipBytes>0);
    assert.ok(result.metrics.js.brotliBytes>0);
    assert.match(result.budget.sha256,/^[a-f0-9]{64}$/);
    assert.equal(JSON.parse(await readFile(f.report,'utf8')).status,'ready');
  }finally{await rm(f.base,{recursive:true,force:true});}
});
test('performance gate blocks a JavaScript chunk over the raw-byte ceiling',async()=>{
  const f=await fixture();
  try{
    await writeFile(join(f.root,'assets','oversized.js'),'x'.repeat(700*1024));
    const result=await auditPerformanceBudget(f.root,f.report);
    assert.equal(result.status,'blocked');
    assert.ok(result.checks.some(check=>check.id==='perf:js-file-raw'&&check.status==='failed'));
  }finally{await rm(f.base,{recursive:true,force:true});}
});
test('performance gate rejects symlinked assets',async()=>{
  const f=await fixture();
  try{
    const outside=join(f.base,'outside.js');
    await writeFile(outside,'secret');
    await symlink(outside,join(f.root,'assets','linked.js'));
    await assert.rejects(()=>auditPerformanceBudget(f.root,f.report),/symlink/i);
  }finally{await rm(f.base,{recursive:true,force:true});}
});
test('performance report must be outside the hashed build root',async()=>{
  const f=await fixture();
  try{
    await assert.rejects(()=>auditPerformanceBudget(f.root,join(f.root,'budget.json')),/outside dist/i);
  }finally{await rm(f.base,{recursive:true,force:true});}
});
