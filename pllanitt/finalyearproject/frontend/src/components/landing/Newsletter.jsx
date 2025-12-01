
import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Check, Mail } from 'lucide-react';
import { ValidatedInput, LoadingButton } from '../../components/validation/ValidationComponents';

const newsletterSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must not exceed 100 characters')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email format'
    )
});

const Newsletter = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initialValues = {
    email: ''
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setIsLoading(true);
    
    try {
      // TODO: Connect to backend API
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsSubscribed(true);
      resetForm();
      setTimeout(() => setIsSubscribed(false), 3000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-gradient-base text-white py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-center md:text-left">
          <div>
            <h2 className="text-4xl md:text-[2rem] font-bold mb-4 leading-tight">Stay Updated with Urban Planning Trends</h2>
            <p className="text-lg leading-relaxed opacity-90">
              Get the latest insights, case studies, and industry updates delivered to your inbox. 
              Join thousands of urban planning professionals who trust our expertise.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-[10px] rounded-2xl p-8 border border-white/20">
            {!isSubscribed ? (
              <Formik
                initialValues={initialValues}
                validationSchema={newsletterSchema}
                onSubmit={handleSubmit}
                validateOnChange={true}
                validateOnBlur={true}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <Field name="email">
                        {({ field, form }) => (
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none z-10">
                              <Mail size={18} />
                            </div>
                            <input
                              {...field}
                              type="email"
                              placeholder="Enter your email address"
                              className={`
                                w-full pl-11 pr-4 py-4 border-2 rounded-[10px] text-white text-base transition-all duration-300 placeholder:text-white/70 focus:outline-none focus:ring-2
                                ${form.touched.email && form.errors.email
                                  ? 'border-red-300 bg-red-500/20 focus:border-red-400 focus:ring-red-300/50'
                                  : 'border-white/20 bg-white/10 focus:border-white/50 focus:bg-white/15 focus:ring-white/20'
                                }
                              `}
                            />
                            {form.touched.email && form.errors.email && (
                              <p className="text-red-200 text-xs mt-1">{form.errors.email}</p>
                            )}
                          </div>
                        )}
                      </Field>
                      <LoadingButton
                        type="submit"
                        loading={isLoading || isSubmitting}
                        disabled={isLoading || isSubmitting}
                        className="px-8 py-4 bg-white/90 text-accent border-none rounded-[10px] font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        Subscribe Now
                      </LoadingButton>
                    </div>
                    <p className="text-sm opacity-80 text-center">
                      We respect your privacy. Unsubscribe at any time.
                    </p>
                  </Form>
                )}
              </Formik>
            ) : (
              <div className="text-center p-4">
                <div className="w-[60px] h-[60px] bg-white/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse-scale">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Thank you for subscribing!</h3>
                <p className="opacity-90">You'll receive our latest updates soon.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
