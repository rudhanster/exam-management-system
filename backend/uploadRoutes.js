const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx-js-style');
const path = require('path');
const fs = require('fs');

// We'll receive the pool from server.js
let pool;

// Function to set the pool from server.js
const setPool = (dbPool) => {
  pool = dbPool;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only Excel files are allowed'));
    }
    cb(null, true);
  }
});

// Upload route
router.post('/upload-exam-data/:examTypeId', upload.single('excelFile'), async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not initialized' });
  }

  const client = await pool.connect();
  
  try {
    const { examTypeId } = req.params;
    
    // Validate examTypeId
   // ✅ Accept both UUIDs and numeric IDs
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const numericRegex = /^[0-9]+$/;

if (!examTypeId || (!uuidRegex.test(examTypeId) && !numericRegex.test(examTypeId))) {
  return res.status(400).json({ error: 'Invalid exam type ID format' });
}


    
    console.log('📤 Upload started for examTypeId:', examTypeId);
    
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('📊 Rows to process:', data.length);

    // Start transaction
    await client.query('BEGIN');

    const results = {
      coursesCreated: 0,
      coursesUpdated: 0,
      sessionsCreated: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 for header row and 0-index
      
      try {
        // Validate required fields
        if (!row['Course code']) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing course code',
            data: row
          });
          continue;
        }
        
        if (!row['Date']) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing date',
            courseCode: row['Course code']
          });
          continue;
        }

        // 1. Check if course exists, create or update
        const courseCheckQuery = `
          SELECT id FROM course WHERE course_code = $1
        `;
        const courseResult = await client.query(courseCheckQuery, [row['Course code']]);

        let courseId;
        if (courseResult.rows.length === 0) {
          // Create new course
          const insertCourseQuery = `
            INSERT INTO course (branch, course_code, course_name, semester, student_count)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `;
          const newCourse = await client.query(insertCourseQuery, [
            row['Branch'] || '',
            row['Course code'],
            row['Course Name'] || '',
            parseInt(row['Semester']) || 1,
            parseInt(row['Student Count']) || 0
          ]);
          courseId = newCourse.rows[0].id;
          results.coursesCreated++;
        } else {
          // Update existing course
          courseId = courseResult.rows[0].id;
          const updateCourseQuery = `
            UPDATE course 
            SET branch = $1, 
                course_name = $2, 
                semester = $3, 
                student_count = $4
            WHERE id = $5
          `;
          await client.query(updateCourseQuery, [
            row['Branch'] || '',
            row['Course Name'] || '',
            parseInt(row['Semester']) || 1,
            parseInt(row['Student Count']) || 0,
            courseId
          ]);
          results.coursesUpdated++;
        }

        // 2. Parse date and times
        const sessionDate = parseExcelDate(row['Date']);
        const startTime = parseExcelTime(row['Start Time']);
        const endTime = parseExcelTime(row['End Time']);
        const roomsRequired = parseInt(row['Rooms required']) || 1;

        // Validate parsed values
        if (!sessionDate) {
          results.errors.push({
            row: rowNumber,
            error: 'Invalid date format',
            courseCode: row['Course code'],
            value: row['Date']
          });
          continue;
        }

        if (!startTime || !endTime) {
          results.errors.push({
            row: rowNumber,
            error: 'Invalid time format',
            courseCode: row['Course code'],
            startTime: row['Start Time'],
            endTime: row['End Time']
          });
          continue;
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
          results.errors.push({
            row: rowNumber,
            error: 'Time must be in HH:MM format',
            courseCode: row['Course code'],
            startTime: startTime,
            endTime: endTime
          });
          continue;
        }

        // 3. Check for duplicate sessions
        const duplicateCheck = await client.query(`
          SELECT id FROM exam_session 
          WHERE session_date = $1 
            AND start_time = $2 
            AND course_id = $3 
            AND exam_type_id = $4
        `, [sessionDate, startTime, courseId, examTypeId]);

        if (duplicateCheck.rows.length > 0) {
          results.errors.push({
            row: rowNumber,
            error: 'Duplicate session',
            courseCode: row['Course code'],
            date: sessionDate,
            time: startTime
          });
          continue;
        }

       // 4. Create exam session
const insertSessionQuery = `
  INSERT INTO exam_session 
  (session_date, start_time, end_time, rooms_required, exam_type_id, course_id, status)
  VALUES ($1, $2, $3, $4, $5, $6, 'open')
  RETURNING id
`;

// Execute the insert query first
const sessionResult = await client.query(insertSessionQuery, [
  sessionDate,
  startTime,
  endTime,
  roomsRequired,
  examTypeId,
  courseId
]);

const sessionId = sessionResult.rows[0].id;

// ✅ Step 3: Skip slot creation if already exists
const existingSlots = await client.query(
  'SELECT COUNT(*) FROM session_room_slot WHERE session_id = $1',
  [sessionId]
);
const slotCount = parseInt(existingSlots.rows[0].count, 10);

if (slotCount === 0) {
  const numRooms = parseInt(roomsRequired || 1, 10);
  for (let i = 0; i < numRooms; i++) {
    await client.query(
      `INSERT INTO session_room_slot (session_id, status)
       VALUES ($1, 'free')`,
      [sessionId]
    );
  }
  results.sessionsCreated++;
} else {
  console.log(`⚠️ Slots already exist for session ${sessionId}, skipping creation.`);
}


      } catch (rowError) {
        const errorMsg = {
          row: rowNumber,
          error: rowError.message,
          courseCode: row['Course code'] || 'unknown'
        };
        
        results.errors.push(errorMsg);
        
        // Log to file
        const errorLog = path.join(__dirname, 'upload-errors.log');
        fs.appendFileSync(errorLog, `${new Date().toISOString()} - Row ${rowNumber}: ${rowError.message}\n`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    // Delete uploaded file
    fs.unlinkSync(file.path);

    console.log('✅ Upload complete:', results);

    res.json({
      success: true,
      message: 'Data uploaded successfully',
      results: {
        coursesCreated: results.coursesCreated,
        coursesUpdated: results.coursesUpdated,
        sessionsCreated: results.sessionsCreated,
        totalErrors: results.errors.length,
        errors: results.errors
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Upload error:', error);
    
    // Delete uploaded file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process upload',
      message: error.message 
    });
  } finally {
    client.release();
  }
});

// Helper functions to parse Excel dates and times
function parseExcelDate(excelDate) {
  if (!excelDate) return null;

  // 🔹 Handle string-based dates (dd/mm/yyyy or yyyy-mm-dd)
  if (typeof excelDate === 'string') {
    let dateStr = excelDate.trim();

    // If format looks like dd/mm/yyyy (contains '/')
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split(/[\/]/).map((v) => v.trim());
      if (day && month && year) {
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const parsed = new Date(isoDate);
        return isNaN(parsed.getTime()) ? null : isoDate; // ✅ return ISO string for DB
      }
    }

    // If format looks like yyyy-mm-dd (already valid ISO)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Fallback — try generic JS parse
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  }

  // 🔹 Handle numeric Excel serial dates
  if (typeof excelDate === 'number') {
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
    if (isNaN(jsDate.getTime())) return null;
    return jsDate.toISOString().split('T')[0];
  }

  return null;
}


function parseExcelTime(excelTime) {
  if (!excelTime) return null;
  
  // If it's a string like "09:00" or "9:00 AM"
  if (typeof excelTime === 'string') {
    // Handle "HH:MM" format
    if (/^\d{1,2}:\d{2}$/.test(excelTime)) {
      return excelTime;
    }
    
    // Handle "H:MM AM/PM" format
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(excelTime)) {
      const [time, period] = excelTime.split(/\s+/);
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return excelTime;
  }
  
  // If it's an Excel decimal (fraction of day)
  if (typeof excelTime === 'number') {
    // Excel times are stored as fractions of a day (0 to 1)
    let normalizedTime = excelTime;
    
    // If number is greater than 1, extract decimal portion
    if (excelTime > 1) {
      normalizedTime = excelTime % 1;
    }
    
    // Ensure it's between 0 and 1
    if (normalizedTime < 0 || normalizedTime > 1) {
      console.warn(`⚠️ Invalid time value: ${excelTime}`);
      return null;
    }
    
    const totalMinutes = Math.round(normalizedTime * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return null;
}

// Get recent upload errors
router.get('/upload-errors', (req, res) => {
  const errorLog = path.join(__dirname, 'upload-errors.log');
  
  if (fs.existsSync(errorLog)) {
    const errors = fs.readFileSync(errorLog, 'utf8');
    const lines = errors.split('\n').filter(line => line.trim()).slice(-50); // Last 50 errors
    
    res.json({ 
      message: 'Recent upload errors',
      errors: lines
    });
  } else {
    res.json({ 
      message: 'No errors logged yet',
      errors: []
    });
  }
});

// Get exam sessions by exam type
router.get('/exam-data/:examTypeId', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not initialized' });
  }

  try {
    const { examTypeId } = req.params;
    const result = await pool.query(`
      SELECT 
        es.*,
        c.course_code,
        c.course_name,
        c.branch,
        c.semester,
        c.student_count
      FROM exam_session es
      JOIN course c ON es.course_id = c.id
      WHERE es.exam_type_id = $1
      ORDER BY es.session_date, es.start_time
    `, [examTypeId]);
    
    res.json({
      success: true,
      count: result.rows.length,
      sessions: result.rows
    });
  } catch (error) {
    console.error('Error fetching exam data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch exam data',
      message: error.message 
    });
  }
});

// Export both router and setPool function
module.exports = { router, setPool };
