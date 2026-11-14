import {columns} from "./table.js";
const csv = v => '"' + String(v).replaceAll('"','""') + '"';
export function download(kind, result) {
  let data, name, type;
  const rows = result.records.flatMap(r=>r.regions.map((region,i)=>({id:r.id,region,i})));
  if (kind==="json") {
    data=JSON.stringify(result,null,2); name="result.json"; type="application/json";
  } else if (kind==="bed") {
    data=rows.map(({id,region:r,i})=>[id,r.start,r.end,"cpg_"+(i+1),Math.round(r.score_mean*1000)].join("\t")).join("\n");
    name="regions.bed"; type="text/plain";
  } else {
    data=[["id",...columns].join(","),...rows.map(({id,region})=>[csv(id),...columns.map(k=>region[k])].join(","))].join("\n");
    name="regions.csv"; type="text/csv";
  }
  const url=URL.createObjectURL(new Blob([data+"\n"],{type}));
  const link=document.createElement("a"); link.href=url; link.download=name; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}
