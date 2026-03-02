import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Users, Building, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const handleDownloadReport = async () => {
    if (!exam || !halls.length) return;

    try {
      const doc = new jsPDF();

      // Load template image
      const img = new Image();
      img.src = '/report-template.png';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Add background image
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.addImage(img, 'PNG', 0, 0, pageWidth, pageHeight);

      // Add Exam Details
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Exam Name: ${exam.exam_name}`, 20, 80);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Exam Code: ${exam.exam_code}`, 20, 88);
      doc.text(`Total Halls: ${exam.number_of_halls}`, 20, 94);

      // Prepare table data
      const tableBody: any[] = [];

      // Sort halls numerically
      const sortedHalls = [...halls].sort((a, b) => {
        const numA = parseInt(a.hall_name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.hall_name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      sortedHalls.forEach(hall => {
        const hallStudents = allocations.filter(a => a.hall_id === hall.id);
        const deptRegs: { [key: string]: string[] } = {};

        hallStudents.forEach(student => {
          const dept = student.department_name || 'Unknown';
          if (!deptRegs[dept]) {
            deptRegs[dept] = [];
          }
          deptRegs[dept].push(student.registration_number);
        });

        Object.entries(deptRegs).forEach(([dept, regs]) => {
          // Natural sort for accurate range (e.g., A2 < A10)
          regs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

          tableBody.push([
            hall.hall_name,
            dept,
            regs.length,
            regs[0],
            regs[regs.length - 1]
          ]);
        });
      });

      // Add Table
      autoTable(doc, {
        startY: 105,
        head: [['Hall Name', 'Department', 'Student Count', 'Start Roll No', 'End Roll No']],
        body: tableBody,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [0, 114, 255], // #0072ff
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      doc.save(`${exam.exam_name}_Report.pdf`);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF report");
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
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold">{exam.exam_name}</h1>
              <Button onClick={handleDownloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
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

              // Calculate department statistics for this hall
              const deptRegs: { [key: string]: string[] } = {};

              hallStudents.forEach(student => {
                const dept = student.department_name || 'Unknown';
                if (!deptRegs[dept]) {
                  deptRegs[dept] = [];
                }
                deptRegs[dept].push(student.registration_number);
              });

              return (
                <Card key={hall.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{hall.hall_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Capacity: {hallStudents.length} / {hall.capacity}
                      </p>
                    </div>
                  </div>

                  {/* Department Summary Section */}
                  <div className="mb-6 bg-secondary/30 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Department Summary</h4>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(deptRegs).map(([dept, regs]) => {
                        regs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                        return (
                          <div key={dept} className="bg-background p-3 rounded border shadow-sm">
                            <div className="font-medium text-primary">{dept}</div>
                            <div className="text-2xl font-bold">{regs.length} <span className="text-xs font-normal text-muted-foreground">students</span></div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Range: {regs[0]} - {regs[regs.length - 1]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Seat</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Reg No</th>
                          <th className="text-left p-2">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hallStudents.map((student) => (
                          <tr key={student.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{student.seat_number}</td>
                            <td className="p-2">{student.student_name}</td>
                            <td className="p-2 font-mono">{student.registration_number}</td>
                            <td className="p-2 text-muted-foreground">{student.department_name}</td>
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
