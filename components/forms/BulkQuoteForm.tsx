import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Spinner from '../shared/Spinner';
import { api } from '../../services/api';
import { Quote, BulkServiceRequest } from '../../types';

interface BulkQuoteFormProps {
  requestId: string;
  user: any;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const BulkQuoteForm: React.FC<BulkQuoteFormProps> = ({ requestId, user, onClose, onSubmitSuccess }) => {
  const [request, setRequest] = useState<BulkServiceRequest | null>(null);
  const [items, setItems] = useState([{ description: '', cost: 0, currency: 'INR' as 'INR' | 'USD' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch request to get EPR currency
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const requestData = await api.getBulkServiceRequestById(requestId);
        if (requestData) {
          setRequest(requestData);
          // Set currency based on EPR cost estimation currency from equipment items
          const eprCurrency = requestData.equipment_items.find(item => item.epr_cost_estimation_currency)?.epr_cost_estimation_currency || 'INR';
          console.log('BulkQuoteForm: EPR currency from request:', eprCurrency);
          console.log('BulkQuoteForm: Using currency:', eprCurrency);
          setItems([{ description: '', cost: 0, currency: eprCurrency }]);
        }
      } catch (error) {
        console.error('Error fetching bulk request:', error);
      }
    };
    fetchRequest();
  }, [requestId]);

  const handleItemChange = (index: number, field: 'description' | 'cost' | 'currency', value: string) => {
    const newItems = [...items];
    if (field === 'cost') {
      newItems[index][field] = parseFloat(value) || 0;
    } else if (field === 'currency') {
      // Don't allow currency change - use EPR currency for all items
      return;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => {
    const eprCurrency = request?.equipment_items.find(item => item.epr_cost_estimation_currency)?.epr_cost_estimation_currency || 'INR';
    setItems([...items, { description: '', cost: 0, currency: eprCurrency }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const totalCost = items.reduce((acc, item) => acc + item.cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(item => !item.description || item.cost <= 0)) {
        setError("Please ensure all items have a description and a cost greater than zero.");
        return;
    }
    setLoading(true);
    setError(null);
    
    if (!user) {
        setError("You must be logged in to perform this action.");
        setLoading(false);
        return;
    }

    const quoteData: Omit<Quote, 'id' | 'created_at' | 'is_approved'> = {
        items: items,
        total_cost: totalCost,
        currency: items[0]?.currency || 'INR',
        payment_qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PaymentFor${requestId}Amount${totalCost}`
    };

    console.log('BulkQuoteForm: Submitting quote with currency:', quoteData.currency);
    console.log('BulkQuoteForm: Quote data:', quoteData);

    try {
        await api.addQuoteToBulkRequest(requestId, quoteData, user.email);
        onSubmitSuccess();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Generate Quote for Bulk Request">
      <div className="space-y-6">
        {request && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Bulk Request Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Requester:</strong> {request.requester_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Equipment Count:</strong> {request.total_equipment_count}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Priority:</strong> {request.priority}
              </p>
            </div>

            {/* EPR Cost Estimations */}
            {request.equipment_items.some(item => item.epr_cost_estimation) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">EPR Cost Estimations</h3>
                <div className="space-y-2">
                  {request.equipment_items
                    .filter(item => item.epr_cost_estimation)
                    .map((item, index) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-blue-800 dark:text-blue-200">
                          {item.equipment_type} {item.equipment_model && `(${item.equipment_model})`}
                        </span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {item.epr_cost_estimation_currency === 'USD' ? '$' : '₹'}{item.epr_cost_estimation}
                        </span>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  Generate quote based on these EPR cost estimations
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quote Items
            </label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 mb-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="Item description"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    value={item.cost}
                    onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                    placeholder="Cost"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="w-20">
                  <select
                    value={item.currency}
                    onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled
                  >
                    <option value="INR">₹</option>
                    <option value="USD">$</option>
                  </select>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Add Item
            </button>
          </div>

          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800 dark:text-white">Total Cost:</span>
              <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {items[0]?.currency === 'USD' ? '$' : '₹'}{totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white rounded-md transition-colors font-medium"
            >
              {loading ? <Spinner /> : 'Generate Quote'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default BulkQuoteForm;
