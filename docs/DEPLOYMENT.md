# Triển khai TravelMate: Render + MongoDB Atlas

## Dịch vụ đã triển khai

- URL: https://travelmate-tj0k.onrender.com
- Render: TravelMate trong My Workspace, Free, Singapore; lấy code từ `main`, Auto-Deploy **After CI Checks Pass**, health check `/healthz`.
- Atlas: cluster `travelmate`, Project 0, AWS Singapore, Free. Database production riêng trên Atlas; `.env` cục bộ tiếp tục trỏ tới MongoDB trên máy.
- Đã chuyển tài khoản và điểm đến hiện có sang Atlas, giữ nguyên mật khẩu đăng nhập đã mã hóa. Không chuyển sessions hay dữ liệu QA. Sau khi deploy, đăng nhập lại bằng tài khoản hiện có.
- CI kiểm tra cả `long_branch` và `main`; đổi dữ liệu qua admin không cần deploy lại.

## Cấu hình đã có trong repo

- `.github/workflows/ci.yml`: mỗi push lên `main`, `long_branch`, `codex/**`, và PR vào `main` chạy kiểm tra cú pháp, unit test, integration test với MongoDB 8 trong service riêng. Không sử dụng database thật hay secrets của production.
- `render.yaml`: Web Service Node 22, Singapore, gói Free, nhánh `main`, build `npm ci --omit=dev`, chạy `npm start`, health check `/healthz`, chỉ auto-deploy khi CI đạt (`checksPass`).
- `SESSION_SECRET` được Render sinh một lần; giữ ổn định giữa các lần deploy. `MONGO_URI` là secret do người vận hành cấu hình. Không commit `.env` hay đưa chuỗi kết nối vào ảnh chụp/chat.

## Thiết lập lần đầu

1. Tạo cluster Atlas Free gần Render (Singapore), database `travelmate`. Tạo database user chỉ có `readWrite` trên database này. Thêm các dải **Outbound IP Addresses** của dịch vụ Render vào Atlas Network Access. Không mở toàn Internet nếu không cần.
2. Kết nối Render với GitHub, chỉ cấp quyền cho repo `longmai2005/travelmate`.
3. Tạo Blueprint từ repo/nhánh `main` để áp dụng `render.yaml`. Nếu tạo Web Service thủ công, nhập đúng build/start phía trên; đặt Node 22 và `NODE_ENV=production`, `SESSION_SECRET` ngẫu nhiên ít nhất 32 ký tự, `MONGO_URI` trỏ đến database Atlas.
4. Ở Settings, kiểm tra Health Check Path là `/healthz` và Auto-Deploy là **After CI Checks Pass**. Việc có file YAML trong repo không tự cấu hình một service được tạo thủ công.
5. Khởi tạo dữ liệu một lần: chạy `npm run seed` với môi trường trỏ tới Atlas. Lệnh chỉ chèn slug chưa có, không ghi đè điểm đến admin đã sửa. Tạo admin bằng `npm run seed:admin` với `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` đặt trong môi trường bí mật; mật khẩu tối thiểu 12 ký tự. Nếu chuyển database hiện có, giữ ObjectId để không mất tham chiếu giữa tài khoản và lịch trình. Không sao chép sessions hoặc database QA.
6. Kiểm tra URL HTTPS: `/healthz` trả `200 {"status":"ok"}`, mở trang, đăng nhập, tạo/lưu lịch trình và đọc được trong admin. HTTP cục bộ với `NODE_ENV=production` không giữ được cookie secure; chỉ dùng production qua HTTPS.

## Cập nhật hằng ngày

1. Sửa trên `long_branch` hoặc nhánh tính năng, push và kiểm tra **TravelMate CI**.
2. Merge thay đổi đã kiểm tra vào `main`. CI chạy lại trên commit mới; Render tự build/deploy khi checks đạt.
3. Xác nhận trạng thái Live và `/healthz`. Trang đang mở cần tải lại để lấy code mới. Khi build lỗi, Render giữ bản deploy thành công trước đó.

Thay đổi điểm đến trong admin và lịch trình người dùng được lưu trong MongoDB, không cần push code. Admin kiểm tra hoạt động mới mỗi 30 giây khi tab đang hiển thị; tạm hoãn cập nhật bảng nếu đang nhập bộ lọc, chọn nội dung hay mở hộp thoại.

## Dữ liệu, khôi phục và giới hạn

- Dữ liệu production sống trên Atlas, độc lập với vòng đời deploy. Không reset/seed lại database trong build hoặc mỗi lần server khởi động.
- Khi đổi schema, ưu tiên thay đổi bổ sung có giá trị mặc định, đọc được dữ liệu cũ. Sao lưu dữ liệu trước thay đổi có thể làm mất thông tin.
- Có thể rollback code về deploy thành công trước trong Render. Rollback code không rollback dữ liệu MongoDB.
- Render Free có thể ngủ khi không có truy cập; lượt truy cập đầu cần chờ khởi động. Gói Free là lựa chọn demo, không có cam kết luôn hoạt động.
- Không lưu file người dùng tải lên trên filesystem tạm của Render. Khi bổ sung upload cần storage riêng.
- Nhật ký hoạt động chỉ admin đọc và tự hết hạn sau 90 ngày. Lịch trình mặc định riêng tư; liên kết chia sẻ chỉ xem, có thể đổi hoặc thu hồi. Bản PDF đã tải xuống không thể thu hồi từ xa.

Tham khảo: [Render Blueprint](https://render.com/docs/blueprint-spec), [Auto-deploy](https://render.com/docs/deploys), [Render Free](https://render.com/docs/free), [Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
