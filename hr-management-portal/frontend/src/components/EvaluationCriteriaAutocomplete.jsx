import React, { useState, useRef, useEffect, useMemo } from 'react';

export const DEFAULT_EVALUATION_CRITERIA = [
  'Core Technical Skills',
  'Problem Solving',
  'Architecture & Coding',
  'Domain Knowledge',
  'Communication',
  'Cultural Fit',
  'Leadership Potential',
  'Analytical Thinking',
  'Decision Making',
  'Team Collaboration',
  'Technical Knowledge',
  'Project Management'
];

export default function EvaluationCriteriaAutocomplete({
  selectedCriteria = [],
  onChange,
  disabled = false,
  placeholder = 'Type to search or add evaluation criteria...',
  maxSuggestions = 8
}) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize selected criteria array
  const currentList = useMemo(() => {
    if (!Array.isArray(selectedCriteria)) return [];
    return selectedCriteria;
  }, [selectedCriteria]);

  // Case-insensitive lookup set of already selected items
  const selectedSet = useMemo(() => {
    return new Set(currentList.map(c => String(c).trim().toLowerCase()));
  }, [currentList]);

  // Compute suggestions based on inputValue
  const { suggestions, canAddCustom, customLabel } = useMemo(() => {
    const query = inputValue.trim().toLowerCase();

    // Filter available default suggestions that aren't already selected
    let filtered = DEFAULT_EVALUATION_CRITERIA.filter(item => {
      const itemLower = item.toLowerCase();
      if (selectedSet.has(itemLower)) return false;
      if (!query) return true;
      return itemLower.includes(query);
    });

    // Limit to maxSuggestions (5-8)
    filtered = filtered.slice(0, maxSuggestions);

    // Check if user typed something custom that is not already selected
    const trimmedInput = inputValue.trim();
    const isAlreadySelected = selectedSet.has(query);
    const exactMatchInFiltered = filtered.some(item => item.toLowerCase() === query);
    const canAdd = trimmedInput.length > 0 && !isAlreadySelected && !exactMatchInFiltered;

    return {
      suggestions: filtered,
      canAddCustom: canAdd,
      customLabel: trimmedInput
    };
  }, [inputValue, selectedSet, maxSuggestions]);

  // Total interactive items in dropdown: suggestions + (canAddCustom ? 1 : 0)
  const totalItems = suggestions.length + (canAddCustom ? 1 : 0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const addCriterion = (criterion) => {
    const clean = String(criterion).trim();
    if (!clean) return;
    if (selectedSet.has(clean.toLowerCase())) return; // Prevent duplicates

    const updated = [...currentList, clean];
    onChange && onChange(updated);
    setInputValue('');
    setHighlightedIndex(-1);
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const removeCriterion = (criterionToRemove) => {
    const updated = currentList.filter(c => c !== criterionToRemove);
    onChange && onChange(updated);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (totalItems > 0) {
        setHighlightedIndex(prev => (prev + 1 < totalItems ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(totalItems - 1);
      } else if (totalItems > 0) {
        setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        addCriterion(suggestions[highlightedIndex]);
      } else if (isOpen && highlightedIndex === suggestions.length && canAddCustom) {
        addCriterion(customLabel);
      } else if (inputValue.trim()) {
        // Direct Enter on typed input adds it as custom/matching
        const query = inputValue.trim().toLowerCase();
        const matched = suggestions.find(s => s.toLowerCase() === query);
        if (matched) {
          addCriterion(matched);
        } else {
          addCriterion(inputValue.trim());
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="urja-criteria-autocomplete-wrapper" ref={containerRef}>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <label htmlFor="criteria-autocomplete-input" className="form-label small fw-bold text-dark mb-0">
          Evaluation Focus Areas & Criteria
        </label>
        <span className="text-muted" style={{ fontSize: '0.72rem' }}>
          {currentList.length > 0 ? (
            <span className="fw-semibold text-success">
              <i className="bi bi-check2-circle me-1"></i>{currentList.length} criteria selected
            </span>
          ) : (
            'None selected (type or choose below)'
          )}
        </span>
      </div>

      {/* Input container with search icon */}
      <div className="urja-autocomplete-input-box position-relative">
        <i
          className="bi bi-search position-absolute text-muted"
          style={{ left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem', pointerEvents: 'none' }}
        ></i>
        <input
          id="criteria-autocomplete-input"
          ref={inputRef}
          type="text"
          className="urja-filter-input w-100"
          style={{ paddingLeft: '2.1rem', paddingRight: inputValue ? '2.5rem' : '0.85rem', height: '36px', fontSize: '0.82rem' }}
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {inputValue && (
          <button
            type="button"
            className="btn btn-link position-absolute p-0 text-muted"
            style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', textDecoration: 'none', fontSize: '0.9rem' }}
            onClick={() => {
              setInputValue('');
              setHighlightedIndex(-1);
              if (inputRef.current) inputRef.current.focus();
            }}
            title="Clear typed text"
          >
            ✕
          </button>
        )}

        {/* Suggestions Dropdown */}
        {isOpen && !disabled && (
          <div className="urja-autocomplete-dropdown shadow-lg">
            {suggestions.length === 0 && !canAddCustom ? (
              <div className="urja-autocomplete-empty text-muted py-3 px-3 small text-center">
                <i className="bi bi-info-circle me-1 text-primary"></i>
                {currentList.length >= DEFAULT_EVALUATION_CRITERIA.length && !inputValue.trim()
                  ? 'All default criteria have been selected. Type to add custom criteria.'
                  : 'No matching criteria found. Type any custom criteria and press Enter.'}
              </div>
            ) : (
              <div className="urja-autocomplete-list">
                {suggestions.map((item, idx) => {
                  const isHighlighted = highlightedIndex === idx;
                  return (
                    <div
                      key={item}
                      className={`urja-autocomplete-item ${isHighlighted ? 'active' : ''}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => addCriterion(item)}
                    >
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <span className="d-flex align-items-center">
                          <i className="bi bi-tag me-2 text-success" style={{ fontSize: '0.8rem' }}></i>
                          <span className="urja-autocomplete-text">{item}</span>
                        </span>
                        <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>+ Add</span>
                      </div>
                    </div>
                  );
                })}

                {canAddCustom && (
                  <div
                    className={`urja-autocomplete-item urja-autocomplete-custom ${highlightedIndex === suggestions.length ? 'active' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                    onClick={() => addCriterion(customLabel)}
                  >
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <span className="d-flex align-items-center text-success fw-bold">
                        <i className="bi bi-plus-circle-fill me-2"></i>
                        <span>Add "{customLabel}"</span>
                      </span>
                      <span className="badge bg-success-subtle text-success border border-success" style={{ fontSize: '0.68rem' }}>Custom</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="urja-autocomplete-footer px-3 py-1 bg-light border-top d-flex justify-content-between align-items-center" style={{ fontSize: '0.68rem', color: '#64748B' }}>
              <span><kbd style={{ fontSize: '0.65rem' }}>↑</kbd> <kbd style={{ fontSize: '0.65rem' }}>↓</kbd> navigate</span>
              <span><kbd style={{ fontSize: '0.65rem' }}>Enter</kbd> select / add</span>
              <span><kbd style={{ fontSize: '0.65rem' }}>Esc</kbd> dismiss</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Criteria Tags / Chips Display */}
      {currentList.length > 0 && (
        <div className="urja-selected-criteria-chips">
          {currentList.map((crit) => (
            <span key={crit} className="urja-criteria-tag">
              <i className="bi bi-check-circle-fill me-1 text-success" style={{ fontSize: '0.72rem' }}></i>
              <span className="urja-criteria-tag-text">{crit}</span>
              {!disabled && (
                <button
                  type="button"
                  className="urja-criteria-tag-remove"
                  onClick={() => removeCriterion(crit)}
                  title={`Remove ${crit}`}
                  aria-label={`Remove ${crit}`}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
          {!disabled && currentList.length > 1 && (
            <button
              type="button"
              className="btn btn-link btn-sm text-danger p-0 ms-1 text-decoration-none"
              style={{ fontSize: '0.7rem' }}
              onClick={() => onChange && onChange([])}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

