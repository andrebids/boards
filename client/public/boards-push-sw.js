/* Boards Web Push worker. Intentionally contains no offline cache. */

const ID_PATTERN = /^[1-9][0-9]{0,18}$/;
const MAX_TEXT_LENGTH = 200;
const FALLBACK_NOTIFICATION = {
  title: "Boards",
  body: "You have a new chat message.",
  tag: "boards-chat",
  data: null,
};

const isValidText = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_TEXT_LENGTH;

const isValidId = (value) =>
  typeof value === "string" && ID_PATTERN.test(value);

const normalizePayload = (payload) => {
  if (
    !payload ||
    payload.version !== 1 ||
    !isValidText(payload.title) ||
    !isValidText(payload.body) ||
    !isValidId(payload.projectId) ||
    !isValidId(payload.conversationId) ||
    !isValidId(payload.messageId)
  ) {
    return FALLBACK_NOTIFICATION;
  }

  return {
    title: payload.title,
    body: payload.body,
    tag: `boards-chat-${payload.conversationId}`,
    data: {
      projectId: payload.projectId,
      conversationId: payload.conversationId,
      messageId: payload.messageId,
    },
    replyActionLabel: isValidText(payload.replyActionLabel)
      ? payload.replyActionLabel
      : null,
  };
};

const showPushNotification = async (event) => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    payload = null;
  }

  const notification = normalizePayload(payload);
  const options = {
    body: notification.body,
    data: notification.data,
    icon: "/logo192.png",
    badge: "/logo192.png",
    renotify: true,
    tag: notification.tag,
  };

  if (self.Notification?.maxActions > 0 && notification.replyActionLabel) {
    options.actions = [
      { action: "reply", title: notification.replyActionLabel },
    ];
  }

  await self.registration.showNotification(notification.title, options);
};

const makeNotificationUrl = (data, isReply) => {
  if (
    !data ||
    !isValidId(data.projectId) ||
    !isValidId(data.conversationId) ||
    !isValidId(data.messageId)
  ) {
    return new URL("/", self.location.origin).href;
  }

  const path = `/projects/${data.projectId}`;
  const query = new URLSearchParams({
    chatConversation: data.conversationId,
    chatMessage: data.messageId,
  });
  if (isReply) {
    query.set("reply", "1");
  }

  return new URL(`${path}?${query.toString()}`, self.location.origin).href;
};

const openNotification = async (event) => {
  event.notification.close();
  const targetUrl = makeNotificationUrl(
    event.notification.data,
    event.action === "reply",
  );
  const windows = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });
  const existingWindow = windows.find((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  if (existingWindow) {
    if (typeof existingWindow.navigate === "function") {
      await existingWindow.navigate(targetUrl);
    }
    await existingWindow.focus();
    return;
  }

  await self.clients.openWindow(targetUrl);
};

self.addEventListener("push", (event) => {
  event.waitUntil(showPushNotification(event));
});

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(openNotification(event));
});
