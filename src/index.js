import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import PasswordProtect from "./PasswordProtect";
import "./styles.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <PasswordProtect />
  </StrictMode>
);
