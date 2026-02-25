import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  appointment_id: string;
  message: string;
  type: string;
  responded: boolean;
  response: string | null;
  created_at: string;
  expires_at: string | null;
}

const PatientNotifications = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("patient-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchNotifications())
      .subscribe();

    // Poll check-reminders every 60s
    const interval = setInterval(async () => {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-reminders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
      } catch {}
    }, 60000);

    // Trigger once on mount
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }).catch(() => {});

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const respondToReminder = async (notifId: string, confirm: boolean) => {
    if (confirm) {
      await supabase
        .from("notifications")
        .update({ responded: true, response: "confirmed" })
        .eq("id", notifId);
      toast({ title: "Presença confirmada ✅" });
    } else {
      // Get the notification to find appointment_id
      const notif = notifications.find((n) => n.id === notifId);
      if (notif) {
        await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", notif.appointment_id);
      }
      await supabase
        .from("notifications")
        .update({ responded: true, response: "declined" })
        .eq("id", notifId);
      toast({ title: "Consulta cancelada" });
    }
    fetchNotifications();
  };

  const pendingReminders = notifications.filter((n) => n.type === "reminder" && !n.responded);
  const otherNotifs = notifications.filter((n) => n.type !== "reminder" || n.responded);

  if (pendingReminders.length === 0 && otherNotifs.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {pendingReminders.length > 0 && (
        <div className="space-y-2">
          {pendingReminders.map((notif) => (
            <div
              key={notif.id}
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-card animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">{notif.message}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Responda em 30 minutos ou a consulta será cancelada automaticamente.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => respondToReminder(notif.id, true)}
                      className="gradient-primary border-0 text-primary-foreground"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToReminder(notif.id, false)}
                      className="text-destructive border-destructive/30"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {otherNotifs.filter((n) => n.type === "auto_cancel").map((notif) => (
        <div
          key={notif.id}
          className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 animate-fade-in"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{notif.message}</p>
          </div>
        </div>
      ))}

      {otherNotifs.filter((n) => n.type === "reminder" && n.response === "confirmed").map((notif) => (
        <div
          key={notif.id}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-fade-in"
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-primary">Presença confirmada para esta consulta.</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PatientNotifications;
