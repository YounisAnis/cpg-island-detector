import {api} from "./api.js";
api("config").then(({parameters:p,limits:l})=>{
  document.querySelector("#algorithm").textContent=`Scan ${p.window} bp windows every ${p.stride} bp. Skip windows with more than ${p.max_ambiguous_fraction*100}% ambiguous bases. Scores at or above ${p.threshold} are hits. Join hit spans across gaps up to ${p.merge_gap} bp, place each boundary at the centre of the outermost hit and retain regions at least ${p.min_region_length} bp long.`;
  document.querySelector("#limits").textContent=`Send up to ${l.max_records} records and ${l.max_bases.toLocaleString()} total bases. Each record requires at least ${l.min_bases} bases. The JSON body limit is ${l.max_body_bytes.toLocaleString()} bytes.`;
}).catch(()=>document.querySelector("#limits").textContent="Server limits are temporarily unavailable.");
