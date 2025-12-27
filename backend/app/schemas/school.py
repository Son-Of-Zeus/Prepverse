"""
Pydantic schemas for Schools
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class SchoolBase(BaseModel):
    """Base school fields"""
    affiliation_code: str = Field(..., description="CBSE affiliation number")
    name: str = Field(..., description="School name")
    state: Optional[str] = None
    district: Optional[str] = None


class SchoolResponse(SchoolBase):
    """School response with all fields"""
    id: UUID
    region: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    principal_name: Optional[str] = None
    year_founded: Optional[int] = None
    affiliation_type: Optional[str] = None
    school_type: Optional[str] = None

    class Config:
        from_attributes = True


class SchoolSearchResult(BaseModel):
    """
    Simplified school result for autocomplete/search

    Used in dropdowns and search results where we don't need all fields.
    """
    id: UUID
    affiliation_code: str
    name: str
    state: Optional[str] = None
    district: Optional[str] = None
    # Display string for dropdown: "School Name (District, State)"
    display_name: Optional[str] = None


class SchoolSearchRequest(BaseModel):
    """Request for searching schools"""
    query: str = Field(..., min_length=2, max_length=100, description="Search query (min 2 chars)")
    state: Optional[str] = Field(None, description="Filter by state")
    limit: int = Field(20, ge=1, le=50, description="Max results to return")


class SchoolSearchResponse(BaseModel):
    """Response for school search"""
    results: List[SchoolSearchResult]
    total: int
    query: str


class StateListResponse(BaseModel):
    """List of states with school counts"""
    states: List[dict]  # [{"state": "Delhi", "count": 1234}, ...]


class SetSchoolRequest(BaseModel):
    """Request to set user's school"""
    school_id: UUID = Field(..., description="School UUID to set for user")


class SetSchoolResponse(BaseModel):
    """Response after setting school"""
    success: bool
    school: Optional[SchoolSearchResult] = None
    message: str
