import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const profileQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      let avatar: string | null = null;
      if (data?.avatar_url) {
        if (/^https?:\/\//.test(data.avatar_url)) avatar = data.avatar_url;
        else avatar = (await supabase.storage.from("avatars").createSignedUrl(data.avatar_url, 3600)).data?.signedUrl ?? null;
      }
      return { displayName: data?.display_name ?? null, avatarPath: data?.avatar_url ?? null, avatar };
    },
  });
