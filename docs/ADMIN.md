# Quản trị TravelMate

Đăng nhập bằng tài khoản có `role=admin` để vào `/admin`. Khởi tạo admin bằng hướng dẫn trong README; không có tài khoản hoặc mật khẩu mặc định.

## Tổng quan

- Tổng tài khoản, lịch trình đã lưu, lịch trình sắp khởi hành, điểm đến đang hiển thị và tài khoản tạm khóa. Các thẻ số liệu mở danh sách tương ứng.
- Số lịch trình sắp đi, đang trong khoảng ngày đi, đã qua ngày kết thúc.
- Biểu đồ đăng ký/lịch trình mới trong 7 ngày theo múi giờ Việt Nam, tính từ `createdAt` thật.
- Thành viên mới, lịch trình mới và số lượt điểm đến được thêm vào các lịch trình.
- Chưa có dữ liệu thì hiện trạng thái trống và số 0. Không sinh người dùng hoặc lịch trình mẫu khi tải admin.

## Người dùng

Mục `/admin#users` thay cho Chất lượng dữ liệu.

1. Tìm theo họ tên/email, lọc vai trò và trạng thái; kết quả có phân trang.
2. Mở Hồ sơ để xem ngày tham gia, đăng nhập gần nhất, số lịch trình, số yêu thích và năm lịch trình cập nhật gần đây.
3. Bấm số lịch trình hoặc Xem tất cả trong hồ sơ để chuyển sang danh sách của đúng thành viên đó.
4. Tạm khóa tài khoản người dùng cần lý do và xác nhận. Hệ thống giữ nguyên lịch trình/yêu thích, chặn đăng nhập và mọi API cá nhân của tài khoản khóa.
5. Mở khóa cho phép đăng nhập lại. Các phiên trước lúc khóa vẫn mất hiệu lực, không được tự phục hồi.

Tài khoản admin được bảo vệ khỏi thao tác khóa, kể cả admin đang đăng nhập. Giao diện không cấp quyền admin hoặc đổi mật khẩu. `passwordHash` và `sessionVersion` không được gửi trong API admin, kể cả hồ sơ người tạo lồng trong lịch trình.

Tài khoản cũ chưa có `isActive` được coi là đang hoạt động. `lastLoginAt` chỉ được ghi nhận từ lần đăng ký/đăng nhập thành công sau cập nhật; không suy đoán lịch sử đăng nhập cũ.

## Toàn bộ lịch trình

Mục `/admin#itineraries` đọc lịch trình của **mọi tài khoản**, cùng người tạo. Một lịch trình vừa được người dùng lưu qua `/planner` sẽ có trong danh sách khi tải/làm mới.

- Tìm theo tên chuyến đi, tên hoặc email người tạo.
- Lọc theo tài khoản từ hồ sơ, trạng thái ngày đi và khoảng ngày khởi hành.
- Sắp xếp theo cập nhật mới, tạo mới hoặc ngày khởi hành; phân trang phía server.
- Xem người tạo, ngày, số người, số ngày/hoạt động, ngân sách và ước tính hiện có.
- Chi tiết gồm ghi chú chuyến đi/ngày/hoạt động, giờ thăm, địa điểm và chi phí tùy chỉnh. Ghi chú hiển thị dạng văn bản đã escape.
- Giá tùy chỉnh `0` là hợp lệ. Giá `null` được cảnh báo thiếu, không âm thầm tính thành miễn phí. Tổng dùng cùng hàm tính với trang người dùng.

Trạng thái chỉ phản ánh ngày theo Việt Nam: `startDate > hôm nay` là sắp đi; `startDate ≤ hôm nay ≤ endDate` là trong khoảng ngày đi; `endDate < hôm nay` là đã qua ngày kết thúc. Đây không phải trạng thái đặt chỗ hoặc xác nhận chuyến đi đã thực hiện.

Chi phí là ước tính hoạt động dựa trên giá địa điểm hiện có và giá tùy chỉnh của người tạo, chưa gồm lưu trú/ăn uống/di chuyển. Không phải giá đã thanh toán. Admin xem chi tiết để hỗ trợ; việc chỉnh sửa nội dung lịch trình vẫn ở trang cá nhân của chủ sở hữu.

## Điểm đến

Giữ quản lý điểm đến: tìm/lọc/phân trang, thêm, sửa, ẩn và khôi phục. Điểm đã ẩn vẫn tồn tại để lịch trình cũ đọc được. Không có xóa cứng điểm đến qua admin.

## Dữ liệu mới và quyền truy cập

- Nút Làm mới lấy lại dữ liệu trên màn hình hiện tại; chuyển mục cũng cập nhật thống kê. Không dùng số đếm hardcode hoặc giả lập push thời gian thực.
- Bộ lọc/phân trang được lưu trong hash URL để tải lại đúng trạng thái. Bookmark `#quality` và `#map-source` chuyển sang Người dùng.
- Mọi API admin đi qua `requireAuth` và `requireAdmin`. API cá nhân vẫn lọc bằng `userId`; việc có màn hình admin không mở quyền đọc chéo cho tài khoản thường.
- Các thao tác ghi tiếp tục yêu cầu CSRF và kiểm tra Origin. Khóa/mở khóa tăng phiên bản phiên ở server để thu hồi cookie cũ.

## API

| Endpoint | Chức năng |
| --- | --- |
| `GET /api/admin/stats` | Số liệu tổng quan, hoạt động 7 ngày, thành viên/lịch trình mới và điểm được lên kế hoạch |
| `GET /api/admin/users` | `q`, `role=user/admin`, `status=active/locked`, `page`, `limit` |
| `GET /api/admin/users/:id` | Hồ sơ, số lịch trình/yêu thích và năm lịch trình gần đây |
| `PATCH /api/admin/users/:id/status` | `{isActive:false,reason:"..."}` hoặc `{isActive:true}` |
| `GET /api/admin/itineraries` | `q`, `userId`, `status=upcoming/ongoing/completed`, `from`, `to`, `sort=updated/created/start`, `page`, `limit` |
| `GET /api/admin/itineraries/:id` | Người tạo, ngân sách, ngày, hoạt động và ghi chú |

Trang tối đa 100 bản ghi; mặc định 10. `from`/`to` lọc ngày khởi hành, không lọc ngày tạo bản ghi. Các API điểm đến giữ như README.
