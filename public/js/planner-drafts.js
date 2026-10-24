window.PlannerDraft = {
  state: null,
  valid(s) { return this.state === s && TM.user?._id === s.userId && SessionIdle.state?.generation === s.generation && currentTrip?._id === s.id; },
  status(message) { const el=editor.querySelector("#save-status"); if(el)el.textContent=message; },
  async start() {
    clearTimeout(this.timer);
    if(!currentTrip?.permissions?.canEdit) {this.state=null;return;}
    const s=this.state={id:currentTrip._id,userId:TM.user._id,generation:SessionIdle.state?.generation,revision:null,ready:false,blocked:false};
    try {
      const [{draft:stored},{itinerary:latest}]=await Promise.all([api.request(`/itineraries/${s.id}/draft`),api.request(`/itineraries/${s.id}`)]);
      const draft=stored || (dirty && currentTrip?.version!==latest.version ? {body:structuredClone(currentTrip),baseVersion:currentTrip.version,updatedAt:new Date().toISOString(),__v:null} : null);
      if(!this.valid(s))return;
      s.revision=draft?.__v ?? null;s.ready=true;s.blocked=!!draft;
      if(!draft){if(!dirty && currentTrip.version!==latest.version){currentTrip=latest;renderEditor();}if(dirty)this.schedule();return;}
      const conflict=draft.baseVersion!==latest.version;
      const describe=value=>`<p><strong>${TM.escape(value.title)}</strong> · ${value.travelers} người</p>${value.notes?`<p class="preserve-lines">${TM.escape(value.notes)}</p>`:""}${value.days.map((d,n)=>`<article><strong>Ngày ${n+1} · ${TM.date(d.date)}</strong><p>${d.items.map(i=>`${TM.escape(i.visitTime||"")} ${TM.escape(i.destinationId?.name || "Điểm không còn tồn tại")}${i.note?` · ${TM.escape(i.note)}`:""}`).join("<br>")||"Chưa có hoạt động"}</p>${d.notes?`<p class="preserve-lines">${TM.escape(d.notes)}</p>`:""}</article>`).join("")}<h3>Khoản chi bổ sung và thực tế</h3>${[...(value.expenses||[]),...(value.actualExpenses||[])].map(x=>`<p>${TM.escape(x.label)} · ${new Intl.NumberFormat("vi-VN").format(x.amountVnd)} ₫</p>`).join("")||"<p>Chưa ghi khoản chi.</p>"}`;
      const preview=describe(draft.body);
      const dialog=TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Tiếp tục bản nháp?</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Bản nháp riêng của bạn được lưu ${new Date(draft.updatedAt).toLocaleString("vi-VN")}. Chưa áp dụng vào lịch trình chung.</p>${conflict?'<p class="status-note warning">Lịch trình chung đã có phiên bản mới. Đối chiếu trước khi chọn khôi phục; bản nháp có cả các khoản ghi chi tiêu bạn đang sửa.</p>':""}<p><strong>${TM.escape(draft.body.title)}</strong> · ${draft.body.travelers} người</p>${conflict?`<details><summary>Xem bản lưu mới nhất của nhóm</summary>${describe(latest)}</details>`:""}<details><summary>Xem nội dung trong bản nháp</summary>${preview}</details><div class="form-actions"><button class="btn outline" id="discard-draft">Dùng bản đã lưu</button><button class="btn" id="recover-draft">Khôi phục bản nháp</button></div><p class="form-error" role="alert"></p></div>`,"modal-wide","Khôi phục bản nháp");
      dialog.querySelector("#discard-draft").onclick=async()=>{
        try{if(s.revision!=null)await api.request(`/itineraries/${s.id}/draft`,{method:"DELETE",body:{revision:s.revision}});if(!this.valid(s))return;s.revision=null;s.blocked=false;currentTrip=latest;dirty=false;dialog.close();renderEditor();this.status("Đang dùng bản lưu mới nhất.");}
        catch(e){dialog.querySelector(".form-error").textContent=e.message;}
      };
      dialog.querySelector("#recover-draft").onclick=async()=>{
        if(conflict&&!await TM.confirm("Áp dụng bản nháp để chỉnh sửa?","Kế hoạch và các khoản ghi chi tiêu trong bản nháp sẽ thay nội dung đang mở. Kiểm tra kỹ rồi bấm Lưu thay đổi để cập nhật lịch trình chung.","Khôi phục để chỉnh sửa"))return;
        if(!this.valid(s))return;
        currentTrip={...latest,...draft.body,version:latest.version,__v:latest.__v,permissions:latest.permissions,sharedAt:latest.sharedAt};s.blocked=false;dialog.close();markDirty();renderEditor();this.status("Đã khôi phục bản nháp. Kiểm tra rồi lưu thay đổi.");
      };
    }catch(e){if(this.valid(s)){s.blocked=true;this.status(`Chưa đồng bộ bản nháp: ${e.message}`);}}
  },
  schedule() { clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),1800); },
  async flush() {
    clearTimeout(this.timer);
    const s=this.state;
    if(!s||!this.valid(s)||!dirty||s.paused)return true;
    if(!s.ready||s.blocked){this.status("Bản nháp chưa đồng bộ. Mở Bản nháp để tải và đối chiếu.");return false;}
    if(s.pending) {await s.pending;if(this.valid(s)&&dirty)return this.flush();return true;}
    const body=TM.tripBody(currentTrip),serial=editSerial;
    if(currentTrip.confirmDateRemoval)body.confirmDateRemoval=true;
    s.pending=(async()=>{
      try {
        const result=await api.request(`/itineraries/${s.id}/draft`,{method:"PUT",body:{body,baseVersion:body.version,revision:s.revision}});
        if(!this.valid(s))return false;
        s.revision=result.revision;
        this.status(`Đã lưu bản nháp ${new Date(result.updatedAt).toLocaleTimeString("vi-VN")}. Chưa áp dụng vào lịch trình chung.`);
        if(editSerial!==serial)this.schedule();
        return true;
      }catch(e){if(this.valid(s)){if(e.status===409)s.blocked=true;this.status(`Chưa đồng bộ bản nháp: ${e.message}`);}return false;}
      finally{s.pending=null;}
    })();
    return s.pending;
  },
  async afterSave() {
    const s=this.state;if(!s||!this.valid(s)||s.revision==null)return;
    try{await api.request(`/itineraries/${s.id}/draft`,{method:"DELETE",body:{revision:s.revision}});if(this.valid(s))s.revision=null;}
    catch(e){if(this.valid(s))this.status(`Lịch trình đã lưu; bản nháp ở tab khác được giữ. ${e.message}`);}
  },
  async history() {
    if(!currentTrip)return;
    const id=currentTrip._id, userId=TM.user?._id,generation=SessionIdle.state?.generation;
    try {
      const result=await api.request(`/itineraries/${id}/history`);
      if(currentTrip?._id!==id||TM.user?._id!==userId||SessionIdle.state?.generation!==generation)return;
      const dialog=TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Lịch sử kế hoạch</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Giữ tối đa 15 bản trước mỗi lần lưu. Khôi phục hoạt động, ghi chú, ngày đi và ngân sách; giữ quyền cộng tác, liên kết chia sẻ và sổ chi thực tế.</p><div>${result.items.map(i=>`<article class="feedback-card"><strong>Phiên bản ${i.version} · ${TM.escape(i.title)}</strong><p>${new Date(i.savedAt).toLocaleString("vi-VN")} · ${i.activities} hoạt động</p><small>Lưu bởi ${TM.escape(i.authorName)}</small><div class="form-actions"><button class="btn outline small" data-preview-history="${i.version}">Xem kế hoạch</button>${currentTrip.permissions?.canEdit?`<button class="btn small" data-restore-history="${i.version}">Khôi phục</button>`:""}</div></article>`).join("")||'<p class="day-empty">Chưa có phiên bản trước. Lịch sử bắt đầu từ các lần lưu sau khi tính năng được bật.</p>'}</div><p class="form-error" role="alert"></p></div>`,"modal-wide","Lịch sử kế hoạch");
      dialog.onclick=async event=>{
        const button=event.target.closest("[data-preview-history],[data-restore-history]");if(!button)return;button.disabled=true;
        try{
          const version=button.dataset.previewHistory ?? button.dataset.restoreHistory;
          if(button.hasAttribute("data-preview-history")){
            const {plan}=await api.request(`/itineraries/${id}/history/${version}`);
            if(!dialog.isConnected)return;
            TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>${TM.escape(plan.title)} · v${version}</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div>${plan.days.map((d,n)=>`<article class="feedback-card"><h3>Ngày ${n+1} · ${TM.date(d.date)}</h3>${d.items.map(i=>`<p>${TM.escape(i.visitTime)} · ${TM.escape(i.destinationId?.name||"Điểm không còn tồn tại")}<br>${TM.escape(i.note)}</p>`).join("")}<p class="preserve-lines">${TM.escape(d.notes)}</p></article>`).join("")}</div>`,"modal-wide","Xem phiên bản kế hoạch");
          }else{
            if(dirty&&!await saveTrip())return;
            if(!await TM.confirm("Khôi phục kế hoạch cũ?","Kế hoạch hiện tại sẽ được lưu vào lịch sử trước khi thay thế. Quyền cộng tác và sổ chi thực tế được giữ.","Khôi phục kế hoạch"))return;
            await api.request(`/itineraries/${id}/history/${version}/restore`,{method:"POST",body:{version:currentTrip.version,confirm:true}});
            dialog.close();await TripTeam.refresh();await this.afterSave();await this.start();TM.toast("Đã khôi phục kế hoạch.");
          }
        }catch(e){if(dialog.isConnected)dialog.querySelector(".form-error").textContent=e.message;}
        finally{button.disabled=false;}
      };
    }catch(e){TM.toast(e.message,true);}
  },
};
editor.addEventListener("click",event=>{const b=event.target.closest("button");if(b?.id==="trip-history")PlannerDraft.history();if(b?.id==="trip-draft")PlannerDraft.start();});
document.addEventListener("before-session-clear",()=>{clearTimeout(PlannerDraft.timer);PlannerDraft.state=null;});
