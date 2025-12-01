
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="home" className="min-h-screen flex items-center relative overflow-hidden bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419] mt-[50px]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(69,136,173,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(71,236,187,0.1)_0%,transparent_50%),radial-gradient(circle_at_40%_40%,rgba(155,135,245,0.05)_0%,transparent_50%)]"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center py-8">
          <div className={`${isVisible ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`}>
            <h1 className="text-[3.5rem] md:text-[2.5rem] font-extrabold leading-tight mb-6 text-white">
              Revolutionize Urban Planning with
              <span className="bg-gradient-base bg-clip-text text-transparent"> AI Technology</span>
            </h1>
            <p className="text-xl leading-relaxed text-[#a0a7b7] mb-10">
              Transform your city planning process with our advanced AI-powered platform. 
              Design smarter, build better, and create sustainable urban environments for the future.
            </p>
            <div className="flex flex-col md:flex-row gap-4 mb-12">
              <Link to="/projects" className="px-8 py-4 text-lg rounded-lg no-underline font-semibold transition-all duration-300 inline-flex items-center justify-center border-none cursor-pointer bg-gradient-base text-white border-2 border-transparent hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(63,122,245,0.3)]">
                Start Planning Now
              </Link>
              <a 
                href="#features" 
                className="px-8 py-4 text-lg rounded-lg no-underline font-semibold transition-all duration-300 inline-flex items-center justify-center border-none cursor-pointer bg-transparent border-2 border-white/20 text-white hover:border-accent hover:bg-[rgba(63,122,245,0.1)]"
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById('features');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Explore Features
              </a>
            </div>
            <div className="flex flex-col md:flex-row gap-12 md:justify-center">
              <div className="text-center">
                <span className="block text-2xl font-bold text-accent mb-2">500+</span>
                <span className="text-[#a0a7b7] text-sm">Projects Completed</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-accent mb-2">50+</span>
                <span className="text-[#a0a7b7] text-sm">Cities Transformed</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-accent mb-2">95%</span>
                <span className="text-[#a0a7b7] text-sm">Efficiency Increase</span>
              </div>
            </div>
          </div>
          
          <div className={`${isVisible ? 'opacity-100 animate-slide-in-left' : 'opacity-0'}`}>
            <div className="relative rounded-[20px] overflow-hidden bg-white/5 backdrop-blur-[10px] border border-white/10 transition-transform duration-300 hover:-translate-y-2.5">
              <img 
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Smart City Planning"
                className="w-full h-[400px] object-cover block"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 text-white">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Smart City Design</h3>
                  <p className="text-[#a0a7b7]">AI-powered urban planning solutions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
