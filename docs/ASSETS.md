# Nguồn ảnh và dữ liệu

**Danh mục hiện tại:** xem [CATALOGUE.md](CATALOGUE.md), `data/catalogue-media.json` và trang `/image-credits.html`. Bộ mới có 102 điểm đến, 101 ảnh Wikimedia Commons có giấy phép và ghi công; một điểm dùng hình chờ. Những thông tin bên dưới mô tả các ảnh nền/bộ dữ liệu ban đầu, được giữ để truy vết, không phải tình trạng đầy đủ của danh mục hiện tại.

Ảnh được lưu local trong `public/images/`, tải từ Unsplash theo [Unsplash License](https://unsplash.com/license), phục vụ đồ án học tập. Không dùng Unsplash API, không gỡ watermark từ một ảnh nguồn; ảnh tải từ URL ảnh gốc công khai.

| Tệp | Nguồn ảnh |
| --- | --- |
| halong.jpg | [Anmol Bindra – Ha Long Bay](https://unsplash.com/photos/a-group-of-boats-floating-on-top-of-a-large-body-of-water-QDc91G5Yc2w) · `photo-1675111066042-9baa4c343157` |
| hoian.jpg | [Steven Wilcox – Đèn lồng](https://unsplash.com/photos/mYNGbkIBIGM) · `photo-1569271532956-3fb81a207115` |
| ninhbinh.jpg | [Bernd Dittrich – Tràng An](https://unsplash.com/photos/Ucyo7A8M0o8) · `photo-1768245074845-9e4281c5dc37` |
| beach.jpg | [Jess Silaya – Mỹ Khê](https://unsplash.com/photos/qvAyg0KW8DI) · `photo-1723142282970-1fd415eec1ad` |
| banahills.jpg | [Cầu Vàng – Unsplash](https://images.unsplash.com/photo-1559592413-7cec4d0cae2b) |
| dalat.jpg | [Steve Le – Tuyền Lâm](https://unsplash.com/photos/767cBPD-9Cg) · `photo-1625846082756-6807d6131684` |
| city.jpg | [Celine Ly – Hà Nội](https://unsplash.com/photos/XpF47pwbVGo) · `photo-1758104372690-0e14bc4dec5c` |
| mountain.jpg | [Ảnh trên Unsplash](https://images.unsplash.com/photo-1570366583862-f91883984fde) |

Tên tệp chỉ là nhóm ảnh sử dụng trong mã nguồn. Ngoài ảnh Hạ Long và đèn lồng Hội An, ảnh có thể được tái sử dụng để minh họa vùng miền, không khẳng định là ảnh chụp chính xác từng điểm đến. SVG logo và placeholder được tạo riêng cho dự án.

Thông tin khái quát tham khảo [Vietnam Tourism](https://vietnam.travel/site-map). Mô tả seed là nội dung biên soạn cho đồ án, không phải trích chép bài viết. Chi phí là dữ liệu minh họa, không phải giá vé đã xác minh. Các tỉnh/thành phố dùng tên cấp tỉnh hiện hành, còn tên du lịch quen thuộc (Sa Pa, Đà Lạt, Hội An, Quy Nhơn, Phú Quốc) được giữ trong tên/tags.

Trong bộ ban đầu chỉ 3 địa điểm có tọa độ tham khảo đã đối chiếu:

- Hội An: [UNESCO](https://whc.unesco.org/en/list/948/), N15 52 60, E108 19 60 → 15.883333, 108.333333. Đây là điểm tham chiếu khu di sản, không phải cổng vào.
- Hồ Hoàn Kiếm: [Université Côte d’Azur – Humazur](https://humazur.univ-cotedazur.fr/s/humazur/item/10197?page=2), 21.028889, 105.8525.
- Đại Nội Huế: [Wondermondo](https://www.wondermondo.com/hue-imperial-city/), 16.4691, 107.5780.

Trong bản mới, các tọa độ tham chiếu có nguồn được bổ sung qua danh mục; nơi chưa có vẫn để null. Admin có thể rà soát và bổ sung trong form Điểm đến. Bản đồ dùng Google Maps nhúng; điểm thiếu tọa độ được tìm theo tên và tỉnh/thành, không tự gán tọa độ. Xem [nguồn bản đồ](MAP_SOURCE.md).
