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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // 1. Find appointments happening within the next 2 hours that don't have a reminder yet
    const { data: appointments } = await sb
      .from("appointments")
      .select("*")
      .eq("status", "scheduled")
      .eq("date", todayStr);

    if (appointments) {
      for (const apt of appointments) {
        const aptDateTime = new Date(`${apt.date}T${apt.time}:00`);
        const diffMs = aptDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // If within 2 hours and not past
        if (diffHours > 0 && diffHours <= 2) {
          // Check if reminder already exists
          const { data: existing } = await sb
            .from("notifications")
            .select("id")
            .eq("appointment_id", apt.id)
            .eq("type", "reminder")
            .limit(1);

          if (!existing || existing.length === 0) {
            const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
            const message = `Lembrete: Sua consulta com ${apt.doctor_name} é hoje às ${apt.time}. Confirma a sua presença?`;
            
            await sb.from("notifications").insert({
              patient_id: apt.patient_id,
              appointment_id: apt.id,
              message,
              type: "reminder",
              expires_at: expiresAt.toISOString(),
            });

            // Send push notification to patient
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  userId: apt.patient_id,
                  title: "🩺 Lembrete de Consulta",
                  body: `Consulta com ${apt.doctor_name} às ${apt.time}. Abra o app para confirmar.`,
                  tag: `reminder-${apt.id}`,
                  url: "/dashboard",
                }),
              });
            } catch (pushErr) {
              console.error("Failed to send push:", pushErr);
            }
          }
        }
      }
    }

    // 2. Auto-cancel appointments where reminder expired (30 min) without response
    const { data: expiredNotifs } = await sb
      .from("notifications")
      .select("*")
      .eq("type", "reminder")
      .eq("responded", false)
      .lt("expires_at", now.toISOString());

    if (expiredNotifs) {
      for (const notif of expiredNotifs) {
        // Cancel the appointment
        await sb
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", notif.appointment_id)
          .eq("status", "scheduled");

        // Mark notification as responded with auto-cancel
        await sb
          .from("notifications")
          .update({ responded: true, response: "auto_cancelled" })
          .eq("id", notif.id);

        // Create a cancellation notification
        await sb.from("notifications").insert({
          patient_id: notif.patient_id,
          appointment_id: notif.appointment_id,
          message: `Sua consulta foi cancelada automaticamente porque não houve confirmação dentro de 30 minutos.`,
          type: "auto_cancel",
          responded: true,
          response: "info",
        });

        // Send push about auto-cancellation
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              userId: notif.patient_id,
              title: "❌ Consulta Cancelada",
              body: "Sua consulta foi cancelada automaticamente por falta de confirmação.",
              tag: `cancel-${notif.appointment_id}`,
              url: "/dashboard",
            }),
          });
        } catch (pushErr) {
          console.error("Failed to send cancel push:", pushErr);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-reminders error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
