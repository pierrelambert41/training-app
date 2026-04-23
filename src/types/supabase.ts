export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          height_cm: number | null
          preferred_unit: 'kg' | 'lb'
          training_level: 'beginner' | 'intermediate' | 'advanced'
          goals: Json
          constraints: Json
          equipment: Json
          sports_parallel: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          height_cm?: number | null
          preferred_unit?: 'kg' | 'lb'
          training_level?: 'beginner' | 'intermediate' | 'advanced'
          goals?: Json
          constraints?: Json
          equipment?: Json
          sports_parallel?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          height_cm?: number | null
          preferred_unit?: 'kg' | 'lb'
          training_level?: 'beginner' | 'intermediate' | 'advanced'
          goals?: Json
          constraints?: Json
          equipment?: Json
          sports_parallel?: Json
          created_at?: string
          updated_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          name_fr: string | null
          category: 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable'
          movement_pattern:
            | 'horizontal_push'
            | 'vertical_push'
            | 'horizontal_pull'
            | 'vertical_pull'
            | 'hinge'
            | 'squat'
            | 'unilateral_quad'
            | 'unilateral_hinge'
            | 'isolation_upper'
            | 'isolation_lower'
            | 'core'
            | 'carry'
          primary_muscles: string[]
          secondary_muscles: string[]
          equipment: string[]
          log_type: 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance_duration'
          is_unilateral: boolean
          systemic_fatigue: 'low' | 'moderate' | 'high'
          movement_stability: 'stable' | 'moderate' | 'variable'
          morpho_tags: string[]
          recommended_progression_type:
            | 'strength_fixed'
            | 'double_progression'
            | 'accessory_linear'
            | 'bodyweight_progression'
            | 'duration_progression'
            | 'distance_duration'
            | null
          alternatives: string[]
          coaching_notes: string | null
          tags: string[]
          is_custom: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_fr?: string | null
          category: 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable'
          movement_pattern:
            | 'horizontal_push'
            | 'vertical_push'
            | 'horizontal_pull'
            | 'vertical_pull'
            | 'hinge'
            | 'squat'
            | 'unilateral_quad'
            | 'unilateral_hinge'
            | 'isolation_upper'
            | 'isolation_lower'
            | 'core'
            | 'carry'
          primary_muscles?: string[]
          secondary_muscles?: string[]
          equipment?: string[]
          log_type: 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance_duration'
          is_unilateral?: boolean
          systemic_fatigue?: 'low' | 'moderate' | 'high'
          movement_stability?: 'stable' | 'moderate' | 'variable'
          morpho_tags?: string[]
          recommended_progression_type?:
            | 'strength_fixed'
            | 'double_progression'
            | 'accessory_linear'
            | 'bodyweight_progression'
            | 'duration_progression'
            | 'distance_duration'
            | null
          alternatives?: string[]
          coaching_notes?: string | null
          tags?: string[]
          is_custom?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_fr?: string | null
          category?: 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable'
          movement_pattern?:
            | 'horizontal_push'
            | 'vertical_push'
            | 'horizontal_pull'
            | 'vertical_pull'
            | 'hinge'
            | 'squat'
            | 'unilateral_quad'
            | 'unilateral_hinge'
            | 'isolation_upper'
            | 'isolation_lower'
            | 'core'
            | 'carry'
          primary_muscles?: string[]
          secondary_muscles?: string[]
          equipment?: string[]
          log_type?: 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance_duration'
          is_unilateral?: boolean
          systemic_fatigue?: 'low' | 'moderate' | 'high'
          movement_stability?: 'stable' | 'moderate' | 'variable'
          morpho_tags?: string[]
          recommended_progression_type?:
            | 'strength_fixed'
            | 'double_progression'
            | 'accessory_linear'
            | 'bodyweight_progression'
            | 'duration_progression'
            | 'distance_duration'
            | null
          alternatives?: string[]
          coaching_notes?: string | null
          tags?: string[]
          is_custom?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          user_id: string
          title: string
          goal: 'hypertrophy' | 'strength' | 'mixed'
          frequency: number | null
          level: 'beginner' | 'intermediate' | 'advanced' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          goal: 'hypertrophy' | 'strength' | 'mixed'
          frequency?: number | null
          level?: 'beginner' | 'intermediate' | 'advanced' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          goal?: 'hypertrophy' | 'strength' | 'mixed'
          frequency?: number | null
          level?: 'beginner' | 'intermediate' | 'advanced' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      blocks: {
        Row: {
          id: string
          program_id: string
          title: string
          goal: 'hypertrophy' | 'strength' | 'peaking' | 'deload'
          duration_weeks: number
          week_number: number
          start_date: string | null
          end_date: string | null
          status: 'planned' | 'active' | 'completed'
          deload_strategy: 'scheduled' | 'fatigue_triggered' | 'none'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          title: string
          goal: 'hypertrophy' | 'strength' | 'peaking' | 'deload'
          duration_weeks: number
          week_number?: number
          start_date?: string | null
          end_date?: string | null
          status?: 'planned' | 'active' | 'completed'
          deload_strategy?: 'scheduled' | 'fatigue_triggered' | 'none'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          title?: string
          goal?: 'hypertrophy' | 'strength' | 'peaking' | 'deload'
          duration_weeks?: number
          week_number?: number
          start_date?: string | null
          end_date?: string | null
          status?: 'planned' | 'active' | 'completed'
          deload_strategy?: 'scheduled' | 'fatigue_triggered' | 'none'
          created_at?: string
          updated_at?: string
        }
      }
      workout_days: {
        Row: {
          id: string
          block_id: string
          title: string
          day_order: number
          split_type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | null
          estimated_duration_min: number | null
          created_at: string
        }
        Insert: {
          id?: string
          block_id: string
          title: string
          day_order: number
          split_type?: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | null
          estimated_duration_min?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          block_id?: string
          title?: string
          day_order?: number
          split_type?: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | null
          estimated_duration_min?: number | null
          created_at?: string
        }
      }
      planned_exercises: {
        Row: {
          id: string
          workout_day_id: string
          exercise_id: string
          exercise_order: number
          role: 'main' | 'secondary' | 'accessory'
          sets: number
          rep_range_min: number
          rep_range_max: number
          target_rir: number | null
          rest_seconds: number | null
          tempo: string | null
          progression_type:
            | 'strength_fixed'
            | 'double_progression'
            | 'accessory_linear'
            | 'bodyweight_progression'
            | 'duration_progression'
            | 'distance_duration'
          progression_config: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_day_id: string
          exercise_id: string
          exercise_order: number
          role: 'main' | 'secondary' | 'accessory'
          sets: number
          rep_range_min: number
          rep_range_max: number
          target_rir?: number | null
          rest_seconds?: number | null
          tempo?: string | null
          progression_type:
            | 'strength_fixed'
            | 'double_progression'
            | 'accessory_linear'
            | 'bodyweight_progression'
            | 'duration_progression'
            | 'distance_duration'
          progression_config?: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_day_id?: string
          exercise_id?: string
          exercise_order?: number
          role?: 'main' | 'secondary' | 'accessory'
          sets?: number
          rep_range_min?: number
          rep_range_max?: number
          target_rir?: number | null
          rest_seconds?: number | null
          tempo?: string | null
          progression_type?:
            | 'strength_fixed'
            | 'double_progression'
            | 'accessory_linear'
            | 'bodyweight_progression'
            | 'duration_progression'
            | 'distance_duration'
          progression_config?: Json
          notes?: string | null
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          workout_day_id: string | null
          block_id: string | null
          date: string
          started_at: string | null
          ended_at: string | null
          status: 'in_progress' | 'completed' | 'abandoned'
          readiness: number | null
          energy: number | null
          motivation: number | null
          sleep_quality: number | null
          pre_session_notes: string | null
          completion_score: number | null
          performance_score: number | null
          fatigue_score: number | null
          post_session_notes: string | null
          device_id: string | null
          synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workout_day_id?: string | null
          block_id?: string | null
          date: string
          started_at?: string | null
          ended_at?: string | null
          status?: 'in_progress' | 'completed' | 'abandoned'
          readiness?: number | null
          energy?: number | null
          motivation?: number | null
          sleep_quality?: number | null
          pre_session_notes?: string | null
          completion_score?: number | null
          performance_score?: number | null
          fatigue_score?: number | null
          post_session_notes?: string | null
          device_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workout_day_id?: string | null
          block_id?: string | null
          date?: string
          started_at?: string | null
          ended_at?: string | null
          status?: 'in_progress' | 'completed' | 'abandoned'
          readiness?: number | null
          energy?: number | null
          motivation?: number | null
          sleep_quality?: number | null
          pre_session_notes?: string | null
          completion_score?: number | null
          performance_score?: number | null
          fatigue_score?: number | null
          post_session_notes?: string | null
          device_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      set_logs: {
        Row: {
          id: string
          session_id: string
          exercise_id: string
          planned_exercise_id: string | null
          set_number: number
          target_load: number | null
          target_reps: number | null
          target_rir: number | null
          load: number | null
          reps: number | null
          rir: number | null
          duration_seconds: number | null
          distance_meters: number | null
          completed: boolean
          side: 'left' | 'right' | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          planned_exercise_id?: string | null
          set_number: number
          target_load?: number | null
          target_reps?: number | null
          target_rir?: number | null
          load?: number | null
          reps?: number | null
          rir?: number | null
          duration_seconds?: number | null
          distance_meters?: number | null
          completed?: boolean
          side?: 'left' | 'right' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          exercise_id?: string
          planned_exercise_id?: string | null
          set_number?: number
          target_load?: number | null
          target_reps?: number | null
          target_rir?: number | null
          load?: number | null
          reps?: number | null
          rir?: number | null
          duration_seconds?: number | null
          distance_meters?: number | null
          completed?: boolean
          side?: 'left' | 'right' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          session_id: string
          exercise_id: string | null
          source: 'rules_engine' | 'ai'
          type: 'load_change' | 'deload' | 'plateau' | 'fatigue_alert' | 'summary'
          message: string
          next_load: number | null
          next_rep_target: number | null
          next_rir_target: number | null
          action: 'increase' | 'maintain' | 'decrease' | 'deload' | 'replace' | null
          confidence: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id?: string | null
          source: 'rules_engine' | 'ai'
          type: 'load_change' | 'deload' | 'plateau' | 'fatigue_alert' | 'summary'
          message: string
          next_load?: number | null
          next_rep_target?: number | null
          next_rir_target?: number | null
          action?: 'increase' | 'maintain' | 'decrease' | 'deload' | 'replace' | null
          confidence?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          exercise_id?: string | null
          source?: 'rules_engine' | 'ai'
          type?: 'load_change' | 'deload' | 'plateau' | 'fatigue_alert' | 'summary'
          message?: string
          next_load?: number | null
          next_rep_target?: number | null
          next_rir_target?: number | null
          action?: 'increase' | 'maintain' | 'decrease' | 'deload' | 'replace' | null
          confidence?: number | null
          metadata?: Json
          created_at?: string
        }
      }
      recovery_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          sleep_hours: number | null
          sleep_quality: number | null
          energy: number | null
          stress: number | null
          motivation: number | null
          soreness: number | null
          joint_pain: number | null
          resting_hr: number | null
          hrv: number | null
          weight_kg: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          sleep_hours?: number | null
          sleep_quality?: number | null
          energy?: number | null
          stress?: number | null
          motivation?: number | null
          soreness?: number | null
          joint_pain?: number | null
          resting_hr?: number | null
          hrv?: number | null
          weight_kg?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          sleep_hours?: number | null
          sleep_quality?: number | null
          energy?: number | null
          stress?: number | null
          motivation?: number | null
          soreness?: number | null
          joint_pain?: number | null
          resting_hr?: number | null
          hrv?: number | null
          weight_kg?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      body_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number | null
          chest_high_cm: number | null
          chest_low_cm: number | null
          shoulders_cm: number | null
          arm_relaxed_cm: number | null
          arm_flexed_cm: number | null
          waist_cm: number | null
          thigh_cm: number | null
          calf_cm: number | null
          photo_urls: string[]
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight_kg?: number | null
          chest_high_cm?: number | null
          chest_low_cm?: number | null
          shoulders_cm?: number | null
          arm_relaxed_cm?: number | null
          arm_flexed_cm?: number | null
          waist_cm?: number | null
          thigh_cm?: number | null
          calf_cm?: number | null
          photo_urls?: string[]
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight_kg?: number | null
          chest_high_cm?: number | null
          chest_low_cm?: number | null
          shoulders_cm?: number | null
          arm_relaxed_cm?: number | null
          arm_flexed_cm?: number | null
          waist_cm?: number | null
          thigh_cm?: number | null
          calf_cm?: number | null
          photo_urls?: string[]
          notes?: string | null
          created_at?: string
        }
      }
      cardio_sessions: {
        Row: {
          id: string
          user_id: string
          date: string
          type: 'easy' | 'tempo' | 'interval' | 'other'
          distance_km: number | null
          duration_minutes: number | null
          avg_pace: string | null
          avg_hr: number | null
          max_hr: number | null
          rpe: number | null
          leg_impact: number | null
          fatigue_post: number | null
          source: 'manual' | 'strava' | 'apple_health'
          external_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          type: 'easy' | 'tempo' | 'interval' | 'other'
          distance_km?: number | null
          duration_minutes?: number | null
          avg_pace?: string | null
          avg_hr?: number | null
          max_hr?: number | null
          rpe?: number | null
          leg_impact?: number | null
          fatigue_post?: number | null
          source?: 'manual' | 'strava' | 'apple_health'
          external_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          type?: 'easy' | 'tempo' | 'interval' | 'other'
          distance_km?: number | null
          duration_minutes?: number | null
          avg_pace?: string | null
          avg_hr?: number | null
          max_hr?: number | null
          rpe?: number | null
          leg_impact?: number | null
          fatigue_post?: number | null
          source?: 'manual' | 'strava' | 'apple_health'
          external_id?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      ai_context_profiles: {
        Row: {
          id: string
          user_id: string
          profile_json: Json
          version: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_json?: Json
          version?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_json?: Json
          version?: number
          updated_at?: string
        }
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
