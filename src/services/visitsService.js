import { supabase } from './supabase';

/**
 * Upsert teacher by name_ar (create if not exists, return existing if exists)
 */
export const upsertTeacher = async (nameAr, nameEn = null, schoolId = null) => {
  try {
    // Try to find existing teacher
    const { data: existing } = await supabase
      .from('teachers')
      .select('id')
      .eq('name_ar', nameAr)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // Create new teacher
    const { data, error } = await supabase
      .from('teachers')
      .insert({
        name_ar: nameAr,
        name_en: nameEn,
        school_id: schoolId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error upserting teacher:', error);
    throw error;
  }
};

/**
 * Save a visit with environment scores
 */
export const saveVisit = async (visitData, environmentScores) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upsert teacher
    const teacherId = await upsertTeacher(
      visitData.teacherNameAr,
      visitData.teacherNameEn,
      visitData.schoolId
    );

    // Insert visit
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({
        teacher_id: teacherId,
        teacher_name_snapshot: visitData.teacherNameAr,
        subject: visitData.subject || null,
        grade_key: visitData.gradeKey || null,
        segment: visitData.segment || null,
        visit_date: visitData.visitDate,
        supervisor_id: user.id,
        supervisor_email: user.email,
        lesson_description: visitData.lessonDescription || null,
        overall_score: visitData.overallScore || null,
      })
      .select('id')
      .single();

    if (visitError) throw visitError;

    // Insert environment scores
    if (environmentScores && environmentScores.length > 0) {
      const envScoresData = environmentScores.map(env => ({
        visit_id: visit.id,
        env_code: env.envCode,
        avg_score: env.avgScore || null,
        justification: env.justification || null,
        recommendations_html: env.recommendationsHtml || null,
      }));

      const { error: envError } = await supabase
        .from('visit_environment_scores')
        .insert(envScoresData);

      if (envError) throw envError;
    }

    return visit.id;
  } catch (error) {
    console.error('Error saving visit:', error);
    throw error;
  }
};

/**
 * Fetch visits with filters and pagination using v_visit_summary view
 */
export async function fetchVisits({
  teacherName = '',
  subject = '',
  dateFrom = '',
  dateTo = '',
  page = 1,
  pageSize = 50,
} = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('v_visit_summary')
    .select('*', { count: 'exact' })
    .order('visit_ts', { ascending: false })
    .range(from, to);

  if (teacherName.trim()) q = q.ilike('teacher_name', `%${teacherName.trim()}%`);
  if (subject.trim()) q = q.ilike('subject', `%${subject.trim()}%`);
  if (dateFrom) q = q.gte('visit_ts', dateFrom);
  if (dateTo) q = q.lte('visit_ts', dateTo);

  const { data, count, error } = await q;
  if (error) throw error;

  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

/**
 * Get visits with filters and pagination (legacy - uses views if available, falls back to tables)
 */
export const getVisits = async (filters = {}, page = 1, pageSize = 50) => {
  try {
    // Try to use view first
    try {
      const viewResult = await fetchVisits({
        teacherName: filters.teacherName || '',
        subject: filters.subject || '',
        dateFrom: filters.dateFrom || '',
        dateTo: filters.dateTo || '',
        page,
        pageSize,
      });
      // Transform view result to match expected format
      return {
        data: viewResult.rows || [],
        total: viewResult.total || 0,
        page: viewResult.page,
        pageSize: viewResult.pageSize,
        totalPages: viewResult.totalPages,
      };
    } catch (viewError) {
      // Fallback to table-based query if view doesn't exist
      console.warn('View v_visit_summary not available, falling back to table query');
    }

    // Fallback to table query
    let query = supabase
      .from('visits')
      .select(`
        id,
        teacher_id,
        teacher_name_snapshot,
        subject,
        grade_key,
        segment,
        visit_date,
        supervisor_email,
        overall_score,
        lesson_description,
        created_at,
        teachers(id, name_ar, name_en)
      `, { count: 'exact' })
      .order('visit_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Apply filters
    if (filters.teacherId) {
      query = query.eq('teacher_id', filters.teacherId);
    } else if (filters.teacherName) {
      query = query.ilike('teacher_name_snapshot', `%${filters.teacherName}%`);
    }

    if (filters.supervisorId) {
      query = query.eq('supervisor_id', filters.supervisorId);
    }

    if (filters.supervisorEmail) {
      query = query.eq('supervisor_email', filters.supervisorEmail);
    }

    if (filters.subject) {
      query = query.ilike('subject', `%${filters.subject}%`);
    }

    if (filters.gradeKey) {
      query = query.eq('grade_key', filters.gradeKey);
    }

    if (filters.dateFrom) {
      query = query.gte('visit_date', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('visit_date', filters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Error fetching visits:', error);
    throw error;
  }
};

/**
 * Fetch visit details using v_visit_summary and v_visit_env_scores views
 */
export async function fetchVisitDetails(visitId) {
  const visitRes = await supabase
    .from('v_visit_summary')
    .select('*')
    .eq('visit_id', visitId)
    .single();

  if (visitRes.error) throw visitRes.error;

  const envRes = await supabase
    .from('v_visit_env_scores')
    .select('*')
    .eq('visit_id', visitId)
    .order('env_code', { ascending: true });

  if (envRes.error) throw envRes.error;

  return { visit: visitRes.data, envs: envRes.data ?? [] };
}

/**
 * Get a single visit by ID with environment scores (legacy - uses views if available, falls back to tables)
 */
export const getVisitById = async (visitId) => {
  try {
    // Try to use views first
    try {
      const viewResult = await fetchVisitDetails(visitId);
      // Transform view result to match expected format
      return {
        ...viewResult.visit,
        environment_scores: viewResult.envs || [],
      };
    } catch (viewError) {
      // Fallback to table-based query if views don't exist
      console.warn('Views v_visit_summary/v_visit_env_scores not available, falling back to table query');
    }

    // Fallback to table query
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select(`
        *,
        teachers(id, name_ar, name_en)
      `)
      .eq('id', visitId)
      .single();

    if (visitError) throw visitError;

    const { data: envScores, error: envError } = await supabase
      .from('visit_environment_scores')
      .select('*')
      .eq('visit_id', visitId)
      .order('env_code');

    if (envError) throw envError;

    // Transform teacher data structure - handle both array and object formats
    let teacher = null;
    if (visit.teachers) {
      if (Array.isArray(visit.teachers) && visit.teachers.length > 0) {
        teacher = visit.teachers[0];
      } else if (typeof visit.teachers === 'object') {
        teacher = visit.teachers;
      }
    }

    // Remove the raw teachers field and use teacher instead
    const { teachers, ...visitData } = visit;
    
    return {
      ...visitData,
      teacher: teacher ? { id: teacher.id, name_ar: teacher.name_ar, name_en: teacher.name_en } : null,
      environment_scores: envScores || [],
    };
  } catch (error) {
    console.error('Error fetching visit:', error);
    throw error;
  }
};

/**
 * Delete a visit (only if user is the owner)
 */
export const deleteVisit = async (visitId) => {
  try {
    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', visitId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting visit:', error);
    throw error;
  }
};

/**
 * Get all teachers (for dropdown/search)
 */
export const getTeachers = async (searchTerm = '') => {
  try {
    let query = supabase
      .from('teachers')
      .select('id, name_ar, name_en')
      .order('name_ar');

    if (searchTerm) {
      query = query.ilike('name_ar', `%${searchTerm}%`);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }
};

/**
 * Check if current user is the owner of a visit
 */
export const isVisitOwner = async (visitId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('visits')
      .select('supervisor_id')
      .eq('id', visitId)
      .single();

    if (error) return false;
    return data?.supervisor_id === user.id;
  } catch (error) {
    console.error('Error checking visit owner:', error);
    return false;
  }
};

