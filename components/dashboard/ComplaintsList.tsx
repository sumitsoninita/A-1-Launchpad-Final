import React, { useState } from 'react';
import { EnrichedComplaint } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';

interface ComplaintsListProps {
  complaints: EnrichedComplaint[];
  onComplaintUpdate?: () => void;
}

const ComplaintsList: React.FC<ComplaintsListProps> = ({ complaints, onComplaintUpdate }) => {
  const [resolvingComplaint, setResolvingComplaint] = useState<string | null>(null);

  const handleResolveComplaint = async (complaintId: string) => {
    setResolvingComplaint(complaintId);
    try {
      await api.updateComplaintStatus(complaintId, true);
      if (onComplaintUpdate) {
        onComplaintUpdate();
      }
    } catch (error) {
      console.error('Error resolving complaint:', error);
      alert('Failed to resolve complaint. Please try again.');
    } finally {
      setResolvingComplaint(null);
    }
  };
  if (complaints.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No complaints found</h3>
        <p className="text-gray-500 dark:text-gray-400">All customer complaints have been resolved or no complaints have been submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {complaints.map((complaint) => (
        <div key={complaint.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  complaint.is_resolved 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {complaint.is_resolved ? 'Resolved' : 'Pending'}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(complaint.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Complaint #{complaint.id.slice(-8)}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{complaint.customer_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Request ID</dt>
                  <dd className="text-sm text-gray-900 dark:text-white font-mono">...{complaint.request_id.slice(-8)}</dd>
                </div>
                {complaint.product_type && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Product Type</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{complaint.product_type}</dd>
                  </div>
                )}
                {complaint.serial_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-mono">{complaint.serial_number}</dd>
                  </div>
                )}
                {complaint.request_status && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Request Status</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{complaint.request_status}</dd>
                  </div>
                )}
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Complaint Details</dt>
                <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  {complaint.complaint_details}
                </dd>
              </div>

              {!complaint.is_resolved && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => handleResolveComplaint(complaint.id)}
                    disabled={resolvingComplaint === complaint.id}
                    className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {resolvingComplaint === complaint.id ? (
                      <>
                        <Spinner small={true} />
                        <span className="ml-2">Resolving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark as Resolved
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComplaintsList;
