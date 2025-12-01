import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Send } from 'lucide-react';
import { inviteUserSchema } from '../../validation/authSchemas';
import { 
  ValidatedInput, 
  ValidatedSelect,
  ErrorMessage, 
  LoadingButton,
  ValidationSummary 
} from '../../components/validation/ValidationComponents';
import { toast } from 'sonner';

const InviteUsers = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initialValues = {
    email: '',
    role: 'viewer',
    message: ''
  };

  const handleInvite = async (values, { setSubmitting, resetForm, setFieldError }) => {
    setIsLoading(true);
    
    try {
      // TODO: Connect to backend API
      const response = await fetch('http://localhost:8000/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Invitation sent to ${values.email} as ${values.role}`);
        resetForm();
      } else {
        if (data.field === 'email') {
          setFieldError('email', data.message);
        } else {
          toast.error(data.message || 'Failed to send invitation');
        }
      }
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Invite Users</h1>
            <p className="text-base text-slate-500 mt-1">Send invitations to new users</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus size={20} />
                Send Invitation
              </CardTitle>
              <CardDescription>Invite new users to join the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Formik
                initialValues={initialValues}
                validationSchema={inviteUserSchema}
                onSubmit={handleInvite}
                validateOnChange={true}
                validateOnBlur={true}
              >
                {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                  <Form className="flex flex-col gap-4">
                    <ValidationSummary errors={errors} className="mb-2" />
                    
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
                      <Field name="email">
                        {({ field, form }) => (
                          <ValidatedInput
                            field={field}
                            form={form}
                            type="email"
                            placeholder="user@example.com"
                            icon={Mail}
                          />
                        )}
                      </Field>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="role" className="text-foreground font-medium">Role</Label>
                      <Select
                        value={values.role}
                        onValueChange={(value) => setFieldValue('role', value)}
                      >
                        <SelectTrigger className={errors.role && touched.role ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="planner">Planner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.role && touched.role && (
                        <ErrorMessage error={errors.role} />
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="message" className="text-foreground font-medium">Custom Message (Optional)</Label>
                      <Field name="message">
                        {({ field, form }) => (
                          <Textarea
                            {...field}
                            placeholder="Add a personal message..."
                            rows={4}
                            className={`
                              w-full resize-y
                              ${form.touched.message && form.errors.message 
                                ? 'border-destructive focus:border-destructive focus:ring-destructive' 
                                : 'border-border'
                              }
                            `}
                          />
                        )}
                      </Field>
                      {errors.message && touched.message && (
                        <ErrorMessage error={errors.message} />
                      )}
                      <div className="text-xs text-muted-foreground text-right">
                        {values.message?.length || 0}/500 characters
                      </div>
                    </div>

                    <LoadingButton
                      type="submit"
                      loading={isLoading || isSubmitting}
                      disabled={isLoading || isSubmitting}
                      className="inline-flex items-center justify-center gap-2 bg-accent text-white hover:bg-base hover:-translate-y-px hover:shadow-lg transition-all duration-200"
                    >
                      <Send size={18} />
                      Send Invitation
                    </LoadingButton>
                  </Form>
                )}
              </Formik>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Invitations</CardTitle>
              <CardDescription>Track sent invitations</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                <Mail size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No invitations sent yet</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default InviteUsers;

