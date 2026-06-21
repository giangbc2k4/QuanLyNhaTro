import {
  handleZaloWebhookGet,
  handleZaloWebhookPost,
} from "@/lib/zalo/webhook-handler";

export const runtime = "nodejs";
export const GET = handleZaloWebhookGet;
export const POST = handleZaloWebhookPost;
