const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
function page(){
  const requests=[],dialogs=[],buttons={},saved={textContent:""};
  const latest={_id:"trip",version:2,__v:2,title:"Kế hoạch mới của nhóm",permissions:{canEdit:true},days:[{date:"2026-11-01",notes:"Đã cập nhật ở tab khác",items:[]}]};
  const draft={__v:3,baseVersion:0,updatedAt:"2026-10-24T00:00:00Z",body:{title:"Bản nháp cũ",days:[{date:"2026-11-01",notes:"Bản nháp",items:[]}],travelers:2}};
  const context={window:null,document:{addEventListener(){}},editor:{addEventListener(){},querySelector:()=>saved},TM:{user:{_id:"u1"},escape:s=>String(s),date:s=>s,toast(){},confirm:async()=>true,dialog(html){dialogs.push(html);return{isConnected:true,querySelector(selector){return buttons[selector]||=( {textContent:"",onclick:null} );},close(){},addEventListener(){}};}},SessionIdle:{state:{generation:"g1"}},currentTrip:{...latest,version:0,title:"Bản cũ đang mở"},dirty:false,editSerial:0,structuredClone,Date,setTimeout:()=>1,clearTimeout(){},renderEditor(){},markDirty(){context.dirty=true;context.editSerial++;},api:{request:async(path,options)=>{requests.push({path,options});if(path.endsWith("/draft"))return options?{}:{draft};return{itinerary:latest};}}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync("public/js/planner-drafts.js","utf8"),context);
  return{context,latest,buttons,dialogs,requests,saved};
}
test("Client phục hồi bản nháp dùng phiên bản mới từ server, yêu cầu đối chiếu và giữ quyền hiện tại",async()=>{
  const p=page();await p.context.PlannerDraft.start();assert.match(p.dialogs[0],/Lịch trình chung đã có phiên bản mới/);await p.buttons["#recover-draft"].onclick();assert.equal(p.context.currentTrip.title,"Bản nháp cũ");assert.equal(p.context.currentTrip.version,2);assert.equal(p.context.currentTrip.permissions.canEdit,true);assert.equal(p.context.dirty,true);
});
test("Client bỏ bản nháp lấy đúng bản mới nhất và chỉ xóa revision đã đọc",async()=>{
  const p=page();await p.context.PlannerDraft.start();await p.buttons["#discard-draft"].onclick();assert.equal(p.context.currentTrip.title,p.latest.title);assert.equal(p.context.currentTrip.version,2);assert.equal(p.context.dirty,false);assert.equal(p.requests.find(r=>r.options?.method==="DELETE").options.body.revision,3);
});
test("Phản hồi bản nháp đến muộn sau đổi tài khoản không mở dữ liệu riêng",async()=>{
  const p=page();let release;p.context.api.request=async path=>path.endsWith("/draft")?new Promise(r=>release=r):{itinerary:p.latest};const pending=p.context.PlannerDraft.start();p.context.TM.user={_id:"u2"};p.context.SessionIdle.state.generation="g2";release({draft:{__v:1,baseVersion:0,body:{days:[]}}});await pending;assert.equal(p.dialogs.length,0);
});
