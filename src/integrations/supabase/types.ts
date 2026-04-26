export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      listening_evaluations: {
        Row: {
          audio_topic: string | null
          band_score: number
          correct_answers: Json
          correct_count: number
          created_at: string
          feedback: string | null
          id: string
          questions: Json
          time_taken_seconds: number | null
          total_questions: number
          transcript: string
          user_answers: Json
          user_id: string
        }
        Insert: {
          audio_topic?: string | null
          band_score: number
          correct_answers?: Json
          correct_count?: number
          created_at?: string
          feedback?: string | null
          id?: string
          questions?: Json
          time_taken_seconds?: number | null
          total_questions?: number
          transcript: string
          user_answers?: Json
          user_id: string
        }
        Update: {
          audio_topic?: string | null
          band_score?: number
          correct_answers?: Json
          correct_count?: number
          created_at?: string
          feedback?: string | null
          id?: string
          questions?: Json
          time_taken_seconds?: number | null
          total_questions?: number
          transcript?: string
          user_answers?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_report_sent_at: string | null
          milestone_alerts_enabled: boolean | null
          practice_reminder_enabled: boolean | null
          updated_at: string
          user_id: string
          weekly_report_enabled: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_report_sent_at?: string | null
          milestone_alerts_enabled?: boolean | null
          practice_reminder_enabled?: boolean | null
          updated_at?: string
          user_id: string
          weekly_report_enabled?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_report_sent_at?: string | null
          milestone_alerts_enabled?: boolean | null
          practice_reminder_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          weekly_report_enabled?: boolean | null
        }
        Relationships: []
      }
      reading_evaluations: {
        Row: {
          band_score: number
          correct_answers: Json
          correct_count: number
          created_at: string
          feedback: string | null
          id: string
          passage_text: string
          passage_topic: string | null
          questions: Json
          time_taken_seconds: number | null
          total_questions: number
          user_answers: Json
          user_id: string
        }
        Insert: {
          band_score: number
          correct_answers?: Json
          correct_count?: number
          created_at?: string
          feedback?: string | null
          id?: string
          passage_text: string
          passage_topic?: string | null
          questions?: Json
          time_taken_seconds?: number | null
          total_questions?: number
          user_answers?: Json
          user_id: string
        }
        Update: {
          band_score?: number
          correct_answers?: Json
          correct_count?: number
          created_at?: string
          feedback?: string | null
          id?: string
          passage_text?: string
          passage_topic?: string | null
          questions?: Json
          time_taken_seconds?: number | null
          total_questions?: number
          user_answers?: Json
          user_id?: string
        }
        Relationships: []
      }
      speaking_evaluations: {
        Row: {
          band_score: number
          created_at: string
          daily_practice_tip: string | null
          filler_words: Json | null
          fluency_score: number | null
          grammar_corrections: Json | null
          grammar_score: number | null
          id: string
          native_upgrade: string | null
          overall_feedback: string | null
          topic: string | null
          transcript: string
          user_id: string
          vocabulary_score: number | null
          vocabulary_upgrades: Json | null
        }
        Insert: {
          band_score: number
          created_at?: string
          daily_practice_tip?: string | null
          filler_words?: Json | null
          fluency_score?: number | null
          grammar_corrections?: Json | null
          grammar_score?: number | null
          id?: string
          native_upgrade?: string | null
          overall_feedback?: string | null
          topic?: string | null
          transcript: string
          user_id: string
          vocabulary_score?: number | null
          vocabulary_upgrades?: Json | null
        }
        Update: {
          band_score?: number
          created_at?: string
          daily_practice_tip?: string | null
          filler_words?: Json | null
          fluency_score?: number | null
          grammar_corrections?: Json | null
          grammar_score?: number | null
          id?: string
          native_upgrade?: string | null
          overall_feedback?: string | null
          topic?: string | null
          transcript?: string
          user_id?: string
          vocabulary_score?: number | null
          vocabulary_upgrades?: Json | null
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          content: Json
          created_at: string
          id: string
          status: string
          test_type: string
          title: string | null
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          status?: string
          test_type: string
          title?: string | null
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          status?: string
          test_type?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      writing_evaluations: {
        Row: {
          band_score: number
          coherence: number | null
          created_at: string
          errors: Json | null
          essay: string
          grammar: number | null
          id: string
          lexical_resource: number | null
          overall_feedback: string | null
          suggestions: Json | null
          task_response: number | null
          topic: string | null
          user_id: string
        }
        Insert: {
          band_score: number
          coherence?: number | null
          created_at?: string
          errors?: Json | null
          essay: string
          grammar?: number | null
          id?: string
          lexical_resource?: number | null
          overall_feedback?: string | null
          suggestions?: Json | null
          task_response?: number | null
          topic?: string | null
          user_id: string
        }
        Update: {
          band_score?: number
          coherence?: number | null
          created_at?: string
          errors?: Json | null
          essay?: string
          grammar?: number | null
          id?: string
          lexical_resource?: number | null
          overall_feedback?: string | null
          suggestions?: Json | null
          task_response?: number | null
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
