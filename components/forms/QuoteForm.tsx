import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Spinner from '../shared/Spinner';
import { api } from '../../services/api';
import { Quote } from '../../types';

interface QuoteFormProps {
  requestId: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ requestId, onClose, onSubmitSuccess }) => {
  const [items, setItems] = useState([{ description: '', cost: 0, currency: 'INR' as 'INR' | 'USD' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleItemChange = (index: number, field: 'description' | 'cost' | 'currency', value: string) => {
    const newItems = [...items];
    if (field === 'cost') {
      newItems[index][field] = parseFloat(value) || 0;
    } else if (field === 'currency') {
      newItems[index][field] = value as 'INR' | 'USD';
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', cost: 0, currency: 'INR' as 'INR' | 'USD' }]);
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
    
    const currentUser = api.getCurrentUser();
    if (!currentUser) {
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

    try {
        await api.addQuoteToRequest(requestId, quoteData, currentUser.email);
        onSubmitSuccess();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal title="Generate Repair Quote" onClose={onClose}>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                <input
                    type="text"
                    placeholder="Item Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                    className="mt-1 w-1/2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="relative w-1/4">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                        {item.currency === 'USD' ? '$' : '₹'}
                    </span>
                    <input
                        type="number"
                        placeholder="Cost"
                        value={item.cost === 0 ? '' : item.cost}
                        onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                        required
                        min="0.01"
                        step="0.01"
                        className="mt-1 w-full pl-7 pr-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                <select
                    value={item.currency}
                    onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                    className="mt-1 w-1/6 px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                </select>
                <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-full mt-1"
                    aria-label="Remove item"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                </button>
                </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            + Add Another Item
          </button>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between font-bold text-lg text-gray-800 dark:text-gray-100">
                <span>Total Cost:</span>
                <span>{items[0]?.currency === 'USD' ? '$' : '₹'}{totalCost.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500">Cancel</button>
            <button type="submit" disabled={loading || totalCost <= 0} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed">
              {loading ? <Spinner small /> : 'Submit Quote'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default QuoteForm;
