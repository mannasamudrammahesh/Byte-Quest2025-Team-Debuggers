import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type GrievanceStatus = 'received' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
type GrievancePriority = 'low' | 'medium' | 'high' | 'critical';

interface Grievance {
  id: string;
  tracking_id: string;
  title: string;
  description: string;
  category: string;
  priority: GrievancePriority;
  status: GrievanceStatus;
  created_at: string;
  updated_at: string;
}

export default function CitizenDashboard() {
  const { t } = useLanguage();
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    try {
      const { data, error } = await supabase
        .from('grievances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrievances(data as Grievance[] || []);
    } catch (err) {
      console.error('Error fetching grievances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGrievances = grievances.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.tracking_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: GrievanceStatus) => {
    switch (status) {
      case 'received':
        return <FileText className="h-4 w-4" />;
      case 'assigned':
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      case 'escalated':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusClass = (status: GrievanceStatus) => {
    const classes: Record<GrievanceStatus, string> = {
      received: 'bg-status-received text-white',
      assigned: 'bg-status-assigned text-white',
      in_progress: 'bg-status-in-progress text-foreground',
      resolved: 'bg-status-resolved text-white',
      closed: 'bg-status-closed text-white',
      escalated: 'bg-status-escalated text-white',
    };
    return classes[status] || '';
  };

  const getPriorityClass = (priority: GrievancePriority) => {
    const classes: Record<GrievancePriority, string> = {
      low: 'bg-priority-low text-white',
      medium: 'bg-priority-medium text-foreground',
      high: 'bg-priority-high text-white',
      critical: 'bg-priority-critical text-white',
    };
    return classes[priority] || '';
  };

  const stats = {
    total: grievances.length,
    pending: grievances.filter((g) => ['received', 'assigned'].includes(g.status)).length,
    inProgress: grievances.filter((g) => g.status === 'in_progress').length,
    resolved: grievances.filter((g) => ['resolved', 'closed'].includes(g.status)).length,
  };

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {t('dashboard.welcome')}, {profile?.full_name || 'Citizen'}
            </h1>
            <p className="text-muted-foreground mt-1">{t('dashboard.overview')}</p>
          </div>
          <Button onClick={() => navigate('/submit')} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('dashboard.submitNew')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard.stats.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard.stats.pending')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard.stats.inProgress')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard.stats.resolved')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grievances List */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>{t('dashboard.recentGrievances')}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or ID..."
                    className="pl-10 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredGrievances.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No grievances found</h3>
                <p className="text-muted-foreground mb-4">
                  {grievances.length === 0
                    ? "You haven't submitted any grievances yet."
                    : 'No grievances match your search criteria.'}
                </p>
                {grievances.length === 0 && (
                  <Button onClick={() => navigate('/submit')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Submit Your First Grievance
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGrievances.map((grievance) => (
                  <Link
                    key={grievance.id}
                    to={`/grievance/${grievance.id}`}
                    className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {grievance.tracking_id}
                          </span>
                        </div>
                        <h4 className="font-medium text-foreground truncate">
                          {grievance.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {grievance.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge
                            variant="secondary"
                            className={getStatusClass(grievance.status)}
                          >
                            {getStatusIcon(grievance.status)}
                            <span className="ml-1 capitalize">
                              {grievance.status.replace('_', ' ')}
                            </span>
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={getPriorityClass(grievance.priority)}
                          >
                            {grievance.priority}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {grievance.category.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(grievance.created_at).toLocaleDateString()}
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
