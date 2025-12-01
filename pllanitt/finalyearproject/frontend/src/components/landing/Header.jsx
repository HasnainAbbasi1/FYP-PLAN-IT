import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';


const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-[1000] bg-[rgba(15,20,25,0.9)] backdrop-blur-[10px] border-b border-white/10 transition-all duration-300 ${isScrolled ? 'bg-[rgba(15,20,25,0.95)] shadow-[0_4px_20px_rgba(0,0,0,0.3)]' : ''}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex flex-col items-start">
            <Link to="/" className="no-underline text-inherit">
              <span className="text-[1.8rem] font-bold bg-gradient-base bg-clip-text text-transparent">PlanIT</span>
              <span className="text-[0.8rem] text-[#a0a7b7] -mt-1 block">AI Urban</span>
            </Link>
          </div>

          <nav className={`hidden md:flex gap-8 items-center md:static md:translate-y-0 md:opacity-100 md:visible md:flex-row md:bg-transparent md:p-0 fixed top-full left-0 right-0 bg-[rgba(15,20,25,0.98)] flex-col p-8 gap-4 -translate-y-full opacity-0 invisible transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-0 opacity-100 visible' : ''}`}>
            <a 
              href="#home" 
              className="text-white no-underline font-medium relative transition-colors duration-300 hover:text-accent after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-base after:transition-all duration-300 hover:after:w-full"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('home');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              Home
            </a>
            <a 
              href="#features" 
              className="text-white no-underline font-medium relative transition-colors duration-300 hover:text-accent after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-base after:transition-all duration-300 hover:after:w-full"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('features');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              Features
            </a>
            <a 
              href="#about" 
              className="text-white no-underline font-medium relative transition-colors duration-300 hover:text-accent after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-base after:transition-all duration-300 hover:after:w-full"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('about');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              About
            </a>
            <a 
              href="#services" 
              className="text-white no-underline font-medium relative transition-colors duration-300 hover:text-accent after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-base after:transition-all duration-300 hover:after:w-full"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('services');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              Services
            </a>
            <a 
              href="#pricing" 
              className="text-white no-underline font-medium relative transition-colors duration-300 hover:text-accent after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-base after:transition-all duration-300 hover:after:w-full"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('pricing');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              Pricing
            </a>
            <a 
              href="#contact" 
              className="text-white no-underline font-medium relative transition-colors duration-300 hover:text-accent after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-base after:transition-all duration-300 hover:after:w-full"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('contact');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              Contact
            </a>
          </nav>

          <div className="hidden md:flex gap-4 items-center">
            <Link to="/login" className="px-6 py-2.5 rounded-lg no-underline font-semibold transition-all duration-300 inline-flex items-center justify-center border-none cursor-pointer bg-transparent border-2 border-white/20 text-white hover:border-accent hover:bg-[rgba(63,122,245,0.1)]">Login</Link>
            <Link to="/signup" className="px-6 py-2.5 rounded-lg no-underline font-semibold transition-all duration-300 inline-flex items-center justify-center border-none cursor-pointer bg-gradient-base text-white border-2 border-transparent hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(63,122,245,0.3)]">SignUp</Link>
          </div>

          <button 
            className="md:hidden flex flex-col gap-1 bg-transparent border-none cursor-pointer p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="w-[25px] h-0.5 bg-white transition-all duration-300"></span>
            <span className="w-[25px] h-0.5 bg-white transition-all duration-300"></span>
            <span className="w-[25px] h-0.5 bg-white transition-all duration-300"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;