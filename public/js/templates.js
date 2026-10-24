let templateItems=[];
const templateList=document.querySelector("#template-list");
function renderTemplates(){
  const province=document.querySelector("#template-province").value;
  templateList.innerHTML=templateItems.filter(t=>!province||t.province===province).map(t=>`<article class="template-card"><img src="${TM.escape(t.days[0][0].destination.imageUrl)}" alt="${TM.escape(t.province)}" loading="lazy"><div><span class="eyebrow">${TM.escape(t.province)} · ${t.days.length} NGÀY</span><h2>${TM.escape(t.title)}</h2><p>${TM.escape(t.description)}</p><button class="btn outline" data-template="${t.id}">Xem lịch trình mẫu <i data-lucide="arrow-up-right"></i></button></div></article>`).join("")||'<div class="empty-state"><h2>Chưa có mẫu phù hợp</h2><p>Hãy thử địa phương khác hoặc tự tạo lịch trình.</p><a class="btn" href="/planner">Tạo lịch trình</a></div>';TM.icons();
}
async function openTemplate(id){
  const t=templateItems.find(t=>t.id===id);if(!t)return;
  const dialog=TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>${TM.escape(t.title)}</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>${TM.escape(t.description)}</p>${t.days.map((day,n)=>`<section class="feedback-card"><h3>Ngày ${n+1}</h3>${day.map(i=>`<p>${i.visitTime} · <a href="/destinations/${i.destination.slug}">${TM.escape(i.destination.name)}</a> · ${TM.money(i.destination.estimatedCostPerPersonVnd)}</p>`).join("")}</section>`).join("")}<p class="status-note">${TM.escape(t.note)}</p><form class="next-form"><h3>Tạo bản lịch trình của bạn</h3><label class="form-field">Ngày bắt đầu<input name="startDate" type="date" required></label><label class="form-field">Số người<input name="travelers" type="number" min="1" max="100" value="2" required></label><label class="form-field">Ngân sách cả chuyến (VND)<input name="budgetLimitVnd" type="number" min="0" max="1000000000000" step="1" value="3000000" required></label><p class="form-error" role="alert"></p><button class="btn" type="submit">${TM.user?"Tạo lịch trình riêng":"Đăng nhập để sử dụng mẫu"}</button></form></div>`,"modal-wide","Chi tiết lịch trình mẫu");
  dialog.querySelector("input[type=date]").value=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  dialog.querySelector("form").onsubmit=async event=>{
    event.preventDefault();const form=event.target,b=form.querySelector("button");
    if(!TM.user){dialog.close();TM.requireLogin(()=>openTemplate(id));return;}
    b.disabled=true;
    try{const data=Object.fromEntries(new FormData(form));data.travelers=Number(data.travelers);data.budgetLimitVnd=Number(data.budgetLimitVnd);const result=await api.request(`/templates/${id}/clone`,{method:"POST",body:data});location.assign(result.path);}
    catch(e){form.querySelector(".form-error").textContent=e.message;b.disabled=false;}
  };
}
templateList.onclick=event=>{const b=event.target.closest("[data-template]");if(b)openTemplate(b.dataset.template);};
document.querySelector("#template-province").onchange=renderTemplates;
TM.ready.then(async()=>{try{templateItems=(await api.request("/templates")).items;document.querySelector("#template-province").insertAdjacentHTML("beforeend",[...new Set(templateItems.map(t=>t.province))].sort((a,b)=>a.localeCompare(b,"vi")).map(p=>`<option>${TM.escape(p)}</option>`).join(""));renderTemplates();}catch(e){TM.error(templateList,e);}});
