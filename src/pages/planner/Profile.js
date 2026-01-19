import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import '../../alert.css';
import { logOut, LoginNav } from "../components";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [userPackage, setUserPackage] = useState(null);
  const [packageDetails, setPackageDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  const printAlert = (message, type = "info") => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "" });
    }, 5000);
  };

  const navigate = useNavigate();
  const dropdownRef = useRef(null);


  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    return regex.test(password);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          logOut();
          navigate("/");
          return;
        }

        const userData = JSON.parse(storedUser);
        setUser(userData);
        setEditForm({
          name: userData.name || "",
          lastname: userData.lastname || "",
          email: userData.email || "",
        });

        await fetchUserEvents(userData.user_id);
        await fetchUserPackage(userData.user_id);

        const handleClickOutside = (event) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);

      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);


  const toggleDropdown = () => setDropdownOpen(prev => !prev);
  const goToProfile = () => {
    navigate("/Profile");
  }
  const handleBack = () => { navigate(-1); };
  const goToUpgradePackage = () => {
    navigate("/upgrade_package");
  }

  const fetchUserEvents = async (userId) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      const formData = new FormData();
      formData.append("function", "getUserEvents");
      formData.append("userID", userId);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events.slice(0, 6));
      }
    } catch (error) {
      console.error("Failed to fetch user events:", error);
    }
  };

  const fetchUserPackage = async (userId) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      const formData = new FormData();
      formData.append("function", "getUserPackage");
      formData.append("user_id", userId);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.success && data.userPackage) {
        setUserPackage(data.userPackage);
        await fetchPackageDetails(data.userPackage.package_id, data.userPackage);
      }
    } catch (error) {
      console.error("Failed to fetch user package:", error);
    }
  };

  const fetchPackageDetails = async (packageId, userPackageData) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      const formData = new FormData();
      formData.append("function", "getPackageById");
      formData.append("package_id", packageId);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();

      if (data.success && data.package) {
        setPackageDetails(data.package);
      }
    } catch (err) {
      console.error("Error fetching package details:", err);
    }
  };

  const sendVerificationEmail = async (email, name) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      const formDataToSend = new FormData();
      formDataToSend.append("email", email);
      formDataToSend.append("name", name);
      formDataToSend.append("API_URL", API_URL);

      const response = await fetch(`${API_URL}/send_verification.php`, {
        method: "POST",
        body: formDataToSend
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error sending verification email:", error);
      return { success: false, message: "Failed to send verification email" };
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError("");

      const API_URL = process.env.REACT_APP_API_URL;
      const formData = new FormData();
      formData.append("function", "updateUserProfile");
      formData.append("user_id", user.user_id);
      formData.append("name", editForm.name);
      formData.append("lastname", editForm.lastname);
      formData.append("email", editForm.email);

      const emailChanged = user.email !== editForm.email;
      if (emailChanged) {
        formData.append("verified", "0");
      }

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        const updatedUser = {
          ...user,
          name: editForm.name,
          lastname: editForm.lastname,
          email: editForm.email,
          verified: emailChanged ? 0 : user.verified
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        if (emailChanged) {
          const emailResult = await sendVerificationEmail(editForm.email, editForm.name);
          if (emailResult.success) {
            printAlert("Profile updated successfully! Verification email sent to your new email address.", "success");
          } else {
            printAlert("Profile updated! Failed to send verification email. Please contact support.", "warning");
          }
        } else {
          printAlert("Profile updated successfully!", "success");
        }

        setIsEditing(false);
        setEmailChanged(false);
      } else {
        setError(data.message || "Failed to update profile. Please try again.");
        printAlert(data.message || "Failed to update profile.", "error");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      setError("An error occurred while updating profile.");
      printAlert("An error occurred while updating profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      printAlert("New passwords do not match.", "error");
      return;
    }

    if (!validatePassword(passwordForm.newPassword)) {
      printAlert("Password must contain at least 6 characters, including uppercase, lowercase, number and special character.", "error");
      return;
    }

    try {
      setChangingPassword(true);
      const API_URL = process.env.REACT_APP_API_URL;
      const formData = new FormData();
      formData.append("function", "changePassword");
      formData.append("user_id", user.user_id);
      formData.append("current_password", passwordForm.currentPassword);
      formData.append("new_password", passwordForm.newPassword);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        printAlert("Password changed successfully!", "success");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setShowPasswords({
          current: false,
          new: false,
          confirm: false
        });
      } else {
        printAlert(data.message || "Failed to change password.", "error");
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      printAlert("An error occurred while changing password.", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEventClick = (eventId) => {
    localStorage.setItem("selectedEventId", eventId);
    navigate("/eventManagement");
  };

  const handleViewAllEvents = () => {
    navigate("/eventsDashboard");
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (error) {
      setError("");
    }

    if (field === "email" && user && value !== user.email) {
      setEmailChanged(true);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResendVerification = async () => {
    try {
      const result = await sendVerificationEmail(user.email, user.name);
      if (result.success) {
        printAlert("Verification email sent successfully! Please check your inbox.", "success");
      } else {
        printAlert("Failed to send verification email. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error resending verification:", error);
      printAlert("An error occurred while sending verification email.", "error");
    }
  };

  const getRemainingEvents = () => {
    if (!userPackage) return 0;
    return parseInt(userPackage.event_limit) - parseInt(userPackage.event_used);
  };

  const getUsagePercentage = () => {
    if (!userPackage || !userPackage.event_limit || userPackage.event_limit === 0) return 0;
    return (parseInt(userPackage.event_used) / parseInt(userPackage.event_limit)) * 100;
  };

  if (loading) {
    return (
      <>
        <div className="loading-container">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="loading-text">Loading your profile...</div>
        </div>
      </>
    );
  }

  return (
    <>

      {/* Custom Alert Popup */}
      {alert.show && (
        <div className={`custom-alert ${alert.type}`}>
          <div className="alert-content">
            <span className="alert-message">{alert.message}</span>
            <button
              className="alert-close"
              onClick={() => setAlert({ show: false, message: "", type: "" })}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER 
      <div className="dashboard-header">
        <h1>Evenda</h1>
        <div className="header-tabs">
          <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
            <i className="bi bi-person-circle"></i>
            <span>{user?.name || "Guest"}</span>
            <i className="bi bi-chevron-bar-down"></i>
            {dropdownOpen && (
              <div className="dropdown-menu show">
                <button className="dropdown-item" onClick={goToProfile}><i className="bi bi-person"></i>Profile</button>
                <button className="dropdown-item"><i className="bi bi-gear"></i>Settings</button>
                <button className="dropdown-item" onClick={logOut}><i className="bi bi-box-arrow-right"></i>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>*/}
<LoginNav />
      <section className="profilePage">
        <div className="container">
          <button className="btn-event btn-event-back" onClick={handleBack}>
            Back
          </button>

          <div className="profile-layout">
            {/* Sidebar */}
            <div className="profile-sidebar">
              <div className="user-card">
                <div className="user-avatar">
                  {user?.name?.charAt(0)}{user?.lastname?.charAt(0)}
                </div>
                <div className="user-info">
                  <h3>{user?.name} {user?.lastname}</h3>
                  <p>{user?.email}</p>
                  {user?.verified === 0 && (
                    <div className="verification-badge unverified">
                      <i className="bi bi-exclamation-triangle"></i>
                      Email Not Verified
                    </div>
                  )}
                  {user?.verified === 1 && (
                    <div className="verification-badge verified">
                      <i className="bi bi-check-circle"></i>
                      Email Verified
                    </div>
                  )}
                  <div className="user-stats">
                    <div className="stat">
                      <strong>{events.length}</strong>
                      <span>Events</span>
                    </div>
                    <div className="stat">
                      <strong>{getRemainingEvents()}</strong>
                      <span>Remaining</span>
                    </div>
                  </div>
                </div>
              </div>

              <nav className="profile-nav">
                <button
                  className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
                  onClick={() => setActiveTab("profile")}
                >
                  <i className="bi bi-person"></i>
                  Profile Information
                </button>
                <button
                  className={`nav-item ${activeTab === "events" ? "active" : ""}`}
                  onClick={() => setActiveTab("events")}
                >
                  <i className="bi bi-calendar-event"></i>
                  My Events
                </button>
                <button
                  className={`nav-item ${activeTab === "package" ? "active" : ""}`}
                  onClick={() => setActiveTab("package")}
                >
                  <i className="bi bi-box-seam"></i>
                  My Package
                </button>
                <button
                  className={`nav-item ${activeTab === "security" ? "active" : ""}`}
                  onClick={() => setActiveTab("security")}
                >
                  <i className="bi bi-shield-lock"></i>
                  Security
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="profile-content">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>Profile Information</h2>
                    {!isEditing ? (
                      <button
                        className="edit-btn"
                        onClick={() => setIsEditing(true)}
                      >
                        <i className="bi bi-pencil"></i>
                        Edit Profile
                      </button>
                    ) : (
                      <div className="edit-actions">
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setIsEditing(false);
                            setEditForm({
                              name: user.name,
                              lastname: user.lastname,
                              email: user.email,
                            });
                            setEmailChanged(false);
                            setError("");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="save-btn"
                          onClick={handleSaveProfile}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>



                  {emailChanged && isEditing && (
                    <div className="email-change-warning">
                      <i className="bi bi-info-circle"></i>
                      You've changed your email address. You'll need to verify your new email.
                    </div>
                  )}

                  <div className="profile-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            className="form-input"
                          />
                        ) : (
                          <div className="form-value">{user.name}</div>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Last Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.lastname}
                            onChange={(e) => handleInputChange("lastname", e.target.value)}
                            className="form-input"
                          />
                        ) : (
                          <div className="form-value">{user.lastname}</div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="form-input"
                        />
                      ) : (
                        <div className="form-value">{user.email}</div>
                      )}
                    </div>

                    {/* Only show verification notice if email is NOT verified */}
                    {!isEditing && user.verified === 0 && (
                      <div className="verification-notice">
                        <i className="bi bi-envelope"></i>
                        Your email is not verified. Please check your inbox for the verification email.
                        <button
                          className="resend-verification-btn"
                          onClick={handleResendVerification}
                        >
                          Resend Verification Email
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Events Tab */}
              {activeTab === "events" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>My Events</h2>
                    <button
                      className="view-all-btn"
                      onClick={handleViewAllEvents}
                    >
                      View All Events
                    </button>
                  </div>

                  {events.length > 0 ? (
                    <div className="events-grid">
                      {events.map((event) => (
                        <div
                          key={event.event_id}
                          className="event-card"
                          onClick={() => handleEventClick(event.event_id)}
                        >
                          <div className="event-image">
                            {event.event_image ? (
                              <img src={event.event_image} alt={event.event_name} />
                            ) : (
                              <div className="event-image-placeholder">
                                <i className="bi bi-calendar-event"></i>
                              </div>
                            )}
                          </div>
                          <div className="event-info">
                            <h4>{event.event_name}</h4>
                            <p className="event-date">
                              <i className="bi bi-calendar"></i>
                              {new Date(event.event_start_date).toLocaleDateString()}
                            </p>
                            <div className={`event-status ${event.is_published ? 'published' : 'draft'}`}>
                              {event.is_published ? 'Published' : 'Draft'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="bi bi-calendar-x"></i>
                      <h3>No Events Yet</h3>
                      <p>You haven't created any events yet.</p>
                      <button
                        className="create-event-btn"
                        onClick={() => navigate("/activeEventDetails")}
                      >
                        Create Your First Event
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Package Tab */}
              {activeTab === "package" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>My Package</h2>
                    <button className="upgrade-btn" onClick={goToUpgradePackage}>
                      Upgrade Package
                    </button>
                  </div>

                  {userPackage ? (
                    <div className="package-card">
                      <div className="package-header">
                        <h3>{packageDetails ?
                          packageDetails.package_type.charAt(0).toUpperCase() + packageDetails.package_type.slice(1)
                          : userPackage.package_id}
                        </h3>
                        <div className="package-badge active">Active</div>
                      </div>

                      <div className="package-features">
                        <div className="feature">
                          <i className="bi bi-check-circle"></i>
                          <span>Maximum Events: {userPackage.event_limit}</span>
                        </div>
                        <div className="feature">
                          <i className="bi bi-check-circle"></i>
                          <span>Events Used: {userPackage.event_used}</span>
                        </div>
                        <div className="feature">
                          <i className="bi bi-check-circle"></i>
                          <span>Events Remaining: {getRemainingEvents()}</span>
                        </div>
                        <div className="feature">
                          <i className="bi bi-check-circle"></i>
                          <span>Package Since: {new Date(userPackage.created_at).toLocaleDateString()}</span>
                        </div>
                        {packageDetails && packageDetails.price && (
                          <div className="feature">
                            <i className="bi bi-check-circle"></i>
                            <span>Price: ${parseFloat(packageDetails.price).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="package-usage">
                        <div className="usage-bar">
                          <div
                            className="usage-progress"
                            style={{
                              width: `${getUsagePercentage()}%`
                            }}
                          ></div>
                        </div>
                        <div className="usage-text">
                          {userPackage.event_used} of {userPackage.event_limit} events used
                          ({getRemainingEvents()} remaining)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="bi bi-box-seam"></i>
                      <h3>No Package Found</h3>
                      <p>You don't have an active package yet.</p>
                      <button className="create-event-btn"  onClick={goToUpgradePackage}>
                        Choose a Package
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>Security Settings</h2>
                  </div>

                  <div className="security-section">
                    <h3>Change Password</h3>
                    <p>Update your password to keep your account secure.</p>

                    <div className="password-form">
                      <div className="form-group password-input-group">
                        <label>Current Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordForm.currentPassword}
                            onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                            className="form-input"
                            placeholder="Enter your current password"
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => togglePasswordVisibility("current")}
                          >
                            <i className={`bi ${showPasswords.current ? "bi-eye-slash" : "bi-eye"}`}></i>
                          </button>
                        </div>
                      </div>

                      <div className="form-group password-input-group">
                        <label>New Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                            className="form-input"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => togglePasswordVisibility("new")}
                          >
                            <i className={`bi ${showPasswords.new ? "bi-eye-slash" : "bi-eye"}`}></i>
                          </button>
                        </div>
                      </div>

                      <div className="form-group password-input-group">
                        <label>Confirm New Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                            className="form-input"
                            placeholder="Confirm your new password"
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => togglePasswordVisibility("confirm")}
                          >
                            <i className={`bi ${showPasswords.confirm ? "bi-eye-slash" : "bi-eye"}`}></i>
                          </button>
                        </div>
                      </div>

                      <button
                        className="change-password-btn"
                        onClick={handleChangePassword}
                        disabled={changingPassword}
                      >
                        {changingPassword ? "Changing Password..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Profile;