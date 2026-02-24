import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, UserPlus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: `${form.phone.replace(/\D/g, "")}@saude.mz`,
          password: form.password,
        });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        if (!form.name.trim()) {
          toast({ title: "Por favor, insira seu nome", variant: "destructive" });
          setLoading(false);
          return;
        }
        const email = `${form.phone.replace(/\D/g, "")}@saude.mz`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password: form.password,
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            name: form.name.trim(),
            phone: form.phone,
          });
        }
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Algo deu errado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-primary py-12 px-6 rounded-b-[2rem] shadow-elevated">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Heart className="w-8 h-8 text-primary-foreground" />
          <h1 className="text-2xl font-bold text-primary-foreground">Saúde Inteligente</h1>
        </div>
        <p className="text-center text-primary-foreground/70 text-sm">
          Clínica em Maputo, Moçambique
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isLogin ? "Entrar na conta" : "Criar conta"}
        </h2>
        <p className="text-muted-foreground mb-6">
          {isLogin
            ? "Insira seus dados para acessar"
            : "Cadastre-se para agendar suas consultas"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2 animate-slide-up">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Ex: Marisa Silva"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required={!isLogin}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Número de telefone</Label>
            <Input
              id="phone"
              placeholder="Ex: 841234567"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold gradient-primary border-0 text-primary-foreground"
            disabled={loading}
          >
            {loading ? (
              "Aguarde..."
            ) : isLogin ? (
              <>
                <LogIn className="w-5 h-5 mr-2" /> Entrar
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" /> Cadastrar
              </>
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          {isLogin ? "Não tem conta? " : "Já tem conta? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
