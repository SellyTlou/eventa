import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEPARTMENTS, TICKET_STATUS, DEPARTMENT_OPTIONS } from "./ticketConstants";
import "./AdminTicket.css";

function AdminTicket({ printAlert }) {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

  // === CRITICAL: Check if user is admin ===
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'admin') {
      // Not an admin, redirect to home
      navigate('/');
      if (printAlert) {
        printAlert('Access denied. Admin privileges required.', 'error');
      }
    }
  }, [navigate, printAlert]);

  const fetchTickets = async () => {
    try {
      // Use consistent API URL
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
      
      const formData = new FormData();
      formData.append("function", "getTickets");
      
      // Get admin user ID for verification
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      formData.append("admin_user_id", user.user_id || '');
      
      // Only send filters if not "All"
      if (statusFilter !== "All") formData.append("status", statusFilter);
      if (departmentFilter !== "All") formData.append("department", departmentFilter);
      if (search) formData.append("search", search);

      const response = await fetch(`${API_BASE_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setTickets(result.tickets || []);
      } else {
        console.error("Failed to fetch tickets:", result.message);
        if (result.message.includes('Unauthorized')) {
          navigate('/');
        }
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, departmentFilter, search]); // Add search as dependency

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      setUpdatingId(ticketId);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const formData = new FormData();
      formData.append("function", "updateTicketStatus");
      formData.append("ticket_id", ticketId);
      formData.append("status", newStatus);
      formData.append("admin_user_id", user.user_id || '');

      const response = await fetch(`${API_BASE_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        // Update local state immediately for better UX
        setTickets(prevTickets =>
          prevTickets.map(ticket =>
            ticket.id === ticketId
              ? { ...ticket, status: newStatus }
              : ticket
          )
        );
        
        if (printAlert) {
          printAlert(`Ticket #${ticketId} marked as ${newStatus}`, 'success');
        }
      } else {
        if (printAlert) {
          printAlert(result.message || 'Failed to update ticket', 'error');
        }
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      if (printAlert) {
        printAlert("Failed to update ticket status", 'error');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get priority badge class
  const getPriorityClass = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  if (loading) {
    return <div className="loading">Loading tickets...</div>;
  }


  return (
    <div className="admin-ticket-page"> {/* ← ADD THIS WRAPPER */}
      <section className="admin-dashboard-section">
      <div className="admin-ticket-container">
        <div className="ticket-header">
          <h2 className="page-title">Support Tickets</h2>
          <span className="ticket-count">{tickets.length} tickets</span>
        </div>

        {/* Filters */}
        <div className="filters-container">
          <div className="search-wrapper">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search by subject, user, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input search-input"
            />
            {search && (
              <button className="clear-search" onClick={() => setSearch('')}>
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value={TICKET_STATUS.OPEN}>Open</option>
            <option value={TICKET_STATUS.IN_PROGRESS}>In Progress</option>
            <option value={TICKET_STATUS.RESOLVED}>Resolved</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Departments</option>
            {DEPARTMENT_OPTIONS.map(dept => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tickets Table */}
        <div className="table-responsive">
          <table className="ticket-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>User</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data">
                    <i className="bi bi-inbox"></i>
                    <p>No tickets found</p>
                    {(search || statusFilter !== 'All' || departmentFilter !== 'All') && (
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('All');
                          setDepartmentFilter('All');
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="ticket-id">#{ticket.id}</td>
                    <td className="ticket-subject">{ticket.subject}</td>
                    <td>
                      <div className="user-info">
                        <div className="user-name">{ticket.name || 'Guest'}</div>
                        <div className="user-email">{ticket.email}</div>
                      </div>
                    </td>
                    <td>{ticket.department}</td>
                    <td>
                      <span className={`priority-badge ${getPriorityClass(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <select
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                        className={`status-select status-${ticket.status?.toLowerCase().replace(' ', '-')}`}
                        disabled={updatingId === ticket.id}
                      >
                        <option value={TICKET_STATUS.OPEN}>Open</option>
                        <option value={TICKET_STATUS.IN_PROGRESS}>In Progress</option>
                        <option value={TICKET_STATUS.RESOLVED}>Resolved</option>
                      </select>
                    </td>
                    <td className="date-cell">{formatDate(ticket.created_at)}</td>
                    <td>
                      <button 
                        className="btn-icon view-btn"
                        title="View Details"
                        onClick={() => {/* Add view details modal later */}}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    </div>
  );
 
}

export default AdminTicket;