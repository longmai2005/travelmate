# Các nâng cấp hoàn thiện — 24/10/2026

## Lịch trình và bản nháp

Sau khi người chỉnh sửa ngừng nhập khoảng 1,8 giây, website gửi bản nháp riêng lên máy chủ. **Lưu thay đổi** mới cập nhật lịch trình dùng chung. Bản nháp lưu theo cặp tài khoản/chuyến đi, hết hạn sau 7 ngày; không ghi nội dung vào localStorage. Đăng xuất xóa trạng thái riêng trong trình duyệt, bản nháp trên server còn để đúng tài khoản khôi phục.

Khi mở lại lịch trình, người dùng chọn bản đã lưu hoặc khôi phục nháp. Nếu kế hoạch chung đã đổi, giao diện yêu cầu đối chiếu và xác nhận trước khi áp dụng nháp lên phiên bản mới. Bản nháp có phiên bản riêng để tab này không ghi đè bản vừa lưu ở tab khác. Phiên hết hạn vẫn chặn ghi; tự lưu nháp không kéo dài idle 5 phút của user hoặc 10 phút của admin.

Mỗi lần lưu kế hoạch giữ bản trước trong lịch sử, tối đa 15 bản/chuyến đi. Xem và khôi phục hoạt động, ghi chú, ngày đi, số người và ngân sách. Quyền cộng tác, chia sẻ, thành viên chia tiền và sổ chi thực tế không bị khôi phục lùi. Nếu số người hoặc địa điểm cũ không còn hợp lệ, server từ chối khôi phục và yêu cầu đối chiếu. Lịch sử bắt đầu từ sau khi tính năng được bật, không tái tạo các lần sửa cũ.

## Lịch trình mẫu và cá nhân hóa

`/templates` có sáu mẫu: Đà Nẵng/Hội An, Hà Nội, Huế, Đà Lạt, Ninh Bình và TP. Hồ Chí Minh. Một mẫu chỉ sẵn sàng khi mọi địa điểm của mẫu đang hiển thị. Sao chép tạo chuyến đi riêng với giá hiện tại, ngày khởi hành, số người và ngân sách đã chọn; không sửa mẫu gốc hoặc mở quyền cho người khác.

Các mốc giờ là đề xuất biên tập; chưa xác nhận giờ mở cửa, thời gian đi lại hoặc tối ưu tuyến. Mức chi phí thiếu vẫn được cảnh báo. Cần tự bổ sung lưu trú, ăn uống và di chuyển.

Tại `/account`, người dùng lưu sở thích, nhịp độ và nhóm đồng hành. Trang chủ ưu tiên nhóm trải nghiệm đã chọn, nơi tương tự nhóm yêu thích và thời lượng, kèm lý do. Gợi ý lịch trình chọn sẵn sở thích; nhịp thong thả hoặc đi gia đình tối đa hai điểm/ngày, phương án khác tối đa ba điểm. Đây là gợi ý theo quy tắc, không dùng AI API và không xác nhận điều kiện phù hợp với mọi độ tuổi.

## Điểm đến và đánh giá cộng đồng

Mỗi địa điểm công khai có `/destinations/:slug`: nội dung render từ server, canonical/Open Graph, nút sao chép liên kết, ảnh và nguồn/ngày chụp, thông tin thực tế, Google Maps và địa điểm liên quan. Sitemap chỉ liệt kê điểm đang hiển thị. Thay tên giữ slug để liên kết đã chia sẻ còn dùng được.

Mỗi tài khoản có một đánh giá/địa điểm, điểm từ 1–5, ngày trải nghiệm và tên hiển thị công khai. Người gửi xác nhận quyền nội dung/ảnh. Gửi mới hoặc sửa chuyển về chờ duyệt; điểm trung bình và thư viện ảnh chỉ dùng đánh giá đã duyệt. Người gửi thấy trạng thái/lý do riêng và có thể sửa, gửi lại hoặc gỡ khỏi công khai. Gỡ là thao tác giữ nội dung riêng để có thể gửi lại.

Ảnh JPEG/PNG/WebP được nén ở trình duyệt; server giải mã, kiểm tra ảnh tĩnh, giới hạn số pixel, xoay đúng hướng và chuyển JPEG tối đa 1.200 px. Không giữ metadata gốc. Giới hạn 300 KB sau xử lý, 3 MB/tài khoản, 32 MB toàn kho; giới hạn xử lý hai ảnh đồng thời. Hết kho vẫn gửi được đánh giá không ảnh; người dùng có thể bỏ ảnh cũ trong form sửa. API giới hạn 12 lần gửi/sửa mỗi giờ.

Ảnh nằm trong collection riêng, không đi vào GitHub hoặc filesystem Render. URL ảnh kiểm tra quyền mỗi lần đọc: ảnh chờ duyệt/từ chối chỉ chủ ảnh và admin xem; ảnh đã duyệt chỉ công khai khi điểm đến đang hiển thị. `Cache-Control: no-store` giúp việc gỡ/thu hồi có hiệu lực ở lần yêu cầu tiếp theo. Ảnh đã được người khác tải về không thể thu hồi từ máy của họ.

Kho ảnh có bộ đếm đặt chỗ nguyên tử, giảm khi thay/bỏ ảnh. Nếu tiến trình bị dừng giữa bước đặt chỗ và lưu ảnh, bộ đếm có thể dư theo hướng từ chối sớm. Khi cần đối soát, tạm dừng ghi ảnh, sao lưu `communitymedia`/`mediaquotas`, tổng hợp `bytes` thực theo tài khoản và toàn kho rồi mới sửa bộ đếm. Không chạy đối soát đồng thời với upload.

## Admin: biên tập và duyệt

**Duyệt đánh giá** hiển thị ảnh, ngày chụp, nội dung và tài khoản gửi. Admin duyệt hoặc từ chối có lý do; người gửi đọc được kết quả. Thao tác kiểm tra phiên bản để không duyệt nhầm đánh giá vừa được sửa/gỡ.

**Biên tập nội dung** gồm bản nháp, chờ duyệt và đã xuất bản. Điểm mới giữ ẩn trước khi xuất bản. Soạn/sửa nháp không đổi bản đang dùng; admin so sánh hai bản rồi xuất bản. Cần có URL nguồn và ngày đối chiếu. Lưu 15 bản nội dung trước; có thể mở bản cũ để soạn một bản nháp mới. Không tự xuất bản lùi ngay khi xem lịch sử.

Danh sách **Cần rà soát nguồn (180 ngày)** gồm điểm đang hiển thị chưa có ngày kiểm tra hoặc đã quá 180 ngày. Đây là bộ lọc để admin chủ động xử lý, không phải dịch vụ gửi nhắc tự động.

Các API admin cập nhật trực tiếp cũ vẫn dành riêng admin để tương thích công cụ hiện có; thay đổi cũng tăng phiên bản nội dung và lưu bản trước. Giao diện hiện tại dùng quy trình biên tập. Ẩn/khôi phục hoặc đồng bộ danh mục làm bản nháp dựa trên nội dung cũ mất hiệu lực, cần mở lại và đối chiếu. Nhật ký ghi khôi phục kế hoạch, gửi/gỡ/duyệt đánh giá, cập nhật sở thích, biên tập và xuất bản.

## Phạm vi vận hành

Không cần tài khoản dịch vụ mới hoặc API key mới. Các trường/collection bổ sung tương thích dữ liệu cũ; server khởi tạo index, không xóa hoặc seed lại dữ liệu production. Hạn mức kho ảnh không thay thế việc theo dõi dung lượng Atlas và Render Free vẫn có thể ngủ khi không truy cập.

PWA, xuất lịch .ics và API tính tuyến đường có phí không được thêm. Chức năng đọc lịch trình ngoại tuyến cũ tiếp tục hoạt động.
