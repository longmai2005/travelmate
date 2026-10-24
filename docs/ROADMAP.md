# Kế hoạch nâng cấp TravelMate

Cập nhật phạm vi theo trao đổi ngày 24/10/2026. Đây là kế hoạch, không phải danh sách chức năng đã hoàn thành.

## Phạm vi đã thống nhất

1. Tự lưu bản nháp lịch trình, phục hồi sau đăng nhập và lịch sử phiên bản. Cần giữ kiểm tra xung đột giữa cộng tác viên và xóa dữ liệu riêng khi đăng xuất.
2. Thư viện lịch trình mẫu đã biên tập; sao chép thành lịch trình riêng để chỉnh sửa.
3. Trang công khai riêng cho từng điểm đến: URL chia sẻ, ảnh và nguồn, thông tin thực tế, địa điểm liên quan.
4. Cá nhân hóa theo sở thích, nhịp độ và nhóm đồng hành; giải thích lý do gợi ý.
7. Đánh giá và ảnh cộng đồng có ngày chụp, kiểm duyệt trước khi hiển thị. Cần lựa chọn kho lưu ảnh riêng trước khi triển khai.
8. Quy trình biên tập điểm đến: bản nháp, chờ duyệt, xuất bản, lịch sử chỉnh sửa và nhắc rà soát thông tin cũ.

Giữ số thứ tự đề xuất ban đầu để đối chiếu. Loại khỏi kế hoạch mục **5: cài đặt PWA** và **6: xuất lịch .ics**. Không triển khai API tính tuyến đường có phí. Chức năng đọc lịch trình ngoại tuyến hiện có vẫn thuộc sản phẩm hiện tại.

Ưu tiên giai đoạn tiếp theo: 1 → 2 → 3; sau đó đánh giá thời gian dành cho 4, 7 và 8.

## Bổ sung: báo cáo thông tin riêng từng điểm đến

- Nút **Báo cáo thông tin điểm đến** trong chi tiết địa điểm, dùng chung ở trang chủ, khám phá, yêu thích và lịch trình.
- Thành viên đăng nhập chọn loại: giá, địa chỉ/bản đồ, giờ mở cửa, ảnh, mô tả, đóng cửa hoặc góp ý khác; mô tả thông tin cần sửa và nguồn đối chiếu nếu có.
- Báo cáo lưu vào collection `feedbacks` cùng `userId` và `destinationId`. Compass là ứng dụng xem dữ liệu; database dùng theo môi trường kết nối (Atlas trên website production, database riêng khi kiểm thử).
- Người gửi theo dõi trạng thái và câu trả lời tại **Phản hồi của tôi**. Thành viên khác không đọc được báo cáo đó.
- Admin lọc theo trạng thái, phạm vi, loại nội dung và điểm đến; mở đúng bản ghi để sửa, sau đó ghi kết quả xử lý. Báo cáo không tự thay đổi dữ liệu điểm đến.
- Giữ giới hạn 10 báo cáo/giờ/tài khoản, CSRF, phân quyền admin và kiểm tra phiên bản khi trả lời.

## Đối chiếu với đồ án cuối kỳ

Phạm vi hiện có đủ rộng cho một đồ án website quản lý/lập lịch du lịch: giao diện responsive, xác thực và phân quyền, CRUD, MongoDB, lịch trình và ngân sách, quản trị, triển khai online và kiểm thử. Kết luận đáp ứng môn học cần đối chiếu rubric giảng viên; không suy ra điểm số từ số lượng tính năng.

Trước khi nộp, ưu tiên kiểm tra luồng demo ổn định, cập nhật ERD/sơ đồ chức năng và hướng dẫn triển khai, ghi rõ giới hạn dữ liệu/giá/bản đồ, cùng phân công đóng góp của nhóm. Các nâng cấp trong kế hoạch không tự động được tính là đã hoàn thành trong báo cáo tiến độ.
