import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Stethoscope, LogOut, Calendar, CheckCircle, XCircle, Clock, RefreshCw, Activity,
} from "lucide-react";

interface Appointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  doctor_id: string;
  date: string;
  time: string;
  status: string;
}

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prices, setPrices] = useState<{ doctor_id: string; price: number }[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [view, setView] = useState<"today" | "all">("today");

  useEffect(() => {
    const name = sessionStorage.getItem("doctor_name");
    if (!name) {
      navigate("/doctor-login");
      return;
    }
    setDoctorName(name);
    fetchAppointments(name);

    const ch = supabase
      .channel("doctor-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAppointments(name))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [navigate]);

  const fetchAppointments = async (name: string) => {
    const [{ data }, { data: p }] = await Promise.all([
      supabase.from("appointments").select("*").eq("doctor_name", name).order("date").order("time"),
      supabase.from("consultation_prices").select("doctor_id, price"),
    ]);
    if (data) setAppointments(data as Appointment[]);
    if (p) setPrices(p as { doctor_id: string; price: number }[]);
  };

  const completeAppointment = async (apt: Appointment) => {
    const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", apt.id);
    if (!error) {
      const p = prices.find((pr) => pr.doctor_id === apt.doctor_id);
      const priceStr = p ? ` • +${Number(p.price).toLocaleString("pt-MZ")} MT` : "";
      toast({ title: `Consulta concluída ✅${priceStr}` });
    }
  };

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (!error) toast({ title: "Consulta cancelada" });
  };

  const rescheduleAppointment = async (id: string) => {
    const newDate = prompt("Nova data (AAAA-MM-DD):");
    const newTime = prompt("Novo horário (HH:MM):");
    if (!newDate || !newTime) return;
    const { error } = await supabase.from("appointments").update({ date: newDate, time: newTime, status: "scheduled" }).eq("id", id);
    if (!error) toast({ title: "Consulta reagendada ✅" });
  };

  const handleLogout = () => {
    sessionStorage.removeItem("doctor_name");
    navigate("/doctor-login");
  };

  const today = new Date().toISOString().split("T")[0];
  const displayed = view === "today"
    ? appointments.filter((a) => a.date === today)
    : appointments;

  const todayScheduled = appointments.filter((a) => a.date === today && a.status === "scheduled").length;
  const todayCompleted = appointments.filter((a) => a.date === today && a.status === "completed").length;

  const statusLabel = (s: string) => {
    if (s === "scheduled") return "Agendada";
    if (s === "completed") return "Concluída";
    if (s === "cancelled") return "Cancelada";
    return s;
  };

  const statusStyle = (s: string) => {
    if (s === "scheduled") return "bg-primary/10 text-primary";
    if (s === "completed") return "bg-green-100 text-green-700";
    return "bg-destructive/10 text-destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-primary px-6 py-5 rounded-b-[1.5rem]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-6 h-6 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">Painel Médico</h1>
          </div>
          <button onClick={handleLogout} className="text-primary-foreground/70 hover:text-primary-foreground">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <p className="text-primary-foreground/80 text-sm">Olá, {doctorName} 👋</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{todayScheduled}</p>
            <p className="text-xs text-muted-foreground">Pendentes Hoje</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{todayCompleted}</p>
            <p className="text-xs text-muted-foreground">Concluídas Hoje</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <Activity className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex gap-2">
          <button onClick={() => setView("today")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${view === "today" ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            Hoje
          </button>
          <button onClick={() => setView("all")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${view === "all" ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            Todas
          </button>
        </div>

        {/* Appointment list */}
        <div className="space-y-2">
          {displayed.map((apt) => (
            <div key={apt.id} className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{apt.patient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(apt.date + "T00:00:00").toLocaleDateString("pt-MZ")} às {apt.time}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle(apt.status)}`}>
                  {statusLabel(apt.status)}
                </span>
              </div>
              {apt.status === "scheduled" && (
                <div className="flex gap-2 mt-3 justify-end">
                  <Button size="sm" onClick={() => completeAppointment(apt)} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Concluir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rescheduleAppointment(apt.id)} className="h-8 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reagendar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cancelAppointment(apt.id)} className="text-destructive border-destructive/30 h-8 text-xs">
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
          {displayed.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma consulta {view === "today" ? "para hoje" : ""}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
