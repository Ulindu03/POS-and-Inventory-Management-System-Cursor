export type WarrantyStatus = 'pending_activation' | 'active' | 'expired' | 'revoked' | 'transferred';
export type ClaimStatus = 'open' | 'in_review' | 'awaiting_customer' | 'approved' | 'rejected' | 'resolved' | 'closed';

export interface WarrantyIssueParams {
  productId: string;
  saleId?: string;
  saleItemId?: string;
  customerId: string;
  issuedBy: string;
  periodDays: number;
  coverage?: string[];
  exclusions?: string[];
  type?: 'manufacturer'|'extended'|'replacement';
  requiresActivation?: boolean;
  serialNumber?: string;
  batchNumber?: string;
}