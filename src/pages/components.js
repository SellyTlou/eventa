import '../App.css';
import { useEffect, useState, useRef } from "react"
import { NavLink } from "react-router-dom";
import { useNavigate, Routes, Route } from "react-router-dom";

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

const clearAllLocalStorage = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("selectedEventId");
    localStorage.removeItem("selectedPackageId");
    localStorage.removeItem("eventStatus");
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
                <Route path="/createevent" element={<CreateEvent />} />
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
                <Route path="/packagePayment" element={<PackagePayment />} />
                <Route path="/forgot_password" element={<ForgotPassword />} />
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
                    <div className="row bottom-nav-row align-items-center py-3">
                        <div className="col-md-3 logo-container">
                            <img src="/images/logo.png" alt="Eventa Logo" className="logo img-fluid" />
                        </div>
                        <div className="col-md-6">
                            <ul className="nav-list nav justify-content-center">
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
                        <div className="col-md-3 text-end btns-container">
                            <button className="btn signin-btn" onClick={onLoginClick}>
                                <i className="bi bi-person-fill me-2"></i> Sign IN
                            </button>
                            <button className="btn signup-btn" onClick={onSignupClick}>
                                <i className="bi bi-person-plus-fill me-2"></i> Sign Up
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
                            <img src="/images/logo.png" alt="Eventa Logo" className="mobile-logo img-fluid" />
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
                        <img src="/images/logo.png" alt="Eventa Logo" className="footer-logo img-fluid mb-3" />
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
                                <div className="dropdown-menu show">

                                    <button onClick={goToProfile} className="dropdown-item">

                                        <i className="bi bi-person"></i>Profile
                                    </button>
                                    <button className="dropdown-item">
                                        <i className="bi bi-gear"></i>Settings
                                    </button>
                                    <button className="dropdown-item" onClick={logOut}>
                                        <i className="bi bi-box-arrow-right"></i>Logout
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

    const navigate = useNavigate();

    if (!isOpen) return null;

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
        const API_URL = process.env.REACT_APP_API_URL;
        const formDataToSend = new FormData();


        if (isLogin) {
            formDataToSend.append("function", "login");
            formDataToSend.append("email", formData.email);
            formDataToSend.append("password", formData.password);
        } else {
            if (formData.password !== formData.confirmPassword) {
                alert("Passwords don't match!");
                return;
            }
            formDataToSend.append("function", "register");
            formDataToSend.append("name", formData.name);
            formDataToSend.append("lastname", formData.lastname);
            formDataToSend.append("email", formData.email);
            formDataToSend.append("password", formData.password);
        }

        try {
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formDataToSend
            });

            const result = await response.json();

            if (result.success) {
                if (isLogin) {

                    localStorage.setItem("user", JSON.stringify(result.user));

                    const isAdmin = result.user.role === "admin" ||
                        (result.user.roles && result.user.roles.includes("admin"));

                    if (isAdmin) {
                        navigate("/adminDashboard");
                    } else {
                        navigate("/eventsDashboard");
                    }

                    onClose();
                } else {
                    alert("Account created! Please login.");
                    setIsLogin(true);
                }
            } else {
                alert(result.message || "Something went wrong!");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Server error, please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setLoading(true);
        if (!formData.email) {
            alert("Please enter your email address first.");
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
                alert(`✅ ${data.message}`);
            } else {
                alert(`❌ ${data.message}`);
            }
        } catch (err) {
            console.error("Error:", err);
            alert("Something went wrong. Please try again later.");
        } finally {
            setLoading(false);
        }
    };


    const switchMode = () => {
        setIsLogin(!isLogin);
        setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
    };

    if (loading) {
        return (
            <>
                <div className="loading-container">
                    <div className="spinner-border text-info" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="loading-text">Loading please wait</div>
                </div>
            </>
        );
    }

    return (
        <div className="login-popup-overlay" onClick={onClose}>
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
                            <label htmlFor="email">Lastname</label>
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
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    <button type="submit" className="login-submit-btn">
                        {isLogin ? 'Sign In' : 'Create Account'}
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



