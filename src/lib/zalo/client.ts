type ZaloBotResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

function botApiUrl(method: string) {
  const botToken = process.env.ZALO_BOT_TOKEN;
  if (!botToken) {
    throw new Error("Server chưa cấu hình ZALO_BOT_TOKEN.");
  }

  return `https://bot-api.zaloplatforms.com/bot${botToken}/${method}`;
}

export async function sendZaloText(chatId: string, text: string) {
  console.log(
    JSON.stringify({
      level: "info",
      message: "zalo_send_started",
      chatIdSuffix: chatId.slice(-6),
      textLength: text.length,
    })
  );
  const response = await fetch(botApiUrl("sendMessage"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 2000),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Zalo gửi tin thất bại: HTTP ${response.status}.`);
  }

  const body = (await response.json()) as ZaloBotResponse<{
    message_id: string;
    date: number;
  }>;
  if (!body.ok) {
    throw new Error(
      body.description ||
        `Zalo gửi tin thất bại${body.error_code ? ` (${body.error_code})` : ""}.`
    );
  }

  console.log(
    JSON.stringify({
      level: "info",
      message: "zalo_send_succeeded",
      chatIdSuffix: chatId.slice(-6),
      messageId: body.result?.message_id,
    })
  );
  return body.result;
}

export async function sendZaloPhoto(
  chatId: string,
  photo: string,
  caption?: string
) {
  const response = await fetch(botApiUrl("sendPhoto"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      ...(caption ? { caption: caption.slice(0, 2000) } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Zalo gửi ảnh thất bại: HTTP ${response.status}.`);
  }

  const body = (await response.json()) as ZaloBotResponse<{
    message_id: string;
    date: number;
  }>;
  if (!body.ok) {
    throw new Error(
      body.description ||
        `Zalo gửi ảnh thất bại${body.error_code ? ` (${body.error_code})` : ""}.`
    );
  }
  return body.result;
}
