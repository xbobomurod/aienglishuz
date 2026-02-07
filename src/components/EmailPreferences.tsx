import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, Calendar, Trophy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NotificationPreferences {
  weekly_report_enabled: boolean;
  practice_reminder_enabled: boolean;
  milestone_alerts_enabled: boolean;
}

export function EmailPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    weekly_report_enabled: true,
    practice_reminder_enabled: true,
    milestone_alerts_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("weekly_report_enabled, practice_reminder_enabled, milestone_alerts_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPreferences({
          weekly_report_enabled: data.weekly_report_enabled ?? true,
          practice_reminder_enabled: data.practice_reminder_enabled ?? true,
          milestone_alerts_enabled: data.milestone_alerts_enabled ?? true,
        });
      }
      setIsLoading(false);
    };

    fetchPreferences();
  }, [user]);

  const handleToggle = async (field: keyof NotificationPreferences, enabled: boolean) => {
    if (!user) return;
    
    setSavingField(field);
    const previousValue = preferences[field];
    setPreferences(prev => ({ ...prev, [field]: enabled }));

    const { error } = await supabase
      .from("profiles")
      .update({ [field]: enabled })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update preferences");
      setPreferences(prev => ({ ...prev, [field]: previousValue }));
    } else {
      const messages: Record<keyof NotificationPreferences, { on: string; off: string }> = {
        weekly_report_enabled: { on: "Weekly reports enabled", off: "Weekly reports disabled" },
        practice_reminder_enabled: { on: "Practice reminders enabled", off: "Practice reminders disabled" },
        milestone_alerts_enabled: { on: "Milestone alerts enabled", off: "Milestone alerts disabled" },
      };
      toast.success(enabled ? messages[field].on : messages[field].off);
    }
    
    setSavingField(null);
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

  const hasAnyEnabled = Object.values(preferences).some(v => v);

  return (
    <Card>
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          {hasAnyEnabled ? (
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
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Weekly Progress Reports */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex gap-3">
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="weekly-report" className="font-medium text-sm sm:text-base cursor-pointer">
                Weekly Progress Reports
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Receive a summary of your scores and personalized recommendations every Sunday
              </p>
            </div>
          </div>
          <Switch
            id="weekly-report"
            checked={preferences.weekly_report_enabled}
            onCheckedChange={(enabled) => handleToggle("weekly_report_enabled", enabled)}
            disabled={savingField !== null}
          />
        </div>

        <Separator />

        {/* Practice Reminders */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex gap-3">
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
              <Calendar className="h-4 w-4 text-orange-500" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="practice-reminder" className="font-medium text-sm sm:text-base cursor-pointer">
                Practice Reminders
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Get reminded to practice when you haven't completed any tests in 3 days
              </p>
            </div>
          </div>
          <Switch
            id="practice-reminder"
            checked={preferences.practice_reminder_enabled}
            onCheckedChange={(enabled) => handleToggle("practice_reminder_enabled", enabled)}
            disabled={savingField !== null}
          />
        </div>

        <Separator />

        {/* Score Milestone Alerts */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex gap-3">
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="milestone-alerts" className="font-medium text-sm sm:text-base cursor-pointer">
                Score Milestone Alerts
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Celebrate when you reach new band score milestones (6.0, 6.5, 7.0, etc.)
              </p>
            </div>
          </div>
          <Switch
            id="milestone-alerts"
            checked={preferences.milestone_alerts_enabled}
            onCheckedChange={(enabled) => handleToggle("milestone_alerts_enabled", enabled)}
            disabled={savingField !== null}
          />
        </div>
      </CardContent>
    </Card>
  );
}
