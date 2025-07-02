import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "<insert-authority-here>",
  client_id: "<insert-client-id-here>",
  redirect_uri: "<insert-redirect-uri-here>",
  response_type: "code",
  scope: "email openid phone profile",
};

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);