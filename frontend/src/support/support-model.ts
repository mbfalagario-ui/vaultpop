export const SUPPORT_CATEGORIES = [
  "Purchase issue",
  "Ads issue",
  "Gameplay issue",
  "Bug report",
  "Privacy request",
  "Other"
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export type SupportTicketInput = {
  category: SupportCategory;
  message: string;
  email?: string;
  installId: string;
  appVersion: string;
  buildNumber: string;
  deviceInfo: string;
  priority: boolean;
  /** True when the Support Assistant escalated this conversation. */
  escalated?: boolean;
};

export type SupportValidation = {
  valid: boolean;
  messageError?: string;
  emailError?: string;
};

export function validateSupportTicket(
  input: Pick<SupportTicketInput, "message" | "email">
): SupportValidation {
  const message = input.message.trim();
  if (message.length < 10) {
    return { valid: false, messageError: "Please add at least 10 characters." };
  }
  if (message.length > 2_000) {
    return { valid: false, messageError: "Please keep the message under 2,000 characters." };
  }
  const email = input.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, emailError: "Enter a valid email or leave it blank." };
  }
  return { valid: true };
}
