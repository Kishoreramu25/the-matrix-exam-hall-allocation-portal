import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Trash2, Users, Building2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

const ExamList = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Tables<"exams">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      toast.error("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm("⚠️ Delete Exam?\n\nThis will permanently remove:\n• Exam details\n• All subjects\n• All seat allocations\n• All hall configurations\n\nThis action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("exams").delete().eq("id", examId);

      if (error) throw error;
      toast.success("Exam and all related data deleted successfully");
      fetchExams();
    } catch (error) {
      toast.error("Failed to delete exam");
    }
  };



  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No exams created yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Your Exams</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <Card key={exam.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold line-clamp-1" title={exam.exam_name}>
                    {exam.exam_name}
                  </h3>
                  <p className="text-sm font-medium text-primary mt-1">
                    {exam.exam_code}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/admin/edit/${exam.id}`)}
                    title="Edit Exam"
                  >
                    <span className="text-sm">✏️</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={() => handleDelete(exam.id)}
                    title="Delete Exam"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-2 rounded-md">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{exam.total_students} Students</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-2 rounded-md">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>{exam.number_of_halls} Halls</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full group-hover:bg-primary/90 transition-colors"
                  onClick={() => navigate(`/exam/${exam.exam_code}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExamList;
