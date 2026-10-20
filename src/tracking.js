import { config } from "./config.js";
export const storageKey = `thiep-events:${config.trackingTopic}`;
const queueKey = `${storageKey}:queue`;
const allowed = new Set([
  "open_envelope",
  "click_love_yes",
  "scratch_revealed",
  "pick_star_note",
  "spin_wheel",
  "print_receipt",
  "stamp_receipt",
  "reset_log",
]);

export function readStored(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing may disable storage. */
  }
}
export function validEvent(event) {
  return (
    event &&
    typeof event.id === "string" &&
    event.id.length < 100 &&
    allowed.has(event.type) &&
    Number.isFinite(event.at) &&
    typeof event.to === "string" &&
    event.to.length <= 80 &&
    typeof event.from === "string" &&
    event.from.length <= 80 &&
    event.details &&
    typeof event.details === "object" &&
    !Array.isArray(event.details)
  );
}
export function saveEvent(event) {
  if (!validEvent(event)) return;
  const existing = readStored(storageKey);
  const list = Array.isArray(existing) ? existing.filter(validEvent) : [];
  if (!list.some((item) => item.id === event.id))
    store(storageKey, [...list, event].slice(-2000));
  window.dispatchEvent(new CustomEvent("tracking-updated"));
}
export function remoteAllowed() {
  return config.trackingEnabled && readStored("thiep-sharing", false) === true;
}
export function setSharing(enabled) {
  store("thiep-sharing", enabled);
  if (!enabled) store(queueKey, []);
  else flushQueue();
}
export function deviceName() {
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return "iPhone";
  return /Android/.test(navigator.userAgent) ? "Android" : "Desktop";
}
export const endpoint = `https://ntfy.sh/${encodeURIComponent(config.trackingTopic)}`;
let flushing = false;
export async function flushQueue(force = false) {
  if (flushing || (!force && !remoteAllowed()) || !navigator.onLine) return;
  flushing = true;
  try {
    let queue = readStored(queueKey);
    if (!Array.isArray(queue)) queue = [];
    for (const event of queue.filter(validEvent)) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`ntfy ${response.status}`);
      const latest = readStored(queueKey);
      store(
        queueKey,
        (Array.isArray(latest) ? latest : []).filter(
          (item) => item.id !== event.id,
        ),
      );
    }
  } catch {
    /* Events stay queued for the next visit, interaction, or online event. */
  } finally {
    flushing = false;
  }
}
export function track(type, person, details = {}, force = false) {
  const event = {
    id: crypto.randomUUID(),
    at: Date.now(),
    type,
    to: person.to,
    from: person.from,
    device: deviceName(),
    details,
  };
  saveEvent(event);
  if (remoteAllowed() || force) {
    const queue = readStored(queueKey);
    store(
      queueKey,
      [...(Array.isArray(queue) ? queue : []), event].slice(-500),
    );
    void flushQueue(force);
  }
  return event;
}
export function decodeMessage(text) {
  try {
    const envelope = JSON.parse(text);
    if (envelope.event !== "message" || typeof envelope.message !== "string")
      return null;
    const event = JSON.parse(envelope.message);
    return validEvent(event) ? event : null;
  } catch {
    return null;
  }
}
