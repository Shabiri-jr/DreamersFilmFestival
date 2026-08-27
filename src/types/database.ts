import type {
  AdminRole,
  CheckInSource,
  CommissionStatus,
  PaymentSubmissionStatus,
  PaymentStatus,
  ReferralSource,
  TicketIssuanceStatus,
  TicketStatus,
} from "./domain";

type GateTicketRpcRow = {
  outcome: string;
  ticket_id: string | null;
  ticket_code: string | null;
  holder_name: string | null;
  ticket_type_name: string | null;
  admission_count: number | null;
  ticket_status: TicketStatus | null;
  checked_in_at: string | null;
  checked_in_by_name: string | null;
  order_number: string | null;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

type PromoterRow = Timestamped & {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  referral_code: string;
  is_active: boolean;
};

type CommissionRow = Timestamped & {
  id: string;
  promoter_id: string;
  order_id: string;
  amount: number;
  status: CommissionStatus;
  earned_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

type PaymentSubmissionRow = Timestamped & {
  id: string;
  order_id: string;
  idempotency_key: string;
  sender_name: string;
  sender_bank: string;
  amount_paid: number;
  expected_amount_snapshot: number;
  amount_mismatch: boolean;
  payment_reference: string;
  normalized_reference: string;
  potential_duplicate: boolean;
  payment_date: string;
  payment_time: string | null;
  receipt_path: string;
  status: PaymentSubmissionStatus;
};

export interface Database {
  public: {
    Tables: {
      admin_profiles: Table<
        {
          id: string;
          user_id: string;
          name: string;
          email: string;
          role: AdminRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          role: AdminRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<{
          id: string;
          user_id: string;
          name: string;
          email: string;
          role: AdminRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        }>
      >;
      promoters: Table<
        PromoterRow,
        {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          referral_code: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<PromoterRow>
      >;
      ticket_types: Table<
        Timestamped & {
          id: string;
          name: string;
          slug: string;
          description: string;
          price: number;
          commission_amount: number;
          benefits: Json;
          admissions_per_unit: number;
          quantity_available: number | null;
          maximum_per_order: number | null;
          is_active: boolean;
        },
        {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          price: number;
          commission_amount?: number;
          benefits?: Json;
          admissions_per_unit?: number;
          quantity_available?: number | null;
          maximum_per_order?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<{
          id: string;
          name: string;
          slug: string;
          description: string;
          price: number;
          commission_amount: number;
          benefits: Json;
          admissions_per_unit: number;
          quantity_available: number | null;
          maximum_per_order: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        }>
      >;
      orders: Table<
        Timestamped & {
          id: string;
          order_number: string;
          customer_name: string;
          phone: string;
          email: string | null;
          ticket_type_id: string;
          quantity: number;
          total_amount: number;
          checkout_idempotency_key: string;
          promoter_id: string | null;
          referral_code: string | null;
          referral_source: ReferralSource | null;
          unit_price_snapshot: number;
          commission_rate_snapshot: number;
          payment_status: PaymentStatus;
          sender_name: string | null;
          amount_paid: number | null;
          sender_bank: string | null;
          payment_reference: string | null;
          payment_date: string | null;
          payment_time: string | null;
          payment_submitted_at: string | null;
          receipt_path: string | null;
          rejection_reason: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          verified_at: string | null;
          verified_by: string | null;
          ticket_issuance_status: TicketIssuanceStatus;
          ticket_issuance_attempts: number;
          ticket_issuance_last_attempt_at: string | null;
        },
        {
          id?: string;
          order_number: string;
          customer_name: string;
          phone: string;
          email?: string | null;
          ticket_type_id: string;
          quantity: number;
          total_amount: number;
          checkout_idempotency_key?: string;
          promoter_id?: string | null;
          referral_code?: string | null;
          referral_source?: ReferralSource | null;
          unit_price_snapshot?: number;
          commission_rate_snapshot?: number;
          payment_status?: PaymentStatus;
          sender_name?: string | null;
          amount_paid?: number | null;
          sender_bank?: string | null;
          payment_reference?: string | null;
          payment_date?: string | null;
          payment_time?: string | null;
          payment_submitted_at?: string | null;
          receipt_path?: string | null;
          rejection_reason?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          ticket_issuance_status?: TicketIssuanceStatus;
          ticket_issuance_attempts?: number;
          ticket_issuance_last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<{
          id: string;
          order_number: string;
          customer_name: string;
          phone: string;
          email: string | null;
          ticket_type_id: string;
          quantity: number;
          total_amount: number;
          checkout_idempotency_key: string;
          promoter_id: string | null;
          referral_code: string | null;
          referral_source: ReferralSource | null;
          unit_price_snapshot: number;
          commission_rate_snapshot: number;
          payment_status: PaymentStatus;
          sender_name: string | null;
          amount_paid: number | null;
          sender_bank: string | null;
          payment_reference: string | null;
          payment_date: string | null;
          payment_time: string | null;
          payment_submitted_at: string | null;
          receipt_path: string | null;
          rejection_reason: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          verified_at: string | null;
          verified_by: string | null;
          ticket_issuance_status: TicketIssuanceStatus;
          ticket_issuance_attempts: number;
          ticket_issuance_last_attempt_at: string | null;
          created_at: string;
          updated_at: string;
        }>
      >;
      commissions: Table<
        CommissionRow,
        {
          id?: string;
          promoter_id: string;
          order_id: string;
          amount: number;
          status?: CommissionStatus;
          created_at?: string;
          updated_at?: string;
          earned_at?: string | null;
          paid_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
        },
        Partial<CommissionRow>
      >;
      payment_submissions: Table<
        PaymentSubmissionRow,
        {
          id?: string;
          order_id: string;
          idempotency_key: string;
          sender_name: string;
          sender_bank: string;
          amount_paid: number;
          expected_amount_snapshot: number;
          amount_mismatch: boolean;
          payment_reference: string;
          normalized_reference: string;
          potential_duplicate?: boolean;
          payment_date: string;
          payment_time?: string | null;
          receipt_path: string;
          status?: PaymentSubmissionStatus;
          created_at?: string;
          updated_at?: string;
        },
        Partial<PaymentSubmissionRow>
      >;
      tickets: Table<
        {
          id: string;
          order_id: string;
          ticket_code: string;
          qr_token: string;
          qr_token_hash: string;
          public_access_token: string;
          public_access_token_hash: string;
          ticket_type_id: string;
          attendee_name: string;
          unit_index: number;
          ticket_type_name_snapshot: string;
          admission_count: number;
          status: TicketStatus;
          issued_at: string;
          checked_in_at: string | null;
          checked_in_by: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          order_id: string;
          ticket_code: string;
          qr_token?: string;
          public_access_token?: string;
          ticket_type_id: string;
          attendee_name: string;
          unit_index: number;
          ticket_type_name_snapshot: string;
          admission_count: number;
          status?: TicketStatus;
          issued_at?: string;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<{
          id: string;
          order_id: string;
          ticket_code: string;
          qr_token: string;
          public_access_token: string;
          ticket_type_id: string;
          attendee_name: string;
          unit_index: number;
          ticket_type_name_snapshot: string;
          admission_count: number;
          status: TicketStatus;
          issued_at: string;
          checked_in_at: string | null;
          checked_in_by: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        }>
      >;
      check_ins: Table<
        {
          id: string;
          ticket_id: string;
          checked_in_by: string;
          checked_in_at: string;
          device_information: Json;
          admission_count: number;
          source: CheckInSource;
        },
        {
          id?: string;
          ticket_id: string;
          checked_in_by: string;
          checked_in_at?: string;
          device_information?: Json;
          admission_count: number;
          source: CheckInSource;
        },
        never
      >;
      staff_action_rate_limits: Table<
        {
          admin_profile_id: string;
          action: string;
          window_started_at: string;
          request_count: number;
        },
        {
          admin_profile_id: string;
          action: string;
          window_started_at: string;
          request_count: number;
        },
        never
      >;
      public_request_rate_limits: Table<
        {
          key_hash: string;
          action: string;
          window_started_at: string;
          request_count: number;
        },
        {
          key_hash: string;
          action: string;
          window_started_at: string;
          request_count: number;
        },
        never
      >;
      audit_logs: Table<
        {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        },
        never
      >;
      event_settings: Table<
        {
          id: number;
          event_name: string;
          event_date: string;
          event_time: string;
          event_end_time: string | null;
          venue: string;
          venue_capacity: number | null;
          support_whatsapp: string;
          bank_name: string | null;
          account_name: string | null;
          account_number: string | null;
          sales_enabled: boolean;
          updated_at: string;
          updated_by: string | null;
        },
        {
          id?: number;
          event_name: string;
          event_date: string;
          event_time: string;
          event_end_time?: string | null;
          venue: string;
          venue_capacity?: number | null;
          support_whatsapp: string;
          bank_name?: string | null;
          account_name?: string | null;
          account_number?: string | null;
          sales_enabled?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        },
        Partial<{
          id: number;
          event_name: string;
          event_date: string;
          event_time: string;
          event_end_time: string | null;
          venue: string;
          venue_capacity: number | null;
          support_whatsapp: string;
          bank_name: string | null;
          account_name: string | null;
          account_number: string | null;
          sales_enabled: boolean;
          updated_at: string;
          updated_by: string | null;
        }>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_admin_role: {
        Args: Record<PropertyKey, never>;
        Returns: AdminRole | null;
      };
      mark_commission_paid: {
        Args: { commission_id: string };
        Returns: CommissionRow;
      };
      cancel_commission: {
        Args: { commission_id: string; reason: string };
        Returns: CommissionRow;
      };
      create_customer_order: {
        Args: {
          p_checkout_idempotency_key: string;
          p_ticket_type_id: string;
          p_quantity: number;
          p_customer_name: string;
          p_phone: string;
          p_email?: string | null;
          p_promoter_id?: string | null;
          p_referral_code?: string | null;
          p_referral_source?: ReferralSource | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      submit_customer_payment: {
        Args: {
          p_order_id: string;
          p_idempotency_key: string;
          p_sender_name: string;
          p_sender_bank: string;
          p_amount_paid: number;
          p_payment_reference: string;
          p_payment_date: string;
          p_payment_time: string | null;
          p_receipt_path: string;
        };
        Returns: PaymentSubmissionRow;
      };
      verify_customer_payment: {
        Args: { p_order_id: string; p_submission_id: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      reject_customer_payment: {
        Args: {
          p_order_id: string;
          p_submission_id: string;
          p_reason: string;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      issue_order_tickets: {
        Args: {
          p_order_id: string;
          p_ticket_codes: string[];
          p_qr_tokens: string[];
          p_public_access_tokens: string[];
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      record_ticket_issuance_failure: {
        Args: { p_order_id: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      search_admin_tickets: {
        Args: { p_query?: string | null; p_limit?: number };
        Returns: Array<{
          ticket_id: string;
          ticket_code: string;
          customer_name: string;
          phone: string;
          ticket_type_name: string;
          admission_count: number;
          order_number: string;
          ticket_status: TicketStatus;
          issued_at: string;
        }>;
      };
      search_admin_payment_orders: {
        Args: {
          p_status?: string | null;
          p_query?: string | null;
          p_limit?: number;
        };
        Returns: Array<{
          order_id: string;
          order_number: string;
          customer_name: string;
          phone: string;
          ticket_name: string;
          quantity: number;
          expected_amount: number;
          submitted_amount: number | null;
          promoter_name: string | null;
          referral_code: string | null;
          payment_status: PaymentStatus;
          payment_submitted_at: string | null;
          submission_id: string | null;
          amount_mismatch: boolean;
          potential_duplicate: boolean;
        }>;
      };
      record_public_validation_request: {
        Args: { p_key_hash: string };
        Returns: undefined;
      };
      validate_gate_ticket: {
        Args: { p_qr_token_hash: string };
        Returns: GateTicketRpcRow[];
      };
      search_gate_tickets: {
        Args: { p_query: string; p_limit?: number };
        Returns: GateTicketRpcRow[];
      };
      redeem_gate_ticket: {
        Args: { p_ticket_id: string; p_source: CheckInSource };
        Returns: GateTicketRpcRow[];
      };
      get_gate_dashboard: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          event_name: string;
          event_date: string;
          venue: string;
          venue_capacity: number | null;
          valid_passes_issued: number;
          passes_checked_in: number;
          passes_remaining: number;
          people_admitted: number;
          maximum_potential_attendance: number;
          check_in_percentage: number;
        }>;
      };
      search_check_in_history: {
        Args: {
          p_query?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_limit?: number;
        };
        Returns: Array<{
          check_in_id: string;
          checked_in_at: string;
          ticket_code: string;
          holder_name: string;
          ticket_type_name: string;
          admission_count: number;
          source: CheckInSource;
          staff_name: string;
        }>;
      };
    };
    Enums: {
      admin_role: AdminRole;
      payment_status: PaymentStatus;
      ticket_status: TicketStatus;
      ticket_issuance_status: TicketIssuanceStatus;
      referral_source: ReferralSource;
      commission_status: CommissionStatus;
      payment_submission_status: PaymentSubmissionStatus;
      check_in_source: CheckInSource;
    };
    CompositeTypes: Record<string, never>;
  };
}
