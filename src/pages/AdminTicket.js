import React, { useEffect, useState } from "react";
import "./AdminTicket.css";

function AdminTicket({ printAlert }) {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || `${window.location.origin}/eventa/src/pages/php`;
      const formData = new FormData();
      formData.append("function", "getTickets");
      formData.append("status", statusFilter);
      formData.append("department", departmentFilter);
      formData.append("search", search);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setTickets(result.tickets);
      } else {
        console.error("Failed to fetch tickets:", result.message);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, departmentFilter, search]);

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || `${window.location.origin}/eventa/src/pages/php`;
      const formData = new FormData();
      formData.append("function", "updateTicketStatus");
      formData.append("ticket_id", ticketId);
      formData.append("status", newStatus);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        // Refresh tickets
        fetchTickets();
        printAlert("Ticket status updated successfully!", 'success');
      } else {
        printAlert(result.message, 'error');
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      alert("Failed to update ticket status");
    }
  };

  const filteredTickets = tickets;

  if (loading) {
    return <div className="loading">Loading tickets...</div>;
  }

  return (
    <section className="admin-dashboard-section">
      <div className="admin-ticket-container">
        <h2 className="page-title">Support Tickets (Admin)</h2>

        {/* Filters */}
        <div className="filters-container">
          <input
            type="text"
            placeholder="Search subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Departments</option>
            <option value="Technical">Technical</option>
            <option value="Accounts">Accounts</option>
            <option value="Sales">Sales</option>
            <option value="RSVP">RSVP</option>
            <option value="IT Support">IT Support</option>
          </select>
        </div>

        {/* Tickets Table */}
        <table className="ticket-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>User</th>
              <th>Email</th>
              <th>Department</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">No tickets found</td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.name}</td>
                  <td>{ticket.email}</td>
                  <td>{ticket.department}</td>
                  <td>{ticket.priority}</td>
                  <td>
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                  <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminTicket;
