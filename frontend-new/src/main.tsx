import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import { router } from "./router"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
    {import.meta.env.DEV ? <TanStackRouterDevtools router={router} /> : null}
  </StrictMode>,
)