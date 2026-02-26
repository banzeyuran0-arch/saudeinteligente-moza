import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, DollarSign, Plus, Trash2 } from "lucide-react";

interface Appointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  doctor_id: string;
  date: string;
  time: string;
  status: string;
}

interface Doctor {
  id: string;
  name: string;
}

interface Price {
  id: string;
  doctor_id: string;
  description: string;
  price: number;
}

const ReportsAndBilling = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [priceForm, setPriceForm] = useState({ doctor_id: "", description: "Consulta geral", price: "500" });
  const [showPriceForm, setShowPriceForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: a }, { data: d }, { data: p }] = await Promise.all([
      supabase.from("appointments").select("*").order("date"),
      supabase.from("doctors").select("id, name").order("name"),
      supabase.from("consultation_prices").select("*"),
    ]);
    if (a) setAppointments(a as Appointment[]);
    if (d) setDoctors(d as Doctor[]);
    if (p) setPrices(p as Price[]);
  };

  const filteredApts = appointments.filter(
    (a) => a.date >= startDate && a.date <= endDate
  );

  const completedApts = filteredApts.filter((a) => a.status === "completed");
  const scheduledApts = filteredApts.filter((a) => a.status === "scheduled");
  const cancelledApts = filteredApts.filter((a) => a.status === "cancelled");

  const getPrice = (doctorId: string) => {
    const p = prices.find((pr) => pr.doctor_id === doctorId);
    return p ? p.price : 0;
  };

  const totalBilled = completedApts.reduce((sum, a) => sum + getPrice(a.doctor_id), 0);
  const totalPending = scheduledApts.reduce((sum, a) => sum + getPrice(a.doctor_id), 0);

  const doctorStats = doctors.map((doc) => {
    const docApts = filteredApts.filter((a) => a.doctor_id === doc.id);
    const completed = docApts.filter((a) => a.status === "completed").length;
    const revenue = docApts.filter((a) => a.status === "completed").reduce((s, a) => s + getPrice(a.doctor_id), 0);
    return { ...doc, total: docApts.length, completed, revenue };
  }).sort((a, b) => b.total - a.total);

  const addPrice = async () => {
    if (!priceForm.doctor_id) return;
    const { error } = await supabase.from("consultation_prices").upsert({
      doctor_id: priceForm.doctor_id,
      description: priceForm.description,
      price: parseFloat(priceForm.price),
    }, { onConflict: "doctor_id,description" });
    if (error) { toast({ title: "Erro ao salvar preço", variant: "destructive" }); return; }
    toast({ title: "Preço salvo ✅" });
    setShowPriceForm(false);
    fetchData();
  };

  const deletePrice = async (id: string) => {
    await supabase.from("consultation_prices").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" /> Relatórios & Faturamento
      </h3>

      {/* Period filter */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-foreground">{filteredApts.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-green-600">{completedApts.length}</p>
          <p className="text-xs text-muted-foreground">Concluídas</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-green-600">{totalBilled.toLocaleString("pt-MZ")} MT</p>
          <p className="text-xs text-muted-foreground">Faturado</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-primary">{totalPending.toLocaleString("pt-MZ")} MT</p>
          <p className="text-xs text-muted-foreground">Pendente</p>
        </div>
      </div>

      {/* Per-doctor breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">Por Médico</h4>
        <div className="space-y-2">
          {doctorStats.map((doc) => (
            <div key={doc.id} className="bg-card rounded-xl p-3 shadow-card flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.total} consultas • {doc.completed} concluídas
                </p>
              </div>
              <p className="font-bold text-green-600 text-sm">{doc.revenue.toLocaleString("pt-MZ")} MT</p>
            </div>
          ))}
        </div>
      </div>

      {/* Price management */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-primary" /> Preços de Consulta
          </h4>
          <Button variant="outline" size="sm" onClick={() => setShowPriceForm(!showPriceForm)} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Definir Preço
          </Button>
        </div>

        {showPriceForm && (
          <div className="bg-card rounded-xl p-4 shadow-card space-y-3 mb-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Médico</Label>
                <select
                  value={priceForm.doctor_id}
                  onChange={(e) => setPriceForm({ ...priceForm, doctor_id: e.target.value })}
                  className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">Selecione</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input value={priceForm.description} onChange={(e) => setPriceForm({ ...priceForm, description: e.target.value })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Preço (MT)</Label>
                <Input type="number" value={priceForm.price} onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })} className="h-8" />
              </div>
            </div>
            <Button size="sm" onClick={addPrice} className="gradient-primary border-0 text-primary-foreground">Salvar</Button>
          </div>
        )}

        <div className="space-y-1">
          {prices.map((p) => {
            const doc = doctors.find((d) => d.id === p.doctor_id);
            return (
              <div key={p.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                <span className="text-xs text-foreground">
                  {doc?.name || "?"} — {p.description}: <strong>{p.price.toLocaleString("pt-MZ")} MT</strong>
                </span>
                <button onClick={() => deletePrice(p.id)}>
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}
          {prices.length === 0 && <p className="text-xs text-muted-foreground">Nenhum preço definido</p>}
        </div>
      </div>
    </div>
  );
};

export default ReportsAndBilling;
