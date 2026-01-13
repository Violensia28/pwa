export function parseQRPayload(text){
  const t=(text||'').trim();
  let m=t.match(/^tp6:\/\/asset\/(.+)$/); if(m) return {kind:'asset',id:m[1]};
  m=t.match(/^tp6:\/\/location\/(.+)$/); if(m) return {kind:'location',id:m[1]};
  return {kind:'unknown',raw:t};
}
