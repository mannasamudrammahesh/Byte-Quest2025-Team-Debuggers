import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Brain,
  Target,
  Route,
  Eye,
  ArrowRight,
  CheckCircle,
  Clock,
  Building,
  Users,
  FileText,
  Mic,
  Camera,
  MapPin,
} from 'lucide-react';

export default function Index() {
  const { t } = useLanguage();
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const handleReportClick = () => {
    if (isAuthenticated) {
      navigate('/submit');
    } else {
      navigate('/auth?mode=signup');
    }
  };

  const handleTrackClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    {
      icon: Brain,
      title: t('landing.features.aiDetection.title'),
      description: t('landing.features.aiDetection.description'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Target,
      title: t('landing.features.smartPriority.title'),
      description: t('landing.features.smartPriority.description'),
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: Route,
      title: t('landing.features.autoRouting.title'),
      description: t('landing.features.autoRouting.description'),
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: Eye,
      title: t('landing.features.transparentTracking.title'),
      description: t('landing.features.transparentTracking.description'),
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  const stats = [
    { icon: CheckCircle, value: '10,000+', label: t('landing.stats.grievancesResolved') },
    { icon: Clock, value: '48 hrs', label: t('landing.stats.avgResolutionTime') },
    { icon: Building, value: '7', label: t('landing.stats.departments') },
    { icon: Users, value: '95%', label: t('landing.stats.citizensSatisfied') },
  ];

  const inputModes = [
    { icon: FileText, label: 'Text', description: 'Type your complaint' },
    { icon: Mic, label: 'Voice', description: 'Speak your complaint' },
    { icon: Camera, label: 'Image', description: 'Upload photos' },
    { icon: MapPin, label: 'Location', description: 'Pin the problem' },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm font-medium text-primary mb-6 animate-fade-in">
              <Brain className="h-4 w-4" />
              AI-Powered Governance
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground animate-fade-up">
              {t('landing.heroTitle')}
            </h1>

            <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto animate-fade-up delay-100">
              {t('landing.heroSubtitle')}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-200">
              <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={handleReportClick}>
                {t('landing.reportButton')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={handleTrackClick}>
                {t('landing.trackButton')}
              </Button>
            </div>

            {/* Input Mode Icons */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto animate-fade-up delay-300">
              {inputModes.map((mode, index) => (
                <div
                  key={mode.label}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background border transition-all hover:shadow-md hover:border-primary/50"
                >
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <mode.icon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-sm">{mode.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{mode.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground font-display">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              How GrievAI Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered system ensures your grievance reaches the right department
              and gets resolved quickly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Simple 4-Step Process
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-border" />

            {[
              { step: 1, title: 'Report', desc: 'Submit via text, voice, or image' },
              { step: 2, title: 'AI Analysis', desc: 'AI categorizes & prioritizes' },
              { step: 3, title: 'Route', desc: 'Auto-assigned to department' },
              { step: 4, title: 'Resolve', desc: 'Track until resolution' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-display font-bold text-lg mb-4 relative z-10">
                  {item.step}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <Card className="bg-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Ready to Report a Grievance?
              </h2>
              <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto mb-8">
                Join thousands of citizens who have already benefited from transparent,
                AI-powered grievance resolution.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 w-full sm:w-auto"
                  onClick={handleReportClick}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={handleTrackClick}
                >
                  Track Existing Grievance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
