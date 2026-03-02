import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";



const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Validate login data
        const validatedData = loginSchema.parse(formData);

        // Sign in with email
        const { error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        if (error) throw error;
        toast.success("Logged in successfully");
        navigate("/admin");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        const message = error instanceof Error ? error.message : "An error occurred";
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePremiumClick = () => {
    const message = encodeURIComponent("Hey i whould like to continue the premium plan could you please share the details");
    window.open(`https://wa.me/919042427828?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isLogin ? "Admin Login" : "Premium Plan"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to manage exams" : "Unlock exclusive features"}
          </p>
        </div>

        {isLogin ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@college.edu"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </Button>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="p-6 bg-primary/5 rounded-lg border border-primary/10">
              <h3 className="text-2xl font-bold text-primary mb-2">$50 / month</h3>
              <p className="text-muted-foreground mb-4">
                Get unlimited access to exam management, seat allocation, and advanced reporting features.
              </p>
              <ul className="text-sm text-left space-y-2 mb-6 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Unlimited Exams
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Smart Seat Allocation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Priority Support
                </li>
              </ul>
              <Button
                onClick={handlePremiumClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                CONTINUE WITH PREMIUM
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin ? "Don't have an account? Get Premium" : "Already have an account? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
