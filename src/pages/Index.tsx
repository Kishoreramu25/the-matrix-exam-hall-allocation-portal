import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LayoutGrid } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            THE MATRIX
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Smart exam hall allocation system for colleges and universities
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="p-8 hover:shadow-[var(--shadow-elevated)] transition-all duration-300 hover:-translate-y-1">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Admin Portal</h2>
              <p className="text-muted-foreground">
                Create exams, upload student lists, and manage hall allocations
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/admin")}
                className="w-full"
              >
                Admin Login
              </Button>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-[var(--shadow-elevated)] transition-all duration-300 hover:-translate-y-1">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Student Portal</h2>
              <p className="text-muted-foreground">
                Find your exam hall and seat allocation instantly
              </p>
              <Button 
                size="lg"
                onClick={() => navigate("/student")}
                className="w-full"
              >
                Find My Seat
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
