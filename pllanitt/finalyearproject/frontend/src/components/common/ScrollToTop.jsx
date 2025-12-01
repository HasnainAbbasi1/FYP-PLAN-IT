import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      // Check window scroll
      const windowScroll = window.pageYOffset || document.documentElement.scrollTop;
      
      // Check main content scroll (for design phase pages with scrollable containers)
      const mainContent = document.querySelector('.main-layout-main');
      const mainScroll = mainContent ? mainContent.scrollTop : 0;
      
      // Show button if either window or main content is scrolled
      if (windowScroll > 300 || mainScroll > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Listen to window scroll
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    
    // Listen to main content scroll (for design phase pages)
    const mainContent = document.querySelector('.main-layout-main');
    if (mainContent) {
      mainContent.addEventListener('scroll', toggleVisibility, { passive: true });
    }

    // Initial check
    toggleVisibility();

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      if (mainContent) {
        mainContent.removeEventListener('scroll', toggleVisibility);
      }
    };
  }, []);

  // Scroll to top function - handles both window and main content
  const scrollToTop = () => {
    // Scroll window to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    
    // Also scroll main content to top (for design phase pages)
    const mainContent = document.querySelector('.main-layout-main');
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <button
      className={`fixed bottom-4 right-4 sm:bottom-4 sm:right-4 xs:bottom-3 xs:right-3 w-14 h-14 sm:w-12 sm:h-12 xs:w-11 xs:h-11 bg-gradient-base text-white border-0 rounded-full cursor-pointer flex items-center justify-center shadow-[0_10px_25px_rgba(102,126,234,0.4)] transition-all duration-300 z-[9999] overflow-hidden group ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto animate-fade-in-up' 
          : 'opacity-0 translate-y-5 scale-90 pointer-events-none'
      } hover:-translate-y-1 hover:scale-105 hover:shadow-[0_15px_35px_rgba(102,126,234,0.5)] hover:bg-gradient-to-br hover:from-accent hover:to-base active:-translate-y-0.5 active:scale-[0.98] relative before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-all before:duration-500 hover:before:left-full`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ChevronUp className="w-6 h-6 sm:w-5 sm:h-5 xs:w-[18px] xs:h-[18px] text-white transition-transform duration-300 group-hover:-translate-y-0.5 relative z-10" />
    </button>
  );
};

export default ScrollToTop;
