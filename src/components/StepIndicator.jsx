import React from 'react';

const StepIndicator = ({ currentStep, steps }) => {
  return (
    <div className="bg-emerald-700 px-4 py-8 sm:px-6 rounded-t-lg">
      <nav>
        <ol role="list" className="relative flex items-start justify-between">
          {/* The connecting line */}
          <div className="absolute left-0 top-4 w-full h-0.5 bg-white/30" aria-hidden="true" />
          
          {steps.map((step) => (
            <li key={step.name} className="relative z-10 flex flex-col items-center w-1/6">
              {step.id < currentStep ? (
                // Completed Step
                <>
                  <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full">
                    <svg className="w-5 h-5 text-emerald-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="mt-3 text-center text-sm font-medium text-white">{step.name}</span>
                </>
              ) : step.id === currentStep ? (
                // Current Step
                <>
                  <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full ring-4 ring-emerald-700" />
                  <span className="mt-3 text-center text-sm font-medium text-white">{step.name}</span>
                </>
              ) : (
                // Upcoming Step
                <>
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-700 border-2 border-white rounded-full" />
                  <span className="mt-3 text-center text-sm font-medium text-white/70">{step.name}</span>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default StepIndicator;
