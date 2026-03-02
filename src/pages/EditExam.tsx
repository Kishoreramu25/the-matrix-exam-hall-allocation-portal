import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2, Save } from "lucide-react";
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
    isLoadedFromDb?: boolean;
}

const EditExam = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [hallNames, setHallNames] = useState<string[]>([]);
    const [hallLocationLinks, setHallLocationLinks] = useState<string[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([{ name: "", code: "" }]);
    const [departments, setDepartments] = useState<Department[]>([{ name: "", file: null, students: [] }]);
    const [parsingStatus, setParsingStatus] = useState<boolean[]>([]);
    const [useSharedSeating, setUseSharedSeating] = useState(true);
    const [shuffleClasses, setShuffleClasses] = useState(true);
    const [formData, setFormData] = useState({
        examName: "",
        examCode: "",
        numberOfHalls: 0,
        benchRows: 0,
        benchColumns: 0,
        numberOfSubjects: 1,
        numberOfDepartments: 1,
    });

    useEffect(() => {
        fetchExamData();
    }, [examId]);

    const fetchExamData = async () => {
        if (!examId) return;

        try {
            setLoading(true);

            // 1. Fetch Exam Details
            const { data: exam, error: examError } = await supabase
                .from("exams")
                .select("*")
                .eq("id", examId)
                .single();

            if (examError) throw examError;

            // 2. Fetch Subjects
            const { data: subjectsData, error: subjectsError } = await supabase
                .from("subjects")
                .select("*")
                .eq("exam_id", examId);

            if (subjectsError) throw subjectsError;

            // 3. Fetch Halls
            const { data: hallsData, error: hallsError } = await supabase
                .from("halls")
                .select("*")
                .eq("exam_id", examId)
                .order("hall_name");

            if (hallsError) throw hallsError;

            // 4. Fetch Allocations to reconstruct departments and students
            // We use allocations because they contain the actual student data snapshot
            const { data: allocationsData, error: allocError } = await supabase
                .from("seat_allocations")
                .select("student_name, registration_number, department_name")
                .eq("exam_id", examId);

            if (allocError) throw allocError;

            // Reconstruct Departments
            // Group allocations by department name and deduplicate students
            const deptMap = new Map<string, Map<string, any>>();

            allocationsData?.forEach((alloc) => {
                if (!deptMap.has(alloc.department_name)) {
                    deptMap.set(alloc.department_name, new Map());
                }
                const deptStudents = deptMap.get(alloc.department_name)!;
                // Use registration number as key to deduplicate
                if (!deptStudents.has(alloc.registration_number)) {
                    deptStudents.set(alloc.registration_number, {
                        name: alloc.student_name,
                        registration_number: alloc.registration_number,
                        department: alloc.department_name
                    });
                }
            });

            const reconstructedDepartments: Department[] = Array.from(deptMap.entries()).map(([name, studentMap]) => ({
                name,
                file: null,
                students: Array.from(studentMap.values()),
                isLoadedFromDb: true,
                parseReport: {
                    totalRows: studentMap.size,
                    validRows: studentMap.size,
                    missingName: 0,
                    missingReg: 0,
                    duplicatesWithinFile: 0
                }
            }));

            // Set State
            setFormData({
                examName: exam.exam_name,
                examCode: exam.exam_code,
                numberOfHalls: exam.number_of_halls,
                benchRows: exam.bench_rows,
                benchColumns: exam.bench_columns,
                numberOfSubjects: subjectsData?.length || 1,
                numberOfDepartments: reconstructedDepartments.length || 1,
            });

            setSubjects(subjectsData?.map(s => ({ name: s.subject_name, code: s.subject_code || "" })) || []);

            setHallNames(hallsData?.map(h => h.hall_name) || []);
            setHallLocationLinks(hallsData?.map(h => h.location_link || "") || []);

            setDepartments(reconstructedDepartments);
            setParsingStatus(Array(reconstructedDepartments.length).fill(false));

            // Determine shared seating from first subject (assuming all same for now as per create logic)
            if (subjectsData && subjectsData.length > 0) {
                setUseSharedSeating(subjectsData[0].use_shared_seating ?? true);
            }

        } catch (error: any) {
            console.error("Error fetching exam:", error);
            toast.error("Failed to load exam data");
            navigate("/admin");
        } finally {
            setLoading(false);
        }
    };

    const handleNumberOfHallsChange = (value: number) => {
        setFormData({ ...formData, numberOfHalls: value });
        // Preserve existing names if increasing, truncate if decreasing
        const newNames = Array(value).fill("").map((_, i) => hallNames[i] || "");
        const newLinks = Array(value).fill("").map((_, i) => hallLocationLinks[i] || "");
        setHallNames(newNames);
        setHallLocationLinks(newLinks);
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

                    if (text.charCodeAt(0) === 0xFEFF) {
                        text = text.slice(1);
                    }

                    const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
                    const nonEmpty = rawLines.filter((line) => line && line.trim().length > 0);

                    if (nonEmpty.length < 1) {
                        reject(new Error("CSV must contain data"));
                        return;
                    }

                    const detectDelimiter = (lines: string[]) => {
                        const candidates = [",", ";", "\t", "|"];
                        let best = ",";
                        let bestScore = -1;
                        for (const delim of candidates) {
                            const sample = lines.slice(0, Math.min(10, lines.length));
                            const score = sample
                                .map((l) => {
                                    let count = 0;
                                    let inQ = false;
                                    for (let i = 0; i < l.length; i++) {
                                        if (l[i] === '"') inQ = !inQ;
                                        else if (l[i] === delim && !inQ) count++;
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
                        return result.map(f => f.replace(/^["']|["']$/g, '').trim());
                    };

                    const headerRowIndex = Math.max(
                        0,
                        nonEmpty.findIndex((l) => {
                            const lower = l.toLowerCase();
                            return lower.includes("name") && (lower.includes("reg") || lower.includes("register") || lower.includes("roll") || lower.includes("admission") || lower.includes("number"));
                        })
                    );

                    const header = parseCSVLine(nonEmpty[headerRowIndex].toLowerCase());
                    let nameIndex = -1;
                    let regIndex = -1;

                    for (let i = 0; i < header.length; i++) {
                        const col = header[i];
                        if (regIndex === -1) {
                            if (col.includes('roll') || col.includes('reg') || col.includes('admission') || col === 'id') {
                                regIndex = i;
                            }
                        }
                    }

                    for (let i = 0; i < header.length; i++) {
                        const col = header[i];
                        if (nameIndex === -1 && i !== regIndex && col.includes('name')) {
                            nameIndex = i;
                        }
                    }

                    if (nameIndex === -1 || regIndex === -1) {
                        // Fallback
                        nameIndex = 0;
                        regIndex = 1;
                    }

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

                        if (!name) { missingName++; continue; }
                        if (!regNumber) { missingReg++; continue; }

                        if (name.toLowerCase().includes('name') || regNumber.toLowerCase().includes('number')) continue;

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
                        reject(new Error("No valid student rows found."));
                        return;
                    }

                    resolve({
                        students,
                        report: { totalRows, validRows: students.length, missingName, missingReg, duplicatesWithinFile }
                    });
                } catch (error: any) {
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

        setParsingStatus((prev) => {
            const arr = [...prev];
            arr[index] = true;
            return arr;
        });

        try {
            const { students, report } = await parseStudentFile(file, departments[index].name);
            const newDepts = [...departments];
            newDepts[index] = {
                ...newDepts[index],
                file: file,
                students: students,
                parseReport: report,
                isLoadedFromDb: false // It's a new file now
            };
            setDepartments(newDepts);
            toast.success(`✓ ${students.length} students loaded`);
        } catch (error: any) {
            toast.error(error.message);
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
        handleDepartmentChange(index, "isLoadedFromDb", false);
    };

    const getOrderedStudents = (depts: Department[], shouldShuffle: boolean) => {
        if (!shouldShuffle || depts.length % 2 !== 0) {
            return depts.flatMap((d) => [...d.students]);
        }

        const interleave = (ds: Department[]) => {
            const queues = ds.map((d) => [...d.students]);
            const result = [];
            let active = true;
            while (active) {
                active = false;
                for (let i = 0; i < queues.length; i++) {
                    if (queues[i].length > 0) {
                        result.push(queues[i].shift());
                        active = true;
                    }
                }
            }
            return result;
        };

        const result = [];
        for (let i = 0; i < depts.length; i += 2) {
            const pair = depts.slice(i, i + 2);
            result.push(...interleave(pair));
        }
        return result;
    };

    const allocateSeats = (
        students: any[],
        rows: number,
        cols: number,
        hallId: string,
        subjectId?: string
    ) => {
        const allocations = [];
        for (let row = 1; row <= rows; row++) {
            for (let col = 1; col <= cols; col++) {
                if (students.length === 0) return allocations;
                const student = students.shift();
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

            // Validation logic...
            if (departments.some(d => !d.name || d.students.length === 0)) {
                toast.error("All departments must have a name and students");
                setLoading(false);
                return;
            }

            const allStudents = departments.flatMap(d => d.students);
            const totalSeats = validatedData.benchRows * validatedData.benchColumns * validatedData.numberOfHalls;

            if (allStudents.length > totalSeats) {
                toast.error(`Capacity Mismatch! Students: ${allStudents.length}, Seats: ${totalSeats}`);
                setLoading(false);
                return;
            }

            // 1. Update Exam Metadata
            const { error: updateError } = await supabase
                .from("exams")
                .update({
                    exam_code: validatedData.examCode,
                    exam_name: validatedData.examName,
                    total_students: allStudents.length,
                    number_of_halls: validatedData.numberOfHalls,
                    students_per_hall: validatedData.benchRows * validatedData.benchColumns,
                    bench_rows: validatedData.benchRows,
                    bench_columns: validatedData.benchColumns,
                })
                .eq("id", examId);

            if (updateError) throw updateError;

            // 2. Delete existing related data (Clean slate for allocations)
            await supabase.from("seat_allocations").delete().eq("exam_id", examId);
            await supabase.from("exam_departments").delete().eq("exam_id", examId);
            await supabase.from("subjects").delete().eq("exam_id", examId);
            await supabase.from("halls").delete().eq("exam_id", examId);

            // 3. Re-insert everything (Same as CreateExam)

            // Departments
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
                    exam_id: examId,
                    department_id: deptIds[dept.name],
                    student_count: dept.students.length,
                });
            }

            // Subjects
            const { data: subjectsData, error: subjectsError } = await supabase
                .from("subjects")
                .insert(
                    subjects.map(s => ({
                        exam_id: examId,
                        subject_name: s.name,
                        subject_code: s.code,
                        use_shared_seating: useSharedSeating,
                    }))
                )
                .select();

            if (subjectsError) throw subjectsError;

            // Halls
            const hallsToInsert = hallNames.map((name, index) => ({
                exam_id: examId,
                hall_name: name || `Hall ${index + 1}`,
                capacity: validatedData.benchRows * validatedData.benchColumns,
                location_link: hallLocationLinks[index] || null,
            }));

            const { data: halls, error: hallsError } = await supabase
                .from("halls")
                .insert(hallsToInsert)
                .select();

            if (hallsError) throw hallsError;

            // Allocations
            const allAllocations = [];
            if (useSharedSeating) {
                const studentList = getOrderedStudents(departments, shuffleClasses);
                for (const hall of halls) {
                    const hallAllocations = allocateSeats(
                        studentList,
                        validatedData.benchRows,
                        validatedData.benchColumns,
                        hall.id
                    );
                    allAllocations.push(...hallAllocations.map(a => ({ ...a, exam_id: examId })));
                }
            } else {
                for (const subject of subjectsData) {
                    const studentList = getOrderedStudents(departments, shuffleClasses);
                    for (const hall of halls) {
                        const hallAllocations = allocateSeats(
                            studentList,
                            validatedData.benchRows,
                            validatedData.benchColumns,
                            hall.id,
                            subject.id
                        );
                        allAllocations.push(...hallAllocations.map(a => ({ ...a, exam_id: examId })));
                    }
                }
            }

            const { error: allocationsError } = await supabase
                .from("seat_allocations")
                .insert(allAllocations);

            if (allocationsError) throw allocationsError;

            toast.success("Exam updated successfully!");
            navigate("/admin");

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to update exam");
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

                <Card className="max-w-2xl mx-auto p-8">
                    <h1 className="text-3xl font-bold mb-6">Edit Exam</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="examName">Exam Name</Label>
                                <Input
                                    id="examName"
                                    value={formData.examName}
                                    onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="examCode">Exam Code</Label>
                                <Input
                                    id="examCode"
                                    value={formData.examCode}
                                    onChange={(e) => setFormData({ ...formData, examCode: e.target.value })}
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
                                    value={formData.numberOfSubjects}
                                    onChange={(e) => handleNumberOfSubjectsChange(parseInt(e.target.value) || 1)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="numberOfDepartments">Number of Departments</Label>
                                <Input
                                    id="numberOfDepartments"
                                    type="number"
                                    min="1"
                                    value={formData.numberOfDepartments}
                                    onChange={(e) => handleNumberOfDepartmentsChange(parseInt(e.target.value) || 1)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="numberOfHalls">Number of Halls</Label>
                                <Input
                                    id="numberOfHalls"
                                    type="number"
                                    min="1"
                                    value={formData.numberOfHalls}
                                    onChange={(e) => handleNumberOfHallsChange(parseInt(e.target.value) || 0)}
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
                                    value={formData.benchRows}
                                    onChange={(e) => setFormData({ ...formData, benchRows: parseInt(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="benchColumns">Bench Columns</Label>
                                <Input
                                    id="benchColumns"
                                    type="number"
                                    min="1"
                                    value={formData.benchColumns}
                                    onChange={(e) => setFormData({ ...formData, benchColumns: parseInt(e.target.value) || 0 })}
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

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="shuffle-classes"
                                checked={shuffleClasses}
                                onCheckedChange={setShuffleClasses}
                            />
                            <Label htmlFor="shuffle-classes" className="cursor-pointer">
                                Shuffle Classes (Pairwise - requires even number of departments)
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
                                                    placeholder={`Department ${index + 1} Name`}
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
                                                            className={dept.students.length > 0 ? "border-green-500" : ""}
                                                        />
                                                        <p className={`text-xs mt-1 ${dept.students.length > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                                                            {dept.isLoadedFromDb ? (
                                                                `✓ ${dept.students.length} students loaded from database`
                                                            ) : dept.file ? (
                                                                `✓ ${dept.students.length} students loaded from file`
                                                            ) : (
                                                                "CSV Format: Name, Registration Number"
                                                            )}
                                                        </p>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleClearDepartment(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
                            <Save className="mr-2 h-4 w-4" />
                            {loading ? "Saving Changes..." : "Save Changes & Re-Allocate"}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default EditExam;
