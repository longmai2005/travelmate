const fields = ["name","slug","province","region","category","shortDescription","description","imageUrl","imageCredit","imageSourceUrl","imageLicense","imageLicenseUrl","imageTakenOn","imageKind","latitude","longitude","address","openingHours","sourceUrl","verifiedOn","priceNote","estimatedCostPerPersonVnd","recommendedDurationHours","tags","isFeatured","isActive"];
function snapshot(destination) {
  const d=destination.toObject?destination.toObject():destination;
  return Object.fromEntries(fields.map(k=>[k,d[k]]));
}
function versionFilter(field,version) { return version===0?{$or:[{[field]:0},{[field]:{$exists:false}}]}:{[field]:version}; }
function previous(destination,authorName) {return {body:snapshot(destination),publishedBy:authorName,publishedAt:new Date()};}
module.exports={snapshot,versionFilter,previous};
