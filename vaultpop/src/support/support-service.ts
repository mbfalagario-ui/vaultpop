import type { SupportTicketInput } from "@/support/support-model";

export type SupportSubmitResult = {
  delivered: boolean;
  ticketId?: string;
};

export async function submitSupportTicket(
  ticket: SupportTicketInput
): Promise<SupportSubmitResult> {
  const baseUrl = process.env.EXPO_PUBLIC_VAULTPOP_API_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return { delivered: false };
  }
  try {
    const response = await fetch(`${baseUrl}/v1/support/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket)
    });
    const body = (await response.json().catch(() => null)) as { ticketId?: string } | null;
    return {
      delivered: response.ok && Boolean(body?.ticketId),
      ticketId: body?.ticketId
    };
  } catch {
    return { delivered: false };
  }
}
