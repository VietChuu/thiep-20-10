export function personalize(search, defaults) {
  const params = new URLSearchParams(search);
  const value = (key, fallback, length) =>
    (params.get(key)?.trim() || fallback).slice(0, length);
  return {
    to: value("to", defaults.recipient, 80),
    from: value("from", defaults.sender, 80),
    message: value("msg", "", 1500),
  };
}

export function elapsedSince(start, now = Date.now()) {
  const parsed = Date.parse(start);
  const seconds = Math.max(
    0,
    Math.floor((now - (Number.isFinite(parsed) ? parsed : now)) / 1000),
  );
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  };
}

export function spinTarget(current, index, count, turns = 6) {
  const slice = 360 / count;
  const desired = (((360 - (index + 0.5) * slice) % 360) + 360) % 360;
  return current + turns * 360 + ((desired - (current % 360) + 360) % 360);
}

export function winnerAtRotation(rotation, count) {
  return Math.floor(((360 - (rotation % 360)) % 360) / (360 / count));
}

export function visibleEvents(events) {
  const unique = [
    ...new Map(events.map((event) => [event.id, event])).values(),
  ];
  const resetAt = Math.max(
    0,
    ...unique
      .filter((event) => event.type === "reset_log")
      .map((event) => event.at),
  );
  return unique
    .filter((event) => event.type !== "reset_log" && event.at > resetAt)
    .sort((a, b) => b.at - a.at);
}

export function safeAsset(source, fallback = "assets/flowers.svg") {
  try {
    const url = new URL(source, "https://example.invalid/");
    return ["https:", "http:"].includes(url.protocol) && source
      ? source
      : fallback;
  } catch {
    return fallback;
  }
}
