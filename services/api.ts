import { AppUser, Role, ServiceRequest, Status, Complaint, Quote, Feedback } from '../types';
import { supabase } from './supabase';

// ================================================================= //
// Supabase API Service - Real database integration                  //
// Uses Supabase for data persistence and real-time updates         //
// ================================================================= //

const SESSION_KEY = 'service_hub_session';

// Helper function to get from localStorage (for session only)
const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

const saveToStorage = <T>(key: string, value: T) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
};


// --- API Methods ---
export const api = {

    // --- Auth (keeping existing mock auth system) ---
    async login(email: string, password: string): Promise<AppUser> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const { data: users, error } = await supabase
                        .from('app_users')
                        .select('*')
                        .eq('email', email.toLowerCase());
                    
                    if (error) throw error;
                    
                    const user = users?.[0];
                    if (user) {
                        const appUser: AppUser = {
                            id: user.id,
                            email: user.email,
                            role: user.role as Role,
                            fullName: user.full_name
                        };
                        saveToStorage(SESSION_KEY, appUser);
                        resolve(appUser);
                    } else {
                        reject(new Error('Invalid email or password'));
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    reject(new Error('Login failed'));
                }
            }, 500);
        });
    },
    
    async register(email: string, password: string, role: Role, fullName: string): Promise<AppUser> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    // Check if user already exists
                    const { data: existingUsers, error: checkError } = await supabase
                        .from('app_users')
                        .select('id')
                        .eq('email', email.toLowerCase());
                    
                    if (checkError) throw checkError;
                    
                    if (existingUsers && existingUsers.length > 0) {
                        return reject(new Error('User with this email already exists.'));
                    }
                    
                    // Create new user
                    const { data: newUser, error: insertError } = await supabase
                        .from('app_users')
                        .insert({
                            email: email.toLowerCase(),
                            role: role,
                            full_name: fullName
                        })
                        .select()
                        .single();
                    
                    if (insertError) throw insertError;
                    
                    const appUser: AppUser = {
                        id: newUser.id,
                        email: newUser.email,
                        role: newUser.role as Role,
                        fullName: newUser.full_name
                    };
                    
                    resolve(appUser);
                } catch (error) {
                    console.error('Registration error:', error);
                    reject(new Error('Registration failed'));
                }
            }, 500);
        });
    },
    
    logout() {
        localStorage.removeItem(SESSION_KEY);
    },
    
    getCurrentUser(): AppUser | null {
        return getFromStorage<AppUser | null>(SESSION_KEY, null);
    },

    // --- Service Requests ---
    async getServiceRequests(): Promise<ServiceRequest[]> {
        try {
            const { data: requests, error } = await supabase
                .from('service_requests')
                .select(`
                    *,
                    quotes (*)
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return requests?.map(req => ({
                ...req,
                quote: req.quotes?.[0] || null
            })) || [];
        } catch (error) {
            console.error('Error fetching service requests:', error);
            return [];
        }
    },

    async getServiceRequestsForCustomer(customerId: string): Promise<ServiceRequest[]> {
        try {
            const { data: requests, error } = await supabase
                .from('service_requests')
                .select(`
                    *,
                    quotes (*)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return requests?.map(req => ({
                ...req,
                quote: req.quotes?.[0] || null
            })) || [];
        } catch (error) {
            console.error('Error fetching customer service requests:', error);
            return [];
        }
    },
    
    async getServiceRequestById(requestId: string): Promise<ServiceRequest | undefined> {
        try {
            const { data: request, error } = await supabase
                .from('service_requests')
                .select(`
                    *,
                    quotes (*)
                `)
                .ilike('id', `%${requestId}%`)
                .single();
            
            if (error) throw error;
            
            return request ? {
                ...request,
                quote: request.quotes?.[0] || null
            } : undefined;
        } catch (error) {
            console.error('Error fetching service request:', error);
            return undefined;
        }
    },

    async addServiceRequest(requestData: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at' | 'status' | 'audit_log'>, userEmail: string): Promise<ServiceRequest> {
        try {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const auditLog = [{ timestamp: new Date().toISOString(), user: userEmail, action: 'Request created' }];
            
            const { data: newRequest, error } = await supabase
                .from('service_requests')
                .insert({
                    id: requestId,
                    ...requestData,
                    status: 'Received',
                    audit_log: auditLog
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return {
                ...newRequest,
                quote: null
            };
        } catch (error) {
            console.error('Error adding service request:', error);
            throw new Error('Failed to create service request');
        }
    },

    async updateRequestStatus(requestId: string, status: Status, userEmail: string): Promise<ServiceRequest> {
        try {
            // First get the current request to update audit log
            const { data: currentRequest, error: fetchError } = await supabase
                .from('service_requests')
                .select('audit_log')
                .eq('id', requestId)
                .single();
            
            if (fetchError) throw fetchError;
            
            const updatedAuditLog = [
                ...(currentRequest.audit_log || []),
                { timestamp: new Date().toISOString(), user: userEmail, action: `Status changed to ${status}` }
            ];
            
            const { data: updatedRequest, error } = await supabase
                .from('service_requests')
                .update({
                    status: status,
                    audit_log: updatedAuditLog
                })
                .eq('id', requestId)
                .select(`
                    *,
                    quotes (*)
                `)
                .single();
            
            if (error) throw error;
            
            return {
                ...updatedRequest,
                quote: updatedRequest.quotes?.[0] || null
            };
        } catch (error) {
            console.error('Error updating request status:', error);
            throw new Error('Failed to update request status');
        }
    },
    
    async addQuoteToRequest(requestId: string, quoteData: Omit<Quote, 'id' | 'created_at' | 'is_approved'>, userEmail: string): Promise<ServiceRequest> {
        try {
            const quoteId = `quote-${Date.now()}`;
            
            // Create the quote
            const { data: newQuote, error: quoteError } = await supabase
                .from('quotes')
                .insert({
                    id: quoteId,
                    service_request_id: requestId,
                    ...quoteData,
                    is_approved: null
                })
                .select()
                .single();
            
            if (quoteError) throw quoteError;
            
            // Update the service request status and audit log
            const { data: currentRequest, error: fetchError } = await supabase
                .from('service_requests')
                .select('audit_log')
                .eq('id', requestId)
                .single();
            
            if (fetchError) throw fetchError;
            
            const updatedAuditLog = [
                ...(currentRequest.audit_log || []),
                { timestamp: new Date().toISOString(), user: userEmail, action: `Quote generated for $${newQuote.total_cost}` }
            ];
            
            const { data: updatedRequest, error: updateError } = await supabase
                .from('service_requests')
                .update({
                    status: 'Awaiting Approval',
                    audit_log: updatedAuditLog
                })
                .eq('id', requestId)
                .select(`
                    *,
                    quotes (*)
                `)
                .single();
            
            if (updateError) throw updateError;
            
            return {
                ...updatedRequest,
                quote: updatedRequest.quotes?.[0] || null
            };
        } catch (error) {
            console.error('Error adding quote to request:', error);
            throw new Error('Failed to add quote to request');
        }
    },
    
    async updateQuoteStatus(requestId: string, isApproved: boolean, userEmail: string): Promise<ServiceRequest> {
        try {
            // Update the quote status
            const { error: quoteError } = await supabase
                .from('quotes')
                .update({ is_approved: isApproved })
                .eq('service_request_id', requestId);
            
            if (quoteError) throw quoteError;
            
            // Update the service request status and audit log
            const { data: currentRequest, error: fetchError } = await supabase
                .from('service_requests')
                .select('audit_log')
                .eq('id', requestId)
                .single();
            
            if (fetchError) throw fetchError;
            
            const updatedAuditLog = [
                ...(currentRequest.audit_log || []),
                { timestamp: new Date().toISOString(), user: userEmail, action: `Quote ${isApproved ? 'Approved' : 'Declined'}` }
            ];
            
            const newStatus = isApproved ? 'Repair in Progress' : 'Cancelled';
            
            const { data: updatedRequest, error: updateError } = await supabase
                .from('service_requests')
                .update({
                    status: newStatus,
                    audit_log: updatedAuditLog
                })
                .eq('id', requestId)
                .select(`
                    *,
                    quotes (*)
                `)
                .single();
            
            if (updateError) throw updateError;
            
            return {
                ...updatedRequest,
                quote: updatedRequest.quotes?.[0] || null
            };
        } catch (error) {
            console.error('Error updating quote status:', error);
            throw new Error('Failed to update quote status');
        }
    },
    
    // --- Complaints & Feedback ---
    async addComplaint(complaintData: Omit<Complaint, 'id' | 'created_at' | 'is_resolved'>): Promise<Complaint> {
        try {
            const complaintId = `comp-${Date.now()}`;
            
            const { data: newComplaint, error } = await supabase
                .from('complaints')
                .insert({
                    id: complaintId,
                    ...complaintData,
                    is_resolved: false
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return newComplaint;
        } catch (error) {
            console.error('Error adding complaint:', error);
            throw new Error('Failed to add complaint');
        }
    },
    
    async addFeedback(feedbackData: { service_request_id: string, rating: number, comment: string }): Promise<Feedback> {
        try {
            const feedbackId = `fb-${Date.now()}`;
            
            const { data: newFeedback, error } = await supabase
                .from('feedback')
                .insert({
                    id: feedbackId,
                    ...feedbackData
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return newFeedback;
        } catch (error) {
            console.error('Error adding feedback:', error);
            throw new Error('Failed to add feedback');
        }
    },
    
    async getFeedback(): Promise<Feedback[]> {
        try {
            const { data: feedbackList, error } = await supabase
                .from('feedback')
                .select(`
                    *,
                    service_requests!inner (
                        customer_name,
                        product_type,
                        serial_number
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Enrich feedback with request details
            const enrichedFeedback = feedbackList?.map(fb => ({
                ...fb,
                customer_name: fb.service_requests?.customer_name || 'N/A',
                product_type: fb.service_requests?.product_type,
                serial_number: fb.service_requests?.serial_number || 'N/A'
            })) || [];
            
            return enrichedFeedback;
        } catch (error) {
            console.error('Error fetching feedback:', error);
            return [];
        }
    }
};