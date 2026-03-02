import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import CreateExam from "./pages/CreateExam";
import EditExam from "./pages/EditExam";
import Student from "./pages/Student";
import ExamView from "./pages/ExamView";
import Settings from "./pages/Settings";
import Feedback from "./pages/Feedback";
import MatrixAI from "./pages/MatrixAI";
import NotFound from "./pages/NotFound";

import MobileNav from "./components/MobileNav";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize theme and color from localStorage
    const savedTheme = localStorage.getItem("theme");
    const savedColor = localStorage.getItem("primaryColor");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    if (savedColor) {
      document.documentElement.style.setProperty("--primary", savedColor);
      document.documentElement.style.setProperty("--ring", savedColor);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="pb-20 md:pb-0">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/create" element={<CreateExam />} />
                <Route path="/admin/edit/:examId" element={<EditExam />} />
                <Route path="/student" element={<Student />} />
                <Route path="/exam/:examCode" element={<ExamView />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/matrix-ai" element={<MatrixAI />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <MobileNav />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
