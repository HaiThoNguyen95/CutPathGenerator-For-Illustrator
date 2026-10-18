# CutPathGenerator for Adobe Illustrator

CutPathGenerator là script JSX dành cho Adobe Illustrator, dùng để tạo đường cắt liên tục cho các bố cục dạng lưới hoặc các dãy hình tròn, oval. Mục đích chính là giảm số lần dao phải nhấc trong quá trình cắt và giúp đường chạy gọn hơn.

**Script:** [`CutPathGenerator.jsx`](./CutPathGenerator.jsx)

## Cách chạy

1. Mở file cần làm trong Illustrator và chọn artboard hoặc layer phù hợp.
2. Vào **File → Scripts → Other Script…** rồi chọn `CutPathGenerator.jsx`.
3. Chọn kiểu đường cắt, nhập thông số cần dùng và nhấn **Tạo path / Create paths**.

Script tạo path ngay trong tài liệu đang mở, căn giữa theo artboard hiện tại và sử dụng đơn vị đo của tài liệu. Path có thể vượt ra ngoài mép artboard. Việc kiểm tra kích thước chỉ dừng tạo path khi thiết kế vượt giới hạn canvas của Illustrator; script không tự tạo tài liệu mới.

## Hai kiểu đường cắt

| Kiểu | Khi nào nên dùng | Khoảng cách bằng 0 | Khoảng cách lớn hơn 0 |
|---|---|---|---|
| **Cắt thẳng** | Lưới ô vuông hoặc chữ nhật, chạy theo đường zíc-zắc | Các ô nối liền nhau theo đường zíc-zắc | Có khe giữa các ô nhưng đường chạy vẫn là một path liên tục |
| **Cắt tròn / oval** | Các dãy hình tròn hoặc ellipse | Các nửa cung lớn nối trực tiếp thành đường scallop | Có thêm nửa cung nhỏ để nối qua khe, sau đó đường chạy quay về bằng cung đối xứng |

Mục tiêu của cách nối này là hạn chế số điểm bắt đầu và kết thúc của đường cắt. Thời gian thực tế còn phụ thuộc vào máy cắt, phần mềm điều khiển và cách thiết lập đường dao.

## Thông số khi cắt thẳng

- **Chiều rộng / Chiều cao:** kích thước của từng ô. Đặt hai giá trị bằng nhau để tạo lưới vuông; đặt khác nhau để tạo lưới chữ nhật.
- **Số cột / Số hàng:** số ô theo chiều ngang và chiều dọc.
- **Khoảng cách:** khe giữa các ô. Nhập `0` để tạo zíc-zắc chuẩn; nhập giá trị lớn hơn `0` để chừa khe mà vẫn giữ đường chạy liên tục.
- **Lề:** phần lề ở đầu và cuối đường chạy.
- **Độ dày nét:** độ dày stroke của path được tạo.

## Thông số khi cắt tròn hoặc oval

- **Hình:** chọn Circle hoặc Ellipse. Với Circle, nhập đường kính; với Ellipse, nhập chiều rộng và chiều cao.
- **Hướng:** chọn cách xếp theo hàng ngang hoặc hàng dọc.
- **Số đường tròn:** số cung tròn hoặc ellipse lớn trong mỗi dãy.
- **Số dãy:** số path được xếp song song.
- **Khoảng cách cung:** khe dọc theo một dãy. Giá trị `0` nối các cung lớn trực tiếp; giá trị lớn hơn `0` sẽ tạo thêm nửa cung nhỏ để nối chúng.
- **Khoảng cách dãy:** khoảng hở tính từ mép dãy này đến mép dãy kế tiếp, không phải khoảng cách giữa hai tâm.
- **Độ dày nét:** độ dày stroke của path.

Ví dụ, nếu dùng hai dãy hình tròn đường kính 30 mm và đặt khoảng cách dãy là 3 mm, khoảng cách giữa hai tâm sẽ là 33 mm. Khe hở thực tế giữa mép hai dãy vẫn là 3 mm.

## Đơn vị và giá trị mặc định

Script lấy đơn vị theo thước trong tài liệu Illustrator, gồm mm, cm, in, pt, pica hoặc px. Các ô nhập số chấp nhận tối đa ba chữ số thập phân. Số cột, hàng, cung và dãy phải là số nguyên dương.

Giá trị mặc định khi mở giao diện:

- **Cắt thẳng:** ô 30 × 30, 6 cột × 6 hàng, khoảng cách 0, lề 2, độ dày nét 0,25.
- **Cắt tròn / oval:** đường kính 30, 10 đường tròn, 1 dãy, khoảng cách cung 0, khoảng cách dãy 2, độ dày nét 0,25.

Nếu tài liệu chưa có spot color tên `Cut Path`, script sẽ tạo màu spot CMYK với thông số `C0 M100 Y100 K0`.

## Lưu thiết lập

Giao diện mặc định dùng tiếng Việt ở lần chạy đầu tiên. Ngôn ngữ, kiểu cắt, hướng, hình dạng và các giá trị đã nhập được lưu trong file:

```text
<Folder.userData>/Custom_Path_Generator/preferences.txt
```

File này chỉ lưu tùy chọn của riêng script, không thay đổi thiết lập chung của Illustrator hay hệ thống. Xóa file `preferences.txt` nếu muốn đưa các tùy chọn về mặc định.

## Tương thích

Gói gồm file JSX, README, giấy phép MIT và `.gitattributes`. Có thể giải nén trên Windows hoặc macOS. Script được viết cho bản Adobe Illustrator desktop có hỗ trợ ExtendScript/JSX; khả năng hoạt động còn tùy phiên bản Illustrator và môi trường sử dụng.

Theo thử nghiệm của **Nguyễn Hải Thọ** trên máy cá nhân, script đáp ứng nhu cầu sử dụng cụ thể. Script chưa được kiểm tra trên nhiều cấu hình máy và phiên bản Illustrator khác nhau, vì vậy nên chạy thử trên hệ thống của bạn trước khi đưa vào sản xuất.

**Ý tưởng:** Nguyễn Hải Thọ  
**Triển khai phiên bản hiện tại:** Manus AI (Manus), dựa trên yêu cầu và góp ý của Nguyễn Hải Thọ.

Nếu muốn đề xuất cải tiến hoặc báo lỗi, bạn có thể mở Issue hoặc gửi Pull Request.

## Giới hạn và giấy phép

Trước khi tạo path, script ước tính bounds của thiết kế, bao gồm cả stroke, rồi kiểm tra với giới hạn toàn canvas của Illustrator. Việc kiểm tra này không giới hạn theo kích thước artboard đang hoạt động.

- Canvas tiêu chuẩn: tối đa khoảng 227 × 227 in.
- Large Canvas: tối đa khoảng 2270 × 2270 in.

Nếu thiết kế vượt giới hạn tương ứng, script sẽ báo kích thước cần thiết và dừng, không tạo path. Script không tự thu nhỏ thiết kế. Với bố cục có số lượng đối tượng lớn, Illustrator vẫn có thể chạy chậm. Trước khi gửi file đi cắt, hãy kiểm tra lại path, spot color và file xuất.

Phát hành theo giấy phép [MIT](./LICENSE). Hãy xác nhận quyền cấp phép của mã nguồn trước khi phân phối lại.
