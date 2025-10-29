import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Save, 
  Edit3, 
  Info, 
  CalendarDays, 
  Loader2, 
  Upload, 
  FileSpreadsheet,
  X,
  Download,
  CheckCircle,
  AlertCircle 
} from "lucide-react";

import config from './config'; // Adjust path based on file location
const API_URL = config.apiUrl;

export default function ExamInfoManagement() {
  const [examInfos, setExamInfos] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [form, setForm] = useState({
    exam_type: "",
    start_date: "",
    end_date: "",
    description: "",
    instructions: "",
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Excel Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedExamTypeForUpload, setSelectedExamTypeForUpload] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch exam types (from backend /exam-types)
  const fetchExamTypes = async () => {
    try {
      const res = await axios.get(`${API_URL}/exam-types`);
      setExamTypes(res.data);
    } catch (err) {
      console.error("Error loading exam types:", err);
    }
  };

  // Fetch all exam infos
  const fetchExamInfos = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/exam-info/all`);
      setExamInfos(res.data);
    } catch (err) {
      console.error("Error loading exam infos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamTypes();
    fetchExamInfos();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEdit = (info) => {
    setForm({
      exam_type: info.exam_type,
      start_date: info.start_date ? info.start_date.split("T")[0] : "",
      end_date: info.end_date ? info.end_date.split("T")[0] : "",
      description: info.description || "",
      instructions: info.instructions || "",
    });
    setEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.exam_type) {
      alert("Please select an exam type");
      return;
    }

    try {
      setSaving(true);
      await axios.post(`${API_URL}/exam-info`, form);
      await fetchExamInfos();
      setForm({
        exam_type: "",
        start_date: "",
        end_date: "",
        description: "",
        instructions: "",
      });
      setEditing(false);
      alert("✅ Exam info saved successfully!");
    } catch (err) {
      console.error("Error saving exam info:", err);
      alert("❌ Failed to save exam info");
    } finally {
      setSaving(false);
    }
  };

  // Excel Upload Functions
  const handleUploadClick = (examType) => {
    setSelectedExamTypeForUpload(examType);
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setUploadFile(selectedFile);
      setUploadError(null);
    } else {
      setUploadError('Please select a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleExcelUpload = async () => {
    if (!uploadFile || !selectedExamTypeForUpload) return;

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('excelFile', uploadFile);

    try {
      const response = await axios.post(
        `${API_URL}/upload-exam-data/${selectedExamTypeForUpload.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      setUploadResult(response.data.results);
      
      // Refresh data after successful upload
      if (response.data.results.sessionsCreated > 0) {
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadResult(null);
        }, 3000);
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const headers = ['Branch', 'Course code', 'Course Name', 'Semester', 'Student Count', 'Date', 'Start Time', 'End Time', 'Rooms required'];
    const sampleData = [
      ['CSE', 'CS101', 'Data Structures', '3', '60', '2025-01-15', '09:00', '12:00', '2'],
      ['ECE', 'EC201', 'Digital Electronics', '4', '45', '2025-01-15', '14:00', '17:00', '2'],
      ['MECH', 'ME301', 'Thermodynamics', '5', '55', '2025-01-16', '09:00', '12:00', '2'],
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam_session_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Info className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            Manage Exam Information
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Exam Type
            </label>
            <select
              name="exam_type"
              value={form.exam_type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select Exam Type</option>
              {examTypes.map((type) => (
                <option key={type.id} value={type.type_name}>
                  {type.type_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="2"
              placeholder="Short summary or context about this exam type"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Instructions / Notes
            </label>
            <textarea
              name="instructions"
              value={form.instructions}
              onChange={handleChange}
              rows="4"
              placeholder="Any special instructions or details for this exam type"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition w-full md:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {editing ? "Update Info" : "Save Info"}
              </>
            )}
          </button>
        </form>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Existing Exam Information
          </h3>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin w-6 h-6 text-indigo-600" />
            </div>
          ) : examInfos.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
              No exam info entries found.
            </p>
          ) : (
            <div className="space-y-4">
              {examInfos.map((info) => {
                // Find the corresponding exam type object
                const examType = examTypes.find(type => type.type_name === info.exam_type);
                
                return (
                  <div
                    key={info.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-indigo-700 text-lg">
                          {info.exam_type}
                        </h4>
                        {info.start_date && (
                          <p className="text-gray-600 text-sm mb-1">
                            📅 {new Date(info.start_date).toLocaleDateString()} →{" "}
                            {new Date(info.end_date).toLocaleDateString()}
                          </p>
                        )}
                        {info.description && (
                          <p className="text-gray-700 text-sm mb-2">
                            {info.description}
                          </p>
                        )}
                        {info.instructions && (
                          <p className="text-gray-600 text-xs bg-white border p-2 rounded-md">
                            {info.instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {examType && (
                          <button
                            onClick={() => handleUploadClick(examType)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-800 transition text-sm font-semibold"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Sessions
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(info)}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition text-sm font-semibold"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedExamTypeForUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    Upload Exam Sessions
                  </h2>
                  <p className="text-sm text-gray-600">
                    For: <span className="font-semibold text-indigo-600">{selectedExamTypeForUpload.type_name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Download Template Button */}
              <div className="mb-4">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Excel Template
                </button>
              </div>

              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center space-x-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <span className="text-gray-700 font-medium">{uploadFile.name}</span>
                    <button
                      onClick={() => setUploadFile(null)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      Drag and drop your Excel file here, or
                    </p>
                    <label className="cursor-pointer">
                      <span className="text-indigo-600 hover:text-indigo-800 underline font-medium">
                        browse files
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: .xlsx, .xls
                    </p>
                  </>
                )}
              </div>

              {/* Error Display */}
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <span className="text-red-700 text-sm">{uploadError}</span>
                </div>
              )}

              {/* Upload Result */}
              {uploadResult && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-800">Upload Successful!</span>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✅ Courses Created: {uploadResult.coursesCreated}</li>
                    <li>✅ Courses Updated: {uploadResult.coursesUpdated}</li>
                    <li>✅ Sessions Created: {uploadResult.sessionsCreated}</li>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <li className="text-red-600 mt-2">
                        ⚠️ Errors: {uploadResult.errors.length} row(s) had issues
                        {uploadResult.errors.slice(0, 3).map((error, idx) => (
                          <div key={idx} className="text-xs mt-1 ml-4">
                            • {error}
                          </div>
                        ))}
                        {uploadResult.errors.length > 3 && (
                          <div className="text-xs mt-1 ml-4">
                            ... and {uploadResult.errors.length - 3} more
                          </div>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleExcelUpload}
                disabled={!uploadFile || uploading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  !uploadFile || uploading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Excel File
                  </>
                )}
              </button>

              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 text-sm mb-2">Instructions:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Excel should contain: Branch, Course code, Course Name, Semester, Student Count, Date, Start Time, End Time, Rooms required</li>
                  <li>• Date format: YYYY-MM-DD (e.g., 2025-01-15)</li>
                  <li>• Time format: HH:MM (24-hour format, e.g., 09:00, 14:30)</li>
                  <li>• Student Count and Rooms required should be numbers</li>
                  <li>• Semester should be between 1-8</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}