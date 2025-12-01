import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapIcon, Home, ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";
import ScrollToTop from "@/components/common/ScrollToTop";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419] relative overflow-hidden p-8">
      <div className="absolute inset-0 opacity-10 z-0">
        <div className="w-full h-full bg-[linear-gradient(rgba(69,136,173,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(69,136,173,0.1)_1px,transparent_1px)] bg-[length:50px_50px] animate-grid-move"></div>
      </div>
      <div className="text-center max-w-2xl p-8 relative z-10 animate-fade-in-up">
        <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-accent/20 to-base/20 rounded-full flex items-center justify-center border-2 border-accent/30 relative z-[2] animate-icon-float">
            <MapIcon className="h-12 w-12 text-accent z-[3]" />
          </div>
          <div className="absolute inset-[-1rem] rounded-full border-2 border-accent/30 animate-pulse-scale"></div>
        </div>
        <h1 className="text-6xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-r from-base to-accent bg-clip-text text-transparent leading-none tracking-tight">404</h1>
        <p className="text-2xl font-semibold mb-3 text-white">Page Not Found</p>
        <p className="text-[#a0a7b7] mb-8 text-base leading-relaxed">
          The page you're looking for doesn't exist or has been moved to another location.
        </p>
        <div className="flex gap-4 justify-center mb-12 flex-wrap">
          <Button 
            size="lg" 
            className="min-w-[140px] bg-gradient-base border-none text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(69,136,173,0.3)]"
            onClick={() => navigate('/planner-dashboard')}
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="min-w-[140px] bg-white/5 border border-white/10 text-white backdrop-blur-[10px] transition-all duration-300 hover:bg-white/10 hover:border-accent/50 hover:-translate-y-0.5"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-[#a0a7b7] text-sm mb-4 font-medium">You might be looking for:</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#a0a7b7] no-underline text-sm transition-all duration-200 hover:bg-accent/10 hover:border-accent/30 hover:text-accent hover:-translate-y-0.5">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            <Link to="/projects" className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#a0a7b7] no-underline text-sm transition-all duration-200 hover:bg-accent/10 hover:border-accent/30 hover:text-accent hover:-translate-y-0.5">
              <Search className="w-4 h-4" />
              Projects
            </Link>
            <Link to="/editor" className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#a0a7b7] no-underline text-sm transition-all duration-200 hover:bg-accent/10 hover:border-accent/30 hover:text-accent hover:-translate-y-0.5">
              <MapIcon className="w-4 h-4" />
              Map Editor
            </Link>
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
};

export default NotFound;
