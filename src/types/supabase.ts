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
      calibration_cycles: {
        Row: {
          completed_date: string | null
          confidence_adjustment: string | null
          created_at: string
          cycle_number: number
          engagement_id: string
          health_score_calculated: number | null
          id: string
          new_friction_count: number | null
          notes: string | null
          overall_projection_accuracy: number | null
          owner_satisfaction_notes: string | null
          owner_satisfaction_score: number | null
          recommendations: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          confidence_adjustment?: string | null
          created_at?: string
          cycle_number: number
          engagement_id: string
          health_score_calculated?: number | null
          id?: string
          new_friction_count?: number | null
          notes?: string | null
          overall_projection_accuracy?: number | null
          owner_satisfaction_notes?: string | null
          owner_satisfaction_score?: number | null
          recommendations?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          confidence_adjustment?: string | null
          created_at?: string
          cycle_number?: number
          engagement_id?: string
          health_score_calculated?: number | null
          id?: string
          new_friction_count?: number | null
          notes?: string | null
          overall_projection_accuracy?: number | null
          owner_satisfaction_notes?: string | null
          owner_satisfaction_score?: number | null
          recommendations?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_cycles_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_locations: {
        Row: {
          address: string
          client_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          name: string
        }
        Insert: {
          address: string
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name: string
        }
        Update: {
          address?: string
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          marketing_info: Json | null
          name: string
          notes: string | null
          organization_id: string
          personal_details: Json | null
          phone: string | null
          preferences: Json | null
          property_details: Json | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          marketing_info?: Json | null
          name: string
          notes?: string | null
          organization_id: string
          personal_details?: Json | null
          phone?: string | null
          preferences?: Json | null
          property_details?: Json | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          marketing_info?: Json | null
          name?: string
          notes?: string | null
          organization_id?: string
          personal_details?: Json | null
          phone?: string | null
          preferences?: Json | null
          property_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          client_contact_email: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          client_name: string
          created_at: string
          currency: string | null
          employee_count: number | null
          health_score: number | null
          id: string
          industry_vertical: string | null
          next_calibration_date: string | null
          notes: string | null
          organization_id: string | null
          owner_hourly_rate: number | null
          phase: string
          retainer_monthly: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_name: string
          created_at?: string
          currency?: string | null
          employee_count?: number | null
          health_score?: number | null
          id?: string
          industry_vertical?: string | null
          next_calibration_date?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_hourly_rate?: number | null
          phase?: string
          retainer_monthly?: number | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_name?: string
          created_at?: string
          currency?: string | null
          employee_count?: number | null
          health_score?: number | null
          id?: string
          industry_vertical?: string | null
          next_calibration_date?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_hourly_rate?: number | null
          phase?: string
          retainer_monthly?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_rules: {
        Row: {
          action_category_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          match_type: string
          organization_id: string
          param_pattern: string
          priority: number | null
        }
        Insert: {
          action_category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_type?: string
          organization_id: string
          param_pattern: string
          priority?: number | null
        }
        Update: {
          action_category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_type?: string
          organization_id?: string
          param_pattern?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_rules_action_category_id_fkey"
            columns: ["action_category_id"]
            isOneToOne: false
            referencedRelation: "tax_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          category_id: string | null
          confidence_score: number | null
          created_at: string | null
          description: string
          id: string
          job_id: string | null
          organization_id: string
          period_id: string | null
          rationale: string | null
          raw_description: string | null
          source: string
          source_id: string | null
          status: string
          transaction_date: string
          updated_at: string | null
          upload_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          id?: string
          job_id?: string | null
          organization_id: string
          period_id?: string | null
          rationale?: string | null
          raw_description?: string | null
          source: string
          source_id?: string | null
          status?: string
          transaction_date: string
          updated_at?: string | null
          upload_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          id?: string
          job_id?: string | null
          organization_id?: string
          period_id?: string | null
          rationale?: string | null
          raw_description?: string | null
          source?: string
          source_id?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string | null
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tax_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "statement_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_closed: boolean | null
          name: string
          organization_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean | null
          name: string
          organization_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean | null
          name?: string
          organization_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      friction_intervention_links: {
        Row: {
          friction_item_id: string
          id: string
          intervention_id: string
        }
        Insert: {
          friction_item_id: string
          id?: string
          intervention_id: string
        }
        Update: {
          friction_item_id?: string
          id?: string
          intervention_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friction_intervention_links_friction_item_id_fkey"
            columns: ["friction_item_id"]
            isOneToOne: false
            referencedRelation: "friction_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friction_intervention_links_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      friction_items: {
        Row: {
          category: string
          cognitive_load_score: number | null
          composite_priority: number | null
          data_source: string
          description: string
          discovered_at: string
          duration_minutes: number | null
          engagement_id: string
          id: string
          notes: string | null
          occurrences_per_week: number | null
          owner_desire_id: string | null
          process_activity_id: string | null
          quadrant: string | null
          risk_impact: number | null
          risk_probability: number | null
          risk_score: number | null
          self_report_haircut: boolean | null
          status: string
          updated_at: string
          weekly_time_cost_minutes: number | null
        }
        Insert: {
          category: string
          cognitive_load_score?: number | null
          composite_priority?: number | null
          data_source?: string
          description: string
          discovered_at?: string
          duration_minutes?: number | null
          engagement_id: string
          id?: string
          notes?: string | null
          occurrences_per_week?: number | null
          owner_desire_id?: string | null
          process_activity_id?: string | null
          quadrant?: string | null
          risk_impact?: number | null
          risk_probability?: number | null
          risk_score?: number | null
          self_report_haircut?: boolean | null
          status?: string
          updated_at?: string
          weekly_time_cost_minutes?: number | null
        }
        Update: {
          category?: string
          cognitive_load_score?: number | null
          composite_priority?: number | null
          data_source?: string
          description?: string
          discovered_at?: string
          duration_minutes?: number | null
          engagement_id?: string
          id?: string
          notes?: string | null
          occurrences_per_week?: number | null
          owner_desire_id?: string | null
          process_activity_id?: string | null
          quadrant?: string | null
          risk_impact?: number | null
          risk_probability?: number | null
          risk_score?: number | null
          self_report_haircut?: boolean | null
          status?: string
          updated_at?: string
          weekly_time_cost_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "friction_items_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friction_items_owner_desire_id_fkey"
            columns: ["owner_desire_id"]
            isOneToOne: false
            referencedRelation: "owner_desires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friction_items_process_activity_id_fkey"
            columns: ["process_activity_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      friction_tool_links: {
        Row: {
          friction_item_id: string
          id: string
          relationship: string | null
          tool_id: string
        }
        Insert: {
          friction_item_id: string
          id?: string
          relationship?: string | null
          tool_id: string
        }
        Update: {
          friction_item_id?: string
          id?: string
          relationship?: string | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friction_tool_links_friction_item_id_fkey"
            columns: ["friction_item_id"]
            isOneToOne: false
            referencedRelation: "friction_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friction_tool_links_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_desire_links: {
        Row: {
          id: string
          intervention_id: string
          owner_desire_id: string
        }
        Insert: {
          id?: string
          intervention_id: string
          owner_desire_id: string
        }
        Update: {
          id?: string
          intervention_id?: string
          owner_desire_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_desire_links_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_desire_links_owner_desire_id_fkey"
            columns: ["owner_desire_id"]
            isOneToOne: false
            referencedRelation: "owner_desires"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          created_at: string
          deployment_date: string | null
          description: string | null
          engagement_id: string
          estimated_build_cost: number | null
          estimated_build_hours: number | null
          first_measurement_date: string | null
          id: string
          name: string
          notes: string | null
          phase: number | null
          projected_monthly_value: number | null
          projected_weekly_hours_saved: number | null
          projection_band: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deployment_date?: string | null
          description?: string | null
          engagement_id: string
          estimated_build_cost?: number | null
          estimated_build_hours?: number | null
          first_measurement_date?: string | null
          id?: string
          name: string
          notes?: string | null
          phase?: number | null
          projected_monthly_value?: number | null
          projected_weekly_hours_saved?: number | null
          projection_band?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deployment_date?: string | null
          description?: string | null
          engagement_id?: string
          estimated_build_cost?: number | null
          estimated_build_hours?: number | null
          first_measurement_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          phase?: number | null
          projected_monthly_value?: number | null
          projected_weekly_hours_saved?: number | null
          projection_band?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      job_assignments: {
        Row: {
          created_at: string
          id: string
          job_id: string
          magic_link_token: string
          status: string | null
          subcontractor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          magic_link_token?: string
          status?: string | null
          subcontractor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          magic_link_token?: string
          status?: string | null
          subcontractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          job_id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          job_id: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          last_contact_date: string | null
          location_id: string | null
          next_reminder_date: string | null
          organization_id: string
          quote_expiry_date: string | null
          start_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          last_contact_date?: string | null
          location_id?: string | null
          next_reminder_date?: string | null
          organization_id: string
          quote_expiry_date?: string | null
          start_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          last_contact_date?: string | null
          location_id?: string | null
          next_reminder_date?: string | null
          organization_id?: string
          quote_expiry_date?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_snapshots: {
        Row: {
          calibration_cycle_id: string | null
          engagement_id: string
          id: string
          measured_at: string
          measured_value: number
          notes: string | null
          projected_value: number | null
          relief_metric_id: string
          source: string
          variance_pct: number | null
        }
        Insert: {
          calibration_cycle_id?: string | null
          engagement_id: string
          id?: string
          measured_at?: string
          measured_value: number
          notes?: string | null
          projected_value?: number | null
          relief_metric_id: string
          source: string
          variance_pct?: number | null
        }
        Update: {
          calibration_cycle_id?: string | null
          engagement_id?: string
          id?: string
          measured_at?: string
          measured_value?: number
          notes?: string | null
          projected_value?: number | null
          relief_metric_id?: string
          source?: string
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_snapshots_cycle"
            columns: ["calibration_cycle_id"]
            isOneToOne: false
            referencedRelation: "calibration_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_snapshots_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_snapshots_relief_metric_id_fkey"
            columns: ["relief_metric_id"]
            isOneToOne: false
            referencedRelation: "relief_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      owner_desires: {
        Row: {
          captured_at: string
          category: string
          emotional_weight: number | null
          engagement_id: string
          evidence_of_delivery: string | null
          id: string
          priority_score: number
          raw_statement: string
          status: string
          updated_at: string
          value_layer: string
        }
        Insert: {
          captured_at?: string
          category: string
          emotional_weight?: number | null
          engagement_id: string
          evidence_of_delivery?: string | null
          id?: string
          priority_score: number
          raw_statement: string
          status?: string
          updated_at?: string
          value_layer: string
        }
        Update: {
          captured_at?: string
          category?: string
          emotional_weight?: number | null
          engagement_id?: string
          evidence_of_delivery?: string | null
          id?: string
          priority_score?: number
          raw_statement?: string
          status?: string
          updated_at?: string
          value_layer?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_desires_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          job_id: string
          method: string
          notes: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          job_id: string
          method: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          job_id?: string
          method?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      process_activities: {
        Row: {
          created_at: string
          current_state_notes: string | null
          engagement_id: string
          estimated_hours_per_week: number | null
          frequency: string | null
          id: string
          ideal_state_notes: string | null
          is_owner_dependent: boolean | null
          name: string
          performed_by: string | null
          updated_at: string
          value_chain_stage: string
        }
        Insert: {
          created_at?: string
          current_state_notes?: string | null
          engagement_id: string
          estimated_hours_per_week?: number | null
          frequency?: string | null
          id?: string
          ideal_state_notes?: string | null
          is_owner_dependent?: boolean | null
          name: string
          performed_by?: string | null
          updated_at?: string
          value_chain_stage: string
        }
        Update: {
          created_at?: string
          current_state_notes?: string | null
          engagement_id?: string
          estimated_hours_per_week?: number | null
          frequency?: string | null
          id?: string
          ideal_state_notes?: string | null
          is_owner_dependent?: boolean | null
          name?: string
          performed_by?: string | null
          updated_at?: string
          value_chain_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_activities_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      process_tool_links: {
        Row: {
          id: string
          process_activity_id: string
          tool_id: string
          usage_notes: string | null
        }
        Insert: {
          id?: string
          process_activity_id: string
          tool_id: string
          usage_notes?: string | null
        }
        Update: {
          id?: string
          process_activity_id?: string
          tool_id?: string
          usage_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_tool_links_process_activity_id_fkey"
            columns: ["process_activity_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_tool_links_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string
          quantity: number | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          job_id: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          date: string
          id: string
          image_url: string | null
          merchant: string
          organization_id: string
          status: string | null
          total: number
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          image_url?: string | null
          merchant: string
          organization_id: string
          status?: string | null
          total: number
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          image_url?: string | null
          merchant?: string
          organization_id?: string
          status?: string | null
          total?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      relief_metrics: {
        Row: {
          baseline_date: string
          baseline_source: string
          baseline_value: number
          confidence_level: string | null
          created_at: string
          current_date: string | null
          current_value: number | null
          direction: string
          engagement_id: string
          id: string
          intervention_id: string | null
          measurement_frequency: string | null
          measurement_method: string | null
          metric_type: string
          name: string
          notes: string | null
          status: string
          target_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          baseline_date: string
          baseline_source: string
          baseline_value: number
          confidence_level?: string | null
          created_at?: string
          current_date?: string | null
          current_value?: number | null
          direction?: string
          engagement_id: string
          id?: string
          intervention_id?: string | null
          measurement_frequency?: string | null
          measurement_method?: string | null
          metric_type: string
          name: string
          notes?: string | null
          status?: string
          target_value: number
          unit: string
          updated_at?: string
        }
        Update: {
          baseline_date?: string
          baseline_source?: string
          baseline_value?: number
          confidence_level?: string | null
          created_at?: string
          current_date?: string | null
          current_value?: number | null
          direction?: string
          engagement_id?: string
          id?: string
          intervention_id?: string | null
          measurement_frequency?: string | null
          measurement_method?: string | null
          metric_type?: string
          name?: string
          notes?: string | null
          status?: string
          target_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relief_metrics_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relief_metrics_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_uploads: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          organization_id: string
          record_count: number | null
          statement_period: string | null
          upload_type: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          organization_id: string
          record_count?: number | null
          statement_period?: string | null
          upload_type: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          organization_id?: string
          record_count?: number | null
          statement_period?: string | null
          upload_type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statement_uploads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          address: string | null
          communication_preference: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          status: string | null
          trade: string | null
          compliance_status: string | null
        }
        Insert: {
          address?: string | null
          communication_preference?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          trade?: string | null
          compliance_status?: string | null
        }
        Update: {
          address?: string | null
          communication_preference?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          trade?: string | null
          compliance_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_deductible: boolean | null
          name: string
          organization_id: string | null
          posture: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_deductible?: boolean | null
          name: string
          organization_id?: string | null
          posture?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_deductible?: boolean | null
          name?: string
          organization_id?: string | null
          posture?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          integration_status: string | null
          intervention_action: string | null
          monthly_cost: number | null
          name: string
          notes: string | null
          satisfaction_score: number | null
          type: string
          updated_at: string
          user_count: number | null
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          integration_status?: string | null
          intervention_action?: string | null
          monthly_cost?: number | null
          name: string
          notes?: string | null
          satisfaction_score?: number | null
          type: string
          updated_at?: string
          user_count?: number | null
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          integration_status?: string | null
          intervention_action?: string | null
          monthly_cost?: number | null
          name?: string
          notes?: string | null
          satisfaction_score?: number | null
          type?: string
          updated_at?: string
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_mask: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string
          external_id: string | null
          id: string
          job_id: string | null
          merchant: string | null
          organization_id: string
          receipt_id: string | null
          review_status: string | null
          status: string | null
        }
        Insert: {
          amount: number
          bank_account_mask?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          description: string
          external_id?: string | null
          id?: string
          job_id?: string | null
          merchant?: string | null
          organization_id: string
          receipt_id?: string | null
          review_status?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          bank_account_mask?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          external_id?: string | null
          id?: string
          job_id?: string | null
          merchant?: string | null
          organization_id?: string
          receipt_id?: string | null
          review_status?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          property_address_or_unit: string
          status: string
          assigned_subcontractor_id: string | null
          start_date: string | null
          estimated_completion_date: string | null
          actual_completion_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          property_address_or_unit: string
          status?: string
          assigned_subcontractor_id?: string | null
          start_date?: string | null
          estimated_completion_date?: string | null
          actual_completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          property_address_or_unit?: string
          status?: string
          assigned_subcontractor_id?: string | null
          start_date?: string | null
          estimated_completion_date?: string | null
          actual_completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assigned_subcontractor_id_fkey"
            columns: ["assigned_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_drafts: {
        Row: {
          id: string
          organization_id: string
          source: string
          raw_content: string
          extracted_data: any
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          source: string
          raw_content: string
          extracted_data?: any
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          source?: string
          raw_content?: string
          extracted_data?: any
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_tasks: {
        Row: {
          id: string
          work_order_id: string
          organization_id: string
          trade_type: string
          description: string | null
          estimated_cost: number | null
          actual_cost: number | null
          status: string
          assigned_subcontractor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          organization_id: string
          trade_type: string
          description?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          status?: string
          assigned_subcontractor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          organization_id?: string
          trade_type?: string
          description?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          status?: string
          assigned_subcontractor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_tasks_assigned_subcontractor_id_fkey"
            columns: ["assigned_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      finance_overview: {
        Row: {
          net_income: number | null
          organization_id: string | null
          pending_review_count: number | null
          period_id: string | null
          total_expenses: number | null
          total_revenue: number | null
          uncategorized_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      categorize_transactions: {
        Args: { p_organization_id: string }
        Returns: number
      }
      get_auth_user_org_id: { Args: never; Returns: string }
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
