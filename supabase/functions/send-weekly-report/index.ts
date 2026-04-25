import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserReport {
  email: string;
  displayName: string;
  writingStats: {
    count: number;
    avgScore: number;
    trend: number;
    bestArea: string;
    weakestArea: string;
  };
  speakingStats: {
    count: number;
    avgScore: number;
    trend: number;
    bestArea: string;
    weakestArea: string;
  };
  recommendations: string[];
}

function generateRecommendations(report: UserReport): string[] {
  const recommendations: string[] = [];

  // Writing recommendations
  if (report.writingStats.count === 0) {
    recommendations.push("📝 Try completing at least 2 writing tasks this week to track your progress.");
  } else if (report.writingStats.trend < 0) {
    recommendations.push(`📝 Focus on ${report.writingStats.weakestArea} in your writing - consider reviewing model answers.`);
  } else if (report.writingStats.avgScore < 6) {
    recommendations.push("📝 Practice writing topic sentences and clear paragraph structure.");
  }

  // Speaking recommendations
  if (report.speakingStats.count === 0) {
    recommendations.push("🎙️ Record at least 2 speaking responses this week to improve fluency.");
  } else if (report.speakingStats.trend < 0) {
    recommendations.push(`🎙️ Work on your ${report.speakingStats.weakestArea} - try speaking for 2 minutes daily.`);
  } else if (report.speakingStats.avgScore < 6) {
    recommendations.push("🎙️ Focus on reducing filler words and expanding your vocabulary range.");
  }

  // Positive reinforcement
  if (report.writingStats.trend > 0) {
    recommendations.push(`✨ Great progress in writing! Your ${report.writingStats.bestArea} has improved.`);
  }
  if (report.speakingStats.trend > 0) {
    recommendations.push(`✨ Your speaking is improving! Keep working on ${report.speakingStats.bestArea}.`);
  }

  // General tips
  if (recommendations.length < 3) {
    recommendations.push("💡 Set a goal to practice for 15-20 minutes daily for consistent improvement.");
  }

  return recommendations.slice(0, 4);
}

function generateEmailHtml(report: UserReport): string {
  const overallAvg = (
    (report.writingStats.count > 0 ? report.writingStats.avgScore : 0) +
    (report.speakingStats.count > 0 ? report.speakingStats.avgScore : 0)
  ) / (
    (report.writingStats.count > 0 ? 1 : 0) +
    (report.speakingStats.count > 0 ? 1 : 0)
  ) || 0;

  const totalPractice = report.writingStats.count + report.speakingStats.count;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Progress Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2d9c8f 0%, #3fa4d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📊 Weekly Progress Report</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Hello, ${report.displayName}!</p>
            </td>
          </tr>

          <!-- Overview -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; color: #1a202c; font-size: 20px;">📈 Your Week at a Glance</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #16a34a;">${totalPractice}</p>
                      <p style="margin: 5px 0 0; color: #4b5563; font-size: 14px;">Tasks Completed</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #2563eb;">${overallAvg.toFixed(1)}</p>
                      <p style="margin: 5px 0 0; color: #4b5563; font-size: 14px;">Avg IELTS Band</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Writing Stats -->
          ${report.writingStats.count > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px;">
              <div style="background-color: #fafafa; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px; color: #1a202c; font-size: 16px;">✍️ Writing Performance</h3>
                <table width="100%">
                  <tr>
                    <td>
                      <p style="margin: 0; color: #4b5563; font-size: 14px;">Tasks: <strong>${report.writingStats.count}</strong></p>
                      <p style="margin: 5px 0 0; color: #4b5563; font-size: 14px;">Avg Score: <strong>${report.writingStats.avgScore.toFixed(1)}/9</strong></p>
                    </td>
                    <td style="text-align: right;">
                      <span style="display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; ${report.writingStats.trend >= 0 ? 'background-color: #dcfce7; color: #16a34a;' : 'background-color: #fee2e2; color: #dc2626;'}">
                        ${report.writingStats.trend >= 0 ? '↑' : '↓'} ${Math.abs(report.writingStats.trend).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Speaking Stats -->
          ${report.speakingStats.count > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px;">
              <div style="background-color: #fafafa; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px; color: #1a202c; font-size: 16px;">🎙️ Speaking Performance</h3>
                <table width="100%">
                  <tr>
                    <td>
                      <p style="margin: 0; color: #4b5563; font-size: 14px;">Tasks: <strong>${report.speakingStats.count}</strong></p>
                      <p style="margin: 5px 0 0; color: #4b5563; font-size: 14px;">Avg Score: <strong>${report.speakingStats.avgScore.toFixed(1)}/9</strong></p>
                    </td>
                    <td style="text-align: right;">
                      <span style="display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; ${report.speakingStats.trend >= 0 ? 'background-color: #dcfce7; color: #16a34a;' : 'background-color: #fee2e2; color: #dc2626;'}">
                        ${report.speakingStats.trend >= 0 ? '↑' : '↓'} ${Math.abs(report.speakingStats.trend).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Recommendations -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <h3 style="margin: 0 0 15px; color: #1a202c; font-size: 16px;">💡 This Week's Recommendations</h3>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                ${report.recommendations.map(rec => `<li style="margin-bottom: 8px;">${rec}</li>`).join('')}
              </ul>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '#'}" style="display: inline-block; background: linear-gradient(135deg, #2d9c8f 0%, #3fa4d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Continue Practicing →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You're receiving this because you enabled weekly reports.<br>
                <a href="#" style="color: #6b7280;">Unsubscribe</a> from these emails.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Weekly report function triggered");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users with weekly reports enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, weekly_report_enabled")
      .eq("weekly_report_enabled", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users with reports enabled`);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const profile of profiles || []) {
      try {
        // Get user email from auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError || !userData.user?.email) {
          console.log(`Skipping user ${profile.user_id}: no email found`);
          continue;
        }

        const userEmail = userData.user.email;
        console.log(`Processing report for ${userEmail}`);

        // Get writing evaluations from last 7 days
        const { data: writingEvals } = await supabase
          .from("writing_evaluations")
          .select("band_score, task_response, coherence, lexical_resource, grammar, created_at")
          .eq("user_id", profile.user_id)
          .gte("created_at", oneWeekAgo.toISOString())
          .order("created_at", { ascending: false });

        // Get speaking evaluations from last 7 days
        const { data: speakingEvals } = await supabase
          .from("speaking_evaluations")
          .select("band_score, fluency_score, vocabulary_score, grammar_score, created_at")
          .eq("user_id", profile.user_id)
          .gte("created_at", oneWeekAgo.toISOString())
          .order("created_at", { ascending: false });

        // Calculate writing stats
        const writingStats = {
          count: writingEvals?.length || 0,
          avgScore: writingEvals?.length 
            ? writingEvals.reduce((sum, e) => sum + e.band_score, 0) / writingEvals.length 
            : 0,
          trend: 0,
          bestArea: "Task Response",
          weakestArea: "Grammar",
        };

        if (writingEvals && writingEvals.length >= 2) {
          const recent = writingEvals.slice(0, Math.ceil(writingEvals.length / 2));
          const older = writingEvals.slice(Math.ceil(writingEvals.length / 2));
          const recentAvg = recent.reduce((s, e) => s + e.band_score, 0) / recent.length;
          const olderAvg = older.reduce((s, e) => s + e.band_score, 0) / older.length;
          writingStats.trend = recentAvg - olderAvg;

          // Find best and weakest areas
          const avgScores = {
            "Task Response": recent.reduce((s, e) => s + (e.task_response || 0), 0) / recent.length,
            "Coherence": recent.reduce((s, e) => s + (e.coherence || 0), 0) / recent.length,
            "Vocabulary": recent.reduce((s, e) => s + (e.lexical_resource || 0), 0) / recent.length,
            "Grammar": recent.reduce((s, e) => s + (e.grammar || 0), 0) / recent.length,
          };
          const sorted = Object.entries(avgScores).sort((a, b) => b[1] - a[1]);
          writingStats.bestArea = sorted[0][0];
          writingStats.weakestArea = sorted[sorted.length - 1][0];
        }

        // Calculate speaking stats
        const speakingStats = {
          count: speakingEvals?.length || 0,
          avgScore: speakingEvals?.length 
            ? speakingEvals.reduce((sum, e) => sum + e.band_score, 0) / speakingEvals.length 
            : 0,
          trend: 0,
          bestArea: "Fluency",
          weakestArea: "Grammar",
        };

        if (speakingEvals && speakingEvals.length >= 2) {
          const recent = speakingEvals.slice(0, Math.ceil(speakingEvals.length / 2));
          const older = speakingEvals.slice(Math.ceil(speakingEvals.length / 2));
          const recentAvg = recent.reduce((s, e) => s + e.band_score, 0) / recent.length;
          const olderAvg = older.reduce((s, e) => s + e.band_score, 0) / older.length;
          speakingStats.trend = recentAvg - olderAvg;

          // Find best and weakest areas
          const avgScores = {
            "Fluency": recent.reduce((s, e) => s + (e.fluency_score || 0), 0) / recent.length,
            "Vocabulary": recent.reduce((s, e) => s + (e.vocabulary_score || 0), 0) / recent.length,
            "Grammar": recent.reduce((s, e) => s + (e.grammar_score || 0), 0) / recent.length,
          };
          const sorted = Object.entries(avgScores).sort((a, b) => b[1] - a[1]);
          speakingStats.bestArea = sorted[0][0];
          speakingStats.weakestArea = sorted[sorted.length - 1][0];
        }

        // Skip if no activity
        if (writingStats.count === 0 && speakingStats.count === 0) {
          console.log(`Skipping ${userEmail}: no activity this week`);
          continue;
        }

        const report: UserReport = {
          email: userEmail,
          displayName: profile.display_name || userEmail.split("@")[0],
          writingStats,
          speakingStats,
          recommendations: [],
        };

        report.recommendations = generateRecommendations(report);

        // Send email
        const emailHtml = generateEmailHtml(report);
        const emailResponse = await resend.emails.send({
          from: "EnglishPro <onboarding@resend.dev>",
          to: [userEmail],
          subject: `📊 Your Weekly Progress Report - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          html: emailHtml,
        });

        console.log(`Email sent to ${userEmail}:`, emailResponse);

        // Update last_report_sent_at
        await supabase
          .from("profiles")
          .update({ last_report_sent_at: new Date().toISOString() })
          .eq("user_id", profile.user_id);

        results.push({ email: userEmail, success: true });

      } catch (error: any) {
        console.error(`Error processing user ${profile.user_id}:`, error);
        results.push({ 
          email: profile.user_id, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Weekly reports complete: ${successCount}/${results.length} sent successfully`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} weekly reports`,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-weekly-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
