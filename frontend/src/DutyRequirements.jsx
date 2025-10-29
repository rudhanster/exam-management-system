import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, X, Award, Clock, AlertCircle, Shield, Calendar, Star, Users, UserX } from 'lucide-react';

import config from './config'; // Adjust path based on file location
const API_URL = config.apiUrl;

const CADRES = ['Professor', 'Associate Professor', 'Assistant Professor', 'Others'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DutyRequirements() {
  // Main state
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requirements');

  // Requirements state
  const [requirements, setRequirements] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [requirementForm, setRequirementForm] = useState({
    cadre: 'Professor',
    min_duties: 4
  });

  // Time restrictions state
  const [timeRestrictions, setTimeRestrictions] = useState([]);
  const [showRestrictionForm, setShowRestrictionForm] = useState(false);
  const [editingRestriction, setEditingRestriction] = useState(null);
  const [restrictionForm, setRestrictionForm] = useState({
    cadre: 'Professor',
    priority_start_time: '16:30',
    priority_end_time: '18:00',
    min_slots_required: 2,
    priority_days: []
  });

  // Exemptions state (time restriction exemptions)
  const [exemptions, setExemptions] = useState([]);
  const [showExemptionForm, setShowExemptionForm] = useState(false);
  const [exemptionForm, setExemptionForm] = useState({
    faculty_email: '',
    reason: ''
  });

  // NEW: Faculty duty exceptions state
  const [facultyExceptions, setFacultyExceptions] = useState([]);
  const [showFacultyExceptionForm, setShowFacultyExceptionForm] = useState(false);
  const [editingFacultyException, setEditingFacultyException] = useState(null);
  const [facultyExceptionForm, setFacultyExceptionForm] = useState({
    faculty_id: '',
    min_duties: 1,
    max_duties: 3,
    reason: ''
  });

  const [facultyList, setFacultyList] = useState([]);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  useEffect(() => {
    fetchExamTypes();
    fetchFacultyList();
  }, []);

  useEffect(() => {
    if (selectedExamType) {
      fetchRequirements();
      fetchComplianceStatus();
      fetchTimeRestrictions();
      fetchExemptions();
      fetchFacultyExceptions(); // NEW
    }
  }, [selectedExamType]);

  const fetchExamTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/exam-types`);
      setExamTypes(response.data);
      if (response.data.length > 0) {
        setSelectedExamType(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching exam types:', err);
    }
  };

  const fetchFacultyList = async () => {
  try {
    // Change from /faculty/all to /faculty
    const response = await axios.get(`${API_URL}/faculty`);
    setFacultyList(response.data || []);
  } catch (error) {
    console.error('Error fetching faculty list:', error);
    setFacultyList([]); // Set empty array to prevent crashes
    // Optional: show user-friendly message
    alert('Failed to load faculty list. Please check your connection.');
  }
};

  const fetchRequirements = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/duty-requirements`, {
        params: { exam_type_id: selectedExamType }
      });
      setRequirements(response.data);
    } catch (err) {
      console.error('Error fetching requirements:', err);
    }
  };

  const fetchComplianceStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/compliance-status`, {
        params: { exam_type_id: selectedExamType }
      });
      setComplianceStatus(response.data);
    } catch (err) {
      console.error('Error fetching compliance status:', err);
    }
  };

  const fetchTimeRestrictions = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/time-restrictions`, {
        params: { exam_type_id: selectedExamType }
      });
      setTimeRestrictions(response.data);
    } catch (err) {
      console.error('Error fetching time restrictions:', err);
    }
  };

  const fetchExemptions = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/restriction-exemptions`, {
        params: { exam_type_id: selectedExamType }
      });
      setExemptions(response.data);
    } catch (err) {
      console.error('Error fetching exemptions:', err);
    }
  };

  // NEW: Fetch faculty duty exceptions
  const fetchFacultyExceptions = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/faculty-duty-exceptions`, {
        params: { exam_type_id: selectedExamType }
      });
      setFacultyExceptions(response.data);
    } catch (err) {
      console.error('Error fetching faculty exceptions:', err);
    }
  };

  // ============================================
  // REQUIREMENTS HANDLERS
  // ============================================

  const handleSaveRequirement = async () => {
    try {
      setLoading(true);
      const data = {
        exam_type_id: selectedExamType,
        cadre: requirementForm.cadre,
        min_duties: parseInt(requirementForm.min_duties)
      };

      if (editingRequirement) {
        await axios.put(`${API_URL}/admin/duty-requirements/${editingRequirement.id}`, data);
      } else {
        await axios.post(`${API_URL}/admin/duty-requirements`, data);
      }

      fetchRequirements();
      fetchComplianceStatus();
      setShowRequirementForm(false);
      setEditingRequirement(null);
      setRequirementForm({ cadre: 'Professor', min_duties: 4 });
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving requirement');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRequirement = (req) => {
    setEditingRequirement(req);
    setRequirementForm({
      cadre: req.cadre,
      min_duties: req.min_duties
    });
    setShowRequirementForm(true);
  };

  const handleDeleteRequirement = async (examTypeId, cadre) => {
    if (!confirm('Delete this requirement?')) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/admin/duty-requirements/${examTypeId}/${cadre}`);
      fetchRequirements();
      fetchComplianceStatus();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting requirement');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // TIME RESTRICTIONS HANDLERS
  // ============================================

  const handleSaveRestriction = async () => {
    try {
      setLoading(true);
      const data = {
        exam_type_id: selectedExamType,
        cadre: restrictionForm.cadre,
        priority_start_time: restrictionForm.priority_start_time,
        priority_end_time: restrictionForm.priority_end_time,
        min_slots_required: parseInt(restrictionForm.min_slots_required),
        priority_days: restrictionForm.priority_days.length > 0 ? restrictionForm.priority_days : null
      };

      if (editingRestriction) {
        await axios.put(`${API_URL}/admin/time-restrictions/${editingRestriction.id}`, data);
      } else {
        await axios.post(`${API_URL}/admin/time-restrictions`, data);
      }

      fetchTimeRestrictions();
      setShowRestrictionForm(false);
      setEditingRestriction(null);
      setRestrictionForm({
        cadre: 'Professor',
        priority_start_time: '16:30',
        priority_end_time: '18:00',
        min_slots_required: 2,
        priority_days: []
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving time restriction');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRestriction = (restriction) => {
    setEditingRestriction(restriction);
    setRestrictionForm({
      cadre: restriction.cadre,
      priority_start_time: restriction.priority_start_time.substring(0, 5),
      priority_end_time: restriction.priority_end_time.substring(0, 5),
      min_slots_required: restriction.min_slots_required,
      priority_days: restriction.priority_days || []
    });
    setShowRestrictionForm(true);
  };

  const handleDeleteRestriction = async (id) => {
    if (!confirm('Delete this time restriction?')) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/admin/time-restrictions/${id}`);
      fetchTimeRestrictions();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting restriction');
    } finally {
      setLoading(false);
    }
  };

  const togglePriorityDay = (day) => {
    setRestrictionForm(prev => ({
      ...prev,
      priority_days: prev.priority_days.includes(day)
        ? prev.priority_days.filter(d => d !== day)
        : [...prev.priority_days, day]
    }));
  };

  // ============================================
  // EXEMPTIONS HANDLERS (Time Restriction Exemptions)
  // ============================================

  const handleSaveExemption = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/admin/restriction-exemptions`, {
        exam_type_id: selectedExamType,
        faculty_email: exemptionForm.faculty_email,
        reason: exemptionForm.reason,
        granted_by: 'admin@college.edu'
      });

      fetchExemptions();
      setShowExemptionForm(false);
      setExemptionForm({ faculty_email: '', reason: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving exemption');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExemption = async (id) => {
    if (!confirm('Remove this exemption?')) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/admin/restriction-exemptions/${id}`);
      fetchExemptions();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting exemption');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEW: FACULTY DUTY EXCEPTIONS HANDLERS
  // ============================================

  const handleSaveFacultyException = async () => {
    try {
      setLoading(true);
      const data = {
        faculty_id: facultyExceptionForm.faculty_id,
        exam_type_id: selectedExamType,
        min_duties: parseInt(facultyExceptionForm.min_duties),
        max_duties: facultyExceptionForm.max_duties ? parseInt(facultyExceptionForm.max_duties) : null,
        reason: facultyExceptionForm.reason,
        created_by: 'admin@college.edu'
      };

      if (editingFacultyException) {
        await axios.put(`${API_URL}/admin/faculty-duty-exceptions/${editingFacultyException.id}`, data);
      } else {
        await axios.post(`${API_URL}/admin/faculty-duty-exceptions`, data);
      }

      fetchFacultyExceptions();
      fetchComplianceStatus(); // Refresh compliance to show new requirements
      setShowFacultyExceptionForm(false);
      setEditingFacultyException(null);
      setFacultyExceptionForm({
        faculty_id: '',
        min_duties: 1,
        max_duties: 3,
        reason: ''
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving faculty exception');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFacultyException = (exception) => {
    setEditingFacultyException(exception);
    setFacultyExceptionForm({
      faculty_id: exception.faculty_id,
      min_duties: exception.min_duties,
      max_duties: exception.max_duties,
      reason: exception.reason
    });
    setShowFacultyExceptionForm(true);
  };

  const handleDeleteFacultyException = async (id) => {
    if (!confirm('Delete this faculty exception? The faculty will revert to cadre-based requirements.')) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/admin/faculty-duty-exceptions/${id}`);
      fetchFacultyExceptions();
      fetchComplianceStatus(); // Refresh compliance
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting faculty exception');
    } finally {
      setLoading(false);
    }
  };

  const selectedExamTypeName = examTypes.find(et => et.id === selectedExamType)?.type_name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              Duty Requirements & Time Restrictions
            </h1>
          </div>
          <p className="text-gray-600">
            Set minimum duty requirements per cadre and monitor compliance
          </p>

          {/* Exam Type Selector */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Exam Type
            </label>
            <select
              value={selectedExamType || ''}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full max-w-md"
            >
              {examTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type_name}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 border-b">
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${
                activeTab === 'requirements'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Cadre Requirements
            </button>
            <button
              onClick={() => setActiveTab('faculty-exceptions')}
              className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${
                activeTab === 'faculty-exceptions'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <UserX className="w-4 h-4" />
              Faculty Exceptions
            </button>
            <button
              onClick={() => setActiveTab('restrictions')}
              className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${
                activeTab === 'restrictions'
                  ? 'border-b-2 border-yellow-600 text-yellow-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              Time Restrictions
            </button>
            <button
              onClick={() => setActiveTab('exemptions')}
              className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${
                activeTab === 'exemptions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              Time Exemptions
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* TAB 1: CADRE REQUIREMENTS (existing code) */}
        {/* ============================================ */}
        {activeTab === 'requirements' && (
          <>
            {/* Statistics Cards */}
            {complianceStatus && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Faculty</p>
                      <p className="text-3xl font-bold text-gray-800 mt-1">
                        {complianceStatus.summary.total_faculty}
                      </p>
                    </div>
                    <Users className="w-12 h-12 text-indigo-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Requirements Met</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">
                        {complianceStatus.summary.met}
                      </p>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-green-100 rounded-full">
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Below Target</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-1">
                        {complianceStatus.summary.warning}
                      </p>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-yellow-100 rounded-full">
                      <span className="text-2xl">⚠️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Critical</p>
                      <p className="text-3xl font-bold text-red-600 mt-1">
                        {complianceStatus.summary.critical}
                      </p>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-full">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Requirements Management */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Cadre-Based Duty Requirements</h2>
                <button
                  onClick={() => {
                    setShowRequirementForm(true);
                    setEditingRequirement(null);
                    setRequirementForm({ cadre: 'Professor', min_duties: 4 });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Requirement
                </button>
              </div>

              {showRequirementForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    {editingRequirement ? 'Edit' : 'New'} Requirement
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cadre</label>
                      <select
                        value={requirementForm.cadre}
                        onChange={(e) => setRequirementForm({ ...requirementForm, cadre: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {CADRES.map(cadre => (
                          <option key={cadre} value={cadre}>{cadre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Duties
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={requirementForm.min_duties}
                        onChange={(e) => setRequirementForm({ ...requirementForm, min_duties: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveRequirement}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-gray-400"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowRequirementForm(false);
                        setEditingRequirement(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Cadre</th>
                      <th className="px-4 py-3 text-center font-semibold">Minimum Duties</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                          No requirements set. Click "Add Requirement" to create one.
                        </td>
                      </tr>
                    ) : (
                      requirements.map((req) => (
                        <tr key={req.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{req.cadre}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
                              {req.min_duties}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditRequirement(req)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRequirement(req.exam_type_id, req.cadre)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Faculty Compliance Status */}
            {complianceStatus && (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-bold text-gray-800 mb-4">Faculty Compliance Status</h2>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Faculty</th>
            <th className="px-4 py-3 text-left font-semibold">Department</th>
            <th className="px-4 py-3 text-left font-semibold">Cadre</th>
            <th className="px-4 py-3 text-center font-semibold">Required</th>
            <th className="px-4 py-3 text-center font-semibold">Current</th>
            <th className="px-4 py-3 text-center font-semibold">Remaining</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {complianceStatus.faculty.map((faculty) => {
            const hasException = faculty.source === 'faculty_specific';
            const hasMaxDuties = faculty.max_duties !== null;
            
            return (
              <tr key={faculty.faculty_id} className={`border-b hover:bg-gray-50 ${hasException ? 'bg-purple-50/30' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{faculty.name}</p>
                        {hasException && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold" title={faculty.reason}>
                            ⚡ EXCEPTION
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{faculty.email}</p>
                      {hasException && faculty.reason && (
                        <p className="text-xs text-purple-700 italic mt-1">
                          Reason: {faculty.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{faculty.department}</td>
                <td className="px-4 py-3">{faculty.cadre}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`font-semibold ${hasException ? 'text-purple-700' : 'text-gray-800'}`}>
                      {faculty.min_duties}
                    </span>
                    
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    faculty.current_duties === 0 
                      ? 'bg-red-100 text-red-800' 
                      : hasMaxDuties && faculty.current_duties > faculty.max_duties
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {faculty.current_duties}
                    {hasMaxDuties && faculty.current_duties > faculty.max_duties && ' ⚠️'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-semibold">{faculty.remaining}</td>
                <td className="px-4 py-3 text-center">
                  {faculty.status === 'met' ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      ✅ MET
                    </span>
                  ) : faculty.status === 'warning' ? (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      ⚠️ WARNING
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                      ❌ CRITICAL
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
)}
          </>
        )}

        {/* ============================================ */}
        {/* TAB 2: FACULTY DUTY EXCEPTIONS (NEW) */}
        {/* ============================================ */}
        {activeTab === 'faculty-exceptions' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <UserX className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-semibold mb-1">About Faculty-Specific Exceptions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Override cadre-based requirements for individual faculty members</li>
                    <li>Set custom min/max duties for specific faculty for this exam type</li>
                    <li>Useful for medical conditions, administrative duties, or special circumstances</li>
                    <li>Faculty exceptions take priority over cadre requirements</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                Manage faculty-specific duty exceptions for <strong>{selectedExamTypeName}</strong>
              </p>
              <button
                onClick={() => {
                  setShowFacultyExceptionForm(true);
                  setEditingFacultyException(null);
                  setFacultyExceptionForm({
                    faculty_id: '',
                    min_duties: 1,
                    max_duties: 3,
                    reason: ''
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Add Faculty Exception
              </button>
            </div>

            {showFacultyExceptionForm && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">
                  {editingFacultyException ? 'Edit' : 'New'} Faculty Exception
                </h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faculty Member
                  </label>
                  <select
                    value={facultyExceptionForm.faculty_id}
                    onChange={(e) => setFacultyExceptionForm({ ...facultyExceptionForm, faculty_id: e.target.value })}
                    disabled={editingFacultyException !== null}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Faculty</option>
                    {facultyList.map(faculty => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name} ({faculty.email}) - {faculty.cadre}
                      </option>
                    ))}
                  </select>
                  {editingFacultyException && (
                    <p className="text-xs text-gray-600 mt-1">
                      Faculty cannot be changed when editing. Delete and create new exception if needed.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Duties *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={facultyExceptionForm.min_duties}
                      onChange={(e) => setFacultyExceptionForm({ ...facultyExceptionForm, min_duties: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 2"
                    />
                    <p className="text-xs text-gray-600 mt-1">Required minimum duties for this faculty</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Duties (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={facultyExceptionForm.max_duties}
                      onChange={(e) => setFacultyExceptionForm({ ...facultyExceptionForm, max_duties: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 4"
                    />
                    <p className="text-xs text-gray-600 mt-1">Leave empty to use faculty's default max</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Exception *
                  </label>
                  <textarea
                    value={facultyExceptionForm.reason}
                    onChange={(e) => setFacultyExceptionForm({ ...facultyExceptionForm, reason: e.target.value })}
                    rows="3"
                    placeholder="E.g., Medical condition - reduced workload, Senior faculty - administrative duties, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  ></textarea>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveFacultyException}
                    disabled={loading || !facultyExceptionForm.faculty_id || !facultyExceptionForm.reason || !facultyExceptionForm.min_duties}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-gray-400"
                  >
                    <Save className="w-4 h-4" />
                    Save Exception
                  </button>
                  <button
                    onClick={() => {
                      setShowFacultyExceptionForm(false);
                      setEditingFacultyException(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Faculty</th>
                    <th className="px-4 py-3 text-left font-semibold">Cadre</th>
                    <th className="px-4 py-3 text-center font-semibold">Min Duties</th>
                    <th className="px-4 py-3 text-center font-semibold">Max Duties</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold">Created</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyExceptions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No faculty exceptions set. Click "Add Faculty Exception" to create one.
                      </td>
                    </tr>
                  ) : (
                    facultyExceptions.map((exception) => (
                      <tr key={exception.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{exception.faculty_name}</p>
                            <p className="text-sm text-gray-600">{exception.faculty_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {exception.cadre}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                            {exception.min_duties}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {exception.max_duties ? (
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
                              {exception.max_duties}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">Default</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs truncate" title={exception.reason}>
                          {exception.reason}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>
                            <p>{new Date(exception.created_at).toLocaleDateString()}</p>
                            {exception.created_by && (
                              <p className="text-xs text-gray-500">by {exception.created_by}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditFacultyException(exception)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit exception"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFacultyException(exception.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete exception"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'restrictions' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">How Time Restrictions Work:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Faculty must pick their quota from priority time slots FIRST</li>
                    <li>Cannot pick non-priority slots until quota is met</li>
                    <li>Multiple time ranges can be set for each cadre</li>
                    <li>Optional: Restrict to specific days of the week</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                Set priority time slots for <strong>{selectedExamTypeName}</strong>
              </p>
              <button
                onClick={() => {
                  setShowRestrictionForm(true);
                  setEditingRestriction(null);
                  setRestrictionForm({
                    cadre: 'Professor',
                    priority_start_time: '16:30',
                    priority_end_time: '18:00',
                    min_slots_required: 2,
                    priority_days: []
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
              >
                <Star className="w-4 h-4" />
                Add Time Restriction
              </button>
            </div>

            {showRestrictionForm && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">
                  {editingRestriction ? 'Edit' : 'New'} Time Restriction
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cadre</label>
                    <select
                      value={restrictionForm.cadre}
                      onChange={(e) => setRestrictionForm({ ...restrictionForm, cadre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    >
                      {CADRES.map(cadre => (
                        <option key={cadre} value={cadre}>{cadre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Priority Slots Required
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={restrictionForm.min_slots_required}
                      onChange={(e) => setRestrictionForm({ ...restrictionForm, min_slots_required: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Start Time
                    </label>
                    <input
                      type="time"
                      value={restrictionForm.priority_start_time}
                      onChange={(e) => setRestrictionForm({ ...restrictionForm, priority_start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority End Time
                    </label>
                    <input
                      type="time"
                      value={restrictionForm.priority_end_time}
                      onChange={(e) => setRestrictionForm({ ...restrictionForm, priority_end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Priority Days (Optional - leave empty for all days)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => togglePriorityDay(day)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          restrictionForm.priority_days.includes(day)
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Select specific days if restriction should only apply on certain days
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveRestriction}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-gray-400"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowRestrictionForm(false);
                      setEditingRestriction(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Cadre</th>
                    <th className="px-4 py-3 text-left font-semibold">Priority Time</th>
                    <th className="px-4 py-3 text-left font-semibold">Min Slots</th>
                    <th className="px-4 py-3 text-left font-semibold">Priority Days</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timeRestrictions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No time restrictions set. Click "Add Time Restriction" to create one.
                      </td>
                    </tr>
                  ) : (
                    timeRestrictions.map((restriction) => (
                      <tr key={restriction.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{restriction.cadre}</td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                            {restriction.priority_start_time.substring(0, 5)} - {restriction.priority_end_time.substring(0, 5)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                          {restriction.min_slots_required} slots
                        </td>
                        <td className="px-4 py-3">
                          {restriction.priority_days && restriction.priority_days.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {restriction.priority_days.map(day => (
                                <span key={day} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                                  {day.substring(0, 3)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">All days</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditRestriction(restriction)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRestriction(restriction.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB 4: TIME EXEMPTIONS (RENAMED) */}
        {/* ============================================ */}
        {activeTab === 'exemptions' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">About Time Exemptions:</p>
                  <p>Grant exemptions to specific faculty members to bypass time restrictions for this exam type. Exempted faculty can pick any slot without priority enforcement.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                Manage time exemptions for <strong>{selectedExamTypeName}</strong>
              </p>
              <button
                onClick={() => {
                  setShowExemptionForm(true);
                  setExemptionForm({ faculty_email: '', reason: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Grant Time Exemption
              </button>
            </div>

            {showExemptionForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">Grant Time Exemption</h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faculty Email
                  </label>
                  <select
                    value={exemptionForm.faculty_email}
                    onChange={(e) => setExemptionForm({ ...exemptionForm, faculty_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Faculty</option>
                    {facultyList.map(faculty => (
                      <option key={faculty.email} value={faculty.email}>
                        {faculty.name} ({faculty.email}) - {faculty.cadre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Exemption
                  </label>
                  <textarea
                    value={exemptionForm.reason}
                    onChange={(e) => setExemptionForm({ ...exemptionForm, reason: e.target.value })}
                    rows="3"
                    placeholder="E.g., Medical reasons, administrative duties, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveExemption}
                    disabled={loading || !exemptionForm.faculty_email || !exemptionForm.reason}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-gray-400"
                  >
                    <Save className="w-4 h-4" />
                    Grant
                  </button>
                  <button
                    onClick={() => setShowExemptionForm(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Faculty</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold">Granted By</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exemptions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No time exemptions granted yet.
                      </td>
                    </tr>
                  ) : (
                    exemptions.map((exemption) => (
                      <tr key={exemption.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{exemption.faculty_name}</p>
                            <p className="text-sm text-gray-600">{exemption.faculty_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{exemption.reason}</td>
                        <td className="px-4 py-3 text-sm">{exemption.granted_by}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(exemption.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteExemption(exemption.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove exemption"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}