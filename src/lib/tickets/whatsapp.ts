type ShareTicket = Readonly<{
  customerName: string;
  ticketTypeName: string;
  ticketCode: string;
  admissionCount: number;
  passUrl: string;
  venue: string;
  eventDate: string;
  eventTime: string;
}>;

export function whatsappPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function buildTicketWhatsappMessage(ticket: ShareTicket): string {
  return [
    "YOUR DREAMERS PASS IS READY",
    "",
    `Hi ${ticket.customerName},`,
    "",
    "Your payment has been verified and your ticket for The Dreamers Film Festival is ready.",
    "",
    `Ticket: ${ticket.ticketTypeName}`,
    `Ticket ID: ${ticket.ticketCode}`,
    `Admission: ${ticket.admissionCount}`,
    "",
    `View your Dreamers Pass: ${ticket.passUrl}`,
    "",
    "Present your QR code at the entrance. The downloaded PNG can be attached separately if you wish.",
    "",
    `Venue: ${ticket.venue}`,
    `Date: ${ticket.eventDate}`,
    `Time: ${ticket.eventTime}`,
    "",
    "Stories. Passion. Impact.",
  ].join("\n");
}

export function buildWhatsappUrl(message: string, phone?: string): string {
  const target = phone ? whatsappPhone(phone) : "";
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}
