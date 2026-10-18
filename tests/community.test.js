const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto"),mongoose=require("mongoose"),bcrypt=require("bcryptjs");
const createApp=require("../app"),connect=require("../config/database");
const User=require("../models/User"),Trip=require("../models/Itinerary"),Destination=require("../models/Destination"),Invitation=require("../models/TripInvitation"),Comment=require("../models/TripComment"),Feedback=require("../models/Feedback"),Reset=require("../models/PasswordReset"),Activity=require("../models/Activity");
test("Cộng tác, chi tiêu, phản hồi, mật khẩu và idle trên MongoDB riêng",{timeout:90000},async t=>{
  const dbName=`travelmate_community_test_${process.pid}_${crypto.randomBytes(4).toString("hex")}`;
  process.env.SESSION_SECRET=crypto.randomBytes(48).toString("hex");process.env.NODE_ENV="test";process.env.APP_ORIGIN="https://travelmate.example.test";
  await connect(`${process.env.TEST_MONGO_BASE_URI||"mongodb://127.0.0.1:27017"}/${dbName}`);
  let mail=[],weatherCalls=0;
  const today=require("../utils/adminData").todayInVietnam();
  const app=createApp({sendResetEmail:async(email,url)=>mail.push({email,url}),weatherFetcher:async()=>{weatherCalls++;return {ok:true,json:async()=>({daily:{time:[today],temperature_2m_max:[30],temperature_2m_min:[22],precipitation_probability_max:[75],weather_code:[61],wind_speed_10m_max:[10]}})};}});
  const server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));const base=`http://127.0.0.1:${server.address().port}`;
  async function request(c,path,method="GET",body){const res=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(c.cookie?{Cookie:c.cookie}:{}),...(method!=="GET"?{"X-CSRF-Token":c.token||""}:{})},...(body?{body:JSON.stringify(body)}:{})});if(res.headers.get("set-cookie"))c.cookie=res.headers.get("set-cookie").split(";")[0];const data=res.headers.get("content-type")?.includes("application/json")?await res.json():await res.text();if(data.csrfToken)c.token=data.csrfToken;return {status:res.status,data,headers:res.headers};}
  const password="Test-only-password-123!";
  async function login(email,pass=password){const c={};await request(c,"/api/auth/csrf");const r=await request(c,"/api/auth/login","POST",{email,password:pass});assert.equal(r.status,200,JSON.stringify(r.data));return c;}
  let owner,editor,viewer,other,admin,trip,destination;
  const payload=()=>({...trip,days:trip.days.map(d=>({...d,items:d.items.map(i=>({...i,destinationId:i.destinationId._id}))}))});
  async function current(){trip=(await request(owner,`/api/itineraries/${trip._id}`)).data.itinerary;return payload();}
  async function backdate(c,age){const raw=decodeURIComponent(c.cookie.split("=").slice(1).join("="));const id=raw.slice(2,raw.lastIndexOf("."));const rows=mongoose.connection.collection("sessions");const row=await rows.findOne({_id:id});assert.ok(row);const state=JSON.parse(row.session);state.lastActivityAt=Date.now()-age;await rows.updateOne({_id:id},{$set:{session:JSON.stringify(state)}});return state.lastActivityAt;}
  try{
    await Promise.all([User,Trip,Destination,Invitation,Comment,Feedback,Reset,Activity].map(m=>m.init()));
    for(const [name,role] of [["owner","user"],["editor","user"],["viewer","user"],["other","user"],["admin","admin"]])await User.create({fullName:name,email:`${name}@example.test`,passwordHash:await bcrypt.hash(password,4),role});
    [owner,editor,viewer,other,admin]=await Promise.all(["owner","editor","viewer","other","admin"].map(n=>login(`${n}@example.test`)));
    destination=await Destination.create({...require("../data/destinations")[0],latitude:16.0544,longitude:108.2022});
    trip=(await request(owner,"/api/itineraries","POST",{title:"Nhóm đi biển",startDate:today,endDate:today,travelers:3,budgetLimitVnd:1000000,days:[{date:today,items:[{destinationId:String(destination._id),order:0}]}]})).data.itinerary;assert.ok(trip?._id);
    await t.test("Các trang mới tồn tại và liên kết khôi phục/mời không gửi referrer",async()=>{for(const path of ["/support","/account","/offline","/reset-password","/join/test","/sw.js","/js/trip-team.js"])assert.equal((await request({},path)).status,200,path);assert.equal((await request({},"/reset-password")).headers.get("referrer-policy"),"no-referrer");});
    await t.test("Chỉ chủ mời, đúng email nhận, hash token, role và xung đột hai người lưu",async()=>{
      assert.equal((await request(other,`/api/itineraries/${trip._id}/invitations`,"POST",{email:"editor@example.test",role:"editor"})).status,404);
      for(const [client,role,name] of [[editor,"editor","editor"],[viewer,"viewer","viewer"]]){
        const r=await request(owner,`/api/itineraries/${trip._id}/invitations`,"POST",{email:`${name}@example.test`,role});assert.equal(r.status,201);const token=r.data.path.split("/").pop();const stored=await Invitation.findOne({email:`${name}@example.test`}).select("+tokenHash");assert.equal(stored.tokenHash,crypto.createHash("sha256").update(token).digest("hex"));assert.equal((await request(other,`/api/itineraries/invitations/${token}/accept`,"POST",{})).status,403);assert.equal((await request(client,`/api/itineraries/invitations/${token}/accept`,"POST",{})).status,200);assert.equal((await request(client,`/api/itineraries/invitations/${token}/accept`,"POST",{})).status,404);
      }
      const old=await current();assert.equal((await request(editor,`/api/itineraries/${trip._id}`)).data.itinerary.permissions.role,"editor");assert.equal((await request(viewer,`/api/itineraries/${trip._id}`)).data.itinerary.permissions.canEdit,false);
      assert.equal((await request(viewer,`/api/itineraries/${trip._id}`,"PUT",old)).status,403);assert.equal((await request(editor,`/api/itineraries/${trip._id}`,"DELETE",{})).status,403);assert.equal((await request(editor,`/api/itineraries/${trip._id}/share`,"POST",{})).status,403);
      assert.equal((await request(editor,`/api/itineraries/${trip._id}`,"PUT",{...old,title:"Đã sửa bởi editor"})).status,200);
      assert.equal((await request(owner,`/api/itineraries/${trip._id}`,"PUT",old)).status,409);
      const fresh=await current();delete fresh.version;assert.equal((await request(editor,`/api/itineraries/${trip._id}`,"PUT",fresh)).status,409);
    });
    await t.test("Bình luận và đề xuất chỉ trong nhóm, người xem không gửi, owner xóa được",async()=>{
      const url=`/api/itineraries/${trip._id}/comments`;assert.equal((await request(other,url)).status,404);assert.equal((await request(viewer,url,"POST",{text:"X",kind:"comment"})).status,403);
      const c=(await request(editor,url,"POST",{text:"Nên mang áo mưa",kind:"suggestion"})).data.comment;assert.ok(c._id);assert.equal((await request(viewer,url)).data.items[0].text,"Nên mang áo mưa");assert.equal((await request(owner,`${url}/${c._id}`,"DELETE",{})).status,200);
    });
    await t.test("Chi tiêu lưu thật, bản chia sẻ công khai không lộ người/chi tiêu thực tế",async()=>{
      const body=await current();body.participants=[{id:"a",name:"An"},{id:"b",name:"Bình"}];body.actualExpenses=[{id:"e",label:"Ăn trưa",date:today,category:"food",amountVnd:101,paidBy:"a",splitBetween:["a","b"]}];
      const r=await request(editor,`/api/itineraries/${trip._id}`,"PUT",body);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.itinerary.actualExpenses[0].amountVnd,101);assert.equal((await request(admin,`/api/admin/itineraries/${trip._id}`)).data.itinerary.actualExpenses[0].amountVnd,101);
      const shared=(await request(owner,`/api/itineraries/${trip._id}/share`,"POST",{})).data;assert.ok(Number.isInteger(shared.version));const publicTrip=(await request({},`/api/shared-itineraries/${shared.path.split("/").pop()}`)).data.itinerary;for(const key of ["participants","actualExpenses","settlements","collaborators","userId"])assert.equal(publicTrip[key],undefined);
      await current();assert.equal((await request(owner,`/api/itineraries/${trip._id}`,"PUT",{...payload(),participants:[]})).status,400);
    });
    await t.test("Sổ chi đủ 200 dòng với ghi chú tiếng Việt dài vẫn lưu và đọc lại",async()=>{
      const original=await current(), body=structuredClone(original);
      body.actualExpenses=Array.from({length:200},(_,i)=>({...original.actualExpenses[0],id:`expense-${i}`,label:"ă".repeat(120),note:"ữ".repeat(500)}));
      body.settlements=Array.from({length:200},(_,i)=>({id:`settlement-${i}`,from:"b",to:"a",amountVnd:1,note:"ữ".repeat(500)}));
      assert.ok(Buffer.byteLength(JSON.stringify(body))>150*1024);
      const saved=await request(owner,`/api/itineraries/${trip._id}`,"PUT",body);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.itinerary.actualExpenses.length,200);
      original.version=saved.data.itinerary.version;assert.equal((await request(owner,`/api/itineraries/${trip._id}`,"PUT",original)).status,200);
    });
    await t.test("Thời tiết có dữ liệu, kiểm tra quyền, gọi trùng dùng cache",async()=>{const url=`/api/itineraries/${trip._id}/weather`;assert.equal((await request(other,url)).status,404);const a=await request(viewer,url);assert.equal(a.status,200);assert.equal(a.data.days[0].status,"available");await request(owner,url);assert.equal(weatherCalls,1);});
    await t.test("Thu hồi quyền có hiệu lực ngay, lời mời hết hạn và đã thu hồi bị chặn",async()=>{
      const id=(await User.findOne({email:"editor@example.test"}))._id;assert.equal((await request(owner,`/api/itineraries/${trip._id}/team/${id}`,"PATCH",{role:"viewer"})).status,200);assert.equal((await request(editor,`/api/itineraries/${trip._id}/comments`,"POST",{text:"X",kind:"comment"})).status,403);
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/team/${id}`,"DELETE",{})).status,200);assert.equal((await request(editor,`/api/itineraries/${trip._id}`)).status,404);
      let r=await request(owner,`/api/itineraries/${trip._id}/invitations`,"POST",{email:"other@example.test",role:"viewer"});let token=r.data.path.split("/").pop();await Invitation.updateOne({_id:r.data.invitation._id},{$set:{expiresAt:new Date(0)}});assert.equal((await request(other,`/api/itineraries/invitations/${token}/accept`,"POST",{})).status,404);
      r=await request(owner,`/api/itineraries/${trip._id}/invitations`,"POST",{email:"other@example.test",role:"viewer"});token=r.data.path.split("/").pop();await request(owner,`/api/itineraries/${trip._id}/invitations/${r.data.invitation._id}`,"DELETE",{});assert.equal((await request(other,`/api/itineraries/invitations/${token}/accept`,"POST",{})).status,404);
    });
    await t.test("Phản hồi riêng từng người, admin trả lời có lịch sử và chặn ghi đè",async()=>{
      const r=await request(owner,"/api/feedback","POST",{subject:"Giờ mở cửa",type:"other",content:"Xin kiểm tra",destinationId:String(destination._id)});assert.equal(r.status,201);const f=r.data.feedback;assert.equal((await request(other,"/api/feedback")).data.total,0);assert.equal((await request(owner,"/api/admin/feedback")).status,403);
      const update={status:"in_review",reply:"Đang đối chiếu với đơn vị quản lý.",version:f.__v};assert.equal((await request(admin,`/api/admin/feedback/${f._id}`,"PATCH",update)).status,200);assert.equal((await request(admin,`/api/admin/feedback/${f._id}`,"PATCH",update)).status,409);
      const result=(await request(owner,"/api/feedback")).data.items[0];assert.equal(result.history[0].reply,update.reply);assert.ok(!JSON.stringify((await request(admin,"/api/admin/feedback")).data).includes("passwordHash"));assert.equal((await request(admin,"/api/admin/activity?group=feedback")).data.total,2);assert.equal((await request(admin,"/api/admin/stats")).data.pendingFeedback,1);
    });
    await t.test("Hồ sơ an toàn, đổi mật khẩu giữ phiên mới và thu hồi phiên khác",async()=>{
      const second=await login("owner@example.test");assert.equal((await request(owner,"/api/auth/profile","PUT",{fullName:"Tên mới",role:"admin"})).data.user.role,"user");
      assert.equal((await request(owner,"/api/auth/password","PUT",{currentPassword:"wrong",password:"Password-new-123",confirmPassword:"Password-new-123"})).status,400);
      assert.equal((await request(owner,"/api/auth/password","PUT",{currentPassword:password,password:"Password-new-123",confirmPassword:"Password-new-123"})).status,200);assert.equal((await request(second,"/api/auth/me")).data.user,null);assert.equal((await request(second,"/api/itineraries")).status,401);assert.ok((await request(owner,"/api/auth/me")).data.user);
    });
    await t.test("Khôi phục email dùng token hash ngắn hạn, một lần, không tiết lộ tài khoản",async()=>{
      const c={};await request(c,"/api/auth/csrf");const first=await request(c,"/api/auth/forgot-password","POST",{email:"viewer@example.test"}),unknown=await request(c,"/api/auth/forgot-password","POST",{email:"unknown@example.test"});assert.equal(first.status,202);assert.deepEqual(first.data,unknown.data);assert.equal(mail.length,1);
      const token=new URL(mail[0].url).hash.slice(1),stored=await Reset.findOne({}).select("+tokenHash");assert.equal(stored.tokenHash,crypto.createHash("sha256").update(token).digest("hex"));assert.ok(!JSON.stringify(first.data).includes(token));assert.ok(stored.expiresAt>Date.now());
      const reset={token,password:"After-reset-123",confirmPassword:"After-reset-123"};assert.equal((await request(c,"/api/auth/reset-password","POST",reset)).status,200);assert.equal((await request(c,"/api/auth/reset-password","POST",reset)).status,400);assert.equal((await request(viewer,"/api/auth/me")).data.user,null);await login("viewer@example.test",reset.password);
      await request(c,"/api/auth/forgot-password","POST",{email:"other@example.test"});const expired=new URL(mail.at(-1).url).hash.slice(1);await Reset.updateMany({},{$set:{expiresAt:new Date(0)}});assert.equal((await request(c,"/api/auth/reset-password","POST",{...reset,token:expired})).status,400);
      app.locals.sendResetEmail=null;assert.equal((await request(c,"/api/auth/config")).data.passwordRecovery,false);assert.equal((await request(c,"/api/auth/forgot-password","POST",{email:"viewer@example.test"})).status,503);
    });
    await t.test("Poll và đọc trang không kéo dài phiên; user5/admin10; hoạt động thật gia hạn",async()=>{
      const u=await login("other@example.test"),a=await login("admin@example.test");
      const before=await backdate(u,290000);await request(u,"/api/itineraries");const state=(await request(u,"/api/auth/me")).data.session;assert.equal(state.expiresAt,before+300000);
      const renewed=await request(u,"/api/auth/activity","POST",{activityAgeMs:1000});assert.equal(renewed.status,200);assert.ok(renewed.data.session.expiresAt>Date.now()+298000);assert.equal((await request(u,"/api/auth/activity","POST",{activityAgeMs:16000})).status,400);
      await backdate(u,300001);const expired=await request(u,"/api/itineraries");assert.equal(expired.status,401);assert.equal(expired.data.code,"SESSION_EXPIRED");assert.equal((await request(u,"/api/auth/me")).data.user,null);
      await backdate(a,300001);assert.equal((await request(a,"/api/admin/stats")).status,200);const unchanged=(await request(a,"/api/auth/me")).data.session;assert.ok(unchanged.expiresAt<Date.now()+301000);
      await backdate(a,600001);assert.equal((await request(a,"/api/admin/activity")).data.code,"SESSION_EXPIRED");
      const c=await login("other@example.test");await backdate(c,300001);assert.equal((await request(c,"/api/feedback","POST",{subject:"x",content:"x",type:"other"})).data.code,"SESSION_EXPIRED");
    });
  }finally{await new Promise(r=>server.close(r));assert.equal(mongoose.connection.name,dbName);await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
