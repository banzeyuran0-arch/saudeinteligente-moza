import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";

const PushNotificationBanner = () => {
  const { permission, isSubscribed, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already subscribed, denied, or dismissed
  if (isSubscribed || permission === "denied" || dismissed) return null;

  // Don't show if push not supported
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    const success = await subscribe();
    setLoading(false);
    if (success) {
      toast({ title: "Notificações ativadas! 🔔" });
    } else {
      toast({ title: "Não foi possível ativar notificações", variant: "destructive" });
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <BellRing className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Ative as notificações</p>
          <p className="text-xs text-muted-foreground mt-1">
            Receba lembretes de consulta diretamente no seu celular, mesmo com o app fechado.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSubscribe}
              disabled={loading}
              className="gradient-primary border-0 text-primary-foreground"
            >
              <Bell className="w-4 h-4 mr-1" />
              {loading ? "Ativando..." : "Ativar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground"
            >
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationBanner;
