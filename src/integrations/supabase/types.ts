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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academic_settings: {
        Row: {
          created_at: string
          id: string
          minimum_passing_average: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          minimum_passing_average?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          minimum_passing_average?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_terms: {
        Row: {
          created_at: string
          date_end: string
          date_start: string
          id: string
          name: string
          organization_id: string
          period_id: string
          term_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_end: string
          date_start: string
          id?: string
          name: string
          organization_id: string
          period_id: string
          term_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_end?: string
          date_start?: string
          id?: string
          name?: string
          organization_id?: string
          period_id?: string
          term_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_terms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_terms_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: string
          class_id: string
          created_at: string
          date: string
          id: string
          organization_id: string
          recovers_term_id: string | null
          subject_id: string
          term_id: string | null
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          assessment_type?: string
          class_id: string
          created_at?: string
          date: string
          id?: string
          organization_id: string
          recovers_term_id?: string | null
          subject_id: string
          term_id?: string | null
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          assessment_type?: string
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          organization_id?: string
          recovers_term_id?: string | null
          subject_id?: string
          term_id?: string | null
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
            foreignKeyName: "assessments_recovers_term_id_fkey"
            columns: ["recovers_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
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
          {
            foreignKeyName: "assessments_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
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
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
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
      calendar_exceptions: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          organization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          organization_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          organization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_council_opinions: {
        Row: {
          class_council_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          id: string
          opinion_text: string | null
          organization_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_council_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          id?: string
          opinion_text?: string | null
          organization_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_council_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          id?: string
          opinion_text?: string | null
          organization_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_council_opinions_class_council_id_fkey"
            columns: ["class_council_id"]
            isOneToOne: false
            referencedRelation: "class_councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_opinions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_opinions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_opinions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_opinions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      class_councils: {
        Row: {
          class_id: string
          created_at: string
          document_id: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          organization_id: string
          signer_name: string | null
          status: string
          term_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          document_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          organization_id: string
          signer_name?: string | null
          status?: string
          term_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          document_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          organization_id?: string
          signer_name?: string | null
          status?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_councils_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_councils_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_councils_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_councils_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
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
        Relationships: [
          {
            foreignKeyName: "contact_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          updated_at: string
          version_label: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          updated_at?: string
          version_label: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          updated_at?: string
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_notes: string | null
          created_at: string
          document_type: string | null
          file_path: string
          id: string
          organization_id: string
          owner_id: string
          owner_type: string
          tags: string[] | null
          title: string
          updated_at: string
          validated_at: string | null
          validation_status: string
        }
        Insert: {
          ai_notes?: string | null
          created_at?: string
          document_type?: string | null
          file_path: string
          id?: string
          organization_id: string
          owner_id: string
          owner_type: string
          tags?: string[] | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
        }
        Update: {
          ai_notes?: string | null
          created_at?: string
          document_type?: string | null
          file_path?: string
          id?: string
          organization_id?: string
          owner_id?: string
          owner_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
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
      enrollment_contracts: {
        Row: {
          contract_hash: string
          contract_text: string
          contract_version: string
          created_at: string
          document_id: string | null
          due_day: number
          enrollment_id: string
          erp_contract_id: string | null
          erp_receivable_error: string | null
          erp_receivable_status: string
          erp_receivable_synced_at: string | null
          guardian_id: string | null
          id: string
          is_recurring: boolean
          monthly_fee_amount: number
          organization_id: string
          recurrence_period: string
          signed_at: string
          signer_accepted_terms: boolean
          signer_name: string
          status: string
          student_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          contract_hash: string
          contract_text: string
          contract_version?: string
          created_at?: string
          document_id?: string | null
          due_day: number
          enrollment_id: string
          erp_contract_id?: string | null
          erp_receivable_error?: string | null
          erp_receivable_status?: string
          erp_receivable_synced_at?: string | null
          guardian_id?: string | null
          id?: string
          is_recurring?: boolean
          monthly_fee_amount: number
          organization_id: string
          recurrence_period?: string
          signed_at?: string
          signer_accepted_terms?: boolean
          signer_name: string
          status?: string
          student_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          contract_hash?: string
          contract_text?: string
          contract_version?: string
          created_at?: string
          document_id?: string | null
          due_day?: number
          enrollment_id?: string
          erp_contract_id?: string | null
          erp_receivable_error?: string | null
          erp_receivable_status?: string
          erp_receivable_synced_at?: string | null
          guardian_id?: string | null
          id?: string
          is_recurring?: boolean
          monthly_fee_amount?: number
          organization_id?: string
          recurrence_period?: string
          signed_at?: string
          signer_accepted_terms?: boolean
          signer_name?: string
          status?: string
          student_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_contracts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "v_guardians_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
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
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_integration_config: {
        Row: {
          base_url: string | null
          created_at: string
          empresa_representada_id: string | null
          enabled: boolean
          events: Json
          mock: boolean
          organization_id: string
          signing_secret: string | null
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          empresa_representada_id?: string | null
          enabled?: boolean
          events?: Json
          mock?: boolean
          organization_id: string
          signing_secret?: string | null
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          empresa_representada_id?: string | null
          enabled?: boolean
          events?: Json
          mock?: boolean
          organization_id?: string
          signing_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          due_date: string | null
          external_id: string | null
          guardian_id: string | null
          id: string
          numero_documento: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          raw_event: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_id?: string | null
          guardian_id?: string | null
          id?: string
          numero_documento?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          raw_event?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_id?: string | null
          guardian_id?: string | null
          id?: string
          numero_documento?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          raw_event?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "v_guardians_safe"
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
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
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
          performed_by: string | null
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
          performed_by?: string | null
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
          performed_by?: string | null
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
            foreignKeyName: "notification_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          payload: Json
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
          payload?: Json
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
          payload?: Json
          recipient?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
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
        Relationships: [
          {
            foreignKeyName: "periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      re_enrollments: {
        Row: {
          created_at: string
          current_class_id: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          notes: string | null
          organization_id: string
          status: string
          student_id: string
          target_class_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_class_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          student_id: string
          target_class_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_class_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          student_id?: string
          target_class_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "re_enrollments_current_class_id_fkey"
            columns: ["current_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_enrollments_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
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
          {
            foreignKeyName: "requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
        Relationships: [
          {
            foreignKeyName: "segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      student_transfers: {
        Row: {
          created_at: string
          destination_school: string | null
          document_id: string | null
          enrollment_id: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          organization_id: string
          reason: string | null
          signer_name: string | null
          status: string
          student_id: string
          transfer_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_school?: string | null
          document_id?: string | null
          enrollment_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          organization_id: string
          reason?: string | null
          signer_name?: string | null
          status?: string
          student_id: string
          transfer_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_school?: string | null
          document_id?: string | null
          enrollment_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
          signer_name?: string | null
          status?: string
          student_id?: string
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transfers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
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
      term_results: {
        Row: {
          calculated_at: string
          class_id: string
          created_at: string
          final_grade: number
          id: string
          organization_id: string
          original_average: number
          recovery_grade: number | null
          status: string
          student_id: string
          subject_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          calculated_at?: string
          class_id: string
          created_at?: string
          final_grade: number
          id?: string
          organization_id: string
          original_average: number
          recovery_grade?: number | null
          status: string
          student_id: string
          subject_id: string
          term_id: string
          updated_at?: string
        }
        Update: {
          calculated_at?: string
          class_id?: string
          created_at?: string
          final_grade?: number
          id?: string
          organization_id?: string
          original_average?: number
          recovery_grade?: number | null
          status?: string
          student_id?: string
          subject_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_results_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
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
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
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
        Relationships: [
          {
            foreignKeyName: "visitors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_applications: {
        Row: {
          birth_date: string | null
          converted_student_id: string | null
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
          converted_student_id?: string | null
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
          converted_student_id?: string | null
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
            foreignKeyName: "waitlist_applications_converted_student_id_fkey"
            columns: ["converted_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_applications_converted_student_id_fkey"
            columns: ["converted_student_id"]
            isOneToOne: false
            referencedRelation: "v_risco_evasao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_applications_converted_student_id_fkey"
            columns: ["converted_student_id"]
            isOneToOne: false
            referencedRelation: "v_students_safe"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "waitlist_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_demandas: {
        Row: {
          assunto: string | null
          created_at: string | null
          created_by: string | null
          criado_por_nome: string | null
          descricao: string | null
          id: string | null
          organization_id: string | null
          origem: string | null
          requester_id: string | null
          solicitante_nome: string | null
          status: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          assunto?: never
          created_at?: string | null
          created_by?: string | null
          criado_por_nome?: never
          descricao?: never
          id?: string | null
          organization_id?: string | null
          origem?: string | null
          requester_id?: string | null
          solicitante_nome?: never
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          assunto?: never
          created_at?: string | null
          created_by?: string | null
          criado_por_nome?: never
          descricao?: never
          id?: string | null
          organization_id?: string | null
          origem?: string | null
          requester_id?: string | null
          solicitante_nome?: never
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      v_interactions: {
        Row: {
          channel: string | null
          created_at: string | null
          direction: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string | null
          organization_id: string | null
          payload: Json | null
          performed_by: string | null
          performed_by_name: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          direction?: string | null
          entity_id?: string | null
          entity_name?: never
          entity_type?: string | null
          id?: string | null
          organization_id?: string | null
          payload?: Json | null
          performed_by?: string | null
          performed_by_name?: never
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          direction?: string | null
          entity_id?: string | null
          entity_name?: never
          entity_type?: string | null
          id?: string | null
          organization_id?: string | null
          payload?: Json | null
          performed_by?: string | null
          performed_by_name?: never
          summary?: string | null
          updated_at?: string | null
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
      v_leads: {
        Row: {
          convertido: boolean | null
          created_at: string | null
          document: string | null
          email: string | null
          full_name: string | null
          id: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          purpose: string | null
          relation: string | null
          status: string | null
          updated_at: string | null
          visit_date: string | null
        }
        Insert: {
          convertido?: never
          created_at?: string | null
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          purpose?: string | null
          relation?: string | null
          status?: never
          updated_at?: string | null
          visit_date?: string | null
        }
        Update: {
          convertido?: never
          created_at?: string | null
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          purpose?: string | null
          relation?: string | null
          status?: never
          updated_at?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pendencias_doc: {
        Row: {
          created_at: string | null
          documentos_count: number | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string | null
          organization_id: string | null
          pendencia_tipo: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
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
      v_students_safe: {
        Row: {
          birth_date: string | null
          created_at: string | null
          document_id: string | null
          first_name: string | null
          gender: string | null
          id: string | null
          last_name: string | null
          organization_id: string | null
          person_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          document_id?: never
          first_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
          person_id?: never
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          document_id?: never
          first_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
          person_id?: never
          status?: string | null
          updated_at?: string | null
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
      current_guardian_id: { Args: never; Returns: string }
      current_org_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      is_authenticated: { Args: never; Returns: boolean }
      set_request_status: {
        Args: { new_status: string; request_id: string }
        Returns: Json
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
