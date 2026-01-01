import { supabase } from './supabase';

/**
 * Save a visit to Supabase
 */
export const saveVisit = async (userId, visitData) => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .insert({
        user_id: userId,
        teacher_name: visitData.teacherName,
        observation_text: visitData.observationText,
        selected_criteria: visitData.selectedCriteria,
        selected_sections: visitData.selectedSections,
        results: visitData.results,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving visit:', error);
    throw error;
  }
};

/**
 * Get all visits for a user
 */
export const getUserVisits = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching visits:', error);
    throw error;
  }
};

/**
 * Get a single visit by ID
 */
export const getVisit = async (visitId) => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching visit:', error);
    throw error;
  }
};

/**
 * Delete a visit
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
 * Search visits by teacher name or observation text
 */
export const searchVisits = async (userId, searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', userId)
      .or(`teacher_name.ilike.%${searchTerm}%,observation_text.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching visits:', error);
    throw error;
  }
};


