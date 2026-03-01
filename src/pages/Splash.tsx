import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

const Splash = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => navigate("/register"), 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen gradient-splash flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-primary-foreground/5" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[250px] h-[250px] rounded-full bg-primary-foreground/5" />

      <div
        className={`flex flex-col items-center gap-6 transition-all duration-1000 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        {/* Logo */}
        <div className="w-28 h-28 rounded-3xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center animate-pulse-glow">
          <Heart className="w-14 h-14 text-primary-foreground" strokeWidth={1.5} />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">
            Saúde Inteligente
          </h1>
          <p className="text-primary-foreground/70 text-sm mt-1">
            Gaza — Xai-Xai
          </p>
        </div>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-16 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-foreground/40"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Splash;
