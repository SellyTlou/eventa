import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./email_verify.css";

const EmailVerify = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(emailParam);
            verifyEmail(emailParam);
        } else {
            setStatus("error");
            setMessage("Invalid verification link. Please try again.");
            setLoading(false);
        }
    }, [navigate, searchParams]);

    const verifyEmail = async (email) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const fd = new FormData();
            fd.append("email", email);
            fd.append("function", "userRegEmailVerify");

            const resp = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: fd,
            });

            const data = await resp.json();

            if (data.success) {
                setStatus("success");
                setMessage(data.message || "Email verified successfully! You can now log in.");
            } else {
                setStatus("error");
                setMessage(data.message || "Verification failed. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            setStatus("error");
            setMessage("Server error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleNavigateToLogin = () => {
        navigate("/");
    };

    const handleRetry = () => {
        setLoading(true);
        setStatus("verifying");
        verifyEmail(email);
    };

    return (
        <div className="verify-container">
            <div className="verify-card">
                <h2>Email Verification</h2>

                {status === "verifying" && (
                    <div className="verifying-state">
                        <p>We're verifying your email address</p>
                        <div className="email-display">{email}</div>
                        <div className="loader"></div>
                        <div className="verifying-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <p className="verifying-text">Please wait while we confirm your email address...</p>
                        <div className="verifying-progress">
                            <div className="verifying-progress-bar"></div>
                        </div>
                    </div>
                )}

                {status === "success" && (
                    <>
                        <div className="status-icon success">✓</div>
                        <p className="success-message">{message}</p>
                        <button
                            onClick={handleNavigateToLogin}
                            className="btn btn-success"
                        >
                            Go to Login
                        </button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="status-icon error">✕</div>
                        <p className="error-message">{message}</p>
                        <div className="button-group">
                            <button
                                onClick={handleRetry}
                                className="btn btn-retry"
                                disabled={loading}
                            >
                                {loading ? "Retrying..." : "Try Again"}
                            </button>
                            <button
                                onClick={handleNavigateToLogin}
                                className="btn btn-secondary"
                            >
                                Go to Login
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmailVerify;