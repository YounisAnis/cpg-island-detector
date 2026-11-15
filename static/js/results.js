import {svgNode} from "./track.js";
const host=document.querySelector("#results");
function node(tag,text="",cls=""){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
function panel(title){const s=node("section","","panel");s.append(node("h2",title));host.append(s);return s;}
function tableBox(s,cols,rows){
  const scroll=node("div","","scroll"), t=node("table"), head=t.createTHead().insertRow(), body=t.createTBody();
  for(const col of cols){
    const header=node("th",col);
    header.scope="col";
    head.append(header);
  }
  for(const r of rows){
    const tr=body.insertRow();
    r.forEach((v,i)=>{
      const cell=tr.insertCell();
      cell.dataset.label=cols[i];
      cell.textContent=v??"—";
    });
  }
  scroll.append(t);s.append(scroll);
}
const decimal=v=>typeof v==="number"&&!Number.isInteger(v)?v.toFixed(3):v;
function sourced(s,text){s.append(node("p",text,"source"));}
function show(s,tab){tableBox(s,tab.columns,tab.rows.map(r=>r.map(decimal)));}
function chartBox(parent,title){
  const fig=node("figure");fig.append(node("figcaption",title));const svg=svgNode("svg",{role:"img","aria-label":title,viewBox:"0 0 470 215"});fig.append(svg);parent.append(fig);return svg;
}
function plotHistogram(parent,name,data){
  const svg=chartBox(parent,name+" · matched regions");
  const left=46, bottom=164, width=400, height=125;
  const maximum=Math.max(...data.start,...data.end), step=width/(data.edges.length-1);
  const add=(tag,attrs,txt)=>svg.appendChild(svgNode(tag,attrs,txt));
  for(const v of [0,maximum])add("text",{x:left-4,y:bottom-v/maximum*height+4,"text-anchor":"end"},String(v));
  add("line",{x1:left,x2:left+width,y1:bottom,y2:bottom,class:"axis"});
  for(const [field,cls] of [["start","series-a"],["end","series-b"]]){
    let d="";data[field].forEach((v,i)=>{const x=left+i*step,y=bottom-v/maximum*height;d+=(i===0?"M":"L")+x+" "+y+"H"+(x+step);});
    add("path",{d,fill:"none",stroke:cls==="series-a"?"var(--accent)":"var(--blue)","stroke-width":2,"stroke-dasharray":field==="end"?"5 2":"none"});
  }
  for(const i of [0,Math.floor(data.edges.length/2),data.edges.length-1])add("text",{x:left+i*step,y:183,"text-anchor":"middle"},String(data.edges[i]));
  add("text",{x:left,y:20},"Pairs");add("text",{x:250,y:204,"text-anchor":"middle"},"Signed boundary error (bp)");
}
function lengthChart(s,models){
  const svg=chartBox(s,"Loose recall by reference island length"), rows=models.Neural.length;
  const add=(t,a,txt)=>svg.appendChild(svgNode(t,a,txt));
  for(const value of [0,.5,1]){
    const y=164-value*128;add("line",{x1:42,x2:458,y1:y,y2:y,class:"axis"});add("text",{x:37,y:y+4,"text-anchor":"end"},String(value));
  }
  rows.forEach((row,i)=>{
    const x=54+i*81;
    for(const [j,name] of ["Neural","Compact"].entries()){
      const item=models[name].length[i],height=item.recall*128;
      const rect=add("rect",{x:x+j*22,y:164-height,width:19,height,class:j?"series-b":"series-a"});
      rect.append(svgNode("title",{},name+" · "+item.label+" bp · "+item.recall.toFixed(3)));
    }
    add("text",{x:x+20,y:184,"text-anchor":"middle"},row.label);
  });
  add("text",{x:42,y:20},"Recall");add("text",{x:250,y:205,"text-anchor":"middle"},"Reference island length (bp)");
}
async function render(){
  const [summary,hist]=await Promise.all(["results_summary","boundary_hist"].map(async f=>{const r=await fetch("/data/"+f+".json");if(!r.ok)throw Error();return r.json();}));
  const t=summary.tables,m=summary.models,derived=summary.derived_label;
  host.replaceChildren();
  let s=panel("Balanced-window classification");show(s,t["Table 2"]);sourced(s,"Paper · Table 2. A dash marks an unreported metric.");
  s=panel("Validation-selected settings");const p=t["Table 3"].settings;
  tableBox(s,["Window / stride (bp)","Threshold","Merge gap (bp)","Geometry","Minimum length (bp)"],[[p.window+" / "+p.stride,p.threshold,p.merge_gap,p.geometry,p.min_region_length]]);
  show(s,t["Table 3"]);sourced(s,"Paper · Table 3. Validation on chr17–18.");
  s=panel("Region precision and recall");tableBox(s,t["Table 5"].columns,t["Table 5"].rows.slice(0,2).map(r=>r.map(decimal)));
  const strict=m.Compact.cutoffs["0.5"];
  sourced(s,`Paper · Table 5. Compact strict precision was ${strict.precision.toFixed(3)}. About one in three predicted regions lacked a strict match. Neural had higher recall.`);
  s=panel("Overlap requirements");show(s,t["Table 6"]);sourced(s,"Paper · Table 6. Greedy one-to-one matching is recomputed at each cutoff.");
  s=panel("Results by chromosome");show(s,t["Table 7"]);sourced(s,"Paper · Table 7. Supplement · Table S7 (strict).");
  s=panel("Matched boundary errors");tableBox(s,["Model","Pairs","Median start (bp)","Median end (bp)","Abs. start / end (bp)","Both within 100 bp","% of pairs","% of all islands"],
    ["Neural","Compact"].map(n=>{const b=m[n].boundary;return [n==="Compact"?"Compact LightGBM":"Neural",b.pairs,...b.signed,b.absolute.join(" / "),b.within,b.pair_percent.toFixed(1),b.all_percent.toFixed(1)];}));
  const grid=node("div","","chart-grid");s.append(grid);for(const n of ["Neural","Compact"])plotHistogram(grid,n,hist[n]);
  s.append(node("p","Solid line · start error   /   Dashed line · end error","legend"));
  sourced(s,"Neural · Paper Table 8 and §3.4, Figure 5. Compact LightGBM · "+derived+". The histogram omits tails outside its axis. Summary statistics use all matched pairs.");
  s=panel("Recovery by island length");lengthChart(s,m);
  tableBox(s,["Length (bp)","Islands","Neural recovered","Neural recall","Compact recovered","Compact recall"],m.Neural.length.map((r,i)=>[r.label,r.islands,r.recovered,r.recall.toFixed(3),m.Compact.length[i].recovered,m.Compact.length[i].recall.toFixed(3)]));
  s.append(node("p","Left bar · Neural   /   Right bar · Compact LightGBM","legend"));
  sourced(s,"Neural · Supplement Table S8. Compact LightGBM · "+derived+".");
}
render().catch(()=>{
  const error=node("p","The benchmark files could not be loaded. Refresh this page to try again.");
  error.setAttribute("role","alert");
  host.replaceChildren(error);
}).finally(()=>host.setAttribute("aria-busy","false"));
