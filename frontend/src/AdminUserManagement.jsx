import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Trash2, Shield, User, AlertCircle, CheckCircle } from 'lucide-react';
import config from './config';

const API_URL = config.apiUrl;

export default function AdminUserManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admins`);
      setAdmins(response.data);
    } catch (err) {
      console.error('Error fetching admins:', err);
      setMessage({ type: 'error', text: 'Failed to load admins' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    
    if (!newAdminEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    try {
      await axios.post(`${API_URL}/admins`, {
        email: newAdminEmail,
        isSuperAdmin: isSuperAdmin
      });

      setMessage({ type: 'success', text: 'Admin added successfully!' });
      setNewAdminEmail('');
      setIsSuperAdmin(false);
      setShowAddForm(false);
      fetchAdmins();
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to add admin' 
      });
    }
  };

  const handleRemoveAdmin = async (email) => {
    if (!confirm(`Are you sure you want to remove ${email} as admin?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admins/${email}`);
      setMessage({ type: 'success', text: 'Admin removed successfully!' });
      fetchAdmins();
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to remove admin' 
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">Admin Management</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
          >
            <UserPlus className="w-5 h-5" />
            Add Admin
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Add Admin Form */}
        {showAddForm && (
          <form onSubmit={handleAddAdmin} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Add New Admin</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="superAdmin"
                  checked={isSuperAdmin}
                  onChange={(e) => setIsSuperAdmin(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="superAdmin" className="text-sm text-gray-700 flex items-center gap-1">
                  <Shield className="w-4 h-4 text-yellow-500" />
                  Make Super Admin (can manage other admins)
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Add Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAdminEmail('');
                    setIsSuperAdmin(false);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Admins List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Added</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.email} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {admin.is_faculty ? (
                          <User className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Users className="w-4 h-4 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{admin.email}</p>
                          {admin.faculty_name && (
                            <p className="text-xs text-gray-500">{admin.faculty_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {admin.is_super_admin ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold w-fit">
                          <Shield className="w-3 h-3" />
                          Super Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {admin.is_faculty ? (
                        <span className="flex items-center gap-1 text-sm text-blue-600">
                          <User className="w-4 h-4" />
                          Faculty ({admin.faculty_cadre})
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Admin Only</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(admin.added_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!admin.is_super_admin && (
                        <button
                          onClick={() => handleRemoveAdmin(admin.email)}
                          className="text-red-600 hover:text-red-800 transition"
                          title="Remove admin"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}