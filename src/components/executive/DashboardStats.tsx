import { Calendar, Clock, CheckCircle, XCircle, Users, Stethoscope } from "lucide-react";

interface Props {
  todayCount: number;
  scheduledCount: number;
  completedCount: number;
  cancelledCount: number;
  totalPatients: number;
  totalDoctors: number;
}

const DashboardStats = ({ todayCount, scheduledCount, completedCount, cancelledCount, totalPatients, totalDoctors }: Props) => {
  const stats = [
    { icon: Calendar, value: todayCount, label: "Hoje", color: "text-primary" },
    { icon: Clock, value: scheduledCount, label: "Agendadas", color: "text-primary" },
    { icon: CheckCircle, value: completedCount, label: "Concluídas", color: "text-green-600" },
    { icon: XCircle, value: cancelledCount, label: "Canceladas", color: "text-destructive" },
    { icon: Users, value: totalPatients, label: "Pacientes", color: "text-primary" },
    { icon: Stethoscope, value: totalDoctors, label: "Médicos", color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {stats.map((s, i) => (
        <div key={i} className="bg-card rounded-xl p-4 shadow-card text-center">
          <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
          <p className="text-2xl font-bold text-foreground">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
