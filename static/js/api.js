export async function api(path, options = {}) {
  const response = await fetch("/api/v1/" + path, options);
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.code + " · " + data.error?.message);
  return data;
}
export const detect = (input, signal) => api("detect", {method:"POST", signal,
  headers:{"Content-Type":"application/json"}, body:JSON.stringify({input, include_scores:true})});
