# CutPathGenerator for Adobe Illustrator

Script JSX tạo đường cắt liên tục trong Adobe Illustrator, giúp giảm số lần dao nhấc và tối ưu đường chạy cho công việc cắt.

**Tệp chạy:** [`CutPathGenerator.jsx`](./CutPathGenerator.jsx)

## Dùng nhanh

1. Mở tài liệu Illustrator và chọn đúng artboard/layer.
2. Chạy script qua **File → Scripts → Other Script…**.
3. Chọn kiểu cắt, nhập kích thước và khoảng cách, rồi nhấn **Tạo path / Create paths**.

Script tạo đối tượng trên tài liệu đang mở, căn giữa theo artboard hiện hành và dùng đơn vị của tài liệu. Path có thể vượt mép artboard; bước kiểm tra chỉ chặn khi vượt sức chứa toàn canvas của Illustrator. Script không tạo tài liệu mới.

## Chọn kiểu đường cắt

| Kiểu | Dùng cho | Khi khoảng cách = 0 | Khi khoảng cách > 0 |
|---|---|---|---|
| **Cắt thẳng** | Đường chạy zíc-zắc theo lưới ô vuông hoặc chữ nhật. Tạo một path liên tục. | Tạo zíc-zắc chuẩn, không chừa khe giữa các ô. | Chừa khe giữa các ô nhưng vẫn nối đường chạy thành một path liên tục. |
| **Cắt tròn / oval** | Các hình tròn hoặc ellipse nối tiếp. Mỗi dãy là một contour liên tục; một dãy tạo một path. | Các nửa cung lớn nối trực tiếp thành đường scallop. | Thêm nửa cung nhỏ tại khe để nối các cung lớn, rồi quay về bằng cung đối xứng. |

Đường chạy liên tục được thiết kế để hạn chế điểm bắt đầu/kết thúc và tối ưu thời gian cắt. Thời gian thực tế còn tùy máy cắt, phần mềm điều khiển và cách thiết lập đường dao.

## Các ô nhập

### Cắt thẳng

- **Chiều rộng / Chiều cao:** kích thước ô; đặt bằng nhau để tạo lưới vuông, khác nhau để tạo lưới chữ nhật.
- **Số cột / Số hàng:** số ô theo chiều ngang/dọc.
- **Khoảng cách:** khoảng hở giữa các ô; bằng 0 tạo zíc-zắc chuẩn, lớn hơn 0 tạo đường liên tục có khe.
- **Lề:** lề đầu/cuối đường chạy.
- **Độ dày nét:** stroke của path.

### Cắt tròn / oval

- **Hình:** chọn Circle hoặc Ellipse. Circle dùng một đường kính; Ellipse nhập chiều ngang và chiều cao.
- **Hướng:** xếp theo hàng ngang hoặc dọc.
- **Số đường tròn:** số cung tròn/ellipse lớn trong mỗi dãy.
- **Số dãy:** số path được xếp song song.
- **Khoảng cách cung:** khoảng hở dọc theo dãy; bằng 0 nối trực tiếp, lớn hơn 0 thêm nửa cung nối nhỏ.
- **Khoảng cách dãy:** khoảng hở mép-đến-mép giữa hai dãy, không phải khoảng cách giữa hai tâm.
- **Độ dày nét:** stroke của path.

Ví dụ: hai dãy Circle đường kính 30 mm với khe giữa dãy 3 mm có bước tâm là 33 mm, vì vậy khe hở thực giữa biên hai dãy vẫn là 3 mm.

## Đơn vị và mặc định

Script theo đơn vị thước trong tài liệu (mm, cm, in, pt, pica hoặc px). Ô số hỗ trợ tối đa ba chữ số thập phân; số lượng cung, dãy, hàng và cột phải là số nguyên dương.

Mặc định ban đầu:

- **Cắt thẳng:** ô 30 × 30, 6 cột × 6 hàng, khoảng cách 0, lề 2, nét 0,25.
- **Cắt tròn / oval:** đường kính 30, 10 đường tròn, 1 dãy, khoảng cách cung 0, khoảng cách dãy 2, nét 0,25.

Nếu chưa có spot color `Cut Path`, script tạo spot CMYK `C0 M100 Y100 K0`.

## Lưu tùy chọn

Lần đầu chạy, giao diện mặc định là tiếng Việt. Ngôn ngữ đã chọn, kiểu cắt, hướng, hình dạng và các giá trị nhập được lưu trong:

```text
<Folder.userData>/Custom_Path_Generator/preferences.txt
```

Tệp cấu hình chỉ dành riêng cho script, không thay đổi thiết lập hệ thống hoặc tùy chọn chung của Illustrator. Xóa tệp này để trở về mặc định.

## Nền tảng và đóng góp

Gói gồm JSX, README, MIT License và `.gitattributes`; có thể giải nén trên Windows hoặc macOS. Script hướng tới Adobe Illustrator desktop có hỗ trợ ExtendScript/JSX. Khả năng tương thích còn tùy phiên bản Illustrator và môi trường; không thể đảm bảo mọi phần cứng hay mọi hệ điều hành.

Theo thử nghiệm của **Nguyễn Hải Thọ** trên máy cá nhân, script hoạt động tốt với nhu cầu sử dụng cụ thể. Script chưa được kiểm tra trên phần lớn cấu hình phần cứng/phiên bản khác. Hãy chạy thử trên thiết lập của bạn trước khi dùng cho sản xuất.

**Ý tưởng:** Nguyễn Hải Thọ. **Triển khai phiên bản này:** Manus AI (Manus), theo yêu cầu và góp ý của Nguyễn Hải Thọ. Các điều chỉnh tiếp theo được mở cho cộng đồng qua Issues và Pull Requests.

## Lưu ý và giấy phép

Trước khi tạo, script ước tính bounds của thiết kế gồm cả stroke và so với sức chứa toàn canvas Illustrator, không giới hạn theo kích thước artboard đang hoạt động. Canvas tiêu chuẩn tối đa khoảng 227 × 227 in; tài liệu Large Canvas tối đa khoảng 2270 × 2270 in. Nếu thiết kế vượt giới hạn tương ứng, script báo kích thước cần có và dừng mà không tạo path. Script không tự thu nhỏ thiết kế. Số lượng rất lớn vẫn có thể làm Illustrator chậm. Hãy kiểm tra path, spot color và file xuất trước khi gửi máy cắt.

Phát hành theo giấy phép [MIT](./LICENSE). Xác nhận quyền cấp phép cho mã nguồn trước khi phân phối lại.
