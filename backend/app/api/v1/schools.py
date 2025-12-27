"""
Schools API endpoints

Provides school search and selection functionality for:
- Autocomplete search for school selection during onboarding
- Setting user's school for study battles and matchmaking
- Getting list of states for filtering

Data source: https://github.com/deedy/cbse_schools_data (CC-BY-SA 4.0)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from supabase import Client
from datetime import datetime

from app.core.security import get_current_user_flexible, get_db_user_id
from app.db.session import get_db
from app.schemas.school import (
    SchoolResponse,
    SchoolSearchResult,
    SchoolSearchRequest,
    SchoolSearchResponse,
    StateListResponse,
    SetSchoolRequest,
    SetSchoolResponse,
)

router = APIRouter(prefix="/schools", tags=["schools"])


def _format_display_name(name: str, district: Optional[str], state: Optional[str]) -> str:
    """Format school display name for dropdowns"""
    parts = [name]
    location_parts = []
    if district:
        location_parts.append(district)
    if state:
        location_parts.append(state)
    if location_parts:
        parts.append(f"({', '.join(location_parts)})")
    return " ".join(parts)


@router.get("/search", response_model=SchoolSearchResponse)
async def search_schools(
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
    state: Optional[str] = Query(None, description="Filter by state"),
    limit: int = Query(20, ge=1, le=50, description="Max results"),
    db: Client = Depends(get_db),
):
    """
    Search for schools by name or affiliation code.

    Use this endpoint for autocomplete in school selection dropdowns.
    Returns matching schools sorted by relevance.

    ---
    ## WEB FRONTEND IMPLEMENTATION NOTES:

    ### React Component Structure:
    ```tsx
    // web/src/components/SchoolSelector.tsx
    import { useState, useEffect, useCallback } from 'react';
    import { useDebounce } from '@/hooks/useDebounce';
    import { searchSchools } from '@/api/schools';

    interface School {
      id: string;
      affiliation_code: string;
      name: string;
      state: string | null;
      district: string | null;
      display_name: string | null;
    }

    export function SchoolSelector({
      value,
      onChange,
      placeholder = "Search your school..."
    }: {
      value: string | null;
      onChange: (schoolId: string | null, school: School | null) => void;
      placeholder?: string;
    }) {
      const [query, setQuery] = useState('');
      const [results, setResults] = useState<School[]>([]);
      const [isLoading, setIsLoading] = useState(false);
      const [isOpen, setIsOpen] = useState(false);

      const debouncedQuery = useDebounce(query, 300);

      useEffect(() => {
        if (debouncedQuery.length >= 2) {
          setIsLoading(true);
          searchSchools(debouncedQuery)
            .then(data => setResults(data.results))
            .finally(() => setIsLoading(false));
        } else {
          setResults([]);
        }
      }, [debouncedQuery]);

      return (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-surface border border-surface-variant rounded-xl"
          />
          {isOpen && results.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-surface border rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
              {results.map(school => (
                <button
                  key={school.id}
                  onClick={() => {
                    onChange(school.id, school);
                    setQuery(school.name);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-surface-variant"
                >
                  <div className="font-medium">{school.name}</div>
                  <div className="text-sm text-text-secondary">
                    {school.district}, {school.state}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    ```

    ### API Client Function:
    ```tsx
    // web/src/api/schools.ts
    import { client } from './client';

    export async function searchSchools(query: string, state?: string, limit = 20) {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      if (state) params.append('state', state);
      const response = await client.get(`/api/v1/schools/search?${params}`);
      return response.data;
    }

    export async function setUserSchool(schoolId: string) {
      const response = await client.post('/api/v1/schools/set', { school_id: schoolId });
      return response.data;
    }

    export async function getStates() {
      const response = await client.get('/api/v1/schools/states');
      return response.data;
    }
    ```

    ### Integration in Onboarding:
    Add school selection step after class selection in `web/src/pages/Onboarding.tsx`.
    Store selected school_id in onboarding state and submit with other profile data.
    ---
    """
    try:
        # Build query - search by name (contains) or affiliation code (prefix)
        query_builder = db.table("schools").select(
            "id, affiliation_code, name, state, district"
        )

        # Apply state filter if provided
        if state:
            query_builder = query_builder.eq("state", state)

        # Search by name (case-insensitive contains) or affiliation code
        # Using ilike for case-insensitive search
        query_builder = query_builder.or_(
            f"name.ilike.%{q}%,affiliation_code.ilike.{q}%"
        )

        # Order by name and limit results
        query_builder = query_builder.order("name").limit(limit)

        result = query_builder.execute()

        # Format results with display names
        schools = []
        for school in result.data:
            schools.append(SchoolSearchResult(
                id=school["id"],
                affiliation_code=school["affiliation_code"],
                name=school["name"],
                state=school.get("state"),
                district=school.get("district"),
                display_name=_format_display_name(
                    school["name"],
                    school.get("district"),
                    school.get("state")
                )
            ))

        return SchoolSearchResponse(
            results=schools,
            total=len(schools),
            query=q
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search schools: {str(e)}"
        )


@router.get("/states", response_model=StateListResponse)
async def get_states(
    db: Client = Depends(get_db),
):
    """
    Get list of all states/territories with school counts.

    Use this to populate state filter dropdown in school search.
    """
    try:
        # Get distinct states with counts
        # Supabase doesn't support GROUP BY directly, so we'll get all and aggregate
        result = db.table("schools").select("state").execute()

        # Count occurrences of each state
        state_counts = {}
        for row in result.data:
            state = row.get("state")
            if state:
                state_counts[state] = state_counts.get(state, 0) + 1

        # Sort by count descending
        states = [
            {"state": state, "count": count}
            for state, count in sorted(state_counts.items(), key=lambda x: -x[1])
        ]

        return StateListResponse(states=states)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch states: {str(e)}"
        )


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(
    school_id: str,
    db: Client = Depends(get_db),
):
    """
    Get details for a specific school by ID.
    """
    try:
        result = db.table("schools").select("*").eq("id", school_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )

        return SchoolResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch school: {str(e)}"
        )


@router.post("/set", response_model=SetSchoolResponse)
async def set_user_school(
    request: SetSchoolRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db: Client = Depends(get_db),
):
    """
    Set the current user's school.

    Used during onboarding or profile settings to associate user with their school.
    This enables school-based matchmaking for study battles.
    """
    try:
        # Get database user ID
        user_id = await get_db_user_id(current_user, db)

        # Verify school exists
        school_result = db.table("schools").select(
            "id, affiliation_code, name, state, district"
        ).eq("id", str(request.school_id)).execute()

        if not school_result.data or len(school_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )

        school = school_result.data[0]

        # Update user's school_id
        update_result = db.table("users").update({
            "school_id": str(request.school_id),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()

        if not update_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user school"
            )

        return SetSchoolResponse(
            success=True,
            school=SchoolSearchResult(
                id=school["id"],
                affiliation_code=school["affiliation_code"],
                name=school["name"],
                state=school.get("state"),
                district=school.get("district"),
                display_name=_format_display_name(
                    school["name"],
                    school.get("district"),
                    school.get("state")
                )
            ),
            message="School updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set school: {str(e)}"
        )


@router.get("/user/current", response_model=Optional[SchoolSearchResult])
async def get_user_school(
    current_user: dict = Depends(get_current_user_flexible),
    db: Client = Depends(get_db),
):
    """
    Get the current user's school.

    Returns null if user hasn't selected a school yet.
    """
    try:
        # Get database user ID
        user_id = await get_db_user_id(current_user, db)

        # Get user with school
        user_result = db.table("users").select("school_id").eq("id", user_id).execute()

        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        school_id = user_result.data[0].get("school_id")

        if not school_id:
            return None

        # Get school details
        school_result = db.table("schools").select(
            "id, affiliation_code, name, state, district"
        ).eq("id", school_id).execute()

        if not school_result.data or len(school_result.data) == 0:
            return None

        school = school_result.data[0]

        return SchoolSearchResult(
            id=school["id"],
            affiliation_code=school["affiliation_code"],
            name=school["name"],
            state=school.get("state"),
            district=school.get("district"),
            display_name=_format_display_name(
                school["name"],
                school.get("district"),
                school.get("state")
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user school: {str(e)}"
        )
