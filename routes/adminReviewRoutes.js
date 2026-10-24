const router=require("express").Router(),Review=require("../models/DestinationReview");
const {objectId,text,integer,fail}=require("../utils/validation");
router.get("/reviews",async(req,res)=>{
  const {page,limit,skip}=require("../utils/adminData").pagination(req.query),filter={};
  if(req.query.status){if(!["pending","approved","rejected","withdrawn"].includes(req.query.status))fail("Trạng thái không hợp lệ.");filter.status=req.query.status;}
  const [items,total]=await Promise.all([Review.find(filter).populate("destinationId","name province").populate("userId","fullName email").sort({updatedAt:-1,_id:-1}).skip(skip).limit(limit).lean(),Review.countDocuments(filter)]);
  res.json({items,total,page,pages:Math.ceil(total/limit)});
});
router.patch("/reviews/:id",async(req,res)=>{
  if(!["approved","rejected"].includes(req.body.status))fail("Chọn duyệt hoặc từ chối.");
  const moderationReason=text(req.body.reason??"","Lý do xử lý",1000,req.body.status==="rejected");
  const review=await Review.findOneAndUpdate({_id:objectId(req.params.id),__v:integer(req.body.version,"Phiên bản",0,1e9),status:{$ne:"withdrawn"}},{$set:{status:req.body.status,moderationReason,moderatedBy:req.user.fullName,moderatedAt:new Date()},$inc:{__v:1}},{returnDocument:"after",runValidators:true});
  if(!review)fail("Đánh giá đã đổi hoặc người gửi đã gỡ. Tải lại để kiểm tra.",409);
  await require("../utils/activity")(req.user,"destination.review_moderated",{_id:review.destinationId,name:review.title},req.body.status);
  res.json({review});
});
module.exports=router;
