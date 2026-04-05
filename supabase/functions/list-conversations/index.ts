import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (sessionId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("session_id, role, content, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const sessions = new Map<string, { messages: number; lastMsg: string; firstMsg: string; lastContent: string; roles: { user: number; assistant: number } }>();
    
    for (const row of data || []) {
      const s = sessions.get(row.session_id);
      if (!s) {
        sessions.set(row.session_id, {
          messages: 1,
          lastMsg: row.created_at,
          firstMsg: row.created_at,
          lastContent: row.content?.slice(0, 50) || "",
          roles: { user: row.role === "user" ? 1 : 0, assistant: row.role === "assistant" ? 1 : 0 },
        });
      } else {
        s.messages++;
        if (row.created_at < s.firstMsg) s.firstMsg = row.created_at;
        if (row.created_at > s.lastMsg) {
          s.lastMsg = row.created_at;
          s.lastContent = row.content?.slice(0, 50) || "";
        }
        if (row.role === "user") s.roles.user++;
        else s.roles.assistant++;
      }
    }

    const result = Array.from(sessions.entries())
      .map(([id, s]) => ({ sessionId: id, ...s }))
      .sort((a, b) => b.lastMsg.localeCompare(a.lastMsg));

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("list-conversations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
