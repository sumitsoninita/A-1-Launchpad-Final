import React, { useState } from 'react';
import { BulkServiceRequest, EPRStatus, AppUser } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';

interface BulkEPRTimelineProps {
  request: BulkServiceRequest;
  user: AppUser;
  onStatusUpdate: (requestId: string, eprStatus: EPRStatus, details?: string, costEstimation?: number, approvalDecision?: 'approved' | 'declined') => Promise<void>;
  onBack: () => void;
}

const BulkEPRTimeline: React.FC<BulkEPRTimelineProps> = ({ request, user, onStatusUpdate, onBack }) => {
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

    if (newStatus === EPRStatus.CostEstimationPreparation && costEstimation <= 0) {
      setError('Please provide a valid cost estimation amount.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update the bulk request with combined cost estimation
      await api.updateBulkServiceRequestEPRStatus(
        request.id,
        newStatus,
        costEstimation,
        costEstimationCurrency,
        details,
        user.email
      );
      
      // For EPR team, focus on cost estimation - don't update overall request status
      // The service team will handle the overall request status based on EPR estimation
      
      setShowUpdateForm(false);
      setDetails('');
      setCostEstimation(0);
      setCostEstimationCurrency('INR');
      setApprovalDecision('approved');
      
      // Show success message
      alert('EPR cost estimation updated successfully! Service team will be notified.');
      
      // Refresh the request data to show the updated cost estimation
      onStatusUpdate(request.id, newStatus, details, costEstimation, approvalDecision);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canUpdateStatus = (status: EPRStatus) => {
    // For bulk requests, we now work with a single combined cost estimation
    // Check if the bulk request has any EPR status set
    const currentStatus = request.epr_status;
    
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

  const getOverallEPRStatus = () => {
    // For bulk requests, we now use a single EPR status for the entire request
    return request.epr_status || null;
  };

  const overallStatus = getOverallEPRStatus();

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Bulk EPR Timeline</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Request ID: {request.id} | Requester: {request.requester_name}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
        >
          Back
        </button>
      </div>

      {/* Workflow Information */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">EPR Workflow</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Your Role:</strong> Provide a single combined cost estimation for the entire bulk request. The service team will use your estimation to generate a quote for the channel partner/system integrator.
        </p>
        <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
          <strong>Flow:</strong> EPR Combined Cost Estimation → Service Team Quote Generation → Channel Partner Approval → Payment → Repair
        </div>
      </div>

      {/* Overall Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Overall EPR Status</h3>
        {overallStatus ? (
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getEPRStatusColor(overallStatus)}`}>
            {overallStatus.replace(/([A-Z])/g, ' $1').trim()}
          </span>
        ) : (
          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
            Not Started
          </span>
        )}
        
        {/* Show Current Cost Estimation */}
        {request.epr_cost_estimation && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Your Cost Estimation</h4>
            <p className="text-lg font-semibold text-green-800 dark:text-green-200">
              {request.epr_cost_estimation_currency === 'USD' ? '$' : '₹'}{request.epr_cost_estimation}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              This estimation has been provided to the service team for quote generation.
            </p>
          </div>
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
                      Cost Estimation: {entry.cost_estimation_currency === 'USD' ? '$' : '₹'}{entry.cost_estimation}
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

      {/* Equipment Items Overview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Equipment Items Overview</h3>
        <div className="space-y-3">
          {request.equipment_items.map((item, index) => (
            <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-white">
                    {item.equipment_type} {item.equipment_model && `(${item.equipment_model})`}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quantity: {item.quantity} | Serial: {item.serial_number || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Issue: {item.issue_description}
                  </p>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    item.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                    item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {item.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {request.epr_cost_estimation && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Combined Cost Estimation</h4>
            <p className="text-lg font-semibold text-green-800 dark:text-green-200">
              {request.epr_cost_estimation_currency === 'USD' ? '$' : '₹'}{request.epr_cost_estimation}
            </p>
          </div>
        )}
      </div>

      {/* Update Form */}
      {!showUpdateForm ? (
        <button
          onClick={() => setShowUpdateForm(true)}
          className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors font-medium"
        >
          Update EPR Status
        </button>
      ) : (
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                EPR Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as EPRStatus)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {Object.values(EPRStatus).map((status) => (
                  <option key={status} value={status} disabled={!canUpdateStatus(status)}>
                    {status.replace(/([A-Z])/g, ' $1').trim()}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={costEstimationCurrency}
                onChange={(e) => setCostEstimationCurrency(e.target.value as 'INR' | 'USD')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Combined Cost Estimation
            </label>
            <input
              type="number"
              value={costEstimation}
              onChange={(e) => setCostEstimation(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
              step="0.01"
              placeholder="Enter total cost estimation for all equipment items"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Provide a single combined cost estimation for all {request.total_equipment_count} equipment items
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={4}
              placeholder="Provide details about the EPR status update and cost estimation breakdown..."
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white rounded-md transition-colors font-medium"
            >
              {loading ? <Spinner /> : 'Update Status'}
            </button>
            <button
              type="button"
              onClick={() => setShowUpdateForm(false)}
              className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BulkEPRTimeline;
