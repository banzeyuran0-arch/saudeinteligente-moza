import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LogOut, Activity, Calendar, Stethoscope, Users, BarChart3, MessageSquare } from "lucide-react";
import DashboardStats from "@/components/executive/DashboardStats";
import DoctorManagement from "@/components/executive/DoctorManagement";
import PatientManagement from "@/components/executive/PatientManagement";
import AppointmentCalendar from "@/components/executive/AppointmentCalendar";
import ReportsAndBilling from "@/components/executive/ReportsAndBilling";
import ClinicUpdates from "@/components/executive/ClinicUpdates";

type Tab = "dashboard" | "appointments" | "doctors" | "patients" | "reports" | "updates";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: Activity },
  { key: "appointments", label: "Consultas", icon: Calendar },
  { key: "doctors", label: "Médicos", icon: Stethoscope },
  { key: "patients", label: "Pacientes", icon: Users },
  { key: "reports", label: "Relatórios", icon: BarChart3 },
  { key: "updates", label: "Avisos", icon: MessageSquare },
];

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState({ today: 0, scheduled: 0, completed: 0, cancelled: 0, patients: 0, doctors: 0 });

  useEffect(() => {
    if (sessionStorage.getItem("exec_auth") !== "true") {
      navigate("/executive-login");
      return;
    }
    fetchStats();
    const ch = supabase
      .channel("exec-stats-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [navigate]);

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [{ data: apts }, { data: patients }, { data: docs }] = await Promise.all([
      supabase.from("appointments").select("date, status"),
      supabase.from("profiles").select("id"),
      supabase.from("doctors").select("id"),
    ]);
    if (apts) {
      setStats({
        today: apts.filter((a: any) => a.date === today).length,
        scheduled: apts.filter((a: any) => a.status === "scheduled").length,
        completed: apts.filter((a: any) => a.status === "completed").length,
        cancelled: apts.filter((a: any) => a.status === "cancelled").length,
        patients: patients?.length || 0,
        doctors: docs?.length || 0,
      });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("exec_auth");
    navigate("/executive-login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary-foreground" />
          <h1 className="text-lg font-bold text-primary-foreground">Painel Executivo</h1>
        </div>
        <button onClick={handleLogout} className="text-primary-foreground/70 hover:text-primary-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs - scrollable */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            <DashboardStats
              todayCount={stats.today}
              scheduledCount={stats.scheduled}
              completedCount={stats.completed}
              cancelledCount={stats.cancelled}
              totalPatients={stats.patients}
              totalDoctors={stats.doctors}
            />
            <AppointmentCalendar />
          </div>
        )}
        {activeTab === "appointments" && <AppointmentCalendar />}
        {activeTab === "doctors" && <DoctorManagement />}
        {activeTab === "patients" && <PatientManagement />}
        {activeTab === "reports" && <ReportsAndBilling />}
        {activeTab === "updates" && <ClinicUpdates />}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
