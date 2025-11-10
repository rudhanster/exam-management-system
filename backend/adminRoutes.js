const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const XLSX = require('xlsx-js-style');
const fs = require('fs');



let pool;

// ✅ Setter function (called from server.js)
const setPool = (dbPool) => {
  pool = dbPool;
};


// Validation middleware
const validateRequired = (fields) => (req, res, next) => {
  const missing = fields.filter(field => !req.body[field]);
  if (missing.length > 0) {
    return res.status(400).json({ 
      error: `Missing required fields: ${missing.join(', ')}` 
    });
  }
  next();
};
// ============================================================================
// FACULTY - GET ALL (for dropdowns and lists)
// ============================================================================

// GET /api/faculty - Get all faculty
router.get('/faculty', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, cadre, department, initials, min_duties, max_duties FROM faculty ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// GET /api/faculty/:id - Get single faculty
router.get('/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, email, cadre, department, initials, min_duties, max_duties FROM faculty WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// GET /api/admin/faculty/check-initials/:initials - Check if initials are available
router.get('/admin/faculty/check-initials/:initials', async (req, res) => {
  try {
    const { initials } = req.params;
    const { excludeId } = req.query; // Optional: exclude current faculty when editing
    
    let query = 'SELECT id FROM faculty WHERE LOWER(initials) = LOWER($1)';
    const params = [initials];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    
    res.json({ 
      available: result.rows.length === 0,
      message: result.rows.length === 0 
        ? 'Initials are available' 
        : 'This initial is already taken'
    });
  } catch (error) {
    console.error('Error checking initials:', error);
    res.status(500).json({ error: 'Failed to check initials' });
  }
});

// ============================================================================
// DUTY REQUIREMENTS MANAGEMENT
// ============================================================================

// Get duty requirements for an exam type
router.get('/admin/duty-requirements', async (req, res) => {
  const { exam_type_id } = req.query;
  
  try {
    const query = exam_type_id
      ? `SELECT * FROM cadre_duty_requirement WHERE exam_type_id = $1 ORDER BY cadre`
      : `SELECT * FROM cadre_duty_requirement ORDER BY exam_type_id, cadre`;
    
    const params = exam_type_id ? [exam_type_id] : [];
    const result = await req.pool.query(query, params);
    
    res.json(result.rows);  // Returns min_duties as-is from database
  } catch (err) {
    console.error('Error fetching duty requirements:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create or update duty requirement
router.post('/admin/duty-requirements', async (req, res) => {
  const { exam_type_id, cadre, min_duties } = req.body;  // ← Changed: min_duties (not minimum_duties)
  
  if (!exam_type_id || !cadre || min_duties === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields: exam_type_id, cadre, min_duties' 
    });
  }
  
  try {
    const result = await req.pool.query(
      `INSERT INTO cadre_duty_requirement (exam_type_id, cadre, min_duties)
       VALUES ($1, $2, $3)
       ON CONFLICT (exam_type_id, cadre) 
       DO UPDATE SET min_duties = EXCLUDED.min_duties
       RETURNING *`,
      [exam_type_id, cadre, min_duties]  // ← Use min_duties directly
    );
    
    res.json({ 
      success: true, 
      message: 'Duty requirement saved successfully',
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error saving duty requirement:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/duty-requirements/:id', async (req, res) => {
  const { id } = req.params;
  const { cadre, min_duties } = req.body;
  
  try {
    const result = await req.pool.query(
      `UPDATE cadre_duty_requirement 
       SET cadre = COALESCE($1, cadre),
           min_duties = COALESCE($2, min_duties),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [cadre, min_duties, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Duty requirement updated successfully',
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating duty requirement:', err);
    res.status(500).json({ error: err.message });
  }
});



// Delete duty requirement
router.delete('/admin/duty-requirements/:exam_type_id/:cadre', async (req, res) => {
  const { exam_type_id, cadre } = req.params;
  
  try {
    const result = await req.pool.query(
      'DELETE FROM cadre_duty_requirement WHERE exam_type_id = $1 AND cadre = $2 RETURNING *',
      [exam_type_id, cadre]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Duty requirement not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Duty requirement deleted successfully' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all faculty duty exceptions
router.get('/admin/faculty-duty-exceptions', async (req, res) => {
  const { exam_type_id, faculty_id } = req.query;
  
  try {
    let query = `
      SELECT 
        fdr.id,
        fdr.faculty_id,
        fdr.exam_type_id,
        fdr.min_duties,
        fdr.max_duties,
        fdr.reason,
        fdr.created_at,
        fdr.created_by,
        f.name as faculty_name,
        f.email as faculty_email,
        f.cadre,
        et.type_name as exam_type_name
      FROM faculty_duty_requirement fdr
      JOIN faculty f ON f.id = fdr.faculty_id
      JOIN exam_type et ON et.id = fdr.exam_type_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (exam_type_id) {
      query += ` AND fdr.exam_type_id = $${paramIndex}`;
      params.push(exam_type_id);
      paramIndex++;
    }
    
    if (faculty_id) {
      query += ` AND fdr.faculty_id = $${paramIndex}`;
      params.push(faculty_id);
      paramIndex++;
    }
    
    query += ' ORDER BY f.name ASC, et.type_name ASC';
    
    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching faculty duty exceptions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create faculty duty exception
router.post('/admin/faculty-duty-exceptions', async (req, res) => {
  const { faculty_id, exam_type_id, min_duties, max_duties, reason, created_by } = req.body;
  
  if (!faculty_id || !exam_type_id || min_duties === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields: faculty_id, exam_type_id, min_duties' 
    });
  }
  
  try {
    const result = await req.pool.query(
      `INSERT INTO faculty_duty_requirement 
        (faculty_id, exam_type_id, min_duties, max_duties, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (faculty_id, exam_type_id) 
       DO UPDATE SET 
         min_duties = EXCLUDED.min_duties,
         max_duties = EXCLUDED.max_duties,
         reason = EXCLUDED.reason,
         updated_at = now()
       RETURNING *`,
      [faculty_id, exam_type_id, min_duties, max_duties, reason, created_by || 'admin']
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Faculty duty exception saved successfully',
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error creating faculty duty exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update faculty duty exception
router.put('/admin/faculty-duty-exceptions/:id', async (req, res) => {
  const { id } = req.params;
  const { min_duties, max_duties, reason } = req.body;
  
  try {
    const result = await req.pool.query(
      `UPDATE faculty_duty_requirement 
       SET min_duties = COALESCE($1, min_duties),
           max_duties = COALESCE($2, max_duties),
           reason = COALESCE($3, reason),
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [min_duties, max_duties, reason, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exception not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Faculty duty exception updated successfully',
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating faculty duty exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete faculty duty exception
router.delete('/admin/faculty-duty-exceptions/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      'DELETE FROM faculty_duty_requirement WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exception not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Faculty duty exception deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting faculty duty exception:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/faculty-requirement', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not initialized' });
  }

  const { email, exam_type_id } = req.query;

  if (!email || !exam_type_id) {
    return res.status(400).json({ 
      error: 'Missing required parameters: email, exam_type_id' 
    });
  }

  try {
    console.log('🔍 Fetching faculty requirement for:', { email, exam_type_id });

    // Step 1: Get faculty ID and cadre from email
    const facultyResult = await pool.query(
      'SELECT id, cadre, name FROM faculty WHERE email = $1',
      [email]
    );

    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    const faculty = facultyResult.rows[0];
    console.log('✅ Faculty found:', faculty);

    // Step 2: Try to get faculty-specific exception (handle if table doesn't exist)
    let minDuties = null;
    let maxDuties = null;
    let source = null;
    let reason = null;

    try {
      const exceptionResult = await pool.query(
        'SELECT min_duties, max_duties, reason FROM faculty_duty_requirement WHERE faculty_id = $1 AND exam_type_id = $2',
        [faculty.id, exam_type_id]
      );

      if (exceptionResult.rows.length > 0) {
        minDuties = exceptionResult.rows[0].min_duties;
        maxDuties = exceptionResult.rows[0].max_duties;
        source = 'faculty_specific';
        reason = exceptionResult.rows[0].reason;
        console.log('✅ Found faculty-specific exception:', exceptionResult.rows[0]);
      }
    } catch (tableError) {
      // Table doesn't exist yet, that's okay - continue without exceptions
      console.log('ℹ️ faculty_duty_requirement table not found, using cadre-based requirements');
    }

    // Step 3: If no faculty exception, check cadre requirement
    if (minDuties === null) {
      try {
        const cadreResult = await pool.query(
          'SELECT min_duties FROM cadre_duty_requirement WHERE cadre = $1 AND exam_type_id = $2',
          [faculty.cadre, exam_type_id]
        );

        if (cadreResult.rows.length > 0) {
          minDuties = cadreResult.rows[0].min_duties;
          source = 'cadre_based';
          console.log('✅ Using cadre-based requirement:', minDuties);
        }
      } catch (cadreError) {
        console.log('ℹ️ cadre_duty_requirement table issue:', cadreError.message);
      }
    }

    // Step 4: If still no requirement, use faculty default
    if (minDuties === null) {
      minDuties = 2; // Default fallback
      source = 'default';
      console.log('ℹ️ Using default requirement: 2');
    }

    // Step 5: Get current duty count for this faculty and exam type
    const dutiesResult = await pool.query(`
      SELECT COUNT(DISTINCT srs.id) as current_duties
      FROM session_room_slot srs
      JOIN exam_session es ON es.id = srs.session_id
      WHERE srs.assigned_faculty_id = $1
        AND es.exam_type_id = $2
        AND srs.assigned_faculty_id IS NOT NULL
    `, [faculty.id, exam_type_id]);

    const currentDuties = parseInt(dutiesResult.rows[0]?.current_duties || 0);
    const remaining = Math.max(0, minDuties - currentDuties);
    const progress = minDuties > 0 ? Math.round((currentDuties / minDuties) * 100) : 100;
    const isMet = currentDuties >= minDuties;

    let status = 'not_met';
    if (isMet) status = 'met';
    else if (currentDuties > 0 && remaining <= 1) status = 'warning';

    console.log('📊 Calculated values:', {
      currentDuties,
      minDuties,
      maxDuties,
      remaining,
      progress,
      isMet,
      status,
      source
    });

    // Step 6: Return comprehensive response matching frontend expectations
    const response = {
      faculty: {
        id: faculty.id,
        name: faculty.name,
        email: email,
        cadre: faculty.cadre
      },
      requirement: {
        min_duties: minDuties,
        max_duties: maxDuties,
        current_duties: currentDuties,
        remaining: remaining,
        progress: progress,
        is_met: isMet,
        status: status,
        source: source,
        reason: reason
      }
    };

    console.log('✅ Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (err) {
    console.error('❌ Error fetching faculty requirement:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch requirement',
      message: err.message,
      detail: err.stack
    });
  }
});

// Get compliance status with exceptions considered
router.get('/admin/compliance-status', async (req, res) => {
  const { exam_type_id } = req.query;

  if (!exam_type_id) {
    return res.status(400).json({ error: 'Missing exam_type_id parameter' });
  }

  try {
    console.log('🔍 Fetching compliance status for exam_type_id:', exam_type_id);

    // Step 1: Get all faculty members (FIXED: department is a direct column)
    const facultyResult = await pool.query(`
      SELECT 
        f.id as faculty_id,
        f.name,
        f.email,
        f.cadre,
        f.department
      FROM faculty f
      ORDER BY f.name
    `);

    const allFaculty = facultyResult.rows;
    console.log(`✅ Found ${allFaculty.length} faculty members`);

    // Step 2: Get cadre-based requirements for this exam type
    const cadreRequirementsResult = await pool.query(`
      SELECT cadre, min_duties
      FROM cadre_duty_requirement
      WHERE exam_type_id = $1
    `, [exam_type_id]);

    // Build a map of cadre -> min_duties
    const cadreRequirements = {};
    cadreRequirementsResult.rows.forEach(row => {
      cadreRequirements[row.cadre] = parseInt(row.min_duties);
    });
    console.log('📋 Cadre requirements:', cadreRequirements);

    // Step 3: Get faculty-specific exceptions for this exam type
    const facultyExceptionsResult = await pool.query(`
      SELECT 
        faculty_id,
        min_duties,
        max_duties,
        reason
      FROM faculty_duty_requirement
      WHERE exam_type_id = $1
    `, [exam_type_id]);

    // Build a map of faculty_id -> exception
    const facultyExceptions = {};
    facultyExceptionsResult.rows.forEach(row => {
      facultyExceptions[row.faculty_id] = {
        min_duties: parseInt(row.min_duties),
        max_duties: row.max_duties ? parseInt(row.max_duties) : null,
        reason: row.reason,
        source: 'faculty_specific'
      };
    });
    console.log(`✅ Found ${facultyExceptionsResult.rows.length} faculty exceptions`);

    // Step 4: Get current duty counts for all faculty
    const dutiesResult = await pool.query(`
      SELECT 
        srs.assigned_faculty_id,
        COUNT(DISTINCT srs.id) as current_duties
      FROM session_room_slot srs
      JOIN exam_session es ON es.id = srs.session_id
      WHERE es.exam_type_id = $1
        AND srs.assigned_faculty_id IS NOT NULL
      GROUP BY srs.assigned_faculty_id
    `, [exam_type_id]);

    // Build a map of faculty_id -> current_duties
    const currentDuties = {};
    dutiesResult.rows.forEach(row => {
      currentDuties[row.assigned_faculty_id] = parseInt(row.current_duties);
    });
    console.log('📊 Current duties loaded');

    // Step 5: Process each faculty member
    const facultyCompliance = allFaculty.map(faculty => {
      const facultyId = faculty.faculty_id;
      const current = currentDuties[facultyId] || 0;
      
      // CRITICAL: Check for faculty-specific exception FIRST
      let minDuties, maxDuties = null, source, reason = null;

      if (facultyExceptions[facultyId]) {
        // Faculty has a specific exception - use it!
        minDuties = facultyExceptions[facultyId].min_duties;
        maxDuties = facultyExceptions[facultyId].max_duties;
        source = 'faculty_specific';
        reason = facultyExceptions[facultyId].reason;
        console.log(`✨ Using faculty exception for ${faculty.name}: min=${minDuties}, max=${maxDuties}`);
      } else if (cadreRequirements[faculty.cadre]) {
        // No exception - use cadre-based requirement
        minDuties = cadreRequirements[faculty.cadre];
        source = 'cadre_based';
      } else {
        // No requirement set - use default
        minDuties = 2;
        source = 'default';
      }

      // Calculate compliance metrics
      const remaining = Math.max(0, minDuties - current);
      const progress = minDuties > 0 ? Math.round((current / minDuties) * 100) : 100;
      const isMet = current >= minDuties;

      // Determine status
      let status = 'not_met';
      if (isMet) {
        status = 'met';
      } else if (current > 0 && remaining <= 1) {
        status = 'warning';
      } else {
        status = 'critical';
      }

      return {
        faculty_id: facultyId,
        name: faculty.name,
        email: faculty.email,
        cadre: faculty.cadre,
        department: faculty.department,
        min_duties: minDuties,
        max_duties: maxDuties,
        current_duties: current,
        remaining: remaining,
        progress: progress,
        is_met: isMet,
        status: status,
        source: source,
        reason: reason
      };
    });

    // Step 6: Calculate summary statistics
    const totalFaculty = facultyCompliance.length;
    const metCount = facultyCompliance.filter(f => f.status === 'met').length;
    const warningCount = facultyCompliance.filter(f => f.status === 'warning').length;
    const criticalCount = facultyCompliance.filter(f => f.status === 'critical').length;
    const belowTargetCount = facultyCompliance.filter(f => f.remaining > 0).length;

    const summary = {
      total_faculty: totalFaculty,
      requirements_met: metCount,
      below_target: belowTargetCount,
      critical: criticalCount,
      warning: warningCount
    };

    console.log('📊 Summary:', summary);

    // Step 7: Return response
    const response = {
      summary: summary,
      faculty: facultyCompliance
    };

    console.log(`✅ Returning compliance data for ${facultyCompliance.length} faculty members`);
    res.json(response);

  } catch (err) {
    console.error('❌ Error fetching compliance status:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch compliance status',
      message: err.message,
      detail: err.stack
    });
  }
});

// POST /api/admin/faculty
router.post('/admin/faculty', async (req, res) => {
  try {
    const { name, email, cadre, department, initials } = req.body;
    
    // Check for duplicate initials
    const existingInitials = await pool.query(
      'SELECT id FROM faculty WHERE LOWER(initials) = LOWER($1)',
      [initials]
    );
    
    if (existingInitials.rows.length > 0) {
      return res.status(400).json({ 
        error: 'This initial is already taken by another faculty member' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO faculty (name, email, cadre, department, initials) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, email, cadre, department, initials]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ error: 'Failed to create faculty' });
  }
});

// PUT /api/admin/faculty/:id
router.put('/admin/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, cadre, department, initials } = req.body;
    
    // Check for duplicate initials (excluding current faculty)
    const existingInitials = await pool.query(
      'SELECT id FROM faculty WHERE LOWER(initials) = LOWER($1) AND id != $2',
      [initials, id]
    );
    
    if (existingInitials.rows.length > 0) {
      return res.status(400).json({ 
        error: 'This initial is already taken by another faculty member' 
      });
    }
    
    const result = await pool.query(
      `UPDATE faculty 
       SET name = $1, email = $2, cadre = $3, department = $4, initials = $5
       WHERE id = $6 
       RETURNING *`,
      [name, email, cadre, department, initials, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating faculty:', error);
    res.status(500).json({ error: 'Failed to update faculty' });
  }
});

// Bulk create exceptions (for importing/batch operations)
router.post('/admin/faculty-duty-exceptions/bulk', async (req, res) => {
  const { exceptions, created_by } = req.body;
  
  if (!Array.isArray(exceptions) || exceptions.length === 0) {
    return res.status(400).json({ 
      error: 'exceptions array is required and must not be empty' 
    });
  }
  
  const client = await req.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };
    
    for (const exception of exceptions) {
      try {
        const { faculty_id, exam_type_id, min_duties, max_duties, reason } = exception;
        
        if (!faculty_id || !exam_type_id || min_duties === undefined) {
          results.errors.push({
            exception,
            error: 'Missing required fields'
          });
          continue;
        }
        
        const result = await client.query(
          `INSERT INTO faculty_duty_requirement 
            (faculty_id, exam_type_id, min_duties, max_duties, reason, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (faculty_id, exam_type_id) 
           DO UPDATE SET 
             min_duties = EXCLUDED.min_duties,
             max_duties = EXCLUDED.max_duties,
             reason = EXCLUDED.reason,
             updated_at = now()
           RETURNING (xmax = 0) as is_insert`,
          [faculty_id, exam_type_id, min_duties, max_duties, reason, created_by || 'admin']
        );
        
        if (result.rows[0].is_insert) {
          results.created++;
        } else {
          results.updated++;
        }
      } catch (err) {
        results.errors.push({
          exception,
          error: err.message
        });
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Bulk operation completed',
      results
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in bulk create exceptions:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// COMPLIANCE STATUS
// ============================================================================

router.get('/compliance-status', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not initialized' });
  }

  const { exam_type_id } = req.query;

  if (!exam_type_id) {
    return res.status(400).json({ error: 'Missing exam_type_id parameter' });
  }

  try {
    console.log('🔍 Fetching compliance status for exam_type_id:', exam_type_id);

    // Step 1: Get all faculty members
    const facultyResult = await pool.query(`
      SELECT 
        f.id as faculty_id,
        f.name,
        f.email,
        f.cadre,
        d.name as department
      FROM faculty f
      LEFT JOIN department d ON f.department_id = d.id
      ORDER BY f.name
    `);

    const allFaculty = facultyResult.rows;
    console.log(`✅ Found ${allFaculty.length} faculty members`);

    // Step 2: Get cadre-based requirements for this exam type
    const cadreRequirementsResult = await pool.query(`
      SELECT cadre, min_duties
      FROM cadre_duty_requirement
      WHERE exam_type_id = $1
    `, [exam_type_id]);

    // Build a map of cadre -> min_duties
    const cadreRequirements = {};
    cadreRequirementsResult.rows.forEach(row => {
      cadreRequirements[row.cadre] = parseInt(row.min_duties);
    });
    console.log('📋 Cadre requirements:', cadreRequirements);

    // Step 3: Get faculty-specific exceptions for this exam type
    const facultyExceptionsResult = await pool.query(`
      SELECT 
        faculty_id,
        min_duties,
        max_duties,
        reason
      FROM faculty_duty_requirement
      WHERE exam_type_id = $1
    `, [exam_type_id]);

    // Build a map of faculty_id -> exception
    const facultyExceptions = {};
    facultyExceptionsResult.rows.forEach(row => {
      facultyExceptions[row.faculty_id] = {
        min_duties: parseInt(row.min_duties),
        max_duties: row.max_duties ? parseInt(row.max_duties) : null,
        reason: row.reason,
        source: 'faculty_specific'
      };
    });
    console.log(`✅ Found ${facultyExceptionsResult.rows.length} faculty exceptions`);

    // Step 4: Get current duty counts for all faculty
    const dutiesResult = await pool.query(`
      SELECT 
        srs.assigned_faculty_id,
        COUNT(DISTINCT srs.id) as current_duties
      FROM session_room_slot srs
      JOIN exam_session es ON es.id = srs.session_id
      WHERE es.exam_type_id = $1
        AND srs.assigned_faculty_id IS NOT NULL
      GROUP BY srs.assigned_faculty_id
    `, [exam_type_id]);

    // Build a map of faculty_id -> current_duties
    const currentDuties = {};
    dutiesResult.rows.forEach(row => {
      currentDuties[row.assigned_faculty_id] = parseInt(row.current_duties);
    });
    console.log('📊 Current duties loaded');

    // Step 5: Process each faculty member
    const facultyCompliance = allFaculty.map(faculty => {
      const facultyId = faculty.faculty_id;
      const current = currentDuties[facultyId] || 0;
      
      // CRITICAL: Check for faculty-specific exception FIRST
      let minDuties;
      let maxDuties = null;
      let source;
      let reason = null;

      if (facultyExceptions[facultyId]) {
        // Faculty has a specific exception - use it!
        minDuties = facultyExceptions[facultyId].min_duties;
        maxDuties = facultyExceptions[facultyId].max_duties;
        source = 'faculty_specific';
        reason = facultyExceptions[facultyId].reason;
        console.log(`✨ Using faculty exception for ${faculty.name}: min=${minDuties}, max=${maxDuties}`);
      } else if (cadreRequirements[faculty.cadre]) {
        // No exception - use cadre-based requirement
        minDuties = cadreRequirements[faculty.cadre];
        source = 'cadre_based';
        console.log(`📋 Using cadre requirement for ${faculty.name}: min=${minDuties}`);
      } else {
        // No requirement set - use default
        minDuties = 2;
        source = 'default';
        console.log(`⚠️ Using default requirement for ${faculty.name}: min=${minDuties}`);
      }

      // Calculate compliance metrics
      const remaining = Math.max(0, minDuties - current);
      const progress = minDuties > 0 ? Math.round((current / minDuties) * 100) : 100;
      const isMet = current >= minDuties;

      // Determine status
      let status = 'not_met';
      if (isMet) {
        status = 'met';
      } else if (current > 0 && remaining <= 1) {
        status = 'warning';
      } else {
        status = 'critical';
      }

      return {
        faculty_id: facultyId,
        name: faculty.name,
        email: faculty.email,
        cadre: faculty.cadre,
        department: faculty.department,
        min_duties: minDuties,
        max_duties: maxDuties,
        current_duties: current,
        remaining: remaining,
        progress: progress,
        is_met: isMet,
        status: status,
        source: source,
        reason: reason
      };
    });

    // Step 6: Calculate summary statistics
    const totalFaculty = facultyCompliance.length;
    const metCount = facultyCompliance.filter(f => f.status === 'met').length;
    const warningCount = facultyCompliance.filter(f => f.status === 'warning').length;
    const criticalCount = facultyCompliance.filter(f => f.status === 'critical').length;
    const belowTargetCount = facultyCompliance.filter(f => f.remaining > 0).length;

    const summary = {
      total_faculty: totalFaculty,
      requirements_met: metCount,
      below_target: belowTargetCount,
      critical: criticalCount,
      warning: warningCount
    };

    console.log('📊 Summary:', summary);

    // Step 7: Return response
    const response = {
      summary: summary,
      faculty: facultyCompliance
    };

    console.log(`✅ Returning compliance data for ${facultyCompliance.length} faculty members`);
    res.json(response);

  } catch (err) {
    console.error('❌ Error fetching compliance status:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch compliance status',
      message: err.message,
      detail: err.stack
    });
  }
});

// ============================================================================
// TIME RESTRICTIONS MANAGEMENT
// ============================================================================

// Get time restrictions
// Get time restrictions
router.get('/admin/time-restrictions', async (req, res) => {
  const { exam_type_id } = req.query;
  
  try {
    const query = exam_type_id
      ? `SELECT * FROM cadre_time_restriction WHERE exam_type_id = $1 ORDER BY cadre, priority_start_time`
      : `SELECT * FROM cadre_time_restriction ORDER BY exam_type_id, cadre, priority_start_time`;
    
    const params = exam_type_id ? [exam_type_id] : [];
    const result = await req.pool.query(query, params);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching time restrictions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create time restriction
router.post('/admin/time-restrictions', async (req, res) => {
  const { exam_type_id, cadre, priority_start_time, priority_end_time, min_slots_required, priority_days } = req.body;
  
  if (!exam_type_id || !cadre || !priority_start_time || !priority_end_time) {
    return res.status(400).json({ 
      error: 'Missing required fields: exam_type_id, cadre, priority_start_time, priority_end_time' 
    });
  }
  
  try {
    const result = await req.pool.query(
      `INSERT INTO cadre_time_restriction 
        (exam_type_id, cadre, priority_start_time, priority_end_time, min_slots_required, priority_days)
       VALUES ($1, $2, $3::time, $4::time, $5, $6)
       RETURNING *`,
      [
        exam_type_id, 
        cadre, 
        priority_start_time, 
        priority_end_time, 
        min_slots_required || 2,
        priority_days && priority_days.length > 0 ? priority_days : null
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Time restriction created successfully',
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error creating time restriction:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update time restriction
router.put('/admin/time-restrictions/:id', async (req, res) => {
  const { id } = req.params;
  const { cadre, priority_start_time, priority_end_time, min_slots_required, priority_days } = req.body;
  
  try {
    const result = await req.pool.query(
      `UPDATE cadre_time_restriction 
       SET cadre = COALESCE($1, cadre),
           priority_start_time = COALESCE($2::time, priority_start_time),
           priority_end_time = COALESCE($3::time, priority_end_time),
           min_slots_required = COALESCE($4, min_slots_required),
           priority_days = COALESCE($5, priority_days),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [cadre, priority_start_time, priority_end_time, min_slots_required, priority_days, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time restriction not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Time restriction updated successfully',
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating time restriction:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete time restriction
router.delete('/admin/time-restrictions/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      'DELETE FROM cadre_time_restriction WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time restriction not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Time restriction deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting time restriction:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// RESTRICTION EXEMPTIONS
// ============================================================================

// Get exemptions
router.get('/admin/restriction-exemptions', async (req, res) => {
  const { exam_type_id } = req.query;
  
  try {
    let query = `
      SELECT 
        re.*,
        f.name as faculty_name,
        f.email as faculty_email,
        f.cadre
      FROM restriction_exemption re
      JOIN faculty f ON f.id = re.faculty_id
    `;
    
    const params = [];
    if (exam_type_id) {
      query += ' WHERE re.exam_type_id = $1';
      params.push(exam_type_id);
    }
    
    query += ' ORDER BY f.name ASC';
    
    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching exemptions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create exemption
router.post('/admin/restriction-exemptions', async (req, res) => {
  const { exam_type_id, faculty_email, reason, granted_by } = req.body;
  
  if (!exam_type_id || !faculty_email) {
    return res.status(400).json({ 
      error: 'Missing required fields: exam_type_id, faculty_email' 
    });
  }
  
  try {
    // Get faculty ID from email
    const facultyResult = await req.pool.query(
      'SELECT id FROM faculty WHERE email = $1',
      [faculty_email]
    );
    
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    
    const faculty_id = facultyResult.rows[0].id;
    
    const result = await req.pool.query(
      `INSERT INTO restriction_exemption (exam_type_id, faculty_id, reason, granted_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [exam_type_id, faculty_id, reason, granted_by || 'admin']
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Exemption created successfully',
      data: result.rows[0] 
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Exemption already exists for this faculty' });
    }
    console.error('Error creating exemption:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete exemption
router.delete('/admin/restriction-exemptions/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      'DELETE FROM restriction_exemption WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exemption not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Exemption deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting exemption:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORTS
// ============================================================================

// Faculty Duty Summary Report
router.get('/reports/faculty-duties', async (req, res) => {
  const { exam_type_id, start_date, end_date } = req.query;
  
  try {
    let query = `
      SELECT 
        f.name as faculty_name,
        f.cadre,
        f.department,
        f.email,
        COUNT(DISTINCT srs.id) as total_duties,
        COUNT(DISTINCT es.session_date) as unique_dates,
        STRING_AGG(DISTINCT et.type_name, ', ') as exam_types
      FROM faculty f
      LEFT JOIN session_room_slot srs ON srs.assigned_faculty_id = f.id
      LEFT JOIN exam_session es ON es.id = srs.session_id
      LEFT JOIN exam_type et ON et.id = es.exam_type_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (exam_type_id) {
      query += ` AND es.exam_type_id = $${paramIndex}`;
      params.push(exam_type_id);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND es.session_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND es.session_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += `
      GROUP BY f.id, f.name, f.cadre, f.department, f.email
      ORDER BY total_duties DESC, f.name ASC
    `;
    
    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in faculty-duties report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Detailed Faculty Assignments Report
router.get('/reports/faculty-assignments', async (req, res) => {
  const { exam_type_id, start_date, end_date } = req.query;
  
  try {
    let query = `
      SELECT 
        f.name as faculty_name,
        f.cadre,
        f.department,
        et.type_name as exam_type,
        c.course_code,
        c.course_name,
        es.session_date,
        es.start_time,
        es.end_time,
        r.room_code,
        r.location
      FROM session_room_slot srs
      JOIN faculty f ON f.id = srs.assigned_faculty_id
      JOIN exam_session es ON es.id = srs.session_id
      JOIN exam_type et ON et.id = es.exam_type_id
      JOIN course c ON c.id = es.course_id
      LEFT JOIN room r ON r.id = srs.room_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (exam_type_id) {
      query += ` AND es.exam_type_id = $${paramIndex}`;
      params.push(exam_type_id);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND es.session_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND es.session_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += ` ORDER BY es.session_date ASC, es.start_time ASC, f.name ASC`;
    
    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in faculty-assignments report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Session Coverage Report
router.get('/reports/session-coverage', async (req, res) => {
  const { exam_type_id, start_date, end_date } = req.query;
  
  try {
    let query = `
      SELECT 
        et.type_name as exam_type,
        c.course_code,
        c.course_name,
        es.session_date,
        es.start_time,
        es.end_time,
        es.rooms_required,
        COUNT(srs.id) as total_slots,
        COUNT(srs.assigned_faculty_id) as filled_slots,
        (es.rooms_required - COUNT(srs.assigned_faculty_id)) as vacant_slots,
        ROUND(100.0 * COUNT(srs.assigned_faculty_id) / es.rooms_required, 2) as coverage_percent
      FROM exam_session es
      JOIN exam_type et ON et.id = es.exam_type_id
      JOIN course c ON c.id = es.course_id
      LEFT JOIN session_room_slot srs ON srs.session_id = es.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (exam_type_id) {
      query += ` AND es.exam_type_id = $${paramIndex}`;
      params.push(exam_type_id);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND es.session_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND es.session_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += `
      GROUP BY et.type_name, c.course_code, c.course_name, es.session_date, 
               es.start_time, es.end_time, es.rooms_required, es.id
      ORDER BY es.session_date ASC, es.start_time ASC
    `;
    
    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in session-coverage report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Department Workload Report
router.get('/reports/department-workload', async (req, res) => {
  const { exam_type_id, start_date, end_date } = req.query;
  
  try {
    let query = `
      SELECT 
        f.department,
        COUNT(DISTINCT f.id) as total_faculty,
        COUNT(DISTINCT srs.id) as total_duties,
        ROUND(COUNT(DISTINCT srs.id)::numeric / NULLIF(COUNT(DISTINCT f.id), 0), 2) as avg_duties_per_faculty,
        COUNT(DISTINCT CASE WHEN f.cadre = 'Professor' THEN f.id END) as professors,
        COUNT(DISTINCT CASE WHEN f.cadre = 'Associate Professor' THEN f.id END) as associate_professors,
        COUNT(DISTINCT CASE WHEN f.cadre = 'Assistant Professor' THEN f.id END) as assistant_professors,
        COUNT(DISTINCT CASE WHEN f.cadre = 'Others' THEN f.id END) as others
      FROM faculty f
      LEFT JOIN session_room_slot srs ON srs.assigned_faculty_id = f.id
      LEFT JOIN exam_session es ON es.id = srs.session_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (exam_type_id) {
      query += ` AND (es.exam_type_id = $${paramIndex} OR es.id IS NULL)`;
      params.push(exam_type_id);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND (es.session_date >= $${paramIndex} OR es.id IS NULL)`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND (es.session_date <= $${paramIndex} OR es.id IS NULL)`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += `
      GROUP BY f.department
      ORDER BY total_duties DESC, f.department ASC
    `;
    
    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in department-workload report:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🧩 Fetch Courses by Exam Type
router.get('/courses/by-exam-type/:examTypeId', async (req, res) => {
  const { examTypeId } = req.params;
  console.log('📥 Fetching courses for examTypeId:', examTypeId);

  try {
    const result = await pool.query(
      `
      SELECT DISTINCT 
        c.id, 
        c.branch, 
        c.course_code, 
        c.course_name, 
        c.semester, 
        c.student_count
      FROM course c
      JOIN exam_session es ON es.course_id = c.id
      WHERE es.exam_type_id = $1
      ORDER BY c.branch, c.course_code
      `,
      [examTypeId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching courses by exam type:', err.message);
    res.status(500).json({ error: 'Failed to fetch courses by exam type', details: err.message });
  }
});




// Unassigned Slots Report
router.get('/reports/unassigned-slots', async (req, res) => {
  const { exam_type_id, start_date, end_date } = req.query;
  
  try {
    let query = `
      SELECT 
        et.type_name as exam_type,
        c.course_code,
        c.course_name,
        es.session_date,
        es.start_time,
        es.end_time,
        COUNT(srs.id) as unassigned_count,
        r.room_code,
        r.location
      FROM session_room_slot srs
      JOIN exam_session es ON es.id = srs.session_id
      JOIN exam_type et ON et.id = es.exam_type_id
      JOIN course c ON c.id = es.course_id
      LEFT JOIN room r ON r.id = srs.room_id
      WHERE srs.assigned_faculty_id IS NULL
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (exam_type_id) {
      query += ` AND es.exam_type_id = $${paramIndex}`;
      params.push(exam_type_id);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND es.session_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND es.session_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += `
      GROUP BY et.type_name, c.course_code, c.course_name, es.session_date, 
               es.start_time, es.end_time, r.room_code, r.location, es.id
      ORDER BY es.session_date ASC, es.start_time ASC
    `;
    
    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in unassigned-slots report:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload-exam-data/:examTypeId', upload.single('excelFile'), async (req, res) => {
  const client = await req.pool.connect();

  try {
    const { examTypeId } = req.params;

    if (!examTypeId || !examTypeId.match(/^[0-9a-fA-F-]{36}$/)) {
      return res.status(400).json({ error: 'Invalid or missing Exam Type ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = {
      coursesCreated: 0,
      coursesUpdated: 0,
      sessionsCreated: 0,
      errors: []
    };

    console.log(`📤 Upload started for examTypeId: ${examTypeId}`);
    console.log(`📊 Rows to process: ${rows.length}`);

    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel rows start at 2 (assuming headers on row 1)

      try {
        // 🧠 Normalize keys: lowercase + trimmed
        const normalizedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const cleanKey = key
            .toLowerCase()
            .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
            .trim();

          normalizedRow[cleanKey] = value;
        }

        const get = (key) => normalizedRow[key.toLowerCase().trim()] ?? null;

        // 🧹 Skip empty rows
        const allValues = Object.values(normalizedRow).map(v => (v ? v.toString().trim() : ''));
        if (allValues.every(v => v === '')) {
          console.log(`⚪ Skipping empty row ${rowNum}`);
          continue;
        }

        // 🧾 Extract normalized values
        const branch = get('branch')?.trim() || null;
        const courseCode = get('course code')?.trim() || get('coursecode') || null;
        const courseName = get('course name')?.trim() || null;
        const semester = parseInt(get('semester')) || 1;
        const studentCount = parseInt(get('student count')) || 0;
        const dateVal = get('date');
        const startTimeVal = get('start time');
        const endTimeVal = get('end time');
        const roomsRequired = parseInt(get('rooms required')) || 1;

        // 🚨 Validate required fields
        if (!courseCode || !dateVal) {
          results.errors.push({ row: rowNum, error: 'Missing course code or date', courseCode });
          continue;
        }

        // 🚨 Validate branch is present
        if (!branch) {
          results.errors.push({ row: rowNum, error: 'Missing branch', courseCode });
          continue;
        }

        // ✅ Parse date and time safely
        const sessionDate = parseExcelDate(dateVal);
        const startTime = parseExcelTime(startTimeVal);
        const endTime = parseExcelTime(endTimeVal);

        if (!sessionDate || !startTime || !endTime) {
          results.errors.push({ row: rowNum, error: 'Invalid date or time', courseCode });
          continue;
        }

        // ✅ Step 1: Upsert course with composite key (branch, course_code)
        const courseResult = await client.query(
          `INSERT INTO course (branch, course_code, course_name, semester, student_count)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (branch, course_code) 
           DO UPDATE SET 
             course_name = EXCLUDED.course_name,
             semester = EXCLUDED.semester,
             student_count = EXCLUDED.student_count
           RETURNING id, (xmax = 0) AS is_new`,
          [branch, courseCode, courseName, semester, studentCount]
        );

        const courseId = courseResult.rows[0].id;
        const isNewCourse = courseResult.rows[0].is_new;

        if (isNewCourse) {
          results.coursesCreated++;
        } else {
          results.coursesUpdated++;
        }

        // ✅ Step 2: Prevent duplicate sessions
        const dupCheck = await client.query(
          `SELECT id FROM exam_session
           WHERE session_date = $1 AND start_time = $2 AND course_id = $3 AND exam_type_id = $4`,
          [sessionDate, startTime, courseId, examTypeId]
        );

        if (dupCheck.rows.length > 0) {
          results.errors.push({ 
            row: rowNum, 
            error: 'Duplicate session', 
            courseCode, 
            branch,
            date: sessionDate, 
            time: startTime 
          });
          continue;
        }

        // ✅ Step 3: Insert exam session
        const sessionInsert = await client.query(
          `INSERT INTO exam_session 
           (session_date, start_time, end_time, rooms_required, exam_type_id, course_id, status)
           VALUES ($1, $2, $3, $4, $5::uuid, $6, 'open')
           RETURNING id`,
          [sessionDate, startTime, endTime, roomsRequired, examTypeId, courseId]
        );

        const sessionId = sessionInsert.rows[0].id;
        results.sessionsCreated++;

        // ✅ Step 4: Trigger will automatically create room slots via assign_rooms_to_session()
        // No manual slot creation needed if trigger is active

        console.log(`✅ Created session for ${branch}-${courseCode} on ${sessionDate} at ${startTime}`);

      } catch (err) {
        console.error(`❌ Error at row ${rowNum}:`, err.message);
        results.errors.push({
          row: rowNum,
          courseCode: row['Course code'] || row['course code'] || '',
          error: err.message
        });
      }
    }

    await client.query('COMMIT');
    console.log('✅ Upload complete:', results);
    res.json({ success: true, message: 'Upload successful', results });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Upload failed:', err.message);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  } finally {
    client.release();
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});


    await client.query('COMMIT');
    res.json({ success: true, message: 'Upload successful', results });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Upload failed:', err.message);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  } finally {
    client.release();
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});





// ✅ Date/time parser helpers
function parseExcelDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  return null;
}

function parseExcelTime(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (match) {
      let [_, h, m, period] = match;
      h = parseInt(h); m = parseInt(m);
      if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  if (typeof value === 'number') {
    const totalMinutes = Math.round((value % 1) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return null;
}

// Copy from: backend-route-final.js

router.get('/reports/course-faculty-allocation', async (req, res) => {
  try {
    const { exam_type_id, start_date, end_date } = req.query;

    let whereConditions = ['es.course_id IS NOT NULL'];
    const params = [];
    let paramCounter = 1;

    if (exam_type_id) {
      whereConditions.push(`es.exam_type_id = $${paramCounter}`);
      params.push(exam_type_id);
      paramCounter++;
    }

    if (start_date?.trim()) {
      whereConditions.push(`es.session_date >= $${paramCounter}`);
      params.push(start_date);
      paramCounter++;
    }

    if (end_date?.trim()) {
      whereConditions.push(`es.session_date <= $${paramCounter}`);
      params.push(end_date);
      paramCounter++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        c.branch,
        c.course_code,
        c.course_name,
        c.semester,
        c.student_count,
        es.session_date,
        TO_CHAR(es.session_date, 'DD-MM-YYYY') AS formatted_date,
        TO_CHAR(es.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(es.end_time, 'HH24:MI') AS end_time,
        et.type_name AS exam_type,
        COALESCE(
          json_agg(
            json_build_object(
              'room_code', r.room_code,
              'faculty_initials', f.initials,
              'faculty_name', f.name,
              'department', f.department,
              'status', srs.status
            ) ORDER BY r.room_code
          ) FILTER (WHERE srs.id IS NOT NULL),
          '[]'::json
        ) AS rooms
      FROM exam_session es
      INNER JOIN course c ON es.course_id = c.id
      INNER JOIN exam_type et ON es.exam_type_id = et.id
      LEFT JOIN session_room_slot srs ON es.id = srs.session_id
      LEFT JOIN room r ON srs.room_id = r.id
      LEFT JOIN faculty f ON srs.assigned_faculty_id = f.id
      ${whereClause}
      GROUP BY 
        c.id, c.branch, c.course_code, c.course_name, 
        c.semester, c.student_count, es.session_date, 
        es.start_time, es.end_time, et.type_name
      ORDER BY 
        es.session_date, es.start_time, c.branch, c.course_code;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating course-faculty allocation report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: error.message,
    });
  }
});


// Backend Route for Course-Faculty Allocation Report
// Grouped by Date, Time, and Branch (like the exam timetable format)

router.get('/api/reports/course-faculty-allocation', async (req, res) => {
  try {
    const { exam_type_id, start_date, end_date } = req.query;
    
    let whereConditions = ['es.course_id IS NOT NULL'];
    let params = [];
    let paramCounter = 1;

    if (exam_type_id) {
      whereConditions.push(`es.exam_type_id = $${paramCounter}`);
      params.push(exam_type_id);
      paramCounter++;
    }

    if (start_date && start_date.trim() !== '') {
      whereConditions.push(`es.session_date >= $${paramCounter}`);
      params.push(start_date);
      paramCounter++;
    }

    if (end_date && end_date.trim() !== '') {
      whereConditions.push(`es.session_date <= $${paramCounter}`);
      params.push(end_date);
      paramCounter++;
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const query = `
      SELECT 
        c.branch,
        c.course_code,
        c.course_name,
        c.semester,
        c.student_count,
        es.session_date,
        TO_CHAR(es.session_date, 'DD-MM-YYYY') as formatted_date,
        TO_CHAR(es.start_time, 'HH24:MI') as start_time,
        TO_CHAR(es.end_time, 'HH24:MI') as end_time,
        et.type_name as exam_type,
        COALESCE(
          json_agg(
            json_build_object(
              'room_code', r.room_code,
              'faculty_initials', CASE 
                WHEN f.name IS NOT NULL THEN 
                  UPPER(
                    SUBSTRING(SPLIT_PART(f.name, ' ', 1), 1, 1) || 
                    SUBSTRING(SPLIT_PART(f.name, ' ', 2), 1, 1) ||
                    CASE 
                      WHEN SPLIT_PART(f.name, ' ', 3) != '' 
                      THEN SUBSTRING(SPLIT_PART(f.name, ' ', 3), 1, 1)
                      ELSE ''
                    END
                  )
                ELSE NULL 
              END,
              'faculty_name', f.name,
              'department', f.department,
              'status', srs.status
            ) ORDER BY r.room_code
          ) FILTER (WHERE srs.id IS NOT NULL),
          '[]'::json
        ) as rooms
      FROM exam_session es
      INNER JOIN course c ON es.course_id = c.id
      INNER JOIN exam_type et ON es.exam_type_id = et.id
      LEFT JOIN session_room_slot srs ON es.id = srs.session_id
      LEFT JOIN room r ON srs.room_id = r.id
      LEFT JOIN faculty f ON srs.assigned_faculty_id = f.id
      ${whereClause}
      GROUP BY 
        c.id, c.branch, c.course_code, c.course_name, 
        c.semester, c.student_count, es.session_date, 
        es.start_time, es.end_time, et.type_name
      ORDER BY 
        es.session_date,           -- First by date
        es.start_time,             -- Then by time slot
        c.branch,                  -- Then by branch
        c.course_code              -- Finally by course code
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating course-faculty allocation report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
});


// Add these routes to your adminRoutes.js file

// ============================================================================
// FACULTY DUTIES REPORT
// ============================================================================
router.get('/reports/faculty-duties', async (req, res) => {
  try {
    const { exam_type_id, start_date, end_date } = req.query;
    
    let whereConditions = [];
    let params = [];
    let paramCounter = 1;

    if (exam_type_id) {
      whereConditions.push(`es.exam_type_id = $${paramCounter}`);
      params.push(exam_type_id);
      paramCounter++;
    }

    if (start_date && start_date.trim() !== '') {
      whereConditions.push(`es.session_date >= $${paramCounter}`);
      params.push(start_date);
      paramCounter++;
    }

    if (end_date && end_date.trim() !== '') {
      whereConditions.push(`es.session_date <= $${paramCounter}`);
      params.push(end_date);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        f.name as faculty_name,
        f.cadre,
        f.department,
        f.email,
        TO_CHAR(es.session_date, 'DD-MM-YYYY') as date,
        TO_CHAR(es.start_time, 'HH24:MI') as start_time,
        TO_CHAR(es.end_time, 'HH24:MI') as end_time,
        c.course_code,
        c.course_name,
        c.branch,
        r.room_code,
        srs.status,
        et.type_name as exam_type
      FROM faculty f
      INNER JOIN session_room_slot srs ON f.id = srs.assigned_faculty_id
      INNER JOIN exam_session es ON srs.session_id = es.id
      INNER JOIN exam_type et ON es.exam_type_id = et.id
      LEFT JOIN course c ON es.course_id = c.id
      LEFT JOIN room r ON srs.room_id = r.id
      ${whereClause}
      ORDER BY f.name, es.session_date, es.start_time
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating faculty duties report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
});

// ============================================================================
// ROOM ALLOCATION REPORT
// ============================================================================
router.get('/reports/room-allocation', async (req, res) => {
  try {
    const { exam_type_id, start_date, end_date } = req.query;
    
    let whereConditions = [];
    let params = [];
    let paramCounter = 1;

    if (exam_type_id) {
      whereConditions.push(`es.exam_type_id = $${paramCounter}`);
      params.push(exam_type_id);
      paramCounter++;
    }

    if (start_date && start_date.trim() !== '') {
      whereConditions.push(`es.session_date >= $${paramCounter}`);
      params.push(start_date);
      paramCounter++;
    }

    if (end_date && end_date.trim() !== '') {
      whereConditions.push(`es.session_date <= $${paramCounter}`);
      params.push(end_date);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        r.room_code,
        r.capacity,
        TO_CHAR(es.session_date, 'DD-MM-YYYY') as date,
        TO_CHAR(es.start_time, 'HH24:MI') as start_time,
        TO_CHAR(es.end_time, 'HH24:MI') as end_time,
        c.course_code,
        c.course_name,
        c.branch,
        c.student_count,
        f.name as faculty_name,
        f.cadre,
        srs.status,
        et.type_name as exam_type
      FROM room r
      INNER JOIN session_room_slot srs ON r.id = srs.room_id
      INNER JOIN exam_session es ON srs.session_id = es.id
      INNER JOIN exam_type et ON es.exam_type_id = et.id
      LEFT JOIN course c ON es.course_id = c.id
      LEFT JOIN faculty f ON srs.assigned_faculty_id = f.id
      ${whereClause}
      ORDER BY r.room_code, es.session_date, es.start_time
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating room allocation report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
});

// ============================================================================
// EXAM SCHEDULE REPORT
// ============================================================================
router.get('/reports/exam-schedule', async (req, res) => {
  try {
    const { exam_type_id, start_date, end_date } = req.query;
    
    let whereConditions = [];
    let params = [];
    let paramCounter = 1;

    if (exam_type_id) {
      whereConditions.push(`es.exam_type_id = $${paramCounter}`);
      params.push(exam_type_id);
      paramCounter++;
    }

    if (start_date && start_date.trim() !== '') {
      whereConditions.push(`es.session_date >= $${paramCounter}`);
      params.push(start_date);
      paramCounter++;
    }

    if (end_date && end_date.trim() !== '') {
      whereConditions.push(`es.session_date <= $${paramCounter}`);
      params.push(end_date);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        TO_CHAR(es.session_date, 'DD-MM-YYYY') as date,
        TO_CHAR(es.start_time, 'HH24:MI') as start_time,
        TO_CHAR(es.end_time, 'HH24:MI') as end_time,
        c.course_code,
        c.course_name,
        c.branch,
        c.semester,
        c.student_count,
        et.type_name as exam_type,
        COUNT(DISTINCT srs.room_id) as rooms_allocated,
        COUNT(DISTINCT srs.assigned_faculty_id) as faculty_assigned,
        STRING_AGG(DISTINCT r.room_code, ', ' ORDER BY r.room_code) as room_list
      FROM exam_session es
      INNER JOIN exam_type et ON es.exam_type_id = et.id
      LEFT JOIN course c ON es.course_id = c.id
      LEFT JOIN session_room_slot srs ON es.id = srs.session_id
      LEFT JOIN room r ON srs.room_id = r.id
      ${whereClause}
      GROUP BY 
        es.id, es.session_date, es.start_time, es.end_time,
        c.course_code, c.course_name, c.branch, c.semester, 
        c.student_count, et.type_name
      ORDER BY es.session_date, es.start_time, c.branch, c.course_code
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating exam schedule report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
});

// ============================================================================
// DUTY SUMMARY REPORT
// ============================================================================
router.get('/reports/duty-summary', async (req, res) => {
  try {
    const { exam_type_id, start_date, end_date } = req.query;
    
    let whereConditions = [];
    let params = [];
    let paramCounter = 1;

    if (exam_type_id) {
      whereConditions.push(`es.exam_type_id = $${paramCounter}`);
      params.push(exam_type_id);
      paramCounter++;
    }

    if (start_date && start_date.trim() !== '') {
      whereConditions.push(`es.session_date >= $${paramCounter}`);
      params.push(start_date);
      paramCounter++;
    }

    if (end_date && end_date.trim() !== '') {
      whereConditions.push(`es.session_date <= $${paramCounter}`);
      params.push(end_date);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        f.name as faculty_name,
        f.cadre,
        f.department,
        f.email,
        COUNT(DISTINCT srs.id) as total_duties,
        COUNT(DISTINCT es.session_date) as unique_dates,
        STRING_AGG(DISTINCT TO_CHAR(es.session_date, 'DD-MM-YYYY'), ', ' 
          ORDER BY TO_CHAR(es.session_date, 'DD-MM-YYYY')) as duty_dates,
        et.type_name as exam_type,
        COALESCE(cdr.min_duties, 0) as required_duties,
        CASE 
          WHEN COUNT(DISTINCT srs.id) >= COALESCE(cdr.min_duties, 0) THEN 'Met'
          WHEN COALESCE(cdr.min_duties, 0) - COUNT(DISTINCT srs.id) <= 1 THEN 'Warning'
          ELSE 'Below Required'
        END as compliance_status
      FROM faculty f
      INNER JOIN session_room_slot srs ON f.id = srs.assigned_faculty_id
      INNER JOIN exam_session es ON srs.session_id = es.id
      INNER JOIN exam_type et ON es.exam_type_id = et.id
      LEFT JOIN cadre_duty_requirement cdr 
        ON cdr.cadre = f.cadre AND cdr.exam_type_id = es.exam_type_id
      ${whereClause}
      GROUP BY 
        f.id, f.name, f.cadre, f.department, f.email, 
        et.type_name, cdr.min_duties
      ORDER BY f.name
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating duty summary report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
});

// Get next upcoming exam type
router.get('/exam-types/next-upcoming', async (req, res) => {
  try {
    // Get the exam type with the earliest upcoming session
    const upcomingQuery = `
      SELECT et.id, et.type_name, et.description,
             MIN(es.session_date) as next_date
      FROM exam_type et
      INNER JOIN exam_session es ON et.id = es.exam_type_id
      WHERE es.session_date >= CURRENT_DATE
      GROUP BY et.id, et.type_name, et.description
      ORDER BY next_date ASC, et.id ASC
      LIMIT 1
    `;
    
    const result = await req.pool.query(upcomingQuery);
    
    if (result.rows.length > 0) {
      const { next_date, ...examType } = result.rows[0]; // Remove next_date from response
      return res.json(examType);
    }
    
    // If no upcoming, get most recent exam type
    const recentQuery = `
      SELECT et.id, et.type_name, et.description,
             MAX(es.session_date) as last_date
      FROM exam_type et
      INNER JOIN exam_session es ON et.id = es.exam_type_id
      GROUP BY et.id, et.type_name, et.description
      ORDER BY last_date DESC, et.id DESC
      LIMIT 1
    `;
    
    const recentResult = await req.pool.query(recentQuery);
    
    if (recentResult.rows.length > 0) {
      const { last_date, ...examType } = recentResult.rows[0]; // Remove last_date from response
      return res.json(examType);
    }
    
    res.json(null);
    
  } catch (err) {
    console.error('Error fetching next upcoming exam:', err);
    res.status(500).json({ error: err.message });
  }

});

async function hasSchedulingConflict(client, facultyId, sessionDate, startTime, endTime, newAssignments) {
  // Check 1: Database conflicts (existing assignments from previous runs)
  const dbConflictQuery = `
    SELECT COUNT(*) as conflict_count
    FROM session_room_slot srs
    JOIN exam_session es ON srs.session_id = es.id
    WHERE srs.assigned_faculty_id = $1
      AND srs.status = 'assigned'
      AND es.session_date = $2
      AND (
        (es.start_time, es.end_time) OVERLAPS ($3::time, $4::time)
        OR
        (es.start_time = $3::time AND es.end_time = $4::time)
      )
  `;
  
  const dbResult = await client.query(dbConflictQuery, [
    facultyId,
    sessionDate,
    startTime,
    endTime
  ]);
  
  const dbConflicts = parseInt(dbResult.rows[0].conflict_count);
  
  // Check 2: In-memory conflicts (assignments made during this run)
  const memoryConflicts = newAssignments.filter(assignment => {
    if (assignment.faculty_id !== facultyId) return false;
    
    const assignDate = assignment.session_date instanceof Date 
      ? assignment.session_date.toISOString().split('T')[0]
      : new Date(assignment.session_date).toISOString().split('T')[0];
    const slotDate = sessionDate instanceof Date
      ? sessionDate.toISOString().split('T')[0]
      : new Date(sessionDate).toISOString().split('T')[0];
    
    if (assignDate !== slotDate) return false;
    
    if (assignment.start_time === startTime && assignment.end_time === endTime) {
      return true;
    }
    
    return false;
  }).length;
  
  const totalConflicts = dbConflicts + memoryConflicts;
  
  if (totalConflicts > 0) {
    const dateStr = sessionDate instanceof Date
      ? sessionDate.toISOString().split('T')[0]
      : new Date(sessionDate).toISOString().split('T')[0];
    console.log(`   ⏩ Conflict on ${dateStr} ${startTime}-${endTime} (DB: ${dbConflicts}, Memory: ${memoryConflicts})`);
  }
  
  return totalConflicts > 0;
}

router.post('/admin/auto-assign-v2', async (req, res) => {
  const { exam_type_id, dry_run = false, enable_reallocation = true } = req.body;
  
  if (!exam_type_id) {
    return res.status(400).json({ error: 'exam_type_id is required' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`\n🤖 Starting ENHANCED auto-assignment for exam type: ${exam_type_id}`);
    console.log(`   Dry run: ${dry_run ? 'YES' : 'NO'}`);
    console.log(`   Reallocation enabled: ${enable_reallocation ? 'YES' : 'NO'}`);
    
    // ========================================================================
    // STEP 1: Get cadre duty requirements (the ratios)
    // ========================================================================
    const cadreReqQuery = `
      SELECT cadre, min_duties
      FROM cadre_duty_requirement
      WHERE exam_type_id = $1
      ORDER BY min_duties ASC
    `;
    
    const cadreReqResult = await client.query(cadreReqQuery, [exam_type_id]);
    const cadreRequirements = cadreReqResult.rows;
    
    if (cadreRequirements.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'No cadre duty requirements found. Please configure requirements first.' 
      });
    }
    
    console.log('📋 Cadre Requirements:');
    cadreRequirements.forEach(cr => {
      console.log(`   ${cr.cadre}: ${cr.min_duties} duties minimum`);
    });
    
    // ========================================================================
    // STEP 2: Get total available duties (free + assigned)
    // ========================================================================
    const totalDutiesQuery = `
      SELECT COUNT(*) as total
      FROM session_room_slot srs
      JOIN exam_session es ON srs.session_id = es.id
      WHERE es.exam_type_id = $1
    `;
    
    const totalDutiesResult = await client.query(totalDutiesQuery, [exam_type_id]);
    const totalDuties = parseInt(totalDutiesResult.rows[0].total);
    
    console.log(`\n📊 Total duties available: ${totalDuties}`);
    
    // ========================================================================
    // STEP 3: Calculate proportional distribution
    // ========================================================================
    const totalRatioUnits = cadreRequirements.reduce((sum, cr) => sum + cr.min_duties, 0);
    
    const cadreAllocation = {};
    let allocatedTotal = 0;
    
    cadreRequirements.forEach((cr, index) => {
      let targetDuties;
      
      if (index === cadreRequirements.length - 1) {
        targetDuties = totalDuties - allocatedTotal;
      } else {
        targetDuties = Math.round(totalDuties * (cr.min_duties / totalRatioUnits));
        allocatedTotal += targetDuties;
      }
      
      cadreAllocation[cr.cadre] = {
        ratio: cr.min_duties,
        target_duties: targetDuties,
        min_per_faculty: cr.min_duties
      };
    });
    
    console.log('\n🎯 Proportional Distribution:');
    Object.entries(cadreAllocation).forEach(([cadre, allocation]) => {
      const percentage = ((allocation.target_duties / totalDuties) * 100).toFixed(1);
      console.log(`   ${cadre}: ${allocation.target_duties} duties (${percentage}%) - Ratio: ${allocation.ratio}`);
    });
    
    // ========================================================================
    // STEP 4: Get all faculty with their current assignments
    // ========================================================================
    const facultyQuery = `
      SELECT 
        f.id,
        f.name,
        f.email,
        f.cadre,
        f.department,
        COALESCE(cdr.min_duties, 0) as cadre_min_duties,
        COALESCE(fdr.min_duties, cdr.min_duties, 0) as effective_min_duties,
        COALESCE(fdr.max_duties, 999) as effective_max_duties,
        CASE WHEN re.id IS NOT NULL THEN TRUE ELSE FALSE END as has_exemption,
        COALESCE(
          (SELECT COUNT(*) 
           FROM session_room_slot srs2
           JOIN exam_session es2 ON srs2.session_id = es2.id
           WHERE srs2.assigned_faculty_id = f.id
             AND srs2.status = 'assigned'
             AND es2.exam_type_id = $1), 0
        ) as current_duties,
        CASE WHEN fdc.confirmed = TRUE THEN TRUE ELSE FALSE END as is_confirmed
      FROM faculty f
      LEFT JOIN cadre_duty_requirement cdr 
        ON cdr.cadre = f.cadre AND cdr.exam_type_id = $1
      LEFT JOIN faculty_duty_requirement fdr
        ON fdr.faculty_id = f.id AND fdr.exam_type_id = $1
      LEFT JOIN restriction_exemption re
        ON re.faculty_id = f.id AND re.exam_type_id = $1
      LEFT JOIN faculty_duty_confirmation fdc
        ON fdc.faculty_id = f.id AND fdc.exam_type_id = $1
      WHERE cdr.cadre IS NOT NULL
      ORDER BY f.cadre, f.name
    `;
    
    const facultyResult = await client.query(facultyQuery, [exam_type_id]);
    const allFaculty = facultyResult.rows;
    
    console.log(`\n👥 Total faculty: ${allFaculty.length}`);
    
    // Group faculty by cadre
    const facultyByCadre = {};
    allFaculty.forEach(faculty => {
      if (!facultyByCadre[faculty.cadre]) {
        facultyByCadre[faculty.cadre] = [];
      }
      facultyByCadre[faculty.cadre].push(faculty);
    });
    
    console.log('\n👥 Faculty by Cadre:');
    Object.entries(facultyByCadre).forEach(([cadre, faculties]) => {
      const eligible = faculties.filter(f => !f.is_confirmed && !f.has_exemption).length;
      console.log(`   ${cadre}: ${faculties.length} total, ${eligible} eligible`);
    });
    
    // ========================================================================
    // STEP 5: Calculate target duties per faculty within each cadre
    // ========================================================================
    const facultyTargets = {};

    Object.entries(facultyByCadre).forEach(([cadre, faculties]) => {
      const cadreTarget = cadreAllocation[cadre]?.target_duties || 0;

      // ✅ Count ALL non-confirmed faculty (including exempted with custom limits)
      const eligibleFaculty = faculties.filter(f => 
        !f.is_confirmed && 
        f.current_duties < f.effective_max_duties
      );
      const eligibleCount = eligibleFaculty.length;

      if (eligibleCount === 0) {
        console.log(`   ⚠️ No eligible faculty in ${cadre} - duties may go unassigned`);
        faculties.forEach(faculty => {
          facultyTargets[faculty.id] = {
            faculty_id: faculty.id,
            name: faculty.name,
            cadre: faculty.cadre,
            current_duties: faculty.current_duties,
            target_duties: faculty.current_duties,
            min_duties: faculty.effective_min_duties,
            max_duties: faculty.effective_max_duties,
            deficit: Math.max(0, faculty.effective_min_duties - faculty.current_duties),
            surplus: 0,
            needs_more: faculty.current_duties < faculty.effective_min_duties,
            is_confirmed: faculty.is_confirmed,
            has_exemption: faculty.has_exemption
          };
        });
        return;
      }

      // Calculate fair distribution among eligible faculty
      const baseTarget = Math.floor(cadreTarget / eligibleCount);
      const remainder = cadreTarget % eligibleCount;

      let eligibleIndex = 0;

      faculties.forEach(faculty => {
        const isEligible = !faculty.is_confirmed && 
                          faculty.current_duties < faculty.effective_max_duties;
        let target;

        if (isEligible) {
          let idealTarget = baseTarget + (eligibleIndex < remainder ? 1 : 0);
          eligibleIndex++;
          
          // ✅ Cap at faculty's max (whether exempted or not)
          target = Math.min(idealTarget, faculty.effective_max_duties);
        } else {
          // Confirmed faculty or already at max keep current duties
          target = faculty.current_duties;
        }

        facultyTargets[faculty.id] = {
          faculty_id: faculty.id,
          name: faculty.name,
          cadre: faculty.cadre,
          current_duties: faculty.current_duties,
          target_duties: target,
          min_duties: faculty.effective_min_duties,
          max_duties: faculty.effective_max_duties,
          deficit: Math.max(0, faculty.effective_min_duties - faculty.current_duties),
          surplus: Math.max(0, faculty.current_duties - target),
          needs_more: faculty.current_duties < faculty.effective_min_duties,
          is_confirmed: faculty.is_confirmed,
          has_exemption: faculty.has_exemption
        };
      });
    });

    console.log('\n🎯 Faculty Targets:');
    Object.values(facultyTargets).forEach(ft => {
      const status = ft.needs_more ? '⚠️ BELOW MIN' : '✓';
      const exemptTag = ft.has_exemption ? ' (Custom limits)' : '';
      const confirmedTag = ft.is_confirmed ? ' (Confirmed)' : '';
      console.log(`   ${status} ${ft.name}${exemptTag}${confirmedTag} (${ft.cadre}): ${ft.current_duties} → ${ft.target_duties} (min: ${ft.min_duties}, max: ${ft.max_duties})`);
    });
    
    // ========================================================================
    // STEP 6: Get all slots (free and assigned) for reallocation
    // ========================================================================
    const allSlotsQuery = `
      SELECT 
        srs.id as slot_id,
        srs.session_id,
        srs.assigned_faculty_id,
        srs.status,
        es.session_date,
        es.start_time,
        es.end_time,
        c.course_code,
        r.room_code,
        f.cadre as assigned_cadre,
        f.name as assigned_faculty_name
      FROM session_room_slot srs
      JOIN exam_session es ON srs.session_id = es.id
      JOIN course c ON es.course_id = c.id
      JOIN room r ON srs.room_id = r.id
      LEFT JOIN faculty f ON srs.assigned_faculty_id = f.id
      WHERE es.exam_type_id = $1
      ORDER BY es.session_date, es.start_time, c.course_code, r.room_code
    `;
    
    const allSlotsResult = await client.query(allSlotsQuery, [exam_type_id]);
    const allSlots = allSlotsResult.rows;
    
    // Separate into free and assigned
    const freeSlots = allSlots.filter(s => s.status === 'free');
    const assignedSlots = allSlots.filter(s => s.status === 'assigned');
    
    console.log(`\n📊 Slot Status:`);
    console.log(`   Free slots: ${freeSlots.length}`);
    console.log(`   Assigned slots: ${assignedSlots.length}`);
    
    // ========================================================================
    // STEP 7: PHASE 3 - Smart Reallocation (Balance loads)
    // ========================================================================
    const executedReallocations = [];
    
    if (enable_reallocation && assignedSlots.length > 0) {
      console.log('\n🔄 PHASE 3: Smart Reallocation...');
      
      // Identify faculty who need more duties (below minimum first, then below target)
      const needMoreFaculty = Object.values(facultyTargets)
        .filter(ft => !ft.is_confirmed && ft.current_duties < ft.target_duties)
        .sort((a, b) => {
          // Priority 1: Below minimum
          if (a.needs_more && !b.needs_more) return -1;
          if (!a.needs_more && b.needs_more) return 1;
          // Priority 2: Largest deficit
          return b.deficit - a.deficit;
        });
      
      // Identify faculty with surplus duties (above target)
      const overAllocatedFaculty = Object.values(facultyTargets)
        .filter(ft => !ft.is_confirmed && ft.current_duties > ft.target_duties)
        .sort((a, b) => b.surplus - a.surplus);
      
      console.log(`   Faculty needing more: ${needMoreFaculty.length}`);
      console.log(`   Faculty over-allocated: ${overAllocatedFaculty.length}`);
      
      for (const underFaculty of needMoreFaculty) {
        if (underFaculty.current_duties >= underFaculty.target_duties) break;
        
        for (const overFaculty of overAllocatedFaculty) {
          if (underFaculty.current_duties >= underFaculty.target_duties) break;
          if (overFaculty.current_duties <= overFaculty.target_duties) continue;
          
          const slotsToReallocate = assignedSlots.filter(s => 
            s.assigned_faculty_id === overFaculty.faculty_id &&
            !executedReallocations.some(r => r.slot_id === s.slot_id)
          );
          
          for (const slot of slotsToReallocate) {
            if (underFaculty.current_duties >= underFaculty.target_duties) break;
            
            const hasConflict = await hasSchedulingConflict(
              client,
              underFaculty.faculty_id,
              slot.session_date,
              slot.start_time,
              slot.end_time,
              executedReallocations.map(r => ({
                faculty_id: r.to_faculty_id,
                session_date: r.session_date,
                start_time: r.start_time,
                end_time: r.end_time
              }))
            );
            
            if (hasConflict) continue;
            
            executedReallocations.push({
              slot_id: slot.slot_id,
              from_faculty_id: overFaculty.faculty_id,
              from_faculty_name: overFaculty.name,
              to_faculty_id: underFaculty.faculty_id,
              to_faculty_name: underFaculty.name,
              course_code: slot.course_code,
              session_date: slot.session_date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              room_code: slot.room_code
            });
            
            overFaculty.current_duties--;
            overFaculty.surplus--;
            underFaculty.current_duties++;
            underFaculty.deficit = Math.max(0, underFaculty.min_duties - underFaculty.current_duties);
            underFaculty.needs_more = underFaculty.current_duties < underFaculty.min_duties;
            
            console.log(`   ✅ ${overFaculty.name} (${overFaculty.current_duties+1}→${overFaculty.current_duties}) → ${underFaculty.name} (${underFaculty.current_duties-1}→${underFaculty.current_duties}): ${slot.course_code}`);
            break;
          }
        }
      }
      
      console.log(`   Total reallocations: ${executedReallocations.length}`);
    }
    
    // ========================================================================
    // STEP 8: DECLARE ARRAYS FOR NEW ASSIGNMENTS
    // ========================================================================
    const newAssignments = [];
    const failures = [];
    
    // ========================================================================
    // STEP 9: PHASE 1 & 2 - Assign free slots (Minimums first, then proportional)
    // ========================================================================
    console.log(`\n📋 PHASE 1 & 2: Processing ${freeSlots.length} free slots...`);
    
    for (const slot of freeSlots) {
      let assigned = false;
      
      // Get faculty sorted by priority
      const eligibleForSlot = Object.values(facultyTargets)
        .filter(ft => {
          // Skip confirmed faculty
          if (ft.is_confirmed) return false;
          // ✅ Allow exempted faculty but respect their max
          if (ft.current_duties >= ft.max_duties) return false;
          return true;
        })
        .sort((a, b) => {
          // 🎯 PRIORITY 1: Faculty below minimum (HIGHEST PRIORITY)
          if (a.needs_more && !b.needs_more) return -1;
          if (!a.needs_more && b.needs_more) return 1;
          
          // 🎯 PRIORITY 2: Maintain cadre proportions (by progress %)
          const aProgress = a.current_duties / a.target_duties;
          const bProgress = b.current_duties / b.target_duties;
          if (Math.abs(aProgress - bProgress) > 0.01) {
            return aProgress - bProgress; // Lower progress% = higher priority
          }
          
          // 🎯 PRIORITY 3: Absolute deficit from target
          const aDeficit = a.target_duties - a.current_duties;
          const bDeficit = b.target_duties - b.current_duties;
          if (aDeficit !== bDeficit) return bDeficit - aDeficit;
          
          // 🎯 PRIORITY 4: Fewest current duties
          return a.current_duties - b.current_duties;
        });
      
      for (const faculty of eligibleForSlot) {
        // Check for scheduling conflicts
        const hasConflict = await hasSchedulingConflict(
          client,
          faculty.faculty_id,
          slot.session_date,
          slot.start_time,
          slot.end_time,
          newAssignments
        );
        
        if (hasConflict) continue;
        
        // ASSIGN!
        newAssignments.push({
          slot_id: slot.slot_id,
          session_id: slot.session_id,
          faculty_id: faculty.faculty_id,
          faculty_name: faculty.name,
          faculty_cadre: faculty.cadre,
          course_code: slot.course_code,
          session_date: slot.session_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          room_code: slot.room_code
        });
        
        faculty.current_duties++;
        faculty.deficit = Math.max(0, faculty.min_duties - faculty.current_duties);
        faculty.needs_more = faculty.current_duties < faculty.min_duties;
        assigned = true;
        
        const progress = ((faculty.current_duties / faculty.target_duties) * 100).toFixed(0);
        const status = faculty.needs_more ? '⚠️' : '✓';
        console.log(`   ${status} ${faculty.name} (${faculty.cadre.substring(0,4)}) [${progress}%] → ${slot.course_code} [${faculty.current_duties-1}→${faculty.current_duties}]`);
        break;
      }
      
      if (!assigned) {
        failures.push({
          slot_id: slot.slot_id,
          course_code: slot.course_code,
          session_date: slot.session_date,
          start_time: slot.start_time,
          room_code: slot.room_code,
          reason: 'No eligible faculty available (all at max or have conflicts)'
        });
        console.log(`   ❌ Failed: ${slot.course_code} ${slot.room_code}`);
      }
    }
    
    console.log(`\n✅ Assigned ${newAssignments.length}/${freeSlots.length} slots`);
    console.log(`❌ ${failures.length} failed assignments`);
    
    // ========================================================================
    // STEP 10: Execute assignments (if not dry run)
    // ========================================================================
    if (!dry_run) {
      // Execute reallocations
      for (const realloc of executedReallocations) {
        await client.query(
          `UPDATE session_room_slot
           SET assigned_faculty_id = $1,
               picked_at = NOW()
           WHERE id = $2`,
          [realloc.to_faculty_id, realloc.slot_id]
        );
        
        await client.query(
          `INSERT INTO assignment_audit (slot_id, faculty_id, action, actor)
           VALUES ($1, $2, 'auto_assigned', 'system')`,
          [realloc.slot_id, realloc.to_faculty_id]
        );
      }
      
      // Execute new assignments
      for (const assignment of newAssignments) {
        await client.query(
          `UPDATE session_room_slot
           SET assigned_faculty_id = $1,
               status = 'assigned',
               picked_at = NOW()
           WHERE id = $2`,
          [assignment.faculty_id, assignment.slot_id]
        );
        
        await client.query(
          `INSERT INTO assignment_audit (slot_id, faculty_id, action, actor)
           VALUES ($1, $2, 'auto_assigned', 'system')`,
          [assignment.slot_id, assignment.faculty_id]
        );
      }
      
      await client.query('COMMIT');
      console.log(`\n✅ ${newAssignments.length} new assignments saved`);
    } else {
      await client.query('ROLLBACK');
      console.log('\n🔍 Dry run - no changes saved');
    }
    
    // ========================================================================
    // STEP 11: Generate final summary
    // ========================================================================
    const finalSummary = {};
    
    Object.values(facultyTargets).forEach(ft => {
      const beforeCount = ft.current_duties - (newAssignments.filter(a => a.faculty_id === ft.faculty_id).length);
      const assignedCount = newAssignments.filter(a => a.faculty_id === ft.faculty_id).length;
      const reallocIn = executedReallocations.filter(r => r.to_faculty_id === ft.faculty_id).length;
      const reallocOut = executedReallocations.filter(r => r.from_faculty_id === ft.faculty_id).length;
      
      finalSummary[ft.name] = {
        cadre: ft.cadre,
        before: beforeCount,
        assigned: assignedCount,
        reallocated: reallocIn - reallocOut,
        after: ft.current_duties,
        target: ft.target_duties,
        min_required: ft.min_duties,
        max_allowed: ft.max_duties,
        meets_minimum: ft.current_duties >= ft.min_duties,
        meets_target: Math.abs(ft.current_duties - ft.target_duties) <= 1
      };
    });
    
    const summaryByCadre = {};
    Object.entries(finalSummary).forEach(([name, stats]) => {
      if (!summaryByCadre[stats.cadre]) {
        summaryByCadre[stats.cadre] = [];
      }
      summaryByCadre[stats.cadre].push({ name, ...stats });
    });
    
    console.log('\n📊 Final Summary:');
    Object.entries(summaryByCadre).forEach(([cadre, faculties]) => {
      console.log(`\n   ${cadre}:`);
      faculties.forEach(f => {
        const status = f.meets_minimum ? '✓' : '⚠️';
        const targetStatus = f.meets_target ? '🎯' : '';
        console.log(`     ${status}${targetStatus} ${f.name}: ${f.before} → ${f.after} (target: ${f.target}, min: ${f.min_required})`);
      });
    });
    
    // Log final cadre distribution
    console.log('\n📊 Final Cadre Distribution:');
    Object.entries(cadreAllocation).forEach(([cadre, allocation]) => {
      const currentTotal = Object.values(facultyTargets)
        .filter(ft => ft.cadre === cadre)
        .reduce((sum, ft) => sum + ft.current_duties, 0);
      
      const targetPercent = ((allocation.target_duties / totalDuties) * 100).toFixed(1);
      const actualPercent = ((currentTotal / totalDuties) * 100).toFixed(1);
      const status = Math.abs(currentTotal - allocation.target_duties) <= 1 ? '✓' : '⚠️';
      
      console.log(`   ${status} ${cadre}: ${currentTotal}/${allocation.target_duties} (${actualPercent}% vs ${targetPercent}% target)`);
    });
    
    const response = {
      success: true,
      dry_run: dry_run,
      message: dry_run
        ? `Dry run: Would assign ${newAssignments.length} slots and reallocate ${executedReallocations.length} duties`
        : `Successfully assigned ${newAssignments.length} slots and reallocated ${executedReallocations.length} duties`,
      cadre_allocation: cadreAllocation,
      stats: {
        total_duties: totalDuties,
        free_slots: freeSlots.length,
        new_assignments: newAssignments.length,
        reallocations: executedReallocations.length,
        failures: failures.length,
        success_rate: freeSlots.length > 0 
          ? ((newAssignments.length / freeSlots.length) * 100).toFixed(1) + '%'
          : 'N/A'
      },
      reallocations: executedReallocations,
      new_assignments: newAssignments.map(a => ({
        faculty_name: a.faculty_name,
        faculty_cadre: a.faculty_cadre,
        course_code: a.course_code,
        session_date: a.session_date,
        start_time: a.start_time,
        end_time: a.end_time,
        room_code: a.room_code
      })),
      failures: failures,
      faculty_summary: finalSummary,
      summary_by_cadre: summaryByCadre
    };
    
    return res.json(response);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error in enhanced auto-assignment:', err);
    return res.status(500).json({ 
      error: 'Enhanced auto-assignment failed', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    client.release();
  }
});


router.get('/exam-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        type_name, 
        description, 
        selection_start, 
        selection_deadline, 
        is_active,
        created_at
      FROM exam_type
            ORDER BY 
        is_active DESC,
        selection_start DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching exam types:', err);
    res.status(500).json({ error: 'Failed to fetch exam types' });
  }
});

// ============================================================================
// ALL EXAM SESSIONS (used for Admin UI - shows courses + rooms required)
// ============================================================================
router.get('/admin/all-sessions', async (req, res) => {
  try {
    const query = `
      SELECT 
  es.id,
  es.session_date,
  es.start_time,
  es.end_time,
  es.status,
  es.exam_type_id,
  es.course_id,
  c.course_name,
  c.course_code,
  et.type_name AS exam_type,
  COALESCE(COUNT(srs.id), es.rooms_required) AS rooms_required
FROM exam_session es
JOIN course c ON es.course_id = c.id
JOIN exam_type et ON es.exam_type_id = et.id
LEFT JOIN session_room_slot srs ON srs.session_id = es.id
GROUP BY es.id, c.course_name, c.course_code, et.type_name
ORDER BY es.session_date, es.start_time;

    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching all sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions', details: err.message });
  }
});

// Backend API endpoints for Admin Direct Assignment Feature

// 1. Get available slots for a specific date
router.get('/admin/available-slots', async (req, res) => {
  try {
    const { exam_type_id, date } = req.query;

    const query = `
      SELECT 
        es.start_time,
        es.end_time,
        COUNT(DISTINCT srs.id) as available_count
      FROM exam_session es
      INNER JOIN session_room_slot srs ON srs.session_id = es.id
      WHERE srs.exam_type_id = $1
        AND DATE(es.session_date) = $2
        AND srs.assigned_faculty_id IS NULL
        AND srs.status = 'free'
      GROUP BY es.start_time, es.end_time
      HAVING COUNT(DISTINCT srs.id) > 0
      ORDER BY es.start_time
    `;

    const result = await pool.query(query, [exam_type_id, date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// 2. Get available courses for a specific slot and date
router.get('/admin/available-courses', async (req, res) => {
  try {
    const { start_time, end_time, date } = req.query;

    const query = `
      SELECT DISTINCT
        srs.id as slot_id,
        srs.session_id,
        c.id as course_id,
        c.course_code,
        c.course_name,
        c.branch,
        r.room_code
      FROM session_room_slot srs
      INNER JOIN exam_session es ON es.id = srs.session_id
      INNER JOIN course c ON c.id = es.course_id
      LEFT JOIN room r ON r.id = srs.room_id
      WHERE es.start_time = $1
        AND es.end_time = $2
        AND DATE(es.session_date) = $3
        AND srs.assigned_faculty_id IS NULL
        AND srs.status = 'free'
      ORDER BY c.course_code
    `;

    const result = await pool.query(query, [start_time, end_time, date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available courses:', error);
    res.status(500).json({ error: 'Failed to fetch available courses' });
  }
});

// 3. Search faculty with dynamic typing
router.get('/admin/search-faculty', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const searchQuery = `
      SELECT 
        f.id,
        f.name,
        f.email,
        f.cadre,
        f.department
      FROM faculty f
      WHERE (
        f.name ILIKE $1 OR 
        f.email ILIKE $1 OR
        f.cadre ILIKE $1
      )
      ORDER BY f.name
      LIMIT 20
    `;

    const searchPattern = `%${query}%`;
    const result = await pool.query(searchQuery, [searchPattern]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching faculty:', error);
    res.status(500).json({ error: 'Failed to search faculty' });
  }
});

// 4. Assign duty to faculty
router.post('/admin/assign-duty', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { slot_id, faculty_id } = req.body;

    // Validate that the slot is available
    const slotCheck = await client.query(
      'SELECT * FROM session_room_slot WHERE id = $1 AND assigned_faculty_id IS NULL AND status = $2',
      [slot_id, 'free']
    );

    if (slotCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Slot is not available or already assigned' });
    }

    const slot = slotCheck.rows[0];

    // Get session details
    const sessionResult = await client.query(
      'SELECT * FROM exam_session WHERE id = $1',
      [slot.session_id]
    );
    const session = sessionResult.rows[0];

    // Check if faculty is already assigned to another slot at the same time
    const conflictCheck = await client.query(
      `SELECT srs.id 
       FROM session_room_slot srs
       INNER JOIN exam_session es ON es.id = srs.session_id
       WHERE srs.assigned_faculty_id = $1
         AND DATE(es.session_date) = DATE($2)
         AND es.start_time = $3
         AND es.end_time = $4`,
      [faculty_id, session.session_date, session.start_time, session.end_time]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Faculty already has a duty at this time slot' 
      });
    }

    // Assign the duty
    await client.query(
      `UPDATE session_room_slot 
       SET assigned_faculty_id = $1, 
           status = 'assigned',
           picked_at = NOW()
       WHERE id = $2`,
      [faculty_id, slot_id]
    );

    // Log the assignment in audit table
    try {
      await client.query(
        `INSERT INTO assignment_audit (slot_id, faculty_id, action, actor)
         VALUES ($1, $2, 'auto_assigned', 'admin')`,
        [slot_id, faculty_id]
      );
    } catch (auditError) {
      console.log('Note: Could not log to assignment_audit:', auditError.message);
    }

    await client.query('COMMIT');

    // Get full details for response
    const assignmentDetails = await client.query(
      `SELECT 
        f.name as faculty_name,
        f.email as faculty_email,
        c.course_code,
        c.course_name,
        es.start_time,
        es.end_time,
        es.session_date,
        r.room_code
       FROM session_room_slot srs
       INNER JOIN faculty f ON f.id = srs.assigned_faculty_id
       INNER JOIN exam_session es ON es.id = srs.session_id
       INNER JOIN course c ON c.id = es.course_id
       LEFT JOIN room r ON r.id = srs.room_id
       WHERE srs.id = $1`,
      [slot_id]
    );

    res.json({ 
      message: 'Duty assigned successfully',
      assignment: assignmentDetails.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning duty:', error);
    res.status(500).json({ error: 'Failed to assign duty' });
  } finally {
    client.release();
  }
});

// Optional: Get faculty availability
router.get('/faculty-availability', async (req, res) => {
  try {
    const { faculty_id, date, slot_id } = req.query;

    const query = `
      SELECT 
        es.id,
        c.course_code,
        s.start_time,
        s.end_time
      FROM exam_sessions es
      INNER JOIN courses c ON c.id = es.course_id
      INNER JOIN slots s ON s.id = es.slot_id
      WHERE es.faculty_id = ?
        AND DATE(es.session_date) = ?
        AND s.id = ?
    `;

    const [conflicts] = await db.query(query, [faculty_id, date, slot_id]);

    res.json({
      available: conflicts.length === 0,
      conflicts: conflicts
    });
  } catch (error) {
    console.error('Error checking faculty availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

router.get('/admin/dates-with-slots', async (req, res) => {
  try {
    const { exam_type_id } = req.query;

    const query = `
      SELECT 
        DATE(es.session_date) as session_date,
        COUNT(DISTINCT srs.id) FILTER (WHERE srs.assigned_faculty_id IS NULL AND srs.status = 'free') as available_count,
        COUNT(DISTINCT srs.id) as session_count
      FROM exam_session es
      INNER JOIN session_room_slot srs ON srs.session_id = es.id
      WHERE srs.exam_type_id = $1
        AND es.session_date >= CURRENT_DATE
      GROUP BY DATE(es.session_date)
      HAVING COUNT(DISTINCT srs.id) FILTER (WHERE srs.assigned_faculty_id IS NULL AND srs.status = 'free') > 0
      ORDER BY session_date
    `;

    const result = await pool.query(query, [exam_type_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching dates with slots:', error);
    res.status(500).json({ error: 'Failed to fetch dates with slots' });
  }
});

// GET all faculty
router.get('/faculty/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        email, 
        cadre, 
        department,
        created_at,
        initials
      FROM faculty 
      ORDER BY name ASC`
    );
    
    console.log('Faculty fetched:', result.rows.length); // Debug log
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all faculty:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch faculty list',
      details: error.message 
    });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const { user_email, rating, category, message, timestamp } = req.body;
    
    // Validation
    if (!user_email || !rating || !category || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['user_email', 'rating', 'category', 'message']
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const validCategories = ['general', 'bug', 'feature', 'ui', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Insert feedback into database
    const result = await pool.query(
      `INSERT INTO feedback (user_email, rating, category, message, created_at) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [user_email, rating, category, message, timestamp || new Date()]
    );
    
    console.log(`📝 New feedback received from ${user_email} - Rating: ${rating}/5`);
    
    res.json({ 
      success: true, 
      message: 'Feedback submitted successfully',
      feedback_id: result.rows[0].id,
      timestamp: result.rows[0].created_at
    });
  } catch (error) {
    console.error('❌ Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

/**
 * GET /api/feedback
 * Get all feedback (Admin only)
 * Query params: status, category, limit, offset
 */
router.get('/feedback', async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM feedback WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM feedback WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (category) {
      countParamCount++;
      countQuery += ` AND category = $${countParamCount}`;
      countParams.push(category);
    }

    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      feedback: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

/**
 * GET /api/feedback/statistics
 * Get feedback statistics (Admin only)
 */
router.get('/feedback/statistics', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM feedback
    `);

    const categoryStats = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM feedback
      GROUP BY category
      ORDER BY count DESC
    `);

    const recentTrend = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM feedback
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      overview: stats.rows[0],
      by_category: categoryStats.rows,
      recent_trend: recentTrend.rows
    });
  } catch (error) {
    console.error('❌ Error fetching feedback statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * PATCH /api/feedback/:id
 * Update feedback status (Admin only)
 */
router.patch('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['pending', 'reviewed', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (admin_notes !== undefined) {
      paramCount++;
      updates.push(`admin_notes = $${paramCount}`);
      params.push(admin_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    paramCount++;
    params.push(id);

    const query = `
      UPDATE feedback 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    console.log(`✅ Feedback #${id} updated`);
    res.json({ success: true, feedback: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

/**
 * DELETE /api/feedback/:id
 * Delete feedback (Admin only)
 */
router.delete('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM feedback WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    console.log(`🗑️ Feedback #${id} deleted`);
    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});



module.exports = { router, setPool };