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
      buildings: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          floor_count: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          property_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          floor_count?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          property_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          floor_count?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_turnover_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
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
      cheque_line_items: {
        Row: {
          bill_date: string | null
          cheque_id: string
          created_at: string | null
          discount: number | null
          discrepancy_amount: number | null
          discrepancy_note: string | null
          id: string
          match_status: string
          matched_invoice_id: string | null
          matched_job_id: string | null
          original_amount: number | null
          payment_amount: number
          reference_number: string | null
        }
        Insert: {
          bill_date?: string | null
          cheque_id: string
          created_at?: string | null
          discount?: number | null
          discrepancy_amount?: number | null
          discrepancy_note?: string | null
          id?: string
          match_status?: string
          matched_invoice_id?: string | null
          matched_job_id?: string | null
          original_amount?: number | null
          payment_amount: number
          reference_number?: string | null
        }
        Update: {
          bill_date?: string | null
          cheque_id?: string
          created_at?: string | null
          discount?: number | null
          discrepancy_amount?: number | null
          discrepancy_note?: string | null
          id?: string
          match_status?: string
          matched_invoice_id?: string | null
          matched_job_id?: string | null
          original_amount?: number | null
          payment_amount?: number
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheque_line_items_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheque_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_line_items_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "job_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_line_items_matched_job_id_fkey"
            columns: ["matched_job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "cheque_line_items_matched_job_id_fkey"
            columns: ["matched_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cheque_records: {
        Row: {
          cheque_date: string | null
          cheque_number: string | null
          created_at: string | null
          id: string
          image_url: string | null
          ocr_raw: Json | null
          organization_id: string
          payer: string | null
          scanned_at: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          ocr_raw?: Json | null
          organization_id: string
          payer?: string | null
          scanned_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          ocr_raw?: Json | null
          organization_id?: string
          payer?: string | null
          scanned_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheque_records_organization_id_fkey"
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
          lat: number | null
          lng: number | null
          name: string
        }
        Insert: {
          address: string
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          lat?: number | null
          lng?: number | null
          name: string
        }
        Update: {
          address?: string
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          lat?: number | null
          lng?: number | null
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
      contacts: {
        Row: {
          client_id: string | null
          company: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          client_id?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_scan_log: {
        Row: {
          classification: string | null
          from_address: string | null
          gmail_message_id: string
          id: string
          job_id: string | null
          organization_id: string
          processed_at: string | null
          subject: string | null
        }
        Insert: {
          classification?: string | null
          from_address?: string | null
          gmail_message_id: string
          id?: string
          job_id?: string | null
          organization_id: string
          processed_at?: string | null
          subject?: string | null
        }
        Update: {
          classification?: string | null
          from_address?: string | null
          gmail_message_id?: string
          id?: string
          job_id?: string | null
          organization_id?: string
          processed_at?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_scan_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "email_scan_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_scan_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sender_rules: {
        Row: {
          classification: string
          converted_job_count: number | null
          created_at: string | null
          email_pattern: string
          id: string
          organization_id: string
          sender_name: string | null
          trusted_sender: boolean | null
        }
        Insert: {
          classification?: string
          converted_job_count?: number | null
          created_at?: string | null
          email_pattern: string
          id?: string
          organization_id: string
          sender_name?: string | null
          trusted_sender?: boolean | null
        }
        Update: {
          classification?: string
          converted_job_count?: number | null
          created_at?: string | null
          email_pattern?: string
          id?: string
          organization_id?: string
          sender_name?: string | null
          trusted_sender?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sender_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          classification: string | null
          created_at: string | null
          gmail_thread_id: string
          has_attachments: boolean | null
          id: string
          is_read: boolean | null
          job_id: string | null
          last_message_date: string | null
          message_count: number | null
          organization_id: string
          participants: string[] | null
          snippet: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          classification?: string | null
          created_at?: string | null
          gmail_thread_id: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          last_message_date?: string | null
          message_count?: number | null
          organization_id: string
          participants?: string[] | null
          snippet?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          classification?: string | null
          created_at?: string | null
          gmail_thread_id?: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          last_message_date?: string | null
          message_count?: number | null
          organization_id?: string
          participants?: string[] | null
          snippet?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "email_threads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_organization_id_fkey"
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
          work_order_id: string | null
          work_order_task_id: string | null
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
          work_order_id?: string | null
          work_order_task_id?: string | null
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
          work_order_id?: string | null
          work_order_task_id?: string | null
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
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
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
          {
            foreignKeyName: "finance_transactions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_work_order_task_id_fkey"
            columns: ["work_order_task_id"]
            isOneToOne: false
            referencedRelation: "work_order_tasks"
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
      gcal_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string | null
          id: string
          organization_id: string
          refresh_token: string
          token_expiry: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          refresh_token: string
          token_expiry: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gcal_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      invoice_send_log: {
        Row: {
          id: string
          invoice_id: string
          method: string | null
          resend_message_id: string | null
          sent_at: string | null
          sent_to: string
        }
        Insert: {
          id?: string
          invoice_id: string
          method?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          sent_to: string
        }
        Update: {
          id?: string
          invoice_id?: string
          method?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_send_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "job_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      job_assignments: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          job_id: string
          magic_link_token: string
          status: string | null
          subcontractor_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          magic_link_token?: string
          status?: string | null
          subcontractor_id: string
        }
        Update: {
          confirmed_at?: string | null
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
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
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
            referencedRelation: "subcontractor_workload"
            referencedColumns: ["subcontractor_id"]
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
      job_attachments: {
        Row: {
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          job_id: string
        }
        Insert: {
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          job_id: string
        }
        Update: {
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_email_links: {
        Row: {
          gmail_thread_id: string | null
          id: string
          job_id: string
          linked_at: string | null
          linked_by: string | null
          thread_id: string
        }
        Insert: {
          gmail_thread_id?: string | null
          id?: string
          job_id: string
          linked_at?: string | null
          linked_by?: string | null
          thread_id: string
        }
        Update: {
          gmail_thread_id?: string | null
          id?: string
          job_id?: string
          linked_at?: string | null
          linked_by?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_email_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_email_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_email_links_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
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
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_invoices: {
        Row: {
          billing_contact_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          job_id: string
          line_items: Json
          notes: string | null
          organization_id: string
          paid_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          billing_contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          job_id: string
          line_items?: Json
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          billing_contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          job_id?: string
          line_items?: Json
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_invoices_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_payouts: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          finance_transaction_id: string | null
          id: string
          job_id: string
          organization_id: string
          paid_at: string | null
          subcontractor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          finance_transaction_id?: string | null
          id?: string
          job_id: string
          organization_id: string
          paid_at?: string | null
          subcontractor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          finance_transaction_id?: string | null
          id?: string
          job_id?: string
          organization_id?: string
          paid_at?: string | null
          subcontractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_payouts_finance_transaction_id_fkey"
            columns: ["finance_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_payouts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_payouts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_payouts_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_workload"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "job_payouts_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
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
          work_order_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          uploaded_by?: string | null
          url: string
          work_order_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          uploaded_by?: string | null
          url?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
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
          {
            foreignKeyName: "job_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tasks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_confirmed: boolean | null
          job_id: string
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_confirmed?: boolean | null
          job_id: string
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_confirmed?: boolean | null
          job_id?: string
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          billing_contact_id: string | null
          building_id: string | null
          client_id: string | null
          coordinator_contact_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          end_date: string | null
          expected_supplies: Json | null
          final_invoice_amount: number | null
          id: string
          invoiced_at: string | null
          job_number: string | null
          last_contact_date: string | null
          location_id: string | null
          next_reminder_date: string | null
          organization_id: string
          paid_at: string | null
          preferred_schedule_date: string | null
          property_address: string | null
          property_id: string | null
          property_owner_name: string | null
          quote_expiry_date: string | null
          requester_email: string | null
          requester_name: string | null
          source_email_body: string | null
          source_email_subject: string | null
          start_date: string | null
          status: string | null
          title: string
          unit_id: string | null
          urgency: string | null
        }
        Insert: {
          address?: string | null
          billing_contact_id?: string | null
          building_id?: string | null
          client_id?: string | null
          coordinator_contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          expected_supplies?: Json | null
          final_invoice_amount?: number | null
          id?: string
          invoiced_at?: string | null
          job_number?: string | null
          last_contact_date?: string | null
          location_id?: string | null
          next_reminder_date?: string | null
          organization_id: string
          paid_at?: string | null
          preferred_schedule_date?: string | null
          property_address?: string | null
          property_id?: string | null
          property_owner_name?: string | null
          quote_expiry_date?: string | null
          requester_email?: string | null
          requester_name?: string | null
          source_email_body?: string | null
          source_email_subject?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          unit_id?: string | null
          urgency?: string | null
        }
        Update: {
          address?: string | null
          billing_contact_id?: string | null
          building_id?: string | null
          client_id?: string | null
          coordinator_contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          expected_supplies?: Json | null
          final_invoice_amount?: number | null
          id?: string
          invoiced_at?: string | null
          job_number?: string | null
          last_contact_date?: string | null
          location_id?: string | null
          next_reminder_date?: string | null
          organization_id?: string
          paid_at?: string | null
          preferred_schedule_date?: string | null
          property_address?: string | null
          property_id?: string | null
          property_owner_name?: string | null
          quote_expiry_date?: string | null
          requester_email?: string | null
          requester_name?: string | null
          source_email_body?: string | null
          source_email_subject?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          unit_id?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_coordinator_contact_id_fkey"
            columns: ["coordinator_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_turnover_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          organization_id: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          organization_id: string
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          auto_invoice: boolean | null
          created_at: string
          digest_email: string | null
          digest_enabled: boolean | null
          id: string
          name: string
          silent_mode: boolean | null
        }
        Insert: {
          auto_invoice?: boolean | null
          created_at?: string
          digest_email?: string | null
          digest_enabled?: boolean | null
          id?: string
          name: string
          silent_mode?: boolean | null
        }
        Update: {
          auto_invoice?: boolean | null
          created_at?: string
          digest_email?: string | null
          digest_enabled?: boolean | null
          id?: string
          name?: string
          silent_mode?: boolean | null
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
      payment_reminder_drafts: {
        Row: {
          amount: number | null
          body_html: string
          created_at: string | null
          days_outstanding: number | null
          id: string
          job_id: string
          organization_id: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
          tier: string
        }
        Insert: {
          amount?: number | null
          body_html: string
          created_at?: string | null
          days_outstanding?: number | null
          id?: string
          job_id: string
          organization_id: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          tier: string
        }
        Update: {
          amount?: number | null
          body_html?: string
          created_at?: string | null
          days_outstanding?: number | null
          id?: string
          job_id?: string
          organization_id?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_drafts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "payment_reminder_drafts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminder_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_share_log: {
        Row: {
          id: string
          job_id: string
          photo_ids: string[]
          portal_link: string | null
          resend_message_id: string | null
          shared_at: string | null
          shared_with_email: string
        }
        Insert: {
          id?: string
          job_id: string
          photo_ids: string[]
          portal_link?: string | null
          resend_message_id?: string | null
          shared_at?: string | null
          shared_with_email: string
        }
        Update: {
          id?: string
          job_id?: string
          photo_ids?: string[]
          portal_link?: string | null
          resend_message_id?: string | null
          shared_at?: string | null
          shared_with_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_share_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "photo_share_log_job_id_fkey"
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
      properties: {
        Row: {
          address: string
          client_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          address: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_line_items: {
        Row: {
          added_at: string | null
          created_at: string
          description: string
          id: string
          is_change_order: boolean | null
          item_type: string | null
          job_id: string
          provided_by: string | null
          quantity: number | null
          source_email_thread_id: string | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          added_at?: string | null
          created_at?: string
          description: string
          id?: string
          is_change_order?: boolean | null
          item_type?: string | null
          job_id: string
          provided_by?: string | null
          quantity?: number | null
          source_email_thread_id?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          added_at?: string | null
          created_at?: string
          description?: string
          id?: string
          is_change_order?: boolean | null
          item_type?: string | null
          job_id?: string
          provided_by?: string | null
          quantity?: number | null
          source_email_thread_id?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "quote_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_source_email_thread_id_fkey"
            columns: ["source_email_thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_nudges: {
        Row: {
          dismissed: boolean | null
          id: string
          nudge_type: string
          organization_id: string
          shown_at: string | null
          user_id: string
        }
        Insert: {
          dismissed?: boolean | null
          id?: string
          nudge_type: string
          organization_id: string
          shown_at?: string | null
          user_id: string
        }
        Update: {
          dismissed?: boolean | null
          id?: string
          nudge_type?: string
          organization_id?: string
          shown_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_nudges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          auto_match_job_id: string | null
          confidence_score: number | null
          created_at: string
          date: string
          id: string
          image_url: string | null
          job_id: string | null
          line_items: Json | null
          merchant: string
          ocr_raw: Json | null
          organization_id: string
          payment_method: string | null
          status: string | null
          sync_status: string | null
          tax_amount: number | null
          thumbnail_url: string | null
          total: number
          uploaded_by: string | null
        }
        Insert: {
          auto_match_job_id?: string | null
          confidence_score?: number | null
          created_at?: string
          date: string
          id?: string
          image_url?: string | null
          job_id?: string | null
          line_items?: Json | null
          merchant: string
          ocr_raw?: Json | null
          organization_id: string
          payment_method?: string | null
          status?: string | null
          sync_status?: string | null
          tax_amount?: number | null
          thumbnail_url?: string | null
          total: number
          uploaded_by?: string | null
        }
        Update: {
          auto_match_job_id?: string | null
          confidence_score?: number | null
          created_at?: string
          date?: string
          id?: string
          image_url?: string | null
          job_id?: string | null
          line_items?: Json | null
          merchant?: string
          ocr_raw?: Json | null
          organization_id?: string
          payment_method?: string | null
          status?: string | null
          sync_status?: string | null
          tax_amount?: number | null
          thumbnail_url?: string | null
          total?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_auto_match_job_id_fkey"
            columns: ["auto_match_job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "receipts_auto_match_job_id_fkey"
            columns: ["auto_match_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "receipts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
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
      reconciliation_rejections: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          receipt_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          receipt_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          receipt_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_rejections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      saved_rates: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          task_name: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          task_name: string
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          task_name?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shadow_outbound_log: {
        Row: {
          attachments_meta: Json | null
          body_html: string | null
          cc_address: string | null
          email_type: string
          id: string
          metadata: Json | null
          organization_id: string
          related_job_id: string | null
          related_job_number: string | null
          source_route: string
          subject: string
          suppressed_at: string | null
          to_address: string
        }
        Insert: {
          attachments_meta?: Json | null
          body_html?: string | null
          cc_address?: string | null
          email_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          related_job_id?: string | null
          related_job_number?: string | null
          source_route: string
          subject: string
          suppressed_at?: string | null
          to_address: string
        }
        Update: {
          attachments_meta?: Json | null
          body_html?: string | null
          cc_address?: string | null
          email_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          related_job_id?: string | null
          related_job_number?: string | null
          source_route?: string
          subject?: string
          suppressed_at?: string | null
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "shadow_outbound_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shadow_outbound_log_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "shadow_outbound_log_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      sub_payouts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          job_id: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          subcontractor_id: string
          work_order_task_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          subcontractor_id: string
          work_order_task_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          subcontractor_id?: string
          work_order_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_payouts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "sub_payouts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_payouts_organization_id_fkey"
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
          compliance_status: string | null
          created_at: string
          email: string | null
          id: string
          max_concurrent_tasks: number
          name: string
          organization_id: string | null
          phone: string | null
          status: string | null
          trade: string | null
        }
        Insert: {
          address?: string | null
          communication_preference?: string | null
          compliance_status?: string | null
          created_at?: string
          email?: string | null
          id?: string
          max_concurrent_tasks?: number
          name: string
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          trade?: string | null
        }
        Update: {
          address?: string | null
          communication_preference?: string | null
          compliance_status?: string | null
          created_at?: string
          email?: string | null
          id?: string
          max_concurrent_tasks?: number
          name?: string
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          trade?: string | null
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
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
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
      turnover_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          organization_id: string
          previous_value: Json | null
          turnover_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          organization_id: string
          previous_value?: Json | null
          turnover_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          organization_id?: string
          previous_value?: Json | null
          turnover_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnover_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_events_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: false
            referencedRelation: "turnovers"
            referencedColumns: ["id"]
          },
        ]
      }
      turnover_tasks: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string
          estimated_cost: number | null
          id: string
          organization_id: string
          sort_order: number | null
          status: string
          trade: string | null
          turnover_id: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          organization_id: string
          sort_order?: number | null
          status?: string
          trade?: string | null
          turnover_id: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          organization_id?: string
          sort_order?: number | null
          status?: string
          trade?: string | null
          turnover_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnover_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "subcontractor_workload"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "turnover_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_tasks_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: false
            referencedRelation: "turnovers"
            referencedColumns: ["id"]
          },
        ]
      }
      turnover_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          tasks: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          tasks?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          tasks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "turnover_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      turnovers: {
        Row: {
          actual_cost: number | null
          actual_ready_date: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          estimated_cost: number | null
          id: string
          is_active: boolean | null
          job_id: string | null
          move_in_date: string | null
          move_out_date: string | null
          notes: string | null
          organization_id: string
          stage: string
          target_ready_date: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_ready_date?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean | null
          job_id?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          notes?: string | null
          organization_id: string
          stage?: string
          target_ready_date?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_ready_date?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean | null
          job_id?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          notes?: string | null
          organization_id?: string
          stage?: string
          target_ready_date?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnovers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "subcontractor_workload"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "turnovers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnovers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "turnovers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnovers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnovers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          building_id: string
          created_at: string | null
          floor: number | null
          id: string
          notes: string | null
          organization_id: string
          sqft: number | null
          status: string
          unit_number: string
          updated_at: string | null
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          building_id: string
          created_at?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          sqft?: number | null
          status?: string
          unit_number: string
          updated_at?: string | null
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string
          created_at?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          sqft?: number | null
          status?: string
          unit_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      work_order_drafts: {
        Row: {
          auto_converted: boolean | null
          converted_job_id: string | null
          created_at: string
          email_thread_id: string | null
          extracted_data: Json | null
          extraction_confidence: number | null
          id: string
          organization_id: string
          raw_content: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_converted?: boolean | null
          converted_job_id?: string | null
          created_at?: string
          email_thread_id?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          id?: string
          organization_id: string
          raw_content: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_converted?: boolean | null
          converted_job_id?: string | null
          created_at?: string
          email_thread_id?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          id?: string
          organization_id?: string
          raw_content?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_drafts_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "work_order_drafts_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_drafts_email_thread_id_fkey"
            columns: ["email_thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_tasks: {
        Row: {
          assigned_subcontractor_id: string | null
          completed_at: string | null
          completed_by: string | null
          cost_estimate: number | null
          created_at: string | null
          id: string
          organization_id: string
          status: string
          trade_type: string
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          assigned_subcontractor_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          status?: string
          trade_type: string
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          assigned_subcontractor_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          status?: string
          trade_type?: string
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_tasks_assigned_subcontractor_id_fkey"
            columns: ["assigned_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_workload"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "work_order_tasks_assigned_subcontractor_id_fkey"
            columns: ["assigned_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
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
            foreignKeyName: "work_order_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          billing_contact_id: string | null
          client_id: string
          coordinator_contact_id: string | null
          created_at: string | null
          due_at: string | null
          id: string
          job_id: string | null
          organization_id: string
          property_address_or_unit: string
          received_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          billing_contact_id?: string | null
          client_id: string
          coordinator_contact_id?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          job_id?: string | null
          organization_id: string
          property_address_or_unit: string
          received_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          billing_contact_id?: string | null
          client_id?: string
          coordinator_contact_id?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          job_id?: string | null
          organization_id?: string
          property_address_or_unit?: string
          received_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
            foreignKeyName: "work_orders_coordinator_contact_id_fkey"
            columns: ["coordinator_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_profit_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "work_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
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
      job_profit_summary: {
        Row: {
          completed_wo_count: number | null
          gross_profit: number | null
          job_id: string | null
          job_number: string | null
          linked_wo_count: number | null
          margin_pct: number | null
          organization_id: string | null
          property_address: string | null
          revenue: number | null
          status: string | null
          total_payouts: number | null
          wo_estimated_costs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_turnover_summary: {
        Row: {
          active_turnovers: number | null
          building_count: number | null
          completed_turnovers: number | null
          organization_id: string | null
          property_address: string | null
          property_id: string | null
          property_name: string | null
          total_units: number | null
          units_idle: number | null
          units_in_turnover: number | null
          units_ready: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_workload: {
        Row: {
          active_task_count: number | null
          capacity_status: string | null
          completed_task_count: number | null
          max_concurrent_tasks: number | null
          organization_id: string | null
          subcontractor_id: string | null
          subcontractor_name: string | null
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
