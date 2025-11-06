// App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, LogOut, RefreshCw, Settings, LayoutDashboard, Filter, FileText, AlertTriangle, Award, Star, X, AlertCircle, User, Shield, Users } from 'lucide-react';
import AdminPanel from './AdminPanel.jsx';
import AdminManagement from './AdminManagement.jsx';
import Reports from './Reports.jsx';
import DutyRequirements from './DutyRequirements.jsx';
import ExamInfoBar from './ExamInfoBar.jsx';
import AdminAssignments from './AdminAssignments.jsx';
import AutoAssignmentV2 from './AutoAssignment-v2';
import Feedback from './Feedback.jsx';
import Credits from './Credits.jsx';
import AdminFeedbackViewer from './AdminFeedbackViewer.jsx';
import AdminUserManagement from './AdminUserManagement.jsx';
import config from './config';


const API_URL = config.apiUrl;

// 🔍 DEBUG - Add this line
console.log('🔍 API_URL configured as:', API_URL);

// Configure axios to send credentials with every request
axios.defaults.withCredentials = true;

export default function App() {
  // ============================================
  // STATE DECLARATIONS
  // ============================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [openBlocks, setOpenBlocks] = useState({});
  const [adminView, setAdminView] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [pickedDuties, setPickedDuties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarData, setCalendarData] = useState({});
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState(null);
  const [conflicts, setConflicts] = useState({});
  const [facultyRequirement, setFacultyRequirement] = useState(null);
  const [timeRestrictions, setTimeRestrictions] = useState([]);
  const [facultyData, setFacultyData] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [monthSessions, setMonthSessions] = useState([]);
  const [showReleaseErrorModal, setShowReleaseErrorModal] = useState(false);
  const [releaseErrorDetails, setReleaseErrorDetails] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [canConfirm, setCanConfirm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isFaculty, setIsFaculty] = useState(false);
  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'admin', 'faculty'

  const toggleBlock = (timeRange) => {
    setOpenBlocks((prev) => ({
      ...prev,
      [timeRange]: !prev[timeRange],
    }));
  };

  // Add this near the top with other useEffects
useEffect(() => {
  // Check if we're being redirected from auth with a token
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    // Exchange token for session
    const exchangeToken = async () => {
      try {
        console.log('🎫 Exchanging auth token...');
        const response = await axios.post(`${API_URL.replace('/api', '')}/auth/exchange-token`, 
          { token },
          { withCredentials: true }
        );
        
        // After successful token exchange
if (response.data.success) {
  console.log('✅ Token exchange successful');
  const user = response.data.user;
  
  // Use data directly from token exchange response
  setCurrentUser(user.email);
  setIsAuthenticated(true);
  setIsAdmin(user.isAdmin || false);
  setIsSuperAdmin(user.isSuperAdmin || false);
  setIsFaculty(user.isFaculty || false);
  
  // Store in sessionStorage to persist across page refreshes
  sessionStorage.setItem('userData', JSON.stringify({
    email: user.email,
    isAdmin: user.isAdmin || false,
    isSuperAdmin: user.isSuperAdmin || false,
    isFaculty: user.isFaculty || false
  }));
  
  // Auto-select view mode
  if (user.isAdmin && !user.isFaculty) {
    setViewMode('admin');
  } else if (user.isAdmin && user.isFaculty) {
    setViewMode('admin');
  } else if (user.isFaculty) {
    setViewMode('faculty');
    fetchFacultyData(user.email);
  }
  
  // Clean URL (remove token)
  window.history.replaceState({}, document.title, window.location.pathname);
}
      } catch (err) {
        console.error('❌ Token exchange failed:', err);
        // Clean URL and show login
        window.history.replaceState({}, document.title, '/');
      }
    };
    
    exchangeToken();
  }
}, []);

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================
useEffect(() => {
  const checkAuth = async () => {
    // First, check sessionStorage
    const storedUserData = sessionStorage.getItem('userData');
    
    if (storedUserData) {
      // Use stored data instead of API call
      const user = JSON.parse(storedUserData);
      setCurrentUser(user.email);
      setIsAuthenticated(true);
      setIsAdmin(user.isAdmin);
      setIsSuperAdmin(user.isSuperAdmin);
      setIsFaculty(user.isFaculty);
      
      // Auto-select view mode
      if (user.isAdmin && !user.isFaculty) {
        setViewMode('admin');
        setAdminView('dashboard');
      } else if (user.isAdmin && user.isFaculty) {
        setViewMode('admin');
        setAdminView('dashboard');
      } else if (user.isFaculty) {
        setViewMode('faculty');
        fetchFacultyData(user.email);
      }
      
      return; // Don't call API if we have stored data
    }
    
    // Only call API if no stored data
    try {
      const response = await axios.get(`${API_URL.replace('/api', '')}/auth/user`, {
        withCredentials: true
      });
      
      if (response.data.user) {
        const user = response.data.user;
        setCurrentUser(user.email);
        setIsAuthenticated(true);
        setIsAdmin(user.isAdmin);
        setIsSuperAdmin(user.isSuperAdmin);
        setIsFaculty(user.isFaculty);
        
        // Auto-select view mode
        if (user.isAdmin && !user.isFaculty) {
          setViewMode('admin');
          setAdminView('dashboard');
        } else if (user.isAdmin && user.isFaculty) {
          setViewMode('admin');
          setAdminView('dashboard');
        } else if (user.isFaculty) {
          setViewMode('faculty');
          fetchFacultyData(user.email);
        }
      }
    } catch (err) {
      console.log('Not authenticated');
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };
  
  checkAuth();
}, []);

  useEffect(() => {
    setIsAuthenticated(!!currentUser);
  }, [currentUser]);


  // ============================================
  // FUNCTIONS 
  // ============================================

  const setCalendarToNextExam = async () => {
    try {
      const response = await axios.get(`${API_URL}/all-sessions`);
      const allSessions = response.data;

      const now = new Date();
      const upcomingSessionsWithFreeSlots = allSessions
        .filter(s => {
          const sessionDate = new Date(s.session_date);
          const hasFreeSlots = (s.total_slots - s.assigned_slots) > 0;
          return sessionDate >= now && hasFreeSlots;
        })
        .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

      if (upcomingSessionsWithFreeSlots.length > 0) {
        const nextExamDate = new Date(upcomingSessionsWithFreeSlots[0].session_date);
        console.log('📅 Setting calendar to next exam month:', nextExamDate.toLocaleDateString());
        setCurrentDate(nextExamDate);
      } else {
        console.log('📅 No upcoming exams with free slots, using current month');
      }
    } catch (err) {
      console.error('Error setting calendar to next exam:', err);
    }
  };

  const fetchExamTypesAndSetDefault = async () => {
    try {
      const response = await axios.get(`${API_URL}/exam-types`);
      const allExamTypes = response.data;
      setExamTypes(allExamTypes);

      if (allExamTypes.length > 0) {
        const sessionsResponse = await axios.get(`${API_URL}/all-sessions`);
        const allSessions = sessionsResponse.data;

        const now = new Date();
        const upcomingSessions = allSessions
          .filter(s => new Date(s.session_date) >= now)
          .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

        if (upcomingSessions.length > 0) {
          const nearestSession = upcomingSessions[0];
          const defaultExamType = allExamTypes.find(
            et => et.type_name === nearestSession.exam_type
          );

          if (defaultExamType) {
            setSelectedExamType(defaultExamType);
            console.log('🎯 Default exam type set to:', defaultExamType.type_name);
          } else {
            setSelectedExamType(allExamTypes[0]);
          }
        } else {
          setSelectedExamType(allExamTypes[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching exam types:', err);
    }
  };

  const fetchFacultyData = async (email) => {
    try {
      const response = await axios.get(`${API_URL}/faculty`, {
        params: { email }
      });
      if (response.data) {
        // your backend /api/faculty returns array or single? your prior server SELECT * FROM faculty returns array for list.
        // But some callers expect a single faculty object; the earlier code uses setFacultyData to the response.data (single).
        // We'll handle both possibilities:
        const payload = Array.isArray(response.data) ? response.data.find(f => f.email === email) || null : response.data;
        setFacultyData(payload);
        console.log('👤 Faculty data loaded:', payload);
      } else {
        setFacultyData(null);
      }
    } catch (err) {
      console.error('Error fetching faculty data:', err);
    }
  };

  const fetchTimeRestrictions = async (examTypeId) => {
    if (!facultyData?.cadre || !examTypeId) return;

    try {
      const examType = examTypes.find(et => et.id === examTypeId);
      if (!examType) return;

      const response = await axios.get(`${API_URL}/time-restrictions`, {
        params: {
          examType: examType.type_name,
          cadre: facultyData.cadre
        }
      });

      setTimeRestrictions(response.data);
      console.log('⏰ Time restrictions loaded:', response.data);
    } catch (err) {
      console.error('Error fetching time restrictions:', err);
      setTimeRestrictions([]);
    }
  };

  const fetchMonthSessions = async () => {
  if (!selectedExamType) return;

  try {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const response = await axios.get(`${API_URL}/sessions/month`, {
      params: {
        month,
        year,
        exam_type_id: selectedExamType.id,   // ✅ FIXED — sends proper UUID
      },
    });

    console.log('📅 Month sessions loaded:', response.data);
    setMonthSessions(response.data);
    console.log('📅 Month sessions loaded:', response.data.length, 'sessions');
  } catch (err) {
    console.error('Error fetching month sessions:', err);
    setMonthSessions([]);
  }
};


  const isPrioritySession = (session) => {
    if (!timeRestrictions || timeRestrictions.length === 0) return false;

    const sessionStart = session.start_time.substring(0, 5);
    const sessionEnd = session.end_time.substring(0, 5);

    return timeRestrictions.some(restriction => {
      const priorityStart = restriction.priority_start_time.substring(0, 5);
      const priorityEnd = restriction.priority_end_time.substring(0, 5);

      return (sessionStart >= priorityStart && sessionStart < priorityEnd) ||
             (sessionEnd > priorityStart && sessionEnd <= priorityEnd) ||
             (sessionStart <= priorityStart && sessionEnd >= priorityEnd);
    });
  };

  const getAvailablePrioritySlots = () => {
    let count = 0;
    sessions.forEach(session => {
      if (isPrioritySession(session)) {
        count += session.free_slots;
      }
    });
    return count;
  };

  const getPickedPriorityCount = () => {
    return pickedDuties.filter(duty => {
      const dutySession = sessions.find(s => s.id === duty.session_id);
      return dutySession ? isPrioritySession(dutySession) : false;
    }).length;
  };

  const fetchCalendarSummary = async () => {
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const params = { month, year };

      if (selectedExamType) {
        params.exam_type_id = selectedExamType.id;
      }

      const response = await axios.get(`${API_URL}/calendar/summary`, { params });

      const dataMap = {};
      response.data.forEach((item) => {
        const date = new Date(item.session_date);
        const normalizedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dataMap[normalizedDate] = item;
      });

      setCalendarData(dataMap);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    }
  };

 const checkConflict = async (sessionId) => {
  if (!currentUser) {
    console.warn('⚠️ Skipping conflict check — no user logged in');
    return { hasConflict: false, conflicts: [] };
  }

  try {
    const response = await axios.post(`${API_URL}/picks/check-conflict`, {
      session_id: sessionId,
      faculty_email: currentUser,
    });

    // Ensure consistent structure from backend response
    const data = response.data || {};

    return {
      hasConflict: data.hasConflict === true,
      conflicts: Array.isArray(data.conflicts) ? data.conflicts : [],
    };
  } catch (error) {
    console.error(`❌ Error checking conflict for session ${sessionId}:`, error);
    return { hasConflict: false, conflicts: [] };
  }
};


const fetchSessionsForDate = async (dateStr) => {
  if (!currentUser) return;

  setLoading(true);
  try {
    const params = { date: dateStr };
    if (selectedExamType) params.exam_type_id = selectedExamType.id;

    // ✅ Step 1: Fetch all sessions for this date
    const response = await axios.get(`${API_URL}/sessions`, { params });
    const sessionsData = response.data || [];

    if (sessionsData.length === 0) {
      console.log('ℹ️ No sessions found for selected date');
      setSessions([]);
      setConflicts({});
      return;
    }

    console.log(`🔍 Checking conflicts for ${sessionsData.length} sessions...`);
    const conflictResults = {};

    // ✅ Step 2: Check conflict for each session BEFORE setting sessions
    for (const session of sessionsData) {
      try {
        const conflictData = await checkConflict(session.id);

        const hasConflict =
          conflictData?.hasConflict === true ||
          conflictData?.hasConflict === 'true';

        conflictResults[session.id] = {
          hasConflict,
          conflicts: Array.isArray(conflictData?.conflicts)
            ? conflictData.conflicts
            : [],
        };

        if (hasConflict) {
          console.log(
            `⚠️ Conflict detected for ${session.course_code} (${session.start_time}-${session.end_time}):`,
            conflictData.conflicts
          );
        }
      } catch (error) {
        console.warn(`⚠️ Could not check conflict for ${session.course_code}`, error);
        conflictResults[session.id] = { hasConflict: false, conflicts: [] };
      }
    }

    // ✅ Step 3: Attach conflict info directly to session data
    const sessionsWithConflicts = sessionsData.map((s) => ({
      ...s,
      hasConflict: conflictResults[s.id]?.hasConflict || false,
      conflicts: conflictResults[s.id]?.conflicts || [],
    }));


    // ✅ Step 4: Now update both states together
    setConflicts({ ...conflictResults });
    setSessions(sessionsWithConflicts);
    console.log('✅ Conflict check complete.', conflictResults);
    console.log("🧩 Final sessions data before render:", sessionsWithConflicts);

  } catch (err) {
    console.error('❌ Error fetching sessions:', err);
    setConflicts({});
    setSessions([]);
  } finally {
    setLoading(false);
  }
};



  const fetchPickedDuties = async (email) => {
    try {
      const params = { email };

      if (selectedExamType) {
        params.examType = selectedExamType.type_name;
      }

      const response = await axios.get(`${API_URL}/picks`, { params });
      setPickedDuties(response.data);
    } catch (err) {
      console.error('Error fetching picked duties:', err);
    }
  };

const fetchFacultyRequirement = async (email, examTypeId) => {
  if (!email || !examTypeId) {
    setFacultyRequirement(null);
    return;
  }

  try {
    // This endpoint should now use the new get_faculty_duty_requirements() function
    const response = await axios.get(`${API_URL}/faculty-requirement`, {
      params: { email, exam_type_id: examTypeId }
    });
    setFacultyRequirement(response.data);
    console.log('📊 Faculty requirement (with exceptions):', response.data);
  } catch (err) {
    console.error('Error fetching faculty requirement:', err);
    setFacultyRequirement(null);
  }
};


const handleLogout = async () => {
  try {
    await axios.post(`${API_URL.replace('/api', '')}/auth/logout`, {}, { withCredentials: true });
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsFaculty(false);
    setViewMode('auto');
    setAdminView('dashboard');
    setPickedDuties([]);
    setSessions([]);
    setSelectedDate(null);
    setSelectedExamType(null);
    setConflicts({});
    setTimeRestrictions([]);
    setFacultyData(null);
    setMonthSessions([]);
    
    window.location.href = '/';
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = '/';
  }
};



  const handleDateClick = (day) => {
    const dateStr = `2025-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    fetchSessionsForDate(dateStr);
  };

const handlePickDuty = async (sessionId) => {
  console.log("🎯 PICK button clicked for session:", sessionId);
  if (!currentUser) {
    alert('Please login first');
    return;
  }
console.log("Current conflicts state:", conflicts[sessionId]);
  // ✅ Only block if there’s a REAL conflict
  if (conflicts[sessionId]?.hasConflict) {
     console.log("⛔ Conflict detected — blocking pick.");
    const conflictList = conflicts[sessionId].conflicts || [];

    const conflictMsg =
      conflictList.length > 0
        ? conflictList
            .map(
              (c) =>
                `${c.courseCode} - ${c.courseName} (${c.startTime} to ${c.endTime})`
            )
            .join('\n')
        : 'You already have another duty at this time.';

    alert(
      `⚠️ SCHEDULING CONFLICT!\n\nYou already have exam duty during this time:\n\n${conflictMsg}\n\nPlease choose a different session or release your existing duty first.`
    );
    return;
  }

  try {
    setLoading(true);

    console.log('🔍 Checking time restrictions...');
    console.log('Faculty:', currentUser, 'Cadre:', facultyData?.cadre);
    console.log('Session ID:', sessionId);

    const validationResponse = await axios.post(
      `${API_URL}/picks/can-pick-slot`,
      {
        faculty_email: currentUser,
        session_id: sessionId,
      }
    );

    const validation = validationResponse.data;
    console.log('✅ Validation result:', validation);

    // ✅ Handle validation failure (priority/quota restrictions)
    if (!validation.canPick) {
      console.log('❌ PICK BLOCKED - Reason:', validation.reason);

      let message = '';

      if (validation.reason === 'quota_not_met') {
        const attemptedSession = sessions.find((s) => s.id === sessionId);

        const restrictionDetails = (validation.restrictions || [])
          .map((r) => {
            let details = `Time: ${r.timeRange} (quota ${r.quota})`;
            if (r.days && r.days.length > 0)
              details += `\nDays: ${r.days.join(', ')}`;
            return details;
          })
          .join('\n\n');

        message = `⚠️ PRIORITY TIME SLOTS REQUIRED

As a ${facultyData?.cadre || 'faculty member'}, you must pick priority time slots FIRST!

📋 YOUR PRIORITY RESTRICTION:
${restrictionDetails || 'No detailed restrictions provided.'}

• Required: ${validation.requiredQuota || 0} slot(s)

✅ WHAT TO DO:
Look for dates with ⭐ on the calendar and pick sessions during your priority time first!`;
      } else {
        message = validation.message || 'Cannot pick this slot.';
      }

      setErrorModalMessage(message);
      setShowErrorModal(true);
      setLoading(false);
      return;
    }

    // ✅ Proceed with valid pick
    console.log('✅ Validation passed, proceeding with pick');

    await axios.post(`${API_URL}/picks/pick`, {
      session_id: sessionId,
      faculty_email: currentUser,
    });

    // ✅ Refresh all relevant data
    await Promise.all([
      fetchPickedDuties(currentUser),
      fetchCalendarSummary(),
      selectedDate ? fetchSessionsForDate(selectedDate) : Promise.resolve(),
      selectedExamType
        ? fetchFacultyRequirement(currentUser, selectedExamType.id)
        : Promise.resolve(),
    ]);

    alert('✅ Duty picked successfully!');
  } catch (err) {
    console.error('❌ Error picking duty:', err);

    if (err.response?.data?.conflict) {
      alert(`⚠️ SCHEDULING CONFLICT!\n\n${err.response.data.message}`);
    } else if (err.response?.data?.restriction) {
      alert(`⚠️ TIME RESTRICTION\n\n${err.response?.data?.message}`);
    } else {
      alert(err.response?.data?.error || 'Failed to pick duty');
    }
  } finally {
    setLoading(false);
  }
};


const handleReleaseDuty = async (slotId, sessionId) => {
  if (!confirm('Are you sure you want to release this duty?')) return;

  try {
    setLoading(true);
    console.log('🔓 Releasing duty:', { slotId, sessionId, email: currentUser });

    const res = await axios.post(`${API_URL}/picks/release`, {
      slot_id: slotId,
      session_id: sessionId,
      faculty_email: currentUser,
    });

    // ✅ Instant progress bar update (no lag)
    if (res.data.updated_requirement) {
      const updated = res.data.updated_requirement;
      const computedProgress = updated.progress ?? (
        updated.min_duties > 0
          ? Math.round((updated.current_duties / updated.min_duties) * 100)
          : 100
      );

      console.log('📊 Updated requirement received:', updated);

      setFacultyRequirement(prev => ({
        ...prev,
        requirement: { ...updated, progress: computedProgress },
      }));
    }

    // ✅ Always refresh confirmation status (may reset if duties < required)
    if (selectedExamType) {
      await fetchConfirmationStatus(currentUser, selectedExamType.id);
    }

    // ✅ Refresh other data asynchronously
    await Promise.all([
      fetchPickedDuties(currentUser),
      fetchCalendarSummary(),
      selectedDate ? fetchSessionsForDate(selectedDate) : Promise.resolve(),
    ]);

    alert('✅ Duty released successfully!');
  } catch (err) {
    console.error('❌ Error releasing duty:', err);
    console.error('Error details:', err.response?.data);

    if (err.response?.data?.restriction) {
      // 🧩 Priority slot restriction modal
      setReleaseErrorDetails({
        message: err.response.data.message,
        currentPriorityPicks: err.response.data.currentPriorityPicks,
        requiredMinimum: err.response.data.requiredMinimum,
        afterRelease: err.response.data.afterRelease,
        sessionId: sessionId,
      });
      setShowReleaseErrorModal(true);
    } else {
      alert(err.response?.data?.error || 'Failed to release duty');
    }
  } finally {
    setLoading(false);
  }
};


  const handleManualRefresh = () => {
    fetchCalendarSummary();
    if (selectedDate) fetchSessionsForDate(selectedDate);
    if (selectedExamType && timeRestrictions.length > 0) {
      fetchMonthSessions();
    }
  };

  const getTileColor = (dateStr) => {
    const data = calendarData[dateStr];

    if (!data) return 'bg-gray-100';

    const totalSlots = Number(data.total_slots) || 0;
    const freeSlots = Number(data.free_slots) || 0;
    const assignedSlots = Number(data.assigned_slots) || 0;

    if (totalSlots === 0) return 'bg-gray-100';
    if (freeSlots === 0) return 'bg-red-200 border-2 border-red-400';
    if (assignedSlots > 0 && freeSlots > 0) return 'bg-yellow-200 border-2 border-yellow-400';
    return 'bg-green-200 border-2 border-green-400';
  };

const hasPrioritySessions = (dateStr) => {
  if (!facultyData || timeRestrictions.length === 0) return false;

  // Proper date normalization considering timezone
  const sessionsOnDate = monthSessions.filter(s => {
    const sessionDate = new Date(s.session_date);
    // Get local date string in YYYY-MM-DD format
    const year = sessionDate.getFullYear();
    const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
    const day = String(sessionDate.getDate()).padStart(2, '0');
    const normalizedSessionDate = `${year}-${month}-${day}`;
    
    return normalizedSessionDate === dateStr;
  });

  if (sessionsOnDate.length === 0) return false;

  // Check if any session matches priority time
  return sessionsOnDate.some(session => {
    return timeRestrictions.some(restriction => {
      const sessionStart = session.start_time.substring(0, 5);
      const sessionEnd = session.end_time.substring(0, 5);
      const priorityStart = restriction.priority_start_time.substring(0, 5);
      const priorityEnd = restriction.priority_end_time.substring(0, 5);

      const timeMatches =
        (sessionStart >= priorityStart && sessionStart < priorityEnd) ||
        (sessionEnd > priorityStart && sessionEnd <= priorityEnd) ||
        (sessionStart <= priorityStart && sessionEnd >= priorityEnd);

      if (!timeMatches) return false;

      if (restriction.priority_days && restriction.priority_days.length > 0) {
        const date = new Date(dateStr);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        return restriction.priority_days.includes(dayOfWeek);
      }

      return true;
    });
  });
};

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  // Add function to check confirmation status
const fetchConfirmationStatus = async (email, examTypeId) => {
  if (!email || !examTypeId) return;

  try {
    const response = await axios.get(`${API_URL}/picks/confirmation-status`, {
      params: { email, exam_type_id: examTypeId },
    });

    const confirmed = response.data.confirmed || false;

    setIsConfirmed(confirmed);
    console.log('📋 Confirmation status updated:', confirmed);
  } catch (err) {
    console.error('Error fetching confirmation status:', err);
    setIsConfirmed(false);
  }
};


// Add function to handle confirmation
const handleConfirmPicks = async () => {
  if (!currentUser || !selectedExamType) return;
  
  if (!confirm('⚠️ IMPORTANT: Once you confirm, you CANNOT release or change your duties!\n\nAre you sure you want to finalize your duty picks?')) {
    return;
  }
  
  try {
    setLoading(true);
    
    await axios.post(`${API_URL}/picks/confirm`, {
      faculty_email: currentUser,
      exam_type_id: selectedExamType.id
    });
    
    setIsConfirmed(true);
    alert('✅ Your duty picks have been confirmed and locked!');
    
    await fetchPickedDuties(currentUser);
  } catch (err) {
    console.error('Error confirming picks:', err);
    alert(err.response?.data?.error || 'Failed to confirm picks');
  } finally {
    setLoading(false);
  }
};



// Update useEffect to fetch confirmation status
useEffect(() => {
  if (currentUser && currentUser !== 'rudhanster@gmail.com' && selectedExamType) {
    fetchPickedDuties(currentUser);
    fetchFacultyRequirement(currentUser, selectedExamType.id);
    fetchConfirmationStatus(currentUser, selectedExamType.id);
  }
}, [currentUser, selectedExamType]);



// Update useEffect to check if can confirm
useEffect(() => {
  if (!facultyRequirement || !selectedExamType) {
    setCanConfirm(false);
    return;
  }

  // Check 1: Is selection period still active?
  const now = new Date();
  const selectionDeadline = new Date(selectedExamType.selection_deadline);
  const isPastDeadline = now > selectionDeadline;
  
  if (isPastDeadline) {
    setCanConfirm(false);
    return;
  }
  
  // Check 2: Are minimum duties met?
  const requirementMet = facultyRequirement.requirement.is_met;
  
  // Check 3: If priority restrictions exist, check quota
  let priorityQuotaMet = true;
  if (timeRestrictions.length > 0) {
    const minSlotsRequired = timeRestrictions[0]?.min_slots_required || 0;
    const pickedPriorityCount = getPickedPriorityCount();
    const availablePrioritySlots = getAvailablePrioritySlots();
    
    // Priority quota is met if:
    // - We picked enough priority slots, OR
    // - No priority slots are available
    priorityQuotaMet = (pickedPriorityCount >= minSlotsRequired) || 
                       (availablePrioritySlots === 0 && pickedDuties.length > 0);
  }
  
  // Can confirm if:
  // - Not already confirmed
  // - Requirements met
  // - Priority quota met (if applicable)
  // - Not past deadline
  setCanConfirm(!isConfirmed && requirementMet && priorityQuotaMet && !isPastDeadline);
  
  console.log('🔍 Can Confirm Check:', {
    isConfirmed,
    requirementMet,
    priorityQuotaMet,
    isPastDeadline,
    canConfirm: !isConfirmed && requirementMet && priorityQuotaMet && !isPastDeadline
  });
}, [facultyRequirement, selectedExamType, timeRestrictions, pickedDuties, isConfirmed]);

  // ============================================
  // useEffect HOOKS (as provided)
  // ============================================
  useEffect(() => {
  if (currentUser && viewMode === 'faculty') {
    fetchExamTypesAndSetDefault();
    setCalendarToNextExam();
  }
}, [currentUser, viewMode]);

useEffect(() => {
  if (currentUser && viewMode === 'faculty') {
    fetchPickedDuties(currentUser);
    if (selectedExamType) {
      fetchFacultyRequirement(currentUser, selectedExamType.id);
    }
  }
}, [currentUser, selectedExamType, viewMode]);

  useEffect(() => {
    if (facultyData && selectedExamType) {
      fetchTimeRestrictions(selectedExamType.id);
    }
  }, [facultyData, selectedExamType]);

useEffect(() => {
  if (selectedExamType && facultyData && viewMode === 'faculty') {
    fetchMonthSessions();
  }
}, [currentDate, selectedExamType, facultyData, viewMode]);

  useEffect(() => {
    if (facultyData && selectedExamType && examTypes.length > 0) {
      fetchTimeRestrictions(selectedExamType.id);
    }
  }, [facultyData, selectedExamType, examTypes]);

useEffect(() => {
  if (currentUser && viewMode === 'faculty') {
    fetchCalendarSummary();
  }
}, [currentDate, selectedExamType, viewMode]);

  useEffect(() => {
  if (!currentUser || viewMode !== 'faculty') return;

    let calendarInterval;
    let sessionInterval;
    let isActive = true;

    const handleVisibilityChange = () => {
      isActive = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    calendarInterval = setInterval(() => {
      if (isActive) {
        fetchCalendarSummary();
      }
    }, 30000);

    if (selectedDate) {
      sessionInterval = setInterval(() => {
        if (isActive) {
          fetchSessionsForDate(selectedDate);
        }
      }, 15000);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (calendarInterval) clearInterval(calendarInterval);
      if (sessionInterval) clearInterval(sessionInterval);
    };
  }, [currentUser, selectedDate, selectedExamType]);


// ============================================
// VIEW MODE SWITCHER FOR DUAL-ROLE USERS
// ============================================
const ViewModeSwitcher = () => {
  if (!isAdmin || !isFaculty) return null;
  
  const toggleView = () => {
    if (viewMode === 'admin') {
      setViewMode('faculty');
      fetchFacultyData(currentUser);
      fetchExamTypesAndSetDefault();
      setCalendarToNextExam();
    } else {
      setViewMode('admin');
      setAdminView('dashboard');
    }
  };
  
  return (
    <button
      onClick={toggleView}
      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap"
    >
      {viewMode === 'admin' ? (
        <>
          <User className="w-4 h-4" />
          Switch to Faculty
        </>
      ) : (
        <>
          <Shield className="w-4 h-4" />
          Switch to Admin
        </>
      )}
    </button>
  );
};
  // ============================================
  // RENDER (same as your provided UI) with responsive Tailwind fixes
  // ============================================

if (!isAuthenticated) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Calendar className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">DutyDesk</h1>
          <p className="text-gray-600 mt-2">Exam Management System</p>
        </div>
        
        <button
          onClick={() => window.location.href = `${API_URL.replace('/api', '')}/auth/login`}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
            <path d="M11.5 0L0 6.5V17l11.5 6 11.5-6V6.5L11.5 0z"/>
          </svg>
          Sign in with Microsoft 365
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-6">
          Use your college email to sign in
        </p>
      </div>
    </div>
  );
}

  {/*// Optional: Domain check
  if (!userEmail?.endsWith('@manipal.edu')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-700 mb-6">
            Please use your college email address (@college.edu)
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Current: <strong>{userEmail}</strong>
          </p>
          <button
            onClick={() => instance.logoutPopup()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
          >
            Sign in with Different Account
          </button>
        </div>
      </div>
    );
  }
*/}
  const filteredSessions = selectedExamType
    ? sessions.filter(s => s.exam_type_id === selectedExamType.id)
    : sessions;

if (isAdmin && viewMode === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
          <div className="w-full px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              {/* Logo - Left side */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Calendar className="w-6 h-6" />
                <h1 className="text-base lg:text-xl font-bold flex items-center gap-2 whitespace-nowrap">
                  DutyDesk - Admin
                  {isSuperAdmin && <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-300" />}
                </h1>
              </div>

              {/* Navigation - Right side, scrollable */}
              <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
                <div className="flex items-center gap-2 min-w-max">
                  {/* View Switcher */}
                  <ViewModeSwitcher />
                  
                  {/* Board */}
                  <button
                    onClick={() => setAdminView('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      adminView === 'dashboard' ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Board
                  </button>

                  {/* Exams */}
                  <button
                    onClick={() => setAdminView('management')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      adminView === 'management' ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Exams
                  </button>

                  {/* Requisite */}
                  <button
                    onClick={() => setAdminView('requirements')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      adminView === 'requirements' ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    Requisite
                  </button>

                  {/* Duties */}
                  <button
                    onClick={() => setAdminView('assignments')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      adminView === 'assignments' ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Duties
                  </button>

                  {/* Auto-Assign */}
                  <button
                    onClick={() => setAdminView('auto-assign')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      adminView === 'auto-assign' ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Auto-Assign
                  </button>

                  {/* Reports */}
                  <button
                    onClick={() => setAdminView('reports')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      adminView === 'reports' ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Reports
                  </button>

                  {/* Admins */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => setAdminView('admin-users')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                        adminView === 'admin-users' ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Admins
                    </button>
                  )}

                  {/* About Us */}
                  <Credits />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>
          {adminView === 'dashboard' ? (
            <AdminPanel />
          ) : adminView === 'management' ? (
            <AdminManagement />
          ) : adminView === 'requirements' ? (
            <DutyRequirements />
          ) : adminView === 'assignments' ? (
            <AdminAssignments />
          ) : adminView === 'auto-assign' ? (
            <AutoAssignmentV2
              examTypeId={selectedExamType?.id}
              onComplete={() => {
                setLastUpdate(new Date());
                fetchMonthSessions();
              }}
            />
          ) : adminView === 'admin-users' ? (
            <AdminUserManagement />
          ) : (
            <Reports />
          )}
        </main>
      </div>
    );
  }
// If user is not admin and not faculty, show error
if (!isAdmin && !isFaculty) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-700 mb-4">
          You are not registered as faculty or admin in the system.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Current: <strong>{currentUser}</strong>
        </p>
        <button
          onClick={handleLogout}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

// Faculty View



  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const availablePrioritySlots = getAvailablePrioritySlots();
  const pickedPriorityCount = getPickedPriorityCount();
  const minSlotsRequired = timeRestrictions[0]?.min_slots_required || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Responsive Faculty Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <h1 className="text-2xl sm:text-3xl font-bold">DutyDesk</h1>
            </div>

            <div className="flex items-center gap-3 sm:hidden">
              {/* small screen quick info */}
              <div className="text-sm text-indigo-100">
                <p className="font-semibold">{currentUser}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end w-full sm:w-auto">
  {/* ADD THIS LINE - View Mode Switcher for dual-role users */}
  <ViewModeSwitcher />
  
  <div className="hidden sm:block text-sm">
    <p className="text-indigo-100">Logged in as</p>
    <div className="flex items-center gap-2">
      <p className="font-semibold">{currentUser}</p>
    </div>
  </div>

  <Feedback currentUser={currentUser} />
  <Credits />

  <button
    onClick={handleLogout}
    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-3 py-2 rounded-md transition text-xs sm:text-sm"
  >
    <LogOut className="w-4 h-4" />
    Logout
  </button>
</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExamInfoBar selectedExamType={selectedExamType} />

        <div className="mb-6 bg-white rounded-lg shadow-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-indigo-600" />

              <select
                value={selectedExamType?.id || ''}
                onChange={async (e) => {
                  const examType = examTypes.find(et => et.id === e.target.value);
                  setSelectedExamType(examType || null);
                  setSelectedDate(null);
                  setSessions([]);
                  setConflicts({});
                  setFacultyRequirement(null);
                  setTimeRestrictions([]);
                  setMonthSessions([]);

                  if (examType) {
                    if (currentUser) {
                      fetchFacultyRequirement(currentUser, examType.id);
                    }

                    try {
                      const response = await axios.get(`${API_URL}/all-sessions`);
                      const allSessions = response.data;

                      const now = new Date();
                      const upcomingSessionsForType = allSessions
                        .filter(s => {
                          const sessionDate = new Date(s.session_date);
                          const hasFreeSlots = (s.total_slots - s.assigned_slots) > 0;
                          return sessionDate >= now && s.exam_type === examType.type_name && hasFreeSlots;
                        })
                        .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

                      if (upcomingSessionsForType.length > 0) {
                        const firstExamDate = new Date(upcomingSessionsForType[0].session_date);
                        console.log(`📅 Jumping to ${examType.type_name} start month:`, firstExamDate.toLocaleDateString());
                        setCurrentDate(firstExamDate);
                      } else {
                        console.log(`📅 No upcoming ${examType.type_name} sessions with free slots`);
                      }
                    } catch (err) {
                      console.error('Error jumping to exam month:', err);
                    }
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">All Exam Types</option>
                {examTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </div>
            {selectedExamType && (
              <div className="text-sm text-gray-600 bg-indigo-50 px-3 py-2 rounded-lg">
                <p className="font-semibold text-indigo-900">
                  {selectedExamType.type_name} - Selection Period
                </p>
                <p className="text-xs">
                  {new Date(selectedExamType.selection_start).toLocaleString()}
                  {' → '}
                  {new Date(selectedExamType.selection_deadline).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-800">{monthName}</h2>
                <button
                  onClick={handleManualRefresh}
                  className="flex items-center gap-2 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition"
                  title="Refresh calendar and sessions"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-indigo-100 hidden sm:block">
                  <p>Last update: {lastUpdate.toLocaleTimeString()}</p>
                  <p className="text-indigo-200">Auto-refresh: 30s</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-1 text-xs sm:text-sm">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4">
              {days.map((day, idx) => {
                if (!day) {
                  return <div key={idx}></div>;
                }

                const dateStr = `2025-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const tileColor = getTileColor(dateStr);
                const isSelected = selectedDate === dateStr;
                const isPriorityDate = hasPrioritySessions(dateStr);

                return (
                  <button
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square p-1 rounded-lg font-semibold transition-all text-xs relative ${tileColor} hover:shadow-md cursor-pointer
                      ${isSelected ? 'ring-2 ring-indigo-500' : ''}
                      ${isPriorityDate ? 'ring-1 ring-yellow-500 ring-offset-1' : ''} 
                    `}
                  >
                    {day}
                    {isPriorityDate && (
                      <div className="absolute top-0 right-0 -mt-1 -mr-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-3 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-200 border-2 border-green-400 rounded"></div>
                  <span className="text-xs text-gray-600">Free Slots</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-yellow-200 border-2 border-yellow-400 rounded"></div>
                  <span className="text-xs text-gray-600">Partially Assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-200 border-2 border-red-400 rounded"></div>
                  <span className="text-xs text-gray-600">Fully Booked</span>
                </div>
              </div>

              {timeRestrictions.length > 0 && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 rounded">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-yellow-800 font-medium">
                    = Priority dates (You must pick from these first)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 h-fit">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              My Upcoming Duties ({pickedDuties.length})
            </h3>

            {selectedExamType && facultyRequirement && (
              <div className={`mb-4 p-4 rounded-lg border-2 ${
                facultyRequirement.requirement.status === 'met'
                  ? 'bg-green-50 border-green-300'
                  : facultyRequirement.requirement.status === 'warning'
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-red-50 border-red-300'
              }`}>
{selectedExamType && !isConfirmed && (
  <button
    onClick={handleConfirmPicks}
    disabled={!canConfirm || loading}
    className={`w-full mb-4 py-3 px-4 rounded-lg font-bold text-white transition shadow-md ${
      canConfirm
        ? 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
        : 'bg-gray-400 cursor-not-allowed'
    }`}
    title={
      (() => {
        const now = new Date();
        const deadline = new Date(selectedExamType.selection_deadline);
        const isPastDeadline = now > deadline;
        
        if (isPastDeadline) {
          return 'Selection period has ended';
        }
        if (!facultyRequirement?.requirement.is_met) {
          return `You need ${facultyRequirement?.requirement.remaining || 0} more duties`;
        }
        if (timeRestrictions.length > 0) {
          const minSlotsRequired = timeRestrictions[0]?.min_slots_required || 0;
          const pickedPriorityCount = getPickedPriorityCount();
          if (pickedPriorityCount < minSlotsRequired) {
            const availablePrioritySlots = getAvailablePrioritySlots();
            if (availablePrioritySlots > 0) {
              return `Pick ${minSlotsRequired - pickedPriorityCount} more priority slots first`;
            }
          }
        }
        return 'Confirm and lock your duty picks';
      })()
    }
  >
    {(() => {
      const now = new Date();
      const deadline = new Date(selectedExamType.selection_deadline);
      const isPastDeadline = now > deadline;
      
      if (isPastDeadline) {
        return '🔒 Selection Period Ended';
      }
      if (!canConfirm) {
        return '🔒 Complete Requirements to Confirm';
      }
      return '✅ Confirm & Lock Picks';
    })()}
  </button>
)}
{isConfirmed && (
  <div className="mb-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
    <div className="flex items-center gap-2 text-green-800">
      <span className="text-2xl">✅</span>
      <div>
        <p className="font-bold">Picks Confirmed!</p>
        <p className="text-sm">Your duties are locked and cannot be changed.</p>
      </div>
    </div>
  </div>
)}
                <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Your Cadre</p>
                    <p className="text-lg font-bold text-gray-900">{facultyRequirement.faculty.cadre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">Requirement</p>
                    <p className="text-lg font-bold text-gray-900">
                      {facultyRequirement.requirement.current_duties}/{facultyRequirement.requirement.min_duties} duties
                    </p>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        facultyRequirement.requirement.status === 'met'
                          ? 'bg-green-600'
                          : facultyRequirement.requirement.status === 'warning'
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(100, facultyRequirement.requirement.progress)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className={`font-semibold ${
                    facultyRequirement.requirement.status === 'met'
                      ? 'text-green-700'
                      : facultyRequirement.requirement.status === 'warning'
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  }`}>
                    {facultyRequirement.requirement.is_met
                      ? '✅ Requirement Met!'
                      : facultyRequirement.requirement.status === 'warning'
                      ? `⚠️ ${facultyRequirement.requirement.remaining} more needed`
                      : `❌ ${facultyRequirement.requirement.remaining} duties required`
                    }
                  </span>
                  <span className="text-gray-600 font-medium">
                    {Math.round(facultyRequirement.requirement.progress)}%
                  </span>
                </div>
              </div>
            )}

            {selectedExamType && !facultyRequirement && (
              <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200">
                <p className="text-gray-600">
                  📋 Loading requirement info...
                </p>
              </div>
            )}

            {selectedExamType && (
              <div className="mb-4 px-3 py-2 bg-indigo-50 rounded-lg text-sm border border-indigo-200">
                <p className="text-indigo-900 font-semibold">
                  📋 Showing: {selectedExamType.type_name}
                </p>
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pickedDuties.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    {selectedExamType
                      ? `No upcoming ${selectedExamType.type_name} duties`
                      : 'No upcoming duties picked yet'}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Select a date and pick duties from available sessions
                  </p>
                </div>
              ) : (
                pickedDuties.map((duty) => {
                  const dutySession = sessions.find(s => s.id === duty.session_id);
                  const isPriority = dutySession ? isPrioritySession(dutySession) : false;

                  return (
                    <div key={duty.slot_id} className={`border rounded-lg p-3 hover:shadow-md transition ${
                      isPriority ? 'bg-yellow-50 border-yellow-300' : 'bg-indigo-50 border-indigo-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isPriority && <Star className="text-yellow-500 fill-yellow-500 flex-shrink-0" size={16} />}
                          <p className="font-semibold text-gray-800 text-sm truncate">
                            {duty.course_name}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-semibold whitespace-nowrap ml-2">
                          {duty.exam_type_name}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600">
                        <strong>Code:</strong> {duty.course_code}
                      </p>

                      <p className="text-xs text-gray-600">
                        <strong>Branch:</strong> {duty.branch}
                      </p>

                      <p className="text-xs text-gray-600 mt-1">
                        <strong>Date:</strong> {duty.session_date ? new Date(duty.session_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : '-'}
                      </p>

                      <p className="text-xs text-gray-600">
                        <strong>Time:</strong> {duty.start_time} - {duty.end_time}
                      </p>

                      {isPriority && (
                        <div className="mt-2 text-xs text-yellow-700 font-medium flex items-center gap-1">
                          <Star size={12} className="fill-yellow-500" />
                          Priority Time Slot
                        </div>
                      )}

                      {!isConfirmed && (
  <button
    onClick={() => handleReleaseDuty(duty.slot_id, duty.session_id)}
    disabled={
  loading ||
  (selectedExamType &&
    new Date() > new Date(selectedExamType.selection_deadline))
}
    className="mt-3 w-full sm:w-auto bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-semibold py-2 px-2 rounded transition shadow-sm hover:shadow"
  >
    {loading ? 'Releasing...' : 'Release Duty'}
  </button>
)}

{isConfirmed && (
  <div className="mt-3 text-center text-xs text-gray-500 italic">
    ✅ Confirmed - Cannot release
  </div>
)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Sessions for {selectedDate}
              {selectedExamType && (
                <span className="text-lg font-normal text-indigo-600 ml-3">
                  ({selectedExamType.type_name})
                </span>
              )}
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600">Loading sessions...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {selectedExamType
                  ? `No ${selectedExamType.type_name} sessions scheduled for this date`
                  : 'No sessions scheduled'}
              </p>
            ) : (
              <div className="space-y-6">
                {/* Group sessions by start time */}
                {(() => {
                  // Get available sessions (not already picked)
                  const availableSessions = filteredSessions.filter(
                    (session) => !pickedDuties.some((p) => p.session_id === session.id)
                  );

                  // Group by start time
                  const sessionsByTime = availableSessions.reduce((acc, session) => {
                    const startTime = session.start_time;
                    if (!acc[startTime]) {
                      acc[startTime] = [];
                    }
                    acc[startTime].push(session);
                    return acc;
                  }, {});

                  // Sort time groups
                  const sortedTimeGroups = Object.entries(sessionsByTime).sort(
                    ([timeA], [timeB]) => timeA.localeCompare(timeB)
                  );

                  return sortedTimeGroups.map(([startTime, sessions]) => {
  const timeRange = `${startTime.substring(0, 5)} - ${sessions[0].end_time.substring(0, 5)}`;
  const isOpen = !!openBlocks[timeRange];

  return (
    <div key={timeRange} className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => toggleBlock(timeRange)}
        className="w-full flex justify-between items-center bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 text-white font-semibold hover:opacity-90 transition"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span>{timeRange}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-white/20 px-2 py-0.5 rounded-full">
            {sessions.length} session{sessions.length > 1 ? "s" : ""}
          </span>
          <ChevronRight
            className={`w-5 h-5 transform transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Collapsible Body */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        {/* ✅ Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Course</th>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Exam</th>
                <th className="px-4 py-3 text-center font-semibold">Free</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const conflictInfo = conflicts?.[session.id];
                const hasConflict = conflictInfo?.hasConflict === true;
                const isFull = Number(session.free_slots) === 0;
                const isPriority = isPrioritySession(session);
                const canPick = !isFull && !hasConflict;

                return (
                  <tr
                    key={session.id}
                    className={`border-b hover:bg-gray-50 ${
                      hasConflict
                        ? "bg-red-50 border-l-4 border-red-500"
                        : isPriority
                        ? "bg-yellow-50 border-l-4 border-yellow-400"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                      {isPriority && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <span className="truncate">{session.course_name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {session.course_code}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                        {session.exam_type_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full font-semibold text-sm ${
                          session.free_slots > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {session.free_slots}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handlePickDuty(session.id)}
                        disabled={
                          !canPick ||
                          loading ||
                          (selectedExamType &&
                            new Date() > new Date(selectedExamType.selection_deadline))
                        }
                        className={`text-xs sm:text-sm font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-md shadow-sm transition ${
                          hasConflict
                            ? "bg-red-600 text-white cursor-not-allowed"
                            : isFull
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : isPriority
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                      >
                        {hasConflict
                          ? "⚠ Conflict"
                          : isFull
                          ? "Full"
                          : isPriority
                          ? "⭐ Pick"
                          : "Pick"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ✅ Mobile Compact Card View */}
        <div className="sm:hidden divide-y divide-gray-200">
          {sessions.map((session) => {
            const conflictInfo = conflicts?.[session.id];
            const hasConflict = conflictInfo?.hasConflict === true;
            const isFull = Number(session.free_slots) === 0;
            const isPriority = isPrioritySession(session);
            const canPick = !isFull && !hasConflict;

            return (
              <div
                key={session.id}
                className={`p-3 text-sm ${
                  hasConflict
                    ? "bg-red-50 border-l-4 border-red-500"
                    : isPriority
                    ? "bg-yellow-50 border-l-4 border-yellow-400"
                    : "bg-white"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">
                    {session.course_name}
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    {session.exam_type_name}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 text-xs mt-1">
                  <span>{session.course_code}</span>
                  <span>{session.free_slots} free</span>
                </div>
                <button
                  onClick={() => handlePickDuty(session.id)}
                  disabled={
                    !canPick ||
                    loading ||
                    (selectedExamType &&
                      new Date() > new Date(selectedExamType.selection_deadline))
                  }
                  className={`mt-2 w-full text-xs font-semibold py-1.5 rounded transition shadow-sm ${
                    hasConflict
                      ? "bg-red-600 text-white cursor-not-allowed"
                      : isFull
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : isPriority
                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {hasConflict
                    ? "⚠ Conflict"
                    : isFull
                    ? "Full"
                    : isPriority
                    ? "⭐ Pick"
                    : "Pick"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm sm:max-w-md md:max-w-lg rounded-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-500" size={28} />
                <h3 className="text-xl font-bold text-gray-800">Cannot Pick Duty</h3>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="whitespace-pre-wrap text-gray-700 mb-6 leading-relaxed max-h-96 overflow-y-auto text-sm">
              {errorModalMessage}
            </div>

            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition shadow-md hover:shadow-lg"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Release Error Modal with Detailed Instructions */}
{showReleaseErrorModal && releaseErrorDetails && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl rounded-lg p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 rounded-full p-2">
            <AlertCircle className="text-red-600" size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Cannot Release Priority Slot</h3>
            <p className="text-sm text-gray-600">You must maintain minimum priority duties</p>
          </div>
        </div>
        <button
          onClick={() => setShowReleaseErrorModal(false)}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {releaseErrorDetails.currentPriorityPicks}
          </div>
          <div className="text-xs text-blue-600 font-medium mt-1">Current Picks</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">
            {releaseErrorDetails.afterRelease}
          </div>
          <div className="text-xs text-red-600 font-medium mt-1">After Release</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">
            {releaseErrorDetails.requiredMinimum}
          </div>
          <div className="text-xs text-green-600 font-medium mt-1">Required Min.</div>
        </div>
      </div>

      {/* Problem Explanation */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r">
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-red-800 font-semibold mb-1">Why can't I release this?</p>
            <p className="text-sm text-red-700">
              Releasing this priority slot would drop you to <strong>{releaseErrorDetails.afterRelease}</strong> priority {releaseErrorDetails.afterRelease === 1 ? 'slot' : 'slots'}, 
              but you need at least <strong>{releaseErrorDetails.requiredMinimum}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Solution Steps */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2 mb-3">
          <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
            ✓
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800 mb-1">Solution</p>
            <p className="text-sm text-green-700">
              Follow these steps to release this duty:
            </p>
          </div>
        </div>

        <div className="space-y-3 ml-8">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Pick Another Priority Slot</p>
              <p className="text-xs text-gray-600 mt-1">
                Look for dates with ⭐ on the calendar. These sessions have priority time slots.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Pick a Session in Priority Time</p>
              <p className="text-xs text-gray-600 mt-1">
                Sessions with yellow backgrounds and ⭐ icons are priority slots.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Then Release This Slot</p>
              <p className="text-xs text-gray-600 mt-1">
                Once you have extra priority slots, you can release this one.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Option */}
      {pickedDuties.filter(d => {
        const duty = sessions.find(s => s.id === d.session_id);
        return duty && !isPrioritySession(duty);
      }).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">
              💡
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-1">Alternative</p>
              <p className="text-xs text-blue-700">
                You can release <strong>non-priority</strong> slots without restrictions. Check your duties list for slots without the ⭐ icon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => {
            setShowReleaseErrorModal(false);
            // Optionally navigate to calendar to help them find priority slots
          }}
          className="w-full sm:flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Star size={18} />
          Find Priority Slots
        </button>
        
        <button
          onClick={() => setShowReleaseErrorModal(false)}
          className="w-full sm:w-auto px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
        >
          Cancel
        </button>
      </div>

      {/* Info Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          <strong>Reminder:</strong> Priority slots ensure fair distribution of duties across all faculty members.
        </p>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
