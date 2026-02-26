import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare } from "lucide-react";

interface ClinicUpdate {
  id: string;
  message: string;
  created_at: string;
}

const ClinicUpdates = () => {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<ClinicUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState("");

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    const { data } = await supabase
      .from("clinic_updates")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (data) setUpdates(data as ClinicUpdate[]);
  };

  const sendUpdate = async () => {
    if (!newUpdate.trim()) return;
    const { error } = await supabase.from("clinic_updates").insert({ message: newUpdate.trim() });
    if (error) {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } else {
      toast({ title: "Atualização enviada ✅" });
      setNewUpdate("");
      fetchUpdates();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" /> Atualizações da Clínica
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

      <div className="space-y-2">
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
  );
};

export default ClinicUpdates;
