import { Navigate, redirect, type RouteObject } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Root, NotFound, RouteError } from "@/pages/Root";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Barbers from "@/pages/Barbers";

// Auth gate for /app: redirect signed-out visitors to sign-in, otherwise hand the user to the page.
async function requireUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect("/sign-in");
  return { user: data.user };
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Index /> },
      { path: "sign-in", element: <Login mode="signin" /> },
      { path: "sign-up", element: <Login mode="signup" /> },
      { path: "app", loader: requireUser, element: <Barbers /> },
      // Old URLs from the TanStack Start version.
      { path: "login", element: <Navigate to="/sign-in" replace /> },
      { path: "barbers", element: <Navigate to="/app" replace /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];
