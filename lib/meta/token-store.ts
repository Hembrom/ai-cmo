export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

export interface MetaIgAccount {
  ig_id: string;
  page_id: string;
  name: string;
  page_token: string;
}

export interface MetaConnection {
  user_access_token: string;
  expires_at: string;
  pages: MetaPage[];
  ig_accounts: MetaIgAccount[];
  connected_at: string;
  refreshed_at?: string;
  expired?: boolean;
}

// In-memory store — replace with encrypted DB column in production
// Note: resets on each serverless cold start
export const tokenStore: Record<string, MetaConnection> = {};
