
import React from 'react';
import Header from '@/components/layout/Header';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import About from '@/components/landing/About';
import Services from '@/components/landing/Services';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import Newsletter from '@/components/landing/Newsletter';
import Footer from '@/components/landing/Footer';
import ScrollToTop from '@/components/common/ScrollToTop';

const Landing = () => {
  return (
    <div className="bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419] min-h-screen text-white overflow-x-hidden">
      <Header />
      <Hero />
      <Features />
      <About />
      <Services />
      <Pricing />
      <Testimonials />
      <Newsletter />
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Landing;
