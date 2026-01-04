import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Mic,
  Camera,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type InputMode = 'text' | 'voice' | 'image' | 'location';
type Step = 1 | 2 | 3 | 4;

interface AIAnalysis {
  category: string;
  priority: string;
  department: string;
  confidence: number;
  summary: string;
}

export default function SubmitGrievance() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    location_address: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
  });

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const inputModes = [
    { id: 'text' as InputMode, icon: FileText, label: t('grievance.inputModes.text'), desc: t('grievance.inputModes.textDesc') },
    { id: 'voice' as InputMode, icon: Mic, label: t('grievance.inputModes.voice'), desc: t('grievance.inputModes.voiceDesc') },
    { id: 'image' as InputMode, icon: Camera, label: t('grievance.inputModes.image'), desc: t('grievance.inputModes.imageDesc') },
    { id: 'location' as InputMode, icon: MapPin, label: t('grievance.inputModes.location'), desc: t('grievance.inputModes.locationDesc') },
  ];

  const categories = [
    { value: 'civic_infrastructure', label: t('grievance.categories.civic_infrastructure') },
    { value: 'sanitation', label: t('grievance.categories.sanitation') },
    { value: 'utilities', label: t('grievance.categories.utilities') },
    { value: 'public_safety', label: t('grievance.categories.public_safety') },
    { value: 'healthcare', label: t('grievance.categories.healthcare') },
    { value: 'education', label: t('grievance.categories.education') },
    { value: 'administration', label: t('grievance.categories.administration') },
  ];

  const priorities = [
    { value: 'low', label: t('grievance.priorities.low') },
    { value: 'medium', label: t('grievance.priorities.medium') },
    { value: 'high', label: t('grievance.priorities.high') },
    { value: 'critical', label: t('grievance.priorities.critical') },
  ];

  const handleAnalyze = async () => {
    if (!formData.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please provide a description of your grievance.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setStep(2);

    try {
      // Call AI analysis edge function
      const response = await supabase.functions.invoke('analyze-grievance', {
        body: {
          description: formData.description,
          title: formData.title,
          input_mode: inputMode,
        },
      });

      if (response.error) throw response.error;

      const analysis = response.data as AIAnalysis;
      setAiAnalysis(analysis);

      // Auto-fill form with AI suggestions
      setFormData((prev) => ({
        ...prev,
        category: analysis.category || prev.category,
        priority: analysis.priority || prev.priority,
        title: prev.title || analysis.summary?.substring(0, 100) || prev.title,
      }));

      setStep(3);
    } catch (err) {
      console.error('AI analysis error:', err);
      // Fallback: Skip AI analysis and go to manual entry
      toast({
        title: 'AI Analysis Unavailable',
        description: 'Please fill in the details manually.',
        variant: 'destructive',
      });
      setStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.category) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const insertData: any = {
        user_id: user?.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        location_address: formData.location_address || null,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        input_mode: inputMode,
        ai_analysis: aiAnalysis,
      };

      const { data, error } = await supabase
        .from('grievances')
        .insert(insertData)
        .select('tracking_id')
        .single();

      if (error) throw error;

      setTrackingId(data.tracking_id);
      setStep(4);

      toast({
        title: 'Grievance Submitted',
        description: `Your grievance has been submitted. Tracking ID: ${data.tracking_id}`,
      });
    } catch (err) {
      console.error('Submit error:', err);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your grievance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude,
          }));
          toast({
            title: 'Location Captured',
            description: 'Your current location has been added.',
          });
        },
        (error) => {
          toast({
            title: 'Location Error',
            description: 'Unable to get your location. Please enter it manually.',
            variant: 'destructive',
          });
        }
      );
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold mb-2">
                {t('grievance.inputModes.title')}
              </h2>
              <p className="text-muted-foreground text-sm">
                Select how you'd like to submit your grievance
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {inputModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setInputMode(mode.id)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
                    inputMode === mode.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-full',
                      inputMode === mode.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <mode.icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{mode.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Text Input Form */}
            {inputMode === 'text' && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('grievance.title')} *</Label>
                  <Input
                    id="title"
                    placeholder="Brief title of your grievance"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('grievance.description')} *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your grievance in detail. Include what happened, when, and where."
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('grievance.location')}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter address or location"
                      value={formData.location_address}
                      onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={handleGetLocation}>
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.location_lat && (
                    <p className="text-xs text-muted-foreground">
                      📍 Location captured: {formData.location_lat.toFixed(4)}, {formData.location_lng?.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {inputMode === 'voice' && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Voice recording will be available soon.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  For now, please use text input.
                </p>
              </div>
            )}

            {inputMode === 'image' && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Image upload will be available soon.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  For now, please use text input.
                </p>
              </div>
            )}

            {inputMode === 'location' && (
              <div className="text-center py-8">
                <Button onClick={handleGetLocation} className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Capture Current Location
                </Button>
                {formData.location_lat && (
                  <p className="text-sm text-muted-foreground mt-4">
                    📍 Location: {formData.location_lat.toFixed(4)}, {formData.location_lng?.toFixed(4)}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-6">
              <Brain className="h-12 w-12 animate-pulse" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">
              {t('grievance.submission.analyzing')}
            </h2>
            <p className="text-muted-foreground">
              Our AI is analyzing your grievance to categorize and prioritize it...
            </p>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-6" />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold mb-2">
                {t('grievance.submission.confirmDetails')}
              </h2>
              {aiAnalysis && (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 mb-4">
                  <div className="flex items-center gap-2 text-accent mb-2">
                    <Brain className="h-4 w-4" />
                    <span className="font-medium">AI Analysis</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Confidence: {(aiAnalysis.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review-title">{t('grievance.title')} *</Label>
                <Input
                  id="review-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-category">{t('grievance.category')} *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-priority">{t('grievance.priority')}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('grievance.description')}</Label>
                <div className="p-3 rounded-lg bg-muted text-sm">
                  {formData.description}
                </div>
              </div>

              {formData.location_address && (
                <div className="space-y-2">
                  <Label>{t('grievance.location')}</Label>
                  <div className="p-3 rounded-lg bg-muted text-sm">
                    {formData.location_address}
                    {formData.location_lat && (
                      <span className="text-muted-foreground ml-2">
                        ({formData.location_lat.toFixed(4)}, {formData.location_lng?.toFixed(4)})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center py-8">
            <div className="inline-flex p-4 rounded-full bg-accent/10 text-accent mb-6">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              {t('grievance.submission.submitSuccess')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('grievance.submission.trackingIdLabel')}
            </p>
            <div className="inline-block px-6 py-3 rounded-lg bg-muted font-mono text-lg font-bold text-foreground mb-8">
              {trackingId}
            </div>

            <div className="max-w-md mx-auto text-left">
              <h3 className="font-semibold mb-3">{t('grievance.submission.whatNext')}</h3>
              <ul className="space-y-2">
                {t('grievance.submission.nextSteps').split(',').map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => {
                setStep(1);
                setFormData({
                  title: '',
                  description: '',
                  category: '',
                  priority: 'medium',
                  location_address: '',
                  location_lat: null,
                  location_lng: null,
                });
                setAiAnalysis(null);
                setTrackingId(null);
              }}>
                Submit Another
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout showFooter={false}>
      <div className="container py-8 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => step === 1 ? navigate(-1) : setStep((s) => (s - 1) as Step)}
          disabled={step === 2 || step === 4}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Progress Steps */}
        {step !== 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    s === step
                      ? 'bg-primary text-primary-foreground'
                      : s < step
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s < step ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={cn(
                      'w-12 h-1 mx-1',
                      s < step ? 'bg-accent' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              {step === 1 && t('grievance.submission.step1')}
              {step === 2 && t('grievance.submission.step2')}
              {step === 3 && t('grievance.submission.step3')}
              {step === 4 && ''}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        {/* Navigation Buttons */}
        {step !== 2 && step !== 4 && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => step === 1 ? navigate(-1) : setStep((s) => (s - 1) as Step)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>

            {step === 1 && inputMode === 'text' && (
              <Button onClick={handleAnalyze} disabled={!formData.description.trim()}>
                {t('common.next')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 3 && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('common.submit')}
              </Button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
