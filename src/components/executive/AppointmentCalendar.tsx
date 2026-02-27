import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle, RefreshCw,
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

type ViewMode = "day" | "week" | "month";

const AppointmentCalendar = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prices, setPrices] = useState<{ doctor_id: string; price: number }[]>([]);
  const [view, setView] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchAppointments();
    const ch = supabase
      .channel("calendar-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAppointments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAppointments = async () => {
    const [{ data }, { data: p }] = await Promise.all([
      supabase.from("appointments").select("*").order("date").order("time"),
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
    else toast({ title: "Erro ao reagendar", variant: "destructive" });
  };

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getFilteredAppointments = () => {
    const cur = formatDate(currentDate);
    if (view === "day") {
      return appointments.filter((a) => a.date === cur);
    }
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return appointments.filter((a) => a.date >= formatDate(start) && a.date <= formatDate(end));
    }
    // month
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    return appointments.filter((a) => a.date.startsWith(`${y}-${m}`));
  };

  const filtered = getFilteredAppointments();

  const getDateLabel = () => {
    if (view === "day") return currentDate.toLocaleDateString("pt-MZ", { weekday: "long", day: "numeric", month: "long" });
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("pt-MZ", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("pt-MZ", { day: "numeric", month: "short" })}`;
    }
    return currentDate.toLocaleDateString("pt-MZ", { month: "long", year: "numeric" });
  };

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

  // Group by date for week/month view
  const groupByDate = () => {
    const groups: Record<string, Appointment[]> = {};
    filtered.forEach((a) => {
      if (!groups[a.date]) groups[a.date] = [];
      groups[a.date].push(a);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Consultas
        </h3>
        <div className="flex gap-1">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${view === v ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-card rounded-xl p-3 shadow-card">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-foreground capitalize">{getDateLabel()}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} consulta(s)</p>
        </div>
        <button onClick={() => navigate(1)}>
          <ChevronRight className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {view === "day" ? (
        <div className="space-y-2">
          {filtered.sort((a, b) => a.time.localeCompare(b.time)).map((apt) => (
            <div key={apt.id} className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{apt.patient_name}</p>
                  <p className="text-xs text-muted-foreground">{apt.doctor_name} • {apt.time}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle(apt.status)}`}>
                  {statusLabel(apt.status)}
                </span>
              </div>
              {apt.status === "scheduled" && (
                <div className="flex gap-2 mt-3 justify-end">
                  <Button size="sm" onClick={() => completeAppointment(apt)} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" /> Concluir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rescheduleAppointment(apt.id)} className="h-7 text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" /> Reagendar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cancelAppointment(apt.id)} className="text-destructive border-destructive/30 h-7 text-xs">
                    <XCircle className="w-3 h-3 mr-1" /> Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma consulta neste dia</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {groupByDate().map(([date, apts]) => (
            <div key={date}>
              <p className="text-sm font-semibold text-foreground mb-2 capitalize">
                {new Date(date + "T00:00:00").toLocaleDateString("pt-MZ", { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-2 ml-2 border-l-2 border-primary/20 pl-3">
                {apts.sort((a, b) => a.time.localeCompare(b.time)).map((apt) => (
                  <div key={apt.id} className="bg-card rounded-xl p-3 shadow-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{apt.time} — {apt.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{apt.doctor_name}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle(apt.status)}`}>
                        {statusLabel(apt.status)}
                      </span>
                    </div>
                    {apt.status === "scheduled" && (
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button size="sm" onClick={() => completeAppointment(apt)} className="bg-green-600 hover:bg-green-700 text-white h-6 text-xs px-2">
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rescheduleAppointment(apt.id)} className="h-6 text-xs px-2">
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => cancelAppointment(apt.id)} className="text-destructive border-destructive/30 h-6 text-xs px-2">
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma consulta neste período</p>}
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;
