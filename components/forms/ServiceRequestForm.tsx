import React, { useState, useRef } from 'react';
import { AppUser, ProductType } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';

const PRODUCT_CATEGORIES: ProductType[] = Object.values(ProductType);

interface ServiceRequestFormProps {
  user: AppUser;
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ user, onFormSubmitSuccess, onCancel }) => {
  const [customerName, setCustomerName] = useState(user.fullName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [productType, setProductType] = useState<ProductType>(PRODUCT_CATEGORIES[0]);
  const [productDetails, setProductDetails] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [isWarrantyClaim, setIsWarrantyClaim] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [serviceCenter, setServiceCenter] = useState('');
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
        // Reduced size limit for base64 storage (base64 is ~33% larger)
        if (file.size > 2 * 1024 * 1024) {
          setError(`File ${file.name} is too large. Max size is 2MB for optimal performance.`);
          return false;
        }
        // Check file type
        if (!file.type.startsWith('image/')) {
          setError(`File ${file.name} is not an image. Please upload only image files.`);
          return false;
        }
        return true;
      });
      setPhotos(prev => [...prev, ...validFiles]);
      setError(null);
    }
  };
  
  // Service center options
  const serviceCenters = [
    { value: 'maharashtra', label: 'Maharashtra Service Center' },
    { value: 'gujarat', label: 'Gujarat Service Center' },
    { value: 'dubai', label: 'Dubai Service Center' }
  ];
  
  const handleQRScan = async () => {
    setShowQRScanner(true);
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera if available
        } 
      });
      
      // Show camera modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Scan QR Code</h3>
          <div class="relative">
            <video id="qr-video" class="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" autoplay playsinline></video>
            <div class="absolute inset-0 border-2 border-red-500 rounded-lg pointer-events-none">
              <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-red-500 rounded-lg"></div>
            </div>
            <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
              Point camera at QR code and click Capture
            </div>
          </div>
          <div class="mt-4 flex space-x-3">
            <button id="close-camera" class="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500">
              Close
            </button>
            <button id="capture-qr" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Capture & Scan
            </button>
            <button id="manual-entry" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Manual Entry
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Set up video element
      const videoElement = document.getElementById('qr-video') as HTMLVideoElement;
      videoElement.srcObject = stream;
      
      // Function to capture image and send to API
      const captureAndScan = async () => {
        try {
          // Create canvas to capture frame
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          
          // Draw current video frame to canvas
          context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64
          const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          
          // Call Arya AI API
          const response = await fetch('https://ping.arya.ai/api/v1/qr', {
            method: 'POST',
            headers: {
              'token': 'ce71f69df66167c4a829e6e01887fb18',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              doc_type: 'image',
              doc_base64: base64Image,
              req_id: `qr_scan_${Date.now()}`
            })
          });
          
          const result = await response.json();
          
          if (result.success && result.data && result.data.text) {
            // QR code detected!
            const qrText = result.data.text;
            console.log('QR Code detected:', qrText);
            
            // Set the serial number
            setSerialNumber(qrText);
            
            // Stop camera and close modal
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(modal);
            setShowQRScanner(false);
            
            // Show success message
            alert(`QR Code scanned successfully!\nSerial Number: ${qrText}`);
          } else {
            alert('No QR code detected in the image. Please try again with a clearer view of the QR code.');
          }
          
        } catch (error) {
          console.error('QR scanning error:', error);
          alert('Error scanning QR code. Please try again or use manual entry.');
        }
      };
      
      // Handle capture button
      document.getElementById('capture-qr')!.addEventListener('click', captureAndScan);
      
      // Handle close button
      document.getElementById('close-camera')!.addEventListener('click', () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        setShowQRScanner(false);
      });
      
      // Handle manual entry button
      document.getElementById('manual-entry')!.addEventListener('click', () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        setShowQRScanner(false);
        
        const userInput = prompt('Enter the serial number manually:');
        if (userInput && userInput.trim()) {
          setSerialNumber(userInput.trim());
          alert(`Serial number captured: ${userInput.trim()}`);
        }
      });
      
    } catch (error) {
      console.error('Camera access error:', error);
      setShowQRScanner(false);
      
      // Fallback to manual entry
      const userInput = prompt('Camera not available. Please enter the serial number manually:');
      if (userInput && userInput.trim()) {
        setSerialNumber(userInput.trim());
        alert(`Serial number captured: ${userInput.trim()}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !serialNumber || !purchaseDate || !faultDescription || !address || !serviceCenter) {
        setError("Please fill in all required fields.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
        await api.addServiceRequest({
            customer_id: user.id,
            customer_name: customerName,
            customer_phone: customerPhone,
            serial_number: serialNumber,
            product_type: productType,
            product_details: productDetails,
            purchase_date: purchaseDate,
            fault_description: faultDescription,
            is_warranty_claim: isWarrantyClaim,
            image_urls: [], // Will be populated by the API after upload
            geolocation: `${address} | Service Center: ${serviceCenters.find(sc => sc.value === serviceCenter)?.label}`
        }, user.email, photos);

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
      

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Fields */}
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name *</label>
            <input type="text" id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="mt-1 w-full input-field" />
          </div>
          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
            <input type="tel" id="customerPhone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="mt-1 w-full input-field" placeholder="Enter your phone number" />
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
                    <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 2MB each</p>
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
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Address *</label>
            <textarea 
                id="address" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                required 
                rows={3} 
                className="mt-1 w-full input-field"
                placeholder="Enter your complete address including city, state, and postal code"
            />
        </div>
        
        <div>
            <label htmlFor="serviceCenter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Service Center *</label>
            <select 
                id="serviceCenter" 
                value={serviceCenter} 
                onChange={e => setServiceCenter(e.target.value)} 
                required 
                className="mt-1 w-full input-field"
            >
                <option value="">Choose a service center...</option>
                {serviceCenters.map(center => (
                    <option key={center.value} value={center.value}>
                        {center.label}
                    </option>
                ))}
            </select>
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