import { visibleEvents } from "./core.js";
import {
  endpoint,
  storageKey,
  readStored,
  saveEvent,
  validEvent,
  decodeMessage,
  track,
  flushQueue,
} from "./tracking.js";
const $ = (id) => document.getElementById(id);
const labels = {
  open_envelope: "Mở phong bì",
  click_love_yes: "Công nhận tình bạn",
  scratch_revealed: "Cào xong thẻ",
  pick_star_note: "Bốc ngôi sao",
  spin_wheel: "Quay vòng quà",
  print_receipt: "In hoá đơn",
  stamp_receipt: "Đóng dấu chốt đơn",
};
let events = [],
  live = false,
  renderTimer = null;
function getEvents() {
  const stored = readStored(storageKey);
  return Array.isArray(stored) ? stored.filter(validEvent) : [];
}
function text(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).slice(0, 1600)
    : "";
}
function time(at) {
  return new Date(at).toLocaleString("vi-VN", { hour12: false });
}
function details(event) {
  const data = event.details;
  if (event.type === "click_love_yes")
    return `Đã thử nút từ chối ${text(data.escapeAttempts)} lần`;
  if (event.type === "pick_star_note")
    return `#${text(data.number)} · ${text(data.note)}`;
  if (["spin_wheel", "print_receipt", "stamp_receipt"].includes(event.type))
    return `Lần ${text(data.spinNumber)} · ${text(data.prize)} · ${text(data.spinId)}`;
  return event.type === "scratch_revealed"
    ? "Đã mở bất ngờ"
    : `Người gửi: ${event.from}`;
}
function rows(id, records, format, columns) {
  const body = $(id);
  body.replaceChildren();
  if (!records.length) {
    const row = document.createElement("tr"),
      cell = document.createElement("td");
    cell.colSpan = columns;
    cell.className = "table-empty";
    cell.textContent = "Chưa có tương tác. Niềm vui đang trên đường đến.";
    row.append(cell);
    body.append(row);
    return;
  }
  for (const record of records.slice(0, 500)) {
    const row = document.createElement("tr");
    for (const value of format(record)) {
      const cell = document.createElement("td");
      cell.textContent = text(value);
      row.append(cell);
    }
    body.append(row);
  }
}
function render() {
  events = visibleEvents(getEvents());
  const opens = events.filter((event) => event.type === "open_envelope"),
    spins = events.filter((event) => event.type === "spin_wheel"),
    stars = events.filter((event) => event.type === "pick_star_note");
  $("stat-opens").textContent = opens.length;
  $("stat-recipients").textContent = new Set(
    opens.map((event) => event.to),
  ).size;
  $("stat-spins").textContent = spins.length;
  $("stat-stars").textContent = stars.length;
  rows(
    "spin-rows",
    spins,
    (event) => [
      event.to,
      event.details.prize,
      `${text(event.details.spinNumber)} / ${time(event.at)}`,
    ],
    3,
  );
  rows(
    "star-rows",
    stars,
    (event) => [event.to, `#${text(event.details.number)}`, event.details.note],
    3,
  );
  rows(
    "event-rows",
    events,
    (event) => [
      time(event.at),
      event.to,
      labels[event.type],
      details(event),
      event.device,
    ],
    5,
  );
}
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 100);
}
window.addEventListener("storage", (event) => {
  if (event.key === storageKey) scheduleRender();
});
window.addEventListener("tracking-updated", scheduleRender);
function connection(message, isLive = false) {
  $("connection").textContent = message;
  $("connection").classList.toggle("live", isLive);
}
async function history() {
  $("refresh-log").disabled = true;
  try {
    const response = await fetch(`${endpoint}/json?poll=1&since=all`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const content = await response.text();
    content
      .split("\n")
      .filter(Boolean)
      .forEach((line) => {
        const event = decodeMessage(line);
        if (event) saveEvent(event);
      });
    render();
    $("dashboard-status").textContent =
      "Đã đồng bộ lịch sử hiện còn trên ntfy.";
    if (!live) connection("Đã tải lịch sử · đang chờ kết nối trực tiếp");
  } catch {
    $("dashboard-status").textContent =
      "Chưa tải được ntfy. Đang hiển thị dữ liệu lưu trên trình duyệt.";
    if (!live) connection("Chế độ cục bộ · sẽ tự kết nối lại");
  } finally {
    $("refresh-log").disabled = false;
  }
}
// Connect first, then load history. Stable event IDs prevent duplicates between both paths.
const stream = new EventSource(`${endpoint}/sse?since=all`);
stream.addEventListener("open", () => {
  live = true;
  connection("Đang trực tiếp · tự cập nhật", true);
});
stream.addEventListener("message", (message) => {
  const event = decodeMessage(message.data);
  if (event) saveEvent(event);
});
stream.addEventListener("error", () => {
  live = false;
  connection("Mất kết nối · đang tự kết nối lại");
});
window.addEventListener("pagehide", () => stream.close());
$("refresh-log").addEventListener("click", history);
$("reset-log").addEventListener("click", () => $("reset-dialog").showModal());
$("cancel-reset").addEventListener("click", () => $("reset-dialog").close());
$("confirm-reset").addEventListener("click", async () => {
  $("reset-dialog").close();
  track("reset_log", { to: "Dashboard", from: "Quản trị" }, {}, true);
  render();
  await flushQueue(true);
  $("dashboard-status").textContent =
    "Đã đặt mốc xoá thử nghiệm tại đây. Nếu đang mất mạng, mốc reset sẽ gửi khi kết nối lại.";
});
window.addEventListener("online", () => {
  void flushQueue(true);
  void history();
});
$("export-log").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `thiep-2010-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();
void history();
void flushQueue(true);
