"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedClient } from "@/lib/server/auth";
import { isUuid } from "@/lib/server/action-utils";
import type { ServerActionResult } from "@/lib/server/action-result";

const ZALO_PATH = "/dashboard/zalo";

export type ZaloActionResult = ServerActionResult;

export async function unlinkZaloAction(
  linkId: string
): Promise<ZaloActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
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
