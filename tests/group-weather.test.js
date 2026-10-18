const test=require("node:test"),assert=require("node:assert/strict");
const group=require("../public/js/group-budget"),input=require("../utils/groupInput");
const {weatherForTrip,inForecastRange}=require("../utils/weather");
const {todayInVietnam}=require("../utils/adminData");
test("Chia VND lẻ, người trả không cùng chia, hoàn trả và tổng số dư luôn cân bằng",()=>{
  const trip={budgetLimitVnd:1000,participants:[{id:"a",name:"An"},{id:"b",name:"Bình"},{id:"c",name:"Chi"}],actualExpenses:[{id:"e",label:"Ăn",category:"food",date:"2026-10-18",amountVnd:101,paidBy:"a",splitBetween:["a","b","c"]}],settlements:[]};
  const result=group(input(trip,3));assert.deepEqual(result.people.map(p=>p.owed),[34,34,33]);assert.equal(result.people.reduce((n,p)=>n+p.balance,0),0);assert.equal(result.total,101);
  trip.settlements=[{id:"s",from:"b",to:"a",amountVnd:34,note:""}];assert.equal(group(input(trip,3)).people[1].balance,0);
  trip.actualExpenses[0].splitBetween=["b","c"];assert.deepEqual(group(input(trip,3)).people.map(p=>p.owed),[0,51,50]);
  for(const amount of [1,2,100,999999999]){trip.actualExpenses[0].amountVnd=amount;const r=group(input(trip,3));assert.equal(r.people.reduce((n,p)=>n+p.owed,0),amount);assert.equal(r.people.reduce((n,p)=>n+p.balance,0),0);const balances=new Map(r.people.map(p=>[p.id,p.balance]));for(const t of r.transfers){balances.set(t.from,balances.get(t.from)+t.amountVnd);balances.set(t.to,balances.get(t.to)-t.amountVnd);}assert.ok([...balances.values()].every(n=>n===0));}
});
test("Sổ chi từ chối thành viên trùng, đã xóa, tiền lẻ, chia trùng và ngày sai",()=>{
  const valid={participants:[{id:"a",name:"An"}],actualExpenses:[{id:"e",label:"Vé",category:"activities",date:"2026-10-18",amountVnd:10,paidBy:"a",splitBetween:["a"]}],settlements:[]};
  for(const change of [{participants:[]},{participants:[...valid.participants,...valid.participants]},{actualExpenses:[{...valid.actualExpenses[0],amountVnd:0.5}]},{actualExpenses:[{...valid.actualExpenses[0],splitBetween:["a","a"]}]},{actualExpenses:[{...valid.actualExpenses[0],date:"2026-02-30"}]},{settlements:[{id:"s",from:"a",to:"a",amountVnd:1}]}])assert.throws(()=>input({...valid,...change},2));
});
test("Dự báo đúng ngày VN, phân biệt ngoài khoảng/thiếu địa điểm và không bịa dữ liệu khi lỗi",async()=>{
  const today=todayInVietnam();assert.equal(inForecastRange(today),true);assert.equal(inForecastRange(new Date(Date.parse(today)+15*86400000).toISOString().slice(0,10)),true);assert.equal(inForecastRange(new Date(Date.parse(today)+16*86400000).toISOString().slice(0,10)),false);
  const trip={days:[{date:today,items:[]},{date:"2000-01-01",items:[]},{date:today,items:[{destinationId:{name:"A",latitude:16.055,longitude:108.202}}]}]};
  const result=await weatherForTrip(trip,async()=>{throw new Error("offline");});assert.deepEqual(result.days.map(d=>d.status),["no_location","out_of_range","unavailable"]);
});
test("Dự báo dùng tọa độ/địa danh VN, cache thời điểm thật và gộp yêu cầu trùng",async()=>{
  const today=todayInVietnam();let count=0;
  const fetcher=async url=>{count++;const u=new URL(url);if(u.hostname.startsWith("geocoding")){assert.equal(u.searchParams.get("countryCode"),"VN");return {ok:true,json:async()=>({results:[{name:"Đà Nẵng",country_code:"VN",latitude:16.05,longitude:108.2}]})};}assert.equal(u.searchParams.get("forecast_days"),"16");return {ok:true,json:async()=>({daily:{time:[today],weather_code:[61],temperature_2m_max:[28],temperature_2m_min:[22],precipitation_probability_max:[80],wind_speed_10m_max:[20]}})};};
  const day={date:today,items:[{destinationId:{name:"Điểm A",province:"Đà Nẵng",latitude:null,longitude:null}}]};
  const result=await weatherForTrip({days:[day,day]},fetcher);assert.equal(count,2);assert.equal(result.days[0].approximate,true);assert.equal(result.days[0].rainPercent,80);assert.equal(result.days[0].status,"available");
  const again=await weatherForTrip({days:[day]},fetcher);assert.equal(count,2);assert.equal(again.days[0].fetchedAt,result.days[0].fetchedAt);
});

test("Không chọn địa danh trùng tên nhưng khác tỉnh cho thời tiết",async()=>{
  const trip={days:[{date:todayInVietnam(),items:[{destinationId:{name:"Vịnh Hạ Long",province:"Quảng Ninh"}}]}]};
  let calls=0;const result=await weatherForTrip(trip,async()=>{calls++;return {ok:true,json:async()=>({results:[{name:"Quán Hàu",admin1:"Quang Tri",country_code:"VN",latitude:17.3,longitude:106.6}]})};});
  assert.equal(result.days[0].status,"unavailable");assert.equal(calls,1);
});
