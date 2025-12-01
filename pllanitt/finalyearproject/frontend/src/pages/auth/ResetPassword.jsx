import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Map, Lock, CheckCircle } from 'lucide-react';
import { resetPasswordSchema } from '../../validation/authSchemas';
import { 
  ValidatedInput, 
  ErrorMessage, 
  SuccessMessage, 
  LoadingButton,
  ValidationSummary,
  PasswordStrengthIndicator,
  PasswordRequirements
} from '../../components/validation/ValidationComponents';
import ScrollToTop from '@/components/common/ScrollToTop';

const ResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const initialValues = {
    password: '',
    confirmPassword: ''
  };

  useEffect(() => {
    // Validate token on component mount
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/auth/validate-reset-token/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTokenValid(true);
      } else {
        setError(data.message || 'Invalid or expired reset token');
        setTokenValid(false);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setError('Network error. Please check your connection and try again.');
      setTokenValid(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`http://localhost:8000/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: values.password,
          confirmPassword: values.confirmPassword
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Your password has been successfully reset! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        if (data.field === 'password') {
          setFieldError('password', data.message);
        } else if (data.field === 'confirmPassword') {
          setFieldError('confirmPassword', data.message);
        } else {
          setError(data.message || 'Failed to reset password');
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  if (!tokenValid && error) {
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
              <CardTitle className="text-2xl text-card-foreground mb-2">Invalid Reset Link</CardTitle>
              <CardDescription className="text-muted-foreground">
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="flex items-center gap-2 text-destructive text-sm font-medium mt-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md p-3 mb-6">
                  {error}
                </div>
                
                <p className="text-[#a0a7b7] mb-6">
                  Please request a new password reset link.
                </p>
                
                <Link to="/forgot-password" className="inline-block w-full bg-gradient-base border-none text-primary-foreground font-semibold py-3 px-4 rounded-md transition-transform duration-200 hover:-translate-y-0.5 text-center no-underline">
                  Request New Reset Link
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
            <CardTitle className="text-2xl text-card-foreground mb-2">Reset Your Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Formik
              initialValues={initialValues}
              validationSchema={resetPasswordSchema}
              onSubmit={handleSubmit}
              validateOnChange={true}
              validateOnBlur={true}
            >
              {({ errors, touched, isSubmitting, values }) => (
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
                    <Label htmlFor="password" className="text-foreground font-medium">New Password</Label>
                    <Field name="password">
                      {({ field, form }) => (
                        <ValidatedInput
                          field={field}
                          form={form}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your new password"
                          icon={Lock}
                          showPasswordToggle={true}
                          onTogglePassword={() => setShowPassword(!showPassword)}
                          showPassword={showPassword}
                        />
                      )}
                    </Field>
                    <PasswordStrengthIndicator password={values.password} />
                    <PasswordRequirements password={values.password} />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm New Password</Label>
                    <Field name="confirmPassword">
                      {({ field, form }) => (
                        <ValidatedInput
                          field={field}
                          form={form}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your new password"
                          icon={Lock}
                          showPasswordToggle={true}
                          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                          showPassword={showConfirmPassword}
                        />
                      )}
                    </Field>
                  </div>
                  
                  <LoadingButton
                    type="submit"
                    loading={isLoading || isSubmitting}
                    disabled={isLoading || isSubmitting || success}
                    className="mt-4 bg-gradient-base border-none text-primary-foreground font-semibold py-3 transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
                  >
                    Reset Password
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

export default ResetPassword;