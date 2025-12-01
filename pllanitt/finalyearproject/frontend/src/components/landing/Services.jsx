import React from 'react';
import { useNavigate } from 'react-router-dom';

const Services = () => {
  const navigate = useNavigate();

  const handleLearnMore = (serviceTitle) => {
    // Navigate to projects page or show more info
    navigate('/projects');
  };
  const services = [
    {
      title: 'Urban Design',
      description: 'Comprehensive city planning and design solutions',
      features: ['3D Modeling', 'Zoning Analysis', 'Traffic Flow', 'Green Spaces'],
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Infrastructure Planning',
      description: 'Smart infrastructure design and optimization',
      features: ['Utility Networks', 'Transportation', 'Smart Systems', 'Sustainability'],
      image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Data Analytics',
      description: 'Advanced data analysis and insights',
      features: ['Population Data', 'Economic Analysis', 'Trend Forecasting', 'Risk Assessment'],
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <section id="services" className="bg-[rgba(15,20,25,0.8)] py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[600px] mx-auto text-center mb-6">
          <h2 className="text-4xl md:text-[2rem] font-bold text-white mb-4 bg-gradient-base bg-clip-text text-transparent">Our Services</h2>
          <p className="text-lg text-[#a0a7b7] leading-relaxed">
            Comprehensive urban planning solutions powered by artificial intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {services.map((service, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-[10px] border border-white/10 rounded-[20px] overflow-hidden transition-all duration-300 opacity-0 animate-fade-in-up hover:-translate-y-2.5 hover:border-accent/30 hover:shadow-[0_25px_50px_rgba(0,0,0,0.3)]" style={{ animationDelay: `${index * 0.2}s` }}>
              <div className="h-[250px] overflow-hidden relative">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                <p className="text-[#a0a7b7] leading-relaxed mb-6">{service.description}</p>
                <ul className="list-none mb-8">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 mb-3 text-[#a0a7b7]">
                      <span className="w-2 h-2 bg-gradient-base rounded-full flex-shrink-0"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  className="bg-gradient-base text-white border-none px-8 py-3 rounded-lg font-semibold cursor-pointer transition-all duration-300 w-full hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(63,122,245,0.3)]" 
                  onClick={() => handleLearnMore(service.title)}
                >
                  Learn More
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
