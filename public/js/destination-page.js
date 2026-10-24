const destinationPage=document.querySelector(".destination-page"),destinationId=destinationPage.dataset.destinationId;
let reviewPage=1,myReview=null,reviewRequest=0;
const reviewStates={pending:"Chờ quản trị duyệt",approved:"Đã công khai",rejected:"Cần điều chỉnh",withdrawn:"Đã gỡ"};
async function loadReviews(){
  const request=++reviewRequest,userId=TM.user?._id,generation=SessionIdle.state?.generation;
  try{
    const [result,mine]=await Promise.all([api.request(`/community/destinations/${destinationId}/reviews?page=${reviewPage}&limit=5`),TM.user?api.request(`/community/destinations/${destinationId}/mine`):Promise.resolve({review:null})]);
    if(request!==reviewRequest||TM.user?._id!==userId||SessionIdle.state?.generation!==generation)return;
    myReview=mine.review;
    document.querySelector("#review-summary").textContent=result.total?`${result.average.toFixed(1)} / 5 · ${result.total} đánh giá đã duyệt`:"Chưa có đánh giá đã duyệt. Bạn có thể chia sẻ trải nghiệm đầu tiên.";
    document.querySelector("#destination-reviews").innerHTML=result.items.map(r=>`<article class="feedback-card"><div class="review-rating" aria-label="${r.rating} trên 5 sao">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div><h3>${TM.escape(r.title)}</h3><small>${TM.escape(r.authorName)} · Trải nghiệm ngày ${TM.date(r.visitedOn)}</small><p class="preserve-lines">${TM.escape(r.content)}</p>${r.photoId?`<figure class="review-photo"><img src="/api/community/media/${r.photoId}" loading="lazy" alt="Ảnh trải nghiệm: ${TM.escape(r.title)}"><figcaption>Ảnh thành viên · Chụp ${TM.date(r.photoTakenOn)}</figcaption></figure>`:""}</article>`).join("");
    document.querySelector("#reviews-page").textContent=`${reviewPage} / ${Math.max(1,result.pages)}`;document.querySelector("#reviews-prev").disabled=reviewPage<=1;document.querySelector("#reviews-next").disabled=reviewPage>=result.pages;
    const holder=document.querySelector("#my-review-status");holder.replaceChildren();
    if(myReview){holder.innerHTML=`<article class="feedback-card"><span class="badge">${reviewStates[myReview.status]}</span><h3>Đánh giá của bạn</h3><strong>${TM.escape(myReview.title)}</strong><p class="preserve-lines">${TM.escape(myReview.content)}</p>${myReview.photoId?`<figure class="review-photo"><img src="/api/community/media/${myReview.photoId}" alt="Ảnh bạn gửi"><figcaption>Chụp ${TM.date(myReview.photoTakenOn)}</figcaption></figure>`:""}${myReview.moderationReason?`<p class="status-note">Quản trị viên: ${TM.escape(myReview.moderationReason)}</p>`:""}<div class="form-actions"><button class="btn outline" id="edit-my-review">Sửa / gửi lại</button>${myReview.status!=="withdrawn"?'<button class="btn ghost" id="withdraw-review">Gỡ đánh giá</button>':""}</div></article>`;holder.querySelector("#edit-my-review").onclick=openReview;holder.querySelector("#withdraw-review")?.addEventListener("click",async()=>{if(!await TM.confirm("Gỡ đánh giá?","Đánh giá sẽ ngừng hiển thị và được giữ riêng trong tài khoản để bạn có thể sửa, gửi duyệt lại.","Gỡ đánh giá"))return;try{await api.request(`/community/destinations/${destinationId}/review`,{method:"DELETE",body:{version:myReview.__v}});await loadReviews();}catch(e){TM.toast(e.message,true);}});}
  }catch(e){TM.error(document.querySelector("#destination-reviews"),e);}
}
async function photoData(file){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)throw new Error("Chọn ảnh JPEG, PNG hoặc WebP dưới 8 MB.");
  const bitmap=await createImageBitmap(file);
  try{const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/jpeg",.72);}
  finally{bitmap.close();}
}
async function openReview(){
  if(!TM.requireLogin(openReview))return;
  const userId=TM.user._id,generation=SessionIdle.state?.generation;
  try{myReview=(await api.request(`/community/destinations/${destinationId}/mine`)).review;}catch(e){TM.toast(e.message,true);return;}
  if(TM.user?._id!==userId||SessionIdle.state?.generation!==generation)return;
  const r=myReview||{},e=TM.escape,today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const dialog=TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>${myReview?"Cập nhật":"Chia sẻ"} trải nghiệm</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Đánh giá và ảnh được quản trị viên kiểm tra trước khi công khai. Mỗi tài khoản có một đánh giá cho điểm đến; chỉnh sửa cần duyệt lại.</p><form class="next-form"><label class="form-field">Tên hiển thị công khai<input name="authorName" required maxlength="100" value="${e(r.authorName||TM.user.fullName)}"></label><label class="form-field">Điểm trải nghiệm<select name="rating" required>${[5,4,3,2,1].map(n=>`<option value="${n}" ${r.rating===n?"selected":""}>${n} / 5 sao</option>`).join("")}</select></label><label class="form-field">Ngày bạn ghé thăm<input type="date" name="visitedOn" required max="${today}" value="${e(r.visitedOn||"")}"></label><label class="form-field">Tiêu đề<input name="title" required maxlength="120" value="${e(r.title||"")}" placeholder="Điều đáng nhớ trong trải nghiệm của bạn"></label><label class="form-field">Chia sẻ trải nghiệm<textarea name="content" required maxlength="2000" rows="5">${e(r.content||"")}</textarea></label><label class="form-field">Ảnh do bạn chụp (không bắt buộc)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><small>JPEG, PNG hoặc WebP; tối đa 8 MB trước khi nén. Ảnh được nén và bỏ metadata khi gửi.</small></label>${r.photoId?'<label><input name="removePhoto" type="checkbox"> Bỏ ảnh đã gửi trước đó</label>':""}<label class="form-field">Ngày chụp ảnh<input type="date" name="photoTakenOn" max="${today}" value="${e(r.photoTakenOn||"")}"></label><label class="consent-field"><input type="checkbox" name="rights" required> Tôi chia sẻ trải nghiệm thật, có quyền sử dụng ảnh và đồng ý hiển thị tên, nội dung, ảnh sau khi được duyệt. Không gửi ảnh chứa thông tin riêng tư của người khác.</label><p class="form-error" role="alert"></p><div class="form-actions"><button class="btn outline" type="button" data-close>Hủy</button><button class="btn" type="submit">Gửi chờ duyệt</button></div></form></div>`,"modal-wide","Gửi đánh giá điểm đến");
  const form=dialog.querySelector("form");form.onsubmit=async event=>{
    event.preventDefault();const b=form.querySelector('[type="submit"]');b.disabled=true;form.querySelector(".form-error").textContent="";
    try{
      const values=Object.fromEntries(new FormData(form)),file=form.elements.photo.files[0];
      const body={authorName:values.authorName,rating:Number(values.rating),visitedOn:values.visitedOn,title:values.title,content:values.content,photoTakenOn:values.photoTakenOn,removePhoto:!!form.elements.removePhoto?.checked,rightsAccepted:form.elements.rights.checked,...(myReview?{version:myReview.__v}:{})};
      if((file||r.photoId&&!body.removePhoto)&&!body.photoTakenOn)throw new Error("Hãy ghi ngày chụp ảnh.");
      if(file)body.photo=await photoData(file);
      if(TM.user?._id!==userId||SessionIdle.state?.generation!==generation)return;
      const result=await api.request(`/community/destinations/${destinationId}/review`,{method:"PUT",body});
      if(TM.user?._id!==userId||SessionIdle.state?.generation!==generation)return;
      dialog.close();await loadReviews();TM.toast(result.message);
    }catch(error){if(form.isConnected)form.querySelector(".form-error").textContent=error.message;}finally{b.disabled=false;}
  };
}
document.querySelector("#write-review").onclick=openReview;
document.querySelector("#page-report").onclick=()=>TM.reportDestination(destinationId);
document.querySelector("#copy-destination").onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);TM.toast("Đã sao chép liên kết điểm đến.");}catch{TM.toast("Bạn có thể sao chép địa chỉ trên thanh trình duyệt.",true);}};
document.querySelector("#reviews-prev").onclick=()=>{if(reviewPage>1){reviewPage--;loadReviews();}};
document.querySelector("#reviews-next").onclick=()=>{reviewPage++;loadReviews();};
TM.ready.then(async()=>{try{const {destination}=await api.request(`/destinations/${destinationId}`);TM.cache([destination]);TM.createMap(document.querySelector("#destination-page-map"),[destination],document.querySelector("#destination-page-map-note"));TM.refreshHearts();await loadReviews();}catch(e){TM.toast(e.message,true);}});
document.addEventListener("authchange",()=>{document.querySelector("#my-review-status").replaceChildren();myReview=null;TM.refreshHearts();loadReviews();});
