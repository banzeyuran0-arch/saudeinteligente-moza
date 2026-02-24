import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
}

interface Props {
  userName: string;
  onDone: () => void;
}

const AppointmentScheduler = ({ userName, onDone }: Props) => {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from("doctors").select("*").eq("available", true);
      if (data) setDoctors(data as Doctor[]);
    };
    fetchDoctors();
  }, []);

  const handleSchedule = async () => {
    if (!selectedDoctor || !date || !time) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("appointments").insert({
        patient_id: user.id,
        doctor_id: selectedDoctor.id,
        patient_name: userName,
        doctor_name: selectedDoctor.name,
        date,
        time,
        status: "scheduled",
      });
      if (error) throw error;

      toast({ title: "Consulta agendada com sucesso! ✅" });
      onDone();
    } catch (err: any) {
      toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-foreground">Agendar Consulta</h3>

      {/* Doctor Selection */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Escolher Médico
        </Label>
        <div className="grid gap-2">
          {doctors.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoctor(doc)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedDoctor?.id === doc.id
                  ? "border-primary bg-primary/5 shadow-card"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <p className="font-semibold text-foreground">{doc.name}</p>
              <p className="text-sm text-muted-foreground">{doc.specialty}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date" className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Data
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Time */}
      <div className="space-y-2">
        <Label htmlFor="time" className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Horário
        </Label>
        <Input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <Button
        onClick={handleSchedule}
        disabled={loading}
        className="w-full h-12 gradient-primary border-0 text-primary-foreground font-semibold"
      >
        {loading ? "Agendando..." : "Confirmar Agendamento"}
      </Button>
    </div>
  );
};

export default AppointmentScheduler;
