# Email khôi phục miễn phí

TravelMate dùng Brevo qua HTTPS, không dùng cổng SMTP trên Render Free. Brevo Free hiện giới hạn 300 email/ngày; hạn mức và điều kiện do nhà cung cấp quyết định. Không cần bật Google Maps Routes hay dịch vụ trả phí để dùng các nâng cấp này.

1. Tạo tài khoản tại https://www.brevo.com/ và xác nhận email đăng ký. Tự hoàn thành bước đồng ý điều khoản/xác minh nếu được yêu cầu.
2. Trong Settings → Senders, Domains & Dedicated IPs → Senders, thêm địa chỉ gửi và xác minh. Nếu có tên miền riêng, xác thực tên miền theo hướng dẫn Brevo. Nếu chưa có, dùng địa chỉ gửi đã được Brevo chấp nhận; khả năng gửi còn phụ thuộc kiểm duyệt tài khoản và yêu cầu của nhà cung cấp.
3. Trong SMTP & API → API Keys, tạo API key cho TravelMate. Không gửi key hoặc mật khẩu vào chat, không commit vào Git.
4. Mở Render → service TravelMate → Environment, thêm ba biến bên dưới. Dùng Save, rebuild, and deploy để áp dụng:

```dotenv
APP_ORIGIN=https://travelmate-tj0k.onrender.com
BREVO_API_KEY=<API key được tạo trong Brevo>
MAIL_FROM_EMAIL=<địa chỉ người gửi đã xác minh>
```

Để chạy cục bộ, thêm các biến vào `.env`, với `APP_ORIGIN=http://localhost:3000`, rồi khởi động lại server. `.env` đã được Git bỏ qua. Chỉ `APP_ORIGIN` là thông tin công khai.

5. Khi đã cấu hình xong, thử Quên mật khẩu bằng chính email tài khoản của bạn; kiểm tra hộp thư, spam và nhật ký giao dịch trong Brevo. Không gửi thử tới người khác khi chưa được họ đồng ý.

`GET /api/auth/config` chỉ trả trạng thái đã cấu hình, không trả secret. Nếu chưa có đủ biến, Quên mật khẩu sẽ thông báo dịch vụ chưa kích hoạt và không giả báo đã gửi email.

Liên kết có hiệu lực 15 phút, một lần sử dụng, mã ngẫu nhiên chỉ lưu hash trong MongoDB. Mã nằm trong phần fragment của URL để không vào access log; trang đặt lại bỏ fragment khỏi thanh địa chỉ sau khi đọc. Đặt lại hoặc đổi mật khẩu thu hồi các phiên đăng nhập cũ. Yêu cầu khôi phục có thông báo chung cho email tồn tại/không tồn tại, giới hạn tần suất, và không chờ độ trễ từ máy chủ email để trả kết quả. Việc gửi không được bảo đảm nếu nhà cung cấp từ chối hoặc server dừng giữa lúc gửi; hãy xem nhật ký Brevo và yêu cầu lại khi cần.

Tài liệu: https://developers.brevo.com/reference/send-transac-email và https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
