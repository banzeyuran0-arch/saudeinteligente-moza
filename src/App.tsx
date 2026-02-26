import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import ExecutiveLogin from "./pages/ExecutiveLogin";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import DoctorLogin from "./pages/DoctorLogin";
import DoctorDashboard from "./pages/DoctorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PatientDashboard />} />
          <Route path="/executive-login" element={<ExecutiveLogin />} />
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/doctor-login" element={<DoctorLogin />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
