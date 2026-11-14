import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/api';
import '../styles/urja-admin-password.css';

export default function AdminPasswordChangeModal({
  isOpen,
  onClose,
  currentUser = null,
  onSuccess = () => {},
  showToast = () => {}
}) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [accountRole, setAccountRole] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 5-minute Countdown Timer (300 seconds)
  const [timeLeft, setTimeLeft] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const defaultEmail = currentUser?.email || '';
      setEmail(defaultEmail);
      setAccountRole(currentUser?.role === 'ROLE_IT_ADMIN' ? 'IT Administrator' : 'HR Administrator');
      setOtp(['', '', '', '', '', '']);
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setSuccessMessage('');
      setDevOtpPreview(null);
      setTimeLeft(300);
      setResendCooldown(0);
    }
  }, [isOpen, currentUser]);

  // Countdown timer effect
  useEffect(() => {
    let timer = null;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Format MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Password Complexity Validation Rules
  const hasMinLength = newPassword.length >= 12;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const passedRulesCount = [hasMinLength, hasUppercase, hasLowercase, hasDigit, hasSpecial].filter(Boolean).length;
  const isFormValid = passedRulesCount === 5 && passwordsMatch;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: 'Empty', color: '#94a3b8', width: '0%' };
    if (passedRulesCount <= 2) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (passedRulesCount === 3) return { label: 'Fair', color: '#f59e0b', width: '50%' };
    if (passedRulesCount === 4) return { label: 'Good', color: '#3b82f6', width: '75%' };
    return { label: 'Strong (Enterprise Compliant)', color: '#16a34a', width: '100%' };
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const emailToUse = email.trim();
    if (!emailToUse) {
      setErrorMessage('Please enter your registered work email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authService.requestAdminPasswordOtp(emailToUse);
      setIsLoading(false);
      setAccountRole(res.accountRole || 'Privileged Administrator');
      setMaskedEmail(res.email || emailToUse);
      setTimeLeft(res.expiresInSeconds || 300);
      setResendCooldown(30);
      setDevOtpPreview(res.devOtpPreview || null);
      setSuccessMessage(res.message || 'Verification code dispatched to your registered email.');
      setStep(2);
      setTimeout(() => {
        if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
      }, 200);
    } catch (err) {
      setIsLoading(false);
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch verification code.';
      setErrorMessage(msg);
    }
  };

  // Handle OTP Inputs
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 numeric digits of your verification code.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage('Verification code has expired. Please request a new code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authService.verifyAdminPasswordOtp(email.trim(), fullOtp);
      setIsLoading(false);
      setResetToken(res.resetToken);
      setSuccessMessage(res.message || 'OTP verified successfully!');
      setStep(3);
    } catch (err) {
      setIsLoading(false);
      const msg = err.response?.data?.message || err.message || 'Invalid verification code.';
      setErrorMessage(msg);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await authService.requestAdminPasswordOtp(email.trim());
      setIsLoading(false);
      setTimeLeft(res.expiresInSeconds || 300);
      setResendCooldown(30);
      setOtp(['', '', '', '', '', '']);
      setDevOtpPreview(res.devOtpPreview || null);
      setSuccessMessage('A new verification code has been dispatched to your email.');
      if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
    } catch (err) {
      setIsLoading(false);
      const msg = err.response?.data?.message || err.message || 'Failed to resend code.';
      setErrorMessage(msg);
    }
  };

  // Step 3: Save New Password
  const handleCommitPassword = async (e) => {
    if (e) e.preventDefault();
    if (!isFormValid) {
      setErrorMessage('Please fulfill all password complexity requirements before submitting.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authService.resetAdminPassword(email.trim(), resetToken, newPassword, confirmPassword);
      setIsLoading(false);
      setSuccessMessage(res.message || 'Password successfully updated!');
      setStep(4);
      onSuccess(res);
      showToast('Password changed successfully for ' + (accountRole || 'administrator'));
    } catch (err) {
      setIsLoading(false);
      const msg = err.response?.data?.message || err.message || 'Failed to update password.';
      setErrorMessage(msg);
    }
  };

  const strength = getStrengthLabel();

  return (
    <div className="urja-admin-pwd-backdrop" onClick={onClose}>
      <div className="urja-admin-pwd-card" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="urja-admin-pwd-header">
          <div className="urja-admin-pwd-header-badge">
            <i className="bi bi-shield-lock-fill"></i>
          </div>
          <div className="urja-admin-pwd-header-text">
            <h3>Privileged Password Security</h3>
            <p>Two-Factor Email OTP Verification for HR Admin &amp; IT Admin</p>
          </div>
          <button className="urja-admin-pwd-close-btn" onClick={onClose} title="Close">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="urja-admin-pwd-steps">
          <div className={`urja-pwd-step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="urja-pwd-step-num">{step > 1 ? <i className="bi bi-check"></i> : '1'}</span>
            <span className="urja-pwd-step-title">Account</span>
          </div>
          <div className="urja-pwd-step-line"></div>
          <div className={`urja-pwd-step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="urja-pwd-step-num">{step > 2 ? <i className="bi bi-check"></i> : '2'}</span>
            <span className="urja-pwd-step-title">Email OTP</span>
          </div>
          <div className="urja-pwd-step-line"></div>
          <div className={`urja-pwd-step-item ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <span className="urja-pwd-step-num">{step > 3 ? <i className="bi bi-check"></i> : '3'}</span>
            <span className="urja-pwd-step-title">New Password</span>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="urja-admin-pwd-alert error">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && step !== 4 && (
          <div className="urja-admin-pwd-alert success">
            <i className="bi bi-check-circle-fill"></i>
            <div>{successMessage}</div>
          </div>
        )}

        {/* STEP 1: VERIFY ACCOUNT EMAIL */}
        {step === 1 && (
          <form className="urja-admin-pwd-body" onSubmit={handleRequestOtp}>
            <div className="urja-admin-pwd-info-banner">
              <i className="bi bi-info-circle-fill"></i>
              <span>
                To protect critical organizational records, passwords for <strong>HR Admin</strong> and <strong>IT Admin</strong> can only be changed after verifying identity with a single-use email code.
              </span>
            </div>

            <div className="urja-form-group">
              <label className="urja-form-label">
                Registered Administrator Email <span className="text-danger">*</span>
              </label>
              <div className="urja-input-wrapper">
                <i className="bi bi-envelope urja-input-icon"></i>
                <input
                  type="email"
                  className="urja-text-input"
                  placeholder="e.g. hradmin@urjafoods.net or itadmin@urjafoods.net"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading || (currentUser && currentUser.email)}
                  required
                  autoFocus
                />
              </div>
              <small className="urja-input-hint">
                Only verified HR Admin and IT Admin accounts are authorized to use this high-security interface.
              </small>
            </div>

            <div className="urja-admin-pwd-footer">
              <button type="button" className="urja-btn-ghost" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
              <button type="submit" className="urja-btn-primary" disabled={isLoading || !email.trim()}>
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    <span>Dispatching OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <i className="bi bi-arrow-right ms-2"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFY 6-DIGIT OTP */}
        {step === 2 && (
          <form className="urja-admin-pwd-body" onSubmit={handleVerifyOtp}>
            <div className="urja-admin-pwd-otp-info">
              <p>
                We dispatched a secure 6-digit verification code to:
              </p>
              <div className="urja-admin-pwd-target-email">
                <i className="bi bi-shield-check text-success"></i>
                <strong>{maskedEmail || email}</strong>
                <span className="badge bg-success-subtle text-success border border-success-subtle ms-2">
                  {accountRole}
                </span>
              </div>
            </div>

            {/* Dev Mode Notification if active */}
            {devOtpPreview && (
              <div className="urja-admin-pwd-dev-box">
                <i className="bi bi-code-slash text-primary"></i>
                <div>
                  <strong>Local Dev Environment Preview:</strong>
                  <span> Generated Code: <code>{devOtpPreview}</code> (SMTP placeholder active)</span>
                </div>
              </div>
            )}

            {/* 6 Digit Input Boxes */}
            <div className="urja-otp-boxes-wrap" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => otpInputRefs.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`urja-otp-digit-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  disabled={isLoading || timeLeft <= 0}
                />
              ))}
            </div>

            {/* Timer and Resend Row */}
            <div className="urja-otp-timer-row">
              <div className={`urja-otp-countdown ${timeLeft <= 60 ? 'urgent' : ''}`}>
                <i className="bi bi-clock-history"></i>
                <span>Expires in: <strong>{formatTime(timeLeft)}</strong></span>
              </div>

              <button
                type="button"
                className="urja-resend-otp-btn"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
              >
                {resendCooldown > 0 ? (
                  `Resend Code in ${resendCooldown}s`
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Resend Code
                  </>
                )}
              </button>
            </div>

            <div className="urja-admin-pwd-footer">
              <button
                type="button"
                className="urja-btn-ghost"
                onClick={() => { setStep(1); setErrorMessage(''); }}
                disabled={isLoading}
              >
                &larr; Change Email
              </button>
              <button
                type="submit"
                className="urja-btn-primary"
                disabled={isLoading || otp.join('').length !== 6 || timeLeft <= 0}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    <span>Validating OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code &amp; Continue</span>
                    <i className="bi bi-check-lg ms-2"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {step === 3 && (
          <form className="urja-admin-pwd-body" onSubmit={handleCommitPassword}>
            <div className="urja-admin-pwd-info-banner">
              <i className="bi bi-lock-fill"></i>
              <span>
                Identity verified! Create a strong, enterprise-grade password for <strong>{accountRole}</strong> ({email}).
              </span>
            </div>

            {/* New Password Field */}
            <div className="urja-form-group">
              <label className="urja-form-label">
                New Password <span className="text-danger">*</span>
              </label>
              <div className="urja-input-wrapper">
                <i className="bi bi-key urja-input-icon"></i>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="urja-text-input"
                  placeholder="Enter minimum 12-character strong password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="urja-pass-toggle-btn"
                  onClick={() => setShowNewPass(!showNewPass)}
                  title={showNewPass ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showNewPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>

              {/* Password Strength Meter */}
              <div className="urja-strength-meter-wrap mt-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Password Strength:</span>
                  <span className="small fw-bold" style={{ fontSize: '0.75rem', color: strength.color }}>{strength.label}</span>
                </div>
                <div className="urja-strength-track">
                  <div className="urja-strength-fill" style={{ width: strength.width, backgroundColor: strength.color }}></div>
                </div>
              </div>

              {/* Real-Time Rule Checklist */}
              <div className="urja-pwd-rules-grid mt-2">
                <div className={`urja-pwd-rule ${hasMinLength ? 'met' : ''}`}>
                  <i className={`bi ${hasMinLength ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                  <span>At least 12 characters</span>
                </div>
                <div className={`urja-pwd-rule ${hasUppercase ? 'met' : ''}`}>
                  <i className={`bi ${hasUppercase ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                  <span>One uppercase letter (A-Z)</span>
                </div>
                <div className={`urja-pwd-rule ${hasLowercase ? 'met' : ''}`}>
                  <i className={`bi ${hasLowercase ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                  <span>One lowercase letter (a-z)</span>
                </div>
                <div className={`urja-pwd-rule ${hasDigit ? 'met' : ''}`}>
                  <i className={`bi ${hasDigit ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                  <span>One numeric digit (0-9)</span>
                </div>
                <div className={`urja-pwd-rule ${hasSpecial ? 'met' : ''}`}>
                  <i className={`bi ${hasSpecial ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                  <span>One special symbol (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="urja-form-group mt-3">
              <label className="urja-form-label">
                Confirm New Password <span className="text-danger">*</span>
              </label>
              <div className="urja-input-wrapper">
                <i className="bi bi-shield-check urja-input-icon"></i>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  className={`urja-text-input ${confirmPassword ? (passwordsMatch ? 'is-valid' : 'is-invalid') : ''}`}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="urja-pass-toggle-btn"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  title={showConfirmPass ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showConfirmPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {confirmPassword && (
                <div className={`small mt-1 d-flex align-items-center gap-1 ${passwordsMatch ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.78rem' }}>
                  <i className={`bi ${passwordsMatch ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
                  <span>{passwordsMatch ? 'Passwords match perfectly' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            <div className="urja-admin-pwd-footer mt-4">
              <button type="button" className="urja-btn-ghost" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
              <button
                type="submit"
                className="urja-btn-primary"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-lock-fill me-2"></i>
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 4 && (
          <div className="urja-admin-pwd-body text-center py-4">
            <div className="urja-admin-pwd-success-icon mb-3">
              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3.5rem' }}></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Password Successfully Updated!</h4>
            <p className="text-muted small mx-auto" style={{ maxWidth: '420px', lineHeight: '1.6' }}>
              The credentials for <strong>{accountRole}</strong> ({email}) have been updated securely in MySQL with BCrypt salted hashing. All existing password recovery tokens have been invalidated.
            </p>

            <div className="d-flex justify-content-center gap-3 mt-4">
              <button type="button" className="urja-btn-primary px-4" onClick={onClose}>
                <i className="bi bi-check2 me-1"></i>
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

