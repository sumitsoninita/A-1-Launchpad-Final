export enum Role {
  Customer = 'customer',
  CPR = 'cpr',
  Service = 'service',
  Admin = 'admin',
  ChannelPartner = 'channel_partner',
  EPR = 'epr',
}

export enum ProductType {
  Energizer = 'Energizer Product',
  PowerAdapter = 'Power Adapter',
  GateMotorController = 'Gate Motor Controller',
}

export enum Status {
  Received = 'Received',
  Diagnosis = 'Diagnosis',
  AwaitingApproval = 'Awaiting Approval',
  RepairInProgress = 'Repair in Progress',
  QualityCheck = 'Quality Check',
  Dispatched = 'Dispatched',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum EPRStatus {
  CostEstimationPreparation = 'Cost Estimation Preparation',
  AwaitingApproval = 'Awaiting Approval',
  Approved = 'Approved',
  Declined = 'Declined',
  RepairInProgress = 'Repair in Progress',
  RepairCompleted = 'Repair Completed',
  ReturnToCustomer = 'Return to Customer',
}

export interface AuditLogEntry {
  timestamp: string;
  user: string;
  action: string;
  details?: string;
  type?: string;
  metadata?: {
    [key: string]: any;
  };
  // EPR-specific fields
  epr_status?: EPRStatus;
  cost_estimation?: number;
  cost_estimation_currency?: 'INR' | 'USD';
  approval_decision?: 'approved' | 'declined';
  // Quote-specific fields
  quote_decision?: 'approved' | 'declined';
}

export interface EPRTimelineEntry {
  timestamp: string;
  user: string;
  action: string;
  epr_status: EPRStatus;
  details?: string;
  cost_estimation?: number;
  cost_estimation_currency?: 'INR' | 'USD';
  approval_decision?: 'approved' | 'declined';
}

export interface Quote {
    id: string;
    items: { description: string; cost: number; currency: 'INR' | 'USD' }[];
    total_cost: number;
    currency: 'INR' | 'USD';
    is_approved: boolean | null;
    created_at: string;
    payment_qr_code_url?: string;
}

export interface ServiceRequest {
  id: string;
  serial_number: string;
  customer_name: string;
  customer_id: string;
  customer_phone?: string;
  product_type: ProductType;
  product_details: string;
  purchase_date: string;
  fault_description: string;
  image_urls: string[];
  status: Status;
  is_warranty_claim: boolean;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_service_team?: string;
  assigned_epr_team?: string;
  notes?: string[];
  quote?: Quote | null;
  geolocation?: string | null;
  audit_log: AuditLogEntry[];
  epr_timeline?: EPRTimelineEntry[];
  current_epr_status?: EPRStatus;
  epr_cost_estimation_currency?: 'INR' | 'USD';
  payment_required?: boolean;
  payment_completed?: boolean;
}

export interface Complaint {
    id: string;
    request_id: string;
    customer_id: string;
    customer_name: string;
    complaint_details: string;
    created_at: string;
    is_resolved: boolean;
}

export interface EnrichedComplaint extends Complaint {
    product_type?: string;
    serial_number?: string;
    request_status?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
}

export interface Feedback {
  id: string;
  service_request_id: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_name?: string;
  product_type?: ProductType;
  serial_number?: string;
}