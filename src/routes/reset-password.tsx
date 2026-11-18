import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — CiteVerify AI" },
      { name: "description", content: "Choose a new password for your CiteVerify AI account." },
      { property: "og:title", content: "Set a new password — CiteVerify AI" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="grid min-h-screen place-items-center bg-hero px-4">
      <form onSubmit={save} className="glass w-full max-w-sm space-y-4 rounded-2xl p-7">
        <h1 className="font-display text-4xl">New password</h1>
        <input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" aria-label="New password" className="w-full rounded-xl border bg-background/60 p-3 text-sm outline-none focus:border-primary" />
        <button className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground">Update password</button>
      </form>
    </div>
  );
}
