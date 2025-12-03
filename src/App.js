import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SupportTicket from "./pages/SupportTicket";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SupportTicket />} />
      </Routes>
    </Router>
  );
}

export default App;
