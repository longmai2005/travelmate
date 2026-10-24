const router = require("express").Router();
const Review = require("../models/DestinationReview"), Destination = require("../models/Destination");
const { objectId, text, integer, fail } = require("../utils/validation");
const { requireAuth } = require("../middleware/authMiddleware");
const { rateLimit } = require("express-rate-limit");
const media = require("../utils/communityMedia");
const publicReview = r => ({ _id:r._id, authorName:r.authorName, rating:r.rating, title:r.title, content:r.content, visitedOn:r.visitedOn, photoTakenOn:r.photoTakenOn, photoId:r.photoId, createdAt:r.createdAt });
router.get("/destinations/:destination/reviews", async(req,res)=>{
  const destinationId=objectId(req.params.destination);
  if(!await Destination.exists({_id:destinationId,isActive:true})) fail("Không tìm thấy điểm đến.",404);
  const {page,limit,skip}=require("../utils/adminData").pagination(req.query);
  const filter={destinationId,status:"approved"};
  const [items,total,stats]=await Promise.all([Review.find(filter).sort({createdAt:-1,_id:-1}).skip(skip).limit(limit).lean(),Review.countDocuments(filter),Review.aggregate([{$match:{destinationId:new (require("mongoose").Types.ObjectId)(destinationId),status:"approved"}},{$group:{_id:null,average:{$avg:"$rating"}}}])]);
  res.json({items:items.map(publicReview),total,page,pages:Math.ceil(total/limit),average:stats[0]?.average ?? null});
});
router.get("/media/:id", async(req,res)=>{
  const review=await Review.findOne({photoId:objectId(req.params.id)}).lean();
  if(!review) fail("Không tìm thấy ảnh.",404);
  const visible=review.status==="approved" && await Destination.exists({_id:review.destinationId,isActive:true});
  if(!visible){
    const user=req.session.userId && await require("../models/User").findById(req.session.userId).select("+sessionVersion");
    if(!user || user.isActive===false || (user.sessionVersion||0)!==(req.session.authVersion||0) || (user.role!=="admin" && String(user._id)!==String(review.userId))) fail("Không tìm thấy ảnh.",404);
  }
  const photo=await require("../models/CommunityMedia").findById(req.params.id).select("+data");
  if(!photo) fail("Không tìm thấy ảnh.",404);
  res.type("jpeg").send(photo.data);
});
router.get("/destinations/:destination/mine", requireAuth, async(req,res)=>{
  res.json({review:await Review.findOne({destinationId:objectId(req.params.destination),userId:req.user._id}).lean()});
});
router.put("/destinations/:destination/review", requireAuth, rateLimit({windowMs:3600000,limit:12,keyGenerator:req=>String(req.user._id),standardHeaders:"draft-8",legacyHeaders:false,message:{message:"Tối đa 12 lần gửi hoặc chỉnh sửa đánh giá mỗi giờ."}}), async(req,res)=>{
  const destinationId=objectId(req.params.destination);
  if(!await Destination.exists({_id:destinationId,isActive:true})) fail("Không tìm thấy điểm đến đang hiển thị.",404);
  const current=await Review.findOne({destinationId,userId:req.user._id});
  if(current && req.body.version!==current.__v) fail("Đánh giá đã đổi. Tải lại trước khi sửa.",409);
  if(req.body.rightsAccepted!==true) fail("Cần xác nhận trải nghiệm và quyền sử dụng nội dung.");
  const date=value=>{ value=text(value,"Ngày trải nghiệm / chụp ảnh",10); require("../utils/adminData").dateFilter(value,"Ngày trải nghiệm / chụp ảnh"); if(value>require("../utils/adminData").todayInVietnam()) fail("Ngày không được ở tương lai."); return value; };
  const body={authorName:text(req.body.authorName,"Tên hiển thị",100),rating:integer(req.body.rating,"Điểm đánh giá",1,5),title:text(req.body.title,"Tiêu đề",120),content:text(req.body.content,"Nội dung",2000),visitedOn:date(req.body.visitedOn),status:"pending",moderationReason:"",moderatedAt:null,moderatedBy:""};
  const hasPhoto=!!req.body.photo || (!!current?.photoId && req.body.removePhoto!==true);
  body.photoTakenOn=hasPhoto ? date(req.body.photoTakenOn) : "";
  let uploaded, committed=false;
  try {
    if(req.body.photo) uploaded=await media.upload(req.body.photo,req.user._id);
    body.photoId=uploaded?._id || (req.body.removePhoto===true?null:current?.photoId || null);
    body.photoBytes=uploaded?.bytes || (body.photoId?current?.photoBytes || 0:0);
    let review;
    if(current) {
      review=await Review.findOneAndUpdate({_id:current._id,__v:current.__v},{$set:body,$inc:{__v:1}},{returnDocument:"after",runValidators:true});
      if(!review) fail("Đánh giá vừa thay đổi. Tải lại trước khi sửa.",409);
    } else review=await Review.create({...body,userId:req.user._id,destinationId});
    committed=true;
    if(current?.photoId && String(current.photoId)!==String(body.photoId)) await media.remove(current.photoId);
    await require("../utils/activity")(req.user,"destination.review_submitted",{_id:review.destinationId,name:review.title});
    res.status(current?200:201).json({review,message:"Đã gửi chờ duyệt. Chỉnh sửa sẽ cần được duyệt lại trước khi công khai."});
  } catch(error){ if(uploaded && !committed) await media.remove(uploaded._id); throw error; }
});
router.delete("/destinations/:destination/review", requireAuth, async(req,res)=>{
  const review=await Review.findOneAndUpdate({destinationId:objectId(req.params.destination),userId:req.user._id,__v:integer(req.body.version,"Phiên bản",0,1e9)},{$set:{status:"withdrawn"},$inc:{__v:1}},{returnDocument:"after"});
  if(!review) fail("Đánh giá đã thay đổi hoặc không tồn tại.",409);
  await require("../utils/activity")(req.user,"destination.review_withdrawn",{_id:review.destinationId,name:review.title});
  res.json({message:"Đã gỡ đánh giá khỏi công khai và hàng chờ duyệt."});
});
module.exports=router;
