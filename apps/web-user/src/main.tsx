import { createRoot } from "react-dom/client";
import StorefrontV2 from "../../../src/interface/store/StorefrontV2.tsx";
import "../../../src/store.css";

const root = document.getElementById("root");
if (!root) throw new Error("Storefront root is missing.");
createRoot(root).render(<StorefrontV2 />);
