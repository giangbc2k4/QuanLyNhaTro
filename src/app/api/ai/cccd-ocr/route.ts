import { NextResponse } from "next/server";
import {
  AiGatewayError,
  extractCccdFromImages,
} from "@/lib/ai/gateway";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateImage(file: File | null, label: string) {
  if (!file) return `Thiếu ảnh CCCD ${label}.`;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `Ảnh ${label} phải là JPEG, PNG hoặc WebP.`;
  }
  if (file.size > MAX_IMAGE_SIZE) return `Ảnh ${label} vượt quá 2 MB.`;
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError || !data.user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để dùng tính năng đọc CCCD." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const frontValue = formData.get("front");
  const backValue = formData.get("back");
  const front = frontValue instanceof File ? frontValue : null;
  const back = backValue instanceof File ? backValue : null;
  const validationError =
    validateImage(front, "mặt trước") ?? validateImage(back, "mặt sau");

  if (validationError || !front || !back) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const [frontBytes, backBytes] = await Promise.all([
    front.arrayBuffer(),
    back.arrayBuffer(),
  ]);

  try {
    const result = await extractCccdFromImages(
      {
        mimeType: front.type,
        data: Buffer.from(frontBytes).toString("base64"),
      },
      {
        mimeType: back.type,
        data: Buffer.from(backBytes).toString("base64"),
      }
    );

    return NextResponse.json({
      data: result.data,
      meta: { provider: result.provider, model: result.model },
    });
  } catch (error) {
    if (error instanceof AiGatewayError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Không thể kết nối tới dịch vụ AI." },
      { status: 502 }
    );
  }
}
