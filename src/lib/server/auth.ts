import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Tạo Supabase client theo cookie hiện tại và xác thực lại người dùng.
 * Server Actions dùng helper này thay vì tin dữ liệu gửi từ trình duyệt.
 */
export async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : data.user,
  };
}
