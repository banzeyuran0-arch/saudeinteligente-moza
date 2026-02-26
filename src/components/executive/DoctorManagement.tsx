import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Edit, Trash2, CalendarDays, X, Stethoscope, Clock,
} from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
}

interface Schedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Absence {
  id: string;
  doctor_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const DoctorManagement = () => {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", specialty: "" });
  const [scheduleForm, setScheduleForm] = useState({ day_of_week: 1, start_time: "08:00", end_time: "17:00" });
  const [absenceForm, setAbsenceForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: d } = await supabase.from("doctors").select("*").order("name");
    if (d) setDoctors(d as Doctor[]);
    const { data: s } = await supabase.from("doctor_schedules").select("*");
    if (s) setSchedules(s as Schedule[]);
    const { data: a } = await supabase.from("doctor_absences").select("*").order("start_date", { ascending: false });
    if (a) setAbsences(a as Absence[]);
  };

  const saveDoctor = async () => {
    if (!form.name.trim() || !form.specialty.trim()) return;
    if (editDoctor) {
      const { error } = await supabase.from("doctors").update({ name: form.name, specialty: form.specialty }).eq("id", editDoctor.id);
      if (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
      toast({ title: "Médico atualizado ✅" });
    } else {
      const { error } = await supabase.from("doctors").insert({ name: form.name, specialty: form.specialty });
      if (error) { toast({ title: "Erro ao adicionar", variant: "destructive" }); return; }
      toast({ title: "Médico adicionado ✅" });
    }
    setForm({ name: "", specialty: "" });
    setEditDoctor(null);
    setShowForm(false);
    fetchAll();
  };

  const deleteDoctor = async (id: string) => {
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover", variant: "destructive" }); return; }
    toast({ title: "Médico removido" });
    fetchAll();
  };

  const toggleAvailability = async (doc: Doctor) => {
    await supabase.from("doctors").update({ available: !doc.available }).eq("id", doc.id);
    fetchAll();
  };

  const addSchedule = async () => {
    if (!selectedDoctor) return;
    const { error } = await supabase.from("doctor_schedules").upsert({
      doctor_id: selectedDoctor,
      day_of_week: scheduleForm.day_of_week,
      start_time: scheduleForm.start_time,
      end_time: scheduleForm.end_time,
    }, { onConflict: "doctor_id,day_of_week" });
    if (error) { toast({ title: "Erro ao salvar horário", variant: "destructive" }); return; }
    toast({ title: "Horário salvo ✅" });
    fetchAll();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("doctor_schedules").delete().eq("id", id);
    fetchAll();
  };

  const addAbsence = async () => {
    if (!selectedDoctor || !absenceForm.start_date || !absenceForm.end_date) return;
    const { error } = await supabase.from("doctor_absences").insert({
      doctor_id: selectedDoctor,
      start_date: absenceForm.start_date,
      end_date: absenceForm.end_date,
      reason: absenceForm.reason,
    });
    if (error) { toast({ title: "Erro ao registrar ausência", variant: "destructive" }); return; }
    toast({ title: "Ausência registrada ✅" });
    setAbsenceForm({ start_date: "", end_date: "", reason: "" });
    setShowAbsenceForm(false);
    fetchAll();
  };

  const deleteAbsence = async (id: string) => {
    await supabase.from("doctor_absences").delete().eq("id", id);
    fetchAll();
  };

  const doctorSchedules = schedules.filter((s) => s.doctor_id === selectedDoctor);
  const doctorAbsences = absences.filter((a) => a.doctor_id === selectedDoctor);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" /> Gestão de Médicos
        </h3>
        <Button size="sm" onClick={() => { setShowForm(true); setEditDoctor(null); setForm({ name: "", specialty: "" }); }} className="gradient-primary border-0 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Novo Médico
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Nome" />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Clínica Geral" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={saveDoctor} className="gradient-primary border-0 text-primary-foreground">
              {editDoctor ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {doctors.map((doc) => (
          <div key={doc.id} className={`bg-card rounded-xl p-4 shadow-card ${selectedDoctor === doc.id ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedDoctor(selectedDoctor === doc.id ? null : doc.id)} className="flex-1 text-left">
                <p className="font-semibold text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.specialty}</p>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAvailability(doc)}
                  className={`text-xs px-2 py-1 rounded-full font-medium ${doc.available ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"}`}
                >
                  {doc.available ? "Disponível" : "Indisponível"}
                </button>
                <button onClick={() => { setEditDoctor(doc); setForm({ name: doc.name, specialty: doc.specialty }); setShowForm(true); }}>
                  <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
                <button onClick={() => deleteDoctor(doc.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>

            {selectedDoctor === doc.id && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                {/* Horários */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                    <Clock className="w-4 h-4 text-primary" /> Horários
                  </h4>
                  <div className="flex gap-2 mb-2 flex-wrap items-end">
                    <div>
                      <Label className="text-xs">Dia</Label>
                      <select
                        value={scheduleForm.day_of_week}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
                        className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Início</Label>
                      <Input type="time" value={scheduleForm.start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} className="h-8 w-28" />
                    </div>
                    <div>
                      <Label className="text-xs">Fim</Label>
                      <Input type="time" value={scheduleForm.end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} className="h-8 w-28" />
                    </div>
                    <Button size="sm" onClick={addSchedule} className="h-8 gradient-primary border-0 text-primary-foreground">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doctorSchedules.sort((a, b) => a.day_of_week - b.day_of_week).map((s) => (
                      <span key={s.id} className="bg-muted text-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {DAYS[s.day_of_week]} {s.start_time}-{s.end_time}
                        <button onClick={() => deleteSchedule(s.id)}>
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </span>
                    ))}
                    {doctorSchedules.length === 0 && <p className="text-xs text-muted-foreground">Nenhum horário definido</p>}
                  </div>
                </div>

                {/* Ausências */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <CalendarDays className="w-4 h-4 text-primary" /> Ausências / Férias
                    </h4>
                    <Button variant="outline" size="sm" onClick={() => setShowAbsenceForm(!showAbsenceForm)} className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Registrar
                    </Button>
                  </div>
                  {showAbsenceForm && (
                    <div className="flex gap-2 mb-2 flex-wrap items-end">
                      <div>
                        <Label className="text-xs">De</Label>
                        <Input type="date" value={absenceForm.start_date} onChange={(e) => setAbsenceForm({ ...absenceForm, start_date: e.target.value })} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs">Até</Label>
                        <Input type="date" value={absenceForm.end_date} onChange={(e) => setAbsenceForm({ ...absenceForm, end_date: e.target.value })} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs">Motivo</Label>
                        <Input value={absenceForm.reason} onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })} placeholder="Férias" className="h-8 w-32" />
                      </div>
                      <Button size="sm" onClick={addAbsence} className="h-8 gradient-primary border-0 text-primary-foreground">Salvar</Button>
                    </div>
                  )}
                  <div className="space-y-1">
                    {doctorAbsences.map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <span className="text-xs text-foreground">
                          {new Date(a.start_date + "T00:00:00").toLocaleDateString("pt-MZ")} — {new Date(a.end_date + "T00:00:00").toLocaleDateString("pt-MZ")}
                          {a.reason && <span className="text-muted-foreground ml-1">({a.reason})</span>}
                        </span>
                        <button onClick={() => deleteAbsence(a.id)}>
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                    {doctorAbsences.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma ausência registrada</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {doctors.length === 0 && <p className="text-center text-muted-foreground py-6">Nenhum médico cadastrado</p>}
      </div>
    </div>
  );
};

export default DoctorManagement;
