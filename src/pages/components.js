import '../App.css';
import '../alert.css';
import { useEffect, useState, useRef } from "react"
import { NavLink } from "react-router-dom";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { canUseFeature } from "./utils/packageFeatures";
import ReCAPTCHA from "react-google-recaptcha";


import Index from './index';
import Features from '../pages/feature';
import Pricing from '../pages/pricing';
import CreateEvent from '../pages/createEvent';
import Sales from '../pages/salse';
import AdminDashboard from '../pages/admin/AdminDeshboard';
import EventTheme from '../pages/planner/eventTheme';
import PostcardEditor from '../pages/planner/postcardEditor';
import ActiveEventDetails from '../pages/planner/activeEventDetails';
import EventsDashboard from '../pages/planner/eventsDashboard';
import EventManagement from '../pages/planner/eventManagemnet';
import InvitationPage from '../pages/planner/invitationPage';
import RsvpForm from '../pages/planner/rsvpForm';
import Profile from '../pages/planner/Profile';
import ManageEyEvent from '../pages/planner/manage_my_event';
import PackagePayment from '../pages/planner/packagePayment';
import ForgotPassword from './forgot_password';
import EmailVerify from './email_verify';
import UpgradePackage from '../pages/planner/upgrade_package';
import UpgradeBusinessPackage from '../pages/business_planner/upgrade_business_package';
import BusinessPackagePayment from '../pages/business_planner/business-package-payment';
import Support from '../pages/support';
import AttendanceStats from './planner/attendance_stats';
import SecurityQuestionsModal from './SecurityQuestionsModal';
import GuestInsights from './planner/guest_insights';
import GuestMessageView from './guestMessageView';
import ReportEvent from './ReportEvent';
import AdminTicket from './AdminTicket';
import TicketSelection from './TicketSelection';
import SupportTicket from './SupportTicket';
import Ticket_Sale from './ticket_sales';
import TicketEvent_details from './ticketEvent_details';
import Ticket_payment from './ticket_payment';
import BusinessDashboard from '../pages/business_planner/businessDashboard';
import TicketEventManage from './planner/event_ticket_manage';

const clearAllLocalStorage = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("selectedEventId");
    localStorage.removeItem("selectedPackageId");
    localStorage.removeItem("eventStatus");

    const deviceId = localStorage.getItem("eventa_device_id");
    if (deviceId) {
        localStorage.removeItem(`eventa_${deviceId}_current_event`);
    }
}

export async function logOut() {

    try {
        const user = JSON.parse(localStorage.getItem("user"));
        const API_URL = process.env.REACT_APP_API_URL;
        if (!user || !user.user_id) {
            console.warn("No user logged in");
            return;
        }

        const formData = new FormData();
        formData.append("function", "logout");
        formData.append("user_id", user.user_id);

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        console.log("Logout response:", result);

        if (result.success) {

            clearAllLocalStorage();

            window.location.href = "/";
        } else {
            alert(result.message || "Logout failed");
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("Server error during logout");
    }
}

export const useSessionTimeout = (timeoutMinutes = 10, warningSeconds = 10) => {
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(warningSeconds);
    const activityTimer = useRef(null);
    const countdownTimer = useRef(null);
    const navigate = useNavigate();
    const API_URL = process.env.REACT_APP_API_URL;

    const resetTimer = () => {
        setShowWarning(false);
        setCountdown(warningSeconds);
        clearTimeout(activityTimer.current);
        clearInterval(countdownTimer.current);

        activityTimer.current = setTimeout(() => {
            setShowWarning(true);
            startCountdown();
        }, timeoutMinutes * 60 * 1000);
    };

    const startCountdown = () => {
        let timeLeft = warningSeconds;
        setCountdown(timeLeft);
        countdownTimer.current = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);
            if (timeLeft <= 0) logout();
            console.log(timeLeft);
        }, 1000);
    };

    const logout = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user && user.user_id) {
                const formData = new FormData();
                formData.append("function", "logout");
                formData.append("user_id", user.user_id);

                await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: formData,
                });
            }
        } catch (err) {
            console.error("Logout API error:", err);
        } finally {
            clearTimeout(activityTimer.current);
            clearInterval(countdownTimer.current);
            clearAllLocalStorage();
            navigate("/");
        }
    };

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (!user) return;

        resetTimer();
        const events = ["mousemove", "keydown", "click", "scroll"];
        events.forEach((evt) => window.addEventListener(evt, resetTimer));

        return () => {
            clearTimeout(activityTimer.current);
            clearInterval(countdownTimer.current);
            events.forEach((evt) => window.removeEventListener(evt, resetTimer));
        };
    }, []);

    return { showWarning, countdown, stayLoggedIn: resetTimer, logout };
};

export const SessionWarningModal = ({ show, countdown, onStayLoggedIn, onLogout }) => {
    if (!show) return null;

    return (
        <div style={modalOverlayStyle}>
            <div style={modalBoxStyle}>
                <h3>Session Timeout Warning</h3>
                <p>Your session will expire in <b>{countdown}</b> seconds.</p>
                <div style={{ marginTop: "15px" }}>
                    <button onClick={onStayLoggedIn} style={btnPrimaryStyle}>Yes, I'm active</button>
                    <button onClick={onLogout} style={btnDangerStyle}>Logout</button>
                </div>
            </div>
        </div>
    );
};


export function SessionHandler() {
    const { showWarning, countdown, stayLoggedIn, logout } = useSessionTimeout(10, 10);
    return (
        <>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/feature" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/createEvent" element={<CreateEvent />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/admindashboard" element={<AdminDashboard />} />
                <Route path="/eventTheme" element={<EventTheme />} />
                <Route path="/postcardEditor" element={<PostcardEditor />} />
                <Route path="/activeEventDetails" element={<ActiveEventDetails />} />
                <Route path="/eventsDashboard" element={<EventsDashboard />} />
                <Route path="/eventManagement" element={<EventManagement />} />
                <Route path="/invitationPage" element={<InvitationPage />} />
                <Route path="/rsvpForm" element={<RsvpForm />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/Manage_my_event" element={<ManageEyEvent />} />
                <Route path="/packagepayment" element={<PackagePayment />} />
                <Route path="/forgot_password" element={<ForgotPassword />} />
                <Route path="/email_verify" element={<EmailVerify />} />
                <Route path="/upgrade_package" element={<UpgradePackage />} />
                <Route path="/upgrade_business_package" element={<UpgradeBusinessPackage />} />
                <Route path="/business-package-payment" element={<BusinessPackagePayment />} />
                <Route path="/support" element={<Support />} />
                <Route path="/attendance_stats" element={<AttendanceStats />} />
                <Route path="/guest_insights" element={<GuestInsights />} />
                <Route path="/guestMessageView" element={<GuestMessageView />} />
                <Route path="/report-event" element={<ReportEvent />} />
                <Route path="/security-questions" element={<SecurityQuestionsModal />} />
                <Route path="/admin-ticket" element={<AdminTicket />} />
                <Route path="/ticket-selection" element={<TicketSelection />} />
                <Route path="/support-ticket" element={<SupportTicket />} />
                <Route path="/ticket_sales" element={<Ticket_Sale />} />
                <Route path="/ticketEvent_details" element={<TicketEvent_details />} />
                <Route path="/ticket_payment" element={<Ticket_payment />} />
            </Routes>

            <SessionWarningModal
                show={showWarning}
                countdown={countdown}
                onStayLoggedIn={stayLoggedIn}
                onLogout={logout}
            />
        </>
    );
}

const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
};

const modalBoxStyle = {
    background: "#fff",
    padding: "25px",
    borderRadius: "10px",
    textAlign: "center",
    width: "300px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
};

const btnPrimaryStyle = {
    marginRight: "10px",
    padding: "8px 16px",
    border: "none",
    backgroundColor: "#005a33ff",
    color: "#fff",
    borderRadius: "5px",
    cursor: "pointer",
};

const btnDangerStyle = {
    padding: "8px 16px",
    border: "none",
    backgroundColor: "#dc3545",
    color: "#fff",
    borderRadius: "5px",
    cursor: "pointer",
};


export function Navbar({ onLoginClick, onSignupClick }) {
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const desktopDropdownRef = useRef(null);
    const mobileDropdownRef = useRef(null);

    const navigate = useNavigate();

    /* ===============================
       USER AUTH STATE
    =============================== */
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));

        const handleUserChange = () => {
            const updatedUser = localStorage.getItem("user");
            setUser(updatedUser ? JSON.parse(updatedUser) : null);
        };

        window.addEventListener("userLoggedIn", handleUserChange);
        window.addEventListener("userLoggedOut", handleUserChange);

        return () => {
            window.removeEventListener("userLoggedIn", handleUserChange);
            window.removeEventListener("userLoggedOut", handleUserChange);
        };
    }, []);


    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                desktopDropdownRef.current &&
                !desktopDropdownRef.current.contains(event.target) &&
                mobileDropdownRef.current &&
                !mobileDropdownRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);


    const toggleMobileMenu = () => {
        setIsMobileMenuOpen((prev) => !prev);
    };

    const toggleDropdown = (e) => {
        e.stopPropagation();
        setDropdownOpen((prev) => !prev);
    };

    const goToDashboard = () => {
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        const dashPath = user?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';
        navigate(dashPath);
        closeAllMenus();
    };

    const goToProfile = () => {
        navigate("/Profile");
        closeAllMenus();
    };

    const createEventClicked = () => {
        navigate("/activeEventDetails");
        closeAllMenus();
    };

    const logOut = () => {
        localStorage.removeItem("user");
        setUser(null);
        window.dispatchEvent(new CustomEvent("userLoggedOut"));
        closeAllMenus();
        navigate("/");
    };

    const closeAllMenus = () => {
        setDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };
    const handleDropdownItemClick = (handler, e) => {
        if (e) e.stopPropagation();
        handler(e);
    };

    return (
        <>
            {/* ================= DESKTOP NAV ================= */}
            <section className={`nav-section d-none d-md-block ${scrolled ? "scrolled" : ""}`}>
                <div className="container">
                    <div className="row bottom-nav-row align-items-center">
                        <div className="col-md-3">
                            <a href="/">
                                <img src="/images/logo.png" alt="Logo" className="logo img-fluid" />
                            </a>
                        </div>

                        <div className="col-md-6">
                            <ul className="nav nav-list justify-content-center">
                                {["/", "/feature", "/ticket_sales", "/pricing", "/sales", "/support"].map(
                                    (path, i) => (
                                        <li className="nav-item" key={i}>
                                            <NavLink
                                                to={path}
                                                end={path === "/"}
                                                className={({ isActive }) =>
                                                    `nav-link ${isActive ? "active" : ""}`
                                                }
                                            >
                                                {["Home", "Features", "Events", "Pricing", "Sales", "Support"][i]}
                                            </NavLink>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>

                        <div className="col-md-3 btns-container">
                            {user ? (
                                <div className="logged-in-container">
                                    <button className="btn dashboard-btn" onClick={goToDashboard}>
                                        <i className="bi bi-grid-fill me-1"></i> Dashboard
                                    </button>

                                    <div ref={desktopDropdownRef} className="profile-container">
                                        <div className="profile-trigger" onClick={toggleDropdown}>
                                            <i className="bi bi-person-circle"></i>
                                            <span>{user.name || "User"}</span>
                                            <i className="bi bi-chevron-down"></i>
                                        </div>

                                        {dropdownOpen && (
                                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={(e) => handleDropdownItemClick(goToDashboard, e)} className="dropdown-item">
                                                    <i className="bi bi-grid-fill me-2"></i> Dashboard
                                                </button>
                                                <button onClick={(e) => handleDropdownItemClick(createEventClicked, e)} className="dropdown-item">
                                                    <i className="bi bi-plus-circle me-2"></i> New Event
                                                </button>
                                                <button onClick={(e) => handleDropdownItemClick(goToProfile, e)} className="dropdown-item">
                                                    <i className="bi bi-person me-2"></i> Profile
                                                </button>
                                                <div className="dropdown-divider"></div>
                                                <button className="dropdown-item" onClick={(e) => handleDropdownItemClick(logOut, e)}>
                                                    <i className="bi bi-box-arrow-right me-2"></i> Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className='d-flex'>
                                    <button className="btn signin-btn" onClick={onLoginClick}>
                                        Sign In
                                    </button>
                                    <button className="btn signup-btn" onClick={onSignupClick}>
                                        Sign Up
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= MOBILE NAV ================= */}
            <section className={`mobile-nav-section d-md-none ${scrolled ? "scrolled" : ""}`}>
                <div className="container-fluid py-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <a href="/">
                            <img src="/images/logo.png" alt="Logo" className="mobile-logo" />
                        </a>

                        <div className="d-flex align-items-center">
                            {user && (
                                <div ref={mobileDropdownRef} className="mobile-profile-container me-2">
                                    <div className="mobile-profile-trigger" onClick={toggleDropdown}>
                                        <i className="bi bi-person-circle"></i>
                                    </div>

                                    {dropdownOpen && (
                                        <div
                                            className="mobile-dropdown-menu"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button onClick={goToDashboard}>Dashboard</button>
                                            <button onClick={createEventClicked}>New Event</button>
                                            <button onClick={goToProfile}>Profile</button>
                                            <button onClick={logOut}>Logout</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                                <span className={`hamburger-line ${isMobileMenuOpen ? "line-1-open" : ""}`} />
                                <span className={`hamburger-line ${isMobileMenuOpen ? "line-2-open" : ""}`} />
                                <span className={`hamburger-line ${isMobileMenuOpen ? "line-3-open" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ADD THIS MOBILE MENU CONTENT */}
                <div className={`mobile-menu ${isMobileMenuOpen ? "open" : ""}`}>
                    <ul className="mobile-nav-list">
                        {["/", "/feature", "/ticket_sales", "/pricing", "/sales", "/support"].map(
                            (path, i) => (
                                <li className="mobile-nav-item" key={i}>
                                    <NavLink
                                        to={path}
                                        end={path === "/"}
                                        className={({ isActive }) =>
                                            `mobile-nav-link ${isActive ? "active" : ""}`
                                        }
                                        onClick={closeAllMenus}
                                    >
                                        {["Home", "Features", "Events", "Pricing", "Sales", "Support"][i]}
                                    </NavLink>
                                </li>
                            )
                        )}

                        {/* Add mobile buttons for non-logged in users */}
                        {!user && (
                            <li className="mobile-nav-item">
                                <div className="mobile-buttons">
                                    <button className="btn mobile-signin-btn" onClick={() => {
                                        onLoginClick();
                                        closeAllMenus();
                                    }}>
                                        Sign In
                                    </button>
                                    <button className="btn mobile-signup-btn" onClick={() => {
                                        onSignupClick();
                                        closeAllMenus();
                                    }}>
                                        Sign Up
                                    </button>
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
            </section>
        </>
    );
}

export function Footer() {
    return (
        <footer className="footer-section">
            <div className="container">
                <div className="row top-footer-row">
                    <div className='col-lg-4'>
                        <img src="/images/White logo.png" alt="Eventa Logo" className="footer-logo img-fluid mb-3" />
                        <p className="about-description">
                            Evendi is the smarter way to plan and manage your events. Whether it's a wedding, birthday, corporate gathering,
                            or casual hangout, Evendi makes it simple to create invitations, track RSVPs, and keep guests engaged — all in one place.
                        </p>
                    </div>
                    <div className="col-lg-2">
                        <h5>Quick Links</h5>
                        <ul className="list-quick-links">
                            <li><a href="/">Home</a></li>
                            <li><a href="/feature">Features</a></li>
                            <li><a href="/pricing">Pricing</a></li>
                            <li><a href="/support">Support</a></li>
                            <li><a href="/ticket_sales">Ticket Sales</a></li>
                        </ul>
                    </div>

                    <div className="col-lg-3">
                        <h5>Contact Us</h5>
                        <div className="contact-item">
                            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
                                <i className="bi bi-whatsapp"></i> 123 456 7890
                            </a>
                        </div>
                        <div className="contact-item">
                            <a href="mailto:info@eventa.co.za">
                                <i className="bi bi-envelope-fill"></i> info@evendi.co.za
                            </a>
                        </div>
                        <div className="contact-item">
                            <a href="tel:1234567890">
                                <i className="bi bi-phone"></i> 123 456 7890
                            </a>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <h5>Stay Connected</h5>
                        <p>Follow us on our social media channels</p>
                        <div className="social-icons">
                            <a href="https://web.facebook.com/profile.php?id=61586884803873" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="me-3">
                                <i className="bi bi-facebook"></i>
                            </a>
                            <a href="/" className="me-3"><i className="bi bi-twitter"></i></a>
                            <a href="https://www.instagram.com/evendi_za?utm_source=qr&igsh=Z3kwdDIzamlxYXFj" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="me-3">
                                <i className="bi bi-instagram"></i>
                            </a>
                            <a href="/"><i className="bi bi-linkedin"></i></a>
                        </div>
                    </div>
                </div>

            </div>
            <div className="row bottom-footer-row">
                <div className="col text-center">
                    <p className="mb-0">© 2025 Evendi. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export function LoginNav() {
    const [scrolled, setScrolled] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // Handle scroll for sticky effect
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const goToHome = (e) => {
        if (e) e.stopPropagation();
        navigate("/");
        setDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

    const createEventClicked = (e) => {
        if (e) e.stopPropagation();
        navigate("/activeEventDetails");
        setDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

    const goToProfile = (e) => {
        if (e) e.stopPropagation();
        navigate("/Profile");
        setDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

    const goToDashboard = (e) => {
        if (e) e.stopPropagation();
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        const dashPath = user?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';
        navigate(dashPath);
        setDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

    const logOut = (e) => {
        if (e) e.stopPropagation();
        localStorage.removeItem("user");
        setUser(null);
        setDropdownOpen(false);
        setIsMobileMenuOpen(false);
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        navigate("/");
    };

    const toggleDropdown = (e) => {
        if (e) e.stopPropagation();
        setDropdownOpen(prev => !prev);
    };

    const toggleMobileMenu = (e) => {
        if (e) e.stopPropagation();
        setIsMobileMenuOpen(prev => !prev);
    };

    // Handle dropdown item clicks
    const handleDropdownItemClick = (handler, e) => {
        if (e) e.stopPropagation();
        handler(e);
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        // Listen for logout events
        const handleUserLogout = () => {
            setUser(null);
        };

        window.addEventListener('userLoggedOut', handleUserLogout);
        return () => {
            window.removeEventListener('userLoggedOut', handleUserLogout);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close dropdown if clicked outside
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }

            // Close mobile menu if clicked outside (except the hamburger button)
            if (mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target) &&
                !event.target.closest('.mobile-menu-toggle')) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    // Close mobile menu when window resizes to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) { // md breakpoint
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isMobileMenuOpen]);

    return (
        <>
            {/* Desktop Navigation */}
            <nav className={`nav-section d-none d-md-block ${scrolled ? "scrolled" : ""}`}>
                <div className="container">
                    <div className="row bottom-nav-row">
                        <div className="col-md-3 logo-container">
                            <div onClick={goToHome} style={{ cursor: 'pointer' }}>
                                <img src="/images/logo.png" alt="Eventa Logo" className="logo img-fluid" />
                            </div>
                        </div>

                        <div className="col-md-3 btns-container">
                            <div className="logged-in-container">
                                <button className="btn home-btn" onClick={goToHome} >
                                    <i className="bi bi-house-fill me-1"></i> Home
                                </button>
                                <button className="btn dashboard-btn me-2" onClick={goToDashboard}>
                                    <i className="bi bi-grid-fill me-1"></i> Dashboard
                                </button>
                                <button className="btn signup-btn me-2" onClick={createEventClicked}>
                                    <i className="bi bi-plus-circle me-1"></i> New Event
                                </button>
                                <div
                                    ref={dropdownRef}
                                    className={`profile-container ${dropdownOpen ? "open" : ""}`}
                                >
                                    <div className="profile-trigger" onClick={toggleDropdown}>
                                        <i className="bi bi-person-circle me-1"></i>
                                        <span className="profile-name">{user ? user.name : "User"}</span>
                                        <i className="bi bi-chevron-down ms-1"></i>
                                    </div>
                                    {dropdownOpen && (
                                        <div className="dropdown-menu">
                                            <button onClick={(e) => handleDropdownItemClick(goToDashboard, e)} className="dropdown-item">
                                                <i className="bi bi-grid-fill me-2"></i> Dashboard
                                            </button>
                                            <button onClick={(e) => handleDropdownItemClick(createEventClicked, e)} className="dropdown-item">
                                                <i className="bi bi-plus-circle me-2"></i> New Event
                                            </button>
                                            <button onClick={(e) => handleDropdownItemClick(goToProfile, e)} className="dropdown-item">
                                                <i className="bi bi-person me-2"></i> Profile
                                            </button>
                                            <div className="dropdown-divider"></div>
                                            <button className="dropdown-item" onClick={(e) => handleDropdownItemClick(logOut, e)}>
                                                <i className="bi bi-box-arrow-right me-2"></i> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Navigation - Just hamburger menu */}
            <section className={`mobile-nav-section d-md-none ${scrolled ? "scrolled" : ""}`}>
                <div className="container-fluid">
                    <div className="row align-items-center py-2">
                        <div className="col-6">
                            <div onClick={goToHome} style={{ cursor: 'pointer' }}>
                                <img src="/images/logo.png" alt="Eventa Logo" className="mobile-logo img-fluid" />
                            </div>
                        </div>
                        <div className="col-6 text-end">
                            <button
                                className="mobile-menu-toggle"
                                onClick={toggleMobileMenu}
                                aria-label="Toggle navigation menu"
                            >
                                <span className={`hamburger-line ${isMobileMenuOpen ? 'line-1-open' : ''}`}></span>
                                <span className={`hamburger-line ${isMobileMenuOpen ? 'line-2-open' : ''}`}></span>
                                <span className={`hamburger-line ${isMobileMenuOpen ? 'line-3-open' : ''}`}></span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Sidebar/Popup Menu - Slides in from left */}
                <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
                    <div
                        ref={mobileMenuRef}
                        className="mobile-menu-sidebar"
                    >
                        <div className="mobile-menu-header">
                            <div className="mobile-user-info">
                                <i className="bi bi-person-circle"></i>
                                <div className="mobile-user-details">
                                    <div className="mobile-user-name">{user ? user.name : "Guest"}</div>
                                    {user && user.email && (
                                        <div className="mobile-user-email">{user.email}</div>
                                    )}
                                </div>
                                <button
                                    className="mobile-menu-close"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-x"></i>
                                </button>
                            </div>
                        </div>

                        <div className="mobile-menu-items">
                            <button className="mobile-menu-item" onClick={goToHome}>
                                <i className="bi bi-house-door"></i>
                                <span>Home</span>
                            </button>

                            <button className="mobile-menu-item" onClick={goToDashboard}>
                                <i className="bi bi-grid-fill"></i>
                                <span>Dashboard</span>
                            </button>

                            <button className="mobile-menu-item" onClick={createEventClicked}>
                                <i className="bi bi-plus-circle"></i>
                                <span>New Event</span>
                            </button>

                            <button className="mobile-menu-item" onClick={goToProfile}>
                                <i className="bi bi-person"></i>
                                <span>Profile</span>
                            </button>

                            <div className="mobile-menu-divider"></div>

                            <button className="mobile-menu-item logout-item" onClick={logOut}>
                                <i className="bi bi-box-arrow-right"></i>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export function Login({ isOpen, onClose, defaultMode = "login" }) {
    const [isLogin, setIsLogin] = useState(defaultMode === "login");
    const [accountType, setAccountType] = useState("personal"); // "personal" or "business"
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        lastname: '',
        password: '',
        confirmPassword: '',
        businessName: '',
        businessType: '',
        phone: '',
        address: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    const [needsVerification, setNeedsVerification] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityAnswers, setSecurityAnswers] = useState(null);

    const navigate = useNavigate();

    // Reset form when mode changes or modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setIsLogin(defaultMode === "login");
            setAccountType("personal");
            setFormData({
                name: '',
                email: '',
                lastname: '',
                password: '',
                confirmPassword: '',
                businessName: '',
                businessType: '',
                phone: '',
                address: ''
            });
            setNeedsVerification(false);
            setUnverifiedEmail('');
            setSecurityAnswers(null);
        }
    }, [isOpen, defaultMode]);

    if (!isOpen) return null;

    const printAlert = (message, type = 'info') => {
        setAlert({ show: true, message, type });

        setTimeout(() => {
            setAlert({ show: false, message: '', type: '' });
        }, 5000);
    };

    const sendVerificationEmail = async (email, name) => {
        try {
            let apiUrl = process.env.REACT_APP_API_URL;
            if (!apiUrl) {
                apiUrl = `${window.location.origin}/eventa/src/pages/php`;
            }

            if (apiUrl === "/api") {
                apiUrl = "https://evenditest.evendi.co.za/api";
            }

            const formDataToSend = new FormData();
            formDataToSend.append("email", email);
            formDataToSend.append("name", name);
            formDataToSend.append("API_URL", apiUrl);

            const url = `${apiUrl}/send_verification.php`;
            console.log("Sending verification request to:", url);

            const response = await fetchWithTimeout(url, {
                method: "POST",
                body: formDataToSend
            }, 15000);

            const result = await response.json();
            return result;
        } catch (error) {
            console.error("Error sending verification email:", error);
            return { success: false, message: "Failed to send verification email" };
        }
    };

    const saveSecurityQuestions = async (userId, answers) => {
        console.log("Saving security questions for user:", userId, "Answers:", answers);

        try {
            let apiUrl = process.env.REACT_APP_API_URL;
            if (!apiUrl) {
                console.warn('REACT_APP_API_URL not set, using fallback relative path');
                apiUrl = `${window.location.origin}/eventa/src/pages/php`;
            }

            const formData = new FormData();
            formData.append("function", "saveSecurityQuestions");
            formData.append("user_id", userId);
            formData.append("question1", "What Primary school did you attend?");
            formData.append("answer1", answers.answer1);
            formData.append("question2", "What city were you born in?");
            formData.append("answer2", answers.answer2);
            formData.append("question3", "What is your mother's maiden name?");
            formData.append("answer3", answers.answer3);

            const url = `${apiUrl}/query.php`;
            console.log("Sending security questions to:", url);

            const response = await fetchWithTimeout(url, {
                method: "POST",
                body: formData
            }, 15000);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();
            console.log("Raw security questions response:", responseText);

            if (!responseText.trim()) {
                throw new Error("Empty response from server for security questions");
            }

            const result = JSON.parse(responseText);
            console.log("Security questions save response:", result);

            return result;
        } catch (err) {
            console.error("Error saving security questions:", err);
            return { success: false, message: "Failed to save security questions: " + err.message };
        }
    };

    const handleSecurityQuestionsSave = async (answers) => {
        setSecurityAnswers(answers);
        setShowSecurityModal(false);
        await completeRegistration(answers);
    };

    const completeRegistration = async (answers = null) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formDataToSend = new FormData();

            if (isLogin) {
                formDataToSend.append("function", "login");
                formDataToSend.append("email", formData.email);
                formDataToSend.append("password", formData.password);
            } else {
                if (formData.password !== formData.confirmPassword) {
                    printAlert("Passwords don't match!", 'error');
                    setLoading(false);
                    return;
                }

                formDataToSend.append("function", "register");
                formDataToSend.append("account_type", accountType);
                formDataToSend.append("email", formData.email);
                formDataToSend.append("password", formData.password);

                // Add fields based on account type
                if (accountType === "business") {
                    formDataToSend.append("business_name", formData.businessName);
                    formDataToSend.append("business_type", formData.businessType);
                    formDataToSend.append("phone", formData.phone);
                    formDataToSend.append("address", formData.address);
                } else {
                    formDataToSend.append("name", formData.name);
                    formDataToSend.append("lastname", formData.lastname);
                }
            }

            console.log("Sending request to:", API_URL);
            const url = `${API_URL}/query.php`;

            // quick pre-check so we can fail fast with a helpful message (avoids a long timeout)
            const check = await checkApiReachable(API_URL, 5000);
            if (!check.ok) {
                const reason = check.error || `HTTP ${check.status || 'no response'}`;
                throw new Error(`Unable to reach API at ${API_URL} — ${reason}`);
            }

            const response = await fetchWithTimeout(url, {
                method: "POST",
                body: formDataToSend
            }, 15000);

            //Check if response is OK and has content
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();
            console.log("Raw API response:", responseText);

            // Check if response is empty
            if (!responseText.trim()) {
                throw new Error("Empty response from server");
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (jsonError) {
                console.error("JSON parse error:", jsonError);
                console.error("Raw response that failed to parse:", responseText);
                throw new Error("Invalid JSON response from server");
            }

            console.log("Parsed API Response:", result);

            if (result.success) {
                if (isLogin) {
                    localStorage.setItem("user", JSON.stringify(result.user));

                    const isAdmin = result.user.role === "admin" ||
                        (result.user.role && result.user.role.includes("admin"));

                    if (isAdmin) {
                        navigate("/adminDashboard");
                    } else {
                        // REDIRECT BASED ON ACCOUNT TYPE
                        if (result.user.account_type === 'business') {
                            navigate("/businessdashboard");
                            printAlert("Welcome to your Business Dashboard!", 'success');
                        } else {
                            navigate("/eventsDashboard");
                            printAlert("Welcome to your Events Dashboard!", 'success');
                        }
                    }

                    onClose();
                } else {
                    // For registration, save security questions if answers were provided
                    if (answers && result.user && result.user.user_id) {
                        const securityResult = await saveSecurityQuestions(result.user.user_id, answers);
                        if (!securityResult.success) {
                            console.error("Failed to save security questions:", securityResult.message);
                            // Don't fail the registration if security questions fail
                            printAlert("Account created but security questions failed to save", 'warning');
                        }
                    } else if (answers) {
                        console.error("Cannot save security questions: user_id is undefined", result);
                        printAlert("Account created but security questions failed to save", 'warning');
                    }

                    printAlert(`${accountType === "business" ? "Business" : "Personal"} account created successfully! Sending verification email...`, 'success');

                    const verificationResult = await sendVerificationEmail(formData.email,
                        accountType === "business" ? formData.businessName : formData.name);

                    if (verificationResult.success) {
                        printAlert("Verification email sent! Please check your inbox.", 'success');
                    } else {
                        printAlert("Account created but failed to send verification email. Please use the resend option.", 'error');
                    }

                    // For business registration, suggest upgrading to a business package
                    if (accountType === "business") {
                        printAlert("As a business user, you can upgrade to a business package to publish events.", 'info');
                    }

                    setFormData({
                        name: '',
                        email: '',
                        lastname: '',
                        password: '',
                        confirmPassword: '',
                        businessName: '',
                        businessType: '',
                        phone: '',
                        address: ''
                    });
                    setIsLogin(true);
                }
            } else {
                if (result.needsVerification) {
                    setNeedsVerification(true);
                    setUnverifiedEmail(formData.email);
                    printAlert(result.message, 'error');
                } else {
                    printAlert(result.message || "Something went wrong!", 'error');
                }
            }
        } catch (error) {
            console.error("Registration Error:", error);

            // Provide a clearer message when the request timed out or when the API can't be reached
            if (error && typeof error.message === 'string' && error.message.toLowerCase().includes('timed out')) {
                printAlert(`Request timed out when contacting the API. Make sure your PHP server (Apache/XAMPP) is running and that REACT_APP_API_URL points to the correct address. API: ${process.env.REACT_APP_API_URL}`, 'error');
            } else if (error && typeof error.message === 'string' && error.message.toLowerCase().includes('unable to reach api')) {
                printAlert(`${error.message}. Make sure your backend is running and accessible from your browser.`, 'error');
            } else {
                printAlert(`Error: ${error.message}`, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();

        if (isLogin) {
            await completeRegistration();
        } else {
            // For registration, show security questions modal first
            if (formData.password !== formData.confirmPassword) {
                printAlert("Passwords don't match!", 'error');
                setLoading(false);
                return;
            }
            setShowSecurityModal(true);
        }
    };

    const handleResendVerification = async () => {
        setLoading(true);
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formDataToSend = new FormData();
            formDataToSend.append("email", unverifiedEmail);
            formDataToSend.append("API_URL", API_URL);

            const response = await fetch(`${API_URL}/send_verification.php`, {
                method: "POST",
                body: formDataToSend
            });

            const result = await response.json();

            if (result.success) {
                printAlert("Verification email sent successfully! Please check your inbox.", 'success');
                setNeedsVerification(false);
                setUnverifiedEmail('');
            } else {
                printAlert(result.message || "Failed to send verification email.", 'error');
            }
        } catch (error) {
            console.error("Error:", error);
            printAlert("Failed to send verification email. Please try again.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setLoading(true);
        if (!formData.email) {
            printAlert("Please enter your email address first.", 'error');
            setLoading(false);
            return;
        }

        try {
            const fd = new FormData();
            fd.append("email", formData.email);
            fd.append("API_URL", process.env.REACT_APP_API_URL);

            const resp = await fetch(`${process.env.REACT_APP_API_URL}/send_reset_link.php`, {
                method: "POST",
                body: fd,
            });

            const data = await resp.json();

            if (data.success) {
                printAlert(data.message, 'success');
            } else {
                printAlert(data.message, 'error');
            }
        } catch (err) {
            console.error("Error:", err);
            printAlert("Something went wrong. Please try again later.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setAccountType("personal");
        setFormData({
            name: '',
            email: '',
            lastname: '',
            password: '',
            confirmPassword: '',
            businessName: '',
            businessType: '',
            phone: '',
            address: ''
        });
        setNeedsVerification(false);
        setUnverifiedEmail('');
        setSecurityAnswers(null);
    };

    const closeAlert = () => {
        setAlert({ show: false, message: '', type: '' });
    };

    // Handle business account type change
    const handleAccountTypeChange = (type) => {
        setAccountType(type);
        // Clear form data when switching account types
        setFormData(prev => ({
            ...prev,
            name: type === 'personal' ? prev.name : '',
            lastname: type === 'personal' ? prev.lastname : '',
            businessName: type === 'business' ? prev.businessName : '',
            businessType: type === 'business' ? prev.businessType : '',
            phone: type === 'business' ? prev.phone : '',
            address: type === 'business' ? prev.address : ''
        }));
    };

    if (loading && !showSecurityModal) {
        return (
            <div className="loading-container">
                <div className="spinner-border text-info" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <div className="loading-text">Loading please wait</div>
            </div>
        );
    }

    return (
        <div className="login-popup-overlay" onClick={onClose}>
            {/* Security Questions Modal */}
            <SecurityQuestionsModal
                isOpen={showSecurityModal}
                onClose={() => {
                    setShowSecurityModal(false);
                    setLoading(false);
                }}
                onSave={handleSecurityQuestionsSave}
                mode="registration"
            />

            {/* Regular Alerts */}
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <div className="alert-content">
                        <span className="alert-message">{alert.message}</span>
                        <button className="alert-close" onClick={closeAlert}>×</button>
                    </div>
                </div>
            )}

            <div className="login-popup-content" onClick={e => e.stopPropagation()}>
                <button className="login-close-btn" onClick={onClose}>
                    <i className="bi bi-x"></i>
                </button>

                <div className="login-header">
                    <img src="/images/logo.png" alt="Eventa Logo" className="login-logo" />
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{isLogin ? 'Sign in to your Evendi account' : 'Join Evendi to start planning your events'}</p>
                </div>

                {!isLogin && (
                    <div className="account-type-selector">
                        <div className="account-type-options">
                            <button
                                type="button"
                                className={`account-type-btn ${accountType === 'personal' ? 'active' : ''}`}
                                onClick={() => handleAccountTypeChange('personal')}
                            >
                                <i className="bi bi-person-fill"></i>
                                Personal Account
                            </button>
                            <button
                                type="button"
                                className={`account-type-btn ${accountType === 'business' ? 'active' : ''}`}
                                onClick={() => handleAccountTypeChange('business')}
                            >
                                <i className="bi bi-building"></i>
                                Business Account
                            </button>
                        </div>
                        <p className="account-type-description">
                            {accountType === 'personal'
                                ? 'For individuals planning personal events'
                                : 'For companies and organizations managing business events'}
                        </p>
                        {accountType === 'business' && (
                            <div className="business-features-notice">
                                <i className="bi bi-info-circle"></i>
                                Business accounts include business packages with higher guest limits and advanced features.
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    {!isLogin && accountType === "personal" && (
                        <>
                            <div className="form-group">
                                <label htmlFor="name">First Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter your first name"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastname">Last Name</label>
                                <input
                                    type="text"
                                    id="lastname"
                                    name="lastname"
                                    value={formData.lastname}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter your last name"
                                />
                            </div>
                        </>
                    )}

                    {!isLogin && accountType === "business" && (
                        <>
                            <div className="form-group">
                                <label htmlFor="businessName">Business Name *</label>
                                <input
                                    type="text"
                                    id="businessName"
                                    name="businessName"
                                    value={formData.businessName}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter your business name"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="businessType">Business Type *</label>
                                <select
                                    id="businessType"
                                    name="businessType"
                                    value={formData.businessType}
                                    onChange={handleInputChange}
                                    required
                                    className="form-select"
                                >
                                    <option value="">Select business type</option>
                                    <option value="sole_proprietor">Sole Proprietor</option>
                                    <option value="partnership">Partnership</option>
                                    <option value="llc">LLC</option>
                                    <option value="corporation">Corporation</option>
                                    <option value="non_profit">Non-Profit</option>
                                    <option value="event_planning">Event Planning Company</option>
                                    <option value="venue">Venue</option>
                                    <option value="catering">Catering Service</option>
                                    <option value="entertainment">Entertainment</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter business phone number"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="address">Business Address *</label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter business address"
                                    rows="3"
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder={accountType === "business" ? "Enter business email" : "Enter your email"}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password *</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                minLength="6"
                            />
                            <span
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </span>
                        </div>
                        {!isLogin && (
                            <small className="form-text text-muted">
                                Password must be at least 6 characters long
                            </small>
                        )}
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password *</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                placeholder="Confirm your password"
                                minLength="6"
                            />
                        </div>
                    )}

                    {isLogin && (
                        <div className="login-options">
                            <label className="remember-me">
                                <input type="checkbox" />
                                Remember me
                            </label>
                            <a onClick={handleForgotPassword} className="forgot-password">
                                Forgot password?
                            </a>
                        </div>
                    )}

                    {/* Resend Verification Link - Hidden by default, shows when needsVerification is true */}
                    {needsVerification && (
                        <div className="verification-resend-section">
                            <div className="verification-error-message">
                                <i className="bi bi-exclamation-triangle"></i>
                                Please verify your email address to continue.
                            </div>
                            <button
                                type="button"
                                className="resend-verification-btn"
                                onClick={handleResendVerification}
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                        </div>
                    )}

                    <button type="submit" className="login-submit-btn" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="spinner-border spinner-border-sm me-2" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                Please Wait...
                            </>
                        ) : (
                            isLogin ? 'Sign In' : 'Create Account'
                        )}
                    </button>

                    {!isLogin && accountType === "business" && (
                        <div className="business-registration-note">
                            <i className="bi bi-info-circle"></i>
                            <small>
                                By creating a business account, you'll have access to business packages with higher guest limits and advanced event management features.
                            </small>
                        </div>
                    )}
                </form>

                <div className="login-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button type="button" className="switch-mode-btn" onClick={switchMode}>
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>

                    <div className="social-login">
                        <p>Or continue with</p>
                        <div className="social-buttons">
                            <button type="button" className="social-btn google-btn">
                                <i className="bi bi-google"></i> Google
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


// Helper: fetch with timeout to avoid hanging requests
const fetchWithTimeout = (resource, options = {}, timeout = 15000) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Request timed out'));
        }, timeout);

        fetch(resource, options)
            .then((response) => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

// Small helper to quickly verify API reaches the server before attempting large requests
const checkApiReachable = async (baseUrl, timeout = 5000) => {
    try {
        const form = new FormData();
        form.append('function', 'getAllPackages'); // lightweight, public endpoint

        const resp = await fetchWithTimeout(`${baseUrl}/query.php`, {
            method: 'POST',
            body: form
        }, timeout);

        if (!resp.ok) return { ok: false, status: resp.status };
        const json = await resp.json();
        return { ok: true, body: json };
    } catch (err) {
        return { ok: false, error: err.message || String(err) };
    }
};


export function DashboardHeader({ user, eventStatus, onToggleSidebar }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const goToProfile = () => {
        navigate('/Profile');
        setDropdownOpen(false);
    };

    const logOut = () => {
        localStorage.removeItem('user');
        navigate('/');
        setDropdownOpen(false);
    };

    const handleDropdownItemClick = (handler, e) => {
        if (e) e.stopPropagation();
        handler(e);
    };

    const goToDashboard = (e) => {
        if (e) e.stopPropagation();
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        const dashPath = user?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';
        navigate(dashPath);
    };

    const createEventClicked = () => {
        navigate("/activeEventDetails");
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const goToHome = (e) => {
        if (e) e.stopPropagation();
        navigate("/");
        setDropdownOpen(false);
    };

    return (
        <div className="dashboard-header-with-menu">
            <div className="header-left">
                <button
                    className="burger-menu d-md-none"
                    onClick={onToggleSidebar}
                    aria-label="Toggle navigation menu"
                >
                    <span className="burger-line"></span>
                    <span className="burger-line"></span>
                    <span className="burger-line"></span>
                </button>

                {/* Logo - Hidden on mobile, shown on desktop */}
                <h1 className="d-none d-md-block">Evendi</h1>
            </div>

            <div className="header-tabs">
                {/* <button className="btn home-btn" onClick={goToHome}>
                    <i className="bi bi-house-fill me-1"></i> Home
                </button> */}
                <button className={`status-btn status-${eventStatus?.toLowerCase() || 'draft'}`}>
                    {eventStatus || 'Draft'}
                </button>
                <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                    <i className="bi bi-person-circle"></i>
                    <span>{user?.name || "Guest"}</span>
                    <i className="bi bi-chevron-bar-down"></i>
                    {dropdownOpen && (
                        <div className="dropdown-menu show">
                            <button onClick={(e) => handleDropdownItemClick(goToDashboard, e)} className="dropdown-item">
                                <i className="bi bi-grid-fill me-2"></i> Dashboard
                            </button>
                            <button onClick={(e) => handleDropdownItemClick(createEventClicked, e)} className="dropdown-item">
                                <i className="bi bi-plus-circle me-2"></i> New Event
                            </button>
                            <button onClick={(e) => handleDropdownItemClick(goToProfile, e)} className="dropdown-item">
                                <i className="bi bi-person me-2"></i> Profile
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item" onClick={(e) => handleDropdownItemClick(logOut, e)}>
                                <i className="bi bi-box-arrow-right me-2"></i> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function DashboardSidebar({ isMobileOpen, onClose, userPackage }) {
    const navigate = useNavigate();
    const location = useLocation();
    // Determine home path based on logged-in user type (personal vs business)
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const homePath = currentUser?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';

    const goToHome = () => {
        navigate(homePath);
        onClose?.();
    };
    const goToManage = () => {
        navigate("/manage_my_event");
        onClose?.();
    };
    const goToInvitations = () => {
        navigate("/invitationPage");
        onClose?.();
    };
    const goToEventManagement = () => {
        navigate("/eventManagement");
        onClose?.();
    };
    const goToAttendanceStats = () => {
        navigate("/attendance_stats");
        onClose?.();
    };
    const goToGuest = () => {
        navigate("/guest_insights");
        onClose?.();
    };

    const canViewAttendance = userPackage ? canUseFeature(userPackage, "attendanceStats") : true;

    const navigationItems = [
        {
            section: 'Event Planning',
            items: [
                { path: homePath, icon: 'bi-house', label: 'Dashboard', onClick: goToHome },
                { path: '/manage_my_event', icon: 'bi-megaphone', label: 'Publish Event', onClick: goToManage },
                { path: '/invitationPage', icon: 'bi-send', label: 'Send Invitations', onClick: goToInvitations },
                { path: '/eventManagement', icon: 'bi-list-check', label: 'RSVP Responses', onClick: goToEventManagement }
            ]
        },
        {
            section: 'Event Analytics',
            items: [
                { path: '/attendance_stats', icon: 'bi-graph-up', label: 'Attendance Stats', onClick: goToAttendanceStats, disabled: !canViewAttendance },
                { path: '/guest_insights', icon: 'bi-people', label: 'Guest Insights', onClick: goToGuest }
            ]
        }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Overlay — only on mobile */}
            {isMobileOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            {/* Sidebar — THIS LINE IS THE FIX */}
            <div className={`dashboard-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-header">
                    <h3>Event Management</h3>
                </div>

                {navigationItems.map((section, index) => (
                    <div key={index} className="sidebar-section">
                        <h4>{section.section}</h4>
                        <ul>
                            {section.items.map((item, itemIndex) => (
                                <li
                                    key={itemIndex}
                                    className={`${isActive(item.path) ? "active" : ""} ${item.disabled ? 'disabled-nav' : ''}`}
                                    onClick={() => {
                                        // Always allow navigation to the page (do not redirect to pricing)
                                        // Page will handle feature gating / upgrade CTAs itself.
                                        item.onClick && item.onClick();
                                        onClose?.();
                                    }}
                                >
                                    <i className={`bi ${item.icon}`}></i>
                                    {item.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
}

export function DashboardTicketSidebar({ isMobileOpen, onClose, userPackage }) {
    const navigate = useNavigate();
    const location = useLocation();

    const goToHome = () => {
        navigate("/eventsDashboard");
        onClose?.();
    };
    const goToManage = () => {
        navigate("/manage_my_event");
        onClose?.();
    };
    const goToInvitations = () => {
        navigate("/invitationPage");
        onClose?.();
    };
  
    const goToAttendanceStats = () => {
        navigate("/attendance_stats");
        onClose?.();
    };
    const goToGuest = () => {
        navigate("/guest_insights");
        onClose?.();
    };

    const canViewAttendance = userPackage ? canUseFeature(userPackage, "attendanceStats") : true;

    const navigationItems = [
        {
            section: 'Event Planning',
            items: [
                { path: '/eventsDashboard', icon: 'bi-house', label: 'Dashboard', onClick: goToHome },
                { path: '/manage_my_event', icon: 'bi-megaphone', label: 'Publish Event', onClick: goToManage },
                { path: '/invitationPage', icon: 'bi-send', label: 'Send Invitations', onClick: goToInvitations },
               
            ]
        },
        {
            section: 'Event Analytics',
            items: [
                { path: '/attendance_stats', icon: 'bi-graph-up', label: 'Attendance Stats', onClick: goToAttendanceStats, disabled: !canViewAttendance },
                { path: '/guest_insights', icon: 'bi-people', label: 'Guest Insights', onClick: goToGuest }
            ]
        }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Overlay — only on mobile */}
            {isMobileOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            {/* Sidebar — THIS LINE IS THE FIX */}
            <div className={`dashboard-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-header">
                    <h3>Event Management</h3>
                </div>

                {navigationItems.map((section, index) => (
                    <div key={index} className="sidebar-section">
                        <h4>{section.section}</h4>
                        <ul>
                            {section.items.map((item, itemIndex) => (
                                <li
                                    key={itemIndex}
                                    className={`${isActive(item.path) ? "active" : ""} ${item.disabled ? 'disabled-nav' : ''}`}
                                    onClick={() => {
                                        // Always allow navigation to the page (do not redirect to pricing)
                                        // Page will handle feature gating / upgrade CTAs itself.
                                        item.onClick && item.onClick();
                                        onClose?.();
                                    }}
                                >
                                    <i className={`bi ${item.icon}`}></i>
                                    {item.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
}