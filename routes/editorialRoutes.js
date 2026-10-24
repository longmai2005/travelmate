const router=require("express").Router(),Destination=require("../models/Destination");
const input=require("../utils/destinationInput");
const {objectId,text,integer,fail}=require("../utils/validation");
const {snapshot,versionFilter,previous}=require("../utils/destinationEditorial");
router.get("/editorial",async(req,res)=>{
  const {page,limit,skip}=require("../utils/adminData").pagination(req.query),filter={};
  if(req.query.state){
    if(!["draft","pending","published","due"].includes(req.query.state))fail("Bộ lọc biên tập không hợp lệ.");
    if(req.query.state==="due") {const cutoff=new Date(Date.now()-180*86400000).toISOString().slice(0,10);filter.isActive=true;filter.$or=[{verifiedOn:{$lt:cutoff}},{verifiedOn:{$exists:false}}];}
    else if(req.query.state==="published")filter.$or=[{"editorial.status":"published"},{editorial:{$exists:false}}];
    else filter["editorial.status"]=req.query.state;
  }
  const [items,total]=await Promise.all([Destination.find(filter).select("+editorial").sort({updatedAt:-1,_id:-1}).skip(skip).limit(limit).lean(),Destination.countDocuments(filter)]);
  res.json({items:items.map(d=>({_id:d._id,name:d.name,province:d.province,slug:d.slug,isActive:d.isActive,verifiedOn:d.verifiedOn,status:d.editorial?.status||"published",editor:d.editorial?.editedBy,editedAt:d.editorial?.editedAt,version:d.editorial?.version||0})),total,page,pages:Math.ceil(total/limit)});
});
router.get("/editorial/:id",async(req,res)=>{
  const d=await Destination.findById(objectId(req.params.id)).select("+editorial").lean();
  if(!d)fail("Không tìm thấy điểm đến.",404);
  res.json({destination:snapshot(d),id:d._id,publishedVersion:d.contentVersion||0,editorial:d.editorial||{version:0,status:"published",history:[]}});
});
router.post("/editorial",async(req,res)=>{
  if(!req.body.body || typeof req.body.body!=="object" || Array.isArray(req.body.body))fail("Nội dung bản nháp không hợp lệ.");
  const body=input(req.body.body);
  const destination=await Destination.create({...body,isActive:false,editorial:{version:1,status:req.body.status==="pending"?"pending":"draft",draft:body,baseContentVersion:0,editedBy:req.user.fullName,editedAt:new Date(),note:""}});
  await require("../utils/activity")(req.user,"destination.draft_created",destination);
  res.status(201).json({id:destination._id,message:"Đã tạo bản nháp riêng, chưa hiển thị công khai."});
});
router.put("/editorial/:id",async(req,res)=>{
  if(!["draft","pending"].includes(req.body.status))fail("Chọn lưu nháp hoặc gửi duyệt.");
  if(!req.body.body || typeof req.body.body!=="object" || Array.isArray(req.body.body))fail("Nội dung bản nháp không hợp lệ.");
  const id=objectId(req.params.id),version=integer(req.body.version,"Phiên bản biên tập",0,1e9),base=integer(req.body.baseContentVersion,"Phiên bản nội dung gốc",0,1e9);
  const current=await Destination.findById(id).lean();if(!current)fail("Không tìm thấy điểm đến.",404);
  const body=input(req.body.body);body.slug=current.slug;
  const note=text(req.body.note??"","Ghi chú biên tập",1000,false);
  const d=await Destination.findOneAndUpdate({_id:id,$and:[versionFilter("editorial.version",version),versionFilter("contentVersion",base)]},{$set:{"editorial.draft":body,"editorial.status":req.body.status,"editorial.baseContentVersion":base,"editorial.editedBy":req.user.fullName,"editorial.editedAt":new Date(),"editorial.note":note},$inc:{"editorial.version":1}},{returnDocument:"after",runValidators:true});
  if(!d)fail("Nội dung hoặc bản nháp đã thay đổi. Mở lại và đối chiếu trước khi lưu.",409);
  await require("../utils/activity")(req.user,"destination.draft_updated",d,req.body.status);
  res.json({message:req.body.status==="pending"?"Đã gửi bản sửa vào hàng chờ duyệt.":"Đã lưu bản nháp; nội dung công khai được giữ."});
});
router.post("/editorial/:id/publish",async(req,res)=>{
  const id=objectId(req.params.id),version=integer(req.body.version,"Phiên bản biên tập",0,1e9);
  const current=await Destination.findById(id).select("+editorial");
  if(!current?.editorial?.draft || current.editorial.status!=="pending")fail("Cần có bản chờ duyệt trước khi xuất bản.",409);
  const body=input(current.editorial.draft);body.slug=current.slug;
  if(!body.sourceUrl || !body.verifiedOn)fail("Cần nguồn thông tin và ngày đã kiểm tra trước khi xuất bản.");
  const updated=await Destination.findOneAndUpdate({_id:id,"editorial.status":"pending",$and:[versionFilter("editorial.version",version),versionFilter("contentVersion",current.editorial.baseContentVersion||0)]},{$set:{...body,"editorial.status":"published","editorial.draft":null,"editorial.editedBy":req.user.fullName,"editorial.editedAt":new Date()},$push:{"editorial.history":{$each:[previous(current,req.user.fullName)],$slice:-15}},$inc:{contentVersion:1,"editorial.version":1,__v:1}},{returnDocument:"after",runValidators:true});
  if(!updated)fail("Bản chờ duyệt hoặc nội dung công khai đã đổi. Mở lại để đối chiếu.",409);
  await require("../utils/activity")(req.user,"destination.published",updated);
  res.json({destination:updated,message:"Đã xuất bản nội dung đã duyệt."});
});
module.exports=router;
