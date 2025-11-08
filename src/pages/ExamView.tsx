import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Users, Building } from "lucide-react";

const ExamView = () => {
  const { examCode } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [halls, setHalls] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamDetails();
  }, [examCode]);

  const fetchExamDetails = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("exam_code", examCode)
        .single();

      if (examError) throw examError;
      setExam(examData);

      const { data: hallsData, error: hallsError } = await supabase
        .from("halls")
        .select("*")
        .eq("exam_id", examData.id);

      if (hallsError) throw hallsError;
      setHalls(hallsData || []);

      const { data: allocationsData, error: allocationsError } = await supabase
        .from("seat_allocations")
        .select("*")
        .eq("exam_id", examData.id)
        .order("seat_number");

      if (allocationsError) throw allocationsError;
      setAllocations(allocationsData || []);
    } catch (error: any) {
      toast.error("Failed to fetch exam details");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
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
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6">
            <h1 className="text-3xl font-bold mb-4">{exam.exam_name}</h1>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="font-semibold">{exam.total_students}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                <Building className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Number of Halls</p>
                  <p className="font-semibold">{exam.number_of_halls}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Per Hall</p>
                  <p className="font-semibold">{exam.students_per_hall}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Hall-wise Allocation</h2>
            {halls.map((hall) => {
              const hallStudents = allocations.filter((a) => a.hall_id === hall.id);
              return (
                <Card key={hall.id} className="p-6">
                  <h3 className="text-xl font-semibold mb-4">{hall.hall_name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Capacity: {hallStudents.length} / {hall.capacity}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Seat</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Registration Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hallStudents.map((student) => (
                          <tr key={student.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{student.seat_number}</td>
                            <td className="p-2">{student.student_name}</td>
                            <td className="p-2">{student.registration_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamView;
