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
                            'partner@test.com': 'partner123'
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
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            
            if (error) throw error;
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