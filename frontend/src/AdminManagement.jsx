// AdminManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExcelUpload from './ExcelUpload.jsx';
import { Plus, Edit2, Trash2, X, Save, Calendar, BookOpen, Users, Building, Clock, Info, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

import config from './config'; // Adjust path based on file location
const API_URL = config.apiUrl;

export default function AdminManagement() {
  const [activeTab, setActiveTab] = useState('exam-types');
  const [data, setData] = useState([]);
  const [courses, setCourses] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedExamTypeFilter, setSelectedExamTypeFilter] = useState('');

  // Load initial data for the active tab
  useEffect(() => {
    fetchData();
    fetchCourses();
    fetchExamTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
  if (activeTab === 'courses' || activeTab === 'sessions') {
    fetchData();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedExamTypeFilter]);

useEffect(() => {
  if (modalMode === 'edit' && currentItem) {
    setFormData(mapItemToForm(currentItem));
  }
}, [modalMode, currentItem]);

useEffect(() => {
  if (!formData.course_id && courses.length && formData.course_name) {
    const match = courses.find(c => c.course_name === formData.course_name);
    if (match) setFormData(f => ({ ...f, course_id: match.id }));
  }
}, [courses, formData.course_name]);

useEffect(() => {
  // Auto-fill rooms_required based on assigned rooms (if backend sends them)
  if (!formData.rooms_required && Array.isArray(formData.rooms) && formData.rooms.length > 0) {
    setFormData(f => ({ ...f, rooms_required: formData.rooms.length }));
  }
}, [formData.rooms]);

// Auto-select next upcoming exam type when on sessions tab
useEffect(() => {
  if (activeTab === 'sessions' && examTypes.length > 0 && !selectedExamTypeFilter) {
    const now = new Date();
    
    // Find the next upcoming exam type based on selection_start
    const upcomingExam = examTypes
      .filter(et => et.selection_start && new Date(et.selection_start) >= now)
      .sort((a, b) => new Date(a.selection_start) - new Date(b.selection_start))[0];
    
    // If no upcoming exam, get the most recent one
    const defaultExam = upcomingExam || examTypes
      .filter(et => et.selection_start)
      .sort((a, b) => new Date(b.selection_start) - new Date(a.selection_start))[0];
    
    if (defaultExam) {
      setSelectedExamTypeFilter(defaultExam.id);
    }
  }
}, [activeTab, examTypes]);



  // -------------------------
  // Fetchers
  // -------------------------
  const fetchData = async () => {
  setLoading(true);
  try {
    let endpoint = '';

    if (activeTab === 'courses') {
      endpoint = selectedExamTypeFilter
        ? `/courses/by-exam-type/${selectedExamTypeFilter}`
        : '/courses';
    } else if (activeTab === 'sessions') {
      endpoint = selectedExamTypeFilter
        ? `/exam-data/${selectedExamTypeFilter}`
        : '/all-sessions';
    } else {
      switch (activeTab) {
        case 'exam-types':
          endpoint = '/exam-types';
          break;
        case 'faculty':
          endpoint = '/faculty';
          break;
        case 'rooms':
          endpoint = '/rooms';
          break;
        case 'exam-info':
          endpoint = '/exam-info/all';
          break;
        default:
          endpoint = '/exam-types';
      }
    }

    const response = await axios.get(`${API_URL}${endpoint}`);

    // 🧠 Normalize different API response formats
    let responseData = response.data;

    // If sessions tab, unwrap `.sessions` array
    if (activeTab === 'sessions' && responseData && Array.isArray(responseData.sessions)) {
      responseData = responseData.sessions;
    }

    // If courses tab, ensure it's an array
    if (activeTab === 'courses' && responseData && !Array.isArray(responseData)) {
      responseData = [];
    }

    setData(responseData || []);
  } catch (err) {
    console.error('Error fetching data:', err);
    alert('Failed to fetch data');
    setData([]);
  } finally {
    setLoading(false);
  }
};



  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses`);
      setCourses(response.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setCourses([]);
    }
  };

  const fetchExamTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/exam-types`);
      setExamTypes(response.data || []);
    } catch (err) {
      console.error('Error fetching exam types:', err);
      setExamTypes([]);
    }
  };

  // -------------------------
  // Excel Export Function
  // -------------------------
  const exportFacultyToExcel = () => {
    if (data.length === 0) {
      alert('No faculty data to export');
      return;
    }

    // Prepare data for Excel export
    const exportData = data.map(faculty => ({
      Name: faculty.name || '',
      Email: faculty.email || '',
      Cadre: faculty.cadre || '',
      Department: faculty.department || '',
      Initial: faculty.initials || ''
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faculty');
    
    // Generate Excel file and download
    const fileName = `Faculty_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // -------------------------
  // Modal & form helpers
  // -------------------------
  const openCreateModal = () => {
    setModalMode('create');
    setCurrentItem(null);
    setFormData(getEmptyFormData());
    setShowModal(true);
  };

const openEditModal = (item) => {
  console.log("Editing item:", item); // 👈 check this in DevTools Console
  setModalMode('edit');
  setCurrentItem(item);
  const mapped = mapItemToForm(item);
  setFormData(mapped);
  setShowModal(true);
};



  const closeModal = () => {
    setShowModal(false);
    setCurrentItem(null);
    setFormData({});
  };

const mapItemToForm = (item) => {
  if (!item) return {};

  const mapped = { ...item };

  // ---------- Handle Exam Sessions ----------
  if ('session_date' in mapped) {
    // normalize date
    if (mapped.session_date?.includes('/')) {
      const [day, month, year] = mapped.session_date.split('/');
      mapped.session_date = `${year}-${month}-${day}`;
    } else if (mapped.session_date?.includes('T')) {
      mapped.session_date = mapped.session_date.slice(0, 10);
    }

    // normalize time
    const normalizeTime = (t) => {
      if (!t) return '';
      if (t.includes('AM') || t.includes('PM')) {
        const d = new Date(`1970-01-01 ${t}`);
        return isNaN(d.getTime()) ? t.slice(0, 5) : d.toTimeString().slice(0, 5);
      }
      return t.slice(0, 5);
    };
    mapped.start_time = normalizeTime(mapped.start_time);
    mapped.end_time = normalizeTime(mapped.end_time);

    // ensure correct mapping for dropdowns
    if (!mapped.course_id && mapped.course && mapped.course.id) {
      mapped.course_id = mapped.course.id;
    }
    if (!mapped.exam_type_id && mapped.exam_type && mapped.exam_type.id) {
      mapped.exam_type_id = mapped.exam_type.id;
    }

    // ✅ Ensure rooms_required is retained or inferred
    if (Array.isArray(mapped.rooms) && mapped.rooms.length > 0) {
      // if backend sends assigned rooms list, use its count
      mapped.rooms_required = mapped.rooms.length.toString();
    } else if (mapped.rooms_required != null) {
      // if backend sends number directly
      mapped.rooms_required = String(mapped.rooms_required);
    } else {
      mapped.rooms_required = '';
    }
  }

  // ---------- Handle Exam Types ----------
  if ('selection_start' in mapped) {
    if (mapped.selection_start) mapped.selection_start = mapped.selection_start.slice(0, 16);
    if (mapped.selection_deadline) mapped.selection_deadline = mapped.selection_deadline.slice(0, 16);
  }

  return mapped;
};





  const getEmptyFormData = () => {
    switch (activeTab) {
      case 'exam-types':
        return { type_name: '', description: '', is_active: true, selection_start: '', selection_deadline: '' };
      case 'courses':
        return { branch: '', course_code: '', course_name: '', semester: '', student_count: '' };
      case 'faculty':
        return { name: '', email: '', cadre: '', department: '', initials: '' };
      case 'rooms':
        return { room_code: '', capacity: '', location: '' };
      case 'sessions':
        return { course_id: '', exam_type_id: '', session_date: '', start_time: '', end_time: '', rooms_required: '', status: 'open' };
      case 'exam-info':
        // **REMOVED** start_date and end_date from form per your request
        return { exam_type: '', description: '', instructions: '' };
      default:
        return {};
    }
  };

  // -------------------------
  // Submit / Delete handlers
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Pick endpoint base for admin CRUD (we implement admin endpoints under /api/admin/...)
      let endpointBase = '';
      switch (activeTab) {
        case 'exam-types':
          endpointBase = '/admin/exam-types';
          break;
        case 'courses':
          endpointBase = '/admin/courses';
          break;
        case 'faculty':
          endpointBase = '/admin/faculty';
          break;
        case 'rooms':
          endpointBase = '/admin/rooms';
          break;
        case 'sessions':
          endpointBase = '/admin/exam-sessions';
          break;
        case 'exam-info':
          endpointBase = '/exam-info'; // shared non-admin endpoints: POST /api/exam-info and GET /api/exam-info/all
          break;
        default:
          endpointBase = '/admin/exam-types';
      }

      if (modalMode === 'create') {
        // POST
        await axios.post(`${API_URL}${endpointBase}`, cleanPayloadForCreate(formData));
        alert('Created successfully!');
      } else {
        // PUT
        const id = currentItem?.id;
        if (!id) {
          alert('Missing item id for update');
        } else {
          await axios.post(`${API_URL}${endpointBase}`, cleanPayloadForCreate(formData));
          alert('Updated successfully!');
        }
      }

      closeModal();
      fetchData();
    } catch (err) {
      console.error('Error saving data:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save data';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    setLoading(true);
    try {
      let endpointBase = '';
      switch (activeTab) {
        case 'exam-types':
          endpointBase = '/admin/exam-types';
          break;
        case 'courses':
          endpointBase = '/admin/courses';
          break;
        case 'faculty':
          endpointBase = '/admin/faculty';
          break;
        case 'rooms':
          endpointBase = '/admin/rooms';
          break;
        case 'sessions':
          endpointBase = '/admin/exam-sessions';
          break;
        case 'exam-info':
          endpointBase = '/exam-info'; // we will call DELETE /api/exam-info/:examType (we'll use exam_type string or id). We'll use the row id for delete if server supports it.
          break;
        default:
          endpointBase = '/admin/exam-types';
      }

      // For exam-info delete, server will accept /api/exam-info/:id (we implemented it server-side)
      await axios.delete(`${API_URL}${endpointBase}/${id}`);
      alert('Deleted successfully!');
      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      const msg = err.response?.data?.error || 'Failed to delete';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const cleanPayloadForCreate = (payload) => {
    // Remove empty strings where backend expects nulls; also remove selection_start/selection_deadline if empty
    const p = { ...payload };

    // For exam-info, ensure start_date & end_date are not included (user requested removal)
    if (activeTab === 'exam-info') {
      delete p.start_date;
      delete p.end_date;
    }

    // For exam-types, sometimes selection fields are optional; keep what's present
    // Convert boolean checkbox to true/false explicitly
    if (activeTab === 'exam-types') {
      p.is_active = !!p.is_active;
    }

    return p;
  };

  // -------------------------
  // Render helpers
  // -------------------------
  const renderTable = () => {
    switch (activeTab) {
      case 'exam-types':
        return <ExamTypesTable data={data} onEdit={openEditModal} onDelete={handleDelete} />;
      case 'upload-excel':
  return (
    <div className="p-6">
      <ExcelUpload onUploadSuccess={() => alert('Excel data uploaded successfully!')} />
    </div>
  );

      case 'courses':
        return <CoursesTable data={data} onEdit={openEditModal} onDelete={handleDelete} />;
      case 'faculty':
        return <FacultyTable data={data} onEdit={openEditModal} onDelete={handleDelete} />;
      case 'rooms':
        return <RoomsTable data={data} onEdit={openEditModal} onDelete={handleDelete} />;
      case 'sessions':
        return <SessionsTable data={data} onEdit={openEditModal} onDelete={handleDelete} />;
      case 'exam-info':
        return <ExamInfoTable data={data} onEdit={openEditModal} onDelete={handleDelete} />;
      default:
        return null;
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'exam-types':
        return <ExamTypeForm formData={formData} setFormData={setFormData} />;
      case 'courses':
        return <CourseForm formData={formData} setFormData={setFormData} />;
      case 'faculty':
        return <FacultyForm formData={formData} setFormData={setFormData} existingData={data} modalMode={modalMode} currentItem={currentItem} />;
      case 'rooms':
        return <RoomForm formData={formData} setFormData={setFormData} />;
      case 'sessions':
        return <SessionForm formData={formData} setFormData={setFormData} courses={courses} examTypes={examTypes} />;
      case 'exam-info':
        return <ExamInfoForm formData={formData} setFormData={setFormData} examTypes={examTypes} />;
      default:
        return null;
    }
  };

  // Tabs array
  const tabs = [
    { id: 'exam-types', label: 'Exam Types', icon: <Calendar className="w-4 h-4" /> },
    { id: 'upload-excel', label: 'Upload Excel', icon: <Upload className="w-4 h-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'faculty', label: 'Faculty', icon: <Users className="w-4 h-4" /> },
    { id: 'rooms', label: 'Rooms', icon: <Building className="w-4 h-4" /> },
    { id: 'sessions', label: 'Exam Sessions', icon: <Clock className="w-4 h-4" /> },
    { id: 'exam-info', label: 'Exam Info', icon: <Info className="w-4 h-4" /> },

  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Management</h1>
          <p className="text-gray-600">Manage system data</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add New Button & Export Button — hide for Upload Excel tab */}
{activeTab !== 'upload-excel' && (
  <div className="mb-6 flex gap-4">
    <button
      onClick={openCreateModal}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition"
    >
      <Plus className="w-5 h-5" />
      Add New {tabs.find(t => t.id === activeTab)?.label.replace(/s$/, '')}
    </button>
    
    {/* Export to Excel button - only for faculty tab */}
    {activeTab === 'faculty' && (
      <button
        onClick={exportFacultyToExcel}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
      >
        <Download className="w-5 h-5" />
        Export to Excel
      </button>
    )}
  </div>
)}
          {/* Exam Type Filter - visible only for Courses and Exam Sessions */}
{/* Exam Type Filter - visible only for Courses and Exam Sessions */}
{(activeTab === 'courses' || activeTab === 'sessions') && (
  <div className="flex items-center gap-3 mb-4">
    <label className="text-sm font-semibold text-gray-700">
      Filter by Exam Type:
    </label>
    <select
      value={selectedExamTypeFilter}
      onChange={(e) => {
        setSelectedExamTypeFilter(e.target.value);
      }}
      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
    >
      <option value="">All Exam Types</option>
      {examTypes.map((t) => (
        <option key={t.id} value={t.id}>
          {t.type_name}
        </option>
      ))}
    </select>
  </div>
)}



        {/* Table container */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            renderTable()
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">
                  {modalMode === 'create' ? 'Create New' : 'Edit'} {tabs.find(t => t.id === activeTab)?.label.replace(/s$/, '')}
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {renderForm()}

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold px-6 py-2 rounded-lg transition"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   TABLE COMPONENTS (expanded)
   ====================================================================== */

function ExamTypesTable({ data = [], onEdit, onDelete }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left font-semibold">Type Name</th>
          <th className="px-6 py-3 text-left font-semibold">Description</th>
          <th className="px-6 py-3 text-center font-semibold">Status</th>
          <th className="px-6 py-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="4" className="p-6 text-center text-gray-500">No exam types found.</td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-semibold">{item.type_name}</td>
              <td className="px-6 py-4 text-sm">
  {formatTime(item.start_time)} – {formatTime(item.end_time)}
</td>

              <td className="px-6 py-4 text-center">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function CoursesTable({ data = [], onEdit, onDelete }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left font-semibold">Branch</th>
          <th className="px-6 py-3 text-left font-semibold">Course Code</th>
          <th className="px-6 py-3 text-left font-semibold">Course Name</th>
          <th className="px-6 py-3 text-center font-semibold">Semester</th>
          <th className="px-6 py-3 text-center font-semibold">Students</th>
          <th className="px-6 py-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="6" className="p-6 text-center text-gray-500">No courses found.</td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-semibold">{item.branch}</td>
              <td className="px-6 py-4">{item.course_code}</td>
              <td className="px-6 py-4">{item.course_name}</td>
              <td className="px-6 py-4 text-center">{item.semester}</td>
              <td className="px-6 py-4 text-center">{item.student_count ?? 0}</td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function FacultyTable({ data = [], onEdit, onDelete }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left font-semibold">Name</th>
          <th className="px-6 py-3 text-left font-semibold">Email</th>
          <th className="px-6 py-3 text-left font-semibold">Cadre</th>
          <th className="px-6 py-3 text-left font-semibold">Department</th>
          <th className="px-6 py-3 text-left font-semibold">Initial</th>
          <th className="px-6 py-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="6" className="p-6 text-center text-gray-500">No faculty found.</td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-semibold">{item.name}</td>
              <td className="px-6 py-4">{item.email}</td>
              <td className="px-6 py-4">{item.cadre}</td>
              <td className="px-6 py-4">{item.department}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-semibold">
                  {item.initials || '-'}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function RoomsTable({ data = [], onEdit, onDelete }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left font-semibold">Room Code</th>
          <th className="px-6 py-3 text-center font-semibold">Capacity</th>
          <th className="px-6 py-3 text-left font-semibold">Location</th>
          <th className="px-6 py-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="4" className="p-6 text-center text-gray-500">No rooms found.</td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-semibold">{item.room_code}</td>
              <td className="px-6 py-4 text-center">{item.capacity}</td>
              <td className="px-6 py-4">{item.location || '-'}</td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function SessionsTable({ data = [], onEdit, onDelete }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left font-semibold">Date</th>
          <th className="px-6 py-3 text-left font-semibold">Course</th>
          <th className="px-6 py-3 text-left font-semibold">Code</th>
          <th className="px-6 py-3 text-left font-semibold">Time</th>
          <th className="px-6 py-3 text-center font-semibold">Rooms Required</th>
          <th className="px-6 py-3 text-center font-semibold">Status</th>
          <th className="px-6 py-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="7" className="p-6 text-center text-gray-500">No sessions found.</td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4">{formatDate(item.session_date)}</td>
              <td className="px-6 py-4 font-semibold">{item.course_name}</td>
              <td className="px-6 py-4 text-sm">{item.course_code}</td>
              <td className="px-6 py-4 text-sm">{`${item.start_time || '-'} - ${item.end_time || '-'}`}</td>
              <td className="px-6 py-4 text-center">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                  {item.rooms_required || 0}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {item.status || 'open'}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function ExamInfoTable({ data = [], onEdit, onDelete }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left font-semibold">Exam Type</th>
          <th className="px-6 py-3 text-left font-semibold">Description</th>
          <th className="px-6 py-3 text-left font-semibold">Instructions</th>
          <th className="px-6 py-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="4" className="p-6 text-center text-gray-500">No exam info entries yet.</td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-semibold">{item.exam_type}</td>
              <td className="px-6 py-4 text-sm">{(item.description || '').slice(0, 120) || '-'}</td>
              <td className="px-6 py-4 text-sm">{(item.instructions || '').slice(0, 120) || '-'}</td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/* ======================================================================
   FORM COMPONENTS (expanded)
   ====================================================================== */

function ExamTypeForm({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Type Name *</label>
        <input
          type="text"
          required
          value={formData.type_name || ''}
          onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="e.g., Mid-Sem, End-Sem"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          rows="3"
          placeholder="Optional description"
        />
      </div>

      {/* selection_start and selection_deadline are present in model but optional;
          if you truly want them removed from every place remove the two fields below.
          For now they stay but you may remove them by editing getEmptyFormData above. */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Selection Start (optional)</label>
          <input
            type="datetime-local"
            value={formData.selection_start || ''}
            onChange={(e) => setFormData({ ...formData, selection_start: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Selection Deadline (optional)</label>
          <input
            type="datetime-local"
            value={formData.selection_deadline || ''}
            onChange={(e) => setFormData({ ...formData, selection_deadline: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={formData.is_active !== false}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4"
          />
          Active
        </label>
      </div>
    </div>
  );
}

function CourseForm({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Branch *</label>
        <input type="text" required value={formData.branch || ''} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., CSE" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Course Code *</label>
        <input type="text" required value={formData.course_code || ''} onChange={(e) => setFormData({ ...formData, course_code: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., CS101" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name *</label>
        <input type="text" required value={formData.course_name || ''} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Data Structures" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Semester *</label>
        <input type="number" required min="1" max="12" value={formData.semester || ''} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., 1" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Student Count</label>
        <input type="number" min="0" value={formData.student_count || ''} onChange={(e) => setFormData({ ...formData, student_count: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., 60" />
      </div>
    </div>
  );
}

function FacultyForm({ formData, setFormData, existingData = [], modalMode, currentItem }) {
  const [initialsError, setInitialsError] = useState('');

  const validateInitials = (value) => {
    if (!value || value.trim() === '') {
      setInitialsError('');
      return;
    }

    // Check if initials already exist (excluding current item in edit mode)
    const isDuplicate = existingData.some(faculty => {
      const isSameInitials = faculty.initials && faculty.initials.toLowerCase() === value.toLowerCase();
      const isDifferentItem = modalMode === 'edit' ? faculty.id !== currentItem?.id : true;
      return isSameInitials && isDifferentItem;
    });

    if (isDuplicate) {
      setInitialsError('This initial is already taken by another faculty member');
    } else {
      setInitialsError('');
    }
  };

  const handleInitialsChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, initials: value });
    validateInitials(value);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
        <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Dr. John Doe" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
        <input type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., john@college.edu" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Cadre</label>
        <select value={formData.cadre || ''} onChange={(e) => setFormData({ ...formData, cadre: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
          <option value="">Select Cadre</option>
          <option value="Professor">Professor</option>
          <option value="Associate Professor">Associate Professor</option>
          <option value="Assistant Professor">Assistant Professor</option>
          <option value="Lecturer">Lecturer</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Department *</label>
        <input type="text" required value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Computer Science" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Initial *</label>
        <input 
          type="text" 
          required 
          maxLength="10"
          value={formData.initials || ''} 
          onChange={handleInitialsChange}
          className={`w-full px-4 py-2 border rounded-lg ${initialsError ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="e.g., JD" 
        />
        {initialsError && (
          <p className="mt-1 text-sm text-red-600">{initialsError}</p>
        )}
      </div>
    </div>
  );
}

function RoomForm({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Room Code *</label>
        <input type="text" required value={formData.room_code || ''} onChange={(e) => setFormData({ ...formData, room_code: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., A101" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity *</label>
        <input type="number" required min="1" value={formData.capacity || ''} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., 30" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
        <input type="text" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Main Block" />
      </div>
    </div>
  );
}

function SessionForm({ formData, setFormData, courses = [], examTypes = [] }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Course *</label>
        <select required value={formData.course_id || ''} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
          <option value="">Select Course</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} - {c.course_name} (Sem {c.semester})</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type *</label>
        <select required value={formData.exam_type_id || ''} onChange={(e) => setFormData({ ...formData, exam_type_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
          <option value="">Select Exam Type</option>
          {examTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Session Date *</label>
        <input type="date" required value={formData.session_date || ''} onChange={(e) => setFormData({ ...formData, session_date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time *</label>
          <input type="time" required value={formData.start_time || ''} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">End Time *</label>
          <input type="time" required value={formData.end_time || ''} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Rooms Required *</label>
        <input type="number" required min="1" value={formData.rooms_required || ''} onChange={(e) => setFormData({ ...formData, rooms_required: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
        <select value={formData.status || 'open'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
  );
}

/* ======================================================================
   EXAM INFO FORM (no start_date/end_date)
   Per your request: completely remove start_date and end_date fields
   ====================================================================== */
function ExamInfoForm({ formData, setFormData, examTypes = [] }) {
  return (
    <div className="space-y-4">

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type *</label>
        <select required value={formData.exam_type || ''} onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
          <option value="">Select Exam Type</option>
          {examTypes.map(t => <option key={t.id} value={t.type_name}>{t.type_name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
        <textarea rows="2" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Summary" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
        <textarea rows="4" value={formData.instructions || ''} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Instructions for faculty" />
      </div>

      {/* Live preview */}
      {formData.exam_type && (
        <div className="mt-4 p-3 border rounded bg-indigo-50">
          <h4 className="font-semibold">{formData.exam_type}</h4>
          <p className="text-sm text-gray-700 mt-2">{formData.description || 'No description'}</p>
          {formData.instructions && <div className="mt-2 text-sm text-gray-600 p-2 bg-white rounded">{formData.instructions}</div>}
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   Small utilities
   ====================================================================== */
function formatDate(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return iso;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  try {
    const date = new Date(`1970-01-01T${timeStr}`);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeStr;
  }
}