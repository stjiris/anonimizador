// src/main.tsx (ou index.tsx)
import React from "react";
import ReactDOM from "react-dom/client";
import ProfileManagerApp from "./ProfileManagerApp";
import "./index.css";
import './ProfileManagerApp.css';

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ProfileManagerApp />
  </React.StrictMode>
);
