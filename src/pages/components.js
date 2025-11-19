import '../App.css';
import '../alert.css';
import { useEffect, useState, useRef } from "react"
import { NavLink } from "react-router-dom";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";

// Import your pages
import Index from './index';
import Features from '../pages/feature';
import Pricing from '../pages/pricing';
import About from '../pages/about';
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
import Support from '../pages/support';
import AttendanceStats from './planner/attendance_stats';
import SecurityQuestionsModal from './SecurityQuestionsModal';
import GuestInsights from './planner/guest_insights';
import GuestMessageView from './guestMessageView';
import ReportEvent from './ReportEvent';

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
                <Route path="/about" element={<About />} />
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
                <Route path="/support" element={<Support />} />
                <Route path="/attendance_stats" element={<AttendanceStats />} />
                <Route path="/guest_insights" element={<GuestInsights />} />
                <Route path="/guestMessageView" element={<GuestMessageView />} />
                <Route path="/report-event" element={<ReportEvent />} />
                <Route path="/security-questions" element={<SecurityQuestionsModal />} />
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

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <>
            <section className={`nav-section d-none d-md-block ${scrolled ? "scrolled" : ""}`}>
                <div className="container">
                    <div className="row bottom-nav-row">
                        <div className="col-md-3 logo-container">
                            <a href="/">
                                <img src="/images/logo.png" alt="Eventa Logo" className="logo img-fluid" />
                            </a>                        </div>
                        <div className="col-md-6">
                            <ul className="nav-list nav ">
                                <li className="nav-item">
                                    <NavLink
                                        to="/"
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? "active" : ""}`
                                        }
                                        end
                                    >
                                        Home
                                    </NavLink>
                                </li>
                                <li className="nav-item">
                                    <NavLink
                                        to="/feature"
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? "active" : ""}`
                                        }
                                    >
                                        Features
                                    </NavLink>
                                </li>
                                <li className="nav-item">
                                    <NavLink
                                        to="/pricing"
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? "active" : ""}`
                                        }
                                    >
                                        Pricing
                                    </NavLink>
                                </li>
                                <li className="nav-item">
                                    <NavLink
                                        to="/about"
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? "active" : ""}`
                                        }
                                    >
                                        About Us
                                    </NavLink>
                                </li>

                                <li className="nav-item">
                                    <NavLink
                                        to="/sales"
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? "active" : ""}`
                                        }
                                    >
                                        Sales
                                    </NavLink>
                                </li>
                                <li className="nav-item">
                                    <NavLink
                                        to="/support"
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? "active" : ""}`
                                        }
                                    >
                                        Support
                                    </NavLink>
                                </li>
                            </ul>
                        </div>
                        <div className="col-md-3  btns-container">
                            <button className="btn signin-btn" onClick={onLoginClick}>
                                <i className="bi bi-person-fill "></i> Sign In
                            </button>
                            <button className="btn signup-btn" onClick={onSignupClick}>
                                <i className="bi bi-person-plus-fill "></i> Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile Navigation */}
            <section className={`mobile-nav-section d-md-none ${scrolled ? "scrolled" : ""}`}>
                <div className="container-fluid">
                    <div className="row align-items-center py-2">
                        <div className="col-6">
                            <a href="/">
                                <img src="/images/logo.png" alt="Eventa Logo" className="mobile-logo img-fluid" />
                          </a>                        </div>
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

                {/* Mobile Menu Dropdown */}
                <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                    <div className="container-fluid">
                        <ul className="mobile-nav-list">
                            <li className="mobile-nav-item">
                                <NavLink
                                    to="/"
                                    className={({ isActive }) =>
                                        `mobile-nav-link ${isActive ? "active" : ""}`
                                    }
                                    end
                                    onClick={toggleMobileMenu}
                                >
                                    Home
                                </NavLink>
                            </li>
                            <li className="mobile-nav-item">
                                <NavLink
                                    to="/feature"
                                    className={({ isActive }) =>
                                        `mobile-nav-link ${isActive ? "active" : ""}`
                                    }
                                    onClick={toggleMobileMenu}
                                >
                                    Features
                                </NavLink>
                            </li>
                            <li className="mobile-nav-item">
                                <NavLink
                                    to="/pricing"
                                    className={({ isActive }) =>
                                        `mobile-nav-link ${isActive ? "active" : ""}`
                                    }
                                    onClick={toggleMobileMenu}
                                >
                                    Pricing
                                </NavLink>
                            </li>
                            <li className="mobile-nav-item">
                                <NavLink
                                    to="/about"
                                    className={({ isActive }) =>
                                        `mobile-nav-link ${isActive ? "active" : ""}`
                                    }
                                    onClick={toggleMobileMenu}
                                >
                                    About Us
                                </NavLink>
                            </li>
                            <li className="mobile-nav-item">
                                <NavLink
                                    to="/support"
                                    className={({ isActive }) =>
                                        `mobile-nav-link ${isActive ? "active" : ""}`
                                    }
                                    onClick={toggleMobileMenu}
                                >
                                    Support
                                </NavLink>
                            </li>
                            <div className="mobile-buttons">
                                <button className="btn mobile-signin-btn" onClick={onLoginClick}>
                                    <i className="bi bi-person-fill me-2"></i> Sign In
                                </button>
                                <button className="btn mobile-signup-btn" onClick={onSignupClick}>
                                    <i className="bi bi-person-plus-fill me-2"></i> Sign Up
                                </button>
                            </div>
                        </ul>
                    </div>
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
                            Evenda is the smarter way to plan and manage your events. Whether it's a wedding, birthday, corporate gathering,
                            or casual hangout, Evenda makes it simple to create invitations, track RSVPs, and keep guests engaged — all in one place.
                        </p>
                    </div>
                    <div className="col-lg-2">
                        <h5>Quick Links</h5>
                        <ul className="list-quick-links">
                            <li><a href="/">Home</a></li>
                            <li><a href="/">Features</a></li>
                            <li><a href="/">Pricing</a></li>
                            <li><a href="/">About Us</a></li>
                            <li><a href="/">Support</a></li>
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
                                <i className="bi bi-envelope-fill"></i> info@evenda.co.za
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
                            <a href="/" className="me-3"><i className="bi bi-facebook"></i></a>
                            <a href="/" className="me-3"><i className="bi bi-twitter"></i></a>
                            <a href="/" className="me-3"><i className="bi bi-instagram"></i></a>
                            <a href="/"><i className="bi bi-linkedin"></i></a>
                        </div>
                    </div>
                </div>

            </div>
            <div className="row bottom-footer-row">
                <div className="col text-center">
                    <p className="mb-0">© 2025 Evenda. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export function LoginNav() {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    const craeteEventClicked = () => {
        navigate("/activeEventDetails");
    }

    const goToProfile = () => {
        navigate("/Profile");
    }
    const goToDashboared = () => {
        navigate("/eventsDashboard");
    }

    const toggleDropdown = () => {
        setDropdownOpen(prev => !prev);
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <nav className="eventsNavbar">
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-lg-2">
                        <div className="logo-placeholder">
                            <img src="/images/logo.png" alt="Logo" className="logo-img" />
                        </div>
                    </div>

                    <div className="col-lg-10 navbar-right">
                        <button className="btn btn-createEvevt" onClick={craeteEventClicked}>New Event</button>

                        <div
                            ref={dropdownRef}
                            className={`profile-container ${dropdownOpen ? "open" : ""}`}
                            onClick={toggleDropdown}
                        >
                            <i className="bi bi-person-circle"></i>
                            <span>{user ? user.name : "Guest"}</span>
                            <i className="bi bi-chevron-bar-down"></i>

                            {dropdownOpen && (
                                <div className="dropdown-menu"> 
                                    <button onClick={goToDashboared} className="dropdown-item">
                                        <i className="bi bi-grid-fill"></i> Dashboared
                                    </button>
                                    <button onClick={goToProfile} className="dropdown-item">
                                        <i className="bi bi-person"></i> Profile
                                    </button>
                                    <button className="dropdown-item" onClick={logOut}>
                                        <i className="bi bi-box-arrow-right"></i> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>

    );
}

export function Login({ isOpen, onClose, defaultMode = "login" }) {
    const [isLogin, setIsLogin] = useState(defaultMode === "login");
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        lastname: '',
        password: '',
        confirmPassword: ''
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
            setFormData({
                name: '',
                email: '',
                lastname: '',
                password: '',
                confirmPassword: ''
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
                apiUrl = "http://sellytlou-001-site1.ltempurl.com/api";
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
                formDataToSend.append("name", formData.name);
                formDataToSend.append("lastname", formData.lastname);
                formDataToSend.append("email", formData.email);
                formDataToSend.append("password", formData.password);
            }


            console.log("Sending request to:", API_URL);
            const url = `${API_URL}/query.php`;

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
                        navigate("/eventsDashboard");
                    }

                    onClose();
                    printAlert("Login successful!", 'success');
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

                    printAlert("Account created successfully! Sending verification email...", 'success');

                    const verificationResult = await sendVerificationEmail(formData.email, formData.name);

                    if (verificationResult.success) {
                        printAlert("Verification email sent! Please check your inbox.", 'success');
                    } else {
                        printAlert("Account created but failed to send verification email. Please use the resend option.", 'error');
                    }

                    setFormData({
                        name: '',
                        email: '',
                        lastname: '',
                        password: '',
                        confirmPassword: ''
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
            printAlert(`Error: ${error.message}`, 'error');
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
        setFormData({
            name: '',
            email: '',
            lastname: '',
            password: '',
            confirmPassword: ''
        });
        setNeedsVerification(false);
        setUnverifiedEmail('');
        setSecurityAnswers(null);
    };

    const closeAlert = () => {
        setAlert({ show: false, message: '', type: '' });
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
                    <p>{isLogin ? 'Sign in to your Evenda account' : 'Join Evenda to start planning your events'}</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="name">Firstname</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required={!isLogin}
                                placeholder="Enter your Firstname"
                            />
                        </div>
                    )}
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="lastname">Lastname</label>
                            <input
                                type="text"
                                id="lastname"
                                name="lastname"
                                value={formData.lastname}
                                onChange={handleInputChange}
                                required={!isLogin}
                                placeholder="Enter your Lastname"
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
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
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required={!isLogin}
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
                        {loading ? 'Please Wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
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

    // Close dropdown when clicking outside
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
                <h1 className="d-none d-md-block">Evenda</h1>
            </div>

            <div className="header-tabs">
                <button className={`status-btn status-${eventStatus?.toLowerCase() || 'draft'}`}>
                    {eventStatus || 'Draft'}
                </button>
                <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                    <i className="bi bi-person-circle"></i>
                    <span>{user?.name || "Guest"}</span>
                    <i className="bi bi-chevron-bar-down"></i>
                    {dropdownOpen && (
                        <div className="dropdown-menu show">
                            <button className="dropdown-item" onClick={goToProfile}>
                                <i className="bi bi-person"></i>Profile
                            </button>
                            <button className="dropdown-item" onClick={logOut}>
                                <i className="bi bi-box-arrow-right"></i>Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function DashboardSidebar({ isMobileOpen, onClose }) {
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

    const navigationItems = [
        {
            section: 'Event Planning',
            items: [
                { path: '/eventsDashboard', icon: 'bi-house', label: 'Dashboard', onClick: goToHome },
                { path: '/manage_my_event', icon: 'bi-megaphone', label: 'Publish Event', onClick: goToManage },
                { path: '/invitationPage', icon: 'bi-send', label: 'Send Invitations', onClick: goToInvitations },
                { path: '/eventManagement', icon: 'bi-list-check', label: 'RSVP Responses', onClick: goToEventManagement }
            ]
        },
        {
            section: 'Event Analytics',
            items: [
                { path: '/attendance_stats', icon: 'bi-graph-up', label: 'Attendance Stats', onClick: goToAttendanceStats },
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
                                    className={isActive(item.path) ? "active" : ""}
                                    onClick={item.onClick}
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