import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EXEC_EMAIL = "yurangrey66@gmail.com";
const EXEC_PASS = "DreamClinica2026";

const ExecutiveLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === EXEC_EMAIL && password === EXEC_PASS) {
      sessionStorage.setItem("exec_auth", "true");
      navigate("/executive");
    } else {
      toast({ title: "Credenciais inválidas", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-primary py-10 px-6 rounded-b-[2rem]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary-foreground/70 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary-foreground" />
          <h1 className="text-xl font-bold text-primary-foreground">Painel Executivo</h1>
        </div>
        <p className="text-primary-foreground/60 text-sm mt-1">Acesso restrito à equipe da clínica</p>
      </div>

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full animate-fade-in">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exec-email">E-mail</Label>
            <Input
              id="exec-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@clinica.mz"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exec-pass">Senha</Label>
            <Input
              id="exec-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full h-12 gradient-primary border-0 text-primary-foreground font-semibold">
            Acessar Painel
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ExecutiveLogin;
