import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader, Avatar } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — CiteVerify AI" }, { name: "description", content: "Your display name and avatar." }] }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const { data } = useQuery(profileQuery(user?.id));
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data?.displayName) setName(data.displayName); }, [data?.displayName]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.trim().slice(0, 80) });
    if (error) toast.error("Couldn't save."); else { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); }
  }

  async function upload(file: File | undefined) {
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) { toast.error("Choose an image under 2 MB."); return; }
    setBusy(true);
    const path = `${user.id}/avatar-${Date.now()}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (!up.error) await supabase.from("profiles").upsert({ id: user.id, avatar_url: path });
    setBusy(false);
    if (up.error) toast.error("Upload failed."); else { toast.success("Avatar updated"); qc.invalidateQueries({ queryKey: ["profile"] }); }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 pb-24 pt-32">
        <h1 className="font-display text-5xl">Profile</h1>
        <div className="glass mt-8 space-y-6 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <Avatar src={data?.avatar} name={name || user?.email || "?"} size={64} />
            <label className="cursor-pointer rounded-full border px-4 py-2 text-sm hover:border-primary">
              {busy ? "Uploading…" : "Change avatar"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </div>
          <form onSubmit={saveName} className="space-y-3">
            <label htmlFor="dn" className="text-sm font-medium">Display name</label>
            <input id="dn" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="w-full rounded-xl border bg-background/60 p-3 text-sm outline-none focus:border-primary" />
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Save</button>
          </form>
        </div>
      </main>
    </div>
  );
}
