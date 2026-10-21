# Xem đúng dữ liệu TravelMate trong MongoDB Compass

Compass là ứng dụng quản lý MongoDB. Website ghi vào máy chủ MongoDB được chỉ định trong biến `MONGO_URI`, không ghi vào một kho dữ liệu riêng của Compass.

| Website đang thao tác | Nơi lưu dữ liệu |
| --- | --- |
| `http://localhost:3000` với `.env` hiện tại | MongoDB trên máy: `127.0.0.1:27017`, database `travelmate` |
| `https://travelmate-tj0k.onrender.com` | MongoDB Atlas: Project 0 → cluster `travelmate` → database `travelmate` |

Hai database này độc lập. Thao tác trên website online không tự xuất hiện trong kết nối localhost của Compass.

## Kết nối Compass với Atlas

1. Mở MongoDB Atlas, chọn Project 0 và cluster `travelmate`.
2. Chọn **Connect → Compass**, lấy URI do Atlas cung cấp.
3. Trong Compass, tạo kết nối riêng tên **TravelMate – Atlas**, nhập URI tại đây. Dùng database user đã cấp quyền; đây không phải tài khoản admin đăng nhập website. Không đưa mật khẩu/URI có thông tin xác thực vào chat, Git hoặc ảnh báo cáo.
4. Nếu không kết nối được, kiểm tra Atlas Network Access đã cho phép IP hiện tại của máy. Thêm đúng IP cần thiết, không mở toàn bộ Internet để xử lý nhanh.
5. Mở database `travelmate`, chọn collection phù hợp, xóa bộ lọc cũ và bấm Refresh sau thao tác trên website.

## Hành động nào làm thay đổi collection nào?

| Hành động | Collection / trường cần xem |
| --- | --- |
| Đăng ký tài khoản | `users` có bản ghi mới |
| Đăng nhập | `users.lastLoginAt` được cập nhật và phiên nằm trong `sessions`; không tạo tài khoản mới |
| Lưu / bỏ yêu thích | `favorites` |
| Tạo và bấm lưu lịch trình | `itineraries`; nội dung mới gõ trong bản nháp chưa tự lưu MongoDB |
| Admin thêm / sửa / ẩn địa điểm | `destinations`; ẩn đặt `isActive: false` |
| Tạo, sửa, chia sẻ lịch trình; sửa điểm đến; khóa tài khoản; phản hồi | `activities` ghi các sự kiện nghiệp vụ tương ứng |
| Gửi / xử lý góp ý | `feedbacks` |
| Mời và trao đổi nhóm | `tripinvitations`, `tripcomments`; thành viên và chi tiêu nằm trong `itineraries` |

Nhật ký `activities` hiện không ghi mọi lần xem trang, bấm nút, tìm kiếm hoặc mỗi nhịp gia hạn phiên. Đăng nhập được thể hiện qua `lastLoginAt` và `sessions`, không có một dòng `activities` cho mỗi lần đăng nhập. Nhật ký hoạt động tự hết hạn sau 90 ngày. Không chụp hoặc chia sẻ nội dung `sessions`, `passwordresets`, mật khẩu đã hash hay mã xác thực.

Để kiểm tra kết nối cục bộ mà không in thông tin xác thực: `npm run db:status`. Lệnh chỉ báo host, tên database và số bản ghi; không thay đổi dữ liệu.

Tài liệu chính thức: [Kết nối Compass với Atlas](https://learn.mongodb.com/courses/connecting-to-a-mongodb-database), [Atlas IP Access List](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
