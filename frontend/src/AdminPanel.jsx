import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Users, Calendar, TrendingUp, Download, MessageSquare } from 'lucide-react';
import Feedback from './Feedback.jsx';
import Credits from './Credits.jsx';
import AdminFeedbackViewer from './AdminFeedbackViewer.jsx';

const API_URL = 'http://localhost:4000/api';

export default function AdminPanel() {
  const [allSessions, setAllSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalSlots: 0,
    assignedSlots: 0,
    freeSlots: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentUser] = useState('admin@college.edu'); // Get this from your auth context or props
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'feedback'

  useEffect(() => {
    fetchAllSessions();
  }, []);

  const fetchAllSessions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/all-sessions`);
      setAllSessions(response.data);
      
      const totalSlots = response.data.reduce((sum, s) => sum + parseInt(s.total_slots), 0);
      const assignedSlots = response.data.reduce((sum, s) => sum + parseInt(s.assigned_slots), 0);
      
      setStats({
        totalSessions: response.data.length,
        totalSlots: totalSlots,
        assignedSlots: assignedSlots,
        freeSlots: totalSlots - assignedSlots,
      });
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (session) => {
    const total = parseInt(session.total_slots);
    const assigned = parseInt(session.assigned_slots);
    
    if (assigned === 0) return 'bg-green-100 text-green-800';
    if (assigned === total) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (session) => {
    const total = parseInt(session.total_slots);
    const assigned = parseInt(session.assigned_slots);
    
    if (assigned === 0) return 'Open';
    if (assigned === total) return 'Full';
    return 'Partial';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Feedback and Credits buttons */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3 mb-2">
              <BarChart3 className="w-10 h-10 text-indigo-600" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Monitor and manage exam duty allocations</p>
          </div>
          
          {/* Feedback and Credits Buttons */}
          <div className="flex items-center gap-3">

            <Credits />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-2 flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'feedback'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MessageSquare size={18} />
            Feedback Manager
          </button>
        </div>

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Sessions"
                value={stats.totalSessions}
                icon={<Calendar className="w-8 h-8 text-blue-600" />}
                bgColor="bg-blue-50"
                borderColor="border-blue-200"
              />
              <StatCard
                title="Total Slots"
                value={stats.totalSlots}
                icon={<Users className="w-8 h-8 text-purple-600" />}
                bgColor="bg-purple-50"
                borderColor="border-purple-200"
              />
              <StatCard
                title="Assigned Slots"
                value={stats.assignedSlots}
                icon={<TrendingUp className="w-8 h-8 text-green-600" />}
                bgColor="bg-green-50"
                borderColor="border-green-200"
              />
              <StatCard
                title="Free Slots"
                value={stats.freeSlots}
                icon={<Download className="w-8 h-8 text-orange-600" />}
                bgColor="bg-orange-50"
                borderColor="border-orange-200"
              />
            </div>

            {/* Overall Utilization */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Overall Utilization</h3>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ width: `${stats.totalSlots > 0 ? (stats.assignedSlots / stats.totalSlots) * 100 : 0}%` }}
                >
                  {stats.totalSlots > 0 ? Math.round((stats.assignedSlots / stats.totalSlots) * 100) : 0}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {stats.assignedSlots} of {stats.totalSlots} slots assigned
              </p>
            </div>

            {/* All Exam Sessions Table */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">All Exam Sessions</h2>
                <button
                  onClick={fetchAllSessions}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-800">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-800">Course</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-800">Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-800">Branch</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-800">Semester</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-800">Time</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-800">Total</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-800">Assigned</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-800">Free</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-800">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                          No sessions found
                        </td>
                      </tr>
                    ) : (
                      allSessions.map((session) => {
                        const sessionDate = new Date(session.session_date);
                        const formattedDate = sessionDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });
                        const free = parseInt(session.total_slots) - parseInt(session.assigned_slots);

                        return (
                          <tr key={session.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                            <td className="px-4 py-4 text-gray-800 font-medium">{formattedDate}</td>
                            <td className="px-4 py-4 font-semibold text-gray-800">{session.course_name}</td>
                            <td className="px-4 py-4 text-sm text-gray-600">{session.course_code}</td>
                            <td className="px-4 py-4 text-sm text-gray-600">{session.branch}</td>
                            <td className="px-4 py-4 text-center text-sm text-gray-600">
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                                Sem {session.semester}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {session.start_time} - {session.end_time}
                            </td>
                            <td className="px-4 py-4 text-center font-semibold text-gray-800">
                              {session.total_slots}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                                {session.assigned_slots}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                                {free}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full font-semibold text-sm ${getStatusColor(session)}`}>
                                {getStatusText(session)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Feedback Tab Content */}
        {activeTab === 'feedback' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <AdminFeedbackViewer />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor, borderColor }) {
  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-6 shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-600 font-semibold text-sm">{title}</p>
        {icon}
      </div>
      <p className="text-4xl font-bold text-gray-800">{value}</p>
    </div>
  );
}