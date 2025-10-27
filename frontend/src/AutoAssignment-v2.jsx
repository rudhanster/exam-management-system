import React, { useState, useEffect } from 'react';
import { Zap, Users, CheckCircle, AlertTriangle, Info, X, Play, RefreshCw, TrendingUp, Calendar } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

function AutoAssignmentV2() {
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingExamTypes, setLoadingExamTypes] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [enableReallocation, setEnableReallocation] = useState(true);

  useEffect(() => {
    fetchExamTypes();
  }, []);

  const fetchExamTypes = async () => {
    setLoadingExamTypes(true);
    try {
      const response = await fetch(`${API_URL}/exam-types`);
      const data = await response.json();
      setExamTypes(data.filter(et => et.is_active));
      
      if (data.length > 0 && data[0].is_active) {
        setSelectedExamType(data[0]);
      }
    } catch (err) {
      console.error('Error fetching exam types:', err);
      setError('Failed to load exam types');
    } finally {
      setLoadingExamTypes(false);
    }
  };

  const runAutoAssignment = async (dryRun = false) => {
    if (!selectedExamType) {
      setError('Please select an exam type first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/auto-assign-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_type_id: selectedExamType.id,
          dry_run: dryRun,
          enable_reallocation: enableReallocation
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Auto-assignment failed');
      }

      setResults(data);
      setShowResults(true);
    } catch (err) {
      console.error('Auto-assignment error:', err);
      setError(err.message || 'Auto-assignment failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-purple-100 p-3 rounded-lg">
          <Zap className="text-purple-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Enhanced Auto-Assignment</h2>
          <p className="text-sm text-gray-600">Proportional distribution with smart load balancing</p>
        </div>
      </div>

      {/* Exam Type Selection */}
      {!showResults && (
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-5 border border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-indigo-600" size={20} />
            <h3 className="text-md font-semibold text-gray-800">Select Exam Type</h3>
          </div>
          
          {loadingExamTypes ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
              <p className="text-sm text-gray-600 mt-2">Loading exam types...</p>
            </div>
          ) : examTypes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-yellow-600" size={20} />
                <p className="text-sm text-yellow-800">No active exam types found. Please create one first.</p>
              </div>
            </div>
          ) : (
            <div>
              <select
                value={selectedExamType?.id || ''}
                onChange={(e) => {
                  const selected = examTypes.find(et => et.id === e.target.value);
                  setSelectedExamType(selected);
                  setError(null);
                }}
                className="w-full px-4 py-3 bg-white border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 font-medium"
              >
                <option value="">-- Select Exam Type --</option>
                {examTypes.map(et => (
                  <option key={et.id} value={et.id}>
                    {et.type_name} {et.description ? `- ${et.description}` : ''}
                  </option>
                ))}
              </select>
              
              {selectedExamType && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-indigo-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Selection Start:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {formatDateTime(selectedExamType.selection_start)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Deadline:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {formatDateTime(selectedExamType.selection_deadline)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      {!showResults && selectedExamType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Info className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">Enhanced Features:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Proportional Distribution:</strong> Duties distributed by cadre ratios (e.g., 1:2:4)</li>
                <li><strong>Load Balancing:</strong> Even distribution within each cadre group</li>
                <li><strong>Priority for Under-minimum:</strong> Faculty below minimum get highest priority</li>
                <li><strong>Smart Reallocation:</strong> Can take duties from over-allocated faculty if needed</li>
                <li><strong>Exemption Support:</strong> Respects individual faculty exemptions</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {!showResults && selectedExamType && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Settings</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableReallocation}
              onChange={(e) => setEnableReallocation(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">
              Enable Smart Reallocation
              <span className="text-gray-500 ml-1">(Take duties from over-allocated faculty)</span>
            </span>
          </label>
        </div>
      )}

      {/* Action Buttons */}
      {!showResults && selectedExamType && (
        <div className="flex gap-4">
          <button
            onClick={() => runAutoAssignment(true)}
            disabled={loading || !selectedExamType}
            className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition flex items-center justify-center gap-2"
          >
            <Info size={20} />
            {loading ? 'Processing...' : 'Preview (Dry Run)'}
          </button>
          
          <button
            onClick={() => runAutoAssignment(false)}
            disabled={loading || !selectedExamType}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition flex items-center justify-center gap-2"
          >
            <Play size={20} />
            {loading ? 'Assigning...' : 'Assign Now'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {showResults && results && (
        <div className="mt-6 space-y-6">
          {/* Close Button */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} />
              <span>Exam Type: <strong>{selectedExamType?.type_name}</strong></span>
            </div>
            <button
              onClick={() => {
                setShowResults(false);
                setResults(null);
              }}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Status Banner */}
          <div className={`border-l-4 p-4 rounded-r-lg ${
            results.dry_run 
              ? 'bg-blue-50 border-blue-500' 
              : results.success 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
          }`}>
            <div className="flex items-center gap-3">
              {results.dry_run ? (
                <Info className="text-blue-600" size={24} />
              ) : results.success ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <AlertTriangle className="text-red-600" size={24} />
              )}
              <div>
                <p className="font-semibold text-gray-800">{results.message}</p>
                {results.dry_run && (
                  <p className="text-sm text-gray-600 mt-1">
                    No changes were made. Click "Execute Assignment" to apply.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cadre Allocation Display */}
          {results.cadre_allocation && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp size={20} />
                Proportional Distribution by Cadre
              </h3>
              
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg overflow-hidden border border-purple-200">
                <table className="w-full">
                  <thead className="bg-purple-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Cadre</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-700 uppercase">Ratio</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-700 uppercase">Target Duties</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-700 uppercase">Min per Faculty</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-700 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-200">
                    {Object.entries(results.cadre_allocation).map(([cadre, allocation]) => {
                      const percentage = ((allocation.target_duties / results.stats.total_duties) * 100).toFixed(1);
                      return (
                        <tr key={cadre} className="hover:bg-purple-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{cadre}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">{allocation.ratio}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full font-bold">
                              {allocation.target_duties}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">{allocation.min_per_faculty}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">
                {results.stats.total_duties}
              </div>
              <div className="text-sm text-blue-600 font-medium">Total Duties</div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-700">
                {results.stats.free_slots}
              </div>
              <div className="text-sm text-yellow-600 font-medium">Free Slots</div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-700">
                {results.stats.new_assignments}
              </div>
              <div className="text-sm text-green-600 font-medium">New Assigns</div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-700">
                {results.stats.reallocations}
              </div>
              <div className="text-sm text-orange-600 font-medium">Reallocated</div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-700">
                {results.stats.success_rate}
              </div>
              <div className="text-sm text-purple-600 font-medium">Success Rate</div>
            </div>
          </div>

          {/* Reallocations */}
          {results.reallocations && results.reallocations.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <RefreshCw size={20} />
                Smart Reallocations ({results.reallocations.length})
              </h3>
              
              <div className="bg-orange-50 rounded-lg overflow-hidden border border-orange-200">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full">
                    <thead className="bg-orange-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase">From Faculty</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-orange-700 uppercase">→</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase">To Faculty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-200">
                      {results.reallocations.map((realloc, idx) => (
                        <tr key={idx} className="hover:bg-orange-100">
                          <td className="px-4 py-3 text-sm text-gray-800">{realloc.from_faculty_name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-orange-600 font-bold">→</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">{realloc.to_faculty_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{realloc.course_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(realloc.session_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Faculty Summary by Cadre */}
          {results.summary_by_cadre && Object.keys(results.summary_by_cadre).length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Users size={20} />
                Faculty Summary by Cadre
              </h3>
              
              {Object.entries(results.summary_by_cadre).map(([cadre, faculties]) => (
                <div key={cadre} className="mb-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                      {cadre}
                    </span>
                    <span className="text-sm text-gray-500">({faculties.length} faculty)</span>
                  </h4>
                  
                  <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Faculty</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Before</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">New</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Realloc</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">After</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Target</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Min</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {faculties.map((faculty) => (
                            <tr key={faculty.name} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">{faculty.name}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600">{faculty.before}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                {faculty.assigned > 0 && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
                                    +{faculty.assigned}
                                  </span>
                                )}
                                {faculty.assigned === 0 && <span className="text-gray-400">-</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {faculty.reallocated !== 0 && (
                                  <span className={`px-2 py-1 rounded font-semibold ${
                                    faculty.reallocated > 0 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {faculty.reallocated > 0 ? '+' : ''}{faculty.reallocated}
                                  </span>
                                )}
                                {faculty.reallocated === 0 && <span className="text-gray-400">-</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-center font-bold text-gray-800">
                                {faculty.after}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600">{faculty.target}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600">{faculty.min_required}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col gap-1">
                                  {faculty.meets_minimum ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                      ✓ Min Met
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                      ⚠ Below
                                    </span>
                                  )}
                                  {faculty.meets_target && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                      🎯 Balanced
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Failures List */}
          {results.failures && results.failures.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={20} />
                Failed Assignments ({results.failures.length})
              </h3>
              
              <div className="bg-red-50 rounded-lg overflow-hidden border border-red-200">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full">
                    <thead className="bg-red-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200">
                      {results.failures.map((failure, idx) => (
                        <tr key={idx} className="hover:bg-red-100">
                          <td className="px-4 py-3 text-sm text-red-800">{failure.course_code}</td>
                          <td className="px-4 py-3 text-sm text-red-800">
                            {formatDate(failure.session_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-700">{failure.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            {results.dry_run ? (
              <>
                <button
                  onClick={() => runAutoAssignment(false)}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  Execute Assignment
                </button>
                <button
                  onClick={() => {
                    setShowResults(false);
                    setResults(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setShowResults(false);
                  setResults(null);
                }}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoAssignmentV2;