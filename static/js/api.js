export async function api(path, options = {}) {
  const response = await fetch("/api/v1/" + path, options);
  if (response.ok) return response.json();
  const data = await response.json().catch(() => null);
  const timedOut = response.status === 408 || response.status === 504;
  const message = timedOut
    ? "The request timed out. Try a shorter sequence and run again."
    : "The server could not complete the request.";
  const error = new Error(data?.error?.message || message);
  error.code = data?.error?.code || (timedOut ? "time_budget_exceeded" : "internal_error");
  error.details = data?.error?.details;
  throw error;
}
export const detect = (input, signal) => api("detect", {method:"POST", signal,
  headers:{"Content-Type":"application/json"}, body:JSON.stringify({input, include_scores:true})});
