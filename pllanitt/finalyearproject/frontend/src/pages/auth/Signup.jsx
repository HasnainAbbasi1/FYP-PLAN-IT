import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Map, Mail, Lock, User, UserCheck } from 'lucide-react';
import { signupSchema } from '../../validation/authSchemas';
import { 
  ValidatedInput, 
  ValidatedSelect,
  ErrorMessage, 
  SuccessMessage, 
  LoadingButton,
  ValidationSummary,
  PasswordStrengthIndicator,
  PasswordRequirements
} from '../../components/validation/ValidationComponents';
import ScrollToTop from '@/components/common/ScrollToTop';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const initialValues = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  };

  const roleOptions = [
    { value: 'planner', label: 'Urban Planner' },
    { value: 'viewer', label: 'Viewer' }
  ];

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Handle specific field errors
        if (data.field === 'email') {
          setFieldError('email', data.message);
        } else if (data.field === 'name') {
          setFieldError('name', data.message);
        } else if (data.field === 'password') {
          setFieldError('password', data.message);
        } else if (data.field === 'role') {
          setFieldError('role', data.message);
        } else {
          setError(data.message || 'Signup failed');
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
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
            <CardTitle className="text-2xl text-card-foreground mb-2">Create Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join PLAN-it to start your urban planning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Formik
              initialValues={initialValues}
              validationSchema={signupSchema}
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
                    <Label htmlFor="name" className="text-foreground font-medium">Full Name</Label>
                    <Field name="name">
                      {({ field, form }) => (
                        <ValidatedInput
                          field={field}
                          form={form}
                          type="text"
                          placeholder="Enter your full name"
                          icon={User}
                        />
                      )}
                    </Field>
                  </div>
                  
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
                    <Label htmlFor="role" className="text-foreground font-medium">Role</Label>
                    <Field name="role">
                      {({ field, form }) => (
                        <ValidatedSelect
                          field={field}
                          form={form}
                          options={roleOptions}
                          placeholder="Select your role"
                          icon={UserCheck}
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
                          placeholder="Create a strong password"
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
                    <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                    <Field name="confirmPassword">
                      {({ field, form }) => (
                        <ValidatedInput
                          field={field}
                          form={form}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
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
                    Create Account
                  </LoadingButton>
                </Form>
              )}
            </Formik>
            
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{' '}
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

export default Signup;