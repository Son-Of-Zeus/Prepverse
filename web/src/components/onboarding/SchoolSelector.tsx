import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { searchSchools, type School } from '../../api/schools';

interface SchoolSelectorProps {
  value: string | null;
  onChange: (schoolId: string | null, school: School | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * SchoolSelector - Autocomplete search component for school selection
 *
 * Design Philosophy:
 * - Clean, minimal search interface matching PrepVerse aesthetic
 * - Debounced search to prevent API spam (300ms delay)
 * - Dropdown with school details (name, district, state)
 * - Loading and empty states handled gracefully
 */
export const SchoolSelector: React.FC<SchoolSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Search your school...',
  disabled = false,
  error,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query to prevent excessive API calls
  const debouncedQuery = useDebounce(query, 300);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsLoading(true);
      searchSchools(debouncedQuery)
        .then((data) => {
          setResults(data.results);
          setIsOpen(true);
        })
        .catch((err) => {
          console.error('School search failed:', err);
          setResults([]);
        })
        .finally(() => setIsLoading(false));
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle school selection
  const handleSelect = (school: School) => {
    setSelectedSchool(school);
    setQuery(school.name);
    setIsOpen(false);
    onChange(school.id, school);
  };

  // Clear selection
  const handleClear = () => {
    setSelectedSchool(null);
    setQuery('');
    setResults([]);
    onChange(null, null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedSchool) {
              setSelectedSchool(null);
              onChange(null, null);
            }
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-4 pr-12
            bg-white/5 backdrop-blur-sm
            border rounded-xl
            text-white placeholder-gray-500
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error
              ? 'border-prepverse-red/50 focus:ring-prepverse-red/30'
              : selectedSchool
                ? 'border-electric/50 focus:ring-electric/30'
                : 'border-white/10 focus:ring-prepverse-red/30 hover:border-white/20'
            }
          `}
        />

        {/* Loading spinner or clear button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-500 border-t-electric rounded-full animate-spin" />
          ) : selectedSchool ? (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-500"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
        </div>
      </div>

      {/* Selected school indicator */}
      {selectedSchool && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-electric"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="text-gray-400">
            {selectedSchool.district && `${selectedSchool.district}, `}
            {selectedSchool.state}
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-prepverse-red">{error}</p>
      )}

      {/* Dropdown results */}
      {isOpen && (
        <div
          className={`
            absolute top-full left-0 right-0 mt-2 z-50
            bg-surface/95 backdrop-blur-xl
            border border-white/10 rounded-xl
            shadow-2xl shadow-black/50
            max-h-72 overflow-y-auto
            animate-fade-in
          `}
        >
          {results.length > 0 ? (
            results.map((school, index) => (
              <button
                key={school.id}
                onClick={() => handleSelect(school)}
                className={`
                  w-full px-4 py-3 text-left
                  flex flex-col gap-1
                  transition-all duration-200
                  hover:bg-white/5
                  ${index === 0 ? 'rounded-t-xl' : ''}
                  ${index === results.length - 1 ? 'rounded-b-xl' : ''}
                  ${value === school.id ? 'bg-electric/10' : ''}
                `}
                type="button"
              >
                <span className="font-medium text-white line-clamp-1">
                  {school.name}
                </span>
                <span className="text-sm text-gray-400 line-clamp-1">
                  {school.district && `${school.district}, `}
                  {school.state}
                  {school.affiliation_code && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({school.affiliation_code})
                    </span>
                  )}
                </span>
              </button>
            ))
          ) : query.length >= 2 && !isLoading ? (
            <div className="px-4 py-6 text-center text-gray-400">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-3 text-gray-500"
              >
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-sm">No schools found for "{query}"</p>
              <p className="text-xs text-gray-500 mt-1">
                Try a different search term
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Hint text */}
      {!selectedSchool && !isOpen && query.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Start typing to search from 20,000+ CBSE schools
        </p>
      )}
    </div>
  );
};

export default SchoolSelector;
