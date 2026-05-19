import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { SessionHandler } from "./pages/components";
import CryptoJS from 'crypto-js';
function App() {
  return (
    <Router>
      <SessionHandler />
    </Router>
  );
}

export default App;
