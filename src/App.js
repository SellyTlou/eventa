import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { SessionHandler } from "./pages/components";

function App() {
  return (
    <Router>
      <SessionHandler />
    </Router>
  );
}

export default App;
