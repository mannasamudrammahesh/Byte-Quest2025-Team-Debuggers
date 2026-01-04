import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AddressInput } from '@/components/ui/AddressInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { locationService } from '@/lib/locationService';
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
  Navigation,
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
  fallback?: boolean;
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
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
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
      // First try the Supabase edge function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('analyze-grievance', {
        body: {
          description: formData.description,
          title: formData.title,
          input_mode: inputMode,
          location_address: formData.location_address,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
      });

      if (response.error) {
        console.warn('Supabase function error:', response.error);
        throw new Error('Supabase function failed');
      }

      const analysis = response.data as AIAnalysis;
      if (analysis && analysis.category && analysis.priority) {
        setAiAnalysis(analysis);

        // Auto-fill form with AI suggestions
        setFormData((prev) => ({
          ...prev,
          category: analysis.category || prev.category,
          priority: analysis.priority || prev.priority,
          title: prev.title || analysis.summary?.substring(0, 100) || prev.title,
        }));

        setStep(3);
        return;
      }
      throw new Error('Invalid analysis response');
    } catch (err) {
      console.warn('AI analysis failed, using local fallback:', err);
      
      // Use local intelligent analysis as fallback
      const localAnalysis = performLocalAnalysis(formData.description, formData.title, formData.location_address);
      setAiAnalysis(localAnalysis);

      // Auto-fill form with local analysis
      setFormData((prev) => ({
        ...prev,
        category: localAnalysis.category || prev.category,
        priority: localAnalysis.priority || prev.priority,
        title: prev.title || localAnalysis.summary?.substring(0, 100) || prev.title,
      }));

      toast({
        title: 'Analysis Complete',
        description: 'Using local analysis. You can review and modify the suggestions.',
      });

      setStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Local analysis function that works without external APIs
  const performLocalAnalysis = (description: string, title: string, location: string): AIAnalysis => {
    const text = `${title} ${description} ${location}`.toLowerCase();
    
    let category = 'administration';
    let department = 'General Administration';
    let priority = 'medium';
    let confidence = 0.7;
    
    // Enhanced keyword-based category detection
    if (text.match(/\b(road|street|bridge|pothole|construction|infrastructure|pavement|sidewalk|traffic|signal)\b/)) {
      category = 'civic_infrastructure';
      department = 'Public Works Department';
      confidence = 0.8;
    } else if (text.match(/\b(garbage|waste|trash|cleaning|sanitation|toilet|drain|sewer|dump)\b/)) {
      category = 'sanitation';
      department = 'Sanitation Department';
      confidence = 0.8;
    } else if (text.match(/\b(water|electricity|power|gas|utility|outage|supply|connection|meter)\b/)) {
      category = 'utilities';
      department = 'Utilities Department';
      confidence = 0.8;
    } else if (text.match(/\b(police|safety|crime|theft|violence|emergency|fire|accident|security)\b/)) {
      category = 'public_safety';
      department = 'Police Department';
      confidence = 0.8;
    } else if (text.match(/\b(hospital|health|medical|doctor|medicine|clinic|ambulance|disease)\b/)) {
      category = 'healthcare';
      department = 'Health Department';
      confidence = 0.8;
    } else if (text.match(/\b(school|education|teacher|student|college|university|exam|admission)\b/)) {
      category = 'education';
      department = 'Education Department';
      confidence = 0.8;
    }
    
    // Enhanced priority detection
    if (text.match(/\b(emergency|urgent|critical|danger|life|death|accident|fire|flood|blocked|broken)\b/)) {
      priority = 'critical';
      confidence = Math.min(confidence + 0.1, 1.0);
    } else if (text.match(/\b(important|serious|major|outage|problem|issue|complaint|broken|damaged)\b/)) {
      priority = 'high';
    } else if (text.match(/\b(minor|small|suggestion|improve|request|slow|delay)\b/)) {
      priority = 'low';
    }
    
    // Generate summary
    const categoryName = category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const summary = `${categoryName} issue requiring ${priority} priority attention from ${department}`;
    
    return {
      category,
      priority,
      department,
      confidence,
      summary,
      fallback: true
    };
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

  const handleGetLocation = async () => {
    setIsCapturingLocation(true);
    
    try {
      toast({
        title: 'Getting Location',
        description: 'Please allow location access and wait...',
      });

      // Use enhanced LocationIQ service
      const locationData = await locationService.getLocationWithAddress();
      
      setFormData((prev) => ({
        ...prev,
        location_lat: locationData.coordinates.lat,
        location_lng: locationData.coordinates.lng,
        location_address: locationData.address,
      }));

      toast({
        title: 'Location Captured Successfully',
        description: `Address: ${locationData.address.length > 80 ? locationData.address.substring(0, 80) + '...' : locationData.address}`,
      });

    } catch (error) {
      console.error('Location capture failed:', error);
      
      // Fallback to basic GPS + OpenStreetMap
      try {
        const coordinates = await locationService.getCurrentPosition();
        const fallbackAddress = await locationService.fallbackReverseGeocode(
          coordinates.lat, 
          coordinates.lng
        );
        
        setFormData((prev) => ({
          ...prev,
          location_lat: coordinates.lat,
          location_lng: coordinates.lng,
          location_address: fallbackAddress,
        }));

        toast({
          title: 'Location Captured',
          description: 'GPS coordinates captured. Address lookup used fallback service.',
        });

      } catch (fallbackError) {
        console.error('Fallback location failed:', fallbackError);
        
        toast({
          title: 'Location Error',
          description: error instanceof Error ? error.message : 'Unable to get your location. Please enter it manually.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData((prev) => ({
      ...prev,
      location_address: address,
      location_lat: coordinates?.lat || prev.location_lat,
      location_lng: coordinates?.lng || prev.location_lng,
    }));
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
                  <AddressInput
                    value={formData.location_address}
                    onChange={handleAddressChange}
                    onLocationCapture={handleGetLocation}
                    placeholder="Enter address or location"
                    isCapturingLocation={isCapturingLocation}
                  />
                  {formData.location_lat && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      <span>
                        GPS: {formData.location_lat.toFixed(6)}, {formData.location_lng?.toFixed(6)}
                      </span>
                    </div>
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
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <MapPin className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Capture Your Location</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Get your current location or search for a specific address
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Location Address</Label>
                    <AddressInput
                      value={formData.location_address}
                      onChange={handleAddressChange}
                      onLocationCapture={handleGetLocation}
                      placeholder="Search for address or click GPS button"
                      isCapturingLocation={isCapturingLocation}
                    />
                  </div>

                  {formData.location_lat && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Navigation className="h-4 w-4 text-green-600" />
                        Location Captured
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formData.location_address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Coordinates: {formData.location_lat.toFixed(6)}, {formData.location_lng?.toFixed(6)}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleGetLocation} 
                      disabled={isCapturingLocation}
                      className="flex-1"
                    >
                      {isCapturingLocation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <Navigation className="h-4 w-4 mr-2" />
                          Use Current Location
                        </>
                      )}
                    </Button>
                  </div>
                </div>
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
                    {aiAnalysis.fallback && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Fallback Analysis
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{aiAnalysis.summary}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Department:</span>
                      <p className="text-muted-foreground">{aiAnalysis.department}</p>
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span>
                      <p className="text-muted-foreground">{(aiAnalysis.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  {aiAnalysis.confidence < 0.7 && (
                    <p className="text-xs text-yellow-600 mt-2">
                      ⚠️ Low confidence - please review the suggested category and priority
                    </p>
                  )}
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
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{formData.location_address}</p>
                        {formData.location_lat && (
                          <p className="text-xs text-muted-foreground mt-1">
                            GPS: {formData.location_lat.toFixed(6)}, {formData.location_lng?.toFixed(6)}
                          </p>
                        )}
                      </div>
                    </div>
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
