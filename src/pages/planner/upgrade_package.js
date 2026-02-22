import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./UpgradePackage.css";
import "../../alert.css";
import "../../App.css";
import { logOut, LoginNav } from "../components";

const UpgradePackage = () => {
    const [personalPackages, setPersonalPackages] = useState([]);
    const [businessPackages, setBusinessPackages] = useState([]);
    const [currentPackage, setCurrentPackage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const [packageCategory, setPackageCategory] = useState('personal'); // 'personal' or 'business'
    const [userBusinessPackage, setUserBusinessPackage] = useState(null);

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // Helper function to parse features safely
    const parseFeatures = (features) => {
        if (!features) return [];

        if (typeof features === 'string') {
            // Try to parse as JSON first (for business packages)
            try {
                const parsed = JSON.parse(features);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch {
                // If not JSON, treat as comma-separated
                return features.split(',').map(f => f.trim()).filter(f => f.length > 0);
            }
        }

        if (Array.isArray(features)) {
            return features;
        }

        return [];
    };

    // Helper function to safely get package name
    const getPackageName = (pkg) => {
        if (!pkg) return 'Unknown Package';
        
        // For business packages, use the name field
        if (pkg.name) {
            return pkg.name;
        }
        
        // For personal packages, use package_type
        if (pkg.package_type) {
            return pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1);
        }
        
        return 'Unknown Package';
    };

    // Helper function to safely get package price
    const getPackagePrice = (pkg) => {
        if (!pkg || pkg.price === undefined || pkg.price === null) return '0.00';
        return parseFloat(pkg.price).toFixed(2);
    };

    useEffect(() => {
        const fetchData = async () => {
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
                
                // Set package category based on account type
                if (userData.account_type === 'business') {
                    setPackageCategory('business');
                    await fetchBusinessPackages();
                    await fetchCurrentBusinessPackage(userData.user_id);
                } else {
                    setPackageCategory('personal');
                    await fetchPersonalPackages();
                    await fetchCurrentPersonalPackage(userData.user_id);
                }

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

    const fetchPersonalPackages = async () => {
        try {
            const formData = new FormData();
            formData.append("function", "getAllPackages");

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            console.log("Personal Packages API response:", data);

            if (data.success && Array.isArray(data.packages)) {
                const formattedPackages = data.packages.map(pkg => {
                    let features = parseFeatures(pkg.features);

                    // If no features from database, use default ones
                    if (features.length === 0) {
                        features = getDefaultFeatures(pkg.package_type, pkg.max_guests, pkg.max_events);
                    }

                    return {
                        ...pkg,
                        features: features
                    };
                });
                setPersonalPackages(formattedPackages);
            } else {
                console.error("No personal packages found:", data);
                setPersonalPackages([]);
            }
        } catch (error) {
            console.error("Failed to fetch personal packages:", error);
            setPersonalPackages([]);
        }
    };

    const fetchBusinessPackages = async () => {
        try {
            const formData = new FormData();
            formData.append("function", "getBusinessPackages");

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            console.log("Business Packages API response:", data);

            if (data.success && Array.isArray(data.packages)) {
                const formattedPackages = data.packages.map(pkg => {
                    let features = parseFeatures(pkg.features);

                    return {
                        ...pkg,
                        package_type: pkg.package_type || pkg.name?.toLowerCase().replace(' plan', ''),
                        features: features
                    };
                });
                setBusinessPackages(formattedPackages);
            } else {
                console.error("No business packages found:", data);
                setBusinessPackages([]);
            }
        } catch (error) {
            console.error("Failed to fetch business packages:", error);
            setBusinessPackages([]);
        }
    };

    const fetchCurrentPersonalPackage = async (userId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getUserPackage");
            formData.append("user_id", userId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
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

    const fetchCurrentBusinessPackage = async (userId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getUserBusinessPackage");
            formData.append("user_id", userId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success && data.userBusinessPackage) {
                setUserBusinessPackage(data.userBusinessPackage);
            }
        } catch (error) {
            console.error("Failed to fetch current business package:", error);
        }
    };

    // Fallback function for features
    const getDefaultFeatures = (packageType, maxGuests, maxEvents) => {
        const featuresMap = {
            'free': [
                `${maxEvents} events`,
                `Up to ${maxGuests} guests`,
                "RSVP tracking",
                "Email invitations",
                "Basic templates",
                "Guest list management"
            ],
            'basic': [
                `${maxEvents} events`,
                `Up to ${maxGuests} guests`,
                "RSVP tracking",
                "Email invitations",
                "Custom templates",
                "Guest management",
                "Email support"
            ],
            'premium': [
                `${maxEvents} events`,
                `Up to ${maxGuests} guests`,
                "All Basic features",
                "Custom invitations",
                "Guest updates",
                "Guest insights",
                "Event chat",
                "Email support",
                "Seating charts",
                "Priority support"
            ],
            'enterprise': [
                `${maxEvents} events`,
                `Up to ${maxGuests} guests`,
                "All Premium features",
                "Advanced analytics",
                "Custom branding",
                "Team collaboration",
                "API access",
                "Dedicated account manager",
                "White-label solutions"
            ]
        };

        const packageTypeLower = (packageType || '').toLowerCase();
        return featuresMap[packageTypeLower] || ["Event management features"];
    };

    const toggleDropdown = () => setDropdownOpen(prev => !prev);
    
    const goToProfile = () => {
        navigate("/Profile");
    };
    
    const handleBack = () => { 
        navigate(-1); 
    };

    const handleChoosePackage = (pkg) => {
        if (processing) return;

        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            printAlert("Please log in to choose a package.", "error");
            return;
        }

        const user = JSON.parse(storedUser);

        // Check if already on this package
        if (packageCategory === 'personal') {
            if (currentPackage && currentPackage.package_id === pkg.package_id) {
                printAlert("You are already on this package.", "warning");
                return;
            }
        } else {
            if (userBusinessPackage && userBusinessPackage.business_package_id === pkg.id) {
                printAlert("You are already on this business package.", "warning");
                return;
            }
        }

        setProcessing(true);
        setSelectedPackage(pkg);

        try {
            // Store package info in localStorage
            if (packageCategory === 'personal') {
                localStorage.setItem("selectedPackageId", pkg.package_id);
                localStorage.setItem("selectedPackageType", "personal");
                localStorage.setItem("selectedPackage", JSON.stringify(pkg));
                
                printAlert(`Selected ${getPackageName(pkg)} package. Redirecting to payment...`, "success");

                setTimeout(() => {
                    navigate("/packagePayment");
                }, 100);
            } else {
                localStorage.setItem("selectedPackageId", pkg.id);
                localStorage.setItem("selectedPackageType", "business");
                localStorage.setItem("selectedBusinessPackage", JSON.stringify(pkg));
                
                printAlert(`Selected ${pkg.name} business package. Redirecting to payment...`, "success");

                setTimeout(() => {
                    navigate("/business-package-payment");
                }, 100);
            }

        } catch (error) {
            console.error("Package selection error:", error);
            printAlert("An error occurred. Please try again.", "error");
            setProcessing(false);
        }
    };

    const getPackageTier = (packageType) => {
        const tiers = {
            'free': 1,
            'basic': 2,
            'standard': 3,
            'premium': 4,
            'enterprise': 5,
            'starter': 2,
            'intermediate': 3,
            'advance': 4,
            'advance_plus': 5
        };
        return tiers[(packageType || '').toLowerCase()] || 0;
    };

    const isCurrentPackage = (pkg) => {
        if (packageCategory === 'personal') {
            return currentPackage && pkg && currentPackage.package_id === pkg.package_id;
        } else {
            return userBusinessPackage && pkg && userBusinessPackage.business_package_id === pkg.id;
        }
    };

    const canUpgradeTo = (pkg) => {
        if (packageCategory === 'personal') {
            if (!currentPackage || !pkg) return true;
            const currentTier = getPackageTier(currentPackage.package_type);
            const newTier = getPackageTier(pkg.package_type);
            return newTier > currentTier;
        } else {
            if (!userBusinessPackage || !pkg) return true;
            const currentTier = getPackageTier(userBusinessPackage.package_type);
            const newTier = getPackageTier(pkg.package_type || pkg.name);
            return newTier > currentTier;
        }
    };

    // Check if package has specific feature
    const hasFeature = (pkg, feature) => {
        if (!pkg || !pkg.features) return false;
        const features = parseFeatures(pkg.features);
        return features.includes(feature);
    };

    // Get the appropriate packages based on category
    const displayedPackages = packageCategory === 'personal' ? personalPackages : businessPackages;
    
    // Get current package display name
    const getCurrentPackageDisplay = () => {
        if (packageCategory === 'personal' && currentPackage) {
            return getPackageName(currentPackage);
        } else if (packageCategory === 'business' && userBusinessPackage) {
            return userBusinessPackage.name || 'Business Package';
        }
        return null;
    };

    if (loading) {
        return (
            <>
                <LoginNav />
                <div className="upgrade-page">
                    <div className="loading-container">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="loading-text">Loading packages...</div>
                    </div>
                </div>
            </>
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
            
            <LoginNav/>
            
            <div className="container">
                <button className="btn-event btn-event-back" onClick={handleBack}>
                    <i className="bi bi-arrow-left"></i> Back
                </button>
                
                {/* Header */}
                <div className="upgrade-header">
                    <h1>
                        {packageCategory === 'business' ? 'Choose Your Business Package' : 'Choose Your Package'}
                    </h1>
                    <p className="lead">
                        {packageCategory === 'business' 
                            ? 'Select the perfect business plan for your company\'s event management needs'
                            : 'Select the perfect plan for your event management needs'
                        }
                    </p>
                    
                    {/* Account Type Badge */}
                    <div className="account-type-badge">
                        <i className={`bi ${packageCategory === 'business' ? 'bi-building' : 'bi-person'}`}></i>
                        <span>
                            {packageCategory === 'business' 
                                ? `Business Account: ${user?.business_name || user?.name}`
                                : `Personal Account: ${user?.name} ${user?.lastname || ''}`
                            }
                        </span>
                    </div>
                    
                    {/* Current Package Banner */}
                    {getCurrentPackageDisplay() && (
                        <div className="current-package-banner">
                            <i className="bi bi-info-circle"></i>
                            Your current package: <strong>{getCurrentPackageDisplay()}</strong>
                        </div>
                    )}
                </div>

                {/* Packages Grid */}
                <div className="packages-grid">
                    {displayedPackages.length > 0 ? (
                        displayedPackages.map((pkg) => {
                            const isCurrent = isCurrentPackage(pkg);
                            const isPopular = (pkg.package_type && pkg.package_type.toLowerCase() === 'premium') || 
                                             (pkg.name && pkg.name.toLowerCase().includes('advance'));

                            return (
                                <div
                                    key={pkg.package_id || pkg.id}
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
                                            {getPackageName(pkg)}
                                        </h3>
                                        <div className="package-price">
                                            {pkg.price > 0 ? (
                                                <>
                                                    R{getPackagePrice(pkg)}
                                                    <span className="price-period">/month</span>
                                                </>
                                            ) : (
                                                <span className="price-free">Free</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="package-limits">
                                        <div className="limit-item">
                                            <i className="bi bi-people"></i>
                                            <span><strong>{pkg.max_guests || 0}</strong> Max Guests</span>
                                        </div>
                                        <div className="limit-item">
                                            <i className="bi bi-calendar-event"></i>
                                            <span><strong>{pkg.max_events || 0}</strong> Events</span>
                                        </div>
                                    </div>

                                    <div className="package-features">
                                        <h4>Features:</h4>
                                        {parseFeatures(pkg.features).map((feature, index) => (
                                            <div key={index} className="feature">
                                                <i className="bi bi-check-circle-fill"></i>
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="package-actions">
                                        {isCurrent ? (
                                            <button className="btn-current" disabled>
                                                <i className="bi bi-check-circle"></i>
                                                Current Plan
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-upgrade"
                                                onClick={() => handleChoosePackage(pkg)}
                                                disabled={processing}
                                            >
                                                {processing && selectedPackage?.package_id === pkg.package_id ? (
                                                    <>
                                                        <div className="spinner-border spinner-border-sm" role="status"></div>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        {packageCategory === 'business' ? 'Select Business Plan' : 'Choose Plan'}
                                                        <i className="bi bi-arrow-right-circle"></i>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-packages">
                            <i className="bi bi-exclamation-triangle"></i>
                            <h3>No packages available</h3>
                            <p>
                                {packageCategory === 'business' 
                                    ? 'No business packages are currently available. Please try again later or contact support.'
                                    : 'No personal packages are currently available. Please try again later or contact support.'
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Comparison Table - Only show if we have packages */}
                {displayedPackages.length > 0 && (
                    <div className="comparison-section">
                        <h2>Package Comparison</h2>
                        <div className="comparison-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        {displayedPackages.map(pkg => (
                                            <th key={pkg.package_id || pkg.id}>
                                                {getPackageName(pkg)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Maximum Events</td>
                                        {displayedPackages.map(pkg => (
                                            <td key={pkg.package_id || pkg.id}>{pkg.max_events || 0}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td>Max Guests per Event</td>
                                        {displayedPackages.map(pkg => (
                                            <td key={pkg.package_id || pkg.id}>{pkg.max_guests || 0}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td>Monthly Price</td>
                                        {displayedPackages.map(pkg => (
                                            <td key={pkg.package_id || pkg.id}>
                                                {pkg.price > 0 ? `R${getPackagePrice(pkg)}` : 'Free'}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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
                        {packageCategory === 'business' && (
                            <div className="faq-item">
                                <h4>Can I have multiple team members?</h4>
                                <p>Business packages include team collaboration features. The number of team members depends on your selected plan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradePackage;