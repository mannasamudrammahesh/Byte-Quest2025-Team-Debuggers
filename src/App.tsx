import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CitizenDashboard from "./pages/CitizenDashboard";
import OfficerDashboard from "./pages/OfficerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SubmitGrievance from "./pages/SubmitGrievance";
import GrievanceDetail from "./pages/GrievanceDetail";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Import configuration check for development
import "@/utils/configCheck";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Citizen Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submit"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                    <SubmitGrievance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grievance/:id"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
                    <GrievanceDetail />
                  </ProtectedRoute>
                }
              />

              {/* Protected Officer Routes */}
              <Route
                path="/officer"
                element={
                  <ProtectedRoute allowedRoles={['officer', 'admin']}>
                    <OfficerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
