window.AdminPublishing={
  labels:{draft:"Bản nháp",pending:"Chờ duyệt",published:"Đã xuất bản"},
  render(result){
    document.querySelector("#editorial-total").textContent=result.total;
    document.querySelector("#editorial-list").innerHTML=result.items.map(d=>`<article class="feedback-card editorial-row"><div><span class="badge">${this.labels[d.status]}</span><h3>${TM.escape(d.name)}</h3><p>${TM.escape(d.province)} · ${d.verifiedOn?`Đối chiếu ngày ${TM.date(d.verifiedOn)}`:"Chưa ghi ngày đối chiếu"}</p><small>${d.editor?`Biên tập gần nhất: ${TM.escape(d.editor)}`:"Chưa có bản sửa"}${d.isActive?" · Đang hiển thị":" · Đang ẩn"}</small></div><div class="form-actions"><button class="btn outline small" data-open-editorial="${d._id}">Xem & duyệt</button><button class="btn small" data-edit-editorial="${d._id}">Soạn bản sửa</button></div></article>`).join("")||'<div class="admin-empty">Không có điểm đến phù hợp.</div>';
    AdminPeople.pagination("editorial",result);
  },
  preview(body){
    if(!body)return '<p class="field-help">Chưa có bản nháp.</p>';
    return `<div class="editorial-preview"><img src="${TM.escape(body.imageUrl)}" alt="${TM.escape(body.name)}"><h3>${TM.escape(body.name)}</h3><p>${TM.escape(body.province)} · ${body.isActive?"Hiển thị sau xuất bản":"Tiếp tục ẩn sau xuất bản"}</p><p class="preserve-lines">${TM.escape(body.description)}</p><dl><dt>Địa chỉ</dt><dd>${TM.escape(body.address||"Chưa bổ sung")}</dd><dt>Giờ mở cửa</dt><dd>${TM.escape(body.openingHours||"Chưa kiểm tra")}</dd><dt>Chi phí hoạt động</dt><dd>${TM.money(body.estimatedCostPerPersonVnd)}</dd><dt>Ngày đối chiếu</dt><dd>${TM.escape(body.verifiedOn||"Chưa có")}</dd><dt>Ngày / năm chụp ảnh</dt><dd>${TM.escape(body.imageTakenOn||"Chưa rõ")}</dd><dt>Nguồn ảnh</dt><dd>${body.imageSourceUrl?`<a href="${TM.escape(body.imageSourceUrl)}" target="_blank" rel="noopener noreferrer">Đối chiếu ảnh ↗</a>`:"Chưa có"}</dd></dl>${body.sourceUrl?`<p><a href="${TM.escape(body.sourceUrl)}" target="_blank" rel="noopener noreferrer">Đối chiếu nguồn thông tin ↗</a></p>`:""}<p>${TM.escape(body.priceNote||"")}</p></div>`;
  },
  async open(id){
    const userId=TM.user?._id,generation=SessionIdle.state?.generation;
    try{
      const c=await api.request(`/admin/editorial/${id}`);
      if(TM.user?._id!==userId||SessionIdle.state?.generation!==generation)return;
      const ed=c.editorial;
      const dialog=TM.dialog(`<div class="modal-body"><div class="modal-heading"><div><div class="eyebrow">${this.labels[ed.status]}</div><h2>${TM.escape(c.destination.name)}</h2></div><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Chỉ xuất bản sau khi kiểm tra nguồn, ngày đối chiếu và ảnh. Trạng thái hiển thị theo lựa chọn trong bản nháp.</p>${ed.draft&&ed.baseContentVersion!==c.publishedVersion?'<p class="status-note warning">Bản nháp dựa trên nội dung cũ. Mở soạn bản sửa và đối chiếu trước khi gửi duyệt lại.</p>':""}<div class="editorial-compare"><section><h3>Bản đang lưu</h3>${this.preview(c.destination)}</section><section><h3>Bản sửa đang chờ</h3>${this.preview(ed.draft)}</section></div><div class="form-actions"><button class="btn outline" id="editorial-compose">Soạn bản sửa</button>${ed.status==="pending"?'<button class="btn" id="editorial-publish">Xuất bản nội dung</button>':""}</div><p class="form-error" role="alert"></p><h3>Lịch sử xuất bản</h3>${[...(ed.history||[])].reverse().map(h=>`<article class="feedback-card"><strong>${TM.escape(h.body.name)}</strong><p>Lưu trước lần xuất bản bởi ${TM.escape(h.publishedBy)} · ${new Date(h.publishedAt).toLocaleString("vi-VN")}</p><button class="btn outline small" data-editorial-history="${h._id}">Xem / dùng lại bản này</button></article>`).join("")||'<p class="field-help">Chưa có phiên bản trước. Lịch sử được lưu từ các lần xuất bản sau khi bật tính năng.</p>'}</div>`,"modal-wide","Duyệt nội dung điểm đến");
      dialog.querySelector("#editorial-compose").onclick=()=>{dialog.close();openDestinationForm({_id:id});};
      dialog.querySelector("#editorial-publish")?.addEventListener("click",async event=>{
        if(!await TM.confirm("Xuất bản nội dung điểm đến?","Bản sửa đã duyệt sẽ thay nội dung hiện tại. Bản trước được lưu vào lịch sử để đối chiếu hoặc soạn lại.","Xuất bản"))return;
        event.target.disabled=true;
        try{await api.request(`/admin/editorial/${id}/publish`,{method:"POST",body:{version:ed.version}});dialog.close();await loadAdmin(true);TM.toast("Đã xuất bản nội dung đã duyệt.");}
        catch(e){dialog.querySelector(".form-error").textContent=e.message;event.target.disabled=false;}
      });
      dialog.addEventListener("click",event=>{
        const b=event.target.closest("[data-editorial-history]");if(!b)return;
        const h=ed.history.find(h=>h._id===b.dataset.editorialHistory);if(!h)return;
        const view=TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Phiên bản trước</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div>${this.preview(h.body)}<p>Đối chiếu lại giá, nguồn và ngày kiểm tra trước khi gửi duyệt.</p><button class="btn" id="use-editorial-history">Dùng làm bản nháp mới</button></div>`,"modal-wide","Xem phiên bản điểm đến");
        view.querySelector("#use-editorial-history").onclick=()=>{view.close();dialog.close();renderDestinationForm({...h.body,_id:id},c);};
      });
    }catch(e){TM.toast(e.message,true);}
  },
};
window.AdminReviews={
  render(result){
    const states={pending:"Chờ duyệt",approved:"Đã công khai",rejected:"Đã từ chối",withdrawn:"Người gửi đã gỡ"};
    document.querySelector("#reviews-total").textContent=result.total;
    document.querySelector("#reviews-list").innerHTML=result.items.map(r=>`<article class="feedback-card"><span class="badge">${states[r.status]}</span><h3>${TM.escape(r.title)}</h3><p>${TM.escape(r.destinationId?.name||"Điểm không còn tồn tại")} · ${TM.escape(r.authorName)} · ${r.rating}/5 sao</p><small>Tài khoản: ${TM.escape(r.userId?.email||"Đã xóa")} · Trải nghiệm ${TM.date(r.visitedOn)}</small><p class="preserve-lines">${TM.escape(r.content)}</p>${r.photoId?`<figure class="review-photo"><img src="/api/community/media/${r.photoId}" alt="Ảnh cần kiểm duyệt"><figcaption>Ngày chụp: ${TM.date(r.photoTakenOn)}</figcaption></figure>`:""}${r.moderationReason?`<p>Kết quả trước: ${TM.escape(r.moderationReason)}</p>`:""}${r.status!=="withdrawn"?`<button class="btn outline" data-moderate-review="${r._id}">Kiểm tra & xử lý</button>`:""}</article>`).join("")||'<div class="admin-empty">Không có đánh giá phù hợp.</div>';
    AdminPeople.pagination("reviews",result);
  },
  open(id){
    const r=adminItems.find(r=>r._id===id);if(!r)return;
    const dialog=TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Duyệt đánh giá</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><h3>${TM.escape(r.title)}</h3><p class="preserve-lines">${TM.escape(r.content)}</p>${r.photoId?`<figure class="review-photo"><img src="/api/community/media/${r.photoId}" alt="Ảnh do thành viên gửi"><figcaption>Chụp ${TM.date(r.photoTakenOn)}</figcaption></figure>`:""}<form class="next-form"><label class="form-field">Kết quả<select name="status"><option value="approved">Duyệt công khai</option><option value="rejected">Từ chối / yêu cầu điều chỉnh</option></select></label><label class="form-field">Lý do / hướng dẫn người gửi<textarea name="reason" maxlength="1000" rows="4" placeholder="Bắt buộc nếu từ chối. Người gửi đọc được nội dung này."></textarea></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Lưu kết quả kiểm duyệt</button></form></div>`,"modal-wide","Kiểm duyệt đánh giá");
    dialog.querySelector("form").onsubmit=async event=>{event.preventDefault();const form=event.target,b=form.querySelector("button");b.disabled=true;try{await api.request(`/admin/reviews/${id}`,{method:"PATCH",body:{...Object.fromEntries(new FormData(form)),version:r.__v}});dialog.close();await loadAdmin(true);TM.toast("Đã lưu kết quả kiểm duyệt.");}catch(e){form.querySelector(".form-error").textContent=e.message;b.disabled=false;}};
  },
};
document.addEventListener("click",event=>{
  const open=event.target.closest("[data-open-editorial]"),edit=event.target.closest("[data-edit-editorial]"),review=event.target.closest("[data-moderate-review]");
  if(open)AdminPublishing.open(open.dataset.openEditorial);
  if(edit)openDestinationForm({_id:edit.dataset.editEditorial});
  if(review)AdminReviews.open(review.dataset.moderateReview);
});
