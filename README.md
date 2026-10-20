# Một chút dễ thương · Thiệp 20/10

Thiệp tương tác dành cho bạn bè, hội chị em và đồng nghiệp nữ. HTML, CSS và JavaScript thuần; chạy trên GitHub Pages, không cần backend, không cần build.

## Mở website

- Thiệp: https://vietchuu.github.io/thiep-20-10/
- Tạo link cá nhân hoá và poster QR: https://vietchuu.github.io/thiep-20-10/qr.html
- Dashboard: https://vietchuu.github.io/thiep-20-10/dashboard.html

## Cá nhân hoá

Sửa `src/config.js`:

- `recipient`, `sender`: tên mặc định.
- `letter`: các đoạn lời chúc; `copy`: nội dung giao diện chính.
- `friendshipStart`: ngày quen nhau, định dạng ISO kèm múi giờ `+07:00`. Đổi `friendshipDateIsExample` thành `false` khi đã điền ngày thật.
- `avatars.recipient`, `avatars.sender`: đường dẫn ảnh đại diện, hoặc để trống để dùng hình mặc định.
- `photos`: danh sách ảnh ngang/dọc, có thể thêm 15–30 ảnh; masonry giữ nguyên tỷ lệ ảnh. Thay 6 tranh minh hoạ hiện tại bằng ảnh thật và đặt `photosAreExamples: false`.
- `scratch.image`, `scratch.message`: ảnh và lời nhắn sau lớp nhũ.
- `wishes`: 10 lời chúc trong lọ sao.
- `prizes`: 6 phần quà trên vòng quay. Tên quà được dùng chung cho vòng quay, hoá đơn và tracking.
- `customMusicUrl`: tuỳ chọn file nhạc riêng. Bỏ trống để dùng nhạc hộp nhạc tổng hợp bằng Web Audio.
- `trackingTopic`: tên kênh ntfy riêng. Đặt `trackingEnabled: false` nếu chỉ muốn lưu trên trình duyệt.

Ví dụ ảnh:

```js
photos: [
  { src: "assets/anh-di-choi.jpg", alt: "Một buổi đi chơi cùng nhau" },
  { src: "assets/anh-ca-phe.webp", alt: "Cà phê cuối tuần" },
];
```

Link riêng cho mỗi người:

```text
https://vietchuu.github.io/thiep-20-10/?to=H%C3%A0&from=Vi%E1%BB%87t&msg=Ch%C3%BAc%20c%E1%BA%ADu%20vui!
```

Trang `qr.html` tạo link này tự động, hiển thị poster, tải PNG 1000×1400 và hỗ trợ in. QR được tạo cục bộ bằng thư viện vendored, không gửi nội dung link đến dịch vụ tạo QR ngoài. Lời nhắn quá dài sẽ có thông báo để giữ QR dễ quét.

## Có gì trong thiệp?

1. Cánh hoa Canvas, sparkle khi chạm, nhạc nền tự tổng hợp và nút bật/tắt.
2. Phong bì 3D, dấu sáp, ruột thư trượt lên.
3. Lời chúc gõ chữ, chạm để đọc ngay và mưa emoji.
4. Bộ đếm ngày, giờ, phút, giây tình bạn.
5. Máy ảnh Instax, âm thanh màn trập/mô-tơ, ảnh hiện dần, cuộn phim, masonry và lightbox hỗ trợ vuốt/phím mũi tên.
6. Nút từ chối chạy trốn trong khung; nút đồng ý lớn dần.
7. Thẻ cào Canvas tự mở khi diện tích đã cào đạt 45%; có nút mở bằng bàn phím và cào lại.
8. Lọ 10 lời chúc mở theo thứ tự, nhớ tiến độ trên thiết bị.
9. Vòng quay 6 ô, in bill đúng phần quà và đóng dấu đỏ. Mỗi lượt quay có mã bill riêng.
10. Dashboard ntfy SSE, lịch sử, thống kê, bảng quà, bảng lời chúc, xuất JSON và reset dữ liệu test.

Hỗ trợ bàn phím, điều khiển cảm ứng và `prefers-reduced-motion`. Nhạc bắt đầu sau thao tác mở phong bì để phù hợp chính sách tự phát âm thanh của trình duyệt.

## Tracking và giới hạn của trang tĩnh

Người nhận có ô **đồng ý chia sẻ** trước khi mở thiệp và ở cuối trang. Mặc định không gửi dữ liệu ra ngoài; dữ liệu tương tác vẫn được lưu cục bộ. Khi đồng ý, các tương tác tiếp theo gửi tên, loại thiết bị, thời gian và chi tiết trò chơi đến `https://ntfy.sh/<trackingTopic>` bằng POST `text/plain`.

Dashboard tải lịch sử bằng `/json?poll=1&since=all` và nhận trực tiếp bằng `/sse?since=all`. ID sự kiện dùng để loại bỏ trùng. Có hàng đợi thử gửi lại khi mạng hoạt động, khi tải lại trang hoặc khi có tương tác mới. Dữ liệu được giới hạn 2.000 sự kiện cục bộ và 500 sự kiện chờ gửi.

**Dashboard không có xác thực.** Không có link dashboard trên thiệp, nhưng URL ẩn không phải cơ chế bảo mật. Tên kênh nằm trong mã nguồn công khai; ai biết tên kênh đều có thể đọc/gửi sự kiện. Không dùng cho dữ liệu nhạy cảm hoặc số liệu cần chống giả mạo. Muốn dashboard riêng tư thực sự phải bổ sung backend và xác thực.

ntfy chỉ lưu lịch sử trong thời gian theo cấu hình dịch vụ, không phải cơ sở dữ liệu lâu dài. Dùng nút xuất JSON để giữ bản sao. `localStorage` chỉ dùng chung giữa các trang thuộc cùng origin trên cùng trình duyệt; không đồng bộ các thiết bị.

Nút **Xoá lịch sử Test** gửi `reset_log`, ẩn các sự kiện có thời gian nhỏ hơn hoặc bằng mốc reset. Nó không xoá vật lý các bản tin khỏi ntfy và không đặt lại số ngôi sao đã mở trên thiết bị người nhận. Đồng hồ các thiết bị cần tương đối chính xác để sắp xếp sự kiện.

## Chạy và kiểm tra cục bộ

Cần Node.js nếu muốn dùng máy chủ xem thử đi kèm:

```bash
node scripts/serve.js
```

Mở `http://127.0.0.1:4173/`. Không mở trực tiếp bằng `file://` vì trình duyệt chặn ES modules.

```bash
node --test tests/*.test.js
```

Các bài test kiểm tra cá nhân hoá tiếng Việt, ngày không hợp lệ, vòng quay dừng đúng phần quà sau nhiều lượt, lọc/reset sự kiện, xử lý bản tin ntfy và URL ảnh an toàn.

## Cập nhật GitHub Pages

Repo dùng nhánh `main`, thư mục `/` làm nguồn Pages. Sau khi sửa:

```bash
git add .
git commit -m "Update greeting card"
git push
```

GitHub Pages tự triển khai bản mới. `.nojekyll` giữ nguyên tài nguyên tĩnh. Không lưu token, mật khẩu hoặc ảnh riêng tư trong repo công khai.

## Tài nguyên

- Sáu tranh SVG đi kèm là minh hoạ, không phải ảnh thật của người nhận.
- QR Code Generator 1.4.4 của Kazuhiko Arase, MIT, lưu trong `src/vendor/`. SHA-256 của `qrcode.js`: `18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780`.
- Phông Be Vietnam Pro và Playfair Display tải từ Google Fonts; có phông dự phòng khi không kết nối mạng.
- API: [GitHub Pages](https://docs.github.com/en/rest/pages/pages), [ntfy subscribe](https://docs.ntfy.sh/subscribe/api/), [ntfy publish](https://docs.ntfy.sh/publish/).
