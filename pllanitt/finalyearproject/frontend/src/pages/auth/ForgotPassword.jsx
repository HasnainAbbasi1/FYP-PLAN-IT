import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Map, Mail, ArrowLeft } from 'lucide-react';
import { forgotPasswordSchema } from '../../validation/authSchemas';
import { 
  ValidatedInput, 
  ErrorMessage, 
  SuccessMessage, 
  LoadingButton,
  ValidationSummary 
} from '../../components/validation/ValidationComponents';
import ScrollToTop from '@/components/common/ScrollToTop';

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const initialValues = {
    email: ''
  };

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Password reset instructions have been sent to your email address.');
        setEmailSent(true);
      } else {
        if (data.field === 'email') {
          setFieldError('email', data.message);
        } else {
          setError(data.message || 'Failed to send reset email');
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    // This would typically resend the email
    setSuccess('Reset instructions have been resent to your email.');
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-300 lg:p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2 no-underline text-foreground">
              <Map className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-base bg-clip-text text-transparent sm:text-xl">PLAN-it</span>
            </Link>
          </div>
          
          <Card className="bg-card border border-border backdrop-blur-[10px]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-card-foreground mb-2">Check Your Email</CardTitle>
              <CardDescription className="text-muted-foreground">
                We've sent password reset instructions to your email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="h-12 w-12 text-accent">
                    <Mail size={48} />
                  </div>
                  <p className="text-muted-foreground text-center">
                    If an account with that email exists, we've sent you password reset instructions.
                    Please check your email and follow the link to reset your password.
                  </p>
                </div>
                
                <div className="mt-8">
                  <p className="text-muted-foreground mb-4">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                  <button
                    onClick={handleResendEmail}
                    className="w-full bg-transparent border border-border text-muted-foreground py-2 px-4 rounded-md transition-colors hover:bg-primary/10 hover:text-primary"
                    type="button"
                  >
                    Resend Email
                  </button>
                </div>
                
                <Link to="/login" className="flex items-center gap-2 text-muted-foreground no-underline text-sm mt-6 transition-colors hover:text-primary justify-center">
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-300 lg:p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 no-underline text-foreground">
            <Map className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-base bg-clip-text text-transparent sm:text-xl">PLAN-it</span>
          </Link>
        </div>
        
        <Card className="bg-card border border-border backdrop-blur-[10px]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-card-foreground mb-2">Forgot Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your email address and we'll send you instructions to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Formik
              initialValues={initialValues}
              validationSchema={forgotPasswordSchema}
              onSubmit={handleSubmit}
              validateOnChange={true}
              validateOnBlur={true}
            >
              {({ errors, touched, isSubmitting }) => (
                <Form className="flex flex-col gap-4">
                  {/* Global Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium mt-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md p-3">
                      {error}
                    </div>
                  )}

                  {/* Global Success Message */}
                  {success && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium mt-1 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-md p-3">
                      {success}
                    </div>
                  )}

                  {/* Validation Summary */}
                  <ValidationSummary errors={errors} className="mb-4" />
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
                    <Field name="email">
                      {({ field, form }) => (
                        <ValidatedInput
                          field={field}
                          form={form}
                          type="email"
                          placeholder="Enter your email address"
                          icon={Mail}
                        />
                      )}
                    </Field>
                  </div>
                  
                  <LoadingButton
                    type="submit"
                    loading={isLoading || isSubmitting}
                    disabled={isLoading || isSubmitting}
                    className="mt-4 bg-gradient-base border-none text-primary-foreground font-semibold py-3 transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
                  >
                    Send Reset Instructions
                  </LoadingButton>
                </Form>
              )}
            </Formik>
            
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary no-underline font-semibold hover:text-accent transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <ScrollToTop />
    </div>
  );
};

export default ForgotPassword;