import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, UserPlus } from 'lucide-react';
import { inviteUserSchema } from '../../validation/authSchemas';
import { 
  ValidatedInput, 
  ErrorMessage, 
  LoadingButton,
  ValidationSummary 
} from '../../components/validation/ValidationComponents';
import { toast } from 'sonner';

const adminInviteSchema = inviteUserSchema.pick(['email']);

const AdminInvite = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initialValues = {
    email: ''
  };

  const handleInvite = async (values, { setSubmitting, resetForm, setFieldError }) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/invite-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email: values.email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Admin invitation sent successfully!');
        resetForm();
      } else {
        if (data.field === 'email') {
          setFieldError('email', data.message);
        } else {
          toast.error(data.message || 'Failed to send invitation');
        }
      }
    } catch (error) {
      console.error('Admin invite error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Admin
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={initialValues}
          validationSchema={adminInviteSchema}
          onSubmit={handleInvite}
          validateOnChange={true}
          validateOnBlur={true}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form className="space-y-4">
              <ValidationSummary errors={errors} className="mb-2" />
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Admin Email</Label>
                <Field name="email">
                  {({ field, form }) => (
                    <ValidatedInput
                      field={field}
                      form={form}
                      type="email"
                      placeholder="Enter email to invite as admin"
                      icon={Mail}
                    />
                  )}
                </Field>
              </div>
              
              <LoadingButton
                type="submit"
                loading={isLoading || isSubmitting}
                disabled={isLoading || isSubmitting}
                className="w-full"
              >
                Send Admin Invitation
              </LoadingButton>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
};

export default AdminInvite;