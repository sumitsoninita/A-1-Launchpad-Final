export enum Role {
  Customer = 'customer',
  CPR = 'cpr',
  Service = 'service',
  Admin = 'admin',
  ChannelPartner = 'channel_partner',
  SystemIntegrator = 'system_integrator',
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

// Bulk Service Request Interfaces
export interface BulkEquipmentItem {
  id: string;
  bulk_request_id: string;
  equipment_type: string;
  equipment_model?: string;
  serial_number?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  issue_description: string;
  issue_category: 'hardware' | 'software' | 'installation' | 'maintenance' | 'warranty' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  item_status: 'pending' | 'diagnosed' | 'repair_approved' | 'repair_in_progress' | 'quality_check' | 'completed' | 'cancelled';
  epr_status?: EPRStatus;
  epr_cost_estimation?: number;
  epr_cost_estimation_currency?: 'INR' | 'USD';
  epr_timeline?: EPRTimelineEntry[];
  quote?: Quote | null;
  created_at: string;
  updated_at: string;
}

export interface BulkServiceRequest {
  id: string;
  requester_email: string;
  requester_role: 'channel_partner' | 'system_integrator';
  requester_name: string;
  company_name?: string;
  contact_phone?: string;
  contact_email?: string;
  total_equipment_count: number;
  estimated_total_value?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'under_review' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  assigned_service_team?: string;
  assigned_epr_team?: string;
  assigned_to?: string;
  equipment_items: BulkEquipmentItem[];
  // EPR fields for combined cost estimation
  epr_status?: EPRStatus;
  epr_cost_estimation?: number;
  epr_cost_estimation_currency?: 'INR' | 'USD';
  epr_timeline?: EPRTimelineEntry[];
  quote?: Quote | null;
  created_at: string;
  updated_at: string;
}