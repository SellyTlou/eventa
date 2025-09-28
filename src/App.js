import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/index';
import Features from './pages/feature';
import Pricing from './pages/pricing';
import About from './pages/about';
import CreateEvent from './pages/createEvent';
import Sales from './pages/salse';
import AdminDashboard from './pages/admin/AdminDeshboard';
import EventTheme from './pages/planner/eventTheme';
import PostcardEditor from './pages/planner/postcardEditor';
import ActiveEventDetails from './pages/planner/activeEventDetails';
import EventsDashboard from './pages/planner/eventsDashboard';
import EventManagement from './pages/planner/eventManagemnet';
import InvitationPage from './pages/planner/invitationPage';
import RsvpForm from './pages/planner/rsvpForm';
import Profile from './pages/planner/Profile';
import ManageEyEvent from './pages/planner/manage_my_event';
import PackagePayment from './pages/planner/packagePayment';

function App() {
  return (
    <Router>
      <div className="App">
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;