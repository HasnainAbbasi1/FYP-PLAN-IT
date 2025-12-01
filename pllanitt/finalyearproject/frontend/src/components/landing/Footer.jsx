
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  const handleScrollToSection = (sectionId) => {
    // Only scroll if we're on the landing page
    if (location.pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-gradient-to-br from-[#0f1419] to-[#1a2332] border-t border-white/10 py-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12 lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr]">
          <div className="flex flex-col">
            <div className="flex flex-col mb-4">
              <span className="text-[1.8rem] font-bold bg-gradient-base bg-clip-text text-transparent">PlanIT</span>
              <span className="text-[0.8rem] text-[#a0a7b7] -mt-1">AI Urban</span>
            </div>
            <p className="text-[#a0a7b7] leading-relaxed mb-6">
              Revolutionizing urban planning through artificial intelligence and cutting-edge technology.
            </p>
            <div className="flex gap-4">
              <a href="#" className="px-4 py-2 bg-white/10 rounded-lg text-white no-underline transition-all duration-300 text-sm hover:bg-accent/20 hover:-translate-y-0.5">
                <span>LinkedIn</span>
              </a>
              <a href="#" className="px-4 py-2 bg-white/10 rounded-lg text-white no-underline transition-all duration-300 text-sm hover:bg-accent/20 hover:-translate-y-0.5">
                <span>Twitter</span>
              </a>
              <a href="#" className="px-4 py-2 bg-white/10 rounded-lg text-white no-underline transition-all duration-300 text-sm hover:bg-accent/20 hover:-translate-y-0.5">
                <span>GitHub</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white text-lg font-semibold mb-6">Platform</h4>
            <ul className="list-none flex flex-col gap-3">
              <li><Link to="/projects" className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent">Projects</Link></li>
              <li><Link to="/editor" className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent">Design Editor</Link></li>
              <li><Link to="/analytics" className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent">Analytics</Link></li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white text-lg font-semibold mb-6">Resources</h4>
            <ul className="list-none flex flex-col gap-3">
              <li>
                <a 
                  href="#about" 
                  className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    if (location.pathname === '/') {
                      handleScrollToSection('about');
                    } else {
                      window.location.href = '/#about';
                    }
                  }}
                >
                  About Us
                </a>
              </li>
              <li>
                <a 
                  href="#features" 
                  className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    if (location.pathname === '/') {
                      handleScrollToSection('features');
                    } else {
                      window.location.href = '/#features';
                    }
                  }}
                >
                  Features
                </a>
              </li>
              <li>
                <a 
                  href="#pricing" 
                  className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    if (location.pathname === '/') {
                      handleScrollToSection('pricing');
                    } else {
                      window.location.href = '/#pricing';
                    }
                  }}
                >
                  Pricing
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    if (location.pathname === '/') {
                      handleScrollToSection('contact');
                    } else {
                      window.location.href = '/#contact';
                    }
                  }}
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white text-lg font-semibold mb-6">Support</h4>
            <ul className="list-none flex flex-col gap-3">
              <li><a href="#" className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent">Documentation</a></li>
              <li><a href="#" className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent">Help Center</a></li>
              <li><a href="#" className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent">API Reference</a></li>
              <li><a href="#" className="text-[#a0a7b7] no-underline transition-colors duration-300 hover:text-accent">Community</a></li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white text-lg font-semibold mb-6">Contact Info</h4>
            <div className="flex flex-col gap-3">
              <p className="text-[#a0a7b7] flex items-center gap-2"><Mail className="w-4 h-4" />info@planit-ai.com</p>
              <p className="text-[#a0a7b7] flex items-center gap-2"><Phone className="w-4 h-4" />+1 (555) 123-4567</p>
              <p className="text-[#a0a7b7] flex items-center gap-2"><MapPin className="w-4 h-4" />San Francisco, CA</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[#a0a7b7] text-center md:text-left">
            <p>&copy; {currentYear} PlanIT AI Urban. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="text-[#a0a7b7] no-underline text-sm transition-colors duration-300 hover:text-accent">Privacy Policy</a>
              <a href="#" className="text-[#a0a7b7] no-underline text-sm transition-colors duration-300 hover:text-accent">Terms of Service</a>
              <a href="#" className="text-[#a0a7b7] no-underline text-sm transition-colors duration-300 hover:text-accent">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
