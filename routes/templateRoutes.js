const router = require("express").Router();
const templates = require("../data/trip-templates");
const Destination = require("../models/Destination");
const { requireAuth } = require("../middleware/authMiddleware");
const { dates, integer, fail, validateItinerary } = require("../utils/validation");
const note = "Lịch trình mẫu để tham khảo, chưa tối ưu tuyến đường hoặc xác nhận giờ mở cửa. Giá dùng ước tính hiện tại; tự bổ sung ăn uống, lưu trú và di chuyển.";
async function available() {
  const destinations = await Destination.find({isActive:true, slug:{$in:templates.flatMap(t=>t.days.flat(1).map(i=>i[0]))}}).lean();
  return templates.map(t=>({...t, days:t.days.map(day=>day.map(([slug,visitTime])=>({destination:destinations.find(d=>d.slug===slug),visitTime}))), note})).filter(t=>t.days.every(day=>day.every(i=>i.destination)));
}
router.get("/", async(req,res)=>res.json({items:await available(),note}));
router.post("/:template/clone", requireAuth, async(req,res)=>{
  const template = (await available()).find(t=>t.id===req.params.template);
  if(!template) fail("Mẫu chưa sẵn sàng vì có điểm đến đã ẩn hoặc thiếu dữ liệu.",404);
  dates(req.body.startDate,req.body.startDate);
  const endDate = new Date(Date.parse(req.body.startDate)+(template.days.length-1)*86400000).toISOString().slice(0,10);
  const travelers=integer(req.body.travelers,"Số người",1,100),budgetLimitVnd=integer(req.body.budgetLimitVnd,"Ngân sách");
  const body=validateItinerary({title:template.title,startDate:req.body.startDate,endDate,travelers,budgetLimitVnd,notes:note,expenses:[],days:template.days.map((day,n)=>({date:new Date(Date.parse(req.body.startDate)+n*86400000).toISOString().slice(0,10),notes:"",items:day.map((i,order)=>({destinationId:String(i.destination._id),visitTime:i.visitTime,note:"",order}))}))});
  const trip=await require("../models/Itinerary").create({...body,userId:req.user._id,ownerName:req.user.fullName,lastPlanAuthor:req.user.fullName,lastPlanSavedAt:new Date()});
  await require("../utils/activity")(req.user,"itinerary.created",trip,"Sao chép lịch trình mẫu");
  res.status(201).json({id:trip._id,path:`/planner?trip=${trip._id}`});
});
module.exports=router;
