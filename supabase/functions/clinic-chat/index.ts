import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, patientName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch clinic updates and doctors
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: updates } = await sb.from("clinic_updates").select("message, created_at").eq("active", true).order("created_at", { ascending: false }).limit(10);
    const { data: doctors } = await sb.from("doctors").select("name, specialty, available");

    const updatesContext = updates?.length
      ? `\nAVISOS ATUAIS DA CLÍNICA:\n${updates.map((u: any) => `- ${u.message}`).join("\n")}`
      : "";

    const doctorsContext = doctors?.length
      ? `\nMÉDICOS DISPONÍVEIS:\n${doctors.map((d: any) => `- ${d.name} (${d.specialty}) - ${d.available ? "Disponível" : "Indisponível"}`).join("\n")}`
      : "";

    const systemPrompt = `Você é o assistente virtual da clínica Saúde Inteligente 2.0, localizada em Maputo, Moçambique.
O nome do paciente é: ${patientName}.

REGRAS:
- Sempre cumprimente o paciente pelo primeiro nome.
- Seja simpático, claro e direto.
- Não repita respostas.
- Use linguagem acessível e adaptada à realidade de Moçambique.
- Quando o paciente descrever sintomas, sugira médicos especialistas da lista abaixo.
- Se um médico está indisponível conforme os avisos, informe o paciente e sugira alternativas.
- Pode ajudar com informações sobre agendamento, horários, e cuidados básicos de saúde.
- Respostas curtas e úteis. Não faça diagnósticos médicos.
${doctorsContext}
${updatesContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no assistente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
