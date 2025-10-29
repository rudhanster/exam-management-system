import React, { useState, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

import config from './config'; // Adjust path based on file location
const API_URL = config.apiUrl;

const ExcelUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('');

  // Fetch exam types
  useEffect(() => {
    fetchExamTypes();
  }, []);

  const fetchExamTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/exam-types`);
      setExamTypes(response.data || []);
    } catch (err) {
      console.error('Error fetching exam types:', err);
      setExamTypes([]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an Excel file before uploading.');
      return;
    }
    if (!selectedExamType) {
      setError('Please select an Exam Type before uploading.');
      return;
    }

    // ✅ Validate UUID format
    const uuidRegex = /^[0-9a-fA-F-]{36}$/;
    if (!uuidRegex.test(selectedExamType)) {
      setError(`Invalid Exam Type ID: ${selectedExamType}`);
      console.error('❌ Invalid selectedExamType (not UUID):', selectedExamType);
      return;
    }

    console.log('✅ Uploading file for ExamType:', selectedExamType);

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      const response = await fetch(`${API_URL}/upload-exam-data/${selectedExamType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        console.warn('⚠️ Response not valid JSON:', err, text);
      }

      if (response.ok) {
        setUploadResult(data.results || {});
        if (onUploadSuccess) onUploadSuccess(data);
        setFile(null);
      } else {
        const msg = data.error || data.message || 'Upload failed';
        setError(msg);
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Branch', 'Course code', 'Course Name', 'Semester', 'Student Count', 'Date', 'Start Time', 'End Time', 'Rooms required'],
      ['CSE', 'CS101', 'Data Structures', '3', '60', '2025-01-15', '09:00', '12:00', '2'],
      ['ECE', 'EC201', 'Digital Electronics', '4', '45', '2025-01-15', '14:00', '17:00', '2'],
    ];

    const csv = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Exam Data</h3>
        <button
          onClick={downloadTemplate}
          className="text-blue-600 hover:text-blue-800 text-sm underline"
        >
          Download Template
        </button>
      </div>

      {/* Exam Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select Exam Type *
        </label>
        <select
          value={selectedExamType}
          onChange={(e) => setSelectedExamType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">-- Select Exam Type --</option>
          {examTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.type_name}
            </option>
          ))}
        </select>
      </div>

      {/* Drop Zone */}
      {selectedExamType ? (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <span className="text-gray-700">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">Drag and drop your Excel file here, or</p>
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-800 underline">browse</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </label>
              </>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`mt-4 w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              !file || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Excel File'}
          </button>
        </>
      ) : (
        <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
          Please select an exam type to enable upload.
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-semibold text-green-800">
              Upload Successful for{' '}
              {examTypes.find((t) => t.id === selectedExamType)?.type_name || 'Selected Exam Type'}!
            </span>
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Courses Created: {uploadResult.coursesCreated}</li>
            <li>Courses Updated: {uploadResult.coursesUpdated}</li>
            <li>Sessions Created: {uploadResult.sessionsCreated}</li>
            {uploadResult.errors?.length > 0 && (
              <div className="mt-3">
                <details className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <summary className="cursor-pointer font-semibold text-red-700">
                    ⚠️ {uploadResult.errors.length} row(s) had issues (click to expand)
                  </summary>
                  <ul className="mt-2 text-sm text-gray-700 list-disc pl-6 space-y-1">
                    {uploadResult.errors.map((err, i) => (
                      <li key={i}>
                        Row <strong>{err.row}</strong> —{' '}
                        <em>{err.courseCode || 'N/A'}</em>: {err.error}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
