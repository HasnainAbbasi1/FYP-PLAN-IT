const steps = [
  { title: "Discovery", desc: "We start by understanding your requirements, goals, and vision." },
  { title: "Sprint 0", desc: "We set up the groundwork, tools, and initial designs." },
  { title: "Build", desc: "Our team develops, tests, and iterates on the solution." },
  { title: "Launch", desc: "We deploy your project, ensuring smooth delivery." },
  { title: "Support", desc: "Ongoing maintenance, improvements, and scaling." },
];

const Timeline = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <h2 className="text-4xl font-extrabold mb-16 text-center text-gray-900 dark:text-white">
        How We Work
      </h2>

      <div className="hidden md:flex relative justify-between items-start max-w-6xl mx-auto px-6">
        <div className="absolute top-10 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>

        {steps.map((step, idx) => (
          <div key={step.title} className="flex flex-col items-center text-center w-40">
            <div className="relative z-10 bg-gradient-to-r from-blue-500 to-indigo-600 
                            text-white w-20 h-20 flex items-center justify-center 
                            rounded-full mb-4 text-2xl font-bold shadow-lg">
              {idx + 1}
            </div>

            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:hidden relative items-center gap-12 max-w-xs mx-auto">
        {steps.map((step, idx) => (
          <div key={step.title} className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 
                            text-white w-16 h-16 flex items-center justify-center 
                            rounded-full mb-3 text-xl font-bold shadow-md">
              {idx + 1}
            </div>

            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-1">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {step.desc}
            </p>

            {idx < steps.length - 1 && (
              <div className="h-12 w-0.5 bg-gradient-to-b from-blue-400 to-indigo-500 mt-4"></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Timeline;