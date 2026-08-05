
const PBKDF2_ITER = 310000;
const SALT = Uint8Array.from(atob("dzMUtM0dpCGvaH6HGrAGwQ=="), c => c.charCodeAt(0));

async function deriveKey(password){
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2", salt:SALT, iterations:PBKDF2_ITER, hash:"SHA-256"},
    base, {name:"AES-GCM", length:256}, true, ["decrypt"]);
}
async function keyFromStore(){
  const b64 = sessionStorage.getItem("pk") || localStorage.getItem("pk");
  if(!b64) return null;
  try{
    const raw = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
    return await crypto.subtle.importKey("raw", raw, {name:"AES-GCM"}, true, ["decrypt"]);
  }catch(e){ return null; }
}
async function storeKey(key, remember){
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const b64 = btoa(String.fromCharCode(...raw));
  sessionStorage.setItem("pk", b64);
  if(remember) localStorage.setItem("pk", b64);
}
async function decryptBuf(key, buf){
  const u = new Uint8Array(buf);
  const iv = u.slice(0,12), ct = u.slice(12);
  return crypto.subtle.decrypt({name:"AES-GCM", iv}, key, ct);
}
async function tryKey(key){
  try{
    const r = await fetch("check.enc", {cache:"no-store"});
    const pt = await decryptBuf(key, await r.arrayBuffer());
    return new TextDecoder().decode(pt) === "portfolio-ok";
  }catch(e){ return false; }
}
async function portfolioBoot(){
  const page = document.body.dataset.page;
  const key = await keyFromStore();
  if(!key || !(await tryKey(key))){
    sessionStorage.removeItem("pk"); localStorage.removeItem("pk");
    location.replace("index.html#" + page); return;
  }
  const r = await fetch("pages/" + page + ".enc", {cache:"no-store"});
  const pt = await decryptBuf(key, await r.arrayBuffer());
  document.getElementById("app").innerHTML = new TextDecoder().decode(pt);
  document.title = (document.querySelector("#app h1")||{}).textContent
      ? document.querySelector("#app h1").textContent + " — Leke Odumosu, U.S. History Portfolio"
      : document.title;
}
