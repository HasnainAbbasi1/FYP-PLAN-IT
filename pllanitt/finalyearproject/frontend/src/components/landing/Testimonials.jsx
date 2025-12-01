import React from 'react';

const Testimonials = () => {
  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center mb-12 text-slate-800 dark:text-white text-4xl font-bold">What Our Users Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md border-l-4 border-accent">
            <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300 mb-6 italic">"Plan-It has revolutionized our urban planning process. The AI-powered analysis saves us hours of work."</p>
            <div>
              <strong className="block text-slate-800 dark:text-white text-lg mb-1">Sarah Johnson</strong>
              <span className="text-slate-500 dark:text-slate-400 text-sm">Urban Planner, City of Tomorrow</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md border-l-4 border-accent">
            <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300 mb-6 italic">"The terrain analysis and zoning features are incredibly accurate. Highly recommended for any planning professional."</p>
            <div>
              <strong className="block text-slate-800 dark:text-white text-lg mb-1">Michael Chen</strong>
              <span className="text-slate-500 dark:text-slate-400 text-sm">Senior Architect, Design Studio</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
