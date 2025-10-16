import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./forgot_password.css";

const ForgotPassword = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(emailParam);
        } else {
            alert("Something went wrong. Please try again.");
            navigate("/");
        }
    }, [navigate, searchParams]);

    const validatePassword = (password) => {
        const regex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        return regex.test(password);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            alert("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (!validatePassword(password)) {
            alert(
                "Password must be at least 6 characters long and include uppercase, lowercase, number, and special character."
            );
            return;
        }

        setLoading(true);

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const fd = new FormData();
            fd.append("email", email);
            fd.append("new_password", password);
            fd.append("function", "update_password");

            const resp = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: fd,
            });

            const data = await resp.json();

            if (data.success) {
                alert("Password reset successful! You can now log in.");
                navigate("/");
            } else {
                alert(` ${data.message}`);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Server error. Please try again later.");

        } finally {
            setLoading(false); 
        }
    };

    return (
        <div className="forgot-container">
            <div className="forgot-card">
                <h2>Reset Password</h2>
                <p>Enter a new password for: <strong>{email}</strong></p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group password-group">
                        <label>New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                    <div className="form-group password-group">
                        <label>Confirm Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength="6"
                            />
                            <span
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? "🙈" : "👁️"}
                            </span>
                        </div>
                    </div>

                    <button type="submit" className="reset-btn" disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                {loading && <div className="loader"></div>}
            </div>
        </div>
    );
};

export default ForgotPassword;
 