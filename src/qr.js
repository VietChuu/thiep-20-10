import { config } from "./config.js";
const $ = (id) => document.getElementById(id);
const canvas = $("poster-canvas"),
  context = canvas.getContext("2d");
let generatedUrl = "",
  generation = 0;
$("base-url").value = new URL("./", location.href).href;
$("to-name").value = config.recipient;
$("from-name").value = config.sender;
function roundRect(x, y, width, height, radius, fill) {
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}
function fitText(text, maxWidth, fontSize, fontFamily) {
  let size = fontSize;
  do {
    context.font = `${size}px ${fontFamily}`;
    if (context.measureText(text).width <= maxWidth) break;
    size--;
  } while (size > 16);
  return size;
}
function drawPoster(qr, to, from) {
  context.fillStyle = "#fffcf9";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#d7bba0";
  context.lineWidth = 2;
  context.strokeRect(45, 45, 910, 1310);
  context.textAlign = "center";
  context.fillStyle = "#a05a50";
  context.font = "100px Georgia";
  context.fillText("✳", 500, 180);
  context.fillStyle = "#8f3e48";
  context.font = "18px 'Be Vietnam Pro', sans-serif";
  context.fillText("20 THÁNG 10 · MỘT CHÚT DỄ THƯƠNG", 500, 240);
  context.fillStyle = "#49312d";
  context.font = "68px 'Playfair Display', Georgia";
  context.fillText("Có một bất ngờ", 500, 355);
  context.font = "italic 68px 'Playfair Display', Georgia";
  context.fillStyle = "#8f3e48";
  context.fillText("dành cho cậu.", 500, 440);
  context.fillStyle = "#8b736b";
  fitText(`Gửi ${to}`, 800, 30, "'Be Vietnam Pro', sans-serif");
  context.fillText(`Gửi ${to}`, 500, 520);
  roundRect(200, 575, 600, 600, 22, "#f1e2d3");
  roundRect(218, 593, 564, 564, 12, "#fff");
  const modules = qr.getModuleCount(),
    cell = Math.floor(520 / (modules + 8)),
    size = cell * (modules + 8);
  const x = Math.round((1000 - size) / 2),
    y = 613 + Math.round((524 - size) / 2);
  context.fillStyle = "#fff";
  context.fillRect(x, y, size, size);
  context.fillStyle = "#49312d";
  for (let row = 0; row < modules; row++)
    for (let column = 0; column < modules; column++)
      if (qr.isDark(row, column))
        context.fillRect(
          x + (column + 4) * cell,
          y + (row + 4) * cell,
          cell,
          cell,
        );
  context.fillStyle = "#49312d";
  context.font = "21px 'Be Vietnam Pro', sans-serif";
  context.fillText("Quét mã. Mở thiệp. Nhận niềm vui.", 500, 1230);
  context.fillStyle = "#9b7765";
  fitText(
    `Từ ${from}, với thật nhiều quý mến.`,
    820,
    22,
    "'Playfair Display', Georgia",
  );
  context.fillText(`Từ ${from}, với thật nhiều quý mến.`, 500, 1290);
}
async function generate(event) {
  event?.preventDefault();
  const currentGeneration = ++generation;
  try {
    const url = new URL($("base-url").value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(
        "Hãy dùng đường dẫn http hoặc https hợp lệ, không kèm thông tin đăng nhập.",
      );
    url.search = "";
    url.hash = "";
    const to = $("to-name").value.trim(),
      from = $("from-name").value.trim(),
      message = $("custom-message").value.trim();
    if (!to || !from)
      throw new Error("Điền tên người nhận và người gửi trước nhé.");
    url.searchParams.set("to", to);
    url.searchParams.set("from", from);
    if (message) url.searchParams.set("msg", message);
    if (url.href.length > 2200)
      throw new Error(
        "Lời nhắn hơi dài cho mã QR dễ quét. Rút ngắn còn khoảng 150–200 ký tự nhé.",
      );
    if (typeof window.qrcode !== "function")
      throw new Error("Chưa tải được thư viện QR. Hãy tải lại trang.");
    window.qrcode.stringToBytes = (value) =>
      Array.from(new TextEncoder().encode(value));
    const qr = window.qrcode(0, "M");
    qr.addData(url.href);
    qr.make();
    await document.fonts.ready;
    if (currentGeneration !== generation) return;
    generatedUrl = url.href;
    drawPoster(qr, to, from);
    $("generated-link").textContent = generatedUrl;
    $("preview-link").href = generatedUrl;
    ["copy-link", "download-qr", "print-poster"].forEach((id) => {
      $(id).disabled = false;
    });
    $("qr-status").textContent = "Đã gói xong! Link và mã QR đã đồng bộ.";
  } catch (error) {
    generatedUrl = "";
    $("generated-link").textContent = "";
    $("preview-link").removeAttribute("href");
    ["copy-link", "download-qr", "print-poster"].forEach((id) => {
      $(id).disabled = true;
    });
    context.clearRect(0, 0, canvas.width, canvas.height);
    $("qr-status").textContent = error.message;
  }
}
$("qr-form").addEventListener("submit", generate);
$("copy-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(generatedUrl);
    $("qr-status").textContent = "Đã sao chép link. Gửi cho bạn thôi!";
  } catch {
    $("qr-status").textContent =
      "Trình duyệt chưa cho sao chép tự động. Bạn có thể chọn và sao chép link ở trên.";
  }
});
$("download-qr").addEventListener("click", () => {
  if (!generatedUrl) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = objectUrl;
    link.download = "thiep-20-10-qr.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }, "image/png");
});
$("print-poster").addEventListener("click", () => {
  if (generatedUrl) window.print();
});
void generate();
