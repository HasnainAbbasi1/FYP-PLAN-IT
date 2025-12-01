
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const navigate = useNavigate();

  const handlePricingAction = (planName) => {
    if (planName === 'Enterprise') {
      // Scroll to contact section
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        // If contact section doesn't exist, navigate to signup
        navigate('/signup');
      }
    } else {
      // Navigate to signup for Starter and Professional plans
      navigate('/signup');
    }
  };
  const plans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for small projects and individual planners',
      features: [
        '5 Active Projects',
        'Basic AI Analysis',
        'Standard Templates',
        'Email Support',
        '10GB Storage',
        'Export to PDF'
      ],
      popular: false,
      buttonText: 'Get Started'
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'Ideal for medium-sized planning teams',
      features: [
        '25 Active Projects',
        'Advanced AI Analytics',
        'Premium Templates',
        'Priority Support',
        '100GB Storage',
        'Team Collaboration',
        'Advanced Exports',
        'Custom Integrations'
      ],
      popular: true,
      buttonText: 'Start Free Trial'
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For large organizations and cities',
      features: [
        'Unlimited Projects',
        'Full AI Suite',
        'Custom Templates',
        '24/7 Dedicated Support',
        'Unlimited Storage',
        'Advanced Collaboration',
        'White-label Solution',
        'API Access',
        'Custom Training',
        'SLA Guarantee'
      ],
      popular: false,
      buttonText: 'Contact Sales'
    }
  ];

  return (
    <section id="pricing" className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[600px] mx-auto text-center mb-6">
          <h2 className="text-4xl md:text-[2rem] font-bold text-white mb-4 bg-gradient-base bg-clip-text text-transparent">Choose Your Plan</h2>
          <p className="text-lg text-[#a0a7b7] leading-relaxed">
            Flexible pricing options designed to scale with your urban planning needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`bg-white/5 backdrop-blur-[10px] border rounded-[20px] p-8 relative transition-all duration-300 opacity-0 animate-fade-in-up hover:-translate-y-2.5 hover:border-accent/30 hover:shadow-[0_25px_50px_rgba(0,0,0,0.3)] ${plan.popular ? 'border-accent bg-accent/10 scale-105 md:scale-100' : 'border-white/10'}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-base text-white px-6 py-2 rounded-[20px] text-sm font-semibold">
                  <span>Most Popular</span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-5xl md:text-[2.5rem] font-extrabold text-accent">{plan.price}</span>
                  <span className="text-base text-[#a0a7b7] ml-2">{plan.period}</span>
                </div>
                <p className="text-[#a0a7b7] leading-normal">{plan.description}</p>
              </div>

              <div className="mb-8">
                <ul className="list-none">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 mb-4 text-[#a0a7b7]">
                      <svg className="w-5 h-5 text-base flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <button 
                  className={`w-full px-8 py-4 rounded-[10px] font-semibold text-base border-none cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(63,122,245,0.3)] ${plan.popular ? 'bg-gradient-base text-white' : 'bg-transparent border-2 border-white/20 text-white hover:border-accent'}`}
                  onClick={() => handlePricingAction(plan.name)}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16 pt-8 border-t border-white/10">
          <p className="text-[#a0a7b7] mb-2">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-[#a0a7b7]">
            Need a custom solution? <a href="#contact" className="text-accent no-underline font-semibold hover:text-base">Contact our sales team</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
