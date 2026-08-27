import "server-only";

import { requireGateAdmin, requireSuperAdmin } from "@/lib/admin/auth";
import { mapGateTicket, type GateRpcRow } from "@/lib/check-in/domain";
import { createClient } from "@/lib/supabase/server";
import type {
  CheckInHistoryItem,
  GateDashboard,
  GateTicketResult,
} from "@/types/domain";

export async function getGateDashboard(): Promise<GateDashboard> {
  await requireGateAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_gate_dashboard");
  const row = data?.[0];
  if (error || !row) throw new Error("Gate attendance metrics are unavailable.");
  return {
    eventName: row.event_name,
    eventDate: row.event_date,
    venue: row.venue,
    venueCapacity: row.venue_capacity,
    validPassesIssued: row.valid_passes_issued,
    passesCheckedIn: row.passes_checked_in,
    passesRemaining: row.passes_remaining,
    peopleAdmitted: row.people_admitted,
    maximumPotentialAttendance: row.maximum_potential_attendance,
    checkInPercentage: Number(row.check_in_percentage),
  };
}

export async function validateGateTicket(
  qrTokenHash: string,
): Promise<GateTicketResult> {
  await requireGateAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_gate_ticket", {
    p_qr_token_hash: qrTokenHash,
  });
  if (error) throw error;
  return mapGateTicket(data?.[0] as GateRpcRow | undefined);
}

export async function searchGateTickets(query: string): Promise<GateTicketResult[]> {
  await requireGateAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_gate_tickets", {
    p_query: query,
    p_limit: 20,
  });
  if (error) throw error;
  return (data ?? []).map((row) => mapGateTicket(row as GateRpcRow));
}

export async function getCheckInHistory(input: {
  query?: string;
  from?: string;
  to?: string;
}): Promise<CheckInHistoryItem[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_check_in_history", {
    p_query: input.query || null,
    p_from: input.from || null,
    p_to: input.to || null,
    p_limit: 300,
  });
  if (error) throw new Error("Check-in history is unavailable.");
  return (data ?? []).map((row) => ({
    id: row.check_in_id,
    checkedInAt: row.checked_in_at,
    ticketCode: row.ticket_code,
    holderName: row.holder_name,
    ticketTypeName: row.ticket_type_name,
    admissionCount: row.admission_count,
    source: row.source,
    staffName: row.staff_name,
  }));
}
