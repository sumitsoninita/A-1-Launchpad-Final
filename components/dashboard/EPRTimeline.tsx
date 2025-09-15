import React, { useState } from 'react';
import { ServiceRequest, EPRStatus, AppUser } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';

interface EPRTimelineProps {
  request: ServiceRequest;
  user: AppUser;
  onStatusUpdate: (requestId: string, eprStatus: EPRStatus, details?: string, costEstimation?: number, approvalDecision?: 'approved' | 'declined') => Promise<void>;
  onBack: () => void;
}

const EPRTimeline: React.FC<EPRTimelineProps> = ({ request, user, onStatusUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newStatus, setNewStatus] = useState<EPRStatus>(EPRStatus.CostEstimationPreparation);
  const [details, setDetails] = useState('');
  const [costEstimation, setCostEstimation] = useState<number>(0);
  const [costEstimationCurrency, setCostEstimationCurrency] = useState<'INR' | 'USD'>('INR');
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'declined'>('approved');

  const getEPRStatusColor = (status: EPRStatus) => {
    switch (status) {
      case EPRStatus.CostEstimationPreparation:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case EPRStatus.AwaitingApproval:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case EPRStatus.Approved:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case EPRStatus.Declined:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case EPRStatus.RepairInProgress:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case EPRStatus.RepairCompleted:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case EPRStatus.ReturnToCustomer:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setError('Please provide details for the status update.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onStatusUpdate(request.id, newStatus, details, costEstimation, costEstimationCurrency, approvalDecision);
      setShowUpdateForm(false);
      setDetails('');
      setCostEstimation(0);
      setCostEstimationCurrency('INR');
      setApprovalDecision('approved');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canUpdateStatus = (status: EPRStatus) => {
    const currentStatus = request.current_epr_status;
    
    // Define the workflow progression
    const workflow = [
      EPRStatus.CostEstimationPreparation,
      EPRStatus.AwaitingApproval,
      EPRStatus.Approved,
      EPRStatus.Declined,
      EPRStatus.RepairInProgress,
      EPRStatus.RepairCompleted,
      EPRStatus.ReturnToCustomer
    ];

    if (!currentStatus) {
      return status === EPRStatus.CostEstimationPreparation;
    }

    const currentIndex = workflow.indexOf(currentStatus);
    const targetIndex = workflow.indexOf(status);

    // Can only move forward in the workflow or stay at current status
    return targetIndex >= currentIndex;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">EPR Timeline</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Request ID: {request.id} | Serial: {request.serial_number}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
        >
          Back to Complaints
        </button>
      </div>

      {/* Current Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Current EPR Status</h3>
        {request.current_epr_status ? (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEPRStatusColor(request.current_epr_status)}`}>
            {request.current_epr_status}
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300">
            Not Started
          </span>
        )}
      </div>

      {/* EPR Timeline */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">EPR Timeline</h3>
        {request.epr_timeline && request.epr_timeline.length > 0 ? (
          <div className="space-y-4">
            {request.epr_timeline.map((entry, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${getEPRStatusColor(entry.epr_status)}`}></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-white">
                      {entry.action}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {entry.details}
                  </p>
                  {entry.cost_estimation && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Cost Estimation: ₹{entry.cost_estimation}
                    </p>
                  )}
                  {entry.approval_decision && (
                    <p className={`text-sm mt-1 ${entry.approval_decision === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Decision: {entry.approval_decision.charAt(0).toUpperCase() + entry.approval_decision.slice(1)}
                    </p>
                  )}
                  <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getEPRStatusColor(entry.epr_status)}`}>
                    {entry.epr_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No EPR timeline entries yet.</p>
            <p className="text-sm mt-1">Start by updating the EPR status below.</p>
          </div>
        )}
      </div>

      {/* Update Status Form */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Update EPR Status</h3>
          <button
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            {showUpdateForm ? 'Cancel' : 'Update Status'}
          </button>
        </div>

        {showUpdateForm && (
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                EPR Status
              </label>
              <select
                id="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as EPRStatus)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.values(EPRStatus).map(status => (
                  <option key={status} value={status} disabled={!canUpdateStatus(status)}>
                    {status} {!canUpdateStatus(status) ? '(Not Available)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Details *
              </label>
              <textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Provide details about this status update..."
                required
              />
            </div>

            {newStatus === EPRStatus.CostEstimationPreparation && (
              <div>
                <label htmlFor="costEstimation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cost Estimation
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    id="costEstimation"
                    value={costEstimation}
                    onChange={(e) => setCostEstimation(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter amount"
                  />
                  <select
                    value={costEstimationCurrency}
                    onChange={(e) => setCostEstimationCurrency(e.target.value as 'INR' | 'USD')}
                    className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
              </div>
            )}

            {(newStatus === EPRStatus.Approved || newStatus === EPRStatus.Declined) && (
              <div>
                <label htmlFor="approvalDecision" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Approval Decision
                </label>
                <select
                  id="approvalDecision"
                  value={approvalDecision}
                  onChange={(e) => setApprovalDecision(e.target.value as 'approved' | 'declined')}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowUpdateForm(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white rounded-md transition-colors"
              >
                {loading ? <Spinner /> : 'Update Status'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EPRTimeline;
