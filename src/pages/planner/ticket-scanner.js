import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./TicketScanner.css";

const TicketScanner = () => {
    const scannerInstance = useRef(null);
    const isMounted = useRef(true);
    const SCANNER_ID = "qr-scanner-container";

    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [manualId, setManualId] = useState("");
    const [activeTicketId, setActiveTicketId] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));

        return () => {
            isMounted.current = false;

            if (scannerInstance.current) {
                scannerInstance.current.stop().catch(() => {});
                scannerInstance.current.clear().catch(() => {});
                scannerInstance.current = null;
            }
        };
    }, []);

    // ---------------- STOP SCANNER ----------------
    const stopScanner = async () => {
        if (!scannerInstance.current) {
            setScanning(false);
            return;
        }

        try {
            await scannerInstance.current.stop().catch(() => {});
            await scannerInstance.current.clear().catch(() => {});
        } catch {}

        scannerInstance.current = null;
        setScanning(false);

        const container = document.getElementById(SCANNER_ID);
        if (container) container.innerHTML = "";
    };

    // ---------------- VERIFY TICKET ----------------
    const verifyTicket = async (ticketId) => {
        setLoading(true);
        setError("");
        setResult(null);
        setActiveTicketId(null);
        setSuccessMsg("");

        try {
            const userId =
                user?.user_id ||
                JSON.parse(localStorage.getItem("user"))?.user_id;
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new URLSearchParams();
            formData.append("function", "verify_ticket");
            formData.append("ticket_id", ticketId);
            formData.append("user_id", userId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.message || "Invalid ticket");
                setLoading(false);
                return;
            }

            setResult(data.ticket);
            setActiveTicketId(ticketId);
        } catch (err) {
            setError("Server error while verifying ticket");
        } finally {
            setLoading(false);
        }
    };

    // ---------------- USE TICKET ----------------
    const useTicket = async () => {
        if (!activeTicketId) return;

        setLoading(true);
        setError("");
        setSuccessMsg("");

        try {
            const userId =
                user?.user_id ||
                JSON.parse(localStorage.getItem("user"))?.user_id;
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new URLSearchParams();
            formData.append("function", "use_ticket");
            formData.append("ticket_id", activeTicketId);
            formData.append("user_id", userId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMsg("🎉 Ticket successfully marked as USED");
                setResult(null);
                setActiveTicketId(null);
            } else {
                setError(data.message || "Failed to use ticket");
            }
        } catch (err) {
            setError("Server error while using ticket");
        } finally {
            setLoading(false);
        }
    };

    // ---------------- LOGOUT ----------------
    const logOut = async () => {
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
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

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
    };

    // ---------------- START SCANNER ----------------
    const startScanner = async () => {
        setError("");
        setLoading(true);

        try {
            await stopScanner();

            const scanner = new Html5Qrcode(SCANNER_ID);
            scannerInstance.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: 250,
                },
                (decodedText) => {
                    console.log("QR:", decodedText);

                    scanner.stop()
                        .then(() => scanner.clear())
                        .catch(() => {})
                        .finally(() => {
                            scannerInstance.current = null;
                            setScanning(false);
                            verifyTicket(decodedText);
                        });
                }
            );

            setScanning(true);
        } catch (err) {
            setError("Camera failed to start");
        } finally {
            setLoading(false);
        }
    };

    // ---------------- MANUAL SEARCH ----------------
    const handleManualLookup = () => {
        if (!manualId.trim()) {
            setError("Enter booking ID");
            return;
        }

        verifyTicket(manualId.trim());
    };

    // ---------------- RESET ----------------
    const reset = () => {
        setResult(null);
        setError("");
        setManualId("");
        setSuccessMsg("");
        setActiveTicketId(null);
    };

    const clearAllLocalStorage = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("selectedEventId");
        localStorage.removeItem("selectedPackageId");
        localStorage.removeItem("eventStatus");

        const deviceId = localStorage.getItem("eventa_device_id");
        if (deviceId) {
            localStorage.removeItem(`eventa_${deviceId}_current_event`);
        }
    };

    return (
        <section className="ticket-scanner-page">
        
            <header className="header">
                <div className="header-left">
                    <span className="logo">🎫</span>
                    <span className="brand">Event Scanner</span>
                </div>
                <div className="header-right">
                    {user && (
                        <div className="user-info">
                            <span className="user-icon">👤</span>
                            <span className="user-name">{user.name || user.username || "User"}</span>
                        </div>
                    )}
                    <button onClick={logOut} className="logout-btn">
                        🚪 Logout
                    </button>
                </div>
            </header>

            {/* Scanner Content */}
            <div className="scanner-container">
                <h2>🎫 Ticket Scanner</h2>

                <p className="subtext">
                    {scanning ? "Scanning QR..." : "Start scanner or use manual lookup"}
                </p>

                {/* CAMERA */}
                <div id={SCANNER_ID} className="camera-box"></div>

                {/* CONTROLS */}
                <div className="btn-group">
                    {!scanning ? (
                        <button onClick={startScanner} className="btn green">
                            📷 Start Scanner
                        </button>
                    ) : (
                        <button onClick={stopScanner} className="btn red">
                            ⏹ Stop
                        </button>
                    )}
                </div>

                {/* MANUAL */}
                <div className="manual-box">
                    <h4>🔎 Manual Lookup</h4>

                    <input
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Enter Booking ID"
                    />

                    <button onClick={handleManualLookup} className="btn blue">
                        Search
                    </button>
                </div>

                {/* ERROR */}
                {error && <div className="error">{error}</div>}

                {/* SUCCESS */}
                {successMsg && <div className="success">{successMsg}</div>}

                {/* LOADING */}
                {loading && <div className="loading">Processing...</div>}

                {/* RESULT */}
                {result && (
                    <div className="ticket-box">
                        <h3>✅ Ticket Valid</h3>

                        <p><b>Event:</b> {result.event_name}</p>
                        <p><b>Name:</b> {result.customer_name}</p>
                        <p><b>Email:</b> {result.customer_email}</p>
                        <p><b>Type:</b> {result.ticket_type}</p>
                        <p><b>Qty:</b> {result.quantity}</p>
                        <p><b>Date:</b> {result.event_date}</p>
                        <p><b>Time:</b> {result.event_time}</p>
                        <p><b>Location:</b> {result.location}</p>

                        {activeTicketId && (
                            <button onClick={useTicket} className="btn orange full">
                                ✔ Mark as USED
                            </button>
                        )}

                        <button onClick={reset} className="btn green full">
                            🔄 Scan Next
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default TicketScanner;