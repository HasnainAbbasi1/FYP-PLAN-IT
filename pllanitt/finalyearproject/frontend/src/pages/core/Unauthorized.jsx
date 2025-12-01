import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, AlertTriangle, Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ScrollToTop from '@/components/common/ScrollToTop';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419] relative overflow-hidden p-8">
      <div className="absolute inset-0 opacity-10 z-0">
        <div className="w-full h-full bg-[linear-gradient(rgba(239,68,68,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.1)_1px,transparent_1px)] bg-[length:50px_50px] animate-grid-move"></div>
      </div>
      <div className="text-center p-8 max-w-2xl w-full relative z-10 animate-fade-in-up">
        <Card className="bg-[rgba(26,35,50,0.9)] border border-red-500/20 backdrop-blur-[10px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <CardContent className="p-12 sm:p-8 sm:px-6">
            <div className="mb-8">
              <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center border-2 border-red-500/30 relative z-[2] animate-icon-float">
                  <Shield className="h-12 w-12 text-red-500 z-[3]" />
                </div>
                <div className="absolute inset-[-1rem] rounded-full border-2 border-red-500/30 animate-pulse-scale"></div>
              </div>
              <h1 className="text-3xl font-bold mb-3 text-white bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Access Denied</h1>
              <p className="text-[#a0a7b7] leading-relaxed text-[0.95rem]">
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
              </p>
            </div>
            
            <div className="flex flex-col gap-4 my-8 p-6 bg-white/3 rounded-xl border border-white/10">
              <div className="flex items-start gap-4 text-left">
                <Lock className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Restricted Access</h3>
                  <p className="text-xs text-[#9ca3af] m-0">This page requires special permissions</p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Need Access?</h3>
                  <p className="text-xs text-[#9ca3af] m-0">Contact your administrator to request permissions</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-8 flex-wrap">
              <Button 
                className="min-w-[160px] bg-gradient-to-r from-red-500 to-orange-500 border-none text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(239,68,68,0.3)]"
                onClick={() => navigate('/dashboard')}
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                className="min-w-[160px] bg-white/5 border border-white/10 text-white backdrop-blur-[10px] transition-all duration-300 hover:bg-white/10 hover:border-red-500/50 hover:-translate-y-0.5"
                onClick={() => navigate(-1)}
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[#a0a7b7] text-sm">Need help? <Link to="/contact" className="text-blue-500 no-underline font-semibold transition-colors duration-200 hover:text-cyan-400">Contact Support</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
      <ScrollToTop />
    </div>
  );
};

export default Unauthorized;