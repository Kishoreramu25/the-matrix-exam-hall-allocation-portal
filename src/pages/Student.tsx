import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Search } from "lucide-react";
import SeatAllocationView, { SeatAllocationViewProps } from "@/components/student/SeatAllocationView";
import { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

const Student = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Tables<"subjects">[]>([]);
  const [searchData, setSearchData] = useState({
    examCode: "",
    registrationNumber: "",
    subjectId: "",
  });
  const [allocation, setAllocation] = useState<SeatAllocationViewProps["allocation"] | null>(null);
  const [resultsUrl, setResultsUrl] = useState("https://erode-sengunthar.ac.in/dec25results");

  useEffect(() => {
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

    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data: exam } = await supabase
          .from("exams")
          .select("id")
          .eq("exam_code", searchData.examCode)
          .maybeSingle();

        if (!exam) return;

        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .eq("exam_id", exam.id);

        if (error) throw error;
        setSubjects(data || []);
      } catch (error) {
        console.error("Failed to fetch subjects");
      }
    };

    if (searchData.examCode) {
      fetchSubjects();
    }
  }, [searchData.examCode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!searchData.examCode.trim() || !searchData.registrationNumber.trim()) {
        toast.error(t("enter.both"));
        return;
      }

      // Find the exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("exam_code", searchData.examCode)
        .single();

      if (examError || !exam) {
        toast.error(t("exam.not.found"));
        return;
      }

      // Build query for seat allocation
      const query = supabase
        .from("seat_allocations")
        .select(`
          *,
          halls(*)
        `)
        .eq("exam_id", exam.id)
        .eq("registration_number", searchData.registrationNumber);



      const { data: seatData, error: seatError } = await query.maybeSingle();

      if (seatError || !seatData) {
        toast.error(t("seat.not.found"));
        return;
      }

      // Get all allocations for the hall
      const hallQuery = supabase
        .from("seat_allocations")
        .select("*")
        .eq("hall_id", seatData.hall_id)
        .order("seat_number");



      const { data: hallAllocations, error: hallError } = await hallQuery;

      if (hallError) throw hallError;

      setAllocation({
        exam,
        student: seatData,
        hall: seatData.halls,
        allSeats: hallAllocations || [],
      });

      toast.success(t("seat.found"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to find seat allocation";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAllocation(null);
    setSearchData({ examCode: "", registrationNumber: "", subjectId: "" });
    setSubjects([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back.home")}
        </Button>

        {!allocation ? (
          <Card className="max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{t("find.seat")}</h1>
              <p className="text-muted-foreground">
                {t("enter.details")}
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="examCode">{t("exam.code")}</Label>
                <Input
                  id="examCode"
                  placeholder="e.g., EXM1025"
                  value={searchData.examCode}
                  onChange={(e) =>
                    setSearchData({ ...searchData, examCode: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="registrationNumber">{t("reg.number")}</Label>
                <Input
                  id="registrationNumber"
                  placeholder="e.g., 2021001"
                  value={searchData.registrationNumber}
                  onChange={(e) =>
                    setSearchData({
                      ...searchData,
                      registrationNumber: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {subjects.length > 0 && (
                <div>
                  <Label htmlFor="subject">{t("subject")}</Label>
                  <Select
                    value={searchData.subjectId || "all"}
                    onValueChange={(value) =>
                      setSearchData({ ...searchData, subjectId: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder={t("all.subjects")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("all.subjects")}</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.subject_name} {subject.subject_code && `(${subject.subject_code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                <Search className="mr-2 h-5 w-5" />
                {loading ? t("searching") : t("student.find")}
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                onClick={() => window.open(resultsUrl, "_blank")}
              >
                {t("student.result")}
              </Button>
            </form>
          </Card>
        ) : (
          <SeatAllocationView allocation={allocation} onReset={handleReset} />
        )}
      </div>
    </div>
  );
};

export default Student;
