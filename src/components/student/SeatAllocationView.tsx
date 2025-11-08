import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, User, Hash, Grid, Building, ExternalLink } from "lucide-react";
import { useState } from "react";

interface SeatAllocationViewProps {
  allocation: {
    exam: any;
    student: any;
    hall: any;
    allSeats: any[];
  };
  onReset: () => void;
}

const SeatAllocationView = ({ allocation, onReset }: SeatAllocationViewProps) => {
  const { exam, student, hall, allSeats } = allocation;
  const [selectedSeat, setSelectedSeat] = useState<any>(null);

  const rows = exam.bench_rows || Math.ceil(hall.capacity / 10);
  const cols = exam.bench_columns || 10;

  const getSeatAt = (row: number, col: number) => {
    return allSeats.find(
      (s) => s.row_number === row && s.column_number === col
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{exam.exam_name}</h1>
            <p className="text-muted-foreground">Exam Code: {exam.exam_code}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>Print Hall Ticket</Button>
            <Button variant="outline" onClick={onReset}>
              Search Again
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Student Name</p>
              <p className="font-semibold">{student.student_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <Hash className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Registration Number</p>
              <p className="font-semibold">{student.registration_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Hall Name</p>
              <p className="font-semibold">{hall.hall_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <Grid className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Seat Number</p>
              <p className="font-semibold">Seat {student.seat_number}</p>
            </div>
          </div>

          {student.department_name && (
            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
              <Building className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-semibold">{student.department_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Hall Location Section */}
        <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Hall Location
          </h3>
          {hall.location_link ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(hall.location_link, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              📍 Open Hall Location in Google Maps
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              📍 Location not added by Examination Controller.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Hall Seating Layout</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your seat is highlighted in yellow
        </p>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 mb-2">
                <div className="w-12 flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  R{rowIndex + 1}
                </div>
                {Array.from({ length: cols }, (_, colIndex) => {
                  const seat = getSeatAt(rowIndex + 1, colIndex + 1);
                  const isUserSeat = seat?.id === student.id;

                  return (
                    <button
                      key={colIndex}
                      onClick={() => seat && setSelectedSeat(seat)}
                      className={`flex-1 min-w-[50px] h-12 flex flex-col items-center justify-center text-xs font-medium rounded border transition-all ${
                        seat
                          ? isUserSeat
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110 cursor-default"
                            : "bg-card hover:bg-muted border-border cursor-pointer hover:scale-105"
                          : "bg-muted/30 border-dashed border-muted-foreground/20 cursor-default"
                      }`}
                      title={seat ? `Click to view details` : "Empty"}
                      disabled={!seat}
                    >
                      {seat && (
                        <>
                          <span className="font-bold">{seat.seat_number}</span>
                          {seat.department_name && (
                            <span className="text-[10px] opacity-70">{seat.department_name}</span>
                          )}
                        </>
                      )}
                      {!seat && "-"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {selectedSeat && (
          <Card className="mt-4 p-4 bg-accent/10 border-accent">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{selectedSeat.student_name}</p>
                <p className="text-sm text-muted-foreground">Reg: {selectedSeat.registration_number}</p>
                <p className="text-sm text-muted-foreground">Seat: {selectedSeat.seat_number} | {selectedSeat.department_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSeat(null)}>Close</Button>
            </div>
          </Card>
        )}

        <div className="mt-6 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded border border-primary"></div>
            <span>Your Seat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card rounded border border-border"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted/30 rounded border border-dashed border-muted-foreground/20"></div>
            <span>Empty</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SeatAllocationView;
