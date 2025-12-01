import React from 'react';
import { Building2, Sprout, BarChart3, Navigation, Building, Zap } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <Building2 className="w-8 h-8" />,
      title: 'Smart Infrastructure Planning',
      description: 'AI-powered analysis for optimal infrastructure placement and resource allocation.',
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      icon: <Sprout className="w-8 h-8" />,
      title: 'Sustainable Development',
      description: 'Environmental impact assessment and green space optimization for eco-friendly cities.',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Advanced Analytics',
      description: 'Real-time data analysis and predictive modeling for informed decision making.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      icon: <Navigation className="w-8 h-8" />,
      title: 'Traffic Optimization',
      description: 'Intelligent traffic flow analysis and transportation network planning.',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      icon: <Building className="w-8 h-8" />,
      title: 'Zoning Management',
      description: 'Automated zoning recommendations based on demographic and economic data.',
      image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Real-time Collaboration',
      description: 'Multi-user planning environment with instant updates and version control.',
      image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <section id="features" className="bg-[rgba(26,35,50,0.5)] backdrop-blur-[10px] py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[600px] mx-auto text-center mb-6">
          <h2 className="text-4xl md:text-[2rem] font-bold text-white mb-4 bg-gradient-base bg-clip-text text-transparent">Powerful Features</h2>
          <p className="text-lg text-[#a0a7b7] leading-relaxed">
            Discover the cutting-edge tools that make urban planning smarter, faster, and more efficient
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {features.map((feature, index) => (
            <div key={index} className="group bg-white/5 backdrop-blur-[10px] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 opacity-0 animate-fade-in-up hover:-translate-y-2.5 hover:border-accent/30 hover:shadow-[0_20px_40px_rgba(69,136,173,0.1)]" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="relative h-[200px] overflow-hidden">
                <img src={feature.image} alt={feature.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(63,122,245,0.8)] to-[rgba(71,236,187,0.8)] flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="text-5xl animate-pulse-scale">{feature.icon}</div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-[#a0a7b7] leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;