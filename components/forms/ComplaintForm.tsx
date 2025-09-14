import React, { useState } from 'react';
import { AppUser, ServiceRequest } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';

interface ComplaintFormProps {
  user: AppUser;
  requests: ServiceRequest[];
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

const ComplaintForm: React.FC<ComplaintFormProps> = ({ user, requests, onCancel, onSubmitSuccess }) => {
  const [selectedRequest, setSelectedRequest] = useState<string>(requests[0]?.id || '');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !details) {
      setError('Please select a service request and provide details about your complaint.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.addComplaint({
        customer_id: user.id,
        customer_name: user.fullName || user.email,
        request_id: selectedRequest,
        complaint_details: details,
      });
      alert('Your complaint has been submitted. Our team will look into it shortly.');
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Submit a Complaint</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="serviceRequest" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Related Service Request
          </label>
          {requests.length > 0 ? (
            <select
              id="serviceRequest"
              value={selectedRequest}
              onChange={e => setSelectedRequest(e.target.value)}
              required
              className="mt-1 w-full input-field"
            >
              <option value="" disabled>Select a request...</option>
              {requests.map(req => (
                <option key={req.id} value={req.id}>
                  {req.product_type} (S/N: {req.serial_number}) - ID: ...{req.id.slice(-8)}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-gray-500">You have no service requests to file a complaint against.</p>
          )}
        </div>

        <div>
          <label htmlFor="complaintDetails" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Complaint Details
          </label>
          <textarea
            id="complaintDetails"
            rows={5}
            value={details}
            onChange={e => setDetails(e.target.value)}
            required
            className="mt-1 w-full input-field"
            placeholder="Please describe the issue in detail..."
          ></textarea>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button type="submit" disabled={loading || requests.length === 0} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed flex items-center">
            {loading && <Spinner small={true} />}
            <span className="ml-2">Submit Complaint</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ComplaintForm;