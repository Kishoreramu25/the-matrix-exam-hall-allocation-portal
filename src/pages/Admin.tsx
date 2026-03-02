import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle, LogOut, Globe, Save } from "lucide-react";
import ExamList from "@/components/admin/ExamList";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resultsUrl, setResultsUrl] = useState("");
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchSettings();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("global_settings")
        .select("value")
        .eq("key", "results_url")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setResultsUrl(data.value);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleUpdateSettings = async () => {
    setUpdatingSettings(true);
    try {
      const { error } = await (supabase as any)
        .from("global_settings")
        .upsert({ key: "results_url", value: resultsUrl, updated_at: new Date().toISOString() });

      if (error) throw error;
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("logged.out"));
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t("admin.dashboard")}</h1>
            <p className="text-muted-foreground">{t("welcome.back")}, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">{t("create.new.exam")}</h2>
              <p className="text-muted-foreground">{t("setup.exam")}</p>
            </div>
            <Button size="lg" onClick={() => navigate("/admin/create")}>
              <PlusCircle className="mr-2 h-5 w-5" />
              {t("create.exam")}
            </Button>
          </div>
        </Card>

        <Card className="p-6 mb-8 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Global Settings</h2>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="resultsUrl">Results Website URL</Label>
              <div className="flex gap-2">
                <Input
                  id="resultsUrl"
                  placeholder="https://example.com/results"
                  value={resultsUrl}
                  onChange={(e) => setResultsUrl(e.target.value)}
                  className="bg-background border-primary/20 focus-visible:ring-primary"
                />
                <Button
                  onClick={handleUpdateSettings}
                  disabled={updatingSettings}
                  className="shrink-0"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updatingSettings ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This URL will be used for the "Know My Recent Exam Result" button on the student page.
              </p>
            </div>
          </div>
        </Card>

        <ExamList />
      </div>
    </div>
  );
};

export default Admin;
