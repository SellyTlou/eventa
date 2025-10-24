import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./UpgradePackage.css";
import "../../alert.css";
import "../../App.css";
import { logOut } from "../components";

const UpgradePackage = () => {
    const [packages, setPackages] = useState([]);
    const [currentPackage, setCurrentPackage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const storedUser = localStorage.getItem("user");
                if (!storedUser) {
                    navigate("/login");
                    return;
                }
                const user = JSON.parse(storedUser);
                setUser(user);

                await fetchPackages();
                await fetchCurrentPackage(user.user_id);

                const handleClickOutside = (event) => {
                    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
                };
                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);

            } catch (error) {
                console.error("Failed to fetch data:", error);
                printAlert("Failed to load packages. Please try again.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);


    const toggleDropdown = () => setDropdownOpen(prev => !prev);
    const goToProfile = () => {
        navigate("/Profile");
    }
    const goToHome = () => navigate("/eventsDashboard");
    const handleBack = () => { navigate(-1); };

    const fetchPackages = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getAllPackages");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success && Array.isArray(data.packages)) {
                setPackages(data.packages);
            }
        } catch (error) {
            console.error("Failed to fetch packages:", error);
            throw error;
        }
    };

    const fetchCurrentPackage = async (userId) => {
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
                setCurrentPackage(data.userPackage);
            }
        } catch (error) {
            console.error("Failed to fetch current package:", error);
        }
    };

    const handleUpgrade = async (pkg) => {
        if (processing) return;

        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            printAlert("Please log in to upgrade your package.", "error");
            return;
        }

        const user = JSON.parse(storedUser);

        if (currentPackage && currentPackage.package_id === pkg.package_id) {
            printAlert("You are already on this package.", "warning");
            return;
        }

        setSelectedPackage(pkg);
        setProcessing(true);

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "upgradeUserPackage");
            formData.append("user_id", user.user_id);
            formData.append("package_id", pkg.package_id);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                printAlert(`Successfully upgraded to ${pkg.package_type} package!`, "success");
                await fetchCurrentPackage(user.user_id);
                setTimeout(() => {
                    navigate("/profile");
                }, 2000);
            } else {
                printAlert(data.message || "Failed to upgrade package. Please try again.", "error");
            }
        } catch (error) {
            console.error("Upgrade error:", error);
            printAlert("An error occurred during upgrade. Please try again.", "error");
        } finally {
            setProcessing(false);
        }
    };

    const getPackageTier = (packageType) => {
        const tiers = {
            'basic': 1,
            'standard': 2,
            'premium': 3,
            'enterprise': 4
        };
        return tiers[packageType.toLowerCase()] || 0;
    };

    const isCurrentPackage = (pkg) => {
        return currentPackage && currentPackage.package_id === pkg.package_id;
    };

    const canUpgradeTo = (pkg) => {
        if (!currentPackage) return true;
        const currentTier = getPackageTier(currentPackage.package_id);
        const newTier = getPackageTier(pkg.package_type);
        return newTier > currentTier;
    };


    if (loading) {
        return (
            <div className="upgrade-page">
                <div className="loading-container">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="loading-text">Loading packages...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="upgrade-page">
            {/* Alert */}
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
            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    <button onClick={goToHome}>Home</button>

                    <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                        <i className="bi bi-person-circle"></i>
                        <span>{user ? user.name : "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>
                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item" onClick={goToProfile}>Profile</button>
                                <button className="dropdown-item">Settings</button>
                                <button className="dropdown-item" onClick={logOut}>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="container">

                <button className="btn-event btn-event-back" onClick={handleBack}>
                    Back
                </button>
                {/* Header */}
                <div className="upgrade-header">
                    <h1>Upgrade Your Package</h1>
                    <p>Choose the perfect plan for your event management needs</p>
                    {currentPackage && (
                        <div className="current-package-banner">
                            <i className="bi bi-info-circle"></i>
                            Your current package: <strong>{currentPackage.package_id}</strong>
                        </div>
                    )}
                </div>

                {/* Packages Grid */}
                <div className="packages-grid">
                    {packages.map((pkg) => {
                        const isCurrent = isCurrentPackage(pkg);
                        const canUpgrade = canUpgradeTo(pkg);
                        const isPopular = pkg.package_type.toLowerCase() === 'premium';

                        return (
                            <div
                                key={pkg.package_id}
                                className={`package-card ${isCurrent ? 'current' : ''} ${isPopular ? 'popular' : ''}`}
                            >
                                {isPopular && (
                                    <div className="popular-badge">
                                        <i className="bi bi-star-fill"></i>
                                        Most Popular
                                    </div>
                                )}

                                {isCurrent && (
                                    <div className="current-badge">
                                        <i className="bi bi-check-circle"></i>
                                        Current Plan
                                    </div>
                                )}

                                <div className="package-header">
                                    <h3 className="package-name">
                                        {pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1)}
                                    </h3>
                                    <div className="package-price">
                                        ${parseFloat(pkg.price).toFixed(2)}
                                        <span className="price-period">/month</span>
                                    </div>
                                </div>

                                <div className="package-features">
                                    <div className="feature">
                                        <i className="bi bi-check-circle"></i>
                                        <span><strong>{pkg.max_events}</strong> Events</span>
                                    </div>
                                    <div className="feature">
                                        <i className="bi bi-check-circle"></i>
                                        <span><strong>{pkg.max_guests}</strong> Max Guests per Event</span>
                                    </div>
                                    <div className="feature">
                                        <i className="bi bi-check-circle"></i>
                                        <span>Advanced Analytics</span>
                                    </div>
                                    <div className="feature">
                                        <i className="bi bi-check-circle"></i>
                                        <span>Email Support</span>
                                    </div>
                                    {pkg.package_type.toLowerCase() === 'premium' && (
                                        <div className="feature">
                                            <i className="bi bi-check-circle"></i>
                                            <span>Priority Support</span>
                                        </div>
                                    )}
                                    {pkg.package_type.toLowerCase() === 'enterprise' && (
                                        <div className="feature">
                                            <i className="bi bi-check-circle"></i>
                                            <span>Custom Solutions</span>
                                        </div>
                                    )}
                                </div>

                                <div className="package-actions">
                                    {isCurrent ? (
                                        <button className="btn-current" disabled>
                                            <i className="bi bi-check-circle"></i>
                                            Current Plan
                                        </button>
                                    ) : canUpgrade ? (
                                        <button
                                            className="btn-upgrade"
                                            onClick={() => handleUpgrade(pkg)}
                                            disabled={processing}
                                        >
                                            {processing && selectedPackage?.package_id === pkg.package_id ? (
                                                <>
                                                    <div className="spinner-border spinner-border-sm" role="status"></div>
                                                    Upgrading...
                                                </>
                                            ) : (
                                                <>
                                                    Upgrade Now
                                                    <i className="bi bi-arrow-up-circle"></i>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button className="btn-downgrade" disabled>
                                            Not Available
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Comparison Table */}
                <div className="comparison-section">
                    <h2>Package Comparison</h2>
                    <div className="comparison-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    {packages.map(pkg => (
                                        <th key={pkg.package_id}>
                                            {pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Maximum Events</td>
                                    {packages.map(pkg => (
                                        <td key={pkg.package_id}>{pkg.max_events}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>Max Guests per Event</td>
                                    {packages.map(pkg => (
                                        <td key={pkg.package_id}>{pkg.max_guests}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>Advanced Analytics</td>
                                    {packages.map(pkg => (
                                        <td key={pkg.package_id}>
                                            <i className={`bi ${pkg.package_type !== 'basic' ? 'bi-check-circle text-success' : 'bi-x-circle text-muted'}`}></i>
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>Email Support</td>
                                    {packages.map(pkg => (
                                        <td key={pkg.package_id}>
                                            <i className="bi bi-check-circle text-success"></i>
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>Priority Support</td>
                                    {packages.map(pkg => (
                                        <td key={pkg.package_id}>
                                            <i className={`bi ${pkg.package_type === 'premium' || pkg.package_type === 'enterprise' ? 'bi-check-circle text-success' : 'bi-x-circle text-muted'}`}></i>
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>Custom Solutions</td>
                                    {packages.map(pkg => (
                                        <td key={pkg.package_id}>
                                            <i className={`bi ${pkg.package_type === 'enterprise' ? 'bi-check-circle text-success' : 'bi-x-circle text-muted'}`}></i>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="faq-section">
                    <h2>Frequently Asked Questions</h2>
                    <div className="faq-grid">
                        <div className="faq-item">
                            <h4>Can I change my package anytime?</h4>
                            <p>Yes, you can upgrade your package at any time. Downgrades may require contacting support.</p>
                        </div>
                        <div className="faq-item">
                            <h4>What happens to my existing events?</h4>
                            <p>Your existing events remain unchanged when you upgrade. You'll immediately get access to your new package features.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Is there a setup fee?</h4>
                            <p>No, there are no setup fees. You only pay the monthly subscription fee for your chosen package.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Can I get a refund?</h4>
                            <p>We offer a 14-day money-back guarantee for new subscriptions. Contact support for refund requests.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradePackage;