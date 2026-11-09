import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: () => new Promise(() => {}),
    },
  },
}));

import App from "@/App";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe("App routing", () => {
  it("renders the landing page at /", () => {
    renderAt("/");
    expect(screen.getByText("Best booking experience")).toBeInTheDocument();
  });

  it("renders the sign-in page at /login", () => {
    renderAt("/login");
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("matches /barbers instead of falling back to not found", () => {
    renderAt("/barbers");
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });

  it("matches the buyer pages", () => {
    renderAt("/barbers/7f7ff859-de39-439c-9b89-9b5e63b052e2");
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
    renderAt("/bookings");
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });

  it("matches the shop pages", () => {
    renderAt("/shop");
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
    renderAt("/shop/bookings");
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });

  it("shows not found for unknown paths", () => {
    renderAt("/app");
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});
