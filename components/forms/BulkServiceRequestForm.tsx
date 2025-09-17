import React, { useState } from 'react';
import { BulkEquipmentItem, Role } from '../../types';

interface BulkServiceRequestFormProps {
  userRole: Role;
  onSubmit: (requestData: {
    requester_name: string;
    company_name?: string;
    contact_phone?: string;
    contact_email?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    equipment_items: Omit<BulkEquipmentItem, 'id' | 'bulk_request_id' | 'created_at' | 'updated_at'>[];
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const BulkServiceRequestForm: React.FC<BulkServiceRequestFormProps> = ({
  userRole,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    requester_name: '',
    company_name: '',
    contact_phone: '',
    contact_email: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  const [equipmentItems, setEquipmentItems] = useState<Omit<BulkEquipmentItem, 'id' | 'bulk_request_id' | 'created_at' | 'updated_at'>[]>([
    {
      equipment_type: '',
      equipment_model: '',
      serial_number: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      issue_description: '',
      issue_category: 'other',
      severity: 'medium',
      item_status: 'pending'
    }
  ]);

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.requester_name.trim()) {
      newErrors.requester_name = 'Requester name is required';
    }

    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = 'Contact phone is required';
    }

    if (!formData.contact_email.trim()) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address';
    }

    // Validate equipment items
    equipmentItems.forEach((item, index) => {
      if (!item.equipment_type.trim()) {
        newErrors[`equipment_type_${index}`] = 'Equipment type is required';
      }
      if (!item.issue_description.trim()) {
        newErrors[`issue_description_${index}`] = 'Issue description is required';
      }
      if (item.quantity <= 0) {
        newErrors[`quantity_${index}`] = 'Quantity must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEquipmentItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...equipmentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate total price if unit_price or quantity changes
    if (field === 'unit_price' || field === 'quantity') {
      const unitPrice = field === 'unit_price' ? value : updatedItems[index].unit_price || 0;
      const quantity = field === 'quantity' ? value : updatedItems[index].quantity;
      updatedItems[index].total_price = unitPrice * quantity;
    }
    
    setEquipmentItems(updatedItems);
    
    // Clear error for this field
    const errorKey = `${field}_${index}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const addEquipmentItem = () => {
    setEquipmentItems(prev => [...prev, {
      equipment_type: '',
      equipment_model: '',
      serial_number: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      issue_description: '',
      issue_category: 'other',
      severity: 'medium',
      item_status: 'pending'
    }]);
  };

  const removeEquipmentItem = (index: number) => {
    if (equipmentItems.length > 1) {
      setEquipmentItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        equipment_items: equipmentItems
      });
    }
  };

  const getRoleDisplayName = () => {
    switch (userRole) {
      case Role.ChannelPartner:
        return 'Channel Partner';
      case Role.SystemIntegrator:
        return 'System Integrator';
      default:
        return 'Bulk Service Request';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {getRoleDisplayName()} Service Request
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
            Submit a bulk service request for multiple equipment items. Each item will be processed individually by our service and EPR teams.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Requester Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Requester Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requester Name *
                </label>
                <input
                  type="text"
                  value={formData.requester_name}
                  onChange={(e) => handleInputChange('requester_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.requester_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Enter requester name"
                />
                {errors.requester_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.requester_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.contact_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Enter contact phone"
                />
                {errors.contact_phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact_phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.contact_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Enter contact email"
                />
                {errors.contact_email && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Equipment Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Equipment Items</h3>
              <button
                type="button"
                onClick={addEquipmentItem}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                Add Equipment
              </button>
            </div>

            {equipmentItems.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Equipment Item #{index + 1}
                  </h4>
                  {equipmentItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEquipmentItem(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Equipment Type *
                    </label>
                    <input
                      type="text"
                      value={item.equipment_type}
                      onChange={(e) => handleEquipmentItemChange(index, 'equipment_type', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors[`equipment_type_${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="e.g., Fence Controller, Gate Motor"
                    />
                    {errors[`equipment_type_${index}`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`equipment_type_${index}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={item.equipment_model}
                      onChange={(e) => handleEquipmentItemChange(index, 'equipment_model', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter model number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={item.serial_number}
                      onChange={(e) => handleEquipmentItemChange(index, 'serial_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter serial number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleEquipmentItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors[`quantity_${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white`}
                    />
                    {errors[`quantity_${index}`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`quantity_${index}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleEquipmentItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Price (₹)
                    </label>
                    <input
                      type="number"
                      value={item.total_price}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issue Category
                    </label>
                    <select
                      value={item.issue_category}
                      onChange={(e) => handleEquipmentItemChange(index, 'issue_category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="hardware">Hardware</option>
                      <option value="software">Software</option>
                      <option value="installation">Installation</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="warranty">Warranty</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Severity
                    </label>
                    <select
                      value={item.severity}
                      onChange={(e) => handleEquipmentItemChange(index, 'severity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Issue Description *
                  </label>
                  <textarea
                    value={item.issue_description}
                    onChange={(e) => handleEquipmentItemChange(index, 'issue_description', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors[`issue_description_${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white`}
                    placeholder="Describe the issue with this equipment item"
                  />
                  {errors[`issue_description_${index}`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`issue_description_${index}`]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Request Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-300">Total Equipment Items:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{equipmentItems.length}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Total Quantity:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {equipmentItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Estimated Total Value:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  ₹{equipmentItems.reduce((sum, item) => sum + (item.total_price || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Bulk Request'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkServiceRequestForm;
