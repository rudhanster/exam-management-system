import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, User, X, AlertCircle, CheckCircle, Plus, Search } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

export default function AdminAssignments() {
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  // New Assignment States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyResults, setFacultyResults] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);

  useEffect(() => {
    fetchExamTypes();
  }, []);

  useEffect(() => {
    if (selectedExamType) {
      fetchAssignments();
    }
  }, [selectedExamType]);

  // Debounced faculty search
  useEffect(() => {
    if (facultySearch.length >= 2) {
      const timer = setTimeout(() => {
        searchFaculty(facultySearch);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setFacultyResults([]);
    }
  }, [facultySearch]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && selectedExamType) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedExamType]);

  // Fetch courses when time slot is selected
  useEffect(() => {
    if (selectedTimeSlot && selectedDate) {
      fetchAvailableCourses();
    }
  }, [selectedTimeSlot]);

  const fetchExamTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/exam-types`);
      setExamTypes(response.data);
      if (response.data.length > 0) {
        setSelectedExamType(response.data[0]);
      }
    } catch (err) {
      console.error('Error fetching exam types:', err);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedExamType) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/assignments`, {
        params: { exam_type_id: selectedExamType.id }
      });
      setAssignments(response.data);
      console.log('📋 Assignments loaded:', response.data.length);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      alert('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/available-slots`, {
        params: {
          exam_type_id: selectedExamType.id,
          date: selectedDate
        }
      });
      setAvailableSlots(response.data);
    } catch (err) {
      console.error('Error fetching available slots:', err);
      alert('Failed to load available slots');
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/available-courses`, {
        params: {
          start_time: selectedTimeSlot.start_time,
          end_time: selectedTimeSlot.end_time,
          date: selectedDate
        }
      });
      setAvailableCourses(response.data);
    } catch (err) {
      console.error('Error fetching courses:', err);
      alert('Failed to load courses');
    }
  };

  const searchFaculty = async (query) => {
    try {
      const response = await axios.get(`${API_URL}/admin/search-faculty`, {
        params: { query }
      });
      setFacultyResults(response.data);
      setShowFacultyDropdown(true);
    } catch (err) {
      console.error('Error searching faculty:', err);
    }
  };

  const handleAssignClick = () => {
    setShowAssignModal(true);
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedTimeSlot(null);
    setAvailableCourses([]);
    setSelectedCourse(null);
    setFacultySearch('');
    setSelectedFaculty(null);
    setFacultyResults([]);
  };

  const handleAssignSubmit = async () => {
    if (!selectedCourse || !selectedFaculty) {
      alert('Please fill all fields');
      return;
    }

    if (!confirm(`Assign ${selectedFaculty.name} to ${selectedCourse.course_code}?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/admin/assign-duty`, {
        slot_id: selectedCourse.slot_id,
        faculty_id: selectedFaculty.id
      });

      alert(`✅ Duty assigned to ${selectedFaculty.name}`);
      setShowAssignModal(false);
      await fetchAssignments();
    } catch (err) {
      console.error('Error assigning duty:', err);
      alert(err.response?.data?.error || 'Failed to assign duty');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseClick = (assignment) => {
    setSelectedSlot(assignment);
    setReleaseReason('');
  };

  const handleRelease = async () => {
    if (!selectedSlot) return;

    if (!confirm(`⚠️ Release duty from ${selectedSlot.faculty_name}?\n\nThis will free up the slot for reassignment.`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/admin/release-duty`, {
        slot_id: selectedSlot.slot_id,
        session_id: selectedSlot.session_id,
        reason: releaseReason || 'Admin override'
      });

      alert(`✅ Duty released from ${selectedSlot.faculty_name}`);
      setSelectedSlot(null);
      setReleaseReason('');
      await fetchAssignments();
    } catch (err) {
      console.error('Error releasing duty:', err);
      alert(err.response?.data?.error || 'Failed to release duty');
    } finally {
      setLoading(false);
    }
  };

  // Group by date
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const date = new Date(assignment.session_date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Faculty Duty Assignments</h2>
          <p className="text-gray-600">View and manage all duty assignments</p>
        </div>
        <button
          onClick={handleAssignClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Assign Duty
        </button>
      </div>

      {/* Exam Type Filter */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select Exam Type
        </label>
        <select
          value={selectedExamType?.id || ''}
          onChange={(e) => {
            const examType = examTypes.find(et => et.id === e.target.value);
            setSelectedExamType(examType);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          {examTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.type_name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <p className="text-blue-600 text-sm font-semibold">Total Assignments</p>
          <p className="text-3xl font-bold text-blue-900">{assignments.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <p className="text-green-600 text-sm font-semibold">Confirmed</p>
          <p className="text-3xl font-bold text-green-900">
            {assignments.filter(a => a.confirmation_status === 'confirmed').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
          <p className="text-yellow-600 text-sm font-semibold">Not Confirmed</p>
          <p className="text-3xl font-bold text-yellow-900">
            {assignments.filter(a => a.confirmation_status === 'not_confirmed').length}
          </p>
        </div>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No assignments found for this exam type</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAssignments).map(([date, dateAssignments]) => (
            <div key={date} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-indigo-600 text-white px-6 py-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <h3 className="text-lg font-bold">{date}</h3>
                <span className="ml-auto text-indigo-100">
                  {dateAssignments.length} assignment{dateAssignments.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Course</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Faculty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Room</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dateAssignments.map((assignment) => (
                      <tr key={assignment.slot_id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {assignment.start_time.substring(0, 5)} - {assignment.end_time.substring(0, 5)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{assignment.course_code}</p>
                            <p className="text-sm text-gray-600">{assignment.course_name}</p>
                            <p className="text-xs text-gray-500">{assignment.branch}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-900">{assignment.faculty_name}</p>
                              <p className="text-sm text-gray-600">{assignment.faculty_email}</p>
                              <p className="text-xs text-gray-500">{assignment.cadre} • {assignment.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {assignment.room_code ? (
                            <>
                              <p className="font-medium text-gray-900">{assignment.room_code}</p>
                              <p className="text-xs text-gray-500">{assignment.location}</p>
                            </>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {assignment.confirmation_status === 'confirmed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              <CheckCircle className="w-3 h-3" />
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                              <AlertCircle className="w-3 h-3" />
                              Not Confirmed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleReleaseClick(assignment)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded transition"
                          >
                            <X className="w-4 h-4" />
                            Release
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Duty Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Assign New Duty</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Step 1: Select Date */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                1. Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTimeSlot(null);
                  setSelectedCourse(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Step 2: Select Time Slot */}
            {selectedDate && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  2. Select Time Slot
                </label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No available slots for this date</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedTimeSlot(slot);
                          setSelectedCourse(null);
                        }}
                        className={`p-3 text-left border-2 rounded-lg transition ${
                          selectedTimeSlot?.start_time === slot.start_time && selectedTimeSlot?.end_time === slot.end_time
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">
                            {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                          </span>
                          <span className="ml-auto text-sm text-gray-600">
                            {slot.available_count} slots available
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Course */}
            {selectedTimeSlot && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  3. Select Course
                </label>
                {availableCourses.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No available courses for this slot</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {availableCourses.map((course) => (
                      <button
                        key={course.slot_id}
                        onClick={() => setSelectedCourse(course)}
                        className={`w-full p-3 text-left border-2 rounded-lg transition ${
                          selectedCourse?.slot_id === course.slot_id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 hover:border-indigo-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{course.course_code}</p>
                        <p className="text-sm text-gray-600">{course.course_name}</p>
                        <p className="text-xs text-gray-500">{course.branch} • Room: {course.room_code || 'TBA'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Search and Select Faculty */}
            {selectedCourse && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  4. Search and Select Faculty
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={facultySearch}
                      onChange={(e) => {
                        setFacultySearch(e.target.value);
                        setSelectedFaculty(null);
                      }}
                      onFocus={() => facultyResults.length > 0 && setShowFacultyDropdown(true)}
                      placeholder="Type faculty name or email..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Faculty Dropdown */}
                  {showFacultyDropdown && facultyResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {facultyResults.map((faculty) => (
                        <button
                          key={faculty.id}
                          onClick={() => {
                            setSelectedFaculty(faculty);
                            setFacultySearch(faculty.name);
                            setShowFacultyDropdown(false);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-semibold text-gray-900">{faculty.name}</p>
                          <p className="text-sm text-gray-600">{faculty.email}</p>
                          <p className="text-xs text-gray-500">
                            {faculty.cadre} • {faculty.department}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Faculty Display */}
                  {selectedFaculty && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedFaculty.name}
                      </p>
                      <p className="text-xs text-green-600">{selectedFaculty.email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                disabled={!selectedCourse || !selectedFaculty || loading}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
              >
                {loading ? 'Assigning...' : 'Assign Duty'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Release Duty</h3>
            
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Faculty:</strong> {selectedSlot.faculty_name}<br />
                <strong>Course:</strong> {selectedSlot.course_code}<br />
                <strong>Time:</strong> {selectedSlot.start_time.substring(0, 5)} - {selectedSlot.end_time.substring(0, 5)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Release (Optional)
              </label>
              <textarea
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                rows="3"
                placeholder="e.g., Faculty emergency, schedule conflict..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRelease}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
              >
                {loading ? 'Releasing...' : 'Release Duty'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}