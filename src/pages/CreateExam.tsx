import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { z } from "zod";

const examSchema = z.object({
  examName: z.string().min(3, "Exam name must be at least 3 characters"),
  examCode: z.string().min(3, "Exam code must be at least 3 characters"),
  numberOfHalls: z.number().min(1, "Number of halls must be at least 1"),
  benchRows: z.number().min(1, "Rows must be at least 1"),
  benchColumns: z.number().min(1, "Columns must be at least 1"),
  numberOfSubjects: z.number().min(1, "At least 1 subject required"),
  numberOfDepartments: z.number().min(1, "At least 1 department required"),
});

interface Subject {
  name: string;
  code: string;
}

type ParseReport = {
  totalRows: number;
  validRows: number;
  missingName: number;
  missingReg: number;
  duplicatesWithinFile: number;
};

interface Department {
  name: string;
  file: File | null;
  students: any[];
  parseReport?: ParseReport;
}

const CreateExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hallNames, setHallNames] = useState<string[]>([]);
  const [hallLocationLinks, setHallLocationLinks] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([{ name: "", code: "" }]);
  const [departments, setDepartments] = useState<Department[]>([{ name: "", file: null, students: [] }]);
  const [parsingStatus, setParsingStatus] = useState<boolean[]>([]);
  const [useSharedSeating, setUseSharedSeating] = useState(true);
  const [formData, setFormData] = useState({
    examName: "",
    examCode: "",
    numberOfHalls: 0,
    benchRows: 0,
    benchColumns: 0,
    numberOfSubjects: 1,
    numberOfDepartments: 1,
  });

  const handleNumberOfHallsChange = (value: number) => {
    setFormData({ ...formData, numberOfHalls: value });
    setHallNames(Array(value).fill(""));
    setHallLocationLinks(Array(value).fill(""));
  };

  const handleHallNameChange = (index: number, name: string) => {
    const newNames = [...hallNames];
    newNames[index] = name;
    setHallNames(newNames);
  };

  const handleHallLocationLinkChange = (index: number, link: string) => {
    const newLinks = [...hallLocationLinks];
    newLinks[index] = link;
    setHallLocationLinks(newLinks);
  };

  const handleNumberOfSubjectsChange = (value: number) => {
    setFormData({ ...formData, numberOfSubjects: value });
    const newSubjects = Array(value).fill(null).map((_, i) => subjects[i] || { name: "", code: "" });
    setSubjects(newSubjects);
  };

  const handleSubjectChange = (index: number, field: keyof Subject, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setSubjects(newSubjects);
  };

  const handleNumberOfDepartmentsChange = (value: number) => {
    setFormData({ ...formData, numberOfDepartments: value });
    const newDepts = Array(value).fill(null).map((_, i) => departments[i] || { name: "", file: null, students: [] });
    setDepartments(newDepts);
    setParsingStatus(Array(value).fill(false));
  };

  const handleDepartmentChange = (index: number, field: keyof Department, value: any) => {
    const newDepts = [...departments];
    newDepts[index] = { ...newDepts[index], [field]: value };
    setDepartments(newDepts);
  };

  const parseStudentFile = async (file: File, deptName: string): Promise<{ students: any[]; report: ParseReport }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let text = e.target?.result as string;
          if (!text || text.trim() === "") {
            reject(new Error("File is empty"));
            return;
          }

          // Remove BOM if present
          if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
          }

          // Normalize line endings and split
          const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
          const nonEmpty = rawLines.filter((line) => line && line.trim().length > 0);

          if (nonEmpty.length < 1) {
            reject(new Error("CSV must contain data"));
            return;
          }

          // Detect delimiter from sample
          const detectDelimiter = (lines: string[]) => {
            const candidates = [",", ";", "\t", "|"];
            let best = ",";
            let bestScore = -1;
            for (const delim of candidates) {
              const sample = lines.slice(0, Math.min(10, lines.length));
              const score = sample
                .map((l) => {
                  let inQ = false;
                  let count = 0;
                  for (let i = 0; i < l.length; i++) {
                    const ch = l[i];
                    if (ch === '"') inQ = !inQ;
                    else if (ch === delim && !inQ) count++;
                  }
                  return count + 1;
                })
                .reduce((a, b) => a + b, 0);
              if (score > bestScore) {
                bestScore = score;
                best = delim;
              }
            }
            return best;
          };

          const delimiter = detectDelimiter(nonEmpty);
          console.info(`Detected delimiter "${delimiter}" for ${deptName}`);

          // CSV line parser using chosen delimiter, respecting quotes
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result.map(field => field.replace(/^["']|["']$/g, '').trim());
          };

          // Determine header row (first row with both name and reg-like label)
          const headerRowIndex = Math.max(
            0,
            nonEmpty.findIndex((l) => {
              const lower = l.toLowerCase();
              return lower.includes("name") && (lower.includes("reg") || lower.includes("register") || lower.includes("roll") || lower.includes("admission") || lower.includes("number") || lower.includes("no."));
            })
          );

          const header = parseCSVLine(nonEmpty[headerRowIndex].toLowerCase());
          let nameIndex = -1;
          let regIndex = -1;

          // CRITICAL: Check for registration column FIRST to avoid misidentification
          for (let i = 0; i < header.length; i++) {
            const col = header[i];
            
            // Priority 1: Identify registration/roll number column first
            if (regIndex === -1) {
              const isRollNumber = col.includes('roll') && col.includes('number');
              const isRegNumber = col.includes('reg') && (col.includes('number') || col.includes('no'));
              const isRollNo = col === 'roll no' || col === 'rollno';
              const isRegNo = col === 'reg no' || col === 'regno';
              const isGeneric = col.includes('register') || col.includes('admission') || col === 'id';
              
              if (isRollNumber || isRegNumber || isRollNo || isRegNo || isGeneric) {
                regIndex = i;
              }
            }
          }
          
          // Priority 2: Identify name column (but not the reg column)
          for (let i = 0; i < header.length; i++) {
            const col = header[i];
            if (nameIndex === -1 && i !== regIndex && col.includes('name') && !col.includes('department')) {
              nameIndex = i;
            }
          }

          // Heuristic fallback if header is not helpful
          if (nameIndex === -1 || regIndex === -1) {
            const sample = nonEmpty.slice(headerRowIndex + 1, headerRowIndex + 6).map(parseCSVLine);
            const widestRow = sample.reduce((a, b) => (b.length > a.length ? b : a), [] as string[]);
            if (widestRow.length >= 2) {
              if (nameIndex === -1) nameIndex = 0;
              if (regIndex === -1) regIndex = 1;
            } else {
              nameIndex = 0;
              regIndex = 1;
            }
          }

          console.log(`Parsing ${deptName}: header at row ${headerRowIndex}, name col=${nameIndex}, reg col=${regIndex}`);

          const students: any[] = [];
          let totalRows = 0;
          let missingName = 0;
          let missingReg = 0;
          let duplicatesWithinFile = 0;
          const seenRegs = new Set<string>();

          for (let li = headerRowIndex + 1; li < nonEmpty.length; li++) {
            const line = nonEmpty[li].trim();
            if (!line) continue;

            const parts = parseCSVLine(line);
            if (parts.length <= Math.max(nameIndex, regIndex)) continue;
            totalRows++;

            const name = parts[nameIndex]?.trim();
            let regNumber = parts[regIndex]?.trim();

            const lowerName = (name || '').toLowerCase();
            const lowerReg = (regNumber || '').toLowerCase();

            if (!name) {
              missingName++;
              continue;
            }
            if (!regNumber) {
              missingReg++;
              continue;
            }

            if (
              lowerName.includes('name') ||
              lowerReg.includes('number') ||
              lowerName.includes('b.e-') ||
              lowerName.includes('b.tech') ||
              lowerName.startsWith('department') ||
              lowerName.startsWith('semester')
            ) {
              continue;
            }

            // Handle scientific notation and whitespace in reg no
            if (/[0-9]+e\+\d+/i.test(regNumber)) {
              const num = parseFloat(regNumber);
              if (!isNaN(num)) {
                regNumber = num.toFixed(0);
              }
            }
            regNumber = regNumber.replace(/\s+/g, '');

            if (seenRegs.has(regNumber)) {
              duplicatesWithinFile++;
              continue;
            }
            seenRegs.add(regNumber);

            students.push({
              name,
              registration_number: regNumber,
              department: deptName,
            });
          }

          if (students.length === 0) {
            reject(new Error(`No valid student rows. Missing Name: ${missingName}, Missing Reg: ${missingReg}, Duplicates: ${duplicatesWithinFile}. Detected delimiter "${delimiter}".`));
            return;
          }

          const report = {
            totalRows,
            validRows: students.length,
            missingName,
            missingReg,
            duplicatesWithinFile,
          };

          console.log(`✓ Parsed ${students.length} students from ${deptName} (rows: ${totalRows}, missName: ${missingName}, missReg: ${missingReg}, dup: ${duplicatesWithinFile})`, students.slice(0, 3));
          resolve({ students, report });
        } catch (error: any) {
          console.error("CSV parsing error:", error);
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleDepartmentFileUpload = async (index: number, file: File | null) => {
    if (!file) return;
    
    if (!departments[index].name) {
      toast.error("Please enter department name first");
      return;
    }

    // Mark as parsing
    setParsingStatus((prev) => {
      const arr = [...prev];
      arr[index] = true;
      return arr;
    });

    try {
      const { students, report } = await parseStudentFile(file, departments[index].name);
      
      // Update all fields atomically in one state update
      const newDepts = [...departments];
      newDepts[index] = {
        ...newDepts[index],
        file: file,
        students: students,
        parseReport: report
      };
      setDepartments(newDepts);
      
      toast.success(`✓ ${students.length}/${report.totalRows} valid • Missing Name: ${report.missingName}, Reg: ${report.missingReg}, Duplicates: ${report.duplicatesWithinFile} (${departments[index].name})`);
    } catch (error: any) {
      console.error("File upload error:", error);
      const newDepts = [...departments];
      newDepts[index] = {
        ...newDepts[index],
        file: null,
        students: [],
        parseReport: undefined
      };
      setDepartments(newDepts);
      toast.error(error.message || "Failed to parse CSV file. Ensure format is: Name, Registration Number");
    } finally {
      setParsingStatus((prev) => {
        const arr = [...prev];
        arr[index] = false;
        return arr;
      });
    }
  };

  const handleClearDepartment = (index: number) => {
    handleDepartmentChange(index, "students", []);
    handleDepartmentChange(index, "file", null);
    setParsingStatus((prev) => {
      const arr = [...prev];
      arr[index] = false;
      return arr;
    });
  };

  const allocateSeatsRoundRobin = (allStudents: any[], rows: number, cols: number, hallId: string, subjectId?: string) => {
    const totalSeats = rows * cols;
    const deptGroups: { [key: string]: any[] } = {};
    
    allStudents.forEach(student => {
      if (!deptGroups[student.department]) {
        deptGroups[student.department] = [];
      }
      deptGroups[student.department].push(student);
    });

    const deptNames = Object.keys(deptGroups);
    const allocations = [];
    let currentDeptIndex = 0;
    let deptPointers = Object.fromEntries(deptNames.map(dept => [dept, 0]));

    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= cols; col++) {
        let assigned = false;
        let attempts = 0;
        
        while (!assigned && attempts < deptNames.length) {
          const currentDept = deptNames[currentDeptIndex];
          const students = deptGroups[currentDept];
          const pointer = deptPointers[currentDept];

          if (pointer < students.length) {
            const student = students[pointer];
            allocations.push({
              hall_id: hallId,
              student_name: student.name,
              registration_number: student.registration_number,
              department_name: student.department,
              seat_number: allocations.length + 1,
              row_number: row,
              column_number: col,
              subject_id: subjectId,
            });
            deptPointers[currentDept]++;
            assigned = true;
          }

          currentDeptIndex = (currentDeptIndex + 1) % deptNames.length;
          attempts++;
        }

        if (!assigned) break;
      }
    }

    return allocations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = examSchema.parse({
        ...formData,
        numberOfHalls: Number(formData.numberOfHalls),
        benchRows: Number(formData.benchRows),
        benchColumns: Number(formData.benchColumns),
        numberOfSubjects: Number(formData.numberOfSubjects),
        numberOfDepartments: Number(formData.numberOfDepartments),
      });

      // Detailed per-department validation with counts
      const deptErrors = departments
        .map((d, i) => {
          const deptName = d.name || `Department ${i + 1}`;
          if (!d.name) return `${deptName}: Missing department name`;
          if (!d.students || d.students.length === 0) {
            const rep = d.parseReport;
            if (!d.file && !rep) {
              return `${deptName}: No CSV file uploaded`;
            }
            if (rep) {
              return `${deptName}: 0 valid students (Total rows: ${rep.totalRows}, Missing Name: ${rep.missingName}, Missing Reg: ${rep.missingReg}, Duplicates: ${rep.duplicatesWithinFile})`;
            }
            return `${deptName}: CSV parsing failed`;
          }
          if (
            d.parseReport &&
            (d.parseReport.missingName > 0 ||
              d.parseReport.missingReg > 0 ||
              d.parseReport.duplicatesWithinFile > 0)
          ) {
            return `${deptName}: Warning - Loaded ${d.parseReport.validRows}/${d.parseReport.totalRows} students (Missing Name: ${d.parseReport.missingName}, Missing Reg: ${d.parseReport.missingReg}, Duplicates: ${d.parseReport.duplicatesWithinFile})`;
          }
          return "";
        })
        .filter(Boolean) as string[];

      const blockingDeptIssue = departments.some(
        (d) => !d.name || !d.students || d.students.length === 0
      );

      if (deptErrors.length > 0 && blockingDeptIssue) {
        toast.error(deptErrors.join(" | "), { duration: 10000 });
        setLoading(false);
        return;
      } else if (deptErrors.length > 0) {
        toast.message(deptErrors.join(" | "), { duration: 8000 });
      }

      console.log("All departments validated:", departments.map(d => ({
        name: d.name,
        studentCount: d.students.length
      })));

      // Validate subjects
      if (subjects.some(s => !s.name)) {
        toast.error("Please provide names for all subjects");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Gather all students from all departments
      const allStudents = departments.flatMap(d => d.students);
      const totalSeats = validatedData.benchRows * validatedData.benchColumns * validatedData.numberOfHalls;

      console.log(`Total students: ${allStudents.length}, Total seats: ${totalSeats}`);

      if (allStudents.length > totalSeats) {
        toast.error(`Not enough seats! You have ${allStudents.length} students but only ${totalSeats} seats available.`);
        setLoading(false);
        return;
      }

      if (allStudents.length === 0) {
        toast.error("No students found in uploaded CSV files");
        setLoading(false);
        return;
      }

      // Create exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          exam_code: validatedData.examCode,
          exam_name: validatedData.examName,
          total_students: allStudents.length,
          number_of_halls: validatedData.numberOfHalls,
          students_per_hall: validatedData.benchRows * validatedData.benchColumns,
          bench_rows: validatedData.benchRows,
          bench_columns: validatedData.benchColumns,
          created_by: user.id,
          status: "published",
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create or get departments
      const deptIds: { [name: string]: string } = {};
      for (const dept of departments) {
        const { data: existingDept } = await supabase
          .from("departments")
          .select("id")
          .eq("name", dept.name)
          .maybeSingle();

        if (existingDept) {
          deptIds[dept.name] = existingDept.id;
        } else {
          const { data: newDept, error } = await supabase
            .from("departments")
            .insert({ name: dept.name })
            .select()
            .single();
          if (error) throw error;
          deptIds[dept.name] = newDept.id;
        }

        await supabase.from("exam_departments").insert({
          exam_id: exam.id,
          department_id: deptIds[dept.name],
          student_count: dept.students.length,
        });
      }

      // Create subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .insert(
          subjects.map(s => ({
            exam_id: exam.id,
            subject_name: s.name,
            subject_code: s.code,
            use_shared_seating: useSharedSeating,
          }))
        )
        .select();

      if (subjectsError) throw subjectsError;

      // Create halls
      const hallsToInsert = hallNames.map((name, index) => ({
        exam_id: exam.id,
        hall_name: name || `Hall ${index + 1}`,
        capacity: validatedData.benchRows * validatedData.benchColumns,
        location_link: hallLocationLinks[index] || null,
      }));

      const { data: halls, error: hallsError } = await supabase
        .from("halls")
        .insert(hallsToInsert)
        .select();

      if (hallsError) throw hallsError;

      // Allocate seats - use a working copy to avoid mutating original
      const allAllocations = [];
      const studentsToAllocate = [...allStudents];
      
      console.log(`Starting seat allocation for ${studentsToAllocate.length} students across ${halls.length} halls`);
      
      if (useSharedSeating) {
        // Same seating for all subjects
        for (const hall of halls) {
          const seatsInHall = validatedData.benchRows * validatedData.benchColumns;
          const studentsForHall = studentsToAllocate.splice(0, Math.min(seatsInHall, studentsToAllocate.length));
          
          const hallAllocations = allocateSeatsRoundRobin(
            studentsForHall,
            validatedData.benchRows,
            validatedData.benchColumns,
            hall.id
          );
          
          allAllocations.push(...hallAllocations.map(a => ({ ...a, exam_id: exam.id })));
          console.log(`Hall ${hall.hall_name}: allocated ${hallAllocations.length} students`);
        }
      } else {
        // Different seating per subject
        for (const subject of subjectsData) {
          const subjectStudents = [...allStudents];
          for (const hall of halls) {
            const seatsInHall = validatedData.benchRows * validatedData.benchColumns;
            const studentsForHall = subjectStudents.splice(0, Math.min(seatsInHall, subjectStudents.length));
            
            const hallAllocations = allocateSeatsRoundRobin(
              studentsForHall,
              validatedData.benchRows,
              validatedData.benchColumns,
              hall.id,
              subject.id
            );
            
            allAllocations.push(...hallAllocations.map(a => ({ ...a, exam_id: exam.id })));
            console.log(`Hall ${hall.hall_name}, Subject ${subject.subject_name}: allocated ${hallAllocations.length} students`);
          }
        }
      }

      console.log(`Total seat allocations created: ${allAllocations.length}`);

      const { error: allocationsError } = await supabase
        .from("seat_allocations")
        .insert(allAllocations);

      if (allocationsError) throw allocationsError;

      toast.success("Exam created successfully with smart seat allocation!");
      navigate("/admin");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create exam");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="max-w-2xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Exam</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="examName">Exam Name</Label>
                <Input
                  id="examName"
                  placeholder="Mid-Semester Exam"
                  value={formData.examName}
                  onChange={(e) =>
                    setFormData({ ...formData, examName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="examCode">Exam Code</Label>
                <Input
                  id="examCode"
                  placeholder="EXM1025"
                  value={formData.examCode}
                  onChange={(e) =>
                    setFormData({ ...formData, examCode: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numberOfSubjects">Number of Subjects</Label>
                <Input
                  id="numberOfSubjects"
                  type="number"
                  min="1"
                  value={formData.numberOfSubjects || ""}
                  onChange={(e) =>
                    handleNumberOfSubjectsChange(parseInt(e.target.value) || 1)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="numberOfDepartments">Number of Departments</Label>
                <Input
                  id="numberOfDepartments"
                  type="number"
                  min="1"
                  value={formData.numberOfDepartments || ""}
                  onChange={(e) =>
                    handleNumberOfDepartmentsChange(parseInt(e.target.value) || 1)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="numberOfHalls">Number of Halls</Label>
                <Input
                  id="numberOfHalls"
                  type="number"
                  min="1"
                  value={formData.numberOfHalls || ""}
                  onChange={(e) =>
                    handleNumberOfHallsChange(parseInt(e.target.value) || 0)
                  }
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="benchRows">Bench Rows</Label>
                <Input
                  id="benchRows"
                  type="number"
                  min="1"
                  value={formData.benchRows || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benchRows: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="benchColumns">Bench Columns</Label>
                <Input
                  id="benchColumns"
                  type="number"
                  min="1"
                  value={formData.benchColumns || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benchColumns: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </div>

            {subjects.length > 0 && (
              <div>
                <Label>Subjects</Label>
                <div className="space-y-3 mt-2">
                  {subjects.map((subject, index) => (
                    <div key={index} className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder={`Subject ${index + 1} Name`}
                        value={subject.name}
                        onChange={(e) => handleSubjectChange(index, "name", e.target.value)}
                        required
                      />
                      <Input
                        placeholder={`Subject ${index + 1} Code`}
                        value={subject.code}
                        onChange={(e) => handleSubjectChange(index, "code", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="shared-seating"
                checked={useSharedSeating}
                onCheckedChange={setUseSharedSeating}
              />
              <Label htmlFor="shared-seating" className="cursor-pointer">
                Use same seating arrangement for all subjects
              </Label>
            </div>

            {departments.length > 0 && (
              <div>
                <Label>Departments & Student Lists</Label>
                <div className="space-y-4 mt-2">
                  {departments.map((dept, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <Input
                          placeholder={`Department ${index + 1} Name (e.g., CSE, AIDS)`}
                          value={dept.name}
                          onChange={(e) => handleDepartmentChange(index, "name", e.target.value)}
                          required
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                           <Input
                              type="file"
                              accept=".csv"
                              onChange={(e) => handleDepartmentFileUpload(index, e.target.files?.[0] || null)}
                              required
                              className={dept.students.length > 0 ? "border-green-500" : ""}
                            />
                            <p className={`text-xs mt-1 ${dept.students.length > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                              {dept.file ? (
                                <>
                                  {dept.file.name} • CSV Format: Name, Registration Number
                                  {parsingStatus[index] && " | Parsing..."}
                                  {!parsingStatus[index] && dept.students.length > 0 && ` | ✓ ${dept.students.length} students loaded`}
                                  {!parsingStatus[index] && dept.file && dept.students.length === 0 && " | No students detected"}
                                </>
                              ) : (
                                "CSV Format: Name, Registration Number"
                              )}
                            </p>
                          </div>
                          {dept.file && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleClearDepartment(index)} aria-label="Remove CSV">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {formData.numberOfHalls > 0 && (
              <div>
                <Label>Hall Names & Location Links</Label>
                <div className="space-y-4 mt-2">
                  {hallNames.map((name, index) => (
                    <div key={index} className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder={`Hall ${index + 1} Name`}
                        value={name}
                        onChange={(e) => handleHallNameChange(index, e.target.value)}
                      />
                      <Input
                        placeholder="Google Maps Link (optional)"
                        value={hallLocationLinks[index]}
                        onChange={(e) => handleHallLocationLinkChange(index, e.target.value)}
                        type="url"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating..." : "Create Exam & Allocate Seats"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateExam;
