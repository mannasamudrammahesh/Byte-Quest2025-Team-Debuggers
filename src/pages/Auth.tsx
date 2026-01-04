import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Lock, User, ArrowLeft, Shield, Users, Phone, Building, UserCheck } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['citizen', 'officer'], { required_error: 'Please select a role' }),
  // Officer-specific fields
  employeeId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  phoneNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.role === 'officer') {
    return data.employeeId && data.department && data.designation && data.phoneNumber;
  }
  return true;
}, {
  message: "All officer fields are required for government officers",
  path: ['employeeId'],
});

export default function Auth() {
  const { t } = useLanguage();
  const { signIn, signUp, isAuthenticated, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'citizen' as 'citizen' | 'officer',
    // Officer-specific fields
    employeeId: '',
    department: '',
    designation: '',
    phoneNumber: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && role) {
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from);
      } else if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'officer') {
        navigate('/officer');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, role, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = loginSchema.parse(loginForm);
      setIsLoading(true);

      const { error } = await signIn(validated.email, validated.password);
      
      if (error) {
        setErrors({ form: error.message });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = signupSchema.parse(signupForm);
      setIsLoading(true);

      const { error } = await signUp(
        validated.email, 
        validated.password, 
        validated.fullName, 
        validated.role,
        {
          employeeId: validated.employeeId,
          department: validated.department,
          designation: validated.designation,
          phoneNumber: validated.phoneNumber,
        }
      );
      
      if (error) {
        setErrors({ form: error.message });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <MainLayout showFooter={false}>
        <div className="flex min-h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            className="mb-6 gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display font-bold text-xl">
                  G
                </div>
              </div>
              <CardTitle className="font-display text-2xl">
                {activeTab === 'login' ? t('auth.loginTitle') : t('auth.signupTitle')}
              </CardTitle>
              <CardDescription>
                {activeTab === 'login' ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">{t('nav.login')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('nav.signup')}</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    {errors.form && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        {errors.form}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="name@example.com"
                          className="pl-10"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        />
                      </div>
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        />
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('auth.loginButton')}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    {errors.form && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        {errors.form}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          className="pl-10"
                          value={signupForm.fullName}
                          onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                        />
                      </div>
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-role">Account Type</Label>
                      <Select
                        value={signupForm.role}
                        onValueChange={(value) => setSignupForm({ ...signupForm, role: value as 'citizen' | 'officer' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="citizen">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <div>
                                <p className="font-medium">Citizen</p>
                                <p className="text-xs text-muted-foreground">Submit and track grievances</p>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="officer">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <div>
                                <p className="font-medium">Government Officer</p>
                                <p className="text-xs text-muted-foreground">Manage and resolve grievances</p>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="name@example.com"
                          className="pl-10"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        />
                      </div>
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>

                    {/* Officer-specific fields */}
                    {signupForm.role === 'officer' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="employee-id">Employee ID *</Label>
                          <div className="relative">
                            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="employee-id"
                              type="text"
                              placeholder="EMP001234"
                              className="pl-10"
                              value={signupForm.employeeId}
                              onChange={(e) => setSignupForm({ ...signupForm, employeeId: e.target.value })}
                            />
                          </div>
                          {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="department">Department *</Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Select
                              value={signupForm.department}
                              onValueChange={(value) => setSignupForm({ ...signupForm, department: value })}
                            >
                              <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Select your department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public_works">Public Works Department</SelectItem>
                                <SelectItem value="sanitation">Sanitation Department</SelectItem>
                                <SelectItem value="utilities">Utilities Department</SelectItem>
                                <SelectItem value="police">Police Department</SelectItem>
                                <SelectItem value="health">Health Department</SelectItem>
                                <SelectItem value="education">Education Department</SelectItem>
                                <SelectItem value="administration">General Administration</SelectItem>
                                <SelectItem value="revenue">Revenue Department</SelectItem>
                                <SelectItem value="transport">Transport Department</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {errors.department && <p className="text-sm text-destructive">{errors.department}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="designation">Designation *</Label>
                          <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="designation"
                              type="text"
                              placeholder="Assistant Engineer, Inspector, etc."
                              className="pl-10"
                              value={signupForm.designation}
                              onChange={(e) => setSignupForm({ ...signupForm, designation: e.target.value })}
                            />
                          </div>
                          {errors.designation && <p className="text-sm text-destructive">{errors.designation}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone-number">Official Phone Number *</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="phone-number"
                              type="tel"
                              placeholder="+91 9876543210"
                              className="pl-10"
                              value={signupForm.phoneNumber}
                              onChange={(e) => setSignupForm({ ...signupForm, phoneNumber: e.target.value })}
                            />
                          </div>
                          {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber}</p>}
                        </div>

                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Government officer accounts require verification. 
                            Your account will be reviewed by administrators before activation.
                          </p>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        />
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">{t('auth.confirmPassword')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('auth.signupButton')}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
