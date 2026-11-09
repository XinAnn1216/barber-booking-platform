import { Component, type ErrorInfo, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Barbers from "@/pages/Barbers";
import BarberDetail from "@/pages/BarberDetail";
import MyBookings from "@/pages/MyBookings";
import BookingSuccess from "@/pages/BookingSuccess";
import ShopSetup from "@/pages/ShopSetup";
import ShopBookings from "@/pages/ShopBookings";
import ShopEarnings from "@/pages/ShopEarnings";
import AdminPayouts from "@/pages/AdminPayouts";
import NotFound from "@/pages/NotFound";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  override state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            This page didn't load
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong on our end. You can try refreshing or head back home.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/barbers" element={<Barbers />} />
        <Route path="/barbers/:id" element={<BarberDetail />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/success" element={<BookingSuccess />} />
        <Route path="/shop" element={<ShopSetup />} />
        <Route path="/shop/bookings" element={<ShopBookings />} />
        <Route path="/shop/earnings" element={<ShopEarnings />} />
        <Route path="/admin/payouts" element={<AdminPayouts />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
