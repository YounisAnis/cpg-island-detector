export function svgNode(tag, attrs = {}, text = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v);
  if (text) node.textContent = text;
  return node;
}
export function renderTrack(host, record, threshold, select) {
  const width = Math.max(410, host.clientWidth), left = 54, right = width - 24, plot = right-left;
  const x = bp => left + bp / record.length * plot, y = score => 116 - score * 88;
  const svg = svgNode("svg",{viewBox:`0 0 ${width} 198`,role:"img","aria-label":"Window scores and predicted CpG island regions"});
  const add = (tag, attrs, text) => svg.appendChild(svgNode(tag,attrs,text));
  add("text",{x:left,y:15},"Window score");
  add("line",{x1:left,x2:right,y1:y(threshold),y2:y(threshold),class:"threshold"});
  add("text",{x:left-6,y:y(threshold)+4,"text-anchor":"end"},String(threshold));
  add("text",{x:left-6,y:y(0)+4,"text-anchor":"end"},"0");
  let path = "", connected = false, peak = null;
  function flush() {
    if (peak === null) return;
    path += (connected ? "L" : "M") + x(peak.bp) + " " + y(peak.score) + " ";
    if (!connected) path += "l0.1 0 ";
    peak = null; connected = true;
  }
  const values = record.scores.values;
  values.forEach((score,i) => {
    if (score === null) { flush(); connected = false; return; }
    const bp = i*record.scores.stride, bin = values.length > 1000 ? Math.floor(x(bp)) : i;
    if (peak && peak.bin !== bin) flush();
    if (!peak || score > peak.score) peak = {score,bp,bin};
  });
  flush(); add("path",{d:path,class:"score"});
  add("text",{x:left,y:139},"Regions");
  add("line",{x1:left,x2:right,y1:162,y2:162,class:"axis"});
  record.regions.forEach((r,i) => {
    const rect=add("rect",{x:x(r.start),y:146,width:Math.max(1,x(r.end)-x(r.start)),height:12,class:"region","data-region":i});
    rect.append(svgNode("title",{},`${r.start}–${r.end} · ${r.length} bp · mean ${r.score_mean} · max ${r.score_max} · ${r.n_windows} hit windows`));
    rect.addEventListener("click",()=>select(i));
  });
  const rough = record.length / Math.max(2,Math.floor(plot/95));
  const magnitude = 10**Math.floor(Math.log10(rough));
  const step = [1,2,5,10].find(n=>n*magnitude>=rough)*magnitude;
  for (let bp=0;bp<=record.length;bp+=step) add("text",{x:x(bp),y:180,"text-anchor":"middle"},bp.toLocaleString());
  add("text",{x:right,y:195,"text-anchor":"end"},"Position (bp)");
  host.replaceChildren(svg);
}
