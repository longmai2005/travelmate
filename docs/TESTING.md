# Báo cáo kiểm thử TravelMate

Thực hiện ngày **17/10/2026**, môi trường macOS, Node.js **24.19.0**, MongoDB local tại `127.0.0.1:27017`, trình duyệt tích hợp Codex.

## Kết quả đã thực hiện

| Hạng mục | Kết quả và bằng chứng |
| --- | --- |
| Cú pháp JavaScript | Chạy `node --check` trên server, config, models, middleware, routes, utils, scripts, public/js, tests; không có lỗi |
| Backend + MongoDB thật | `npm test`: **33 passed, 0 failed, 0 skipped** (bao gồm test cha chứa các ca integration); lần chạy cuối khoảng 5,1 giây |
| Dữ liệu | Seed 32 điểm đến; chạy lại vẫn 32 sau khi dọn dữ liệu QA; không ghi đè nội dung đã sửa |
| HTTP | Bản Express cuối trả HTTP 200 tại `/`; các trang và assets Leaflet/Lucide trả 200 trong integration test |
| Dev server | `npm run dev` chạy Nodemon, theo dõi đúng các thư mục backend, đã quan sát tự restart sau thay đổi file; frontend dùng refresh |
| npm audit runtime | `npm audit --omit=dev --json`: 0 lỗ hổng được báo tại thời điểm kiểm tra |
| Secret | `.env` được `git check-ignore` xác nhận bỏ qua; không có secret trong public |
| Trang chủ | Hiển thị sáu điểm MongoDB, ảnh local; select trải nghiệm có đủ tám lựa chọn; tìm Biển & đảo + dưới 200.000đ chuyển Explore và trả Mỹ Khê, An Bàng |
| Đăng ký | Tạo tài khoản tạm trong dialog, đóng dialog sau thành công, navbar đổi tên; sau refresh vẫn đăng nhập |
| Yêu thích | Lưu Hội An từ trang chủ, chuyển Favorites thấy đúng một mục và trạng thái trái tim đã lưu |
| Planner | Tạo 10–12/11/2026, hai người, ngân sách 1.000.000đ; thêm Hội An 09:00, ghi chú; tổng 300.000đ, còn 700.000đ, dùng 30% |
| Chuyển ngày và lưu | Chuyển Hội An từ ngày 1 sang ngày 2 bằng form; bấm Lưu; refresh và mở lại vẫn giữ ngày, giờ, ghi chú và chi phí |
| Bản đồ | Tìm Hội An, bật Bản đồ, có 1 marker và tiles tải được; bấm marker mở popup, từ popup mở chi tiết và mini-map; attribution hiển thị |
| Admin UI | Khởi tạo admin tạm bằng seedAdmin; mở bảng/thống kê, tạo điểm tạm, sửa giá 125.000 → 175.000, ẩn, khôi phục; bảng và toast phản ánh kết quả |
| Console | Truy vấn console error/warn của trang chủ sau kiểm tra cuối trả danh sách rỗng |
| Responsive | Trang chủ không có tràn ngang ở 375, 768, 1024, 1440px; planner và Explore + map xem được tại 375px; menu hamburger mở được |

Các lỗi phát hiện và đã sửa: thẻ option chưa hợp lệ trong search trang chủ; callback Express truyền `next` vào tham số admin của listing; token Unicode có thể làm sai độ dài byte; deprecated option Mongoose. Sau sửa đã chạy lại test và kiểm tra tìm kiếm trang chủ trong trình duyệt.

## Phạm vi của test tự động

- Bốn trang và tài nguyên; admin HTML không public.
- Đăng ký email sai, xác nhận mật khẩu sai, email trùng; hash; không cho tự đăng ký admin.
- Cookie HttpOnly/SameSite, regenerate session/token, phiên qua request mới, login sai, logout.
- CSRF bắt buộc và token sai; JSON sai kiểu; giới hạn login trả 429.
- Tìm kiếm, mức chi phí, null không phải miễn phí, phân trang, ObjectId sai.
- Favorites persist, unique index và cách ly tài khoản.
- Tạo/đọc/sửa/xóa itinerary; ngày sai/quá 7 ngày; chống trùng cùng ngày; cùng điểm ở hai ngày hợp lệ; override giá, giá 0 và giá thiếu.
- Tài khoản khác không đọc, sửa hoặc xóa itinerary.
- Đổi ngày mất hoạt động cần xác nhận phía backend.
- Script seedAdmin chạy thành công trong database test; admin login và các API quản trị.
- Tạo/sửa/ẩn/khôi phục; public ẩn điểm inactive; lịch trình lịch sử vẫn populate được.
- MongoDB ngắt kết nối trả 503 rõ ràng.

Mỗi lần chạy integration dùng database `travelmate_test_<pid>_<random>` mới, tự xóa sau khi hoàn tất. Dữ liệu UI tạm (tài khoản, favorites, itinerary, điểm đến QA) đã được dọn đúng theo định danh riêng; 32 điểm mẫu được giữ lại. Không tạo mật khẩu admin mặc định trong mã nguồn.

## Bằng chứng responsive

| Viewport trang chủ | Chiều rộng nội dung | Tràn ngang |
| --- | --- | --- |
| 375 | 360 | Không |
| 768 | 753 | Không |
| 1024 | 1009 | Không |
| 1440 | 1425 | Không |

Chênh lệch 15px là thanh cuộn. Số đo lấy trực tiếp từ DOM, lưu trong `responsive.json`. Ảnh chụp: `home-full.jpg`, `home-mobile.jpg`, `home-preview.jpg`, `explore-desktop.jpg`, `explore-mobile.jpg`, `planner-mobile.jpg`, `admin-desktop.jpg`. Ảnh admin được chụp trong lúc dữ liệu QA còn tồn tại nên số đếm có thể khác database sau dọn.

## Giới hạn xác minh

- Chưa chạy trên Windows, các trình duyệt độc lập hoặc thiết bị vật lý; responsive được kiểm tra bằng viewport override.
- Chưa mở trực tiếp ứng dụng MongoDB Compass. Kết nối, đọc/ghi, indexes và persistence đã được kiểm tra qua Mongoose/MongoDB thật; README có hướng dẫn kết nối Compass.
- Không kiểm thử toàn bộ tổ hợp giao diện, mọi phím với screen reader hoặc mọi lỗi mạng. Hành vi fallback ảnh và lỗi tiles được triển khai; chưa cưỡng bức mọi tình huống mạng trong browser.
- Chưa kiểm tra HTTPS production; đồ án được thiết kế để chạy local theo yêu cầu.
- `npm audit` đầy đủ còn 3 cảnh báo dev qua Nodemon/chokidar/braces; advisory hiện chưa có bản vá. Runtime audit không báo lỗi. Chi tiết và cách chạy `npm start` nằm trong README.

## Cách tái hiện nhanh

1. Bật MongoDB Server, cấu hình `.env` theo README.
2. `npm ci`, `npm run seed`, `npm test`.
3. `npm run dev`, mở `http://localhost:3000`.
4. Thực hiện `docs/DEMO.md` với tài khoản riêng.

## Đợt cập nhật: tách admin và thay nguồn bản đồ (17/10/2026)

- `npm test`: **33/33 pass**, 0 fail, 0 skipped, MongoDB thật trong database test riêng; lần chạy sau thay đổi khoảng 5,5 giây.
- Đăng nhập admin bằng tài khoản QA tạm qua dialog chung, tự chuyển tới `/admin` và thấy dashboard riêng. Không có `#site-header`/navbar của trang user trong HTML quản trị.
- Kiểm tra Tổng quan, số liệu MongoDB, biểu đồ tỷ lệ thực, chuyển tới danh sách, thêm điểm tạm, sửa giá 125.000 → 175.000, ẩn, mở màn Điểm đến đã ẩn rồi khôi phục. Sau khôi phục danh sách đã ẩn trống đúng.
- Map Explore tải các tiles Sentinel-2 từ VNSDI thật trong trình duyệt, marker Hội An hiển thị, có attribution và liên kết đối chiếu. Xem `MAP_SOURCE.md` về giới hạn ảnh vệ tinh và dịch vụ hành chính cần token.
- Ảnh mới: `admin-overview-new.jpg`, `admin-overview-mobile-new.jpg`, `map-vnsdi-desktop.jpg`. Số đếm tài khoản trong ảnh có bao gồm tài khoản QA tạm.
- Ở viewport 375px, menu admin mở và chuyển trang được. Dashboard không tràn ngang tại 375, 768, 1024 và 1440px; số đo lưu trong `admin-responsive.json`. Sidebar đóng được đặt inert để không nhận focus ngoài màn hình.
- Console error/warn ở cuối lượt kiểm tra trả danh sách rỗng. Đăng xuất admin quay về trang chủ và hiện lại nút Đăng nhập.
- Đã dọn đúng tài khoản admin QA và điểm đến tạm vừa tạo. Database còn 32 điểm đến và 1 tài khoản có sẵn của người dùng; không thay đổi tài khoản đó.

Ảnh bản đồ OSM/admin cũ phía trên chỉ là bằng chứng của bản trước, không đại diện nguồn bản đồ hoặc giao diện hiện tại.


## Cập nhật Google Maps và Chất lượng dữ liệu (17/10/2026)

Đây là kết quả của đợt Google Maps; mục Chất lượng dữ liệu đã được thay trong đợt hoàn thiện admin bên dưới.

- `npm test`: **34/34 pass**, 0 fail, 0 skipped, khoảng 8,4 giây. Test tích hợp dùng MongoDB thật trong database thử riêng và tự dọn.
- API chất lượng dữ liệu chặn anonymous/user thường, lọc tọa độ/chi phí, phân trang, tính cả điểm đã ẩn, đếm đúng điểm thiếu cả hai. Giá 0 ₫ được coi là có dữ liệu; bổ sung thông tin làm số đếm và danh sách thay đổi.
- Trình duyệt tải Google Maps thật, chọn từ Vịnh Hạ Long (tìm theo tên) sang Hồ Hoàn Kiếm (tọa độ); có Google attribution và liên kết Mở Google Maps/Chỉ đường. Bản nhúng không dùng API key; không kiểm thử API trả phí.
- Admin lọc thiếu chi phí, sửa bản ghi QA từ null sang 0; bản ghi rời danh sách thiếu giá sau lưu. Phân trang và liên kết cũ `#map-source` chuyển đúng tới `#quality`.
- Màn admin không tràn ngang tại 375, 768, 1024 và 1440px; số đo trong `quality-responsive.json`. Google Maps không tràn ngang ở 375px.
- Console error/warn cuối lượt kiểm tra admin trả danh sách rỗng.
- Ảnh: `admin-quality-desktop.jpg`, `admin-quality-mobile.jpg`, `map-google-desktop.jpg`, `map-google-mobile.jpg`. Số đếm trong ảnh gồm bản ghi QA tạm của lượt kiểm tra.
- Chi tiết Sa Pa chưa có tọa độ vẫn tải Google Maps theo tên, kèm thông báo đúng. Đóng dialog và tìm từ khóa không có kết quả: iframe cũ ẩn, thuộc tính src bị gỡ, không còn hiển thị vị trí trước đó; console trả danh sách rỗng.
- Đã đăng xuất và dọn đúng tài khoản/điểm đến QA. Database còn 32 điểm đến và 1 tài khoản có sẵn của người dùng.


## Hoàn thiện admin: Người dùng và toàn bộ lịch trình (17/10/2026)

- **39/39 test đạt**, 0 fail, 0 skipped; lần chạy khoảng 7 giây. MongoDB thật trong database test riêng được tự dọn.
- Kiểm tra allowlist hồ sơ/người tạo không lộ passwordHash hoặc sessionVersion; anonymous/user thường bị chặn ở API admin, API cá nhân vẫn cách ly chủ sở hữu.
- Tìm/lọc/phân trang người dùng; hồ sơ có số lịch trình/yêu thích và đăng nhập gần nhất. Trạng thái admin được bảo vệ.
- Admin đọc toàn bộ lịch trình, lọc tên/email/người tạo/ngày/trạng thái, đọc ghi chú ngày/hoạt động; ngân sách khớp API cá nhân và chấp nhận override 0.
- Khóa có lý do chặn đăng nhập và API cá nhân; mở khóa bảo toàn lịch trình nhưng phiên cũ vẫn mất hiệu lực. Kiểm tra sessionVersion và phải đăng nhập mới.
- Ngày/trạng thái admin dùng giờ Việt Nam, kiểm thử biên 17:00 UTC, sang năm, ngày đầu và ngày cuối chuyến đi. Kết hợp bộ lọc ngày không ghi đè điều kiện trạng thái.
- UI: Hồ sơ Minh Anh QA → lọc 2 lịch trình → chi tiết 2 ngày; hiển thị thiếu giá, vượt ngân sách, ghi chú và giờ. Chuỗi chứa thẻ b được hiển thị dưới dạng văn bản, không sinh phần tử HTML.
- UI: tạm khóa/mở khóa thành viên QA, thử đổi bộ lọc ngay sau thao tác. Đã sửa số đếm cache cũ khi request giao nhau; bảng và số đếm cập nhật đúng.
- UI xuyên suốt: đăng nhập thành viên, tạo và lưu lịch trình mới từ Planner, đăng xuất rồi đăng nhập admin. Lịch trình vừa tạo xuất hiện trong mục toàn bộ lịch trình với đúng người tạo, ngày và ngân sách.
- Tổng quan/Người dùng/Lịch trình không tràn ngang ở 375/768/1024/1440px. Số đo trong `admin-complete-responsive.json`; bảng cuộn trong khung trên màn hẹp. Dialog lịch trình 375px cũng không tràn ngang.
- Đã sửa một tên icon Lucide không tồn tại; console error/warn lượt kiểm tra cuối trả danh sách rỗng.
- Ảnh: `admin-complete-overview.jpg`, `admin-users.jpg`, `admin-all-itineraries.jpg`, `admin-itinerary-detail.jpg` và ảnh mobile tương ứng. Ảnh dùng tài khoản/lịch trình QA tạm; số đếm thay đổi sau khi dọn.
- Đã kiểm tra menu di động mở/chuyển mục/đóng đúng. Đã đăng xuất và dọn 3 tài khoản, 4 lịch trình, 1 yêu thích QA; số lượng còn lại khớp trước kiểm tra: 1 tài khoản có sẵn, 0 lịch trình, 32 điểm đến. Không thay đổi dữ liệu của tài khoản có sẵn.

## Kiểm thử nâng cấp cộng tác (18/10/2026)

`npm test` bao gồm database riêng ngẫu nhiên cho từng suite, không sử dụng database production. Mở rộng với:

- Cộng tác: mời đúng email/hash token, hạn dùng một lần, editor/viewer, thu hồi ngay, người ngoài không truy cập, phiên bản chống lưu đè.
- Chi tiêu: số dư bằng không, chia lẻ VND, người trả không tham gia chia, hoàn trả và tham chiếu thành viên hợp lệ; public share không lộ sổ chi.
- Phản hồi: cách ly tài khoản, admin trả lời có lịch sử, đếm cần xử lý, phiên bản cập nhật.
- Thời tiết: ngày VN, giới hạn 16 ngày, lỗi dịch vụ, cache, địa danh trùng tên khác tỉnh không được chọn. API ngoài được mô phỏng trong CI, không phụ thuộc mạng.
- Tài khoản: đổi mật khẩu thu hồi phiên khác, reset token hash/15 phút/một lần, thông báo khôi phục chung và chưa cấu hình email.
- Idle: backdate session trong database thử để kiểm tra chính xác mốc 5/10 phút, đọc/poll không kéo dài, tương tác gia hạn; mô phỏng client kiểm tra tab/đăng xuất/clear dữ liệu. Không cần chờ 10 phút trong CI.
- Service worker: không intercept API, admin, lời mời, link chia sẻ, reset hoặc request ghi.

QA giao diện dùng server riêng cổng 3002 và database dữ liệu giả. Đã kiểm tra thêm khoản chi/lưu số dư, bình luận, quyền chỉ xem, gửi phản hồi/admin trả lời, đọc ngoại tuyến sau khi tắt server rồi tải lại. Kiểm tra bố cục phản hồi một cột ở viewport 390px. Email thực chỉ được xác minh sau khi người dùng cấu hình Brevo và tự thử bằng địa chỉ của họ.
