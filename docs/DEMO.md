# Kịch bản trình bày TravelMate (8–10 phút)

## Chuẩn bị

- Dùng website online hoặc môi trường local theo README; mở trước website để Render Free khởi động.
- Chuẩn bị tài khoản thành viên và admin riêng của nhóm, một ảnh tự chụp có ngày chụp để demo đánh giá. Không hiển thị secret/session lên màn chiếu.
- Compass phải kết nối đúng database: website online dùng Atlas, bản localhost theo MONGO_URI local. Hai nơi không tự đồng bộ.
- Chạy `npm run check` và `npm test` trước buổi trình bày. Dùng bản ghi demo thuộc nhóm, không thay dữ liệu thật của tài khoản khác.

## 1. Khám phá và thông tin điểm đến (1–2 phút)

1. Trang chủ → tìm Đà Nẵng → lọc trải nghiệm/chi phí. Giới thiệu danh mục 102 điểm đến, phân trang và tìm không dấu.
2. Bấm tên Mỹ Khê để mở trang riêng `/destinations/bien-my-khe`: ảnh, ngày chụp, nguồn, thông tin thực tế, bản đồ và các điểm liên quan.
3. Sao chép liên kết. Phân biệt giá minh họa hoạt động với giá vé đã xác nhận; thông tin chưa có thì hiện cần đối chiếu.

## 2. Lịch trình mẫu, bản nháp và lịch sử (2–3 phút)

1. Mở Lịch trình mẫu, xem mẫu Huế hoặc Đà Nẵng; chọn ngày/số người/ngân sách và tạo bản riêng.
2. Thêm hoặc sửa ghi chú ngày, chờ thông báo **Đã lưu bản nháp**. Giải thích bản nháp riêng chưa thay lịch trình chung.
3. Mở lại chuyến đi ở tab mới, chọn khôi phục nháp, kiểm tra nội dung rồi **Lưu thay đổi**.
4. Mở Lịch sử kế hoạch, xem bản trước; nếu demo khôi phục, xác nhận và kiểm tra ghi chú quay về bản đã chọn.
5. Giới thiệu nhanh ngân sách đầy đủ, cảnh báo thiếu giá và tính chi phí theo số người. Nếu còn thời gian, mở cộng tác/chi tiêu hoặc chia sẻ chỉ xem.

## 3. Cá nhân hóa và đóng góp dữ liệu (1 phút)

1. Tài khoản → chọn sở thích, nhịp thong thả và nhóm gia đình → Lưu sở thích.
2. Về trang chủ xem gợi ý có lý do; tại form gợi ý lịch trình thấy lựa chọn được điền sẵn. Đây là thuật toán quy tắc, không dùng AI API hoặc tính tuyến trả phí.
3. Tại một điểm đến, gửi báo cáo thông tin cần sửa. Mở Phản hồi của tôi để xem đúng địa điểm/trạng thái.
4. Gửi đánh giá kèm ảnh tự chụp, có ngày trải nghiệm/ngày chụp; giải thích nội dung chờ admin duyệt.

## 4. Admin: quản lý, duyệt và xuất bản (2–3 phút)

1. Dashboard: số tài khoản/lịch trình, đánh giá và nội dung chờ duyệt. Mở Người dùng và toàn bộ lịch trình để cho thấy dữ liệu của thành viên vừa tạo.
2. Duyệt đánh giá: kiểm tra ảnh, ngày chụp, nội dung; duyệt hoặc từ chối kèm lý do. Mở trang điểm đến để đối chiếu trạng thái công khai.
3. Điểm đến → Soạn bản sửa trên bản ghi demo → Lưu nháp. Trong Biên tập nội dung, so sánh bản đang dùng/bản sửa; bản công khai chưa đổi.
4. Gửi duyệt → Xuất bản. Nguồn và ngày đối chiếu bắt buộc. Mở lịch sử để cho thấy bản trước có thể dùng lại làm nháp.
5. Phản hồi người dùng → trả lời báo cáo. Giới thiệu nhật ký hoạt động và bộ lọc nguồn cần rà soát sau 180 ngày.

## 5. Dữ liệu, kỹ thuật và kết quả (1 phút)

- Compass: `itineraries` chứa kế hoạch và lịch sử; `tripdrafts` chứa nháp riêng; `destinationreviews` chứa trạng thái duyệt; `communitymedia` chứa JPEG đã xử lý. Chỉ mở các trường cần trình bày, không mở session/password reset.
- `ARCHITECTURE.md`: frontend/Express cùng origin, MongoDB Atlas, CSRF và phân quyền; role admin không mở quyền chỉnh sửa lịch trình của người khác.
- `TESTING.md`: kết quả kiểm thử có thời điểm và phạm vi. GitHub CI kiểm tra trước khi Render tự deploy.
- Chốt giới hạn: giá tham khảo, dữ liệu chưa phủ mọi điểm, Google Maps bên thứ ba, Render Free có thể ngủ; PWA, .ics và tuyến trả phí ngoài phạm vi.

Bản nháp 7 ngày, lịch sử 15 bản, ảnh tối đa 300 KB sau xử lý và kho ảnh có hạn mức được mô tả trong `UPGRADES.md`. Idle user 5 phút/admin 10 phút được kiểm thử bằng thời điểm phiên trong database thử, không cần chờ 10 phút trong buổi trình bày.
