window.Personalization = {
  async settings(container) {
    const id=TM.user?._id,generation=SessionIdle.state?.generation;
    const {preferences:p}=await api.request("/personal/preferences");
    if(TM.user?._id!==id||SessionIdle.state?.generation!==generation||!container.isConnected)return;
    container.innerHTML=`<h2>Chuyến đi hợp với bạn</h2><p>Sở thích giúp xếp ưu tiên gợi ý. Bạn luôn có thể chọn những địa điểm khác.</p><form class="next-form"><fieldset><legend>Trải nghiệm bạn quan tâm</legend><div class="suggestion-options">${Object.entries(TM.categories).map(([k,label])=>`<label><input type="checkbox" name="categories" value="${k}" ${(p.categories||[]).includes(k)?"checked":""}> ${label}</label>`).join("")}</div></fieldset><label class="form-field">Nhịp độ<select name="pace"><option value="relaxed">Thong thả</option><option value="balanced">Vừa phải</option><option value="active">Nhiều trải nghiệm</option></select></label><label class="form-field">Thường đi cùng<select name="companions"><option value="solo">Một mình</option><option value="couple">Hai người</option><option value="family">Gia đình</option><option value="friends">Bạn bè</option></select></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Lưu sở thích</button></form>`;
    const form=container.querySelector("form");form.elements.pace.value=p.pace||"balanced";form.elements.companions.value=p.companions||"friends";
    form.onsubmit=async event=>{event.preventDefault();const b=form.querySelector("button");b.disabled=true;try{await api.request("/personal/preferences",{method:"PUT",body:{categories:new FormData(form).getAll("categories"),pace:form.elements.pace.value,companions:form.elements.companions.value}});TM.toast("Đã lưu sở thích. Gợi ý mới sẽ dùng lựa chọn của bạn.");}catch(e){form.querySelector(".form-error").textContent=e.message;}finally{b.disabled=false;}};
  },
  async recommendations() {
    const el=document.querySelector("#personal-recommendations");if(!el)return;
    if(!TM.user){el.hidden=true;el.replaceChildren();return;}
    const id=TM.user._id,generation=SessionIdle.state?.generation;
    try{const {items}=await api.request("/personal/recommendations");if(TM.user?._id!==id||SessionIdle.state?.generation!==generation)return;
      el.hidden=!items.length;el.innerHTML=`<div class="section-heading"><div><div class="eyebrow">GỢI Ý CÓ LÝ DO</div><h2>Thêm cảm hứng cho bạn</h2></div><a href="/account">Điều chỉnh sở thích ↗</a></div><div class="recommendation-grid">${items.map(d=>`<article class="recommendation-card"><a href="/destinations/${d.slug}"><img loading="lazy" src="${TM.escape(d.imageUrl)}" alt="${TM.escape(d.name)}"><h3>${TM.escape(d.name)}</h3></a><p>${TM.escape(d.province)}</p><ul>${d.reasons.map(r=>`<li>${TM.escape(r)}</li>`).join("")}</ul></article>`).join("")}</div>`;
    }catch(e){el.hidden=false;TM.error(el,e);}
  },
};
if(document.querySelector("#personal-recommendations")){TM.ready.then(()=>Personalization.recommendations());document.addEventListener("authchange",()=>Personalization.recommendations());document.addEventListener("favoriteschange",()=>Personalization.recommendations());}
