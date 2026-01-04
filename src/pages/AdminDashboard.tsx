import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {t('admin.analytics')}
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || 'Administrator'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Admin dashboard will be implemented in Phase 5.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Features: Analytics, department management, heatmap, and escalation rules.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
