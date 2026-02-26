import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

const DoctorLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from("doctors").select("id, name, specialty").eq("available", true).order("name");
      if (data) setDoctors(data as Doctor[]);
    };
    fetchDoctors();
  }, []);

  const handleLogin = () => {
    const doc = doctors.find((d) => d.id === selectedId);
    if (!doc) {
      toast({ title: "Selecione um médico", variant: "destructive" });
      return;
    }
    sessionStorage.setItem("doctor_name", doc.name);
    navigate("/doctor");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-primary py-10 px-6 rounded-b-[2rem]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary-foreground/70 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <Stethoscope className="w-8 h-8 text-primary-foreground" />
          <h1 className="text-xl font-bold text-primary-foreground">Painel Médico</h1>
        </div>
        <p className="text-primary-foreground/60 text-sm mt-1">Selecione o seu perfil para acessar</p>
      </div>

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full animate-fade-in space-y-4">
        <div className="space-y-2">
          <Label>Médico</Label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
          >
            <option value="">Selecione o seu nome</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.specialty}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleLogin} className="w-full h-12 gradient-primary border-0 text-primary-foreground font-semibold">
          Acessar Painel
        </Button>
      </div>
    </div>
  );
};

export default DoctorLogin;
