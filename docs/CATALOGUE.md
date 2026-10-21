# Danh mục điểm đến và ảnh

Bản biên tập ngày 21/10/2026 mở rộng từ 32 lên **102 điểm đến tại 12 tỉnh/thành đang có trong ứng dụng**: Đà Nẵng 12, Hà Nội 10; An Giang, Cần Thơ, Gia Lai, Huế, Khánh Hòa, Lào Cai, Lâm Đồng, Ninh Bình, Quảng Ninh và TP. Hồ Chí Minh mỗi nơi 8 điểm. Đây là phạm vi bộ dữ liệu hiện tại, không phải danh sách đầy đủ mọi điểm du lịch Việt Nam.

- `data/catalogue-source.js`: nội dung biên tập riêng, loại trải nghiệm và thời lượng lập kế hoạch. Mỗi địa điểm có mô tả và lưu ý trải nghiệm riêng, không còn đoạn mô tả mẫu dùng chung.
- `data/catalogue-media.json`: trang nguồn, ảnh, tác giả và giấy phép đã đối chiếu. Nội dung giới thiệu tham khảo Wikipedia và các nguồn du lịch chính thức tại Việt Nam; đường dẫn cụ thể được gắn trong từng bản ghi.
- `public/images/destinations/`: 101 ảnh có giấy phép, lưu local. Một số là ảnh khu vực và được ghi rõ. Vườn cò Bằng Lăng dùng hình chờ vì chưa chọn được ảnh phù hợp có giấy phép. Không dùng ảnh một nơi khác để thay thế.
- `/image-credits.html`: tác giả, tệp gốc và giấy phép của bộ ảnh; nguồn ảnh hiện tại của bản ghi cũng hiển thị trực tiếp trong Chi tiết và được admin chỉnh sửa cùng URL ảnh.

`verifiedOn` là ngày đối chiếu phần giới thiệu, không phải chứng nhận toàn bộ giá vé/giờ mở cửa đang đúng. Các mức ước tính cũ vẫn được ghi rõ là minh họa cho hoạt động; địa điểm mới chưa xác minh chi phí để `null`, không biến thành miễn phí. Thời lượng là gợi ý lập kế hoạch. Tọa độ là điểm tham chiếu từ bài nguồn, không mặc định là cổng vào; nơi chưa có để trống.

## Khám phá và gợi ý

Trang Khám phá hiển thị số lượng điểm theo địa phương; hỗ trợ tìm không dấu, lọc trải nghiệm, chi phí chưa xác minh và phân trang. Google Maps giúp người dùng tìm thêm nơi ngoài danh mục, không tự nhập dữ liệu chưa biên tập vào TravelMate.

Gợi ý lịch trình chỉ xếp tối đa ba điểm/ngày, có xét ngân sách đã biết và thời lượng. Người dùng có thể **Đổi phương án**, xem các điểm khác chưa được chọn, mở toàn bộ danh mục địa phương hoặc chọn thủ công bằng bộ chọn có tìm kiếm/phân trang. Không giới hạn việc chọn vào 100 mục đầu. Gợi ý chưa tối ưu tuyến đường/giờ mở cửa, và không bảo đảm ngân sách nếu còn giá chưa biết; chi phí di chuyển không được tự tính qua API trả phí.

## Nhập dữ liệu an toàn

Với database mới, `npm run seed` chèn các slug chưa tồn tại. Với database đã có dữ liệu:

```bash
npm run catalogue:sync
npm run catalogue:sync -- --apply
```

Lệnh đầu chỉ xem trước. Lệnh áp dụng tạo bản sao lưu trong `.data/`, chèn slug mới và nâng cấp các trường còn trống/khớp dữ liệu mẫu cũ. Giữ ObjectId, dữ liệu tham chiếu, chi phí, trạng thái và nội dung admin đã sửa. Bản ghi vừa thay đổi trong lúc chạy bị bỏ chặn bởi điều kiện `updatedAt`; cần xem trước lại. Chạy lại không tạo trùng. Không xóa hoặc tạo lại các collection, không chạy tự động mỗi lần deploy.

Database đích theo `MONGO_URI` của môi trường chạy lệnh. Local và Atlas phải được cập nhật riêng. Không đưa URI chứa mật khẩu vào Git, chat hoặc tham số công khai. Xem [cách kiểm tra MongoDB/Compass](DATABASE.md).

Khi biên tập lại ảnh: kiểm tra đúng địa điểm, trang tác giả và giấy phép trước; cập nhật các lựa chọn trong `catalogue-photo-overrides.json` khi cần. Các script nghiên cứu chỉ phục vụ biên tập, không chạy theo request của người dùng:

```bash
node scripts/researchCatalogue.js
node scripts/downloadCatalogueImages.js
node scripts/buildImageCredits.js
npm run check
npm test
```

Rà lại dữ liệu, ngày kiểm tra và ảnh thực tế trước khi đồng bộ. Ảnh ghi công theo giấy phép từng tệp Wikimedia Commons; các ảnh nền ban đầu theo Unsplash License. Không có API ảnh hay dịch vụ định tuyến trả phí.
