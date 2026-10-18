const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
function idlePage(){
  let now=1000000;const values=new Map(),listeners={},requests=[],cleared=[],events=[];
  const dialog=()=>({close(){},querySelector:()=>({addEventListener(){}})});
  const doc={hidden:false,body:{dataset:{page:"planner"}},addEventListener:(name,fn)=>listeners[name]=fn,querySelectorAll:()=>[],dispatchEvent:event=>events.push(event.type)};
  const context={window:null,document:doc,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},Date:{now:()=>now},navigator:{onLine:true},setInterval:()=>1,clearInterval(){},setTimeout:()=>2,clearTimeout(){},CustomEvent:function(type,options){this.type=type;this.detail=options?.detail;},TM:{user:null,favorites:new Set(),renderHeader(){},dialog},api:{token:"csrf",request:(path,options)=>{requests.push({path,options});return Promise.resolve({session:{timeoutMs:300000,expiresAt:now+300000,serverNow:now,generation:"g1"}});}},OfflineTrips:{clearUser:id=>cleared.push(id)},location:{assign(){}}};
  context.window=context;context.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(context);vm.runInContext(fs.readFileSync("public/js/session-idle.js","utf8"),context);
  const user={_id:"u1",role:"user"};context.TM.user=user;context.SessionIdle.start(user,{timeoutMs:300000,expiresAt:now+300000,serverNow:now,generation:"g1"});
  return {context,listeners,requests,cleared,events,values,setTime:value=>now=value};
}
test("Client: poll không sinh hoạt động, sự kiện giả/ẩn không gia hạn, idle xóa dữ liệu riêng",()=>{
  const p=idlePage();p.setTime(1100000);p.context.SessionIdle.activity({isTrusted:false});assert.equal(p.context.SessionIdle.lastInteraction,1000000);
  p.context.document.hidden=true;p.context.SessionIdle.activity({isTrusted:true});assert.equal(p.context.SessionIdle.lastInteraction,1000000);
  p.context.document.hidden=false;p.setTime(1300000);assert.equal(p.context.SessionIdle.check(),true);assert.equal(p.context.TM.user,null);assert.deepEqual(p.cleared,["u1"]);assert.ok(p.events.includes("before-session-clear"));assert.equal(p.requests.filter(r=>r.path==="/auth/activity").length,0);
});
test("Client: thao tác thật gửi tuổi tương tác, đồng bộ tab và không logout nhầm phiên mới",async()=>{
  const p=idlePage();p.setTime(1100000);p.context.SessionIdle.activity({isTrusted:true});await p.context.SessionIdle.flush();assert.equal(p.requests[0].path,"/auth/activity");assert.equal(p.requests[0].options.body.activityAgeMs,0);
  p.listeners.storage({key:"tm-idle-session",newValue:JSON.stringify({userId:"u1",generation:"g1",lastInteraction:1150000})});assert.equal(p.context.SessionIdle.lastInteraction,1150000);
  p.listeners.storage({key:"tm-auth-event",newValue:JSON.stringify({userId:"u1",generation:"different",reason:"logout"})});assert.ok(p.context.TM.user);
  p.listeners.storage({key:"tm-auth-event",newValue:JSON.stringify({userId:"u1",generation:"g1",reason:"logout"})});assert.equal(p.context.TM.user,null);assert.equal(p.requests.filter(r=>r.path==="/auth/logout").length,0);
});
test("Service worker không chặn/cache API, admin, share, lời mời hoặc request ghi",()=>{
  const listeners={},context={self:{location:{origin:"https://travelmate.test"},addEventListener:(name,fn)=>listeners[name]=fn},URL};vm.createContext(context);vm.runInContext(fs.readFileSync("public/sw.js","utf8"),context);
  for(const [path,method] of [["/api/auth/me","GET"],["/api/itineraries","GET"],["/admin","GET"],["/share/private-token","GET"],["/join/private-token","GET"],["/reset-password","GET"],["/offline","POST"],["https://third-party.test/offline","GET"]]){
    let intercepted=false;listeners.fetch({request:{url:new URL(path,"https://travelmate.test").href,method},respondWith:()=>intercepted=true});assert.equal(intercepted,false,path);
  }
});
