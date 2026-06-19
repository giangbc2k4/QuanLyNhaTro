export async function sendZaloText(userId: string, text: string) {
  const botToken =
    process.env.ZALO_BOT_TOKEN || process.env.ZALO_OA_ACCESS_TOKEN;
  const endpoint = process.env.ZALO_SEND_MESSAGE_URL;
  if (!botToken || !endpoint) {
    console.warn(
      "Zalo message skipped: missing ZALO_BOT_TOKEN or ZALO_SEND_MESSAGE_URL."
    );
    return;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Zalo gửi tin thất bại: HTTP ${response.status}`);
  }
}
