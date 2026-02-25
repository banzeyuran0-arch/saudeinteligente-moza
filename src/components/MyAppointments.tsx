import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, X, CheckCircle } from "lucide-react";

interface Appointment {
  id: string;
  doctor_name: string;
  date: string;
  time: string;
  status: string;
}

const MyAppointments = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const fetchAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", user.id)
      .order("date", { ascending: true });
    if (data) setAppointments(data as Appointment[]);
  };

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel("my-appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAppointments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    } else {
      toast({ title: "Consulta cancelada" });
      fetchAppointments();
    }
  };

  const scheduled = appointments.filter((a) => a.status === "scheduled");
  const completed = appointments.filter((a) => a.status === "completed");
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Minhas Consultas</h3>

      {scheduled.length === 0 && cancelled.length === 0 && completed.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma consulta encontrada</p>
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-primary">Agendadas</p>
          {scheduled.map((apt) => (
            <div key={apt.id} className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{apt.doctor_name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(apt.date + "T00:00:00").toLocaleDateString("pt-MZ")} às {apt.time}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelAppointment(apt.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-semibold text-primary flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Concluídas
          </p>
          {completed.map((apt) => (
            <div key={apt.id} className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{apt.doctor_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(apt.date + "T00:00:00").toLocaleDateString("pt-MZ")} às {apt.time}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-primary/10 text-primary">
                  Concluída ✅
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelled.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-semibold text-muted-foreground">Canceladas</p>
          {cancelled.map((apt) => (
            <div key={apt.id} className="bg-muted rounded-xl p-4 opacity-60">
              <p className="font-semibold text-foreground line-through">{apt.doctor_name}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(apt.date + "T00:00:00").toLocaleDateString("pt-MZ")} às {apt.time}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
