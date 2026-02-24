import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Calendar, XCircle, CheckCircle, Clock, Send, LogOut, Activity, MessageSquare,
} from "lucide-react";

interface Appointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  date: string;
  time: string;
  status: string;
  created_at: string;
}

interface ClinicUpdate {
  id: string;
  message: string;
  created_at: string;
}

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [updates, setUpdates] = useState<ClinicUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "updates">("dashboard");

  useEffect(() => {
    if (sessionStorage.getItem("exec_auth") !== "true") {
      navigate("/executive-login");
      return;
    }
    fetchData();

    // Realtime
    const channel = supabase
      .channel("exec-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_updates" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const fetchData = async () => {
    const { data: apts } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (apts) setAppointments(apts as Appointment[]);

    const { data: upd } = await supabase
      .from("clinic_updates")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (upd) setUpdates(upd as ClinicUpdate[]);
  };

  const sendUpdate = async () => {
    if (!newUpdate.trim()) return;
    const { error } = await supabase.from("clinic_updates").insert({ message: newUpdate.trim() });
    if (error) {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } else {
      toast({ title: "Atualização enviada ✅" });
      setNewUpdate("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("exec_auth");
    navigate("/executive-login");
  };

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter((a) => a.date === today);
  const scheduled = appointments.filter((a) => a.status === "scheduled");
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary-foreground" />
          <h1 className="text-lg font-bold text-primary-foreground">Painel Executivo</h1>
        </div>
        <button onClick={handleLogout} className="text-primary-foreground/70 hover:text-primary-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
            activeTab === "dashboard" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          <Activity className="w-4 h-4 inline mr-1" /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab("updates")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
            activeTab === "updates" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-1" /> Atualizações
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-4 shadow-card text-center">
                <Calendar className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{todayAppointments.length}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card text-center">
                <CheckCircle className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{scheduled.length}</p>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card text-center">
                <XCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{cancelled.length}</p>
                <p className="text-xs text-muted-foreground">Canceladas</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Atividade Recente
              </h3>
              <div className="space-y-2">
                {appointments.slice(0, 10).map((apt) => (
                  <div key={apt.id} className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{apt.patient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {apt.doctor_name} • {new Date(apt.date + "T00:00:00").toLocaleDateString("pt-MZ")} às {apt.time}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        apt.status === "scheduled"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {apt.status === "scheduled" ? "Agendada" : "Cancelada"}
                    </span>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhuma atividade ainda</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "updates" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-foreground">
              Atualizações da Clínica
            </h3>
            <p className="text-sm text-muted-foreground">
              Insira avisos que serão sincronizados com o assistente do paciente.
            </p>

            <div className="flex gap-2">
              <Input
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Ex: Hoje o Dr. Hernandes não estará presente."
                onKeyDown={(e) => e.key === "Enter" && sendUpdate()}
                className="flex-1"
              />
              <Button onClick={sendUpdate} className="gradient-primary border-0 text-primary-foreground">
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 mt-4">
              {updates.map((u) => (
                <div key={u.id} className="bg-card rounded-xl p-4 shadow-card">
                  <p className="text-sm text-foreground">{u.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(u.created_at).toLocaleString("pt-MZ")}
                  </p>
                </div>
              ))}
              {updates.length === 0 && (
                <p className="text-center text-muted-foreground py-6">Nenhuma atualização</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
