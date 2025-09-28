import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

function Profile() {
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const ProfileForm = () => {
    const [fullName, setFullName] = useState("Username");
    const [email, setEmail] = useState("username@gmail.com");
    const [profilePic, setProfilePic] = useState("/images/profileicon.webp");
    const fileInputRef = useRef(null);

    const handleSave = () => {
      alert(`Saved: ${fullName}, ${email}`);
    };

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePic(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const triggerFileInput = () => {
      fileInputRef.current.click();
    };

    return (
      <div className="card p-4 mb-4 shadow-sm rounded-3 profile-card">
        <h2 className="h5 mb-3 profile-heading">About You</h2>
        <div className="row align-items-center">
          <div className="col-8">
            <div className="mb-3">
              <label className="form-label profile-form-label">Full Name</label>
              <input
                type="text"
                className="form-control profile-form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label profile-form-label">Email</label>
              <input
                type="email"
                className="form-control profile-form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary profile-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
          <div className="col-4 text-end">
            <div className="profile-avatar-wrapper">
              <img
                src={profilePic}
                alt="Avatar"
                className="rounded-circle profile-avatar"
                style={{ width: 80, height: 80, objectFit: "cover" }}
              />
              <button
                className="edit-avatar-btn"
                onClick={triggerFileInput}
                title="Edit profile picture"
              >
                ✏️
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PlanDetails = () => {
    const planStats = [
      { label: "RSVPs", value: "0 of unlimited" },
      { label: "Events", value: "0 of unlimited" },
      { label: "Email credits", value: "0 of unlimited" },
      { label: "Co-managers", value: "0 of unlimited" },
      { label: "Check-in credits", value: "0 of unlimited" },
    ];

    return (
      <div className="card p-4 mb-4 shadow-sm rounded-3 profile-card">
        <h2 className="h5 mb-3 profile-heading">Current Plan: Free Plan</h2>
        <button className="btn btn-secondary profile-btn-secondary mb-3">VIEW & SWITCH PLANS</button>
        <div className="row">
          {planStats.map((stat, idx) => (
            <div key={idx} className="col-6 col-md-4 mb-2">
              <div className="border p-2 rounded text-center profile-plan-item">
                <strong>{stat.label}</strong>
                <p className="mb-0">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SecurityTab = () => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleChangePassword = () => {
      if (!currentPassword || !newPassword || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
      }
      if (newPassword !== confirmPassword) {
        alert("New passwords do not match!");
        return;
      }
      alert("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    };

    return (
      <div className="card p-4 mb-4 shadow-sm rounded-3 profile-card">
        <h2 className="h5 mb-3 profile-heading">Security</h2>
        <div className="mb-3">
          <label className="form-label profile-form-label">CURRENT PASSWORD</label>
          <input
            type="password"
            className="form-control profile-form-control"
            placeholder="Enter Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label profile-form-label">NEW PASSWORD</label>
          <input
            type="password"
            className="form-control profile-form-control"
            placeholder="Enter New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label profile-form-label">PASSWORD CONFIRMATION</label>
          <input
            type="password"
            className="form-control profile-form-control"
            placeholder="Re-enter New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          className="btn btn-secondary profile-btn-secondary w-100"
          onClick={handleChangePassword}
        >
          Change Password
        </button>
      </div>
    );
  };

  const PackageTab = () => {
    return (
      <div className="card p-4 mb-4 shadow-sm rounded-3 profile-card">
        <h2 className="h5 mb-3 profile-heading">Package</h2>
        
      </div>
    );
 }

  return (
    <>

      <div className="eventa-header-bar">
        <div className="eventa-header-logo">
          <img
            src="/images/logo.png"
            alt="Eventa Logo"
            className="eventa-logo-img"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
          />
        </div>
        <button
          className="eventa-back-btn"
          onClick={handleBack}
        >
          &#8592; Back
        </button>
      </div>

      <main className="profile-page account-info-page py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow-sm rounded-4 mb-4 profile-card">
                <div className="card-body">
                  {/* Navigation Tabs */}
                  <ul className="nav nav-tabs mb-4 profile-nav-tabs" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link profile-tab-link ${activeTab === "profile" ? "active" : ""}`}
                        onClick={() => setActiveTab("profile")}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "profile"}
                      >
                        Profile
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link profile-tab-link ${activeTab === "security" ? "active" : ""}`}
                        onClick={() => setActiveTab("security")}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "security"}
                      >
                        Security
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link profile-tab-link ${activeTab === "package" ? "active" : ""}`}
                        onClick={() => setActiveTab("package")}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "package"}
                      >
                        Package
                      </button>
                    </li>
                  </ul>

                  {activeTab === "profile" && (
                    <>
                      <ProfileForm />
                      <PlanDetails />
                    </>
                  )}

                  {activeTab === "security" && <SecurityTab />}
                  {activeTab === "package" && <PackageTab />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default Profile;
