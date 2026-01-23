import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function EmailPreferences() {
  const { user } = useAuth();
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("weekly_report_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setWeeklyReportEnabled(data.weekly_report_enabled ?? true);
      }
      setIsLoading(false);
    };

    fetchPreferences();
  }, [user]);

  const handleToggle = async (enabled: boolean) => {
    if (!user) return;
    
    setIsSaving(true);
    setWeeklyReportEnabled(enabled);

    const { error } = await supabase
      .from("profiles")
      .update({ weekly_report_enabled: enabled })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update preferences");
      setWeeklyReportEnabled(!enabled);
    } else {
      toast.success(enabled ? "Weekly reports enabled" : "Weekly reports disabled");
    }
    
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {weeklyReportEnabled ? (
            <Bell className="w-4 h-4 text-primary" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
          Email Notifications
        </CardTitle>
        <CardDescription>
          Manage your email preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="weekly-report" className="font-medium">
              Weekly Progress Reports
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive a summary of your scores and personalized recommendations every Sunday
            </p>
          </div>
          <Switch
            id="weekly-report"
            checked={weeklyReportEnabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
