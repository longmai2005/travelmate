module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Nội dung JSON không hợp lệ.";
  }
  if (error.code === 11000) {
    status = 409;
    message = "Dữ liệu đã tồn tại. Vui lòng kiểm tra email hoặc tên định danh.";
  }
  if (["ValidationError", "CastError"].includes(error.name)) {
    status = 400;
    message = "Dữ liệu không hợp lệ. Vui lòng kiểm tra các trường.";
  }
  if (
    [
      "MongoServerSelectionError",
      "MongoNetworkError",
      "MongooseServerSelectionError",
    ].includes(error.name)
  ) {
    status = 503;
    message = "Chưa thể kết nối MongoDB. Hãy kiểm tra máy chủ cơ sở dữ liệu.";
  }
  if (status >= 500) {
    console.error("Lỗi máy chủ:", error.message);
    if (status !== 503) message = "Máy chủ gặp lỗi. Vui lòng thử lại.";
  }
  res.status(status).json({ message });
};
