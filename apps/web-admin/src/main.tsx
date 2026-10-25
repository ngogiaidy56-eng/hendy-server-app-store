import { createRoot } from "react-dom/client";
import StudioWorkspace from "../../../src/interface/admin/StudioWorkspace.tsx";
import "../../../src/admin.css";

const root = document.getElementById("root");
if (!root) throw new Error("Admin root is missing.");

function returnToStore() {
  window.location.assign("/");
}
createRoot(root).render(<StudioWorkspace onReturnToStore={returnToStore} />);
