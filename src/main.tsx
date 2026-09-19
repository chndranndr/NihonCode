import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { createLogger, setMinLevel } from "./observability/logger";

const APP_VERSION = "0.1.0-scaffold";

setMinLevel(import.meta.env.PROD ? "info" : "debug");
const log = createLogger("app");
log.info("boot", { app: "nihoncode", version: APP_VERSION });

const root = document.getElementById("root");
if (!root) {
  log.error("boot-failed", { reason: "root element missing" });
  throw new Error("#root element missing from index.html");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
