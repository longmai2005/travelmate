window.OfflineTrips = {
  async database() {
    return new Promise((resolve,reject)=>{const request=indexedDB.open("travelmate-offline",1);request.onupgradeneeded=()=>request.result.createObjectStore("trips",{keyPath:"key"});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error("Thiết bị chưa cho phép lưu ngoại tuyến."));});
  },
  async transaction(mode, action) {
    const db=await this.database();
    try { return await new Promise((resolve,reject)=>{const tx=db.transaction("trips",mode);let value;action(tx.objectStore("trips"),v=>value=v);tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(new Error("Không đọc/ghi được bản ngoại tuyến."));tx.onabort=()=>reject(new Error("Lưu ngoại tuyến bị gián đoạn."));}); }
    finally { db.close(); }
  },
  async save(trip) {
    if(!TM.user || !SessionIdle.state || SessionIdle.check()) throw new Error("Đăng nhập trước khi lưu ngoại tuyến.");
    if(!navigator.serviceWorker) throw new Error("Trình duyệt chưa hỗ trợ chế độ ngoại tuyến. Bạn có thể lưu PDF.");
    await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error("Chưa chuẩn bị xong chế độ ngoại tuyến. Tải lại trang rồi thử lại.")), 12000))]);
    const snapshot=structuredClone(trip);
    // Do not retain account IDs, collaborator identities or access metadata in a snapshot.
    delete snapshot.userId;delete snapshot.collaborators;delete snapshot.permissions;delete snapshot.ownerName;
    await this.transaction("readwrite",store=>store.put({key:`${TM.user._id}:${trip._id}`,userId:TM.user._id,trip:snapshot,savedAt:new Date().toISOString()}));
    localStorage.setItem("tm-offline-user",JSON.stringify({_id:TM.user._id,fullName:TM.user.fullName,role:TM.user.role,generation:SessionIdle.state.generation}));
  },
  async list(userId) { return this.transaction("readonly",(store,done)=>{const request=store.getAll();request.onsuccess=()=>done(request.result.filter(row=>row.userId===userId));}); },
  async remove(key) { return this.transaction("readwrite",store=>store.delete(key)); },
  async clearUser(userId) {
    try { localStorage.removeItem("tm-offline-user"); const rows=await this.list(userId);await this.transaction("readwrite",store=>rows.forEach(row=>store.delete(row.key))); }
    catch { /* Private browser modes may disable IndexedDB. */ }
  },
  identity() {
    try {
      const user=JSON.parse(localStorage.getItem("tm-offline-user")),state=JSON.parse(localStorage.getItem("tm-idle-session"));
      if(user && state && user._id===state.userId && user.generation===state.generation && Date.now()+(state.offset||0)<state.lastInteraction+state.timeoutMs) return {user,session:{timeoutMs:state.timeoutMs,expiresAt:state.lastInteraction+state.timeoutMs,serverNow:Date.now()+(state.offset||0),generation:state.generation}};
      if(user) this.clearUser(user._id);
    } catch { /* Ignore malformed local metadata. */ }
    return null;
  },
};
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
