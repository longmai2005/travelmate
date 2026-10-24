const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto"),mongoose=require("mongoose"),bcrypt=require("bcryptjs"),sharp=require("sharp");
const createApp=require("../app"),connect=require("../config/database"),Destination=require("../models/Destination"),User=require("../models/User"),Trip=require("../models/Itinerary"),Review=require("../models/DestinationReview"),Draft=require("../models/TripDraft");
test("Nâng cấp hoàn chỉnh trên MongoDB riêng",{timeout:90000},async t=>{
  const dbName=`travelmate_next_test_${process.pid}_${crypto.randomBytes(4).toString("hex")}`;
  process.env.NODE_ENV="test";process.env.SESSION_SECRET=crypto.randomBytes(48).toString("hex");process.env.APP_ORIGIN="https://travelmate.example.test";
  await connect(`${process.env.TEST_MONGO_BASE_URI||"mongodb://127.0.0.1:27017"}/${dbName}`);
  const app=createApp(),server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));const base=`http://127.0.0.1:${server.address().port}`;
  async function request(c,path,method="GET",body){const res=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(c.cookie?{Cookie:c.cookie}:{}),...(method!=="GET"?{"X-CSRF-Token":c.token||""}:{})},...(body?{body:JSON.stringify(body)}:{})});if(res.headers.get("set-cookie"))c.cookie=res.headers.get("set-cookie").split(";")[0];const data=res.headers.get("content-type")?.includes("application/json")?await res.json():res.headers.get("content-type")?.includes("image/")?Buffer.from(await res.arrayBuffer()):await res.text();if(data.csrfToken)c.token=data.csrfToken;return{status:res.status,data,headers:res.headers};}
  const password="Next-test-only-123!",clients={};let trip,place,review;
  const body=()=>({...trip,days:trip.days.map(d=>({...d,items:d.items.map(i=>({...i,destinationId:String(i.destinationId._id)}))}))});
  try{
    await Promise.all(Object.values(mongoose.models).map(m=>m.init()));
    await Destination.insertMany(require("../data/destinations"));
    for(const name of ["owner","other","editor","admin"]){await User.create({fullName:name,email:`${name}@example.test`,passwordHash:await bcrypt.hash(password,4),role:name==="admin"?"admin":"user"});const c=clients[name]={};await request(c,"/api/auth/csrf");assert.equal((await request(c,"/api/auth/login","POST",{email:`${name}@example.test`,password})).status,200);}
    const {owner,other,editor,admin}=clients;
    place=await Destination.findOne({slug:"bien-my-khe"});
    trip=(await request(owner,"/api/itineraries","POST",{title:"Bản gốc",startDate:"2026-11-01",endDate:"2026-11-01",travelers:2,budgetLimitVnd:1000000,days:[{date:"2026-11-01",notes:"",items:[{destinationId:String(place._id)}]}]})).data.itinerary;
    await t.test("Trang công khai có URL, nguồn, canonical, sitemap; không lộ bản nháp và escape nội dung",async()=>{
      const result=await request({},"/destinations/bien-my-khe");assert.equal(result.status,200);assert.match(result.data,/rel="canonical" href="https:\/\/travelmate.example.test\/destinations\/bien-my-khe"/);assert.match(result.data,/GÓC NHÌN CỘNG ĐỒNG/);assert.ok(!result.data.includes("sessionVersion"));
      assert.match((await request({},"/sitemap.xml")).data,/destinations\/bien-my-khe/);assert.match((await request({},"/robots.txt")).data,/Disallow: \/admin/);
      await Destination.updateOne({_id:place._id},{$set:{name:'Biển <script>alert(1)</script>'}});const html=(await request({},"/destinations/bien-my-khe")).data;assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes("<script>alert(1)</script>"));await Destination.updateOne({_id:place._id},{$set:{name:place.name}});
      assert.equal((await request({},"/destinations/khong-co")).status,404);
    });
    await t.test("Sáu mẫu dùng điểm đang hoạt động, sao chép riêng và đổi ngày chính xác",async()=>{
      const templates=(await request({},"/api/templates")).data.items;assert.equal(templates.length,6);
      const input={startDate:"2026-12-31",travelers:3,budgetLimitVnd:4000000};assert.equal((await request({},`/api/templates/${templates[0].id}/clone`,"POST",input)).status,403);
      const clone=await request(owner,`/api/templates/${templates[0].id}/clone`,"POST",input);assert.equal(clone.status,201,JSON.stringify(clone.data));const saved=(await request(owner,`/api/itineraries/${clone.data.id}`)).data.itinerary;assert.equal(saved.startDate,"2026-12-31");assert.equal(saved.endDate,"2027-01-02");assert.equal(saved.travelers,3);assert.equal(saved.days.length,3);assert.equal((await request(other,`/api/itineraries/${saved._id}`)).status,404);
      await Destination.updateOne({_id:place._id},{$set:{isActive:false}});assert.equal((await request(owner,`/api/templates/${templates[0].id}/clone`,"POST",input)).status,404);await Destination.updateOne({_id:place._id},{$set:{isActive:true}});
    });
    await t.test("Sở thích riêng, xác thực enum, gợi ý có lý do và nhịp độ gia đình",async()=>{
      const pref={categories:["beach"],pace:"relaxed",companions:"family"};assert.equal((await request(owner,"/api/personal/preferences","PUT",pref)).status,200);assert.deepEqual((await request(owner,"/api/personal/preferences")).data.preferences.categories,["beach"]);assert.deepEqual((await request(other,"/api/personal/preferences")).data.preferences.categories,[]);
      assert.equal((await request(owner,"/api/personal/preferences","PUT",{...pref,categories:["fake"]})).status,400);
      const result=(await request(owner,"/api/personal/recommendations")).data;assert.equal(result.items[0].category,"beach");assert.ok(result.items[0].reasons.some(r=>r.includes("quan tâm")));
      const suggestion=await request(owner,"/api/itineraries/suggestions","POST",{...body(),province:"Đà Nẵng",categories:["beach"],pace:"relaxed",companions:"family"});assert.equal(suggestion.status,200);assert.ok(suggestion.data.days.every(d=>d.items.length<=2));
    });
    await t.test("Bản nháp lưu riêng, không tự sửa lịch trình, CAS giữa tab và đọc lại sau login",async()=>{
      const before=await Trip.findById(trip._id).lean(),input={body:{...body(),title:"Bản nháp riêng"},baseVersion:trip.version,revision:null};
      const saved=await request(owner,`/api/itineraries/${trip._id}/draft`,"PUT",input);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.deepEqual(await Trip.findById(trip._id).lean(),before);
      const draft=(await request(owner,`/api/itineraries/${trip._id}/draft`)).data.draft;assert.equal(draft.body.title,"Bản nháp riêng");assert.equal(draft.body.days[0].items[0].destinationId.name,place.name);assert.equal((await request(other,`/api/itineraries/${trip._id}/draft`)).status,404);
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/draft`,"PUT",input)).status,409);
      const next=await request(owner,`/api/itineraries/${trip._id}/draft`,"PUT",{...input,revision:saved.data.revision});assert.equal(next.status,200);
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/draft`,"DELETE",{revision:saved.data.revision})).status,409);
      const updated=await request(owner,`/api/itineraries/${trip._id}`,"PUT",{...body(),title:"Bản đã lưu mới"});assert.equal(updated.status,200);trip=updated.data.itinerary;
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/draft`,"PUT",{...input,revision:next.data.revision})).status,409);
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/draft`,"DELETE",{revision:next.data.revision})).status,200);
    });
    await t.test("Lịch sử khôi phục đúng kế hoạch, giữ sổ chi/quyền; chặn người ngoài và phiên bản cũ",async()=>{
      const history=(await request(owner,`/api/itineraries/${trip._id}/history`)).data;assert.equal(history.items[0].title,"Bản gốc");assert.equal((await request(other,`/api/itineraries/${trip._id}/history`)).status,404);
      const id=(await User.findOne({email:"editor@example.test"}))._id;await Trip.updateOne({_id:trip._id},{$set:{collaborators:[{userId:id,role:"viewer"}],participants:[{id:"a",name:"An"}]}});
      assert.equal((await request(editor,`/api/itineraries/${trip._id}/history/0/restore`,"POST",{version:trip.version,confirm:true})).status,403);
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/history/0/restore`,"POST",{version:trip.version-1,confirm:true})).status,409);
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/history/0/restore`,"POST",{version:trip.version,confirm:true})).status,200);
      trip=(await request(owner,`/api/itineraries/${trip._id}`)).data.itinerary;assert.equal(trip.title,"Bản gốc");assert.equal(trip.participants.length,1);assert.equal(trip.collaborators.length,1);assert.equal(trip.planHistory,undefined);
      await Trip.updateOne({_id:trip._id},{$set:{collaborators:[]}});
    });
    await t.test("Bản nháp giữ xác nhận bỏ ngày đã chọn để phục hồi rồi lưu được",async()=>{
      const create=await request(owner,"/api/itineraries","POST",{title:"Hai ngày test",startDate:"2026-11-01",endDate:"2026-11-02",travelers:2,budgetLimitVnd:1000000,days:["2026-11-01","2026-11-02"].map(date=>({date,notes:"",items:[{destinationId:String(place._id)}]}))});
      const p=create.data.itinerary,id=p._id,changed={...p,endDate:p.startDate,days:[{...p.days[0],items:[{destinationId:String(place._id)}]}],confirmDateRemoval:true};
      assert.equal((await request(owner,`/api/itineraries/${id}/draft`,"PUT",{body:changed,baseVersion:p.version,revision:null})).status,200);
      const recovered=(await request(owner,`/api/itineraries/${id}/draft`)).data.draft.body;assert.equal(recovered.confirmDateRemoval,true);recovered.version=p.version;recovered.days[0].items[0].destinationId=String(place._id);
      assert.equal((await request(owner,`/api/itineraries/${id}`,"PUT",recovered)).status,200);
    });
    await t.test("Đánh giá và ảnh chỉ công khai sau duyệt, bỏ EXIF và có ngày chụp",async()=>{
      const bytes=await sharp({create:{width:16,height:16,channels:3,background:"#087f8c"}}).jpeg().withMetadata().toBuffer();
      const input={authorName:"Người trải nghiệm",rating:5,title:"Bãi biển thoáng",content:"Trải nghiệm cá nhân trong database test",visitedOn:"2026-10-01",photoTakenOn:"2026-10-01",rightsAccepted:true,photo:`data:image/jpeg;base64,${bytes.toString("base64")}`};
      const created=await request(owner,`/api/community/destinations/${place._id}/review`,"PUT",input);assert.equal(created.status,201,JSON.stringify(created.data));review=created.data.review;assert.equal(review.status,"pending");assert.ok(review.photoId);
      assert.equal((await request({},`/api/community/destinations/${place._id}/reviews`)).data.total,0);assert.equal((await request({},`/api/community/media/${review.photoId}`)).status,404);assert.equal((await request(other,`/api/community/media/${review.photoId}`)).status,404);
      const privateImage=await request(owner,`/api/community/media/${review.photoId}`);assert.equal(privateImage.status,200);assert.equal((await sharp(privateImage.data).metadata()).exif,undefined);
      assert.equal((await request(owner,`/api/admin/reviews/${review._id}`,"PATCH",{status:"approved",version:review.__v})).status,403);
      const approved=await request(admin,`/api/admin/reviews/${review._id}`,"PATCH",{status:"approved",reason:"Ảnh và nội dung phù hợp",version:review.__v});assert.equal(approved.status,200);review=approved.data.review;
      const published=(await request({},`/api/community/destinations/${place._id}/reviews`)).data;assert.equal(published.total,1);assert.equal(published.average,5);for(const key of ["userId","moderationReason","moderatedBy"])assert.equal(published.items[0][key],undefined);
      assert.equal((await request({},`/api/community/media/${review.photoId}`)).status,200);
      assert.match((await request({},"/destinations/bien-my-khe")).data,/Ảnh từ người đã ghé thăm/);
      const edited=await request(owner,`/api/community/destinations/${place._id}/review`,"PUT",{...input,photo:undefined,version:review.__v,title:"Đã bổ sung"});assert.equal(edited.status,200);review=edited.data.review;assert.equal((await request({},`/api/community/destinations/${place._id}/reviews`)).data.total,0);
    });
    await t.test("Chặn ngày tương lai, ảnh giả và thiếu quyền ảnh; người gửi gỡ được và chặn duyệt bản cũ",async()=>{
      const input={authorName:"Khách",rating:4,title:"Tiêu đề",content:"Nội dung",visitedOn:"2026-10-01",rightsAccepted:true};
      assert.equal((await request(other,`/api/community/destinations/${place._id}/review`,"PUT",{...input,visitedOn:"2099-01-01"})).status,400);
      assert.equal((await request(other,`/api/community/destinations/${place._id}/review`,"PUT",{...input,rightsAccepted:false})).status,400);
      assert.equal((await request(other,`/api/community/destinations/${place._id}/review`,"PUT",{...input,photo:"data:image/jpeg;base64,bm90LWFuLWltYWdl",photoTakenOn:"2026-10-01"})).status,400);
      assert.equal((await request(admin,`/api/admin/reviews/${review._id}`,"PATCH",{status:"rejected",reason:"",version:review.__v})).status,400);
      assert.equal((await request(owner,`/api/community/destinations/${place._id}/review`,"DELETE",{version:review.__v})).status,200);
      assert.equal((await request(admin,`/api/admin/reviews/${review._id}`,"PATCH",{status:"approved",reason:"",version:review.__v})).status,409);
      assert.equal((await request(other,`/api/community/destinations/${place._id}/mine`)).data.review,null);
    });
    await t.test("Hạn mức kho ảnh và từng người không để lại ảnh hoặc số đặt chỗ sai khi bị từ chối",async()=>{
      const Quota=mongoose.model("MediaQuota"),Media=require("../models/CommunityMedia"),before=(await Quota.findById("global")).bytes,count=await Media.countDocuments();
      const bytes=await sharp({create:{width:8,height:8,channels:3,background:"#087f8c"}}).jpeg().toBuffer();
      const input={authorName:"Khách QA",rating:4,title:"Hạn mức ảnh",content:"Dữ liệu test",visitedOn:"2026-10-01",photoTakenOn:"2026-10-01",rightsAccepted:true,photo:`data:image/jpeg;base64,${bytes.toString("base64")}`};
      await Quota.updateOne({_id:"global"},{$set:{bytes:32*1024*1024}});assert.equal((await request(other,`/api/community/destinations/${place._id}/review`,"PUT",input)).status,413);assert.equal(await Media.countDocuments(),count);
      await Quota.updateOne({_id:"global"},{$set:{bytes:before}});
      const otherId=(await User.findOne({email:"other@example.test"}))._id;await Quota.updateOne({_id:`user:${otherId}`},{$set:{bytes:3*1024*1024}},{upsert:true});
      assert.equal((await request(other,`/api/community/destinations/${place._id}/review`,"PUT",input)).status,413);assert.equal((await Quota.findById("global")).bytes,before);assert.equal(await Media.countDocuments(),count);
    });
    await t.test("Biên tập nháp không thay công khai, gửi duyệt và xuất bản có lịch sử/CAS",async()=>{
      const id=String(place._id),url=`/api/admin/editorial/${id}`;let c=(await request(admin,url)).data;
      assert.equal((await request(owner,url)).status,403);assert.equal((await request({},url)).status,401);
      const changed={...c.destination,description:"Bản mô tả mới đã đối chiếu",sourceUrl:"https://example.test/source",verifiedOn:"2026-10-01"};
      const payload={body:changed,version:c.editorial.version,baseContentVersion:c.publishedVersion,status:"draft"};
      assert.equal((await request(admin,url,"PUT",payload)).status,200);assert.notEqual((await Destination.findById(id)).description,changed.description);
      assert.equal((await request(admin,url,"PUT",payload)).status,409);c=(await request(admin,url)).data;
      assert.equal((await request(admin,url+"/publish","POST",{version:c.editorial.version})).status,409);
      assert.equal((await request(admin,url,"PUT",{...payload,version:c.editorial.version,status:"pending"})).status,200);c=(await request(admin,url)).data;
      assert.equal((await request(admin,url+"/publish","POST",{version:c.editorial.version})).status,200);
      const published=await Destination.findById(id).select("+editorial");assert.equal(published.description,changed.description);assert.equal(published.editorial.history.length,1);assert.equal(published.slug,place.slug);
      assert.equal((await request({},`/api/destinations/${id}`)).data.destination.editorial,undefined);
      assert.equal((await request(admin,url+"/publish","POST",{version:c.editorial.version})).status,409);
    });
    await t.test("Điểm đến mới giữ ẩn trước duyệt; ẩn điểm làm bản duyệt cũ mất hiệu lực",async()=>{
      const c=(await request(admin,`/api/admin/editorial/${place._id}`)).data;
      const create=await request(admin,"/api/admin/editorial","POST",{body:{...c.destination,name:"Điểm mới test",isActive:true},status:"draft"});assert.equal(create.status,201);assert.equal((await Destination.findById(create.data.id)).isActive,false);assert.equal((await request({},`/api/destinations/${create.data.id}`)).status,404);
      const payload={body:c.destination,status:"pending",version:c.editorial.version,baseContentVersion:c.publishedVersion};assert.equal((await request(admin,`/api/admin/editorial/${place._id}`,"PUT",payload)).status,200);const staged=(await request(admin,`/api/admin/editorial/${place._id}`)).data;
      assert.equal((await request(admin,`/api/admin/destinations/${place._id}`,"DELETE",{})).status,200);
      assert.equal((await request(admin,`/api/admin/editorial/${place._id}/publish`,"POST",{version:staged.editorial.version})).status,409);
      assert.ok((await request(admin,"/api/admin/editorial?state=draft")).data.total>=1);
    });
    await t.test("Nhật ký ghi đủ khôi phục, duyệt ảnh và xuất bản",async()=>{
      const Activity=require("../models/Activity");
      for(const action of ["itinerary.restored","destination.review_moderated","destination.draft_created","destination.draft_updated","destination.published","user.preferences_updated","destination.review_submitted","destination.review_withdrawn"])assert.ok(await Activity.countDocuments({action}),action);
    });
    await t.test("Xóa chuyến đi dọn bản nháp; yêu cầu sai cấu trúc trả 400",async()=>{
      assert.equal((await request(owner,`/api/itineraries/${trip._id}/draft`,"PUT",{baseVersion:trip.version})).status,400);
      await Draft.create({userId:(await User.findOne({email:"owner@example.test"}))._id,tripId:trip._id,baseVersion:trip.version,body:{},expiresAt:new Date(Date.now()+1000)});
      assert.equal((await request(owner,`/api/itineraries/${trip._id}`,"DELETE",{})).status,200);assert.equal(await Draft.countDocuments({tripId:trip._id}),0);
    });
    await t.test("Request nén có byte thừa bị xử lý an toàn và server tiếp tục phục vụ",async()=>{
      const compressed=require("node:zlib").gzipSync(Buffer.from("{}"));
      const response=await fetch(base+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json","Content-Encoding":"gzip"},body:Buffer.concat([compressed,Buffer.from("invalid-trailing-bytes")])});
      assert.ok(response.status<500);await response.arrayBuffer();assert.equal((await request({},"/healthz")).status,200);
    });
  }finally{await new Promise(r=>server.close(r));assert.equal(mongoose.connection.name,dbName);await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
