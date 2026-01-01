import { supabase } from './supabase';

/**
 * Get teacher report data:
 * - Total visits count
 * - Best 3 visits (highest overall_score, newest first on tie)
 * - Average per environment across best 3
 * - Improvement comparison (last vs first visit)
 */
export const getTeacherReport = async (teacherId) => {
  try {
    // Get all visits for teacher ordered by date
    const { data: allVisits, error: visitsError } = await supabase
      .from('visits')
      .select('id, visit_date, overall_score')
      .eq('teacher_id', teacherId)
      .order('visit_date', { ascending: false });

    if (visitsError) throw visitsError;

    const totalVisits = allVisits?.length || 0;

    if (totalVisits === 0) {
      return {
        totalVisits: 0,
        best3Visits: [],
        avgPerEnvironment: {},
        improvement: null,
      };
    }

    // Get best 3 visits (highest overall_score, newest first on tie)
    const best3Visits = [...allVisits]
      .sort((a, b) => {
        const scoreA = a.overall_score || 0;
        const scoreB = b.overall_score || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA; // Higher score first
        }
        // If scores are equal, newest first
        return new Date(b.visit_date) - new Date(a.visit_date);
      })
      .slice(0, 3)
      .map(v => v.id);

    // Get environment scores for best 3 visits
    const { data: envScores, error: envError } = await supabase
      .from('visit_environment_scores')
      .select('visit_id, env_code, avg_score')
      .in('visit_id', best3Visits);

    if (envError) throw envError;

    // Calculate average per environment across best 3
    const avgPerEnvironment = {};
    const envCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    envCodes.forEach(envCode => {
      const scores = envScores
        ?.filter(s => s.env_code === envCode && s.avg_score !== null)
        .map(s => parseFloat(s.avg_score));

      if (scores && scores.length > 0) {
        const sum = scores.reduce((acc, val) => acc + val, 0);
        avgPerEnvironment[envCode] = sum / scores.length;
      } else {
        avgPerEnvironment[envCode] = null;
      }
    });

    // Get first and last visit for improvement comparison
    const sortedByDate = [...allVisits].sort(
      (a, b) => new Date(a.visit_date) - new Date(b.visit_date)
    );
    const firstVisitId = sortedByDate[0]?.id;
    const lastVisitId = sortedByDate[sortedByDate.length - 1]?.id;

    let improvement = null;

    if (firstVisitId && lastVisitId && firstVisitId !== lastVisitId) {
      // Get environment scores for first and last visits
      const { data: firstEnvScores } = await supabase
        .from('visit_environment_scores')
        .select('env_code, avg_score')
        .eq('visit_id', firstVisitId);

      const { data: lastEnvScores } = await supabase
        .from('visit_environment_scores')
        .select('env_code, avg_score')
        .eq('visit_id', lastVisitId);

      const firstVisitData = sortedByDate[0];
      const lastVisitData = sortedByDate[sortedByDate.length - 1];

      // Calculate deltas
      const deltaOverall = (lastVisitData.overall_score || 0) - (firstVisitData.overall_score || 0);
      const deltaPerEnv = {};

      envCodes.forEach(envCode => {
        const firstScore = firstEnvScores?.find(s => s.env_code === envCode)?.avg_score;
        const lastScore = lastEnvScores?.find(s => s.env_code === envCode)?.avg_score;

        if (firstScore !== null && firstScore !== undefined &&
            lastScore !== null && lastScore !== undefined) {
          deltaPerEnv[envCode] = parseFloat(lastScore) - parseFloat(firstScore);
        } else {
          deltaPerEnv[envCode] = null;
        }
      });

      // Identify weak environments (avg < 2.5 OR lowest 2 deltas)
      const weakEnvironments = [];

      // Check avg < 2.5
      Object.entries(avgPerEnvironment).forEach(([envCode, avg]) => {
        if (avg !== null && avg < 2.5) {
          weakEnvironments.push(envCode);
        }
      });

      // Find lowest 2 deltas
      const deltasArray = Object.entries(deltaPerEnv)
        .filter(([_, delta]) => delta !== null)
        .map(([envCode, delta]) => ({ envCode, delta }))
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 2)
        .map(item => item.envCode);

      deltasArray.forEach(envCode => {
        if (!weakEnvironments.includes(envCode)) {
          weakEnvironments.push(envCode);
        }
      });

      improvement = {
        deltaOverall,
        deltaPerEnv,
        firstVisit: {
          id: firstVisitId,
          date: firstVisitData.visit_date,
          overallScore: firstVisitData.overall_score,
          envScores: firstEnvScores || [],
        },
        lastVisit: {
          id: lastVisitId,
          date: lastVisitData.visit_date,
          overallScore: lastVisitData.overall_score,
          envScores: lastEnvScores || [],
        },
        weakEnvironments,
      };
    }

    // Get full details of best 3 visits
    const { data: best3Details } = await supabase
      .from('visits')
      .select(`
        *,
        environment_scores:visit_environment_scores(*)
      `)
      .in('id', best3Visits);

    return {
      totalVisits,
      best3Visits: best3Details || [],
      avgPerEnvironment,
      improvement,
    };
  } catch (error) {
    console.error('Error generating teacher report:', error);
    throw error;
  }
};

/**
 * Get teacher by ID with name
 */
export const getTeacherById = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name_ar, name_en, school_id')
      .eq('id', teacherId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching teacher:', error);
    throw error;
  }
};


