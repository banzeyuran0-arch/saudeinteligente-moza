import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, History } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Patient {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_name: string;
  date: string;
  time: string;
  status: string;
}

const PatientManagement = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: p } = await supabase.from("profiles").select("*").order("name");
    if (p) setPatients(p as Patient[]);
    const { data: a } = await supabase.from("appointments").select("*").order("date", { ascending: false });
    if (a) setAppointments(a as Appointment[]);
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  const patientHistory = appointments.filter((a) => a.patient_id === selectedPatient);

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
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" /> Gestão de Pacientes
      </h3>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar paciente..."
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id}>
            <button
              onClick={() => setSelectedPatient(selectedPatient === p.id ? null : p.id)}
              className={`w-full bg-card rounded-xl p-4 shadow-card text-left transition-all ${selectedPatient === p.id ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {appointments.filter((a) => a.patient_id === p.id).length} consultas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Desde {new Date(p.created_at).toLocaleDateString("pt-MZ")}
                  </p>
                </div>
              </div>
            </button>

            {selectedPatient === p.id && (
              <div className="ml-4 mt-2 space-y-1 border-l-2 border-primary/30 pl-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                  <History className="w-4 h-4 text-primary" /> Histórico de Atendimentos
                </h4>
                {patientHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum atendimento registrado</p>
                ) : (
                  patientHistory.map((a) => (
                    <div key={a.id} className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">{a.doctor_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.date + "T00:00:00").toLocaleDateString("pt-MZ")} às {a.time}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle(a.status)}`}>
                        {statusLabel(a.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-6">Nenhum paciente encontrado</p>
        )}
      </div>
    </div>
  );
};

export default PatientManagement;
