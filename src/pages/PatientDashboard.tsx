import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, X, MessageCircle, Lock, LogOut, Stethoscope } from "lucide-react";
import AppointmentScheduler from "@/components/AppointmentScheduler";
import AIChat from "@/components/AIChat";
import MyAppointments from "@/components/MyAppointments";
import PatientNotifications from "@/components/PatientNotifications";
import PushNotificationBanner from "@/components/PushNotificationBanner";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState<"home" | "schedule" | "appointments" | "chat">("home");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/register");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      if (profile) setUserName(profile.name);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/register");
  };

  const firstName = userName.split(" ")[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-primary px-5 pt-6 pb-8 rounded-b-[1.5rem]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary-foreground" />
            <span className="text-primary-foreground font-bold text-lg">Saúde Inteligente</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/doctor-login")}
              className="w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center"
              title="Painel Médico"
            >
              <Stethoscope className="w-4 h-4 text-primary-foreground" />
            </button>
            <button
              onClick={() => navigate("/executive-login")}
              className="w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center"
              title="Painel Executivo"
            >
              <Lock className="w-4 h-4 text-primary-foreground" />
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
        <h2 className="text-primary-foreground text-xl font-semibold">
          Olá, {firstName || "Paciente"} 👋
        </h2>
        <p className="text-primary-foreground/70 text-sm mt-1">
          Clínica Gaza — Xai-Xai • Como podemos ajudar hoje?
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Push notification banner & notifications on home */}
        {activeTab === "home" && <PushNotificationBanner />}
        {activeTab === "home" && <PatientNotifications />}

        {activeTab === "home" && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            <button
              onClick={() => setActiveTab("schedule")}
              className="bg-card rounded-2xl p-6 shadow-card flex flex-col items-center gap-3 hover:shadow-elevated transition-shadow"
            >
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
                <Calendar className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Agendar Consulta</span>
            </button>

            <button
              onClick={() => setActiveTab("appointments")}
              className="bg-card rounded-2xl p-6 shadow-card flex flex-col items-center gap-3 hover:shadow-elevated transition-shadow"
            >
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                <X className="w-7 h-7 text-accent-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Minhas Consultas</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className="bg-card rounded-2xl p-6 shadow-card flex flex-col items-center gap-3 hover:shadow-elevated transition-shadow col-span-2"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-accent-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Assistente Virtual</span>
              <span className="text-xs text-muted-foreground">Fale com nosso assistente de IA</span>
            </button>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="animate-slide-up">
            <Button variant="ghost" onClick={() => setActiveTab("home")} className="mb-4">
              ← Voltar
            </Button>
            <AppointmentScheduler userName={userName} onDone={() => setActiveTab("appointments")} />
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="animate-slide-up">
            <Button variant="ghost" onClick={() => setActiveTab("home")} className="mb-4">
              ← Voltar
            </Button>
            <MyAppointments />
          </div>
        )}

        {activeTab === "chat" && (
          <div className="animate-slide-up flex flex-col h-[calc(100vh-220px)]">
            <Button variant="ghost" onClick={() => setActiveTab("home")} className="mb-2 self-start">
              ← Voltar
            </Button>
            <AIChat userName={userName} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
