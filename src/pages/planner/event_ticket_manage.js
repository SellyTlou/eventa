import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import "../../alert.css";
import { useNavigate } from "react-router-dom";
import { logOut, DashboardHeader, DashboardTicketSidebar } from "../components";
import RSVPBinaryTree from "../utils/RSVPTree";
import jsPDF from "jspdf";

// Import autoTable function
import autoTable from "jspdf-autotable";

const TicketEventManage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [eventStatus, setEventStatus] = useState("");
    const [selectedGuests, setSelectedGuests] = useState(new Set());
    const [bulkActionOpen, setBulkActionOpen] = useState(false);
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [messageContent, setMessageContent] = useState("");
    const [messageType, setMessageType] = useState("bulk");
    const [selectedGuestForMessage, setSelectedGuestForMessage] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [bst, setBST] = useState(null);
    const [filteredResponses, setFilteredResponses] = useState([]);
    const [userPackage, setUserPackage] = useState(null);
    const [packageInfo, setPackageInfo] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedGuestDetails, setSelectedGuestDetails] = useState(null);
    const [filterType, setFilterType] = useState("all");
    const bulkActionRef = useRef(null);
    const navigate = useNavigate();

    // Currency formatter
    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return "R0.00";
        const num = parseFloat(amount);
        return `R${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    };

    // Check if package is basic or not
    const isBasicPackage = () => {
        if (!userPackage) return true; // Default to basic if no package

        // Check package_type field
        const packageType = userPackage.package_type?.toLowerCase();
        return packageType === "basic" || packageType === "free" || !packageType;
    };

    // Check if package allows export (not basic)
    const canExport = !isBasicPackage();

    // Check if package allows bulk messaging (not basic)
    const canBulkMessage = !isBasicPackage();

    // Get package display name
    const getPackageDisplayName = () => {
        if (!userPackage) return "No Package";

        // Use package_name if available, otherwise use package_type
        if (userPackage.package_name) {
            return userPackage.package_name;
        }

        // Format package_type for display
        const packageType = userPackage.package_type;
        if (!packageType) return "Basic";

        return packageType.charAt(0).toUpperCase() + packageType.slice(1);
    };

    // Get package color
    const getPackageColor = () => {
        const packageType = userPackage?.package_type?.toLowerCase();

        switch (packageType) {
            case "basic":
            case "free":
                return "#6c757d"; // Gray
            case "premium":
                return "#007bff"; // Blue
            case "advanced":
            case "enterprise":
                return "#28a745"; // Green
            case "professional":
                return "#6610f2"; // Purple
            default:
                return "#6c757d"; // Gray for unknown
        }
    };

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message: message, type: type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: null,
        onCancel: null
    });

    // Custom confirmation helper
    const showConfirm = (title, message, onConfirm, onCancel) => {
        setConfirmModal({
            show: true,
            title: title,
            message: message,
            onConfirm: onConfirm,
            onCancel: onCancel || (() => setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null }))
        });
    };

    const handleConfirm = () => {
        if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
    };

    const handleCancel = () => {
        if (confirmModal.onCancel) {
            confirmModal.onCancel();
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
    };

useEffect(() => {
    const savedData = localStorage.getItem("selectedEventData");
    const storedUser = localStorage.getItem("user");
    
    if (savedData && storedUser) {
        const userData = JSON.parse(storedUser);
        const eventData = JSON.parse(savedData);

        setUser(userData);
        
        fetchEventStatusByID(eventData.eventId, eventData.hasTicket);
        getBookingDetails(eventData.eventId);
        fetchUserPackage();
    } 
    
    if (!savedData) {
        // Check account type before navigating to dashboard
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            const accountType = userData?.account_type || userData?.accountType;
            
            // Navigate based on account type
            if (accountType === 'business') {
                navigate("/businessdashboard");
            } else {
                navigate("/eventsDashboard");
            }
        } else {
            navigate("/eventsDashboard");
        }
    }
    
    if (!storedUser) {
        printAlert("Session expired. Please log in again.", "error");
        logOut();
        navigate("/");
        return;
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  

    useEffect(() => {
        if (bst) {
            filterBookings();
        }
    }, [searchTerm, filterType, bst]);

    const handleClickOutside = (event) => {
        if (bulkActionRef.current && !bulkActionRef.current.contains(event.target)) {
            setBulkActionOpen(false);
        }
    };

  const fetchEventStatusByID = async (eventId, isTicketEvent) => {
    try {
        const API_URL = process.env.REACT_APP_API_URL;
        const formData = new FormData();
        
        if (isTicketEvent) {
            formData.append("function", "getTicketEventStatusByID");
        } else {
            formData.append("function", "getEventStatusByID");
        }
        
        formData.append("event_id", eventId);

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData,
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        console.log("Event status response:", data);
        
        if (data.success && data.status) {
            if (isTicketEvent) {
                const statusValue = data.status.status;
                if (statusValue === 'published') {
                    setEventStatus("Published");
                } else if (statusValue === 'pending') {
                    setEventStatus("Pending");
                } else if (statusValue === 'cancelled') {
                    setEventStatus("Cancelled");
                } else if (statusValue === 'completed') {
                    setEventStatus("Completed");
                } else {
                    setEventStatus("Unknown");
                }
            } else {
                // For regular events, published is 0 or 1
                setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
            }
        } else {
            setEventStatus("Unknown");
        }
    } catch (err) {
        console.error("Failed to fetch event status:", err);
        setEventStatus("Unknown");
    }
};

  const fetchUserPackage = async () => {
    try {
        const API_URL = process.env.REACT_APP_API_URL;
        const userData = JSON.parse(localStorage.getItem("user"));
        
        // Get account type from user data
        const accountType = userData.account_type || userData.accountType || 'personal';
        
        const formData = new FormData();
        formData.append("function", "getUserPackage");
        formData.append("user_id", userData.user_id);
        formData.append("account_type", accountType); 

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        
        console.log("User package response:", data); // Debug log

        if (data.success && data.userPackage) {
            setUserPackage(data.userPackage);
            
            // Get package features based on package_type
            const packageFeatures = getPackageFeatures(data.userPackage.package_type);
            const packageColor = getPackageColor(data.userPackage.package_type);
            
            // Create package info object
            const packageInfo = {
                name: data.userPackage.package_name ||
                    (data.userPackage.package_type ?
                        data.userPackage.package_type.charAt(0).toUpperCase() +
                        data.userPackage.package_type.slice(1) : "Basic"),
                type: data.userPackage.package_type || "basic",
                color: packageColor,
                features: packageFeatures,
                event_limit: data.userPackage.event_limit || data.userPackage.max_events || 0,
                event_used: data.userPackage.event_used || 0
            };
            setPackageInfo(packageInfo);
            
            console.log("Package loaded:", packageInfo); // Debug log
        } else {
            console.log("No package found:", data.message);
            printAlert("You don't have an active package", "warning");
            setUserPackage({ package_type: "basic" });
            setPackageInfo({
                name: "Basic",
                type: "basic",
                color: "#6c757d",
                features: ["Basic features only"],
                event_limit: 0,
                event_used: 0
            });
        }
    } catch (error) {
        console.error("Error fetching user package:", error);
        printAlert("System error fetching user package", "error");
        // Default to basic on error
        setUserPackage({ package_type: "basic" });
        setPackageInfo({
            name: "Basic",
            type: "basic",
            color: "#6c757d",
            features: ["Basic features only"],
            event_limit: 0,
            event_used: 0
        });
    }
};

    // Helper to get package features based on type
    const getPackageFeatures = (packageType) => {
        const type = packageType?.toLowerCase();

        switch (type) {
            case "basic":
            case "free":
                return ["Basic event management", "RSVP tracking", "Basic analytics"];
            case "premium":
                return ["All Basic features", "Export to PDF", "Bulk messaging", "Advanced analytics"];
            case "advanced":
            case "enterprise":
                return ["All Premium features", "Priority support", "Custom integrations", "Advanced security"];
            case "professional":
                return ["All Premium features", "Custom branding", "API access", "Dedicated support"];
            default:
                return ["Basic features only"];
        }
    };

    const sendMessage = async () => {
        if (messageType === 'bulk' && !canBulkMessage) {
            const packageName = getPackageDisplayName();
            showConfirm(
                'Bulk Messaging Locked',
                `Bulk messaging (2+ recipients) is not available on your ${packageName} plan. 
                
Upgrade to a premium package to unlock:
• Bulk messaging to multiple guests
• Export booking data to PDF
• Advanced guest management`,
                () => navigate('/pricing'),
                () => setMessageModalOpen(false)
            );
            return;
        }
        if (!messageContent.trim()) {
            printAlert("Please enter a message", "warning");
            return;
        }

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const eventId = localStorage.getItem("selectedEventId");

            const formData = new FormData();
            formData.append("function", "sendGuestMessage");
            formData.append("message", messageContent);
            formData.append("API_URL", API_URL);
            formData.append("event_id", eventId);

            let guestIds;
            if (messageType === "bulk") {
                guestIds = Array.from(selectedGuests).join(",");
            } else {
                guestIds = selectedGuestForMessage.guest_id.toString();
            }

            formData.append("guest_ids", guestIds);
            formData.append("user_id", user?.user_id || '');

            const response = await fetch(`${API_URL}/send_message_to_guest.php`, { method: "POST", body: formData });
            const data = await response.json();

            if (data.success) {
                const recipientCount = messageType === "bulk" ? selectedGuests.size : 1;
                printAlert(`Message sent to ${recipientCount} guest(s)`, "success");
                setMessageModalOpen(false);
                setMessageContent("");
                setSelectedGuestForMessage(null);
                setSelectedGuests(new Set());
            } else {
                printAlert(`Failed to send message: ${data.message}`, "error");
            }
        } catch (error) {
            console.error(error);
            printAlert("Error sending message", "error");
        }
    };

    const openIndividualMessage = (guest) => {
        setSelectedGuestForMessage(guest);
        setMessageType("individual");
        setMessageContent("");
        setMessageModalOpen(true);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    const getBookingDetails = async (eventId) => {
        setLoading(true);
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getBookingDetails");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const data = await response.json();

            if (data.success && data.responses) {
                const tree = new RSVPBinaryTree();
                tree.bulkInsert(data.responses);
                setBST(tree);
                setFilteredResponses(tree.toArray());
                setEventData(data.event || null);
            } else {
                setFilteredResponses([]);
                setEventData(null);
            }
        } catch (err) {
            console.error(err);
            setFilteredResponses([]);
            setEventData(null);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectGuest = (guestId) => {
        const newSelected = new Set(selectedGuests);
        if (newSelected.has(guestId)) {
            newSelected.delete(guestId);
        } else {
            newSelected.add(guestId);
        }
        setSelectedGuests(newSelected);
    };

    const selectAllGuests = () => {
        if (selectedGuests.size === filteredResponses.length) {
            setSelectedGuests(new Set());
        } else {
            const allIds = filteredResponses.map(guest => guest.bookingId || guest.guest_id);
            setSelectedGuests(new Set(allIds));
        }
    };

    const openViewDetails = (guest) => {
        setSelectedGuestDetails(guest);
        setViewModalOpen(true);
    };

    const filterBookings = () => {
        if (!bst) return;

        let filtered = bst.toArray();

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(guest =>
                (guest.customer_first_name && guest.customer_first_name.toLowerCase().includes(term)) ||
                (guest.customer_last_name && guest.customer_last_name.toLowerCase().includes(term)) ||
                (guest.customer_email && guest.customer_email.toLowerCase().includes(term)) ||
                (guest.ticket_type && guest.ticket_type.toLowerCase().includes(term))
            );
        }

        // Apply payment status filter
        if (filterType !== "all") {
            filtered = filtered.filter(guest => guest.payment_status === filterType);
        }

        setFilteredResponses(filtered);
    };

    const exportToPDF = () => {
        // Check if user can export (not basic package)
        if (isBasicPackage()) {
            const packageName = getPackageDisplayName();
            showConfirm(
                'Export Feature Locked',
                `Exporting booking data is not available on your ${packageName} plan. 
                
Upgrade to a premium package to unlock:
• Export booking data to PDF
• Bulk messaging to guests
• Advanced guest management features`,
                () => navigate('/pricing'),
                null
            );
            return;
        }

        if (filteredResponses.length === 0) {
            printAlert("No booking data to export", "warning");
            return;
        }

        setExportLoading(true);
        try {
            const doc = new jsPDF();
            const eventName = eventData?.event_name || "Event";
            const date = new Date().toLocaleDateString();
            const packageName = getPackageDisplayName();

            // Title
            doc.setFontSize(18);
            doc.text(`${eventName} - Booking Details`, 14, 22);
            doc.setFontSize(11);
            doc.text(`Exported on: ${date}`, 14, 30);
            doc.text(`Total Bookings: ${filteredResponses.length}`, 14, 38);
            doc.text(`Exported by: ${user?.name || user?.email || 'User'}`, 14, 46);
            doc.text(`Package: ${packageName}`, 14, 54);

            // Calculate totals
            const totalRevenue = filteredResponses.reduce((sum, guest) =>
                sum + (parseFloat(guest.total_amount) || (parseFloat(guest.unit_price) * parseInt(guest.quantity))), 0);
            doc.text(`Total Revenue: R${totalRevenue.toFixed(2)}`, 14, 62);

            // Table data
            const tableData = filteredResponses.map(guest => [
                guest.customer_first_name + ' ' + guest.customer_last_name,
                guest.customer_email,
                guest.ticket_type_label || guest.ticket_type,
                guest.quantity,
                `R${(parseFloat(guest.total_amount) || (parseFloat(guest.unit_price) * parseInt(guest.quantity))).toFixed(2)}`,
                guest.payment_status,
                new Date(guest.created_at).toLocaleDateString()
            ]);

            // Use autoTable function directly - FIXED
            autoTable(doc, {
                head: [['Name', 'Email', 'Ticket Type', 'Qty', 'Amount', 'Status', 'Date']],
                body: tableData,
                startY: 72,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 15 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 20 },
                    6: { cellWidth: 25 }
                },
                didDrawPage: function (data) {
                    // Footer with package info
                    doc.setFontSize(8);
                    doc.text(`Exported with ${packageName} Package`,
                        data.settings.margin.left,
                        doc.internal.pageSize.height - 10);
                }
            });

            // Save the PDF
            const fileName = `${eventName.replace(/\s+/g, '_')}_bookings_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            printAlert(`Successfully exported ${filteredResponses.length} bookings to PDF`, "success");
        } catch (error) {
            console.error("PDF export error:", error);
            printAlert("Error exporting to PDF. Please try again.", "error");
        } finally {
            setExportLoading(false);
        }
    };

    const openBulkMessageModal = () => {
        if (selectedGuests.size === 0) {
            printAlert("Please select at least one guest", "warning");
            return;
        }

        if (selectedGuests.size === 1) {
            const guestId = Array.from(selectedGuests)[0];
            const guest = filteredResponses.find(g => (g.bookingId || g.guest_id) === guestId);
            openIndividualMessage(guest);
            return;
        }

        // Check bulk message permissions
        if (!canBulkMessage) {
            const packageName = getPackageDisplayName();
            showConfirm(
                'Bulk Messaging Locked',
                `Bulk messaging (${selectedGuests.size} recipients) is not available on your ${packageName} plan. 
                
Upgrade to a premium package to unlock bulk messaging features.`,
                () => navigate('/pricing'),
                null
            );
            return;
        }

        setMessageType("bulk");
        setMessageContent("");
        setMessageModalOpen(true);
    };

    return (
        <div className="dashboard-container">

            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i
                        className={`fas ${alert.type === "error"
                            ? "fa-times-circle"
                            : alert.type === "success"
                                ? "fa-check-circle"
                                : alert.type === "warning"
                                    ? "fa-exclamation-triangle"
                                    : "fa-info-circle"
                            }`}
                    ></i>
                    <span>{alert.message}</span>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{confirmModal.title}</h3>
                            <button
                                className="btn-close"
                                onClick={handleCancel}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>{confirmModal.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-outline"
                                onClick={handleCancel}
                            >
                                <i className="bi bi-x-circle"></i> Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleConfirm}
                            >
                                <i className="bi bi-check-circle"></i> Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DashboardHeader
                user={user} eventStatus={eventStatus} onToggleSidebar={toggleSidebar} userPackage={userPackage}
            />
            <DashboardTicketSidebar
                isMobileOpen={sidebarOpen} onClose={closeSidebar} userPackage={userPackage}
            />

            {/* MAIN CONTENT */}
            <div className="eventTickets-content">
                {/* Header Section */}
                <div className="eventTickets-content__header">
                    <div className="eventTickets-content__title">
                        <h2>{eventData?.event_name || "Event"} - Bookings</h2>
                        <span className="badge">{filteredResponses.length} bookings</span>
                        {userPackage && (
                            <span
                                className="package-badge"
                                style={{ backgroundColor: getPackageColor() }}
                            >
                                <i className="bi bi-shield-check"></i> {getPackageDisplayName()} Package
                            </span>
                        )}
                    </div>
                    <div className="eventTickets-content__actions">
                        {selectedGuests.size > 0 && (
                            <div className="bulk-actions-container" ref={bulkActionRef}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setBulkActionOpen(!bulkActionOpen)}
                                >
                                    <i className="bi bi-check-all"></i> {selectedGuests.size} selected
                                    <i className="bi bi-chevron-down"></i>
                                </button>
                                {bulkActionOpen && (
                                    <div className="bulk-actions-dropdown">
                                        <button
                                            className="dropdown-item"
                                            onClick={openBulkMessageModal}
                                            title={selectedGuests.size > 1 && !canBulkMessage ?
                                                `Bulk messaging requires premium package (Current: ${getPackageDisplayName()})` : ""}
                                        >
                                            <i className="bi bi-envelope"></i> Send Message
                                            {selectedGuests.size > 1 && !canBulkMessage && (
                                                <i className="bi bi-lock ms-2"></i>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            className={`btn ${canExport ? "btn-success" : "btn-secondary"}`}
                            onClick={exportToPDF}
                            disabled={exportLoading || filteredResponses.length === 0}
                            title={!canExport ?
                                `Export PDF requires premium package (Current: ${getPackageDisplayName()})` :
                                "Export all bookings to PDF"}
                        >
                            {exportLoading ? (
                                <>
                                    <i className="bi bi-arrow-clockwise spin"></i> Exporting...
                                </>
                            ) : !canExport ? (
                                <>
                                    <i className="bi bi-lock"></i> Export PDF
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-file-earmark-pdf"></i> Export PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Package Info Banner - Only show for basic package */}
                {isBasicPackage() && (
                    <div className="package-upgrade-banner">
                        <div className="banner-content">
                            <i className="bi bi-star-fill"></i>
                            <div className="banner-text">
                                <strong>Upgrade to a premium package</strong> to unlock export features, bulk messaging, and more!
                            </div>
                            <button
                                className="btn btn-sm btn-outline-light"
                                onClick={() => navigate('/pricing')}
                            >
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter Section */}
                <div className="eventTickets-content__filters">
                    <div className="search-box">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search by name, email, or ticket type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-controls">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                </div>

                {/* Table Section */}
                <div className="eventTickets-content__table-container">
                    {loading ? (
                        <div className="loading-spinner">
                            <i className="bi bi-arrow-clockwise spin"></i> Loading bookings...
                        </div>
                    ) : filteredResponses.length === 0 ? (
                        <div className="no-data">
                            <i className="bi bi-calendar-x"></i>
                            <p>No booking data found</p>
                        </div>
                    ) : (
                        <div className="eventTickets-content__table-wrapper">
                            <table className="eventTickets-content__table">
                                <thead>
                                    <tr>
                                        <th>
                                            <input
                                                type="checkbox"
                                                checked={filteredResponses.length > 0 && selectedGuests.size === filteredResponses.length}
                                                onChange={selectAllGuests}
                                            />
                                        </th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Ticket Type</th>
                                        <th>Quantity</th>
                                        <th>Total Price</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResponses.map((guest) => {
                                        const guestId = guest.bookingId || guest.guest_id;
                                        const isSelected = selectedGuests.has(guestId);
                                        const totalAmount = guest.total_amount || (guest.unit_price * guest.quantity);

                                        return (
                                            <tr key={guestId} className={isSelected ? "selected-row" : ""}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectGuest(guestId)}
                                                    />
                                                </td>
                                                <td>
                                                    {guest.customer_first_name} {guest.customer_last_name}
                                                </td>
                                                <td>{guest.customer_email}</td>
                                                <td>
                                                    <span className="ticketType">
                                                        {guest.ticket_type}
                                                    </span>
                                                </td>
                                                <td>{guest.quantity}</td>
                                                <td className="price-cell">
                                                    {formatCurrency(totalAmount)}
                                                </td>
                                                <td>
                                                    <span className={`status-badge status-${guest.payment_status}`}>
                                                        {guest.payment_status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn-action btn-view"
                                                            onClick={() => openViewDetails(guest)}
                                                            title="View Details"
                                                        >
                                                            <i className="bi bi-eye"></i>
                                                        </button>
                                                        <button
                                                            className="btn-action btn-message"
                                                            onClick={() => openIndividualMessage(guest)}
                                                            title="Send Message"
                                                        >
                                                            <i className="bi bi-envelope"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                        </div>
                    )}
                </div>

                {/* View Details Modal */}
                {viewModalOpen && selectedGuestDetails && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-lg">
                            <div className="modal-header">
                                <h3>Booking Details</h3>
                                <button
                                    className="btn-close"
                                    onClick={() => setViewModalOpen(false)}
                                >
                                    <i className="bi bi-x"></i>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="guest-details-grid">
                                    <div className="detail-item">
                                        <label>Booking ID</label>
                                        <p>{selectedGuestDetails.bookingId}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Full Name</label>
                                        <p>{selectedGuestDetails.customer_first_name} {selectedGuestDetails.customer_last_name}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Email</label>
                                        <p>{selectedGuestDetails.customer_email}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Phone</label>
                                        <p>{selectedGuestDetails.customer_phone || "Not provided"}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Ticket Type</label>
                                        <p>{selectedGuestDetails.ticket_type_label || selectedGuestDetails.ticket_type}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Quantity</label>
                                        <p>{selectedGuestDetails.quantity}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Unit Price</label>
                                        <p>{formatCurrency(selectedGuestDetails.unit_price)}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Total Amount</label>
                                        <p className="total-amount">
                                            {formatCurrency(selectedGuestDetails.total_amount || (selectedGuestDetails.unit_price * selectedGuestDetails.quantity))}
                                        </p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Payment Method</label>
                                        <p>{selectedGuestDetails.payment_method}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Payment Status</label>
                                        <p className={`status-text status-${selectedGuestDetails.payment_status}`}>
                                            {selectedGuestDetails.payment_status}
                                        </p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Booking Date</label>
                                        <p>{new Date(selectedGuestDetails.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setViewModalOpen(false)}
                                >
                                    Close
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setViewModalOpen(false);
                                        openIndividualMessage(selectedGuestDetails);
                                    }}
                                >
                                    <i className="bi bi-envelope"></i> Send Message
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Message Modal */}
                {messageModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3>
                                    {messageType === "bulk"
                                        ? `Send Message to ${selectedGuests.size} Guests`
                                        : `Message ${selectedGuestForMessage ? selectedGuestForMessage.customer_first_name : ""}`
                                    }
                                </h3>
                                {messageType === "bulk" && selectedGuests.size > 1 && !canBulkMessage && (
                                    <div className="feature-lock-notice">
                                        <i className="bi bi-lock"></i> Bulk messaging requires premium package
                                    </div>
                                )}
                                <button
                                    className="btn-close"
                                    onClick={() => setMessageModalOpen(false)}
                                >
                                    <i className="bi bi-x"></i>
                                </button>
                            </div>
                            <div className="modal-body">
                                <textarea
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows="6"
                                    className="message-textarea"
                                />
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setMessageModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={sendMessage}
                                    disabled={messageType === "bulk" && selectedGuests.size > 1 && !canBulkMessage}
                                >
                                    <i className="bi bi-send"></i> Send Message
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

        </div>
    );

}
export default TicketEventManage;