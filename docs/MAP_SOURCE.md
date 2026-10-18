# Google Maps trong TravelMate

Theo yêu cầu ngày 17/10/2026, TravelMate dùng **Google Maps dạng nhúng**, thay cho Leaflet và ảnh VNSDI. Bản nhúng hiện tại không yêu cầu cấu hình API key trong `.env`.

## Cách tích hợp

- Iframe khởi tạo từ `https://www.google.com/maps?q=QUERY&z=14&hl=vi&output=embed`; Google chuyển nội dung tới `/maps/embed` trong kiểm tra thực tế. Giữ nguyên logo, attribution và điều khiển của Google.
- Tham khảo [hướng dẫn nhúng/chia sẻ bản đồ](https://support.google.com/maps/answer/7101463?hl=vi).
- Nút mở bản đồ và chỉ đường dùng [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) với `api=1`, không cần API key.
- CSP chỉ cho phép iframe Google từ `https://www.google.com`; không tải script bản đồ vào trang cha, không dùng tiles không công bố hay lưu dữ liệu Google vào MongoDB.
- Đây không phải Maps JavaScript API hay Maps Embed API v1. URL nhúng công khai không có cam kết hạn mức hoặc độ ổn định API. Khi cần marker tùy biến cho nhiều điểm cùng lúc, cần tích hợp Maps JavaScript API bằng project/key được cấp và giới hạn domain phù hợp. [Maps Embed API v1](https://developers.google.com/maps/documentation/embed/embedding-map) cũng yêu cầu key.

## Hành vi

Bật Bản đồ trên Khám phá để chọn từng điểm trong trang kết quả hiện tại. Bộ lọc và phân trang cập nhật danh sách chọn. Chi tiết của mọi điểm cũng có bản nhúng và liên kết chỉ đường.

- Có đủ tọa độ: Google Maps nhận cặp tọa độ đã lưu và đối chiếu.
- Thiếu tọa độ: tìm theo tên, tỉnh/thành và Việt Nam; giao diện ghi rõ tìm theo tên. Kết quả cần đối chiếu, không tự lưu thành tọa độ xác minh.
- Không có kết quả: iframe cũ được ẩn và hiện trạng thái trống.
- Cần Internet; liên kết Mở Google Maps luôn đặt cạnh bản nhúng để dùng khi không tải được iframe.

Mô tả và chi phí TravelMate vẫn lấy từ MongoDB của đồ án, không tự cập nhật từ Google. Sử dụng Google Maps không phải là chứng nhận bản đồ hành chính hoặc pháp lý về chủ quyền.

## Quản trị

Admin hiện quản lý Người dùng, toàn bộ Lịch trình và Điểm đến. Bookmark cũ `#map-source`/`#quality` chuyển sang `/admin#users`. Xem [hướng dẫn admin](ADMIN.md).

Ảnh VNSDI và admin cũ chỉ là lịch sử kiểm tra. Ứng dụng hiện không còn request VNSDI hoặc tài nguyên Leaflet.
