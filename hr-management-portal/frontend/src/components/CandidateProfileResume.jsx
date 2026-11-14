import React, { useState, useEffect, useCallback } from 'react';
import { getStoredToken } from '../services/api';

function formatDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatCurrencyCtc(val) {
  if (val == null || val === '') return null;
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} LPA`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export default function CandidateProfileResume({
  candidate,
  currentUser,
  onClose,
  onScheduleInterview,
  onAddFeedback,
  onCandidateUpdated,
  showToast = () => {}
}) {
  const [activeTab, setActiveTab] = useState('resume');
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const candidateId = candidate?.id;
  const token = getStoredToken() || currentUser?.token || null;
  const userRoles = (currentUser?.roles || []).map(r => typeof r === 'string' ? r : (r.roleName || r.name || ''));
  if (currentUser?.role) userRoles.push(currentUser.role);
  const isHrAdmin = userRoles.includes('ROLE_HR_ADMIN') || currentUser?.role === 'ROLE_HR_ADMIN';

  const loadCandidateProfile = useCallback(async () => {
    if (!candidateId || !token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`http://localhost:8080/api/v1/candidates/${candidateId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || `Failed to load candidate profile (${res.status})`);
      }
      if (body?.data) {
        setProfileData(body.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not load candidate profile details.');
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, token]);

  useEffect(() => {
    loadCandidateProfile();
  }, [loadCandidateProfile]);

  const handleToggleVerify = async () => {
    if (!candidateId || !token || !isHrAdmin || isVerifying) return;
    const currentVerified = Boolean(c.isVerified);
    setIsVerifying(true);
    try {
      const res = await fetch(
        `http://localhost:8080/api/v1/candidates/${candidateId}/verify?verified=${!currentVerified}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || 'Verification update failed.');
      }
      await loadCandidateProfile();
      if (onCandidateUpdated && body?.data) {
        onCandidateUpdated(body.data);
      }
      showToast(!currentVerified ? 'Candidate marked as Verified.' : 'Candidate verification removed.');
    } catch (err) {
      showToast(err.message || 'Could not update verification status.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!candidateId || !token || !resumeContent?.documentId) return;
    try {
      const res = await fetch(
        `http://localhost:8080/api/v1/candidates/${candidateId}/resume/download?documentId=${resumeContent.documentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Unable to download resume file.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resumeContent.fileName || 'resume';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message || 'Resume download failed.');
    }
  };

  if (!candidate && !profileData?.candidate) {
    return (
      <div className="urja-candidate-detail-container">
        <button className="btn btn-sm btn-outline-secondary mb-3" onClick={onClose}>
          <i className="bi bi-arrow-left me-1"></i> Back to Candidate Management
        </button>
        <div className="p-4 bg-white rounded border text-muted">
          No candidate selected.
        </div>
      </div>
    );
  }

  const dbCand = profileData?.candidate || {};
  const c = {
    id: dbCand.id ?? candidate?.id,
    code: dbCand.candidateCode ?? candidate?.code ?? null,
    name: dbCand.name ?? candidate?.name ?? '',
    email: dbCand.email ?? candidate?.email ?? '',
    mobile: dbCand.mobile ?? candidate?.mobile ?? '',
    role: dbCand.jobTitle ?? dbCand.currentDesignation ?? candidate?.jobTitle ?? null,
    department: dbCand.departmentName ?? candidate?.department ?? null,
    location: dbCand.location ?? candidate?.location ?? null,
    status: dbCand.displayStatus ?? candidate?.status ?? null,
    appliedDate: dbCand.appliedDate ?? (dbCand.createdAt ? formatDateOnly(dbCand.createdAt) : candidate?.appliedDate) ?? null,
    expYears: dbCand.experienceYears ?? candidate?.expYears ?? null,
    employer: dbCand.currentEmployer ?? candidate?.currentEmployer ?? null,
    currentCtc: dbCand.currentCtc ?? candidate?.currentCtc ?? null,
    expectedCtc: dbCand.expectedCtc ?? candidate?.expectedCtc ?? null,
    noticeDays: dbCand.noticePeriodDays ?? candidate?.noticeDays ?? null,
    source: dbCand.source ?? candidate?.source ?? null,
    skills: dbCand.primarySkills ?? candidate?.skills ?? null,
    linkedinUrl: dbCand.linkedinUrl ?? candidate?.linkedinUrl ?? null,
    professionalSummary: dbCand.professionalSummary ?? candidate?.professionalSummary ?? null,
    workExperience: dbCand.workExperience ?? candidate?.workExperience ?? null,
    educationDetails: dbCand.educationDetails ?? candidate?.educationDetails ?? null,
    certifications: dbCand.certifications ?? candidate?.certifications ?? null,
    hrNotes: dbCand.hrNotes ?? candidate?.hrNotes ?? null,
    isVerified: dbCand.isVerified ?? candidate?.isVerified ?? false,
    verifiedBy: dbCand.verifiedBy ?? candidate?.verifiedBy ?? null,
    verifiedAt: dbCand.verifiedAt ?? candidate?.verifiedAt ?? null
  };

  const documents = profileData?.documents || [];
  const resumeContent = profileData?.resumeContent || null;
  const interviews = profileData?.interviews || [];
  const feedbacks = profileData?.feedbacks || [];
  const history = profileData?.history || [];

  const summaryText = resumeContent?.summary || c.professionalSummary || null;
  const summarySource = resumeContent?.summary
    ? 'Extracted from Uploaded Resume'
    : c.professionalSummary
    ? 'HR / Candidate Entered'
    : null;

  const experienceText = resumeContent?.workExperience || c.workExperience || null;
  const experienceSource = resumeContent?.workExperience
    ? 'Extracted from Uploaded Resume'
    : c.workExperience
    ? 'HR / Candidate Entered'
    : null;

  const educationText = resumeContent?.education || c.educationDetails || null;
  const educationSource = resumeContent?.education
    ? 'Extracted from Uploaded Resume'
    : c.educationDetails
    ? 'HR / Candidate Entered'
    : null;

  const certificationsText = resumeContent?.certifications || c.certifications || null;
  const certificationsSource = resumeContent?.certifications
    ? 'Extracted from Uploaded Resume'
    : c.certifications
    ? 'HR / Candidate Entered'
    : null;

  const skillItems = (() => {
    if (resumeContent?.skillItems && resumeContent.skillItems.length > 0) {
      return resumeContent.skillItems;
    }
    if (c.skills) {
      return c.skills
        .split(/[,;|•\r\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }
    return [];
  })();

  const hasAnyStructuredResumeSection = Boolean(
    summaryText || experienceText || educationText || certificationsText || skillItems.length > 0
  );

  return (
    <div className="urja-candidate-detail-container">
      {/* Top Breadcrumb / Return Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <button
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          onClick={onClose}
        >
          <i className="bi bi-arrow-left"></i>
          <span>Back to Candidate Management</span>
        </button>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {isHrAdmin && (
            <button
              className={`btn btn-sm ${c.isVerified ? 'btn-outline-success' : 'btn-outline-secondary'}`}
              onClick={handleToggleVerify}
              disabled={isVerifying}
              title={c.isVerified ? 'Click to revoke verification' : 'Explicitly verify this candidate'}
            >
              <i className={`bi ${c.isVerified ? 'bi-patch-check-fill' : 'bi-patch-check'} me-1`}></i>
              {isVerifying ? 'Updating...' : c.isVerified ? 'Verified (Revoke)' : 'Verify Candidate'}
            </button>
          )}
          {isHrAdmin && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => onScheduleInterview && onScheduleInterview(c)}
            >
              <i className="bi bi-calendar-plus me-1"></i> Schedule Interview
            </button>
          )}
          <button
            className="btn btn-sm btn-success fw-bold"
            onClick={() => onAddFeedback && onAddFeedback(c)}
          >
            <i className="bi bi-star-fill me-1"></i> Record Feedback
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger py-2 px-3 small mb-3">
          <i className="bi bi-exclamation-circle me-2"></i>{errorMsg}
        </div>
      )}

      {/* Split Layout: Left Profile Card, Right Resume Document View */}
      <div className="urja-candidate-split-layout">

        {/* LEFT PROFILE CARD — displays ONLY authentic candidate/HR-entered fields */}
        <div className="urja-candidate-profile-card">
          <div style={{ position: 'relative' }}>
            <div
              className="urja-candidate-avatar-lg d-flex align-items-center justify-content-center bg-success-subtle text-success fw-bold"
              style={{ fontSize: '1.75rem' }}
            >
              {c.name
                ? c.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(p => p[0].toUpperCase())
                    .join('')
                : '?'}
            </div>
          </div>

          <h3 className="fw-bold text-dark mb-1" style={{ fontSize: '1.25rem' }}>{c.name}</h3>
          {c.role && <p className="text-muted small mb-2">{c.role}</p>}

          <div className="d-flex flex-wrap justify-content-center gap-2" style={{ marginBottom: '1.25rem' }}>
            {c.status && (
              <span className="urja-status-pill open" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                <span className="urja-status-dot"></span>
                {c.status}
              </span>
            )}
            {c.isVerified === true && (
              <span
                className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 d-inline-flex align-items-center gap-1"
                title={c.verifiedBy ? `Verified by ${c.verifiedBy}${c.verifiedAt ? ` on ${formatDateTime(c.verifiedAt)}` : ''}` : 'Verified by HR Admin'}
              >
                <i className="bi bi-patch-check-fill"></i>
                Verified Candidate
              </span>
            )}
          </div>

          <div style={{ width: '100%', textAlign: 'left', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
            {c.mobile && (
              <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
                <i className="bi bi-telephone text-success"></i>
                <span className="text-dark fw-medium">{c.mobile}</span>
              </div>
            )}
            {c.email && (
              <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
                <i className="bi bi-envelope text-primary"></i>
                <span className="text-dark fw-medium" style={{ wordBreak: 'break-all' }}>{c.email}</span>
              </div>
            )}
            {c.location && (
              <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
                <i className="bi bi-geo-alt text-danger"></i>
                <span className="text-dark fw-medium">{c.location}</span>
              </div>
            )}
            {c.linkedinUrl && (
              <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
                <i className="bi bi-linkedin text-info"></i>
                <span className="text-dark fw-medium" style={{ wordBreak: 'break-all' }}>{c.linkedinUrl}</span>
              </div>
            )}
            {c.appliedDate && (
              <div className="d-flex align-items-center gap-2 small text-muted">
                <i className="bi bi-calendar3 text-secondary"></i>
                <span>Applied: <strong>{c.appliedDate}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT TABS & RESUME VIEWER */}
        <div className="urja-resume-viewer-card">
          {/* Subtabs Header */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-bottom bg-light">
            <div className="urja-tab-pill-bar mb-0 pb-0 border-0">
              <button
                className={`urja-tab-pill-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button
                className={`urja-tab-pill-item ${activeTab === 'resume' ? 'active' : ''}`}
                onClick={() => setActiveTab('resume')}
              >
                Resume
              </button>
              <button
                className={`urja-tab-pill-item ${activeTab === 'interviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('interviews')}
              >
                Interviews ({interviews.length})
              </button>
              <button
                className={`urja-tab-pill-item ${activeTab === 'feedback' ? 'active' : ''}`}
                onClick={() => setActiveTab('feedback')}
              >
                Feedback ({feedbacks.length})
              </button>
              <button
                className={`urja-tab-pill-item ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </div>

            <button
              className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1"
              onClick={handleDownloadResume}
              disabled={!resumeContent?.documentId}
              title={resumeContent?.documentId ? `Download ${resumeContent.fileName}` : 'No resume uploaded'}
            >
              <i className="bi bi-download"></i>
              <span>{resumeContent?.documentId ? 'Download' : 'No Resume'}</span>
            </button>
          </div>

          {isLoading && !profileData && (
            <div className="p-4 text-center text-muted small">Loading candidate profile...</div>
          )}

          {/* TAB 1: RESUME VIEWER — ONLY uploaded resume extraction or explicit HR/candidate entries */}
          {activeTab === 'resume' && (
            <div className="urja-resume-doc-sheet">
              <div className="urja-resume-paper">
                {/* Header */}
                <div className="d-flex align-items-start justify-content-between border-bottom pb-3 mb-3">
                  <div>
                    <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem' }}>{c.name}</h2>
                    {c.role && (
                      <h5 className="text-secondary fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
                        {c.role}
                      </h5>
                    )}
                    <div className="small text-muted d-flex flex-wrap gap-3">
                      {c.email && <span><i className="bi bi-envelope me-1"></i> {c.email}</span>}
                      {c.mobile && <span><i className="bi bi-phone me-1"></i> {c.mobile}</span>}
                      {c.location && <span><i className="bi bi-geo-alt me-1"></i> {c.location}</span>}
                    </div>
                  </div>
                  <div className="text-end">
                    {c.isVerified === true && (
                      <span
                        className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"
                        title={c.verifiedBy ? `Verified by ${c.verifiedBy}` : 'Verified'}
                      >
                        Verified Candidate
                      </span>
                    )}
                  </div>
                </div>

                {/* Uploaded Document Metadata or Empty State */}
                {!resumeContent ? (
                  <div className="p-4 rounded border bg-light text-center my-3">
                    <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="fw-semibold text-dark mb-1 mt-2">No resume uploaded by this candidate.</p>
                    <p className="small text-muted mb-0">
                      Only candidate-provided or explicitly HR-entered information is displayed.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded border bg-light mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div className="small">
                      <span className="fw-bold text-dark">
                        <i className="bi bi-file-earmark-check text-success me-1"></i>
                        {resumeContent.fileName}
                      </span>
                      <span className="text-muted ms-2">
                        ({formatFileSize(resumeContent.fileSizeBytes)})
                      </span>
                      {resumeContent.uploadedAt && (
                        <span className="text-muted ms-2">
                          • Uploaded {formatDateTime(resumeContent.uploadedAt)}
                        </span>
                      )}
                    </div>
                    {resumeContent.rawText && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-secondary btn-sm py-0 px-2"
                        onClick={() => setShowRawText(prev => !prev)}
                      >
                        {showRawText ? 'Hide Extracted Raw Text' : 'View Extracted Raw Text'}
                      </button>
                    )}
                  </div>
                )}

                {resumeContent && !resumeContent.textExtracted && (
                  <div className="alert alert-light border small text-muted mb-3">
                    Original file <strong>{resumeContent.fileName}</strong> is stored. Text could not be extracted automatically from this file format — use the Download button above to inspect the original document.
                  </div>
                )}

                {/* Structured Resume Sections (strictly omitted when not present) */}
                {summaryText && (
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="urja-resume-section-title">Professional Summary</div>
                      <span className="badge bg-light text-secondary border small">{summarySource}</span>
                    </div>
                    <p className="small text-muted mb-0" style={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {summaryText}
                    </p>
                  </div>
                )}

                {experienceText && (
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="urja-resume-section-title">Work Experience</div>
                      <span className="badge bg-light text-secondary border small">{experienceSource}</span>
                    </div>
                    <p className="small text-dark mb-0" style={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {experienceText}
                    </p>
                  </div>
                )}

                {(educationText || certificationsText) && (
                  <div className="row g-3 mb-3">
                    {educationText && (
                      <div className={certificationsText ? 'col-md-6' : 'col-12'}>
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="urja-resume-section-title">Education</div>
                          <span className="badge bg-light text-secondary border small">{educationSource}</span>
                        </div>
                        <div className="small text-dark" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                          {educationText}
                        </div>
                      </div>
                    )}
                    {certificationsText && (
                      <div className={educationText ? 'col-md-6' : 'col-12'}>
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="urja-resume-section-title">Certifications</div>
                          <span className="badge bg-light text-secondary border small">{certificationsSource}</span>
                        </div>
                        <div className="small text-dark" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                          {certificationsText}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {skillItems.length > 0 && (
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="urja-resume-section-title">Skills</div>
                      <span className="badge bg-light text-secondary border small">
                        {resumeContent?.skillItems?.length ? 'Extracted from Uploaded Resume' : 'HR / Candidate Entered'}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {skillItems.map((sk, idx) => (
                        <span key={`${sk}-${idx}`} className="badge bg-light text-dark border px-2 py-1 small">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* When uploaded resume has text without standard section headers, OR user clicked raw text */}
                {resumeContent?.rawText && (!hasAnyStructuredResumeSection || showRawText) && (
                  <div className="mt-3">
                    <div className="urja-resume-section-title">Extracted Resume Content</div>
                    <pre
                      className="small text-dark bg-light p-3 rounded border mb-0"
                      style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}
                    >
                      {resumeContent.rawText}
                    </pre>
                  </div>
                )}

                {/* Additional explicitly uploaded candidate documents */}
                {documents.length > 1 && (
                  <div className="mt-3 pt-3 border-top">
                    <div className="urja-resume-section-title">Uploaded Documents ({documents.length})</div>
                    <ul className="small text-muted ps-3 mb-0">
                      {documents.map(doc => (
                        <li key={doc.id}>
                          <strong>{doc.documentType}</strong>: {doc.fileName} ({formatFileSize(doc.fileSizeBytes)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE TAB — Authentic database fields with explicit Not provided messages */}
          {activeTab === 'profile' && (
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">Applicant Overview</h5>
                {c.code && <span className="badge bg-light text-dark border">{c.code}</span>}
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Current Employer</small>
                    <strong>{c.employer || 'Not provided'}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Total Experience</small>
                    <strong>{c.expYears != null ? `${c.expYears} years` : 'Not provided'}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Current CTC</small>
                    <strong>{formatCurrencyCtc(c.currentCtc) || 'Not provided'}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Expected CTC</small>
                    <strong className={c.expectedCtc != null ? 'text-success' : ''}>
                      {formatCurrencyCtc(c.expectedCtc) || 'Not provided'}
                    </strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Notice Period</small>
                    <strong>{c.noticeDays != null ? `${c.noticeDays} Days` : 'Not provided'}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Source</small>
                    <strong>{c.source || 'Not provided'}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Department</small>
                    <strong>{c.department || 'Not provided'}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Location</small>
                    <strong>{c.location || 'Not provided'}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded h-100">
                    <small className="text-muted d-block">Verification Status</small>
                    <strong>
                      {c.isVerified === true
                        ? `Verified${c.verifiedBy ? ` by ${c.verifiedBy}` : ''}`
                        : 'Not verified'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="border-top pt-3">
                <h6 className="fw-bold text-dark mb-2">Detailed Qualifications & Profile Information</h6>
                <div className="d-flex flex-column gap-2 small">
                  <div>
                    <strong>Professional Summary: </strong>
                    <span className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                      {summaryText || 'Not provided.'}
                    </span>
                  </div>
                  <div>
                    <strong>Work Experience: </strong>
                    <span className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                      {experienceText || 'Not provided.'}
                    </span>
                  </div>
                  <div>
                    <strong>Education: </strong>
                    <span className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                      {educationText || 'Not provided.'}
                    </span>
                  </div>
                  <div>
                    <strong>Certifications: </strong>
                    <span className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                      {certificationsText || 'Not provided.'}
                    </span>
                  </div>
                  <div>
                    <strong>Skills: </strong>
                    <span className="text-muted">
                      {skillItems.length > 0 ? skillItems.join(', ') : 'Not provided.'}
                    </span>
                  </div>
                  {c.hrNotes && (
                    <div>
                      <strong>HR Notes (HR-Entered): </strong>
                      <span className="text-muted" style={{ whiteSpace: 'pre-line' }}>{c.hrNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERVIEWS TAB — Real DB interviews */}
          {activeTab === 'interviews' && (
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">Scheduled & Completed Rounds</h5>
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() => onScheduleInterview && onScheduleInterview(c)}
                >
                  + New Round
                </button>
              </div>
              {interviews.length === 0 ? (
                <div className="p-4 rounded border bg-light text-center small text-muted">
                  No interviews scheduled for this candidate yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {interviews.map(inv => (
                    <div key={inv.id} className="p-3 border rounded-3 bg-white">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="fw-bold text-dark mb-1">
                            {(inv.round || 'Interview').replace(/_/g, ' ')}
                          </h6>
                          {inv.interviewerName && (
                            <div className="small text-muted">
                              Interviewer: <strong>{inv.interviewerName}</strong>
                            </div>
                          )}
                          {inv.scheduledAt && (
                            <div className="small text-muted">
                              Time: <strong>{formatDateTime(inv.scheduledAt)}</strong>
                              {inv.mode ? ` • ${inv.mode}` : ''}
                            </div>
                          )}
                        </div>
                        {inv.status && <span className="badge bg-success">{inv.status}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FEEDBACK TAB — Real DB feedback scorecards */}
          {activeTab === 'feedback' && (
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">Panel Evaluation & Feedback</h5>
                <button
                  className="btn btn-sm btn-success fw-bold"
                  onClick={() => onAddFeedback && onAddFeedback(c)}
                >
                  + Add Feedback
                </button>
              </div>
              {feedbacks.length === 0 ? (
                <div className="p-4 rounded border bg-light text-center small text-muted">
                  No interview feedback submitted yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {feedbacks.map(fb => (
                    <div key={fb.id} className="p-3 border rounded-3 bg-light">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="fw-bold text-dark">
                          {fb.interviewerName || 'Interviewer'}
                          {fb.round ? ` (${fb.round.replace(/_/g, ' ')})` : ''}
                        </span>
                        {fb.recommendation && (
                          <span className="badge bg-success">
                            Recommendation: {fb.recommendation.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <div className="d-flex flex-wrap gap-4 small text-muted mb-2">
                        <span>Tech: <strong>{fb.technicalRating}/5</strong></span>
                        <span>Comm: <strong>{fb.communicationRating}/5</strong></span>
                        <span>Cultural Fit: <strong>{fb.cultureFitRating}/5</strong></span>
                        {fb.overallRating != null && (
                          <span>Overall: <strong>{fb.overallRating}/5</strong></span>
                        )}
                      </div>
                      {fb.detailedComments && (
                        <p className="small text-dark mb-0 bg-white p-2 rounded border">
                          {fb.detailedComments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HISTORY TAB — Real DB audit/activity timeline */}
          {activeTab === 'history' && (
            <div className="p-4">
              <h5 className="fw-bold text-dark mb-3">Activity & Stage Timeline</h5>
              {history.length === 0 ? (
                <div className="p-4 rounded border bg-light text-center small text-muted">
                  No recorded activity history yet.
                </div>
              ) : (
                <ul className="small text-muted ps-3 mb-0" style={{ lineHeight: 1.8 }}>
                  {history.map((item, idx) => (
                    <li key={`${item.timestamp || idx}-${idx}`}>
                      {item.timestamp && <strong>{formatDateTime(item.timestamp)}: </strong>}
                      <span className="text-dark fw-medium">{item.title}</span>
                      {item.description ? ` — ${item.description}` : ''}
                      {item.sourceType && (
                        <span className="badge bg-light text-secondary border ms-2">{item.sourceType}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
