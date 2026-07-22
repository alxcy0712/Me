import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx?v=14";
import "./styles.css?v=14";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
