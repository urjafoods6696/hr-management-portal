import React, { useState, useEffect, useRef } from 'react';
import { useUserProfile, resolveUserAvatar, getRoleDisplayName } from '../context/UserProfileContext';

// Recognized organizational departments in ATS Urja
const DEPARTMENTS = [
  { id: 1, name: 'Engineering & Technology', code: 'DEP-ENG' },
  { id: 2, name: 'Global Sales & Enterprise BD', code: 'DEP-SALES' },
  { id: 3, name: 'Human Resources & Talent Acquisition', code: 'DEP-HR' },
  { id: 4, name: 'Finance, Tax & Accounts', code: 'DEP-FIN' },
  { id: 5, name: 'Operations & Supply Chain', code: 'DEP-OPS' },
  { id: 6, name: 'Brand Marketing & Communications', code: 'DEP-MKT' }
];

// Recognized organizational roles in ATS Urja
const ROLES = [
  { code: 'ROLE_IT_ADMIN', label: 'IT Administrator' },
  { code: 'ROLE_HR_ADMIN', label: 'HR Administrator' },
  { code: 'ROLE_HR_RECRUITER', label: 'Senior Technical Recruiter' },
  { code: 'ROLE_DEPT_HEAD', label: 'Department Head' },
  { code: 'ROLE_APPROVING_MANAGER', label: 'Approving Manager' },
  { code: 'ROLE_SENIOR_MGMT', label: 'Senior Leadership / VP' },
  { code: 'ROLE_INTERVIEWER', label: 'Technical Lead / Interviewer' },
  { code: 'ROLE_EMPLOYEE', label: 'Standard Employee' }
];

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser: propUser,
  onProfileUpdated = () => {},
  onChangePasswordClick,
  onSignOut
}) {
  const { currentUser: contextUser, updateUserProfile, refreshUserProfile } = useUserProfile();
  const effectiveUser = contextUser || propUser || {};

  const [profileData, setProfileData] = useState(effectiveUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Device Avatar Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Form Edit State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState(3);
  const [editDepartment, setEditDepartment] = useState('Human Resources & Talent Acquisition');
  const [editRole, setEditRole] = useState('ROLE_HR_ADMIN');

  const user = profileData || effectiveUser || {};
  const isPrivilegedAdmin = user.role === 'ROLE_IT_ADMIN' || user.role === 'ROLE_HR_ADMIN' ||
    (Array.isArray(user.roles) && (user.roles.includes('ROLE_IT_ADMIN') || user.roles.includes('ROLE_HR_ADMIN')));

  // Populate state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setProfileData(effectiveUser);
      setIsEditing(false);
      setErrorMessage('');
      setSuccessMessage('');
      setSelectedFile(null);
      setPreviewUrl(null);

      syncFormFields(effectiveUser);

      // Fetch freshest profile from backend once on modal open
      setIsLoading(true);
      refreshUserProfile()
        .then((res) => {
          if (res) {
            setProfileData(res);
            setIsEditing((currentEditing) => {
              if (!currentEditing) {
                syncFormFields(res);
              }
              return currentEditing;
            });
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Clean up object URL when unmounting or changing preview
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const syncFormFields = (data) => {
    if (!data) return;
    setEditName(data.name || data.fullName || '');
    setEditPhone(data.phone || data.phoneNumber || '');
    setEditEmail(data.email || '');
    setEditUsername(data.username || '');

    // Map department
    const deptId = data.departmentId || data.departmentRestrictionId || 3;
    setEditDepartmentId(deptId);
    const matchedDept = DEPARTMENTS.find(d => d.id === deptId) || DEPARTMENTS.find(d => d.name === data.department);
    setEditDepartment(matchedDept ? matchedDept.name : (data.department || 'Human Resources & Talent Acquisition'));

    // Map role
    const primaryRole = data.role || (Array.isArray(data.roles) && data.roles[0]) || 'ROLE_HR_ADMIN';
    setEditRole(primaryRole);
  };

  if (!isOpen) return null;

  const roleLabel = getRoleDisplayName(user.role || (Array.isArray(user.roles) ? user.roles[0] : ''));

  const handleStartEdit = () => {
    syncFormFields(user);
    setErrorMessage('');
    setSuccessMessage('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    syncFormFields(user);
    setErrorMessage('');
    setIsEditing(false);
  };

  /**
   * Native device image picker selection handler
   */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');

    // 1. Validate File Size (Maximum 5 MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('File size exceeds 5MB limit. Please choose a smaller image (under 5MB).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validate Image File Type (JPG, JPEG, PNG, WEBP)
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileNameLower.endsWith(ext));
    const hasValidMime = validMimes.includes(file.type.toLowerCase()) || (file.type === '' && hasValidExt);

    if (!hasValidMime && !hasValidExt) {
      setErrorMessage('Invalid file format. Please select a JPG, JPEG, PNG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Revoke previous blob if any
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Field Validation
    if (!editName || editName.trim().length < 2) {
      setErrorMessage('Full name is required (minimum 2 characters).');
      return;
    }

    if (isPrivilegedAdmin) {
      if (!editEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
        setErrorMessage('Please enter a valid official work email address.');
        return;
      }

      const cleanUser = editUsername.trim().replace(/^@/, '');
      if (!cleanUser || cleanUser.length < 3) {
        setErrorMessage('Username must be at least 3 characters long.');
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload = {
        name: editName.trim(),
        fullName: editName.trim(),
        phoneNumber: editPhone ? editPhone.trim() : '',
        phone: editPhone ? editPhone.trim() : ''
      };

      if (isPrivilegedAdmin) {
        payload.email = editEmail.trim().toLowerCase();
        payload.username = editUsername.trim().replace(/^@/, '');
        payload.departmentId = Number(editDepartmentId);
        payload.department = editDepartment;
        payload.role = editRole;
      }

      // 1. Submit through Centralized Profile Manager (uploads image & syncs backend)
      const updated = await updateUserProfile(payload, selectedFile);

      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsSaving(false);
      setProfileData(updated);
      setSuccessMessage('Profile and account details updated successfully!');
      setIsEditing(false);

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }

      // Requirement 4, item 6: Close modal after successful saving
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setIsSaving(false);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update user profile.';
      setErrorMessage(msg);
    }
  };

  // Currently displayed image
  const displayImageSrc = previewUrl || resolveUserAvatar(user.profileImageUrl || user.avatar, user.role, user.avatarVersion);

  return (
    <div className="urja-modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="urja-modal-box-white"
        style={{ maxWidth: '680px', width: '94%', borderRadius: '18px', overflow: 'hidden', padding: 0, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Header with Circular Avatar & Device Upload Pencil */}
        <div style={{
          background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
          padding: '24px 28px',
          color: '#FFFFFF',
          position: 'relative'
        }}>
          <button
            type="button"
            id="closeProfileModalTopBtn"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '18px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            ✕
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Circular Profile Avatar with Pencil Upload Button Overlay */}
            <div style={{ position: 'relative', width: '82px', height: '82px', flexShrink: 0 }}>
              <img
                src={displayImageSrc}
                alt={user.name || 'User'}
                style={{
                  width: '82px',
                  height: '82px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #FFFFFF',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  backgroundColor: '#E2E8F0',
                  display: 'block'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = user.role === 'ROLE_DEPT_HEAD'
                    ? `${(typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'}assets/images/man.jpg`
                    : `${(typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'}assets/images/woman.jpg`;
                }}
              />

              {/* Online indicator (shown when not editing) */}
              {!isEditing && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#22c55e',
                    border: '2px solid #FFFFFF',
                    borderRadius: '50%'
                  }}
                  title="Online Active Session"
                ></span>
              )}

              {/* Native Device File Upload Trigger (Pencil Icon Overlay) */}
              <button
                type="button"
                id="profileImageUploadPencilBtn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload image from device (JPG, JPEG, PNG, WEBP up to 5MB)"
                aria-label="Upload profile image"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.15s ease-in-out',
                  zIndex: 3
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0F5132';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#15803D';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <i className="bi bi-pencil-fill" style={{ fontSize: '0.82rem' }}></i>
              </button>

              {/* Hidden native file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp,image/jpg"
                style={{ display: 'none' }}
              />
            </div>

            {/* Profile Identity Title */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontWeight: 700 }}>
                {isEditing ? 'Editing Profile & Identity' : 'ATS URJA • User Identity'}
              </div>
              <h3 style={{ margin: '2px 0 6px 0', fontSize: '1.4rem', fontWeight: 800 }}>
                {isEditing ? (editName || 'User Name') : (user.name || 'Administrator')}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.25)',
                  color: '#FFFFFF',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {roleLabel}
                </span>

                <span style={{
                  background: '#FFFFFF',
                  color: '#15803D',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  ● {user.status || 'ACTIVE'}
                </span>

                {selectedFile && (
                  <span style={{
                    background: '#FEF08A',
                    color: '#854D0E',
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <i className="bi bi-image"></i> New photo selected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div style={{
            margin: '16px 28px 0',
            padding: '10px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#B91C1C',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            margin: '16px 28px 0',
            padding: '10px 14px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            color: '#15803D',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="bi bi-check-circle-fill"></i>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', maxHeight: '68vh', overflowY: 'auto' }}>

          {/* =========================================================================
              VIEW MODE
              ========================================================================= */}
          {!isEditing ? (
            <>
              {/* Profile Details Header Bar with "Edit Profile" Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F1F5F9'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                    Account Profile Details
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Personal and organizational credentials
                  </span>
                </div>

                <button
                  type="button"
                  id="userProfileEditBtn"
                  onClick={handleStartEdit}
                  style={{
                    background: '#F0FDF4',
                    color: '#15803D',
                    border: '1px solid #BBF7D0',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#DCFCE7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F0FDF4'; }}
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Quick Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '14px',
                marginBottom: '22px'
              }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Full Name
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {user.name || user.fullName || 'HR Administrator'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Official Work Email
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px', wordBreak: 'break-all' }}>
                    {user.email || 'hradmin@urjafoods.net'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Username / Login ID
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    @{user.username || 'hradmin'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Contact Phone Number
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {user.phone || user.phoneNumber || '+91 98200 99999'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Assigned Department
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {user.department || user.dept || 'Human Resources & Talent Acquisition'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Role & Authority Level
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {roleLabel}
                  </div>
                </div>
              </div>

              {/* Security & Password Card */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      <strong style={{ fontSize: '0.9rem', color: '#166534' }}>
                        {isPrivilegedAdmin ? 'Privileged Security: Email OTP Verification' : 'Account Security Protected'}
                      </strong>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#15803D', lineHeight: 1.4 }}>
                      {isPrivilegedAdmin
                        ? 'Administrative passwords require two-factor verification via your registered email OTP.'
                        : 'Your account is secured with JWT authentication and enterprise role-based authorization.'}
                    </p>
                  </div>

                  {isPrivilegedAdmin && (
                    <button
                      type="button"
                      id="userProfileChangePasswordBtn"
                      onClick={() => {
                        onClose();
                        if (onChangePasswordClick) onChangePasswordClick();
                      }}
                      style={{
                        background: '#15803D',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>Change Password</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* =========================================================================
               EDIT MODE (All Profile Fields Editable + Device Upload)
               ========================================================================= */
            <form onSubmit={handleSaveProfile}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F1F5F9'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                    Edit Profile Information
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Click pencil icon on avatar to upload photo; update fields below
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        background: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #CBD5E1',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Revert Photo
                    </button>
                  )}

                  <span style={{
                    background: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #BFDBFE',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    Editing Active
                  </span>
                </div>
              </div>

              {/* All 6 Profile Fields in Clean Responsive Form Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
              }}>
                {/* 1. Full Name */}
                <div>
                  <label htmlFor="editProfileName" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    id="editProfileName"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter full name"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#16A34A'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; }}
                  />
                </div>

                {/* 2. Contact Phone Number */}
                <div>
                  <label htmlFor="editProfilePhone" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Contact Phone Number
                  </label>
                  <input
                    id="editProfilePhone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98200 99999"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#16A34A'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; }}
                  />
                </div>

                {/* 3. Official Work Email */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label htmlFor="editProfileEmail" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                      Official Work Email <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    {!isPrivilegedAdmin && (
                      <span style={{ fontSize: '0.7rem', color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                        <i className="bi bi-lock-fill me-1"></i>Admin Only
                      </span>
                    )}
                  </div>
                  <input
                    id="editProfileEmail"
                    type="email"
                    required
                    disabled={!isPrivilegedAdmin}
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="name@urjafoods.net"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: !isPrivilegedAdmin ? '#F8FAFC' : '#FFFFFF',
                      cursor: !isPrivilegedAdmin ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => { if (isPrivilegedAdmin) e.target.style.borderColor = '#16A34A'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; }}
                  />
                </div>

                {/* 4. Username / Login ID */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label htmlFor="editProfileUsername" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                      Username / Login ID <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    {!isPrivilegedAdmin && (
                      <span style={{ fontSize: '0.7rem', color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                        <i className="bi bi-lock-fill me-1"></i>Admin Only
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.88rem'
                    }}>
                      @
                    </span>
                    <input
                      id="editProfileUsername"
                      type="text"
                      required
                      disabled={!isPrivilegedAdmin}
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.replace(/^@/, ''))}
                      placeholder="username"
                      style={{
                        width: '100%',
                        padding: '9px 14px 9px 28px',
                        fontSize: '0.88rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: !isPrivilegedAdmin ? '#F8FAFC' : '#FFFFFF',
                        cursor: !isPrivilegedAdmin ? 'not-allowed' : 'text'
                      }}
                      onFocus={(e) => { if (isPrivilegedAdmin) e.target.style.borderColor = '#16A34A'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; }}
                    />
                  </div>
                </div>

                {/* 5. Assigned Department Dropdown */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label htmlFor="editProfileDepartment" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                      Assigned Department <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    {!isPrivilegedAdmin && (
                      <span style={{ fontSize: '0.7rem', color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                        <i className="bi bi-lock-fill me-1"></i>Admin Only
                      </span>
                    )}
                  </div>
                  <select
                    id="editProfileDepartment"
                    disabled={!isPrivilegedAdmin}
                    value={editDepartmentId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setEditDepartmentId(id);
                      const matched = DEPARTMENTS.find(d => d.id === id);
                      if (matched) setEditDepartment(matched.name);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: !isPrivilegedAdmin ? '#F8FAFC' : '#FFFFFF',
                      cursor: !isPrivilegedAdmin ? 'not-allowed' : 'pointer'
                    }}
                    onFocus={(e) => { if (isPrivilegedAdmin) e.target.style.borderColor = '#16A34A'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; }}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Role & Authority Level Dropdown */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label htmlFor="editProfileRole" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                      Role & Authority Level <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    {!isPrivilegedAdmin && (
                      <span style={{ fontSize: '0.7rem', color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                        <i className="bi bi-lock-fill me-1"></i>Admin Only
                      </span>
                    )}
                  </div>
                  <select
                    id="editProfileRole"
                    disabled={!isPrivilegedAdmin}
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: !isPrivilegedAdmin ? '#F8FAFC' : '#FFFFFF',
                      cursor: !isPrivilegedAdmin ? 'not-allowed' : 'pointer'
                    }}
                    onFocus={(e) => { if (isPrivilegedAdmin) e.target.style.borderColor = '#16A34A'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; }}
                  >
                    {ROLES.map((role) => (
                      <option key={role.code} value={role.code}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informational Guidance Notice */}
              <div style={{
                background: isPrivilegedAdmin ? '#F0FDF4' : '#F8FAFC',
                border: isPrivilegedAdmin ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: isPrivilegedAdmin ? '#15803D' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className={isPrivilegedAdmin ? "bi bi-shield-check" : "bi bi-info-circle-fill"}></i>
                <span>
                  {isPrivilegedAdmin
                    ? 'Administrator Access Active: You are authorized to modify all account fields including username, email, department, and role.'
                    : 'Organization details (Email, Username, Department, Role) require administrator privileges to update. Full Name, Phone, and Photo are freely editable.'}
                </span>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 28px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {!isEditing ? (
            <>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => {
                  onClose();
                  if (onSignOut) onSignOut();
                }}
                style={{ fontWeight: 600, fontSize: '0.82rem', borderRadius: '6px' }}
              >
                <i className="bi bi-box-arrow-right me-1"></i> Sign Out
              </button>

              <button
                type="button"
                id="closeUserProfileModalBtn"
                onClick={onClose}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 22px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                id="cancelProfileEditBtn"
                onClick={handleCancelEdit}
                disabled={isSaving}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  padding: '7px 18px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                id="saveProfileChangesBtn"
                onClick={handleSaveProfile}
                disabled={isSaving}
                style={{
                  background: '#15803D',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 22px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
                }}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg"></i>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
