import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Admin } from "./Admin";
import "./admin.css";

createRoot(document.getElementById("admin")!).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
);
