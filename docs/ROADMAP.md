# Kế hoạch nâng cấp TravelMate

Cập nhật phạm vi theo trao đổi ngày 24/10/2026. Các hạng mục bên dưới đã được triển khai trong đợt hoàn thiện ngày 24/10/2026; xem giới hạn vận hành trong [UPGRADES.md](UPGRADES.md).

## Phạm vi đã thống nhất

1. **Đã làm:** tự lưu bản nháp riêng, phục hồi sau đăng nhập và lịch sử 15 phiên bản kế hoạch. Kiểm tra xung đột giữa tab/cộng tác viên, không lưu bản nháp vào localStorage.
2. **Đã làm:** thư viện sáu lịch trình mẫu đã biên tập; sao chép thành lịch trình riêng với ngày khởi hành và ngân sách của người dùng.
3. **Đã làm:** trang công khai riêng từng điểm đến, URL chia sẻ, ảnh và nguồn, thông tin thực tế, địa điểm liên quan, canonical/Open Graph và sitemap.
4. **Đã làm:** sở thích lưu theo tài khoản, gợi ý có lý do từ sở thích/yêu thích/thời lượng; nhịp độ và nhóm đồng hành điều chỉnh số điểm/ngày.
7. **Đã làm:** đánh giá và ảnh cộng đồng có ngày chụp, kiểm duyệt trước khi hiển thị. Ảnh JPEG đã nén và bỏ metadata lưu trong collection riêng trên MongoDB, có hạn mức.
8. **Đã làm:** quy trình bản nháp → chờ duyệt → xuất bản, so sánh bản đang dùng/bản sửa, lịch sử 15 bản trước và danh sách nguồn cần rà soát sau 180 ngày.

Giữ số thứ tự đề xuất ban đầu để đối chiếu. Loại khỏi kế hoạch mục **5: cài đặt PWA** và **6: xuất lịch .ics**. Không triển khai API tính tuyến đường có phí. Chức năng đọc lịch trình ngoại tuyến hiện có vẫn thuộc sản phẩm hiện tại.

Phạm vi hoàn thiện đã bao gồm 1, 2, 3, 4, 7 và 8. Không tự thêm tính năng ngoài phạm vi này.

## Bổ sung: báo cáo thông tin riêng từng điểm đến

- Nút **Báo cáo thông tin điểm đến** trong chi tiết địa điểm, dùng chung ở trang chủ, khám phá, yêu thích và lịch trình.
- Thành viên đăng nhập chọn loại: giá, địa chỉ/bản đồ, giờ mở cửa, ảnh, mô tả, đóng cửa hoặc góp ý khác; mô tả thông tin cần sửa và nguồn đối chiếu nếu có.
- Báo cáo lưu vào collection `feedbacks` cùng `userId` và `destinationId`. Compass là ứng dụng xem dữ liệu; database dùng theo môi trường kết nối (Atlas trên website production, database riêng khi kiểm thử).
- Người gửi theo dõi trạng thái và câu trả lời tại **Phản hồi của tôi**. Thành viên khác không đọc được báo cáo đó.
- Admin lọc theo trạng thái, phạm vi, loại nội dung và điểm đến; mở đúng bản ghi để sửa, sau đó ghi kết quả xử lý. Báo cáo không tự thay đổi dữ liệu điểm đến.
- Giữ giới hạn 10 báo cáo/giờ/tài khoản, CSRF, phân quyền admin và kiểm tra phiên bản khi trả lời.

## Đối chiếu với đồ án cuối kỳ

Phạm vi hiện có đủ rộng cho một đồ án website quản lý/lập lịch du lịch: giao diện responsive, xác thực và phân quyền, CRUD, MongoDB, lịch trình và ngân sách, quản trị, triển khai online và kiểm thử. Kết luận đáp ứng môn học cần đối chiếu rubric giảng viên; không suy ra điểm số từ số lượng tính năng.

Trước khi nộp, ưu tiên kiểm tra luồng demo ổn định, cập nhật ERD/sơ đồ chức năng và hướng dẫn triển khai, ghi rõ giới hạn dữ liệu/giá/bản đồ, cùng phân công đóng góp của nhóm. Báo cáo tiến độ cần ghi theo phạm vi và bằng chứng thực tế; lịch sử trước ngày bật tính năng không được tạo lại giả.
