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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          organization_id: string
          subject_id: string
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          organization_id: string
          subject_id: string
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          organization_id?: string
          subject_id?: string
          title?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments_feedback: {
        Row: {
          ai_feedback: Json | null
          assessment_id: string
          coherence_score: number | null
          created_at: string
          created_by: string | null
          grammar_score: number | null
          id: string
          organization_id: string
          processed_at: string
          student_id: string
          suggestions: string[] | null
          updated_at: string
        }
        Insert: {
          ai_feedback?: Json | null
          assessment_id: string
          coherence_score?: number | null
          created_at?: string
          created_by?: string | null
          grammar_score?: number | null
          id?: string
          organization_id: string
          processed_at?: string
          student_id: string
          suggestions?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_feedback?: Json | null
          assessment_id?: string
          coherence_score?: number | null
          created_at?: string
          created_by?: string | null
          grammar_score?: number | null
          id?: string
          organization_id?: string
          processed_at?: string
          student_id?: string
          suggestions?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_feedback_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          organization_id: string
          status: string
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          note?: string | null
          organization_id: string
          status: string
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          organization_id?: string
          status?: string
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          diff: Json | null
          id: string
          organization_id: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          organization_id: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          organization_id?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "v_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          name: string
          organization_id: string
          shift: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          name: string
          organization_id: string
          shift?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          name?: string
          organization_id?: string
          shift?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          granted: boolean
          granted_at: string | null
          holder_id: string
          holder_type: string
          id: string
          organization_id: string
          purpose: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          holder_id: string
          holder_type: string
          id?: string
          organization_id: string
          purpose: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          holder_id?: string
          holder_type?: string
          id?: string
          organization_id?: string
          purpose?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_consents: {
        Row: {
          allowed: boolean
          channel: string
          created_at: string
          id: string
          organization_id: string
          owner_id: string
          owner_type: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          channel: string
          created_at?: string
          id?: string
          organization_id: string
          owner_id: string
          owner_type: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          channel?: string
          created_at?: string
          id?: string
          organization_id?: string
          owner_id?: string
          owner_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_path: string
          id: string
          organization_id: string
          owner_id: string
          owner_type: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          organization_id: string
          owner_id: string
          owner_type: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          organization_id?: string
          owner_id?: string
          owner_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          enrollment_date: string
          id: string
          organization_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          enrollment_date?: string
          id?: string
          organization_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          enrollment_date?: string
          id?: string
          organization_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assessment_id: string
          comments: string | null
          created_at: string
          grade: number | null
          id: string
          organization_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          comments?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          organization_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          comments?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          organization_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          relationship: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          channel: string
          created_at: string
          direction: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          payload: Json | null
          performed_by: string
          summary: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          direction: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          payload?: Json | null
          performed_by: string
          summary: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          direction?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          payload?: Json | null
          performed_by?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          organization_id: string
          provider_message_id: string | null
          queue_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
          provider_message_id?: string | null
          queue_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
          provider_message_id?: string | null
          queue_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "notification_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          event_type: string
          id: string
          organization_id: string
          payload: Json | null
          recipient: string
          scheduled_for: string
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          organization_id: string
          payload?: Json | null
          recipient: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json | null
          recipient?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body_md: string
          channel: string
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          subject: string | null
          updated_at: string
          version: number
        }
        Insert: {
          body_md: string
          channel: string
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          subject?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          body_md?: string
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          subject?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      periods: {
        Row: {
          active: boolean
          created_at: string
          date_end: string
          date_start: string
          id: string
          name: string
          organization_id: string
          updated_at: string
          year: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          date_end: string
          date_start: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          year: number
        }
        Update: {
          active?: boolean
          created_at?: string
          date_end?: string
          date_start?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      prediction_logs: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          factors: Json | null
          id: string
          model_type: string
          organization_id: string
          prediction_score: number | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          factors?: Json | null
          id?: string
          model_type: string
          organization_id: string
          prediction_score?: number | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          factors?: Json | null
          id?: string
          model_type?: string
          organization_id?: string
          prediction_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          organization_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          payload: Json | null
          request_type: string
          requester_id: string | null
          requester_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          payload?: Json | null
          request_type: string
          requester_id?: string | null
          requester_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          payload?: Json | null
          request_type?: string
          requester_id?: string | null
          requester_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          id: string
          name: string
          order_index: number | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          id: string
          name: string
          order_index: number | null
          organization_id: string
          segment_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          organization_id: string
          segment_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          organization_id?: string
          segment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          is_primary: boolean | null
          legal_consent: boolean | null
          organization_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          is_primary?: boolean | null
          legal_consent?: boolean | null
          organization_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          is_primary?: boolean | null
          legal_consent?: boolean | null
          organization_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "v_guardians_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          created_at: string
          document_id: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          organization_id: string
          person_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          document_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          organization_id: string
          person_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          document_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          organization_id?: string
          person_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          bncc_axis: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          bncc_axis?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          bncc_axis?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          active: boolean
          address: Json | null
          code: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: Json | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: Json | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization_id: string
          phone: string | null
          purpose: string | null
          relation: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          purpose?: string | null
          relation?: string | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          purpose?: string | null
          relation?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: []
      }
      waitlist_applications: {
        Row: {
          birth_date: string | null
          created_at: string
          desired_segment_id: string | null
          desired_series_id: string | null
          desired_year: number | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          notes: string | null
          organization_id: string
          status: string
          student_full_name: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          desired_segment_id?: string | null
          desired_series_id?: string | null
          desired_year?: number | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          student_full_name: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          desired_segment_id?: string | null
          desired_series_id?: string | null
          desired_year?: number | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          student_full_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_applications_desired_segment_id_fkey"
            columns: ["desired_segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_applications_desired_series_id_fkey"
            columns: ["desired_series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_guardians_safe: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          organization_id: string | null
          phone: string | null
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: never
          id?: string | null
          name?: string | null
          organization_id?: string | null
          phone?: never
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: never
          id?: string | null
          name?: string | null
          organization_id?: string | null
          phone?: never
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_profiles_safe: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          organization_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_risco_evasao: {
        Row: {
          calculated_at: string | null
          freq_media: number | null
          id: string | null
          nome: string | null
          nota_media: number | null
          organization_id: string | null
          risco_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      audit_pii_access: {
        Args: { columns: string[]; entity: string; entity_id: string }
        Returns: undefined
      }
      current_guardian_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordenacao" | "professor" | "secretario"
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
      app_role: ["admin", "coordenacao", "professor", "secretario"],
    },
  },
} as const
