import { AppUser, Role, ServiceRequest, Status, Complaint, EnrichedComplaint, Quote, Feedback, EPRStatus, EPRTimelineEntry } from '../types';
import { supabase, supabaseAdmin } from './supabase';
import { createPaymentOrder, verifyPaymentSignature, getPaymentDetails, refundPayment } from './razorpay';

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

    // --- Auth (dual system: Supabase Auth for customers, hardcoded for admin/service/partner) ---
    async login(email: string, password: string): Promise<AppUser> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    // First, check if this is a hardcoded user (admin/service/partner)
                    const { data: hardcodedUsers, error: hardcodedError } = await supabase
                        .from('app_users')
                        .select('*')
                        .eq('email', email.toLowerCase())
                        .eq('is_supabase_user', false);
                    
                    if (hardcodedError) throw hardcodedError;
                    
                    const hardcodedUser = hardcodedUsers?.[0];
                    if (hardcodedUser) {
                        // For hardcoded users, we'll use simple password validation
                        // In a real app, you'd want proper password hashing
                        const validPasswords: { [key: string]: string } = {
                            'admin@test.com': 'admin123',
                            'service@test.com': 'service123',
                            'partner@test.com': 'partner123',
                            'epr@test.com': 'epr123'
                        };
                        
                        if (validPasswords[email.toLowerCase()] === password) {
                            const appUser: AppUser = {
                                id: hardcodedUser.id,
                                email: hardcodedUser.email,
                                role: hardcodedUser.role as Role,
                                fullName: hardcodedUser.full_name
                            };
                            saveToStorage(SESSION_KEY, appUser);
                            resolve(appUser);
                            return;
                        } else {
                            reject(new Error('Invalid email or password'));
                            return;
                        }
                    }
                    
                    // If not a hardcoded user, try Supabase Auth (for customers)
                    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                        email: email.toLowerCase(),
                        password: password
                    });
                    
                    if (authError) {
                        reject(new Error('Invalid email or password'));
                        return;
                    }
                    
                    if (authData.user) {
                        // Get the corresponding app_users record
                        const { data: appUserData, error: appUserError } = await supabase
                            .from('app_users')
                            .select('*')
                            .eq('supabase_user_id', authData.user.id)
                            .single();
                        
                        if (appUserError) throw appUserError;
                        
                        const appUser: AppUser = {
                            id: appUserData.id,
                            email: appUserData.email,
                            role: appUserData.role as Role,
                            fullName: appUserData.full_name
                        };
                        saveToStorage(SESSION_KEY, appUser);
                        resolve(appUser);
                    } else {
                        reject(new Error('Login failed'));
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
                    // Only allow customer registration through Supabase Auth
                    if (role !== Role.Customer) {
                        return reject(new Error('Only customer registration is allowed. Admin, service, and partner accounts are managed separately.'));
                    }
                    
                    // Check if user already exists in app_users
                    const { data: existingUsers, error: checkError } = await supabase
                        .from('app_users')
                        .select('id')
                        .eq('email', email.toLowerCase());
                    
                    if (checkError) {
                        console.error('Error checking existing users:', checkError);
                        throw checkError;
                    }
                    
                    if (existingUsers && existingUsers.length > 0) {
                        return reject(new Error('User with this email already exists.'));
                    }
                    
                    // Create user in Supabase Auth with minimal options
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                        email: email.toLowerCase(),
                        password: password
                    });
                    
                    if (authError) {
                        console.error('Supabase Auth error:', authError);
                        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
                            return reject(new Error('User with this email already exists.'));
                        }
                        return reject(new Error('Registration failed: ' + authError.message));
                    }
                    
                    if (authData.user) {
                        console.log('Auth user created:', authData.user.id);
                        
                        // Always manually create the app_users record to ensure it works
                        // This is more reliable than depending on the trigger
                        const { data: newAppUser, error: insertError } = await supabase
                            .from('app_users')
                            .insert({
                                email: email.toLowerCase(),
                                role: 'customer',
                                full_name: fullName,
                                supabase_user_id: authData.user.id,
                                is_supabase_user: true
                            })
                            .select()
                            .single();
                        
                        if (insertError) {
                            console.error('Error creating app_users record:', insertError);
                            
                            // If it's a duplicate key error, try to fetch the existing record
                            if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                                console.log('User already exists in app_users, fetching existing record...');
                                
                                const { data: existingAppUser, error: fetchError } = await supabase
                                    .from('app_users')
                                    .select('*')
                                    .eq('email', email.toLowerCase())
                                    .single();
                                
                                if (fetchError) {
                                    throw fetchError;
                                }
                                
                                const appUser: AppUser = {
                                    id: existingAppUser.id,
                                    email: existingAppUser.email,
                                    role: existingAppUser.role as Role,
                                    fullName: existingAppUser.full_name
                                };
                                
                                resolve(appUser);
                                return;
                            }
                            
                            throw insertError;
                        }
                        
                        const appUser: AppUser = {
                            id: newAppUser.id,
                            email: newAppUser.email,
                            role: newAppUser.role as Role,
                            fullName: newAppUser.full_name
                        };
                        
                        resolve(appUser);
                    } else {
                        reject(new Error('Registration failed - no user data returned'));
                    }
                } catch (error) {
                    console.error('Registration error:', error);
                    reject(new Error('Registration failed: ' + (error as Error).message));
                }
            }, 500);
        });
    },
    
    async logout() {
        try {
            // Sign out from Supabase Auth (this will work for both authenticated and non-authenticated users)
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Supabase logout error:', error);
        } finally {
            // Always clear local storage
            localStorage.removeItem(SESSION_KEY);
        }
    },
    
    getCurrentUser(): AppUser | null {
        return getFromStorage<AppUser | null>(SESSION_KEY, null);
    },

    // --- Customer Profile Management ---
    async updateCustomerProfile(userId: string, updates: { fullName?: string }): Promise<AppUser> {
        try {
            const { data: updatedUser, error } = await supabase
                .from('app_users')
                .update({
                    full_name: updates.fullName
                })
                .eq('id', userId)
                .select()
                .single();
            
            if (error) throw error;
            
            const appUser: AppUser = {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role as Role,
                fullName: updatedUser.full_name
            };
            
            // Update the stored session
            saveToStorage(SESSION_KEY, appUser);
            
            return appUser;
        } catch (error) {
            console.error('Error updating customer profile:', error);
            throw new Error('Failed to update profile');
        }
    },

    async changeCustomerPassword(currentPassword: string, newPassword: string): Promise<void> {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
        } catch (error) {
            console.error('Error changing password:', error);
            throw new Error('Failed to change password');
        }
    },

    async resetPassword(email: string): Promise<void> {
        try {
            const redirectUrl = `${window.location.origin}/#type=recovery`;
            console.log('Sending password reset email to:', email);
            console.log('Redirect URL:', redirectUrl);
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });
            
            if (error) throw error;
            
            console.log('Password reset email sent successfully');
        } catch (error) {
            console.error('Error sending password reset:', error);
            throw new Error('Failed to send password reset email');
        }
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
                quote: req.quotes?.[0] || null,
                epr_timeline: req.epr_timeline || [],
                current_epr_status: req.current_epr_status || null
            })) || [];
        } catch (error) {
            console.error('Error fetching service requests:', error);
            return [];
        }
    },

    async getServiceRequestsForCustomer(customerId: string): Promise<ServiceRequest[]> {
        try {
            console.log('Fetching service requests for customer ID:', customerId);
            
            const { data: requests, error } = await supabase
                .from('service_requests')
                .select(`
                    *,
                    quotes (*)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Database error fetching customer service requests:', error);
                throw error;
            }
            
            console.log(`Found ${requests?.length || 0} service requests for customer ${customerId}`);
            
            const result = requests?.map(req => ({
                ...req,
                quote: req.quotes?.[0] || null,
                epr_timeline: req.epr_timeline || [],
                current_epr_status: req.current_epr_status || null
            })) || [];
            
            // Additional validation: ensure all returned requests belong to the customer
            const invalidRequests = result.filter(req => req.customer_id !== customerId);
            if (invalidRequests.length > 0) {
                console.error('SECURITY WARNING: Found requests that do not belong to customer:', invalidRequests);
                // Filter out any requests that don't match the customer ID
                return result.filter(req => req.customer_id === customerId);
            }
            
            return result;
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
                quote: request.quotes?.[0] || null,
                epr_timeline: request.epr_timeline || [],
                current_epr_status: request.current_epr_status || null
            } : undefined;
        } catch (error) {
            console.error('Error fetching service request:', error);
            return undefined;
        }
    },

    async uploadImages(files: File[], requestId: string): Promise<string[]> {
        try {
            console.log('Converting images to base64 for storage...');
            
            const convertToBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            resolve(reader.result);
                        } else {
                            reject(new Error('Failed to convert file to base64'));
                        }
                    };
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsDataURL(file);
                });
            };

            const base64Promises = files.map(async (file, index) => {
                try {
                    const base64 = await convertToBase64(file);
                    console.log(`Image ${index + 1} converted to base64 successfully`);
                    return base64;
                } catch (error) {
                    console.error(`Failed to convert image ${index + 1}:`, error);
                    throw error;
                }
            });
            
            const base64Images = await Promise.all(base64Promises);
            console.log('All images converted to base64 successfully');
            return base64Images;
        } catch (error) {
            console.error('Error converting images to base64:', error);
            throw new Error('Failed to process images');
        }
    },

    async addServiceRequest(requestData: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at' | 'status' | 'audit_log'>, userEmail: string, imageFiles?: File[]): Promise<ServiceRequest> {
        try {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const auditLog = [{ timestamp: new Date().toISOString(), user: userEmail, action: 'Request created' }];
            
            // Upload images if provided
            let imageUrls: string[] = [];
            if (imageFiles && imageFiles.length > 0) {
                imageUrls = await this.uploadImages(imageFiles, requestId);
            }
            
            const { data: newRequest, error } = await supabase
                .from('service_requests')
                .insert({
                    id: requestId,
                    ...requestData,
                    image_urls: imageUrls,
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
                { 
                    timestamp: new Date().toISOString(), 
                    user: userEmail, 
                    action: `Status changed to ${status}`,
                    type: 'status_change',
                    details: `Service request status updated from previous status to ${status}`,
                    metadata: {
                        new_status: status,
                        previous_status: 'Unknown', // We don't have previous status in this context
                        change_reason: 'Manual status update'
                    }
                }
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
                { 
                    timestamp: new Date().toISOString(), 
                    user: userEmail, 
                    action: `Quote generated for ${newQuote.currency === 'USD' ? '$' : '₹'}${newQuote.total_cost}`,
                    type: 'quote_generated',
                    details: `New repair quote created with ${newQuote.items.length} items`,
                    metadata: {
                        quote_id: newQuote.id,
                        total_cost: newQuote.total_cost,
                        currency: newQuote.currency,
                        item_count: newQuote.items.length,
                        items: newQuote.items
                    }
                }
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
                { 
                    timestamp: new Date().toISOString(), 
                    user: userEmail, 
                    action: `Quote ${isApproved ? 'Approved' : 'Declined'}`,
                    type: 'quote_decision',
                    details: `Customer ${isApproved ? 'approved' : 'declined'} the repair quote`,
                    metadata: {
                        decision: isApproved ? 'approved' : 'declined',
                        quote_id: 'Unknown', // We'll need to get this from the quote table
                        quote_amount: 0, // We'll need to get this from the quote table
                        currency: 'INR', // Default currency
                        decision_maker: userEmail
                    }
                }
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
    
    async getComplaints(): Promise<EnrichedComplaint[]> {
        try {
            const { data: complaintsList, error } = await supabase
                .from('complaints')
                .select(`
                    *,
                    service_requests!inner (
                        customer_name,
                        product_type,
                        serial_number,
                        status
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Enrich complaints with request details
            const enrichedComplaints = complaintsList?.map(comp => ({
                ...comp,
                customer_name: comp.service_requests?.customer_name || 'N/A',
                product_type: comp.service_requests?.product_type,
                serial_number: comp.service_requests?.serial_number || 'N/A',
                request_status: comp.service_requests?.status || 'N/A'
            })) || [];
            
            return enrichedComplaints;
        } catch (error) {
            console.error('Error fetching complaints:', error);
            return [];
        }
    },

    async updateComplaintStatus(complaintId: string, isResolved: boolean): Promise<void> {
        try {
            const { error } = await supabase
                .from('complaints')
                .update({ is_resolved: isResolved })
                .eq('id', complaintId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error updating complaint status:', error);
            throw new Error('Failed to update complaint status');
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
    },

    // --- EPR Team Methods ---
    async updateEPRStatus(
        requestId: string, 
        eprStatus: EPRStatus, 
        userEmail: string, 
        details?: string, 
        costEstimation?: number, 
        costEstimationCurrency?: 'INR' | 'USD',
        approvalDecision?: 'approved' | 'declined'
    ): Promise<ServiceRequest> {
        try {
            // Get current request to update timeline
            const { data: currentRequest, error: fetchError } = await supabase
                .from('service_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError) throw fetchError;

            // Create new EPR timeline entry
            const newTimelineEntry: EPRTimelineEntry = {
                timestamp: new Date().toISOString(),
                user: userEmail,
                action: `EPR Status Updated to: ${eprStatus}`,
                epr_status: eprStatus,
                details: details || '',
                cost_estimation: costEstimation,
                cost_estimation_currency: costEstimationCurrency,
                approval_decision: approvalDecision
            };

            // Get existing EPR timeline or create new one
            const existingTimeline = currentRequest.epr_timeline || [];
            const updatedTimeline = [...existingTimeline, newTimelineEntry];

            // Create audit log entry for EPR action
            const auditLogEntry = {
                timestamp: new Date().toISOString(),
                user: userEmail,
                action: `EPR Team: ${eprStatus}`,
                details: details || '',
                type: 'epr_action',
                epr_status: eprStatus,
                cost_estimation: costEstimation,
                cost_estimation_currency: costEstimationCurrency,
                approval_decision: approvalDecision,
                metadata: {
                    previous_epr_status: currentRequest.current_epr_status || 'Not Started',
                    new_epr_status: eprStatus,
                    epr_action_type: 'status_update',
                    ...(costEstimation && { cost_estimation: costEstimation, cost_estimation_currency: costEstimationCurrency }),
                    ...(approvalDecision && { approval_decision: approvalDecision })
                }
            };

            // Get existing audit log or create new one
            const existingAuditLog = currentRequest.audit_log || [];
            const updatedAuditLog = [...existingAuditLog, auditLogEntry];

            // Determine if we need to update the main status based on EPR status
            let mainStatusUpdate = {};
            if (eprStatus === EPRStatus.CostEstimationPreparation) {
                // Don't automatically update main status - let service team decide when to move to "Awaiting Approval"
                // mainStatusUpdate = { status: 'Awaiting Approval' };
            } else if (eprStatus === EPRStatus.Approved) {
                // When EPR approves, service team will handle the main status update
                // Don't update main status here - service team will do it after customer approves quote
            } else if (eprStatus === EPRStatus.Declined) {
                // When EPR declines, service team will handle the main status update
                // Don't update main status here - service team will do it after customer rejects quote
            } else if (eprStatus === EPRStatus.RepairCompleted) {
                mainStatusUpdate = { status: 'Quality Check' };
            }

            // Update the request with new EPR status and timeline
            const { data: updatedRequest, error: updateError } = await supabase
                .from('service_requests')
                .update({
                    current_epr_status: eprStatus,
                    epr_timeline: updatedTimeline,
                    audit_log: updatedAuditLog,
                    ...mainStatusUpdate,
                    updated_at: new Date().toISOString()
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
                quote: updatedRequest.quotes?.[0] || null,
                epr_timeline: updatedRequest.epr_timeline || [],
                current_epr_status: updatedRequest.current_epr_status || null
            };
        } catch (error) {
            console.error('Error updating EPR status:', error);
            throw new Error('Failed to update EPR status');
        }
    },

    async getServiceRequestsWithEPRStatus(): Promise<ServiceRequest[]> {
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
                quote: req.quotes?.[0] || null,
                epr_timeline: req.epr_timeline || [],
                current_epr_status: req.current_epr_status || null
            })) || [];
        } catch (error) {
            console.error('Error fetching service requests with EPR status:', error);
            return [];
        }
    },

    // New method for service team to update status to "Awaiting Approval" when ready to send quote
    async updateStatusToAwaitingApproval(
        requestId: string, 
        userEmail: string
    ): Promise<ServiceRequest> {
        try {
            // Get current request
            const { data: currentRequest, error: fetchError } = await supabase
                .from('service_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError) throw fetchError;

            // Create new EPR timeline entry
            const newTimelineEntry: EPRTimelineEntry = {
                timestamp: new Date().toISOString(),
                user: userEmail,
                action: 'Service Team: Status updated to Awaiting Approval',
                epr_status: EPRStatus.AwaitingApproval,
                details: 'Service team has generated quote and is awaiting customer approval.'
            };

            // Get existing EPR timeline or create new one
            const existingTimeline = currentRequest.epr_timeline || [];
            const updatedTimeline = [...existingTimeline, newTimelineEntry];

            // Create audit log entry for service team action
            const auditLogEntry = {
                timestamp: new Date().toISOString(),
                user: userEmail,
                action: 'Service Team: Status updated to Awaiting Approval',
                details: 'Service team has generated quote and is awaiting customer approval.',
                type: 'service_action',
                epr_status: 'Awaiting Approval'
            };

            // Get existing audit log or create new one
            const existingAuditLog = currentRequest.audit_log || [];
            const updatedAuditLog = [...existingAuditLog, auditLogEntry];

            // Update the request
            const { data: updatedRequest, error: updateError } = await supabase
                .from('service_requests')
                .update({
                    status: 'Awaiting Approval',
                    current_epr_status: 'Awaiting Approval',
                    epr_timeline: updatedTimeline,
                    audit_log: updatedAuditLog,
                    updated_at: new Date().toISOString()
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
                quote: updatedRequest.quotes?.[0] || null,
                epr_timeline: updatedRequest.epr_timeline || [],
                current_epr_status: updatedRequest.current_epr_status || null
            };
        } catch (error) {
            console.error('Error updating status to awaiting approval:', error);
            throw new Error('Failed to update status to awaiting approval');
        }
    },

    // New method for service team to update status after customer quote decision
    async updateStatusAfterQuoteDecision(
        requestId: string, 
        isApproved: boolean, 
        userEmail: string
    ): Promise<ServiceRequest> {
        try {
            // Get current request to check EPR status
            const { data: currentRequest, error: fetchError } = await supabase
                .from('service_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError) throw fetchError;

            let newStatus: string;
            let eprStatusUpdate: string | null = null;

            if (isApproved) {
                // Customer approved quote
                newStatus = 'Repair in Progress';
                eprStatusUpdate = 'Approved';
            } else {
                // Customer rejected quote
                newStatus = 'Cancelled';
                eprStatusUpdate = 'Declined';
            }

            // Create new EPR timeline entry
            const newTimelineEntry: EPRTimelineEntry = {
                timestamp: new Date().toISOString(),
                user: userEmail,
                action: `Service Team: Customer ${isApproved ? 'approved' : 'rejected'} quote`,
                epr_status: eprStatusUpdate as EPRStatus,
                details: `Customer ${isApproved ? 'approved' : 'rejected'} the quote. Status updated to ${newStatus}.`
            };

            // Get existing EPR timeline or create new one
            const existingTimeline = currentRequest.epr_timeline || [];
            const updatedTimeline = [...existingTimeline, newTimelineEntry];

            // Create audit log entry for customer decision
            const auditLogEntry = {
                timestamp: new Date().toISOString(),
                user: userEmail,
                action: `Customer: Quote ${isApproved ? 'Approved' : 'Rejected'}`,
                details: `Customer ${isApproved ? 'approved' : 'rejected'} the quote. Status updated to ${newStatus}.`,
                type: 'customer_action',
                epr_status: eprStatusUpdate,
                quote_decision: isApproved ? 'approved' : 'rejected'
            };

            // Get existing audit log or create new one
            const existingAuditLog = currentRequest.audit_log || [];
            const updatedAuditLog = [...existingAuditLog, auditLogEntry];

            // Update the request
            const { data: updatedRequest, error: updateError } = await supabase
                .from('service_requests')
                .update({
                    status: newStatus,
                    current_epr_status: eprStatusUpdate,
                    epr_timeline: updatedTimeline,
                    audit_log: updatedAuditLog,
                    updated_at: new Date().toISOString()
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
                quote: updatedRequest.quotes?.[0] || null,
                epr_timeline: updatedRequest.epr_timeline || [],
                current_epr_status: updatedRequest.current_epr_status || null
            };
        } catch (error) {
            console.error('Error updating status after quote decision:', error);
            throw new Error('Failed to update status after quote decision');
        }
    },

    // --- Payment Methods ---
    async createPaymentOrder(requestId: string, quoteId: string, userEmail: string): Promise<any> {
        try {
            // Get the service request and quote details
            const { data: request, error: requestError } = await supabase
                .from('service_requests')
                .select(`
                    *,
                    quotes (*)
                `)
                .eq('id', requestId)
                .single();

            if (requestError) throw requestError;

            const quote = request.quotes?.[0];
            if (!quote) {
                throw new Error('Quote not found');
            }

            // Create Razorpay order
            const receipt = `receipt_${requestId}_${Date.now()}`;
            const razorpayOrder = await createPaymentOrder({
                amount: quote.total_cost,
                currency: quote.currency || 'INR',
                receipt: receipt,
                notes: {
                    service_request_id: requestId,
                    customer_name: request.customer_name,
                    quote_id: quoteId
                }
            });

            // Create payment record in database
            const { data: payment, error: paymentError } = await supabase
                .rpc('create_payment_record', {
                    p_service_request_id: requestId,
                    p_quote_id: quoteId,
                    p_razorpay_order_id: razorpayOrder.id,
                    p_amount: quote.total_cost,
                    p_customer_name: request.customer_name,
                    p_receipt: receipt,
                    p_currency: quote.currency || 'INR',
                    p_customer_email: request.customer_id, // Assuming customer_id is email
                    p_customer_phone: null
                });

            if (paymentError) throw paymentError;

            return razorpayOrder;
        } catch (error) {
            console.error('Error creating payment order:', error);
            throw new Error('Failed to create payment order');
        }
    },

    async verifyPayment(orderId: string, paymentId: string, signature: string, requestId: string, quoteId: string): Promise<boolean> {
        try {
            // Verify payment signature with Razorpay
            const isValidSignature = verifyPaymentSignature(orderId, paymentId, signature);
            
            if (!isValidSignature) {
                throw new Error('Invalid payment signature');
            }

            // Get payment details from Razorpay
            const paymentDetails = await getPaymentDetails(paymentId);
            
            // Update payment status in database
            const { error: updateError } = await supabase
                .rpc('update_payment_status', {
                    p_razorpay_payment_id: paymentId,
                    p_status: 'captured',
                    p_payment_method: paymentDetails.method || 'card',
                    p_razorpay_response: {
                        order_id: orderId,
                        payment_id: paymentId,
                        signature: signature,
                        status: paymentDetails.status,
                        method: paymentDetails.method,
                        amount: paymentDetails.amount,
                        currency: paymentDetails.currency,
                        captured: paymentDetails.captured
                    }
                });

            if (updateError) throw updateError;

            return true;
        } catch (error) {
            console.error('Error verifying payment:', error);
            throw new Error('Failed to verify payment');
        }
    },

    async getPaymentDetails(paymentId: string): Promise<any> {
        try {
            const { data: payment, error } = await supabase
                .from('payments')
                .select('*')
                .eq('razorpay_payment_id', paymentId)
                .single();

            if (error) throw error;
            return payment;
        } catch (error) {
            console.error('Error fetching payment details:', error);
            throw new Error('Failed to fetch payment details');
        }
    },

    async processRefund(paymentId: string, refundAmount?: number, reason?: string): Promise<boolean> {
        try {
            // Process refund through Razorpay
            const refundResult = await refundPayment(paymentId, refundAmount, reason);
            
            // Update database with refund information
            const { error } = await supabase
                .rpc('process_payment_refund', {
                    p_razorpay_payment_id: paymentId,
                    p_refund_amount: refundAmount,
                    p_refund_reason: reason || 'Customer request'
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error processing refund:', error);
            throw new Error('Failed to process refund');
        }
    }
};