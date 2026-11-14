export const columns = ["start","end","length","score_mean","score_max","n_windows"];
export function regionTable(host, regions, select) {
  if (!regions.length) { host.textContent="No regions met the selected threshold and minimum length."; return; }
  const table=document.createElement("table"), head=table.createTHead().insertRow(), body=table.createTBody();
  let sort="start", dir=1;
  function draw() {
    body.replaceChildren();
    regions.map((r,i)=>({r,i})).sort((a,b)=>dir*(a.r[sort]-b.r[sort])).forEach(({r,i})=>{
      const row=body.insertRow(); row.dataset.region=i; row.tabIndex=0;
      row.onclick=()=>select(i); row.onkeydown=e=>{if(e.key==="Enter") select(i);};
      for(const c of columns) row.insertCell().textContent=c.startsWith("score") ? r[c].toFixed(6) : r[c];
    });
    [...head.cells].forEach(th=>th.setAttribute("aria-sort",th.dataset.col===sort?(dir===1?"ascending":"descending"):"none"));
  }
  for(const c of columns) {
    const th=document.createElement("th"), btn=document.createElement("button"); th.dataset.col=c;
    btn.textContent=c; btn.onclick=()=>{dir=sort===c?-dir:1; sort=c; draw();}; th.append(btn);head.append(th);
  }
  draw(); host.replaceChildren(table);
}
