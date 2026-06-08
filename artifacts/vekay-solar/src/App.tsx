import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

// Public Pages
import ComplaintForm from "@/pages/public/ComplaintForm";
import TrackTicket from "@/pages/public/TrackTicket";

// Shared Login
import Login from "@/pages/Login";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminComplaints from "@/pages/admin/Complaints";
import AdminComplaintDetail from "@/pages/admin/ComplaintDetail";
import AdminTechnicians from "@/pages/admin/Technicians";
import AdminTechnicianDetail from "@/pages/admin/TechnicianDetail";
import AdminReports from "@/pages/admin/Reports";
import AdminCustomers from "@/pages/admin/Customers";
import AdminCustomerDetail from "@/pages/admin/CustomerDetail";
import AdminProjects from "@/pages/admin/Projects";

// Tech Pages
import TechDashboard from "@/pages/tech/Dashboard";
import TechComplaintComplete from "@/pages/tech/ComplaintComplete";

const queryClient = new QueryClient();

type UserRole = "admin" | "technician";

function portalFor(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "technician") return "/tech";
  return "/login";
}

function ProtectedRoute({ component: Component, role }: { path: string; component: any; role: UserRole }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) return <Redirect to="/login" />;
  if (user.role !== role) return <Redirect to={portalFor(user.role)} />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={ComplaintForm} />
      <Route path="/track/:ticketId?" component={TrackTicket} />

      {/* Unified Login */}
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={Login} />
      <Route path="/tech/login" component={Login} />

      {/* Admin Protected Routes */}
      <Route path="/admin">
        {() => <ProtectedRoute path="/admin" component={AdminDashboard} role="admin" />}
      </Route>
      <Route path="/admin/complaints">
        {() => <ProtectedRoute path="/admin/complaints" component={AdminComplaints} role="admin" />}
      </Route>
      <Route path="/admin/complaints/:id">
        {() => <ProtectedRoute path="/admin/complaints/:id" component={AdminComplaintDetail} role="admin" />}
      </Route>
      <Route path="/admin/technicians">
        {() => <ProtectedRoute path="/admin/technicians" component={AdminTechnicians} role="admin" />}
      </Route>
      <Route path="/admin/technicians/:id">
        {() => <ProtectedRoute path="/admin/technicians/:id" component={AdminTechnicianDetail} role="admin" />}
      </Route>
      <Route path="/admin/reports">
        {() => <ProtectedRoute path="/admin/reports" component={AdminReports} role="admin" />}
      </Route>
      <Route path="/admin/customers">
        {() => <ProtectedRoute path="/admin/customers" component={AdminCustomers} role="admin" />}
      </Route>
      <Route path="/admin/customers/:phone">
        {() => <ProtectedRoute path="/admin/customers/:phone" component={AdminCustomerDetail} role="admin" />}
      </Route>
      <Route path="/admin/projects">
        {() => <ProtectedRoute path="/admin/projects" component={AdminProjects} role="admin" />}
      </Route>

      {/* Tech Protected Routes */}
      <Route path="/tech">
        {() => <ProtectedRoute path="/tech" component={TechDashboard} role="technician" />}
      </Route>
      <Route path="/tech/complaints/:id">
        {() => <ProtectedRoute path="/tech/complaints/:id" component={TechComplaintComplete} role="technician" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
