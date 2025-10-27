import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Info, CalendarDays, Clock } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

export default function ExamInfoBar({ selectedExamType }) {
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedExamType) {
      setExamInfo(null);
      return;
    }

    const fetchExamInfo = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/exam-info/${selectedExamType.type_name}`);
        setExamInfo(response.data || null);
      } catch (err) {
        console.error('Error fetching exam info:', err);
        setExamInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchExamInfo();
  }, [selectedExamType]);

  if (!selectedExamType) return null;

  return (
    <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 shadow-sm">
      {loading ? (
        <p className="text-gray-500 text-sm">Loading exam information...</p>
      ) : examInfo ? (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Info className="text-indigo-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-indigo-800">
              {examInfo.exam_type || selectedExamType.type_name}
            </h2>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-gray-700 mb-2">
            {examInfo.start_date && (
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <span>
                  <strong>Duration:</strong>{' '}
                  {new Date(examInfo.start_date).toLocaleDateString()} →{' '}
                  {new Date(examInfo.end_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {examInfo.last_updated && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Last updated: {new Date(examInfo.last_updated).toLocaleString()}</span>
              </div>
            )}
          </div>
          {examInfo.description && (
            <p className="text-gray-800 mb-2">{examInfo.description}</p>
          )}
          {examInfo.instructions && (
            <div className="bg-white border border-indigo-100 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
              {examInfo.instructions}
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic">
          No information available for {selectedExamType.type_name}
        </p>
      )}
    </div>
  );
}
