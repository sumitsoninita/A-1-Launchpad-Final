import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Spinner from '../shared/Spinner';
import { api } from '../../services/api';

interface FeedbackFormProps {
  requestId: string;
  onClose: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ requestId, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await api.addFeedback({
        service_request_id: requestId,
        rating,
        comment,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Service Feedback" onClose={onClose}>
      <div className="p-6">
        {submitted ? (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-green-600">Thank You!</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Your feedback has been submitted successfully.</p>
            <button onClick={onClose} className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
                Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overall Satisfaction</label>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl focus:outline-none"
                    aria-label={`Rate ${star} star`}
                  >
                    <span className={(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comments (Optional)</label>
              <textarea
                id="comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1 w-full input-field"
                placeholder="Tell us about your experience..."
              ></textarea>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:bg-primary-300">
                {loading ? <Spinner small /> : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default FeedbackForm;