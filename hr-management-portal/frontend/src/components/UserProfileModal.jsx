import React, { useState, useEffect } from 'react';
import { authService } from '../services/api';

const PRESET_AVATARS = [
  { id: 'woman', label: 'Corporate Lead (F)', url: '/assets/images/woman.jpg' },
  { id: 'man', label: 'Corporate Lead (M)', url: '/assets/images/man.jpg' },
  { id: 'neha', label: 'Professional Neha', url: '/assets/images/cand_neha.jpg' },
  { id: 'amit', label: 'Executive Amit', url: '/assets/images/cand_amit.jpg' },
  { id: 'sneha', label: 'Specialist Sneha', url: '/assets/images/cand_sneha.jpg' },
  { id: 'vikram', label: 'Manager Vikram', url: '/assets/images/cand_vikram.jpg' }
];

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated = () => {},
  onChangePasswordClick,
  onSignOut
}) {
  const [profileData, setProfileData] = useState(currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form Edit State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProfileData(currentUser);
      setIsEditing(false);
      setErrorMessage('');
      setSuccessMessage('');
      
      const initialName = currentUser?.name || '';
      const initialPhone = currentUser?.phoneNumber || '';
      const initialAvatar = currentUser?.profileImageUrl || currentUser?.avatar || '/assets/images/woman.jpg';
      setEditName(initialName);
      setEditPhone(initialPhone);
      setEditAvatar(initialAvatar);
      setCustomAvatarUrl('');

      // Fetch freshest profile from backend
      setIsLoading(true);
      authService.getCurrentUser()
        .then((res) => {
          if (res) {
            setProfileData(res);
            setEditName(res.name || initialName);
            setEditPhone(res.phoneNumber || initialPhone);
            const freshAvatar = res.profileImageUrl || res.avatar || initialAvatar;
            setEditAvatar(freshAvatar);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const user = profileData || currentUser || {};
  const isPrivilegedAdmin = user.role === 'ROLE_IT_ADMIN' || user.role === 'ROLE_HR_ADMIN' || 
    (Array.isArray(user.roles) && (user.roles.includes('ROLE_IT_ADMIN') || user.roles.includes('ROLE_HR_ADMIN')));

  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'ROLE_IT_ADMIN':
        return { label: 'IT Administrator', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
      case 'ROLE_HR_ADMIN':
        return { label: 'HR Administrator', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' };
      case 'ROLE_HR_RECRUITER':
        return { label: 'HR Recruiter', bg: '#FDF4FF', color: '#86198F', border: '#F5D0FE' };
      case 'ROLE_DEPT_HEAD':
        return { label: 'Department Head', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
      case 'ROLE_APPROVING_MANAGER':
        return { label: 'Approving Manager', bg: '#F8FAFC', color: '#334155', border: '#CBD5E1' };
      default:
        return { label: user.title || 'Team Member', bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' };
    }
  };

  const roleBadge = getRoleBadge(user.role || (Array.isArray(user.roles) ? user.roles[0] : ''));

  const handleStartEdit = () => {
    setEditName(user.name || '');
    setEditPhone(user.phoneNumber || '');
    const currentImg = user.profileImageUrl || user.avatar || '/assets/images/woman.jpg';
    setEditAvatar(currentImg);
    setErrorMessage('');
    setSuccessMessage('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMessage('');
    setEditName(user.name || '');
    setEditPhone(user.phoneNumber || '');
    setEditAvatar(user.profileImageUrl || user.avatar || '/assets/images/woman.jpg');
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!editName || editName.trim().length < 2) {
      setErrorMessage('Full name is required (minimum 2 characters).');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        name: editName.trim(),
        phoneNumber: editPhone ? editPhone.trim() : '',
        profileImageUrl: customAvatarUrl.trim() ? customAvatarUrl.trim() : editAvatar
      };

      const updated = await authService.updateCurrentUserProfile(payload);
      setIsSaving(false);
      setProfileData(updated);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (err) {
      setIsSaving(false);
      const msg = err.response?.data?.message || err.message || 'Failed to update user profile.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="urja-modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div 
        className="urja-modal-box-white" 
        style={{ maxWidth: '640px', width: '92%', borderRadius: '16px', overflow: 'hidden', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Header */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <img 
                src={(isEditing ? (customAvatarUrl || editAvatar) : (user.profileImageUrl || user.avatar)) || (user.role === 'ROLE_DEPT_HEAD' ? '/assets/images/man.jpg' : '/assets/images/woman.jpg')}
                alt={user.name || 'User'}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #FFFFFF',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}
                onError={(e) => { 
                  e.target.src = user.role === 'ROLE_DEPT_HEAD' ? '/assets/images/man.jpg' : '/assets/images/woman.jpg'; 
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '14px',
                height: '14px',
                backgroundColor: '#22c55e',
                border: '2px solid #FFFFFF',
                borderRadius: '50%'
              }} title="Online Active Session"></span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, fontWeight: 700 }}>
                {isEditing ? 'Editing Personal Details' : 'ATS URJA • User Identity'}
              </div>
              <h3 style={{ margin: '2px 0 4px 0', fontSize: '1.35rem', fontWeight: 800 }}>
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
                  {user.designation || user.title || 'Talent Acquisition Lead'}
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
                marginBottom: '22px'
              }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Full Name
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {user.name || 'HR Administrator'}
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
                    {user.phoneNumber || '+91 98200 22334'}
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
                    Designation & Role
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {user.designation || user.title || 'Talent Acquisition Lead'} • {roleBadge.label}
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
               EDIT MODE (Available to ALL Users)
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
                    Edit Your Profile Information
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Update your full name, phone number, and profile avatar
                  </span>
                </div>

                <span style={{
                  background: '#EFF6FF',
                  color: '#2563EB',
                  border: '1px solid #BFDBFE',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  Editing Mode Active
                </span>
              </div>

              {/* Avatar Picker Section */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Choose Your Profile Avatar
                </label>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setEditAvatar(av.url);
                        setCustomAvatarUrl('');
                      }}
                      style={{
                        background: editAvatar === av.url && !customAvatarUrl ? '#DCFCE7' : '#FFFFFF',
                        border: editAvatar === av.url && !customAvatarUrl ? '2px solid #16A34A' : '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <img 
                        src={av.url} 
                        alt={av.label} 
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1E293B' }}>
                        {av.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="url"
                    placeholder="Or enter custom image URL (e.g. https://...)"
                    value={customAvatarUrl}
                    onChange={(e) => {
                      setCustomAvatarUrl(e.target.value);
                      if (e.target.value) setEditAvatar(e.target.value);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC'
                    }}
                  />
                  {customAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setCustomAvatarUrl('')}
                      style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
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
                    placeholder="Enter your full name"
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

                <div>
                  <label htmlFor="editProfilePhone" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Contact Phone Number
                  </label>
                  <input
                    id="editProfilePhone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 98200 22334"
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
              </div>

              {/* Readonly Organization Details (Protected) */}
              <div style={{
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '10px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="bi bi-lock-fill text-muted"></i>
                  <span>Protected Organization Details (Managed by HR / IT Policy)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.82rem', color: '#475569' }}>
                  <div>Email: <strong>{user.email || 'hradmin@urjafoods.net'}</strong></div>
                  <div>Username: <strong>@{user.username || 'hradmin'}</strong></div>
                  <div>Department: <strong>{user.department || user.dept || 'Human Resources'}</strong></div>
                  <div>Role: <strong>{roleBadge.label}</strong></div>
                </div>
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
                  gap: '6px'
                }}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Saving...</span>
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
