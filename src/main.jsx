import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx?v=20260728-26";
import "./styles.css?v=20260728-26";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
