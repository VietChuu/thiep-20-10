import { config } from "./config.js";
import { personalize, elapsedSince, safeAsset } from "./core.js";
import {
  track,
  readStored,
  store,
  remoteAllowed,
  setSharing,
  flushQueue,
} from "./tracking.js";

const $ = (id) => document.getElementById(id);
const person = personalize(location.search, config);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const photos = config.photos.length
  ? config.photos
  : [{ src: "assets/flowers.svg", alt: "Một bó hoa dành cho cậu" }];
const personKey = `thiep-progress:${config.trackingTopic}:${person.to}:${person.from}`;
const saved = readStored(personKey, {});
let wishIndex = Number.isInteger(saved?.wishIndex)
  ? Math.max(0, Math.min(saved.wishIndex, config.wishes.length))
  : 0;
function saveProgress() {
  store(personKey, { wishIndex });
}
document.title = `Gửi ${person.to} · Một chút dễ thương 20/10`;
document.querySelectorAll("[data-copy]").forEach((element) => {
  element.textContent = config.copy[element.dataset.copy] || "";
});
document.querySelectorAll("[data-recipient]").forEach((element) => {
  element.textContent = person.to;
});
document.querySelectorAll("[data-sender]").forEach((element) => {
  element.textContent = person.from;
});
const emit = (type, details = {}) => track(type, person, details);
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3400);
}

// Audio starts only from a user gesture, as required by mobile browsers.
class SoundBox {
  constructor() {
    this.context = null;
    this.music = false;
    this.timer = null;
    this.note = 0;
    this.custom = null;
  }
  async ready() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    this.context ||= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
    return true;
  }
  tone(frequency, duration = 0.25, volume = 0.055, type = "sine", delay = 0) {
    if (!this.context || this.context.state !== "running") return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  noise(duration = 0.12, volume = 0.06, pitch = 1700) {
    if (!this.context || this.context.state !== "running") return;
    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * duration,
      this.context.sampleRate,
    );
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++)
      channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = pitch;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  melody() {
    const notes = [
      523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25,
      783.99, 1046.5, 880, 783.99, 659.25, 587.33, 0,
    ];
    const frequency = notes[this.note++ % notes.length];
    if (frequency) {
      this.tone(frequency, 1.4, 0.035);
      this.tone(frequency * 2, 0.7, 0.008);
    }
  }
  async toggle(force) {
    const next = force ?? !this.music;
    if (!next) {
      this.stop();
      return;
    }
    try {
      const supported = await this.ready();
      if (config.customMusicUrl) {
        this.custom ||= new Audio(safeAsset(config.customMusicUrl));
        this.custom.loop = true;
        this.custom.volume = 0.35;
        await this.custom.play();
      } else {
        if (!supported) throw new Error("Audio not supported");
        clearInterval(this.timer);
        this.melody();
        this.timer = setInterval(() => {
          if (!document.hidden) this.melody();
        }, 550);
      }
      this.music = true;
      this.update();
    } catch {
      this.stop();
      toast(
        "Trình duyệt chưa phát được nhạc. Cậu vẫn có thể chơi mọi trò nhé.",
      );
    }
  }
  stop() {
    clearInterval(this.timer);
    this.custom?.pause();
    this.music = false;
    this.update();
  }
  update() {
    $("music-toggle").setAttribute("aria-pressed", String(this.music));
    $("music-toggle").setAttribute(
      "aria-label",
      this.music ? "Tắt nhạc" : "Bật nhạc",
    );
    $("music-label").textContent = this.music ? "Đang phát" : "Bật nhạc";
  }
  camera() {
    this.noise(0.09, 0.15, 2700);
    for (let i = 0; i < 8; i++)
      setTimeout(
        () => this.tone(120 + i * 4, 0.08, 0.018, "sawtooth"),
        100 + i * 75,
      );
  }
  printer() {
    for (let i = 0; i < 20; i++)
      setTimeout(() => this.noise(0.075, 0.035, 1000 + (i % 3) * 150), i * 105);
    setTimeout(() => this.tone(1050, 0.15, 0.04), 2200);
  }
}
const sound = new SoundBox();
$("music-toggle").addEventListener("click", () => sound.toggle());

function sparkleAt(x, y, count = 7, symbols = ["✦", "✧", "✿", "·"]) {
  if (reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const element = document.createElement("span");
    element.className = "sparkle";
    element.textContent = symbols[i % symbols.length];
    const angle = (Math.PI * 2 * i) / count;
    const distance = 35 + Math.random() * 65;
    element.style.cssText = `left:${x}px;top:${y}px;color:${["#b68654", "#d09a94", "#a55760"][i % 3]};--dx:${Math.cos(angle) * distance}px;--dy:${Math.sin(angle) * distance - 30}px;--rotate:${Math.random() * 180}deg`;
    $("sparkles").append(element);
    element.addEventListener("animationend", () => element.remove(), {
      once: true,
    });
  }
}
document.addEventListener(
  "pointerdown",
  (event) => sparkleAt(event.clientX, event.clientY),
  { passive: true },
);
function celebrate() {
  if (reducedMotion) {
    toast("🌸 Chúc cậu một ngày đầy niềm vui!");
    return;
  }
  for (let i = 0; i < 10; i++)
    setTimeout(
      () =>
        sparkleAt(
          Math.random() * innerWidth,
          Math.random() * innerHeight * 0.65,
          10,
          ["🌸", "✨", "🎉", "💖"],
        ),
      i * 120,
    );
  sound.tone(523, 0.5, 0.04);
  sound.tone(659, 0.5, 0.04, "sine", 0.12);
  sound.tone(784, 0.7, 0.04, "sine", 0.24);
}
$("celebrate").addEventListener("click", celebrate);
function startPetals() {
  if (reducedMotion) return;
  const canvas = $("petals-canvas"),
    context = canvas.getContext("2d");
  let width = innerWidth,
    height = innerHeight,
    last = 0;
  const petals = Array.from({ length: innerWidth < 700 ? 12 : 22 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.random() * 3,
    speed: 8 + Math.random() * 12,
    phase: Math.random() * 6,
  }));
  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);
  function draw(time) {
    const delta = Math.min((time - last) / 1000, 0.05);
    last = time;
    if (!document.hidden) {
      context.clearRect(0, 0, width, height);
      petals.forEach((petal, index) => {
        petal.y += petal.speed * delta;
        petal.x += Math.sin(time / 2500 + petal.phase) * 5 * delta;
        if (petal.y > height + 10) {
          petal.y = -10;
          petal.x = Math.random() * width;
        }
        context.save();
        context.translate(petal.x, petal.y);
        context.rotate(time / 4000 + petal.phase);
        context.fillStyle = index % 3 === 0 ? "#c7aa7480" : "#e6bba570";
        context.beginPath();
        context.ellipse(0, 0, petal.size, petal.size * 0.5, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
startPetals();

const sharingInputs = [$("sharing-intro"), $("sharing-footer")];
sharingInputs.forEach((input) => {
  input.checked = remoteAllowed();
  input.addEventListener("change", () => {
    setSharing(input.checked);
    sharingInputs.forEach((other) => {
      other.checked = input.checked;
    });
  });
});
window.addEventListener("online", () => flushQueue());
void flushQueue();
let opened = false,
  transitioning = false;
async function openEnvelope() {
  if (transitioning) return;
  transitioning = true;
  $("open-card").disabled = true;
  void sound.toggle(true);
  $("envelope").classList.add("is-open");
  emit("open_envelope");
  setTimeout(
    () => {
      $("envelope-stage").hidden = true;
      $("main-content").hidden = false;
      $("main-content").classList.add("fade-in");
      window.scrollTo({ top: 0, behavior: "instant" });
      if (!opened) {
        startTypewriter();
        initializeScratch();
        opened = true;
      }
      $("main-content").setAttribute("tabindex", "-1");
      $("main-content").focus({ preventScroll: true });
      transitioning = false;
      $("open-card").disabled = false;
    },
    reducedMotion ? 30 : 1450,
  );
}
$("open-card").addEventListener("click", openEnvelope);
$("envelope").addEventListener("click", openEnvelope);
$("replay").addEventListener("click", () => {
  $("main-content").hidden = true;
  $("envelope-stage").hidden = false;
  $("envelope").classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "instant" });
  $("open-card").focus({ preventScroll: true });
});

let typeTimer,
  typePosition = 0;
const paragraphs = person.message
  ? [person.message, ...config.letter]
  : config.letter;
const fullLetter = paragraphs.join("\n\n");
function finishLetter() {
  clearInterval(typeTimer);
  $("letter-text").textContent = fullLetter;
  $("typewriter-hint").hidden = true;
}
function startTypewriter() {
  if (reducedMotion) {
    finishLetter();
    return;
  }
  typeTimer = setInterval(() => {
    typePosition += 3;
    $("letter-text").textContent = fullLetter.slice(0, typePosition);
    if (typePosition >= fullLetter.length) finishLetter();
  }, 22);
}
$("letter-paper").addEventListener("click", finishLetter);
$("letter-paper").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    finishLetter();
  }
});
const counterElements = Object.entries({
  days: "Ngày",
  hours: "Giờ",
  minutes: "Phút",
  seconds: "Giây",
}).map(([key, label]) => {
  const box = document.createElement("div"),
    number = document.createElement("strong"),
    unit = document.createElement("span");
  unit.textContent = label;
  box.append(number, unit);
  $("friendship-counter").append(box);
  return { key, number };
});
function updateCounter() {
  const elapsed = elapsedSince(config.friendshipStart);
  counterElements.forEach(({ key, number }) => {
    number.textContent = String(elapsed[key]).padStart(2, "0");
  });
}
updateCounter();
setInterval(updateCounter, 1000);
$("date-example").textContent =
  (config.friendshipDateIsExample ? "Mốc minh hoạ: " : "Từ ") +
  new Date(config.friendshipStart).toLocaleDateString("vi-VN");
for (const [id, source] of [
  ["avatar-from", config.avatars.sender],
  ["avatar-to", config.avatars.recipient],
]) {
  if (source) {
    const image = new Image();
    image.src = safeAsset(source);
    image.alt = id === "avatar-from" ? person.from : person.to;
    $(id).replaceChildren(image);
  }
}

function photoImage(photo, lazy = true) {
  const image = new Image();
  image.src = safeAsset(photo.src);
  image.alt = photo.alt;
  image.decoding = "async";
  if (lazy) image.loading = "lazy";
  image.addEventListener("error", () => {
    if (!image.dataset.fallback) {
      image.dataset.fallback = "1";
      image.src = "assets/flowers.svg";
    }
  });
  return image;
}
photos.forEach((photo, index) => {
  const button = document.createElement("button");
  button.className = "memory-item";
  button.setAttribute("aria-label", `Xem ảnh ${index + 1}: ${photo.alt}`);
  const label = document.createElement("span");
  label.textContent = `#${String(index + 1).padStart(2, "0")} ${index % 2 ? "🌸" : "✨"}`;
  button.append(photoImage(photo), label);
  button.addEventListener("click", () => openLightbox(index));
  $("masonry").append(button);
});
for (let copy = 0; copy < 2; copy++)
  photos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.className = "film-photo";
    button.setAttribute("aria-label", `Mở ảnh ${index + 1}`);
    const label = document.createElement("span");
    label.textContent = `20.10 · ${String(index + 1).padStart(2, "0")}`;
    button.append(photoImage(photo), label);
    button.addEventListener("click", () => openLightbox(index));
    if (copy) {
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
    }
    $("film-track").append(button);
  });
$("sample-photos").textContent = config.photosAreExamples
  ? "Một bộ tranh minh hoạ cho những điều nhỏ khiến ngày vui hơn."
  : "";
const film = $("film-strip");
let filmPauseUntil = 0,
  filmHovered = false,
  filmLast = 0,
  filmScroll = 0;
film.addEventListener("pointerenter", () => {
  filmHovered = true;
});
film.addEventListener("pointerleave", () => {
  filmHovered = false;
  filmScroll = film.scrollLeft;
});
film.addEventListener("pointerdown", () => {
  filmPauseUntil = performance.now() + 2500;
  filmScroll = film.scrollLeft;
});
film.addEventListener(
  "wheel",
  () => {
    filmPauseUntil = performance.now() + 2500;
    filmScroll = film.scrollLeft;
  },
  { passive: true },
);
film.addEventListener("scroll", () => {
  if (filmHovered || performance.now() < filmPauseUntil) {
    filmScroll = film.scrollLeft;
  }
});
function moveFilm(time) {
  const delta = Math.min((time - filmLast) / 1000, 0.05);
  filmLast = time;
  if (
    !reducedMotion &&
    !document.hidden &&
    !filmHovered &&
    time > filmPauseUntil &&
    !film.contains(document.activeElement) &&
    !$("main-content").hidden
  ) {
    const half = $("film-track").scrollWidth / 2;
    if (half > 0) {
      filmScroll += delta * 46;
      if (filmScroll >= half) filmScroll -= half;
      film.scrollLeft = filmScroll;
    }
  }
  requestAnimationFrame(moveFilm);
}
requestAnimationFrame(moveFilm);
let lightboxIndex = 0,
  lastPhotoFocus = null;
function showLightboxImage() {
  const photo = photos[lightboxIndex];
  $("lightbox-image").src = safeAsset(photo.src);
  $("lightbox-image").alt = photo.alt;
  $("lightbox-caption").textContent =
    `${String(lightboxIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")} · ${photo.alt}`;
}
function openLightbox(index) {
  lightboxIndex = index;
  lastPhotoFocus = document.activeElement;
  showLightboxImage();
  $("lightbox").showModal();
  document.body.classList.add("no-scroll");
  $("close-lightbox").focus();
}
function stepLightbox(direction) {
  lightboxIndex = (lightboxIndex + direction + photos.length) % photos.length;
  showLightboxImage();
}
$("close-lightbox").addEventListener("click", () => $("lightbox").close());
$("lightbox").addEventListener("close", () => {
  document.body.classList.remove("no-scroll");
  lastPhotoFocus?.focus({ preventScroll: true });
});
$("lightbox").addEventListener("click", (event) => {
  if (event.target === $("lightbox")) $("lightbox").close();
});
$("prev-image").addEventListener("click", () => stepLightbox(-1));
$("next-image").addEventListener("click", () => stepLightbox(1));
$("lightbox").addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") stepLightbox(-1);
  if (event.key === "ArrowRight") stepLightbox(1);
});
let touchX = 0,
  touchY = 0;
$("lightbox").addEventListener(
  "touchstart",
  (event) => {
    touchX = event.changedTouches[0].clientX;
    touchY = event.changedTouches[0].clientY;
  },
  { passive: true },
);
$("lightbox").addEventListener(
  "touchend",
  (event) => {
    const dx = event.changedTouches[0].clientX - touchX,
      dy = event.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy))
      stepLightbox(dx < 0 ? 1 : -1);
  },
  { passive: true },
);
let cameraIndex = 0,
  cameraBusy = false,
  printedPhotoIndex = 0;
function updateCamera() {
  $("lens-image").src = safeAsset(photos[cameraIndex].src);
  $("film-count").textContent = String(photos.length - cameraIndex).padStart(
    2,
    "0",
  );
}
updateCamera();
$("photo-hint").textContent = `${photos.length} khoảnh khắc đang chờ được in.`;
async function takePhoto() {
  if (cameraBusy) return;
  cameraBusy = true;
  $("take-photo").disabled = true;
  await sound.ready().catch(() => false);
  sound.camera();
  $("flash").classList.remove("flash");
  void $("flash").offsetWidth;
  $("flash").classList.add("flash");
  printedPhotoIndex = cameraIndex;
  $("instant-image").src = safeAsset(photos[cameraIndex].src);
  $("instant-image").alt = photos[cameraIndex].alt;
  $("instant-number").textContent =
    `a little memory / ${String(cameraIndex + 1).padStart(2, "0")}`;
  $("instant-photo").hidden = true;
  void $("instant-photo").offsetWidth;
  $("instant-photo").hidden = false;
  cameraIndex = (cameraIndex + 1) % photos.length;
  updateCamera();
  setTimeout(
    () => {
      cameraBusy = false;
      $("take-photo").disabled = false;
    },
    reducedMotion ? 50 : 2200,
  );
}
$("take-photo").addEventListener("click", takePhoto);
$("lens-button").addEventListener("click", takePhoto);
$("instant-preview").addEventListener("click", () =>
  openLightbox(printedPhotoIndex),
);

$("game-question").textContent = config.game.question;
$("yes-button").textContent = config.game.yes;
$("no-button").textContent = config.game.no;
let escapeCount = 0,
  gameAccepted = false,
  lastEscape = 0;
function runAway(event) {
  if (gameAccepted) return;
  if (event.type === "touchstart") event.preventDefault();
  if (performance.now() - lastEscape < 180) return;
  lastEscape = performance.now();
  escapeCount++;
  $("no-button").textContent =
    config.game.teases[(escapeCount - 1) % config.game.teases.length];
  $("game-face").textContent = ["🥺", "😤", "😂", "🤭"][(escapeCount - 1) % 4];
  const arena = $("game-arena"),
    no = $("no-button"),
    yes = $("yes-button");
  yes.style.transform = `scale(${Math.min(1.22, 1 + escapeCount * 0.035)})`;
  const maxX = Math.max(0, arena.clientWidth - no.offsetWidth - 5),
    maxY = Math.max(0, arena.clientHeight - no.offsetHeight - 5);
  let x = 0,
    y = 0;
  const yesBox = yes.getBoundingClientRect(),
    arenaBox = arena.getBoundingClientRect();
  for (let attempt = 0; attempt < 30; attempt++) {
    x = 5 + Math.random() * Math.max(0, maxX - 5);
    y = 5 + Math.random() * Math.max(0, maxY - 5);
    if (
      y + no.offsetHeight < yesBox.top - arenaBox.top - 6 ||
      y > yesBox.bottom - arenaBox.top + 6
    )
      break;
  }
  no.style.right = "auto";
  no.style.left = `${x}px`;
  no.style.top = `${y}px`;
}
$("no-button").addEventListener("mouseenter", runAway);
$("no-button").addEventListener("touchstart", runAway, { passive: false });
$("no-button").addEventListener("click", runAway);
$("yes-button").addEventListener("click", () => {
  if (gameAccepted) return;
  gameAccepted = true;
  $("game-result").textContent = config.game.success;
  $("game-face").textContent = "🥳";
  $("no-button").hidden = true;
  $("yes-button").textContent = "Đã chốt tình bạn 🤝";
  emit("click_love_yes", { escapeAttempts: escapeCount });
  celebrate();
});

$("scratch-image").src = safeAsset(config.scratch.image);
$("scratch-message").textContent = config.scratch.message;
let scratchReady = false,
  scratchRevealed = false,
  scratching = false,
  scratchPrevious = null,
  scratchCheckAt = 0;
function paintScratch() {
  const canvas = $("scratch-canvas"),
    surface = $("scratch-surface"),
    context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = Math.round(surface.clientWidth);
  canvas.height = Math.round(surface.clientHeight);
  context.globalCompositeOperation = "source-over";
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height,
  );
  gradient.addColorStop(0, "#d6c5c3");
  gradient.addColorStop(0.32, "#f4e4dc");
  gradient.addColorStop(0.55, "#cbb7bd");
  gradient.addColorStop(0.8, "#efdad1");
  gradient.addColorStop(1, "#c6b5b9");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 1500; i++) {
    context.fillStyle = i % 2 ? "#ffffff66" : "#987b8a33";
    context.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      1.5,
      1.5,
    );
  }
  context.textAlign = "center";
  context.fillStyle = "#715663";
  context.font = "500 13px 'Be Vietnam Pro', sans-serif";
  context.fillText(
    "✨ CÀO NHẸ TẠI ĐÂY ✨",
    canvas.width / 2,
    canvas.height / 2,
  );
  context.font = "10px sans-serif";
  context.fillText(
    "một điều dễ thương đang chờ cậu",
    canvas.width / 2,
    canvas.height / 2 + 25,
  );
  canvas.style.opacity = "1";
  canvas.style.pointerEvents = "auto";
  scratchRevealed = false;
  $("scratch-status").textContent = "Bí mật đang chờ cậu…";
  $("scratch-reveal").disabled = false;
}
function revealScratch() {
  if (scratchRevealed) return;
  scratchRevealed = true;
  scratching = false;
  $("scratch-canvas").style.opacity = "0";
  $("scratch-canvas").style.pointerEvents = "none";
  $("scratch-status").textContent = "Bí mật đã được bật mí! ✨";
  $("scratch-reveal").disabled = true;
  emit("scratch_revealed");
  sound.tone(880, 0.5, 0.035);
  celebrate();
}
function scratchPercentage() {
  const canvas = $("scratch-canvas"),
    pixels = canvas
      .getContext("2d", { willReadFrequently: true })
      .getImageData(0, 0, canvas.width, canvas.height).data;
  let clear = 0,
    total = 0;
  for (let i = 3; i < pixels.length; i += 32) {
    total++;
    if (pixels[i] < 100) clear++;
  }
  return total ? clear / total : 0;
}
function scratchPoint(event) {
  const canvas = $("scratch-canvas"),
    rect = canvas.getBoundingClientRect(),
    context = canvas.getContext("2d");
  const point = {
    x: ((event.clientX - rect.left) * canvas.width) / rect.width,
    y: ((event.clientY - rect.top) * canvas.height) / rect.height,
  };
  context.globalCompositeOperation = "destination-out";
  context.lineWidth = 40;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(scratchPrevious?.x ?? point.x, scratchPrevious?.y ?? point.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  context.beginPath();
  context.arc(point.x, point.y, 20, 0, Math.PI * 2);
  context.fill();
  scratchPrevious = point;
  if (performance.now() - scratchCheckAt > 140) {
    scratchCheckAt = performance.now();
    if (scratchPercentage() >= 0.45) revealScratch();
  }
}
function initializeScratch() {
  if (scratchReady) return;
  scratchReady = true;
  paintScratch();
  const canvas = $("scratch-canvas");
  canvas.addEventListener("pointerdown", (event) => {
    if (scratchRevealed) return;
    scratching = true;
    scratchPrevious = null;
    canvas.setPointerCapture(event.pointerId);
    scratchPoint(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (scratching && !scratchRevealed) scratchPoint(event);
  });
  const finish = () => {
    scratching = false;
    scratchPrevious = null;
    if (!scratchRevealed && scratchPercentage() >= 0.45) revealScratch();
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
}
$("scratch-reset").addEventListener("click", paintScratch);
$("scratch-reveal").addEventListener("click", revealScratch);

function displayWish() {
  if (wishIndex > 0) {
    $("wish-number").textContent =
      `NGÔI SAO #${wishIndex}/${config.wishes.length}`;
    $("wish-text").textContent = config.wishes[wishIndex - 1];
  }
  if (wishIndex >= config.wishes.length) {
    $("pick-star").textContent = "Đã nhận đủ lời chúc ✨";
    $("pick-star").disabled = true;
    $("wish-jar").disabled = true;
  }
}
displayWish();
function pickWish() {
  if (wishIndex >= config.wishes.length) return;
  const note = config.wishes[wishIndex++];
  saveProgress();
  displayWish();
  $("wish-jar").classList.remove("shake");
  $("wish-note").classList.remove("pop");
  void $("wish-jar").offsetWidth;
  $("wish-jar").classList.add("shake");
  $("wish-note").classList.add("pop");
  const rect = $("wish-jar").getBoundingClientRect();
  sparkleAt(rect.left + rect.width / 2, rect.top + 80, 14, ["★", "✦", "✧"]);
  sound.tone(784, 0.5, 0.04);
  emit("pick_star_note", { number: wishIndex, note });
}
$("pick-star").addEventListener("click", pickWish);
$("wish-jar").addEventListener("click", pickWish);

