export enum Role {
  Customer = 'customer',
  CPR = 'cpr',
  Service = 'service',
  Admin = 'admin',
  ChannelPartner = 'channel_partner',
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

export interface AuditLogEntry {
  timestamp: string;
  user: string;
  action: string;
  details?: string;
}

export interface Quote {
    id: string;
    items: { description: string; cost: number }[];
    total_cost: number;
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
  notes?: string[];
  quote?: Quote | null;
  geolocation?: string | null;
  audit_log: AuditLogEntry[];
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