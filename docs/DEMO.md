# Kịch bản thuyết trình TravelMate (8–10 phút)

## Chuẩn bị

- Bật MongoDB Server; mở Compass với URI `mongodb://127.0.0.1:27017`.
- Chạy `npm run seed` và `npm run dev`, mở `http://localhost:3000`.
- Chạy `npm run seed:admin` trước buổi trình bày bằng mật khẩu riêng; đừng hiển thị secret lên màn chiếu.
- Chuẩn bị tài khoản người dùng thông thường hoặc đăng ký trực tiếp khi demo.
- Có Internet để xem Google Maps; ảnh và icons đã nằm local, bản nhúng không cần cấu hình API key.

## 1. Giới thiệu và khách truy cập (2 phút)

“TravelMate giúp người trẻ gom việc tìm điểm đến, lưu cảm hứng và lên lịch từng ngày vào một website. Phần ‘Smart’ là tìm kiếm, lọc và tính ngân sách tự động.”

1. Giới thiệu trang chủ, ảnh cảnh quan, sáu điểm nổi bật lấy từ MongoDB.
2. Nhập **Đà Nẵng** trong ô tìm kiếm, bấm Tìm điểm đến.
3. Lọc Biển & đảo, thử mức dưới 200.000 đồng, thay đổi sắp xếp.
4. Bỏ bộ lọc, bật Bản đồ và chọn **Phố cổ Hội An** trong danh sách vị trí. Thử Mở Google Maps và Chỉ đường, sau đó xem Chi tiết.
5. Giới thiệu Google Maps nhúng, mỗi lần xem một điểm. Điểm có tọa độ dùng tọa độ đã đối chiếu; điểm thiếu tọa độ tìm theo tên và tỉnh thành, giao diện có ghi rõ.

## 2. Người dùng và lịch trình (3–4 phút)

“Đăng nhập dùng session phía máy chủ. Favorites và lịch trình thuộc từng tài khoản, không dùng localStorage để giả lập lưu.”

1. Mở Đăng nhập → Đăng ký, nhập họ tên, email riêng và mật khẩu đủ dài.
2. Lưu trái tim Hội An và Mỹ Khê, mở Yêu thích, tìm nhanh một địa điểm.
3. Mở Lịch trình → Tạo chuyến đi mới:
   - Tên: **Ba ngày Đà Nẵng**.
   - Từ **10/11/2026** đến **12/11/2026**.
   - **2** người; ngân sách hoạt động **3.000.000** VND.
4. Thêm Mỹ Khê vào ngày 1, chọn 08:00 và ghi chú.
5. Thêm Hội An vào ngày 2. Thêm Bà Nà vào ngày 3, thay ước tính để thấy phép tính thay đổi.
6. Dùng nút chuyển ngày của hoạt động để chuyển sang một ngày khác.
7. Giảm ngân sách xuống 500.000 để hiện cảnh báo vượt ngân sách, rồi đặt lại.
8. Nhấn **Lưu lịch trình**, refresh và mở lại thẻ chuyến đi. Hoạt động vẫn còn.
9. Sửa ghi chú hoặc bỏ một hoạt động rồi lưu lại.
10. Thử đổi ngày kết thúc làm mất một ngày có hoạt động; giải thích hộp thoại xác nhận.

“Ngân sách này chỉ cho hoạt động. Giá seed minh họa, chưa tính khách sạn, xe và ăn uống; không có giá sẽ hiện cảnh báo chưa đủ.”

## 3. Quản trị hệ thống (3 phút)

1. Lưu một lịch trình bằng tài khoản người dùng, sau đó đăng xuất và đăng nhập admin đã khởi tạo.
2. Giới thiệu dashboard: số tài khoản/lịch trình, hoạt động 7 ngày, thành viên mới và lịch trình mới.
3. Mở Người dùng, tìm thành viên vừa tạo chuyến đi, xem Hồ sơ và bấm số lịch trình để lọc đúng tài khoản.
4. Mở chi tiết lịch trình: người tạo, ngày đi, số người, ngân sách, ghi chú, hoạt động theo ngày; đối chiếu với trang người dùng.
5. Mở Tất cả lịch trình, thử trạng thái ngày đi, từ khóa người tạo/email và ngày khởi hành.
6. Với tài khoản demo được chuẩn bị riêng, thử tạm khóa có lý do và mở khóa. Dữ liệu vẫn được giữ; thành viên phải đăng nhập lại. Không thao tác tài khoản thật của người khác để demo.
7. Mở Điểm đến: tạo bản ghi demo với ảnh placeholder, sửa, ẩn và khôi phục như trước.

“Mọi API admin kiểm tra role; tài khoản thường vẫn chỉ đọc lịch trình của mình. Trạng thái chuyến đi chỉ dựa trên ngày, chi phí là ước tính hoạt động.”

## 4. MongoDB Compass (1 phút)

1. Refresh database `travelmate`.
2. `users`: tài khoản vừa đăng ký, `role=user`, mật khẩu đã hash.
3. `favorites`: cặp userId và destinationId; có compound unique index.
4. `itineraries`: userId, ngày thuần túy, mảng days và items nhúng.
5. `destinations`: địa điểm vừa thêm, `isActive` đổi khi ẩn/khôi phục.
6. `sessions`: giải thích phiên tồn tại sau refresh; không mở chi tiết session lên màn chiếu.

## 5. Kết thúc bằng kỹ thuật và kiểm thử

“Dự án chạy bằng một Express server, frontend HTML/CSS/JavaScript thuần. Backend kiểm tra dữ liệu, quyền chủ sở hữu và CSRF. Bộ test chạy với MongoDB thật trong database test riêng, tự dọn sau khi xong.”

Mở `docs/TESTING.md` để trình bày kết quả đã thực hiện. Các hướng phát triển thêm như export PDF hoặc reset mật khẩu nằm ngoài phạm vi đồ án hiện tại.
