import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import Admin from "./Admin";
import Provider from "./Provider";
import "./styles.css";

// Sentry — no-op when VITE_SENTRY_DSN is not set
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Route by path: /admin → Admin, /provider → Provider, else → App
const path = window.location.pathname;
const isAdmin = path.startsWith('/admin');
const isProvider = path.startsWith('/provider');

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? <Admin /> : isProvider ? <Provider /> : <App />}
  </React.StrictMode>
);
