import React, { useState, useRef } from 'react';
import { AppUser, ProductType } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import Modal from '../shared/Modal';

const PRODUCT_CATEGORIES: ProductType[] = Object.values(ProductType);

interface ServiceRequestFormProps {
  user: AppUser;
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ user, onFormSubmitSuccess, onCancel }) => {
  const [customerName, setCustomerName] = useState(user.fullName || '');
  const [serialNumber, setSerialNumber] = useState('');
  const [productType, setProductType] = useState<ProductType>(PRODUCT_CATEGORIES[0]);
  const [productDetails, setProductDetails] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [isWarrantyClaim, setIsWarrantyClaim] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocation, setGeolocation] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + photos.length > 3) {
        setError('You can upload a maximum of 3 photos.');
        return;
      }
      const validFiles = files.filter((file: File) => {
        if (file.size > 5 * 1024 * 1024) {
          setError(`File ${file.name} is too large. Max size is 5MB.`);
          return false;
        }
        return true;
      });
      setPhotos(prev => [...prev, ...validFiles]);
      setError(null);
    }
  };
  
  const handleGeoTagging = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const geo = `Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`;
                setGeolocation(geo);
                alert("Location captured! This will help assign the nearest service center.");
            },
            () => {
                setError("Unable to retrieve your location. Please check browser permissions.");
            }
        );
    } else {
        setError("Geolocation is not supported by this browser.");
    }
  };
  
  const handleQRScan = () => {
      setShowQRScanner(true);
      // This is a placeholder for a real QR scanner implementation
      setTimeout(() => {
        const fakeSerialNumber = `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        setSerialNumber(fakeSerialNumber);
        setShowQRScanner(false);
        alert(`QR Code scanned. Serial number detected: ${fakeSerialNumber}`);
      }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !serialNumber || !purchaseDate || !faultDescription) {
        setError("Please fill in all required fields.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
        // In a real app, you would upload files to a cloud storage and get URLs.
        // For this demo, we'll just use dummy URLs.
        const imageUrls = photos.map(p => `/uploads/mock_${p.name}`);

        await api.addServiceRequest({
            customer_id: user.id,
            customer_name: customerName,
            serial_number: serialNumber,
            product_type: productType,
            product_details: productDetails,
            purchase_date: purchaseDate,
            fault_description: faultDescription,
            is_warranty_claim: isWarrantyClaim,
            image_urls: imageUrls,
            geolocation: geolocation
        }, user.email);

        onFormSubmitSuccess();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">New Service Request</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
      {showQRScanner && (
        <Modal title="Scanning QR/Barcode" onClose={() => setShowQRScanner(false)}>
            <div className="flex flex-col items-center justify-center p-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">Point your camera at the product's QR or Barcode.</p>
                <Spinner />
                <p className="mt-4 text-sm text-gray-500 animate-pulse">Simulating scan...</p>
            </div>
        </Modal>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Fields */}
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name *</label>
            <input type="text" id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="mt-1 w-full input-field" />
          </div>
          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number *</label>
            <div className="flex items-center space-x-2">
                <input type="text" id="serialNumber" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} required className="mt-1 w-full input-field" />
                <button type="button" onClick={handleQRScan} className="mt-1 px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500" title="Scan QR/Barcode">
                   📷
                </button>
            </div>
          </div>
          <div>
            <label htmlFor="productType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Type *</label>
            <select id="productType" value={productType} onChange={e => setProductType(e.target.value as ProductType)} required className="mt-1 w-full input-field">
              {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
           <div>
            <label htmlFor="productDetails" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Details (Model, Color, etc.)</label>
            <input type="text" id="productDetails" value={productDetails} onChange={e => setProductDetails(e.target.value)} className="mt-1 w-full input-field" />
          </div>
          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date *</label>
            <input type="date" id="purchaseDate" value={purchaseDate} required className="mt-1 w-full input-field" onChange={e => setPurchaseDate(e.target.value)}/>
          </div>
           <div className="flex items-center pt-6">
            <input id="isWarrantyClaim" type="checkbox" checked={isWarrantyClaim} onChange={e => setIsWarrantyClaim(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
            <label htmlFor="isWarrantyClaim" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">This is a warranty claim</label>
          </div>
        </div>
        <div>
            <label htmlFor="faultDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fault Description *</label>
            <textarea id="faultDescription" value={faultDescription} onChange={e => setFaultDescription(e.target.value)} required rows={4} className="mt-1 w-full input-field"></textarea>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Photos (Max 3, up to 5MB each)</label>
            <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                            <span>Upload files</span>
                            <input id="file-upload" ref={fileInputRef} name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handlePhotoChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
            </div>
            {photos.length > 0 && (
                <div className="mt-4">
                    <p className="text-sm font-medium">Selected files:</p>
                    <ul className="list-disc list-inside">
                        {photos.map((p,i) => <li key={i} className="text-sm">{p.name}</li>)}
                    </ul>
                </div>
            )}
        </div>
        
        <div>
             <button type="button" onClick={handleGeoTagging} className="w-full flex items-center justify-center py-2 px-4 border border-dashed border-gray-400 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none">
                📍 {geolocation ? `Location Captured: ${geolocation}` : 'Geo-Tag to Find Nearest Service Center'}
            </button>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4">
            <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed flex items-center">
                {loading && <Spinner small={true} />}
                <span className="ml-2">Submit Request</span>
            </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceRequestForm;