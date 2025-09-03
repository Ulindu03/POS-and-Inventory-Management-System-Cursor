import React, { useState, useEffect } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Supplier, updateSupplierPerformance } from '@/lib/api/suppliers.api';

interface PerformanceModalProps {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (supplier: Supplier) => void;
}

const PerformanceModal: React.FC<PerformanceModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    onTimeDelivery: supplier.performance.onTimeDelivery,
    qualityRating: supplier.performance.qualityRating,
    priceCompetitiveness: supplier.performance.priceCompetitiveness,
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && supplier) {
      setFormData({
        onTimeDelivery: supplier.performance.onTimeDelivery,
        qualityRating: supplier.performance.qualityRating,
        priceCompetitiveness: supplier.performance.priceCompetitiveness,
        notes: ''
      });
      setErrors({});
    }
  }, [isOpen, supplier]);

  const handleInputChange = (field: string, value: number | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.onTimeDelivery < 0 || formData.onTimeDelivery > 100) {
      newErrors.onTimeDelivery = 'On-time delivery must be between 0 and 100';
    }

    if (formData.qualityRating < 0 || formData.qualityRating > 100) {
      newErrors.qualityRating = 'Quality rating must be between 0 and 100';
    }

    if (formData.priceCompetitiveness < 0 || formData.priceCompetitiveness > 100) {
      newErrors.priceCompetitiveness = 'Price competitiveness must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedSupplier = await updateSupplierPerformance(supplier._id, {
        onTimeDelivery: formData.onTimeDelivery,
        qualityRating: formData.qualityRating,
        priceCompetitiveness: formData.priceCompetitiveness,
      });
      
      onUpdate(updatedSupplier.data);
      onClose();
    } catch (error) {
      console.error('Error updating supplier performance:', error);
      setErrors({ submit: 'Failed to update performance metrics' });
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-4 h-4" />;
    if (score >= 70) return <AlertTriangle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Update Performance</h2>
              <p className="text-sm text-gray-600">{supplier.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Performance Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">On-Time Delivery</span>
                <div className={`flex items-center space-x-1 ${getPerformanceColor(supplier.performance.onTimeDelivery)}`}>
                  {getPerformanceIcon(supplier.performance.onTimeDelivery)}
                  <span className="text-sm font-medium">{supplier.performance.onTimeDelivery}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Quality Rating</span>
                <div className={`flex items-center space-x-1 ${getPerformanceColor(supplier.performance.qualityRating)}`}>
                  {getPerformanceIcon(supplier.performance.qualityRating)}
                  <span className="text-sm font-medium">{supplier.performance.qualityRating}%</span>
                </div>
              </div>
              
            </div>
          </div>

          {/* New Performance Inputs */}
          <div className="space-y-4">
            <div>
              <label htmlFor="perf-onTimeDelivery" className="block text-sm font-medium text-gray-700 mb-2">
                On-Time Delivery (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                id="perf-onTimeDelivery"
                value={formData.onTimeDelivery}
                onChange={(e) => handleInputChange('onTimeDelivery', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.onTimeDelivery ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter percentage (0-100)"
              />
              {errors.onTimeDelivery && (
                <p className="mt-1 text-sm text-red-600">{errors.onTimeDelivery}</p>
              )}
            </div>

            <div>
              <label htmlFor="perf-qualityRating" className="block text-sm font-medium text-gray-700 mb-2">
                Quality Rating (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                id="perf-qualityRating"
                value={formData.qualityRating}
                onChange={(e) => handleInputChange('qualityRating', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.qualityRating ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter percentage (0-100)"
              />
              {errors.qualityRating && (
                <p className="mt-1 text-sm text-red-600">{errors.qualityRating}</p>
              )}
            </div>

                         <div>
               <label htmlFor="perf-priceCompetitiveness" className="block text-sm font-medium text-gray-700 mb-2">
                 Price Competitiveness (%)
               </label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 id="perf-priceCompetitiveness"
                 value={formData.priceCompetitiveness}
                 onChange={(e) => handleInputChange('priceCompetitiveness', Number(e.target.value))}
                 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                   errors.priceCompetitiveness ? 'border-red-500' : 'border-gray-300'
                 }`}
                 placeholder="Enter percentage (0-100)"
               />
               {errors.priceCompetitiveness && (
                 <p className="mt-1 text-sm text-red-600">{errors.priceCompetitiveness}</p>
               )}
             </div>

            <div>
              <label htmlFor="perf-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                id="perf-notes"
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes about the performance update..."
              />
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoading ? 'Updating...' : 'Update Performance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformanceModal;
