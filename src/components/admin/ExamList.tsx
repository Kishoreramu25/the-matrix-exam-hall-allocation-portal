import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Trash2, Copy } from "lucide-react";

const ExamList = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error("Failed to delete exam");
    }
  };

  const handleCopyLink = (examCode: string) => {
    const link = `${window.location.origin}/student?code=${examCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Exam link copied to clipboard");
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
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Your Exams</h2>
      {exams.map((exam) => (
        <Card key={exam.id} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{exam.exam_name}</h3>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Code: {exam.exam_code}</span>
                <span>Students: {exam.total_students}</span>
                <span>Halls: {exam.number_of_halls}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/exam/${exam.exam_code}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyLink(exam.exam_code)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(exam.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ExamList;
