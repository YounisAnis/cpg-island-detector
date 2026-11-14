import {api,detect} from "./api.js";
import {lengths} from "./fasta.js";
import {renderTrack} from "./track.js";
import {regionTable} from "./table.js";
import {download} from "./download.js";

const el = id=>document.getElementById(id), fmt=n=>n.toLocaleString();
let config, examples=[], result, running=false, sequenceVersion=0, active=null;
function status(state,msg){ el("status").dataset.state=state; el("status").textContent=msg; }
function update(){
  const n=lengths(el("input").value).reduce((a,b)=>a+b,0);
  el("counter").textContent=config?`${fmt(n)} / ${fmt(config.limits.max_bases)} bases`:`${fmt(n)} bases`;
  el("run").disabled=!config||running||!n||n>config.limits.max_bases;
}
function changed(){
  sequenceVersion++; active?.abort(); running=false; el("output").hidden=true; result=null;
  if(config) status("idle","Ready"); update();
}
function choose(i){document.querySelectorAll("[data-region]").forEach(n=>n.classList.toggle("selected",Number(n.dataset.region)===i));}
function showRecord(){
  if(!result) return;
  const r=result.records[Number(el("record").value)||0]; el("summary").replaceChildren();
  for(const [label,value] of [["Length (bp)",r.length],["Scored windows",r.windows.scored],["Skipped",r.windows.skipped],["Hit windows",r.windows.hit],["Regions",r.regions.length]]){
    const cell=document.createElement("div"), n=document.createElement("strong");cell.className="stat";n.textContent=fmt(value);cell.append(n,label);el("summary").append(cell);
  }
  regionTable(el("regions"),r.regions,choose);renderTrack(el("track"),r,config.parameters.threshold,choose);
  status("done",["Scan complete",...r.warnings].join(" · "));
}
el("record").onchange=showRecord;
el("input").oninput=()=>{el("example").value="";changed();};
el("example").onchange=()=>{if(el("example").value==="")return; const e=examples[Number(el("example").value)];el("input").value=">"+e.id+"\n"+e.sequence;changed();};
el("clear").onclick=()=>{el("example").value="";el("file").value="";el("input").value="";changed();el("input").focus();};
el("file").onchange=()=>{
  const file=el("file").files[0];if(!file)return;
  changed();const token=sequenceVersion;
  if(config&&file.size>config.limits.max_body_bytes){status("error","payload_too_large · File exceeds the request byte limit.");return;}
  const reader=new FileReader();
  reader.onload=()=>{if(token!==sequenceVersion)return;el("example").value="";el("input").value=reader.result;changed();};
  reader.onerror=()=>status("error","File could not be read.");reader.readAsText(file);
};
el("run").onclick=async()=>{
  if(!config||running)return;
  const input=el("input").value, token=sequenceVersion;
  if(new Blob([JSON.stringify({input,include_scores:true})]).size>config.limits.max_body_bytes){status("error","payload_too_large · JSON exceeds the request byte limit.");return;}
  const p=config.parameters,n=lengths(input).reduce((s,l)=>s+Math.max(0,Math.floor((l-p.window)/p.stride)+1),0);
  active=new AbortController();running=true;update();el("output").hidden=true;
  status("running",`Scoring ${fmt(n)} candidate windows…`);
  try{
    const response=await detect(input,active.signal);if(token!==sequenceVersion)return; result=response;
    el("record").replaceChildren(...result.records.map((r,i)=>new Option(r.id,i)));
    el("chooser").hidden=result.records.length===1;el("output").hidden=false;showRecord();
  }catch(e){if(token===sequenceVersion)status("error",e.message);}
  finally{if(token===sequenceVersion){active=null;running=false;update();}}
};
document.querySelectorAll("[data-export]").forEach(b=>b.onclick=()=>{if(result)download(b.dataset.export,result);});
window.addEventListener("resize",()=>{if(result&&!el("output").hidden)showRecord();});
fetch("/data/examples.json").then(r=>r.json()).then(data=>{examples=data;data.forEach((e,i)=>el("example").add(new Option(e.name,i)));}).catch(()=>{el("example").disabled=true;});
async function wake(){
  const timer=setTimeout(()=>status("waking","Server is waking up. This can take about one minute."),5000);
  let first=true;
  while(!config){
    try{await api("health",{signal:AbortSignal.timeout(first?5000:3000)});config=await api("config",{signal:AbortSignal.timeout(5000)});}
    catch{await new Promise(r=>setTimeout(r,3000));}
    first=false;
  }
  clearTimeout(timer);status("idle","Ready");update();
}
wake();
