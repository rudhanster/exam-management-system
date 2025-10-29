import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Filter, TrendingUp, CheckCircle, Clock, AlertCircle, Trash2, Eye } from 'lucide-react';
import axios from 'axios';

import config from './config'; // Adjust path based on file location
const API_URL = config.apiUrl;

export default function AdminFeedbackViewer() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    category: 'all'
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchFeedback();
    fetchStatistics();
  }, [filter]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.status !== 'all') params.status = filter.status;
      if (filter.category !== 'all') params.category = filter.category;

      const response = await axios.get(`${API_URL}/feedback`, { params });
      setFeedbackList(response.data.feedback || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/feedback/statistics`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const updateFeedbackStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_URL}/feedback/${id}`, { status: newStatus });
      fetchFeedback();
      fetchStatistics();
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Failed to update feedback status');
    }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;

    try {
      await axios.delete(`${API_URL}/feedback/${id}`);
      fetchFeedback();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      bug: 'bg-red-100 text-red-800',
      feature: 'bg-green-100 text-green-800',
      ui: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewed: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800'
    };
    return colors[status] || colors.pending;
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-indigo-600" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Feedback Management</h2>
            <p className="text-sm text-gray-600">View and manage user feedback</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.overview.total_feedback}</p>
              </div>
              <MessageSquare className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-800">
                  {parseFloat(statistics.overview.average_rating || 0).toFixed(1)} ⭐
                </p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.overview.pending}</p>
              </div>
              <Clock className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.overview.resolved}</p>
              </div>
              <CheckCircle className="text-purple-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <span className="font-semibold text-gray-700">Filters:</span>
          </div>

          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="ui">UI/UX</option>
            <option value="other">Other</option>
          </select>

          <button
            onClick={() => setFilter({ status: 'all', category: 'all' })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading feedback...</div>
        ) : feedbackList.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No feedback found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {feedbackList.map((feedback) => (
                  <tr key={feedback.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{feedback.user_email}</td>
                    <td className="px-4 py-3">{renderStars(feedback.rating)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(feedback.category)}`}>
                        {feedback.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                      {feedback.message}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={feedback.status}
                        onChange={(e) => updateFeedbackStatus(feedback.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(feedback.status)} border-0`}
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setShowDetailModal(true);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => deleteFeedback(feedback.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Feedback Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">From:</label>
                <p className="text-gray-800">{selectedFeedback.user_email}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Rating:</label>
                <div className="mt-1">{renderStars(selectedFeedback.rating)}</div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Category:</label>
                <p className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(selectedFeedback.category)}`}>
                    {selectedFeedback.category}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Status:</label>
                <p className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedFeedback.status)}`}>
                    {selectedFeedback.status}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Message:</label>
                <p className="mt-1 text-gray-800 bg-gray-50 p-4 rounded-lg">{selectedFeedback.message}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Submitted:</label>
                <p className="text-gray-600">{new Date(selectedFeedback.created_at).toLocaleString()}</p>
              </div>
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}