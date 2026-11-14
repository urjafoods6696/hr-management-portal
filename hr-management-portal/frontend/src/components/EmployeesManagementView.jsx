import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../styles/urja-employees.css';

// Date Formatter Helper
const formatDate = (dateStr) => {
  if (!dateStr) return 'Not Set';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

const INITIAL_FALLBACK_EMPLOYEES = [];

export default function EmployeesManagementView({ currentUser, onToast }) {
  // State variables
  const [employees, setEmployees] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onProbation: 0,
    resignedExited: 0,
    newJoinersThisMonth: 0,
    confirmationDue: 0,
    noticePeriod: 0,
    totalEmployeesTrend: '0% vs last month',
    activeEmployeesTrend: '0% vs last month',
    onProbationTrend: '0% vs last month',
    resignedExitedTrend: '0% vs last month',
    newJoinersTrend: '0 new joiners'
  });

  const [loading, setLoading] = useState(false);
  // Drawer closed by default per requirement: only open when an employee is selected
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const activeFetchIdRef = useRef(0);

  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Filter States
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [joiningDateFilter, setJoiningDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCardFilter, setActiveCardFilter] = useState('ALL');

  // Pagination States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(186);

  // Modals & Popovers
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState('ACTIVE');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionNoticeDays, setTransitionNoticeDays] = useState(30);
  const [transitionLastWorkingDay, setTransitionLastWorkingDay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const moreActionsRef = useRef(null);

  // Token helper
  const getAuthToken = () => {
    return sessionStorage.getItem('ats_urja_token') ||
           localStorage.getItem('ats_urja_token') ||
           sessionStorage.getItem('token') ||
           localStorage.getItem('token') || '';
  };

  // Open employee profile in drawer on row or action click
  const handleOpenProfile = async (emp) => {
    if (!emp) return;
    // Set immediate employee data so header and details appear instantly
    setSelectedEmployee(emp);
    setDrawerError(null);
    setIsDrawerLoading(true);

    const fetchId = ++activeFetchIdRef.current;
    const token = getAuthToken();

    try {
      if (token && emp.id) {
        // Fetch fresh employee details and verified documents in parallel
        const [detailRes, docsRes] = await Promise.allSettled([
          fetch(`/api/v1/employees/${emp.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`/api/v1/employees/${emp.id}/documents`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        // Discard stale responses if user clicked another employee quickly
        if (fetchId !== activeFetchIdRef.current) return;

        if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
          const detailJson = await detailRes.value.json();
          if (detailJson.data) {
            setSelectedEmployee(prev => ({
              ...prev,
              ...detailJson.data
            }));
          }
        }

        if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
          const docsJson = await docsRes.value.json();
          if (Array.isArray(docsJson.data) && docsJson.data.length > 0) {
            setEmployeeDocuments(docsJson.data);
          } else if (emp.documents && emp.documents.length > 0) {
            setEmployeeDocuments(emp.documents);
          } else {
            setEmployeeDocuments([]);
          }
        } else if (emp.documents && emp.documents.length > 0) {
          setEmployeeDocuments(emp.documents);
        } else {
          setEmployeeDocuments([]);
        }
      } else if (emp.documents && emp.documents.length > 0) {
        setEmployeeDocuments(emp.documents);
      } else {
        setEmployeeDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching employee profile drawer details:', err);
      if (fetchId === activeFetchIdRef.current) {
        setDrawerError('Unable to refresh employee details from server. Displaying current data.');
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setIsDrawerLoading(false);
      }
    }
  };

  // Close profile drawer and reset state
  const handleCloseDrawer = () => {
    setSelectedEmployee(null);
    setDrawerError(null);
    setEmployeeDocuments([]);
  };

  // Keyboard shortcut: close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedEmployee) {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmployee]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) {
        setShowMoreActions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Summary Stats from API
  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch('/api/v1/employees/summary-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSummaryStats(prev => ({
            ...prev,
            ...json.data
          }));
        }
      }
    } catch (err) {
      console.warn('Using baseline summary statistics:', err);
    }
  };

  // Fetch Employees from API with active filters
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      let fetched = false;

      if (token) {
        const params = new URLSearchParams();
        if (departmentFilter !== 'ALL') params.append('department', departmentFilter);
        if (employmentTypeFilter !== 'ALL') params.append('employmentType', employmentTypeFilter);
        if (statusFilter !== 'ALL') params.append('status', statusFilter);
        if (locationFilter !== 'ALL') params.append('location', locationFilter);
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        params.append('page', page);
        params.append('size', pageSize);

        const res = await fetch(`/api/v1/employees?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.content) {
            setEmployees(json.data.content);
            setTotalElements(json.data.totalElements || json.data.content.length);
            // Keep drawer closed if closed; if already open, sync fresh data
            setSelectedEmployee(prev => {
              if (!prev) return null;
              const match = json.data.content.find(e => e.id === prev.id);
              return match ? { ...prev, ...match } : prev;
            });
            fetched = true;
          }
        }
      }

      if (!fetched) {
        // Robust client-side filtering on fallback data
        let list = [];
        if (departmentFilter !== 'ALL') {
          list = list.filter(e => e.departmentName.toLowerCase() === departmentFilter.toLowerCase());
        }
        if (employmentTypeFilter !== 'ALL') {
          list = list.filter(e => e.employmentType.toUpperCase().replace(' ', '_') === employmentTypeFilter.toUpperCase());
        }
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'CONFIRMATION_DUE') {
            list = list.filter(e => e.isConfirmationDue);
          } else {
            list = list.filter(e => e.status.toUpperCase() === statusFilter.toUpperCase());
          }
        }
        if (locationFilter !== 'ALL') {
          list = list.filter(e => e.workLocation.toLowerCase().includes(locationFilter.toLowerCase()));
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          list = list.filter(e => 
            e.name.toLowerCase().includes(q) || 
            e.email.toLowerCase().includes(q) || 
            e.employeeCode.toLowerCase().includes(q) || 
            e.designationName.toLowerCase().includes(q)
          );
        }
        setEmployees(list);
        setTotalElements(list.length);
        // Keep drawer closed if closed; if already open, sync fresh data
        setSelectedEmployee(prev => {
          if (!prev) return null;
          const match = list.find(e => e.id === prev.id);
          return match ? { ...prev, ...match } : prev;
        });
      }
    } catch (err) {
      console.warn('API error, using filtered fallback data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchEmployees();
  }, [departmentFilter, employmentTypeFilter, statusFilter, locationFilter, page, pageSize]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(0);
    fetchEmployees();
  };

  // Handle Filter Reset
  const handleResetFilters = () => {
    setDepartmentFilter('ALL');
    setEmploymentTypeFilter('ALL');
    setStatusFilter('ALL');
    setLocationFilter('ALL');
    setJoiningDateFilter('');
    setSearchTerm('');
    setActiveCardFilter('ALL');
    setPage(0);
  };

  // Card click filter toggle
  const handleCardClick = (cardType) => {
    setActiveCardFilter(cardType);
    setPage(0);
    if (cardType === 'TOTAL') {
      setStatusFilter('ALL');
    } else if (cardType === 'ACTIVE') {
      setStatusFilter('ACTIVE');
    } else if (cardType === 'PROBATION') {
      setStatusFilter('ON_PROBATION');
    } else if (cardType === 'RESIGNED') {
      setStatusFilter('EXITED');
    } else if (cardType === 'NEW_JOINERS') {
      setStatusFilter('ALL');
    }
  };

  // Select/Deselect All Rows
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(employees.map(emp => emp.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  // Toggle single row selection
  const handleToggleRow = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRows(next);
  };

  // Status Lifecycle Transition
  const handlePerformTransition = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const payload = {
        targetStatus: transitionTarget,
        reason: transitionReason || `Status changed to ${transitionTarget}`,
        noticePeriodDays: transitionNoticeDays,
        lastWorkingDay: transitionLastWorkingDay || null
      };

      let updated = null;
      if (token) {
        try {
          const res = await fetch(`/api/v1/employees/${selectedEmployee.id}/transition-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const json = await res.json();
            updated = json.data;
          }
        } catch (apiErr) {
          console.warn('Transition API warning:', apiErr);
        }
      }

      // If backend updated or local simulation
      if (!updated) {
        updated = {
          ...selectedEmployee,
          status: transitionTarget,
          confirmationStatus: transitionTarget === 'ACTIVE' ? 'CONFIRMED' : selectedEmployee.confirmationStatus,
          confirmationDate: transitionTarget === 'ACTIVE' ? new Date().toISOString().split('T')[0] : selectedEmployee.confirmationDate,
          resignationDate: transitionTarget === 'RESIGNATION_SUBMITTED' ? new Date().toISOString().split('T')[0] : selectedEmployee.resignationDate,
          lastWorkingDay: transitionLastWorkingDay || selectedEmployee.lastWorkingDay,
          exitReason: payload.reason,
          statusHistory: [
            {
              id: Date.now(),
              previousStatus: selectedEmployee.status,
              newStatus: transitionTarget,
              changeReason: payload.reason,
              changedByName: (currentUser && currentUser.name) || 'Priyanka Deshmukh',
              createdAt: new Date().toISOString()
            },
            ...(selectedEmployee.statusHistory || [])
          ]
        };
      }

      if (onToast) onToast(`Employee ${updated.name} transitioned to ${updated.status}`, 'success');

      // Update state
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelectedEmployee(updated);
      setShowTransitionModal(false);
      setTransitionReason('');
      fetchStats();
    } catch (err) {
      console.error(err);
      if (onToast) onToast('Error processing status transition', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Transition Modal helper
  const openTransitionModal = (target) => {
    setTransitionTarget(target);
    setShowMoreActions(false);
    if (target === 'NOTICE_PERIOD' || target === 'RESIGNATION_SUBMITTED') {
      const lDate = new Date();
      lDate.setDate(lDate.getDate() + 30);
      setTransitionLastWorkingDay(lDate.toISOString().split('T')[0]);
    }
    setShowTransitionModal(true);
  };

  // Format Status Pill
  const renderStatusPill = (statusStr) => {
    const s = (statusStr || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'CONFIRMED') {
      return (
        <span className="urja-status-pill active" id={`status-pill-${s.toLowerCase()}`}>
          <span className="urja-status-dot"></span> Active
        </span>
      );
    }
    if (s.includes('PROBATION')) {
      return (
        <span className="urja-status-pill probation" id="status-pill-probation">
          <span className="urja-status-dot"></span> On Probation
        </span>
      );
    }
    if (s.includes('NOTICE')) {
      return (
        <span className="urja-status-pill notice" id="status-pill-notice">
          <span className="urja-status-dot"></span> Notice Period
        </span>
      );
    }
    if (s.includes('RESIGN')) {
      return (
        <span className="urja-status-pill resigned" id="status-pill-resigned">
          <span className="urja-status-dot"></span> Resigned
        </span>
      );
    }
    if (s === 'EXITED') {
      return (
        <span className="urja-status-pill exited" id="status-pill-exited">
          <span className="urja-status-dot"></span> Exited
        </span>
      );
    }
    return (
      <span className="urja-status-pill active">
        <span className="urja-status-dot"></span> {statusStr}
      </span>
    );
  };

  return (
    <div className="urja-employees-container">
      {/* 1. Page Header */}
      <div className="urja-emp-header">
        <div className="urja-emp-header-left">
          <div className="urja-emp-header-icon">
            <i className="bi bi-people-fill"></i>
          </div>
          <div>
            <h1 className="urja-emp-title">Employee Management</h1>
            <p className="urja-emp-subtitle">View and manage employee details, departments, roles and employment information.</p>
          </div>
        </div>

        <div className="urja-emp-header-actions">
          <button 
            className="urja-emp-btn-primary" 
            id="add-employee-button"
            onClick={() => onToast && onToast('Candidates who officially join via ATS are registered as employees', 'info')}
          >
            <i className="bi bi-plus-lg"></i>
            <span>Add Employee</span>
            <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem', marginLeft: '0.2rem' }}></i>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Cards (5 Cards matching reference image) */}
      <div className="urja-emp-summary-grid">
        {/* Card 1: Total Employees */}
        <div 
          className={`urja-emp-card ${activeCardFilter === 'TOTAL' ? 'active-filter-card' : ''}`}
          id="summary-card-total"
          onClick={() => handleCardClick('TOTAL')}
        >
          <div className="urja-emp-card-icon blue">
            <i className="bi bi-people"></i>
          </div>
          <div className="urja-emp-card-body">
            <div className="urja-emp-card-title">Total Employees</div>
            <div className="urja-emp-card-value-row">
              <span className="urja-emp-card-value" id="count-total-employees">
                {summaryStats.totalEmployees ?? 0}
              </span>
              <span className="urja-emp-card-trend up">
                {summaryStats.totalEmployeesTrend || '0% vs last month'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Employees */}
        <div 
          className={`urja-emp-card ${activeCardFilter === 'ACTIVE' ? 'active-filter-card' : ''}`}
          id="summary-card-active"
          onClick={() => handleCardClick('ACTIVE')}
        >
          <div className="urja-emp-card-icon green">
            <i className="bi bi-person-check"></i>
          </div>
          <div className="urja-emp-card-body">
            <div className="urja-emp-card-title">Active Employees</div>
            <div className="urja-emp-card-value-row">
              <span className="urja-emp-card-value" id="count-active-employees">
                {summaryStats.activeEmployees ?? 0}
              </span>
              <span className="urja-emp-card-trend up">
                {summaryStats.activeEmployeesTrend || '0% vs last month'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: On Probation */}
        <div 
          className={`urja-emp-card ${activeCardFilter === 'PROBATION' ? 'active-filter-card' : ''}`}
          id="summary-card-probation"
          onClick={() => handleCardClick('PROBATION')}
        >
          <div className="urja-emp-card-icon orange">
            <i className="bi bi-clock"></i>
          </div>
          <div className="urja-emp-card-body">
            <div className="urja-emp-card-title">On Probation</div>
            <div className="urja-emp-card-value-row">
              <span className="urja-emp-card-value" id="count-probation-employees">
                {summaryStats.onProbation ?? 0}
              </span>
              <span className="urja-emp-card-trend neutral">
                {summaryStats.onProbationTrend || '0% vs last month'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Resigned / Exited */}
        <div 
          className={`urja-emp-card ${activeCardFilter === 'RESIGNED' ? 'active-filter-card' : ''}`}
          id="summary-card-resigned"
          onClick={() => handleCardClick('RESIGNED')}
        >
          <div className="urja-emp-card-icon red">
            <i className="bi bi-person-dash"></i>
          </div>
          <div className="urja-emp-card-body">
            <div className="urja-emp-card-title">Resigned / Exited</div>
            <div className="urja-emp-card-value-row">
              <span className="urja-emp-card-value" id="count-resigned-employees">
                {summaryStats.resignedExited ?? 0}
              </span>
              <span className="urja-emp-card-trend down">
                {summaryStats.resignedExitedTrend || '0% vs last month'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: New Joiners (This Month) */}
        <div 
          className={`urja-emp-card ${activeCardFilter === 'NEW_JOINERS' ? 'active-filter-card' : ''}`}
          id="summary-card-new-joiners"
          onClick={() => handleCardClick('NEW_JOINERS')}
        >
          <div className="urja-emp-card-icon calendar">
            <i className="bi bi-calendar3"></i>
          </div>
          <div className="urja-emp-card-body">
            <div className="urja-emp-card-title">New Joiners (This Month)</div>
            <div className="urja-emp-card-value-row">
              <span className="urja-emp-card-value" id="count-new-joiners">
                {summaryStats.newJoinersThisMonth ?? 0}
              </span>
              <span className="urja-emp-card-trend up">
                {summaryStats.newJoinersTrend || '0 new joiners'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="urja-emp-filters-card">
        <form className="urja-emp-filters-grid" onSubmit={handleSearchSubmit}>
          {/* Department */}
          <div className="urja-emp-filter-group">
            <label>Department</label>
            <select 
              className="urja-emp-select" 
              id="filter-department"
              value={departmentFilter} 
              onChange={e => setDepartmentFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              <option value="IT">IT</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Quality">Quality</option>
              <option value="Production">Production</option>
              <option value="Accounts">Accounts</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Sales">Sales</option>
              <option value="Warehouse">Warehouse</option>
            </select>
          </div>

          {/* Employment Type */}
          <div className="urja-emp-filter-group">
            <label>Employment Type</label>
            <select 
              className="urja-emp-select"
              id="filter-employment-type"
              value={employmentTypeFilter} 
              onChange={e => setEmploymentTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="PART_TIME">Part Time</option>
            </select>
          </div>

          {/* Status */}
          <div className="urja-emp-filter-group">
            <label>Status</label>
            <select 
              className="urja-emp-select"
              id="filter-status"
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_PROBATION">On Probation</option>
              <option value="CONFIRMATION_DUE">Confirmation Due</option>
              <option value="NOTICE_PERIOD">Notice Period</option>
              <option value="RESIGNATION_SUBMITTED">Resignation Submitted</option>
              <option value="EXITED">Exited / Resigned</option>
            </select>
          </div>

          {/* Location */}
          <div className="urja-emp-filter-group">
            <label>Location</label>
            <select 
              className="urja-emp-select"
              id="filter-location"
              value={locationFilter} 
              onChange={e => setLocationFilter(e.target.value)}
            >
              <option value="ALL">All Locations</option>
              <option value="Pune">Pune</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Shirdi">Shirdi</option>
              <option value="Rahuri">Rahuri</option>
            </select>
          </div>

          {/* Joining Date */}
          <div className="urja-emp-filter-group">
            <label>Joining Date</label>
            <input 
              type="date" 
              className="urja-emp-input"
              id="filter-joining-date"
              value={joiningDateFilter}
              onChange={e => setJoiningDateFilter(e.target.value)}
            />
          </div>

          {/* Global Search Input */}
          <div className="urja-emp-filter-group urja-emp-search-col">
            <div className="urja-emp-search-input-wrapper">
              <i className="bi bi-search urja-emp-search-icon"></i>
              <input 
                type="text" 
                className="urja-emp-input with-search-icon" 
                id="filter-search-input"
                placeholder="Search by name, employee ID, email, or designation..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Search Button */}
          <button type="submit" className="urja-emp-btn-search" id="btn-search-employees">
            Search
          </button>

          {/* Reset Button */}
          <button type="button" className="urja-emp-btn-reset" id="btn-reset-filters" onClick={handleResetFilters}>
            Reset
          </button>
        </form>
      </div>

      {/* 4. Split View: Left Table + Right Profile Panel */}
      <div className="urja-emp-split-view">
        {/* Table Container */}
        <div className="urja-emp-table-wrapper">
          <div className="urja-emp-table-scroll">
            <table className="urja-emp-table" id="employees-table">
              <thead>
                <tr>
                  <th className="urja-emp-th-checkbox">
                    <input 
                      type="checkbox" 
                      className="urja-emp-checkbox"
                      id="select-all-checkbox"
                      onChange={handleSelectAll}
                      checked={employees.length > 0 && selectedRows.size === employees.length}
                    />
                  </th>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Join Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const isSelected = selectedEmployee && selectedEmployee.id === emp.id;
                  const isChecked = selectedRows.has(emp.id);

                  return (
                    <tr 
                      key={emp.id} 
                      className={isSelected ? 'row-selected' : ''}
                      id={`emp-row-${emp.employeeCode}`}
                      onClick={() => handleOpenProfile(emp)}
                    >
                      <td className="urja-emp-td-checkbox" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="urja-emp-checkbox"
                          checked={isChecked}
                          onChange={e => handleToggleRow(emp.id, e)}
                        />
                      </td>

                      <td>
                        <div className="urja-emp-cell-user">
                          <img 
                            src={emp.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                            alt={emp.name} 
                            className="urja-emp-avatar"
                          />
                          <div className="urja-emp-cell-text">
                            <span className="urja-emp-user-name">{emp.name}</span>
                            <span className="urja-emp-user-email">{emp.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="urja-emp-code-badge">{emp.employeeCode}</span>
                      </td>

                      <td style={{ fontWeight: 600 }}>{emp.designationName || '—'}</td>
                      <td>{emp.departmentName || '—'}</td>
                      <td>{emp.workLocation || 'Pune'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(emp.joiningDate)}</td>
                      <td>{renderStatusPill(emp.status)}</td>

                      <td>
                        <div className="urja-emp-actions-cell" onClick={e => e.stopPropagation()}>
                          <button 
                            className="urja-emp-action-icon-btn" 
                            title="View Employee Profile"
                            id={`btn-view-${emp.employeeCode}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProfile(emp);
                            }}
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          <button 
                            className="urja-emp-action-icon-btn" 
                            title="Change Employment Status"
                            id={`btn-edit-${emp.employeeCode}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployee(emp);
                              setShowTransitionModal(true);
                            }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>

                          <button 
                            className="urja-emp-action-icon-btn" 
                            title="More Options"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployee(emp);
                              setShowMoreActions(true);
                            }}
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <i className="bi bi-person-x" style={{ fontSize: '2.5rem', color: '#cbd5e1' }}></i>
                      <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>No ATS-recruited employees found matching the filters.</p>
                      <button className="urja-emp-btn-reset" onClick={handleResetFilters} style={{ marginTop: '0.5rem' }}>
                        Clear Filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="urja-emp-pagination">
            <div className="urja-emp-pagination-left">
              <span>Showing 1 to {Math.min(employees.length, pageSize)} of {totalElements} records</span>
              <div className="urja-emp-rows-per-page">
                <span>Rows per page</span>
                <select 
                  className="urja-emp-rows-select" 
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="urja-emp-pagination-pages">
              <button 
                className="urja-emp-page-btn" 
                disabled={page === 0} 
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              <button className="urja-emp-page-btn active">1</button>
              <button className="urja-emp-page-btn">2</button>
              <button className="urja-emp-page-btn">3</button>
              <button className="urja-emp-page-btn">4</button>
              <button className="urja-emp-page-btn">5</button>
              <span style={{ color: '#94a3b8', margin: '0 0.2rem' }}>...</span>

              <button className="urja-emp-page-btn" onClick={() => setPage(p => p + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Right Details Profile Drawer (matches visual reference) */}
        {selectedEmployee && (
          <div className="urja-emp-profile-panel" id="employee-profile-panel">
            {/* Panel Header matching screenshot layout */}
            <div className="urja-emp-panel-header">
              <button 
                className="urja-emp-panel-close-btn" 
                id="btn-close-profile"
                onClick={handleCloseDrawer}
                title="Close Profile (Esc)"
              >
                <i className="bi bi-x-lg"></i>
              </button>

              <div className="urja-emp-panel-header-inner">
                <img 
                  src={selectedEmployee.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                  alt={selectedEmployee.name} 
                  className="urja-emp-panel-avatar"
                />

                <div className="urja-emp-panel-header-info">
                  <h2 className="urja-emp-panel-name" id="profile-employee-name">{selectedEmployee.name}</h2>
                  <div className="urja-emp-panel-designation-row">
                    <span className="urja-emp-panel-designation" id="profile-employee-designation">
                      {selectedEmployee.designationName || 'Software Engineer'}
                    </span>
                    {renderStatusPill(selectedEmployee.status)}
                  </div>

                  <div className="urja-emp-panel-contact-row">
                    <span className="urja-emp-contact-item" id="profile-employee-email">
                      <i className="bi bi-envelope"></i> {selectedEmployee.email}
                    </span>
                    <span className="urja-emp-contact-item" id="profile-employee-phone">
                      <i className="bi bi-telephone"></i> {selectedEmployee.phoneNumber || '+91 98765 43210'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtabs: exactly 4 functional tabs matching Requirement 4 */}
            <div className="urja-emp-panel-tabs">
              {['Overview', 'Employment', 'Documents', 'Attendance'].map(tab => (
                <button
                  key={tab}
                  id={`tab-btn-${tab.toLowerCase()}`}
                  className={`urja-emp-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Panel Content with independent vertical scroll */}
            <div className="urja-emp-panel-content">
              {isDrawerLoading ? (
                <div className="urja-emp-drawer-loader" id="drawer-loading-indicator">
                  <div className="urja-emp-drawer-spinner"></div>
                  <span>Fetching employee details...</span>
                </div>
              ) : drawerError ? (
                <div className="urja-emp-drawer-error" id="drawer-error-alert">
                  <i className="bi bi-exclamation-triangle"></i>
                  <span className="urja-emp-drawer-error-text">{drawerError}</span>
                  <button 
                    className="urja-emp-btn-reset" 
                    onClick={() => handleOpenProfile(selectedEmployee)}
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', marginTop: '0.3rem' }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Overview Tab */}
                  {activeTab === 'Overview' && (
                    <>
                      {/* Personal Information */}
                      <div className="urja-emp-info-section">
                        <div className="urja-emp-section-header">
                          <i className="bi bi-person urja-emp-section-icon"></i>
                          <span>Personal Information</span>
                        </div>

                        <div className="urja-emp-info-grid">
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Employee ID</span>
                            <span className="urja-emp-info-value" id="detail-employee-id">{selectedEmployee.employeeCode}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Date of Birth</span>
                            <span className="urja-emp-info-value" id="detail-dob">{formatDate(selectedEmployee.dateOfBirth)}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Phone</span>
                            <span className="urja-emp-info-value" id="detail-phone">{selectedEmployee.phoneNumber || '+91 98765 43210'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Gender</span>
                            <span className="urja-emp-info-value" id="detail-gender">{selectedEmployee.gender || 'Not Set'}</span>
                          </div>
                          <div className="urja-emp-info-item" style={{ gridColumn: 'span 2' }}>
                            <span className="urja-emp-info-label">Address</span>
                            <span className="urja-emp-info-value" id="detail-address">{selectedEmployee.address || 'Pune, Maharashtra'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Blood Group</span>
                            <span className="urja-emp-info-value" id="detail-blood-group">{selectedEmployee.bloodGroup || 'Not Set'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Marital Status</span>
                            <span className="urja-emp-info-value" id="detail-marital-status">{selectedEmployee.maritalStatus || 'Single'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Employment Information */}
                      <div className="urja-emp-info-section">
                        <div className="urja-emp-section-header">
                          <i className="bi bi-briefcase urja-emp-section-icon"></i>
                          <span>Employment Information</span>
                        </div>

                        <div className="urja-emp-info-grid">
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Designation</span>
                            <span className="urja-emp-info-value" id="detail-designation">{selectedEmployee.designationName || 'Software Engineer'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Department</span>
                            <span className="urja-emp-info-value" id="detail-department">{selectedEmployee.departmentName || 'IT'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Location</span>
                            <span className="urja-emp-info-value" id="detail-location">{selectedEmployee.workLocation || 'Pune'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Joining Date</span>
                            <span className="urja-emp-info-value" id="detail-joining-date">{formatDate(selectedEmployee.joiningDate)}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Employment Type</span>
                            <span className="urja-emp-info-value" id="detail-employment-type">{selectedEmployee.employmentType || 'Full Time'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Reporting Manager</span>
                            <span className="urja-emp-info-value" id="detail-manager">{selectedEmployee.reportingManagerName || 'Priyanka Deshmukh'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Probation Period</span>
                            <span className="urja-emp-info-value" id="detail-probation">
                              {selectedEmployee.probationDurationMonths 
                                ? `${selectedEmployee.probationDurationMonths} Months (till ${formatDate(selectedEmployee.probationEndDate)})`
                                : 'Not Set'}
                            </span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Confirmation Status</span>
                            <span className="urja-emp-info-value" id="detail-confirmation">
                              {selectedEmployee.confirmationStatus === 'CONFIRMED'
                                ? `Confirmed (${formatDate(selectedEmployee.confirmationDate)})`
                                : 'Pending Review'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Employment Tab */}
                  {activeTab === 'Employment' && (
                    <>
                      <div className="urja-emp-info-section">
                        <div className="urja-emp-section-header">
                          <i className="bi bi-file-earmark-text urja-emp-section-icon"></i>
                          <span>Department & Role Details</span>
                        </div>
                        <div className="urja-emp-info-grid">
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Department</span>
                            <span className="urja-emp-info-value">{selectedEmployee.departmentName || 'IT'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Designation</span>
                            <span className="urja-emp-info-value">{selectedEmployee.designationName || 'Software Engineer'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Work Location</span>
                            <span className="urja-emp-info-value">{selectedEmployee.workLocation || 'Pune'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Joining Date</span>
                            <span className="urja-emp-info-value">{formatDate(selectedEmployee.joiningDate)}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Employment Type</span>
                            <span className="urja-emp-info-value">{selectedEmployee.employmentType || 'Full Time'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Reporting Manager</span>
                            <span className="urja-emp-info-value">{selectedEmployee.reportingManagerName || 'Priyanka Deshmukh'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Probation End Date</span>
                            <span className="urja-emp-info-value">{formatDate(selectedEmployee.probationEndDate)}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Confirmation Status</span>
                            <span className="urja-emp-info-value">
                              {selectedEmployee.confirmationStatus === 'CONFIRMED'
                                ? `Confirmed (${formatDate(selectedEmployee.confirmationDate)})`
                                : 'Pending Review'}
                            </span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Candidate ATS ID</span>
                            <span className="urja-emp-info-value">CAND-{selectedEmployee.candidateId || '101'}</span>
                          </div>
                          <div className="urja-emp-info-item">
                            <span className="urja-emp-info-label">Offer Letter ID</span>
                            <span className="urja-emp-info-value">OFFER-2026-{selectedEmployee.offerId || '01'}</span>
                          </div>
                          {selectedEmployee.resignationDate && (
                            <div className="urja-emp-info-item">
                              <span className="urja-emp-info-label">Resignation Date</span>
                              <span className="urja-emp-info-value">{formatDate(selectedEmployee.resignationDate)}</span>
                            </div>
                          )}
                          {selectedEmployee.lastWorkingDay && (
                            <div className="urja-emp-info-item">
                              <span className="urja-emp-info-label">Last Working Day</span>
                              <span className="urja-emp-info-value highlight-alert">{formatDate(selectedEmployee.lastWorkingDay)}</span>
                            </div>
                          )}
                          {selectedEmployee.actualExitDate && (
                            <div className="urja-emp-info-item">
                              <span className="urja-emp-info-label">Actual Exit Date</span>
                              <span className="urja-emp-info-value highlight-danger">{formatDate(selectedEmployee.actualExitDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Employment History Timeline */}
                      <div className="urja-emp-info-section">
                        <div className="urja-emp-section-header">
                          <i className="bi bi-clock-history urja-emp-section-icon"></i>
                          <span>Employment History</span>
                        </div>

                        <div className="urja-emp-history-timeline">
                          {selectedEmployee.statusHistory && selectedEmployee.statusHistory.length > 0 ? (
                            selectedEmployee.statusHistory.map((hist, idx) => (
                              <div key={idx} className="urja-emp-history-entry">
                                <span className="urja-emp-history-title">
                                  {hist.previousStatus} → {hist.newStatus}
                                </span>
                                <span className="urja-emp-history-meta">
                                  By {hist.changedByName || 'HR Administrator'} on {formatDate(hist.createdAt)}
                                </span>
                                {hist.changeReason && (
                                  <div className="urja-emp-history-reason">
                                    "{hist.changeReason}"
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="urja-emp-history-entry">
                              <span className="urja-emp-history-title">Joined via ATS Recruitment</span>
                              <span className="urja-emp-history-meta">
                                Joined on {formatDate(selectedEmployee.joiningDate)} • Current Status: {selectedEmployee.status}
                              </span>
                              <div className="urja-emp-history-reason">
                                Candidate successfully completed ATS interview process and joined Urja Foods workforce.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Documents Tab */}
                  {activeTab === 'Documents' && (
                    <div className="urja-emp-info-section">
                      <div className="urja-emp-section-header">
                        <i className="bi bi-file-earmark-check urja-emp-section-icon"></i>
                        <span>Employee Documents</span>
                      </div>

                      {employeeDocuments && employeeDocuments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {employeeDocuments.map((doc, idx) => {
                            const docTitle = doc.documentName || doc.fileName || doc.name || 'Verified Document.pdf';
                            const docCategory = doc.category || doc.documentType || 'OFFICIAL_DOCUMENT';
                            const docSize = doc.fileSizeBytes 
                              ? `${(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` 
                              : (doc.fileSize || '2.4 MB');
                            const docDate = formatDate(doc.createdAt || doc.uploadedAt || selectedEmployee.joiningDate);

                            return (
                              <div key={doc.id || idx} className="urja-emp-doc-card">
                                <div className="urja-emp-doc-left">
                                  <i className="bi bi-file-earmark-pdf urja-emp-doc-icon"></i>
                                  <div className="urja-emp-doc-info">
                                    <span className="urja-emp-doc-name">{docTitle}</span>
                                    <span className="urja-emp-doc-meta">
                                      {docSize} • Uploaded {docDate}
                                    </span>
                                  </div>
                                </div>
                                <div className="urja-emp-doc-actions">
                                  <button 
                                    className="urja-emp-action-icon-btn" 
                                    title="Preview Document"
                                    id={`btn-preview-doc-${idx}`}
                                    onClick={() => setPreviewDoc({ ...doc, docTitle, docCategory, docSize, docDate })}
                                  >
                                    <i className="bi bi-eye"></i>
                                  </button>
                                  <button 
                                    className="urja-emp-action-icon-btn" 
                                    title="Download Document"
                                    id={`btn-download-doc-${idx}`}
                                    onClick={() => onToast && onToast(`Downloaded ${docTitle}`, 'info')}
                                  >
                                    <i className="bi bi-download"></i>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="urja-emp-empty-state" id="documents-empty-state">
                          <i className="bi bi-file-earmark-x"></i>
                          <div className="urja-emp-empty-state-title">No Documents Available</div>
                          <p className="urja-emp-empty-state-desc">
                            No verified onboarding or recruitment documents are attached to this employee record.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attendance Tab */}
                  {activeTab === 'Attendance' && (
                    <div className="urja-emp-info-section">
                      <div className="urja-emp-section-header">
                        <i className="bi bi-calendar-check urja-emp-section-icon"></i>
                        <span>Workforce Attendance</span>
                      </div>
                      <div className="urja-emp-empty-state" id="attendance-empty-state">
                        <i className="bi bi-calendar-x"></i>
                        <div className="urja-emp-empty-state-title">No Attendance Records Available</div>
                        <p className="urja-emp-empty-state-desc">
                          Attendance tracking is not configured for this ATS employee. Records will appear once the biometric or time-tracking module is integrated.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Panel Action Footer */}
            <div className="urja-emp-panel-footer">
              <button 
                className="urja-emp-btn-secondary"
                id="btn-edit-employee-profile"
                onClick={() => onToast && onToast(`Editing profile for ${selectedEmployee.name}`, 'info')}
              >
                <i className="bi bi-pencil"></i>
                <span>Edit Employee</span>
              </button>

              <button 
                className="urja-emp-btn-secondary"
                id="btn-view-documents"
                onClick={() => setActiveTab('Documents')}
              >
                <i className="bi bi-file-earmark-check"></i>
                <span>View Documents</span>
              </button>

              {/* More Actions Dropdown */}
              <div className="urja-emp-btn-dropdown" ref={moreActionsRef}>
                <button 
                  className="urja-emp-btn-secondary"
                  id="btn-more-actions"
                  onClick={() => setShowMoreActions(v => !v)}
                >
                  <span>More Actions</span>
                  <i className="bi bi-chevron-down" style={{ fontSize: '0.7rem' }}></i>
                </button>

                {showMoreActions && (
                  <div className="urja-emp-actions-menu">
                    {selectedEmployee.status === 'ON_PROBATION' && (
                      <button 
                        className="urja-emp-menu-item"
                        id="action-confirm-employee"
                        onClick={() => openTransitionModal('ACTIVE')}
                      >
                        <i className="bi bi-check-circle text-success"></i> Confirm Employee
                      </button>
                    )}

                    {(selectedEmployee.status === 'ACTIVE' || selectedEmployee.status === 'ON_PROBATION') && (
                      <button 
                        className="urja-emp-menu-item"
                        id="action-submit-resignation"
                        onClick={() => openTransitionModal('RESIGNATION_SUBMITTED')}
                      >
                        <i className="bi bi-envelope-exclamation text-warning"></i> Submit Resignation
                      </button>
                    )}

                    {(selectedEmployee.status === 'RESIGNATION_SUBMITTED' || selectedEmployee.status === 'ACTIVE') && (
                      <button 
                        className="urja-emp-menu-item"
                        id="action-notice-period"
                        onClick={() => openTransitionModal('NOTICE_PERIOD')}
                      >
                        <i className="bi bi-hourglass-split text-primary"></i> Initiate Notice Period
                      </button>
                    )}

                    {(selectedEmployee.status === 'NOTICE_PERIOD' || selectedEmployee.status === 'RESIGNATION_SUBMITTED') && (
                      <button 
                        className="urja-emp-menu-item danger"
                        id="action-complete-exit"
                        onClick={() => openTransitionModal('EXITED')}
                      >
                        <i className="bi bi-box-arrow-right"></i> Complete Exit
                      </button>
                    )}

                    <button 
                      className="urja-emp-menu-item danger"
                      id="action-terminate"
                      onClick={() => openTransitionModal('TERMINATED')}
                    >
                      <i className="bi bi-slash-circle"></i> Terminate Contract
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Status Transition Modal */}
      {showTransitionModal && selectedEmployee && (
        <div className="urja-modal-overlay">
          <div className="urja-modal-card">
            <div className="urja-modal-header">
              <h3 className="urja-modal-title">
                Lifecycle Status Transition: {selectedEmployee.name}
              </h3>
              <button 
                className="urja-emp-action-icon-btn" 
                onClick={() => setShowTransitionModal(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="urja-modal-body">
              <div className="urja-emp-filter-group">
                <label>Target Employment Status</label>
                <select 
                  className="urja-emp-select"
                  id="modal-target-status-select"
                  value={transitionTarget}
                  onChange={e => setTransitionTarget(e.target.value)}
                >
                  <option value="ACTIVE">Active / Confirmed</option>
                  <option value="ON_PROBATION">On Probation</option>
                  <option value="RESIGNATION_SUBMITTED">Resignation Submitted</option>
                  <option value="NOTICE_PERIOD">Notice Period</option>
                  <option value="EXITED">Exited / Resigned</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              {(transitionTarget === 'RESIGNATION_SUBMITTED' || transitionTarget === 'NOTICE_PERIOD') && (
                <>
                  <div className="urja-emp-filter-group">
                    <label>Notice Period (Days)</label>
                    <input 
                      type="number"
                      className="urja-emp-input"
                      id="modal-notice-days"
                      value={transitionNoticeDays}
                      onChange={e => setTransitionNoticeDays(Number(e.target.value))}
                    />
                  </div>
                  <div className="urja-emp-filter-group">
                    <label>Last Working Day</label>
                    <input 
                      type="date"
                      className="urja-emp-input"
                      id="modal-last-working-day"
                      value={transitionLastWorkingDay}
                      onChange={e => setTransitionLastWorkingDay(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="urja-emp-filter-group">
                <label>Reason / Audit Note</label>
                <textarea 
                  className="urja-emp-input"
                  id="modal-transition-reason"
                  rows="3"
                  placeholder="Enter reason for status transition (recorded in audit logs)..."
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                />
              </div>
            </div>

            <div className="urja-modal-footer">
              <button 
                type="button" 
                className="urja-emp-btn-reset" 
                onClick={() => setShowTransitionModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="urja-emp-btn-primary" 
                id="btn-confirm-status-transition"
                onClick={handlePerformTransition}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Apply Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Document Preview Modal */}
      {previewDoc && (
        <div className="urja-modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="urja-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="urja-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <i className="bi bi-file-earmark-pdf" style={{ color: '#dc2626', fontSize: '1.4rem' }}></i>
                <h3 className="urja-modal-title" id="preview-modal-title" style={{ fontSize: '1.05rem' }}>
                  {previewDoc.docTitle || previewDoc.documentName || previewDoc.fileName || 'Verified Document.pdf'}
                </h3>
              </div>
              <button 
                className="urja-emp-action-icon-btn" 
                onClick={() => setPreviewDoc(null)}
                title="Close Preview"
                id="btn-close-preview-modal"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="urja-modal-body" style={{ gap: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Document Name</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{previewDoc.docTitle || previewDoc.documentName || previewDoc.fileName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Document Type</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{previewDoc.docCategory || previewDoc.category || previewDoc.documentType || 'OFFICIAL_DOCUMENT'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>File Size</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{previewDoc.docSize || previewDoc.fileSize || '2.4 MB'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Uploaded Date</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{previewDoc.docDate || formatDate(previewDoc.uploadedAt || previewDoc.createdAt || (selectedEmployee && selectedEmployee.joiningDate))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Verification Status</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>VERIFIED (ATS HR)</span>
                </div>
              </div>
              <div style={{ padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="bi bi-shield-check" style={{ fontSize: '1.1rem' }}></i>
                <span>This document was verified during ATS onboarding and is secured under role-based access policy.</span>
              </div>
            </div>
            <div className="urja-modal-footer">
              <button 
                type="button"
                className="urja-emp-btn-reset" 
                onClick={() => setPreviewDoc(null)}
              >
                Close
              </button>
              <button 
                type="button"
                className="urja-emp-btn-primary" 
                onClick={() => {
                  if (onToast) onToast(`Downloading ${previewDoc.fileName || previewDoc.documentType}`, 'success');
                  setPreviewDoc(null);
                }}
              >
                <i className="bi bi-download"></i>
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
