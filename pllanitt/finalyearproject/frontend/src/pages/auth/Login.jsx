import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Map, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema } from '../../validation/authSchemas';
import { 
  ValidatedInput, 
  ErrorMessage, 
  SuccessMessage, 
  LoadingButton,
  ValidationSummary 
} from '../../components/validation/ValidationComponents';
import ScrollToTop from '@/components/common/ScrollToTop';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const initialValues = {
    email: '',
    password: ''
  };

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Login successful! Redirecting...');
        
        // Use auth context to handle login
        login(data.user, data.token);
        
        // Redirect based on user role
        setTimeout(() => {
          switch (data.user.role) {
            case 'admin':
              navigate('/admin-dashboard');
              break;
            case 'planner':
              navigate('/planner-dashboard');
              break;
            default:
              navigate('/viewer-dashboard');
          }
        }, 1000);
      } else {
        // Handle specific field errors
        if (data.field === 'email') {
          setFieldError('email', data.message);
        } else if (data.field === 'password') {
          setFieldError('password', data.message);
        } else {
          setError(data.message || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

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
            <CardTitle className="text-2xl text-card-foreground mb-2">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account to continue planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Formik
              initialValues={initialValues}
              validationSchema={loginSchema}
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
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                    <Field name="password">
                      {({ field, form }) => (
                        <ValidatedInput
                          field={field}
                          form={form}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          icon={Lock}
                          showPasswordToggle={true}
                          onTogglePassword={() => setShowPassword(!showPassword)}
                          showPassword={showPassword}
                        />
                      )}
                    </Field>
                  </div>
                  
                  <div className="text-right -mt-2 mb-2">
                    <Link to="/forgot-password" className="text-sm text-primary no-underline font-semibold hover:text-accent transition-colors">
                      Forgot your password?
                    </Link>
                  </div>
                  
                  <LoadingButton
                    type="submit"
                    loading={isLoading || isSubmitting}
                    disabled={isLoading || isSubmitting}
                    className="mt-4 bg-gradient-base border-none text-primary-foreground font-semibold py-3 transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
                  >
                    Sign In
                  </LoadingButton>
                </Form>
              )}
            </Formik>
            
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                <Link to="/forgot-password" className="text-primary no-underline font-semibold hover:text-accent transition-colors">
                  Forgot your password?
                </Link>
              </p>
              <p className="text-muted-foreground mt-2">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary no-underline font-semibold hover:text-accent transition-colors">
                  Sign up
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

export default Login;