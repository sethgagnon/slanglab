import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Lookup from "./pages/Lookup";
import SlangLab from "./pages/SlangLab";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Leaderboard from "./pages/Leaderboard";
import SlangDetail from "./pages/SlangDetail";
import TermDetail from "./pages/TermDetail";
import ProMentions from "./pages/ProMentions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/lookup" element={<Lookup />} />
            <Route path="/slang-lab" element={<SlangLab />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/slang/:id" element={<SlangDetail />} />
            <Route path="/t/:slug" element={<TermDetail />} />
            <Route path="/pro/mentions" element={<ProMentions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
