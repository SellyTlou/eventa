import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../planner/UpgradePackage.css";
import "../../alert.css";
import "../../App.css";
import { logOut, LoginNav } from "../components";
import { isCustomPackage } from "../utils/customPackageUtils";

const UpgradeBusinessPackage = () => {
    const [packages, setPackages] = useState([]);
    const [currentPackage, setCurrentPackage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const [allFeatures, setAllFeatures] = useState([]);

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // Helper function to parse features safely
    const parseFeatures = (features) => {
        if (!features) return [];

        if (typeof features === 'string') {
            return features.split(',').map(f => f.trim()).filter(f => f.length > 0);
        }

        if (Array.isArray(features)) {
            return features;
        }

        return [];
    };

    // Helper function to safely get package name
    const getPackageName = (pkg) => {
        if (!pkg || !pkg.name) return 'Unknown Package';
        return pkg.name;
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
                const user = JSON.parse(storedUser);
                
                // Verify business user
                if (user.account_type !== 'business') {
                    printAlert("This page is for business accounts only.", "error");
                    navigate("/upgrade_package");
                    return;
                }
                
                setUser(user);

                await fetchBusinessPackages();
                await fetchCurrentBusinessPackage(user.user_id);

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

    // Extract all unique features for comparison table
    useEffect(() => {
        if (packages.length > 0) {
            const featuresSet = new Set();
            packages.forEach(pkg => {
                const features = Array.isArray(pkg.features) ? pkg.features : [];
                features.forEach(feature => {
                    if (feature && typeof feature === 'string') {
                        featuresSet.add(feature.trim());
                    }
                });
            });
            setAllFeatures(Array.from(featuresSet));
        }
    }, [packages]);

    const toggleDropdown = () => setDropdownOpen(prev => !prev);
    const goToProfile = () => {
        navigate("/Profile");
    }
    const handleBack = () => { navigate(-1); };

    const fetchBusinessPackages = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getBusinessPackages");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            console.log("Business Packages API response:", data); // Debug log

            if (data.success && Array.isArray(data.packages)) {
                const formattedPackages = data.packages.map(pkg => {
                    // Parse features safely - handle both string and array formats
                    let features = [];

                    if (pkg.features) {
                        if (typeof pkg.features === 'string') {
                            features = pkg.features.split(',').map(f => f.trim()).filter(f => f.length > 0);
                        } else if (Array.isArray(pkg.features)) {
                            features = pkg.features.filter(f => f && typeof f === 'string');
                        }
                    }

                    // If no features from database, use default ones
                    if (features.length === 0) {
                        features = getDefaultFeatures(pkg.name, pkg.max_guests);
                    }

                    return {
                        ...pkg,
                        features: features
                    };
                });
                setPackages(formattedPackages);
            } else {
                console.error("No packages found or invalid response:", data);
                setPackages([]);
            }
        } catch (error) {
            console.error("Failed to fetch business packages:", error);
            setPackages([]);
        }
    };

    // Fallback function for features
    const getDefaultFeatures = (packageName, maxGuests) => {
        const featuresMap = {
            'starter plan': [
                `Up to ${maxGuests} guests`,
                "Event management tools",
                "RSVP tracking",
                "Create and send invitations",
                "Free support"
            ],
            'intermediate plan': [
                `Up to ${maxGuests} guests`,
                "Event management tools",
                "RSVP tracking",
                "Event Check-In",
                "Custom branding options",
                "Priority support"
            ],
            'advance plan': [
                `Up to ${maxGuests} guests`,
                "Event management tools",
                "RSVP tracking",
                "Dedicated account manager",
                "Custom integrations",
                "Team collaboration tools",
                "Event Check-In"
            ],
            'custom plan': [
                "Manage large-scale events",
                "Your brand, ad-free",
                "Custom data fields",
                "Custom fonts",
                "Email whitelabeling",
                "Self check-in kiosk",
                "Single sign-on (SSO)",
                "Priority support",
                "Dedicated Account Manager"
            ]
        };

        const packageNameLower = (packageName || '').toLowerCase();
        return featuresMap[packageNameLower] || ["Event management features"];
    };

    const fetchCurrentBusinessPackage = async (userId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getUserBusinessPackage");
            formData.append("user_id", userId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success && data.userBusinessPackage) {
                setCurrentPackage(data.userBusinessPackage);
            }
        } catch (error) {
            console.error("Failed to fetch current business package:", error);
        }
    };

    const handleChoosePackage = (pkg) => {
        // If somehow this handler is called for custom plan, redirect to request page instead
        if (isCustomPackage(pkg)) {
            navigate('/custom-plan-request');
            return;
        }

        if (processing) return;

        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            printAlert("Please log in to choose a package.", "error");
            return;
        }

        const user = JSON.parse(storedUser);

        if (currentPackage && currentPackage.business_package_id === pkg.package_id) {
            printAlert("You are already on this package.", "warning");
            return;
        }

        setProcessing(true);
        setSelectedPackage(pkg);

        try {
             localStorage.setItem("selectedPackageId", pkg.package_id);
                localStorage.setItem("selectedPackageType", "business");
                localStorage.setItem("selectedBusinessPackage", JSON.stringify(pkg));
                
                printAlert(`Selected ${pkg.name} business package. Redirecting to payment...`, "success");

                setTimeout(() => {
                    navigate("/business-package-payment");
                }, 100);

        } catch (error) {
            console.error("Package selection error:", error);
            printAlert("An error occurred. Please try again.", "error");
            setProcessing(false);
        }
    };

    const getPackageTier = (packageName) => {
        const tiers = {
            'starter plan': 1,
            'intermediate plan': 2,
            'advance plan': 3,
            'custom plan': 4
        };
        return tiers[(packageName || '').toLowerCase()] || 0;
    };

    const isCurrentPackage = (pkg) => {
        return currentPackage && pkg && currentPackage.business_package_id === pkg.package_id;
    };

    const canUpgradeTo = (pkg) => {
        if (!currentPackage || !pkg) return true;
        const currentTier = getPackageTier(currentPackage.name);
        const newTier = getPackageTier(pkg.name);
        return newTier > currentTier;
    };

    // Check if package has specific feature
    const hasFeature = (pkg, feature) => {
        if (!pkg || !pkg.features || !Array.isArray(pkg.features)) return false;
        return pkg.features.includes(feature);
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
            <LoginNav/>
            <div className="container">

                <button className="btn-event btn-event-back" onClick={handleBack}>
                    Back
                </button>
                {/* Header */}
                <div className="upgrade-header">
                    <h1>Choose Your Business Package</h1>
                    <p>Select the perfect plan for your business event management needs</p>
                    {currentPackage && (
                        <div className="current-package-banner">
                            <i className="bi bi-info-circle"></i>
                            Your current package: <strong>{getPackageName(currentPackage)}</strong>
                        </div>
                    )}
                </div>

                {/* Packages Grid */}
                <div className="packages-grid">
                    {packages.length > 0 ? (
                        packages.map((pkg) => {
                            const isCurrent = isCurrentPackage(pkg);
                            const isPopular = pkg.name && pkg.name.toLowerCase() === 'advance plan';
                            const isCustom = isCustomPackage(pkg);

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
                                            {getPackageName(pkg)}
                                        </h3>
                                        {/* hide price entirely for custom packages */}
                                        {!isCustom && (
                                            <div className="package-price">
                                                {pkg.price === 0 ? 'Custom Quote' : `R${getPackagePrice(pkg)}`}
                                                <span className="price-period"></span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="package-features">
                                        {/* do not show guest/limit row for custom plans */}
                                        {!isCustom && (
                                            <div className="feature">
                                                <i className="bi bi-check-circle"></i>
                                                <span><strong>{pkg.max_guests || 0}</strong> Max Guests</span>
                                            </div>
                                        )}
                                        {pkg.features && Array.isArray(pkg.features) && pkg.features.map((feature, index) => (
                                            <div key={index} className="feature">
                                                <i className="bi bi-check-circle"></i>
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
                                            /* custom cards go to request page instead of payment */
                                            isCustom ? (
                                                <button
                                                    className="btn-upgrade"
                                                    onClick={() => navigate('/custom-plan-request')}
                                                    disabled={processing}
                                                >
                                                    Request Custom Plan
                                                    <i className="bi bi-arrow-right-circle"></i>
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn-upgrade"
                                                    onClick={() => handleChoosePackage(pkg)}
                                                    disabled={processing}
                                                >
                                                    {processing && selectedPackage?.id === pkg.package_id ? (
                                                        <>
                                                            <div className="spinner-border spinner-border-sm" role="status"></div>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Choose Plan
                                                            <i className="bi bi-arrow-right-circle"></i>
                                                        </>
                                                    )}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-packages">
                            <i className="bi bi-exclamation-triangle"></i>
                            <h3>No packages available</h3>
                            <p>Please try again later or contact support.</p>
                        </div>
                    )}
                </div>

                {/* Comparison Table - Only show if we have packages */}
                {packages.length > 0 && allFeatures.length > 0 && (
                    <div className="comparison-section">
                        <h2>Package Comparison</h2>
                        <div className="comparison-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        {packages.map(pkg => (
                                            <th key={pkg.package_id}>
                                                {getPackageName(pkg)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Max Guests per Event</td>
                                        {packages.map(pkg => (
                                            <td key={pkg.package_id}>{isCustomPackage(pkg) ? '' : pkg.max_guests || 0}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td>Monthly Price</td>
                                        {packages.map(pkg => (
                                            <td key={pkg.package_id}>{isCustomPackage(pkg) ? '' : (pkg.price === 0 ? 'Custom Quote' : `R${getPackagePrice(pkg)}`)}</td>
                                        ))}
                                    </tr>
                                    {/* Dynamic features from database */}
                                    {allFeatures.map((feature, index) => (
                                        <tr key={index}>
                                            <td>{feature}</td>
                                            {packages.map(pkg => (
                                                <td key={pkg.package_id}>
                                                    <i className={`bi ${hasFeature(pkg, feature) ? 'bi-check-circle text-success' : 'bi-x-circle text-muted'}`}></i>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeBusinessPackage;
