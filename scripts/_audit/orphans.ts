import fs from "node:fs";
import path from "node:path";
const ROOT = process.cwd();
const active = JSON.parse(fs.readFileSync("scripts/_audit/active-thumbs.json","utf8"));
const all = JSON.parse(fs.readFileSync("scripts/_audit/all-thumbs.json","utf8"));

function resolve(v: string|null){ if(!v) return null; if(v.startsWith("data:")) return "DATA_URI"; return path.join(ROOT,"public",v.replace(/^\//,"")); }

let missingFront=0, missingBack=0, okFront=0, dataUri=0;
const missingSamples: string[] = [];
const referenced = new Set<string>();
for (const r of active) {
  for (const [k,v] of [["front",r.thumbnailFront],["back",r.thumbnailBack]] as [string,string|null][]) {
    const p = resolve(v);
    if (!p) continue;
    if (p==="DATA_URI"){ dataUri++; continue; }
    referenced.add(path.normalize(p).toLowerCase());
    if (fs.existsSync(p)) { if(k==="front") okFront++; }
    else { if(k==="front"){missingFront++; if(missingSamples.length<8) missingSamples.push(`${r.slug} -> ${v}`);} else missingBack++; }
  }
}
console.log("=== ACTIVE templates: referenced thumbnail files ===");
console.log("front resolved OK :", okFront);
console.log("front MISSING     :", missingFront);
console.log("back  MISSING     :", missingBack);
console.log("still data-URI    :", dataUri);
if (missingSamples.length) { console.log("samples:"); missingSamples.forEach(s=>console.log("  "+s)); }

// all rows (incl inactive) referenced set
const referencedAll = new Set<string>();
for (const r of all) for (const v of [r.thumbnailFront, r.thumbnailBack]) {
  const p = resolve(v); if (p && p!=="DATA_URI") referencedAll.add(path.normalize(p).toLowerCase());
}

// walk disk dirs
function walk(dir: string): string[] {
  if(!fs.existsSync(dir)) return [];
  const out: string[]=[];
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const f = path.join(dir,e.name);
    if (e.isDirectory()) out.push(...walk(f)); else out.push(f);
  }
  return out;
}
for (const d of ["thumbs","card-art","product-art","templates","card-beds"]) {
  const dir = path.join(ROOT,"public","images",d);
  const files = walk(dir);
  if (!files.length) { console.log(`\n=== public/images/${d}: (absent) ===`); continue; }
  let bytes=0, unrefBytes=0, unref=0;
  const big: {f:string;b:number}[]=[];
  for (const f of files) {
    const b = fs.statSync(f).size; bytes+=b;
    big.push({f:path.relative(ROOT,f),b});
    if (!referencedAll.has(path.normalize(f).toLowerCase())) { unref++; unrefBytes+=b; }
  }
  big.sort((a,b)=>b.b-a.b);
  console.log(`\n=== public/images/${d} ===`);
  console.log(`files=${files.length}  total=${(bytes/1048576).toFixed(1)}MB  avg=${(bytes/files.length/1024).toFixed(1)}KB`);
  console.log(`unreferenced-by-CardTemplate: ${unref} files, ${(unrefBytes/1048576).toFixed(1)}MB`);
  console.log("largest:");
  big.slice(0,6).forEach(x=>console.log(`  ${(x.b/1024).toFixed(0).padStart(6)}KB  ${x.f}`));
  // size buckets
  const over200 = big.filter(x=>x.b>200*1024);
  const over500 = big.filter(x=>x.b>500*1024);
  console.log(`  >200KB: ${over200.length} files (${(over200.reduce((s,x)=>s+x.b,0)/1048576).toFixed(1)}MB)   >500KB: ${over500.length} files (${(over500.reduce((s,x)=>s+x.b,0)/1048576).toFixed(1)}MB)`);
}
