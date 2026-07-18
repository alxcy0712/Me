import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx?v=12";
import "./styles.css?v=12";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
