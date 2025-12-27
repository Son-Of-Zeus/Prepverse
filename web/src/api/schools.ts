import { apiClient } from './client';

/**
 * School type definitions
 */
export interface School {
  id: string;
  affiliation_code: string;
  name: string;
  state: string | null;
  district: string | null;
  address?: string | null;
  display_name: string | null;
}

export interface SchoolSearchResponse {
  results: School[];
  total: number;
  query: string;
}

export interface StateWithCount {
  state: string;
  count: number;
}

export interface StateListResponse {
  states: StateWithCount[];
}

export interface SetSchoolResponse {
  success: boolean;
  school: School;
  message: string;
}

/**
 * Search for schools by name
 *
 * Use this for autocomplete in school selection dropdowns.
 * Returns matching schools sorted alphabetically by name.
 *
 * @param query - School name to search (min 2 characters)
 * @param state - Optional state filter
 * @param limit - Max results (default: 20, max: 50)
 * @returns Promise with search results
 *
 * @example
 * ```tsx
 * const results = await searchSchools('Delhi Public');
 * // Returns schools matching "Delhi Public"
 * ```
 */
export async function searchSchools(
  query: string,
  state?: string,
  limit: number = 20
): Promise<SchoolSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  if (state) {
    params.append('state', state);
  }

  const response = await apiClient.get<SchoolSearchResponse>(
    `/schools/search?${params}`
  );
  return response.data;
}

/**
 * Get list of all states with school counts
 *
 * Use this to populate state filter dropdown in school search.
 * States are sorted by count (descending).
 *
 * @returns Promise with list of states and their school counts
 */
export async function getStates(): Promise<StateListResponse> {
  const response = await apiClient.get<StateListResponse>('/schools/states');
  return response.data;
}

/**
 * Get details for a specific school
 *
 * @param schoolId - The school's UUID
 * @returns Promise with school details
 */
export async function getSchool(schoolId: string): Promise<School> {
  const response = await apiClient.get<School>(`/schools/${schoolId}`);
  return response.data;
}

/**
 * Set the current user's school
 *
 * Used during onboarding or profile settings.
 * This enables school-based matchmaking for study battles.
 *
 * @param schoolId - The school's UUID
 * @returns Promise with success response
 */
export async function setUserSchool(
  schoolId: string
): Promise<SetSchoolResponse> {
  const response = await apiClient.post<SetSchoolResponse>('/schools/set', {
    school_id: schoolId,
  });
  return response.data;
}

/**
 * Get the current user's school
 *
 * Returns null if user hasn't selected a school yet.
 *
 * @returns Promise with school details or null
 */
export async function getUserSchool(): Promise<School | null> {
  const response = await apiClient.get<School | null>('/schools/user/current');
  return response.data;
}
