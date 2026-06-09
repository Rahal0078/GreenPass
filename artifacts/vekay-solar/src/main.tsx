import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { API_BASE } from "@/lib/api-base";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Wire the Orval-generated hooks to the correct API origin.
setBaseUrl(API_BASE || null);

createRoot(document.getElementById("root")!).render(<App />);
