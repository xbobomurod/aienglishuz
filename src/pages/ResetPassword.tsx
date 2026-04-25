import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Loader2, Lock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Check for recovery token or error in URL
  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");

    if (tokenHash) {
      setIsLoading(true);
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error: verifyError }) => {
          if (verifyError) {
            setError("This password reset link is invalid or has expired. Please request a new one.");
            return;
          }

          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .finally(() => setIsLoading(false));
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorCode = hashParams.get("error_code");
    const errorDescription = hashParams.get("error_description");

    if (errorCode || errorDescription) {
      if (errorCode === "otp_expired") {
        setError("This password reset link has expired. Please request a new one.");
      } else if (errorCode === "access_denied") {
        setError("This link is invalid or has already been used. Please request a new password reset.");
      } else {
        setError(errorDescription?.replace(/\+/g, " ") || "An error occurred. Please try again.");
      }
    }
  }, [searchParams]);

  const validatePassword = () => {
    try {
      passwordSchema.parse(password);
      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match");
        return false;
      }
      setPasswordError(null);
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setPasswordError(e.errors[0].message);
      }
      return false;
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message.includes("should be different")) {
          toast.error("New password must be different from your current password.");
        } else {
          toast.error(updateError.message);
        }
        return;
      }

      setIsSuccess(true);
      toast.success("Password updated successfully!");
      
      // Redirect to home after a brief delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">EnglishPro</h1>
          <p className="text-muted-foreground mt-2">Master your English with AI-powered feedback</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {error ? (
                <AlertCircle className="w-5 h-5 text-destructive" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Lock className="w-5 h-5 text-primary" />
              )}
              {error ? "Link Expired" : isSuccess ? "Password Updated" : "Set New Password"}
            </CardTitle>
            <CardDescription>
              {error
                ? "This password reset link is no longer valid."
                : isSuccess
                ? "Your password has been successfully updated."
                : "Enter your new password below."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                <Button 
                  onClick={() => navigate("/auth")} 
                  className="w-full"
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
                <Button 
                  onClick={() => {
                    navigate("/auth");
                    // This will show the forgot password form
                    setTimeout(() => {
                      const forgotBtn = document.querySelector('[data-forgot-password]');
                      if (forgotBtn) (forgotBtn as HTMLButtonElement).click();
                    }, 100);
                  }} 
                  className="w-full"
                >
                  Request New Reset Link
                </Button>
              </div>
            ) : isSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Redirecting you to the app...
                </p>
                <Button onClick={() => navigate("/")} variant="outline">
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="New Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>

                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
