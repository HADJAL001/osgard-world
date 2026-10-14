export type LeadAttribution = {
  gameId: string;
  source: string;
  campaign: string;
};
export type LeadMessageInput = {
  projectType?: string;
  budget?: string;
  contact?: string;
  description?: string;
  attribution?: Partial<LeadAttribution>;
};
export function normalizeLeadAttribution(search?: string): LeadAttribution;
export function resolvePublicApiBase(raw: unknown, origin: string): string;
export function buildLeadMessage(input?: LeadMessageInput): string;
