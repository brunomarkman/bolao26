import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "missing code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: bolao } = await supabase
      .from("boloes")
      .select("id, nickname, bet_value, status, invite_code, competition_id, created_by")
      .eq("invite_code", code.toUpperCase())
      .maybeSingle();

    if (!bolao) {
      return new Response(JSON.stringify({ notFound: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let competition = null;
    if (bolao.competition_id) {
      const { data: comp } = await supabase
        .from("competitions")
        .select("name, year, start_date, end_date, total_clubs, format")
        .eq("id", bolao.competition_id)
        .maybeSingle();
      competition = comp;
    }

    const { data: managerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", bolao.created_by)
      .maybeSingle();

    const { count } = await supabase
      .from("bolao_participants")
      .select("*", { count: "exact", head: true })
      .eq("bolao_id", bolao.id);

    return new Response(JSON.stringify({
      id: bolao.id,
      nickname: bolao.nickname,
      bet_value: Number(bolao.bet_value),
      status: bolao.status,
      invite_code: bolao.invite_code,
      competition_id: bolao.competition_id,
      competition,
      managerName: managerProfile?.name ?? null,
      participantCount: count ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
