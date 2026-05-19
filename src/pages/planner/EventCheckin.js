import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../alert.css';

const EventCheckin = () => {
    const navigate = useNavigate();
    const [eventId, setEventId] = useState(null);
    const [isTicketEvent, setIsTicketEvent] = useState(false);
    const [list, setList] = useState([]);
    const [checkins, setCheckins] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedEventId = localStorage.getItem('selectedEventId');
        if (!storedEventId) {
            navigate('/event-checklist');
            return;
        }
        setEventId(storedEventId);
        loadEvent(storedEventId);
    }, [navigate]);

    const loadEvent = async (id) => {
        setLoading(true);
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            // get event to know type
            const fd = new FormData();
            fd.append('function', 'getEventById');
            fd.append('event_id', id);
            const res = await fetch(`${API_URL}/query.php`, { method: 'POST', body: fd });
            const data = await res.json();
            let hasTickets = false;
            if (data.success && data.events && data.events.length > 0) {
                const ev = data.events[0];
                hasTickets = ev.has_tickets == 1 || ev.has_tickets === true;
                setIsTicketEvent(hasTickets);
            }

            if (hasTickets) {
                await fetchBookings(id);
            } else {
                await fetchRsvps(id);
            }
            await fetchCheckins(id);
        } catch (e) {
            console.error('Error loading event checkin', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchRsvps = async (id) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const fd = new FormData();
            fd.append('function', 'getRSVPResponses');
            fd.append('event_id', id);
            const res = await fetch(`${API_URL}/query.php`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success && data.responses) {
                setList(data.responses);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchBookings = async (id) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const fd = new FormData();
            fd.append('function', 'getEventBookings');
            fd.append('event_id', id);
            const res = await fetch(`${API_URL}/query.php`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success && data.bookings) {
                setList(data.bookings);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchCheckins = async (id) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const fd = new FormData();
            fd.append('function', 'getEventCheckins');
            fd.append('event_id', id);
            const res = await fetch(`${API_URL}/query.php`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success && data.checkins) {
                setCheckins(data.checkins);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const performCheckin = async ({ guest_id = null, bookingId = null }) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const fd = new FormData();
            fd.append('function', 'performCheckin');
            fd.append('event_id', eventId);
            if (guest_id) fd.append('guest_id', guest_id);
            if (bookingId) fd.append('booking_id', bookingId);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user && user.user_id) fd.append('user_id', user.user_id);
            const res = await fetch(`${API_URL}/query.php`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                await fetchCheckins(eventId);
                alert('Checked in');
            } else {
                alert('Failed to check in: ' + (data.message || ''));
            }
        } catch (e) {
            console.error(e);
            alert('Error during check-in');
        }
    };

    if (loading) return (<div className="loading-container"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>);

    return (
        <div className="dashboard-container">
            <div className="checkin-header">
                <h2>Event Check-in</h2>
                <p>Mark guests as checked-in for the event.</p>
            </div>

            <div className="checkin-content">
                <div className="left-panel">
                    <h4>Guests</h4>
                    {list.length === 0 && <p>No guests found.</p>}
                    <ul>
                        {list.map(g => (
                            <li key={g.guest_id || g.bookingId}>
                                <div className="guest-row">
                                    <div>
                                        <strong>{g.customer_name || g.name}</strong>
                                        <div className="small">{g.customer_email || g.email}</div>
                                    </div>
                                    <div>
                                        <button className="btn btn-sm btn-primary" onClick={() => performCheckin({ guest_id: g.guest_id, bookingId: g.bookingId })}>Check in</button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="right-panel">
                    <h4>Recent Check-ins</h4>
                    <ul>
                        {checkins.map(c => (
                            <li key={c.id}>{c.guest_id || c.booking_id} — {c.checked_in_at}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default EventCheckin;
