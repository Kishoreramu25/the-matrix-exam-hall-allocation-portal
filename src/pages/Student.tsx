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
import SeatAllocationView from "@/components/student/SeatAllocationView";

const Student = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchData, setSearchData] = useState({
    examCode: "",
    registrationNumber: "",
    subjectId: "",
  });
  const [allocation, setAllocation] = useState<any>(null);

  useEffect(() => {
    if (searchData.examCode) {
      fetchSubjects();
    }
  }, [searchData.examCode]);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!searchData.examCode.trim() || !searchData.registrationNumber.trim()) {
        toast.error("Please enter both exam code and registration number");
        return;
      }

      // Find the exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("exam_code", searchData.examCode)
        .single();

      if (examError || !exam) {
        toast.error("Exam not found");
        return;
      }

      // Build query for seat allocation
      let query = supabase
        .from("seat_allocations")
        .select(`
          *,
          halls(*)
        `)
        .eq("exam_id", exam.id)
        .eq("registration_number", searchData.registrationNumber);

      // Filter by subject if selected
      if (searchData.subjectId) {
        query = query.eq("subject_id", searchData.subjectId);
      }

      const { data: seatData, error: seatError } = await query.maybeSingle();

      if (seatError || !seatData) {
        toast.error("No seat allocation found for this registration number");
        return;
      }

      // Get all allocations for the hall
      let hallQuery = supabase
        .from("seat_allocations")
        .select("*")
        .eq("hall_id", seatData.hall_id)
        .order("seat_number");

      if (searchData.subjectId) {
        hallQuery = hallQuery.eq("subject_id", searchData.subjectId);
      }

      const { data: hallAllocations, error: hallError } = await hallQuery;

      if (hallError) throw hallError;

      setAllocation({
        exam,
        student: seatData,
        hall: seatData.halls,
        allSeats: hallAllocations || [],
      });

      toast.success("Seat allocation found!");
    } catch (error: any) {
      toast.error(error.message || "Failed to find seat allocation");
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
          Back to Home
        </Button>

        {!allocation ? (
          <Card className="max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Find Your Seat</h1>
              <p className="text-muted-foreground">
                Enter your exam code and registration number
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="examCode">Exam Code</Label>
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
                <Label htmlFor="registrationNumber">Registration Number</Label>
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
                  <Label htmlFor="subject">Subject (Optional)</Label>
                  <Select
                    value={searchData.subjectId || "all"}
                    onValueChange={(value) =>
                      setSearchData({ ...searchData, subjectId: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All subjects</SelectItem>
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
                {loading ? "Searching..." : "Find My Seat"}
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
