"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ZALO_PATH = "/dashboard/zalo";

export interface ZaloActionResult {
  success: boolean;
  message: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function unlinkZaloAction(
  linkId: string
): Promise<ZaloActionResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }
  if (!isUuid(linkId)) {
    return { success: false, message: "Liên kết không hợp lệ." };
  }

  const { data, error } = await supabase
    .from("zalo_room_links")
    .delete()
    .eq("id", linkId)
    .eq("account_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "Không thể gỡ liên kết Zalo." };
  }

  revalidatePath(ZALO_PATH);
  return { success: true, message: "Đã gỡ liên kết Zalo khỏi hợp đồng." };
}

