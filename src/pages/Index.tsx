import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LayoutGrid, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Instagram-like Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/app-logo.jpg" alt="Logo" className="h-8 w-auto object-contain" />
          <h1 className="text-xl font-bold tracking-tight">{t("app.name")}</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDark(!isDark)}
          className="rounded-full w-8 h-8 bg-secondary"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-md">
        {/* Welcome Story/Banner */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/50 p-6 rounded-2xl mb-8">
          <h2 className="text-2xl font-bold mb-2">{t("welcome.back")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("welcome.subtitle")}
          </p>
        </div>

        {/* Feed Items */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="bg-secondary/30 p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center">
                <LayoutGrid className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t("admin.portal")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("admin.desc")}
                </p>
              </div>
              <Button
                onClick={() => navigate("/admin")}
                className="w-full btn-primary rounded-xl"
              >
                {t("admin.login")}
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="bg-secondary/30 p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t("student.portal")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("student.desc")}
                </p>
              </div>
              <Button
                onClick={() => navigate("/student")}
                className="w-full btn-primary rounded-xl"
              >
                {t("student.find")}
              </Button>
            </div>
          </Card>


        </div>

        {/* Footer */}
        <div className="text-center mt-8 pb-4">
          <p className="text-xs text-muted-foreground font-medium">
            {t("footer.rights")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
