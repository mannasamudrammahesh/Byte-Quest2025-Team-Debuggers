import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function GrievanceDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [grievance, setGrievance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGrievance = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('grievances')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        setGrievance(data);
      } catch (err) {
        console.error('Error fetching grievance:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrievance();
  }, [id]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!grievance) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Grievance Not Found</h2>
              <p className="text-muted-foreground">
                The grievance you're looking for doesn't exist or you don't have access to it.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <span className="text-sm font-mono text-muted-foreground">
                {grievance.tracking_id}
              </span>
              <h1 className="font-display text-2xl font-bold mt-2">{grievance.title}</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">{t('grievance.description')}</h3>
                <p className="text-muted-foreground">{grievance.description}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">{t('grievance.status')}</span>
                  <p className="font-medium capitalize">{grievance.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('grievance.priority')}</span>
                  <p className="font-medium capitalize">{grievance.priority}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('grievance.category')}</span>
                  <p className="font-medium capitalize">{grievance.category.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('grievance.submittedOn')}</span>
                  <p className="font-medium">{new Date(grievance.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {grievance.ai_analysis && (
              <div className="mt-6 p-4 rounded-lg bg-muted">
                <h3 className="font-semibold mb-2">{t('grievance.aiAnalysis')}</h3>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(grievance.ai_analysis, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
