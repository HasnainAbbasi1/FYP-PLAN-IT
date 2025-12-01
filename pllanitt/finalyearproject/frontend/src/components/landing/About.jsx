
import React from 'react';

const About = () => {
  return (
    <section id="about" className="bg-gradient-to-br from-[#0f1419] to-[#1a2332] py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="opacity-0 animate-fade-in-up">
            <h2 className="text-4xl md:text-[2rem] font-bold text-white mb-4 bg-gradient-base bg-clip-text text-transparent">About PlanIT AI</h2>
            <p className="text-lg text-[#a0a7b7] leading-relaxed mb-10">
              We are revolutionizing urban planning through artificial intelligence and cutting-edge technology. 
              Our platform empowers city planners, architects, and developers to create smarter, more sustainable urban environments.
            </p>
            
            <div className="flex flex-col gap-6">
              <div className="flex gap-4 items-start">
                <div className="bg-gradient-base text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">01</div>
                <div>
                  <h4 className="text-white text-lg font-semibold mb-2">AI-Powered Analysis</h4>
                  <p className="text-[#a0a7b7] leading-normal">Advanced machine learning algorithms analyze complex urban data patterns</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-gradient-base text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">02</div>
                <div>
                  <h4 className="text-white text-lg font-semibold mb-2">Collaborative Platform</h4>
                  <p className="text-[#a0a7b7] leading-normal">Real-time collaboration tools for teams and stakeholders</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-gradient-base text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">03</div>
                <div>
                  <h4 className="text-white text-lg font-semibold mb-2">Sustainable Solutions</h4>
                  <p className="text-[#a0a7b7] leading-normal">Environmental impact assessment and green planning optimization</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="opacity-0 animate-slide-in-left relative md:order-none order-first">
            <div className="relative rounded-[20px] overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Urban Planning Team"
                className="w-full h-[500px] object-cover rounded-[20px]"
              />
              <div className="absolute -top-5 -right-5 w-[100px] h-[100px] bg-gradient-base rounded-[20px] opacity-80 -z-10 hidden md:block before:content-[''] before:absolute before:-bottom-10 before:-left-10 before:w-20 before:h-20 before:bg-gradient-to-br before:from-accent before:to-base before:rounded-full before:opacity-60"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
