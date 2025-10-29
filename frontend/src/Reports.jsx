import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, FileText, Calendar, Users, Building, AlertCircle, BarChart3, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

import config from './config'; // Adjust path based on file location
const API_URL = config.apiUrl;

const reportTypes = [
  { id: 'faculty-duties', label: 'Faculty Duties', icon: <Users className="w-5 h-5" /> },
  { id: 'room-allocation', label: 'Room Allocation', icon: <Building className="w-5 h-5" /> },
  { id: 'course-faculty-allocation', label: 'Course Faculty Allocation', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'exam-schedule', label: 'Exam Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'duty-summary', label: 'Duty Summary', icon: <BarChart3 className="w-5 h-5" /> },
];

function Reports() {
  const [reportType, setReportType] = useState('faculty-duties');
  const [reportData, setReportData] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExamTypes();
    fetchNextUpcomingExam();
  }, []);

  const fetchExamTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/exam-types`);
      setExamTypes(response.data);
    } catch (err) {
      console.error('Error fetching exam types:', err);
    }
  };

  const fetchNextUpcomingExam = async () => {
    try {
      const response = await axios.get(`${API_URL}/exam-types/next-upcoming`);
      if (response.data && response.data.id) {
        setSelectedExamType(response.data.id.toString());
      }
    } catch (err) {
      console.error('Error fetching next upcoming exam:', err);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedExamType) params.exam_type_id = selectedExamType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(`${API_URL}/reports/${reportType}`, { params });
      setReportData(response.data);

      if (response.data.length === 0) {
        alert('No data found for the selected filters');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      alert(err.response?.data?.error || 'Failed to generate report. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Group data by date, time slot, and branch
  const groupDataByDateTimeBranch = (data) => {
    const grouped = {};
    
    data.forEach(row => {
      const dateKey = row.formatted_date || row.date;
      const timeKey = `${row.start_time}-${row.end_time}`;
      const branch = row.branch;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      if (!grouped[dateKey][timeKey]) {
        grouped[dateKey][timeKey] = {};
      }
      if (!grouped[dateKey][timeKey][branch]) {
        grouped[dateKey][timeKey][branch] = [];
      }
      
      grouped[dateKey][timeKey][branch].push(row);
    });
    
    return grouped;
  };

  const exportToExcel = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    if (reportType === 'course-faculty-allocation') {
      exportCourseFacultyToExcel();
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    
    const fileName = `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportCourseFacultyToExcel = async () => {
  const grouped = groupDataByDateTimeBranch(reportData);
  
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Course Faculty Allocation');
  
  let currentRow = 1;
  
  Object.entries(grouped).forEach(([date, timeSlots]) => {
    Object.entries(timeSlots).forEach(([time, branches]) => {
      Object.entries(branches).forEach(([branch, courses]) => {
        // Calculate max rooms for this specific section
        const maxRoomsInSection = Math.max(...courses.map(course => course.rooms?.length || 0), 1);
        const totalColumns = 7 + maxRoomsInSection;
        
        // ===== DATE HEADER ROW =====
        const dateRow = worksheet.getRow(currentRow);
        dateRow.height = 25;
        
        // Merge cells for date header
        worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
        const dateCell = worksheet.getCell(currentRow, 1);
        dateCell.value = `${date}                                                1 Branch`;
        
        // Style date header - Dark Purple/Indigo
        dateCell.font = { 
          name: 'Calibri', 
          size: 14, 
          bold: true, 
          color: { argb: 'FFFFFFFF' } 
        };
        dateCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5B4FCE' } // Indigo-600
        };
        dateCell.alignment = { 
          vertical: 'middle', 
          horizontal: 'left' 
        };
        dateCell.border = {
          top: { style: 'thin', color: { argb: 'FF4F46E5' } },
          left: { style: 'thin', color: { argb: 'FF4F46E5' } },
          bottom: { style: 'thin', color: { argb: 'FF4F46E5' } },
          right: { style: 'thin', color: { argb: 'FF4F46E5' } }
        };
        currentRow++;
        
        // ===== TIME HEADER ROW =====
        const timeRow = worksheet.getRow(currentRow);
        timeRow.height = 20;
        
        // Merge cells for time header
        worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
        const timeCell = worksheet.getCell(currentRow, 1);
        timeCell.value = `Time: ${time}`;
        
        // Style time header - Light Purple
        timeCell.font = { 
          name: 'Calibri', 
          size: 11, 
          color: { argb: 'FFFFFFFF' } 
        };
        timeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF6366F1' } // Indigo-500
        };
        timeCell.alignment = { 
          vertical: 'middle', 
          horizontal: 'left' 
        };
        timeCell.border = {
          top: { style: 'thin', color: { argb: 'FF5B4FCE' } },
          left: { style: 'thin', color: { argb: 'FF5B4FCE' } },
          bottom: { style: 'thin', color: { argb: 'FF5B4FCE' } },
          right: { style: 'thin', color: { argb: 'FF5B4FCE' } }
        };
        currentRow++;
        
        // ===== BRANCH HEADER ROW =====
        const branchRow = worksheet.getRow(currentRow);
        branchRow.height = 22;
        
        // Merge cells for branch header
        worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
        const branchCell = worksheet.getCell(currentRow, 1);
        branchCell.value = `Branch: ${branch} (${courses.length} courses)`;
        
        // Style branch header - Medium Purple
        branchCell.font = { 
          name: 'Calibri', 
          size: 12, 
          bold: true, 
          color: { argb: 'FFFFFFFF' } 
        };
        branchCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF7C3AED' } // Violet-600
        };
        branchCell.alignment = { 
          vertical: 'middle', 
          horizontal: 'left' 
        };
        branchCell.border = {
          top: { style: 'thin', color: { argb: 'FF6366F1' } },
          left: { style: 'thin', color: { argb: 'FF6366F1' } },
          bottom: { style: 'thin', color: { argb: 'FF6366F1' } },
          right: { style: 'thin', color: { argb: 'FF6366F1' } }
        };
        currentRow++;
        
        // ===== COLUMN HEADERS =====
        const headerRow = worksheet.getRow(currentRow);
        headerRow.height = 20;
        
        const headers = ['Course', 'Course Name', 'Sem', 'Students'];
        for (let i = 1; i <= maxRoomsInSection; i++) {
          headers.push(`Room ${i}`);
        }
        
        headers.forEach((header, index) => {
          const cell = headerRow.getCell(index + 1);
          cell.value = header;
          
          const isRoomColumn = index >= 4; // Room columns start at index 4
          
          // Style column headers
          cell.font = { 
            name: 'Calibri', 
            size: 11, 
            bold: true, 
            color: { argb: 'FF1F2937' } // Gray-800
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isRoomColumn ? 'FFEEF2FF' : 'FFF3F4F6' } // Indigo-50 or Gray-100
          };
          cell.alignment = { 
            vertical: 'middle', 
            horizontal: 'center' 
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
        
        // Set column widths
        worksheet.getColumn(1).width = 10;  // Course
        worksheet.getColumn(2).width = 25;  // Course Name
        worksheet.getColumn(3).width = 6;   // Sem
        worksheet.getColumn(4).width = 10;  // Students
        for (let i = 5; i <= totalColumns; i++) {
          worksheet.getColumn(i).width = 14; // Room columns
        }
        
        currentRow++;
        
        // ===== DATA ROWS =====
        courses.forEach(course => {
          const dataRow = worksheet.getRow(currentRow);
          dataRow.height = 35; // Taller for wrapped text
          
          // Course Code
          const courseCell = dataRow.getCell(1);
          courseCell.value = course.course_code;
          courseCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
          courseCell.alignment = { vertical: 'middle', horizontal: 'center' };
          courseCell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          
          // Course Name
          const nameCell = dataRow.getCell(2);
          nameCell.value = course.course_name;
          nameCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
          nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
          nameCell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          
          // Semester
          const semCell = dataRow.getCell(3);
          semCell.value = course.semester;
          semCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
          semCell.alignment = { vertical: 'middle', horizontal: 'center' };
          semCell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          
          // Student Count
          const studentsCell = dataRow.getCell(4);
          studentsCell.value = course.student_count;
          studentsCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
          studentsCell.alignment = { vertical: 'middle', horizontal: 'center' };
          studentsCell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          
          // Room Columns
          for (let i = 0; i < maxRoomsInSection; i++) {
            const roomCell = dataRow.getCell(5 + i);
            const room = course.rooms && course.rooms[i];
            
            if (room && (room.faculty_initials || room.room_code)) {
              const facultyInitials = room.faculty_initials || '-';
              const roomCode = room.room_code || '';
              // Faculty on first line, room code on second line
              roomCell.value = `${facultyInitials}\n${roomCode}`;
            } else {
              roomCell.value = '-';
            }
            
            // Style room cells - Indigo background
            roomCell.font = { 
              name: 'Calibri', 
              size: 11, 
              bold: true, 
              color: { argb: 'FF4F46E5' } // Indigo-600
            };
            roomCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEEF2FF' } // Indigo-50
            };
            roomCell.alignment = { 
              vertical: 'middle', 
              horizontal: 'center',
              wrapText: true // Enable text wrapping for line breaks
            };
            roomCell.border = {
              top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
          }
          
          currentRow++;
        });
        
        // Add separator row
        currentRow++;
      });
    });
  });
  
  // Generate Excel file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `course_faculty_allocation_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
};


  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    if (reportType === 'course-faculty-allocation') {
      exportCourseFacultyToCSV();
      return;
    }

    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportCourseFacultyToCSV = () => {
    const grouped = groupDataByDateTimeBranch(reportData);
    const csvRows = [];

    Object.entries(grouped).forEach(([date, timeSlots]) => {
      Object.entries(timeSlots).forEach(([time, branches]) => {
        Object.entries(branches).forEach(([branch, courses]) => {
          // Calculate max rooms for this specific section
          const maxRoomsInSection = Math.max(...courses.map(course => course.rooms?.length || 0), 1);
          
          // Add header for this section
          const headers = ['Date', 'Time', 'Branch', 'Course Code', 'Course Name', 'Semester', 'Student Count'];
          for (let i = 1; i <= maxRoomsInSection; i++) {
            headers.push(`Room ${i}`);
          }
          csvRows.push(headers.join(','));

          // Add course data
          courses.forEach(course => {
            const row = [
              date,
              time,
              branch,
              course.course_code,
              `"${course.course_name}"`,
              course.semester,
              course.student_count
            ];

            for (let i = 0; i < maxRoomsInSection; i++) {
              const room = course.rooms && course.rooms[i];
              if (room) {
                const roomCode = room.room_code || '-';
                const facultyInitials = room.faculty_initials || '-';
                row.push(`"${roomCode} - ${facultyInitials}"`);
              } else {
                row.push('-');
              }
            }

            csvRows.push(row.join(','));
          });

          // Add empty line between sections
          csvRows.push('');
        });
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `course_faculty_allocation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderCourseFacultyTable = () => {
    if (reportData.length === 0) return null;

    const grouped = groupDataByDateTimeBranch(reportData);

    return (
      <div className="space-y-8">
        {Object.entries(grouped).map(([date, timeSlots]) => (
          <div key={date} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Date Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                <h2 className="text-2xl font-bold">{date}</h2>
              </div>
            </div>

            {Object.entries(timeSlots).map(([time, branches], timeIndex) => (
              <div key={time}>
                {/* Time Slot Header */}
                <div className="bg-indigo-100 px-4 py-3 border-b-2 border-indigo-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-700" />
                    <h3 className="text-lg font-bold text-indigo-900">Time: {time}</h3>
                  </div>
                </div>

                {Object.entries(branches).map(([branch, courses], branchIndex) => {
                  // Calculate max rooms for THIS specific section only
                  const maxRoomsInSection = Math.max(...courses.map(course => course.rooms?.length || 0), 1);

                  return (
                    <div key={branch}>
                      {/* Branch Header */}
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                        <div className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-gray-600" />
                          <h4 className="text-md font-semibold text-gray-800">Branch: {branch}</h4>
                          <span className="text-sm text-gray-500">({courses.length} courses)</span>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="px-3 py-2 border text-left font-semibold">Course</th>
                              <th className="px-3 py-2 border text-left font-semibold">Course Name</th>
                              <th className="px-3 py-2 border text-center font-semibold">Sem</th>
                              <th className="px-3 py-2 border text-center font-semibold">Students</th>
                              {[...Array(maxRoomsInSection)].map((_, i) => (
                                <th key={i} className="px-3 py-2 border text-center font-semibold bg-indigo-100">
                                  Room {i + 1}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {courses.map((course, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 border font-medium">{course.course_code}</td>
                                <td className="px-3 py-2 border">{course.course_name}</td>
                                <td className="px-3 py-2 border text-center">{course.semester}</td>
                                <td className="px-3 py-2 border text-center">{course.student_count}</td>
                                {[...Array(maxRoomsInSection)].map((_, i) => (
                                  <td key={i} className="px-3 py-2 border text-center bg-indigo-50">
                                    {course.rooms && course.rooms[i] ? (
                                      <div className="flex flex-col items-center">
                                        <div className="font-bold text-indigo-700 text-base">
                                          {course.rooms[i].faculty_initials || '-'}
                                        </div>
                                        {course.rooms[i].room_code && (
                                          <div className="text-xs text-gray-500">{course.rooms[i].room_code}</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Branch separator */}
                      {branchIndex < Object.keys(branches).length - 1 && (
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300"></div>
                      )}
                    </div>
                  );
                })}

                {/* Time slot separator */}
                <div className="h-8 bg-gray-100 border-t-2 border-b-2 border-gray-300"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderStandardTable = () => {
    if (reportData.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-indigo-600 text-white">
          <h3 className="text-lg font-bold">Report Results ({reportData.length} records)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                {Object.keys(reportData[0]).map((key) => (
                  <th key={key} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  {Object.values(row).map((value, i) => (
                    <td key={i} className="px-4 py-3 text-sm text-gray-700">
                      {value ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Reports</h1>
          <p className="text-gray-600">Generate and export duty allocation reports</p>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Select Report Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setReportType(type.id);
                  setReportData([]);
                }}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                  reportType === type.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                }`}
              >
                {type.icon}
                <span className="font-semibold">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Exam Type <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select Exam Type</option>
                {examTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <button
              onClick={generateReport}
              disabled={loading || !selectedExamType}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold px-6 py-2 rounded-lg transition"
            >
              <FileText className="w-5 h-5" />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>

            {reportData.length > 0 && (
              <>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition"
                >
                  <Download className="w-5 h-5" />
                  Export to Excel
                </button>

                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition"
                >
                  <Download className="w-5 h-5" />
                  Export to CSV
                </button>
              </>
            )}
          </div>
        </div>

        {/* Report Data */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Generating report...</p>
          </div>
        ) : reportData.length > 0 ? (
          reportType === 'course-faculty-allocation' ? renderCourseFacultyTable() : renderStandardTable()
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Select an exam type and click "Generate Report" to view data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;