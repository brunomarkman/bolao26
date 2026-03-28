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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bolao_participants: {
        Row: {
          bolao_id: string
          id: string
          joined_at: string
          total_score: number
          user_id: string
        }
        Insert: {
          bolao_id: string
          id?: string
          joined_at?: string
          total_score?: number
          user_id: string
        }
        Update: {
          bolao_id?: string
          id?: string
          joined_at?: string
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bolao_participants_bolao_id_fkey"
            columns: ["bolao_id"]
            isOneToOne: false
            referencedRelation: "boloes"
            referencedColumns: ["id"]
          },
        ]
      }
      boloes: {
        Row: {
          bet_value: number
          competition_id: string
          created_at: string
          created_by: string
          id: string
          invite_code: string
          nickname: string
          number: number
          status: Database["public"]["Enums"]["bolao_status"]
          updated_at: string
        }
        Insert: {
          bet_value?: number
          competition_id: string
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          nickname: string
          number?: number
          status?: Database["public"]["Enums"]["bolao_status"]
          updated_at?: string
        }
        Update: {
          bet_value?: number
          competition_id?: string
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          nickname?: string
          number?: number
          status?: Database["public"]["Enums"]["bolao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boloes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          year: number
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          year?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          is_finished: boolean
          location: string | null
          match_date: string | null
          phase_id: string
          score_a: number | null
          score_b: number | null
          team_a: string
          team_b: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          is_finished?: boolean
          location?: string | null
          match_date?: string | null
          phase_id: string
          score_a?: number | null
          score_b?: number | null
          team_a?: string
          team_b?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          is_finished?: boolean
          location?: string | null
          match_date?: string | null
          phase_id?: string
          score_a?: number | null
          score_b?: number | null
          team_a?: string
          team_b?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          bolao_id: string | null
          content: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          bolao_id?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          bolao_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_bolao_id_fkey"
            columns: ["bolao_id"]
            isOneToOne: false
            referencedRelation: "boloes"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          bolao_id: string | null
          created_at: string
          id: string
          received_by: string
          user_id: string
        }
        Insert: {
          bolao_id?: string | null
          created_at?: string
          id?: string
          received_by: string
          user_id: string
        }
        Update: {
          bolao_id?: string | null
          created_at?: string
          id?: string
          received_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bolao_id_fkey"
            columns: ["bolao_id"]
            isOneToOne: false
            referencedRelation: "boloes"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          competition_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          number: number
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          number: number
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          number?: number
        }
        Relationships: [
          {
            foreignKeyName: "phases_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          bolao_id: string | null
          created_at: string
          id: string
          match_id: string
          points: number | null
          score_a: number
          score_b: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bolao_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          points?: number | null
          score_a: number
          score_b: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bolao_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          points?: number | null
          score_a?: number
          score_b?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_bolao_id_fkey"
            columns: ["bolao_id"]
            isOneToOne: false
            referencedRelation: "boloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_admin: boolean
          name: string
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_admin?: boolean
          name: string
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          name?: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_prediction_points: {
        Args: {
          actual_a: number
          actual_b: number
          pred_a: number
          pred_b: number
        }
        Returns: number
      }
      process_match_result: { Args: { p_match_id: string }; Returns: undefined }
      revert_match_result: { Args: { p_match_id: string }; Returns: undefined }
    }
    Enums: {
      bolao_status: "waiting" | "active" | "finished" | "cancelled"
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
    Enums: {
      bolao_status: ["waiting", "active", "finished", "cancelled"],
    },
  },
} as const
