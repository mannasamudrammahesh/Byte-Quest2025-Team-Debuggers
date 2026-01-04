import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  MapPin,
  User,
  Calendar,
  Filter,
  Search,
  Eye,
  MessageSquare,
  Loader2,
} from 'lucide-react';

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
  location_address: string;
  location_lat: number;
  location_lng: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  ai_analysis: any;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface StatusUpdate {
  status: GrievanceStatus;
  notes: string;
}

export default function OfficerDashboard() {
  const { t } = useLanguage();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate>({ status: 'received', notes: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchAssignedGrievances();
  }, []);

  const fetchAssignedGrievances = async () => {
    try {
      // For now, fetch all grievances. In production, filter by assigned officer
      const { data, error } = await supabase
        .from('grievances')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrievances(data as Grievance[] || []);
    } catch (err) {
      console.error('Error fetching grievances:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch grievances. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateGrievanceStatus = async () => {
    if (!selectedGrievance || !statusUpdate.status) return;

    setIsUpdating(true);
    try {
      // Update grievance status
      const { error: updateError } = await supabase
        .from('grievances')
        .update({
          status: statusUpdate.status,
          updated_at: new Date().toISOString(),
          ...(statusUpdate.status === 'resolved' && { resolved_at: new Date().toISOString() })
        })
        .eq('id', selectedGrievance.id);

      if (updateError) throw updateError;

      // Add timeline entry
      const { error: timelineError } = await supabase
        .from('grievance_timeline')
        .insert({
          grievance_id: selectedGrievance.id,
          status: statusUpdate.status,
          notes: statusUpdate.notes,
          updated_by: user?.id,
        });

      if (timelineError) throw timelineError;

      toast({
        title: 'Status Updated',
        description: `Grievance ${selectedGrievance.tracking_id} has been updated to ${statusUpdate.status}.`,
      });

      // Refresh grievances
      await fetchAssignedGrievances();
      setSelectedGrievance(null);
      setStatusUpdate({ status: 'received', notes: '' });
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: 'Update Failed',
        description: 'Failed to update grievance status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredGrievances = grievances.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || g.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
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
      received: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      escalated: 'bg-red-100 text-red-800',
    };
    return classes[status] || classes.received;
  };

  const getPriorityClass = (priority: GrievancePriority) => {
    const classes: Record<GrievancePriority, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return classes[priority] || classes.medium;
  };

  const stats = {
    total: grievances.length,
    pending: grievances.filter(g => ['received', 'assigned'].includes(g.status)).length,
    inProgress: grievances.filter(g => g.status === 'in_progress').length,
    resolved: grievances.filter(g => ['resolved', 'closed'].includes(g.status)).length,
    critical: grievances.filter(g => g.priority === 'critical').length,
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Briefcase className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Officer Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || 'Officer'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by title, tracking ID, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grievances List */}
        <div className="space-y-4">
          {filteredGrievances.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Grievances Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'No grievances match your current filters.'
                    : 'No grievances have been assigned to you yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredGrievances.map((grievance) => (
              <Card key={grievance.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {grievance.tracking_id}
                        </Badge>
                        <Badge className={getStatusClass(grievance.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(grievance.status)}
                            {grievance.status.replace('_', ' ')}
                          </div>
                        </Badge>
                        <Badge className={getPriorityClass(grievance.priority)}>
                          {grievance.priority}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-lg mb-2">{grievance.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {grievance.description}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {grievance.profiles?.full_name || 'Anonymous'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(grievance.created_at).toLocaleDateString()}
                        </div>
                        {grievance.location_address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {grievance.location_address.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/grievance/${grievance.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedGrievance(grievance);
                              setStatusUpdate({ status: grievance.status, notes: '' });
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Update Grievance Status</DialogTitle>
                            <DialogDescription>
                              Update the status of grievance {grievance.tracking_id}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Status</label>
                              <Select
                                value={statusUpdate.status}
                                onValueChange={(value) =>
                                  setStatusUpdate({ ...statusUpdate, status: value as GrievanceStatus })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="received">Received</SelectItem>
                                  <SelectItem value="assigned">Assigned</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                  <SelectItem value="escalated">Escalated</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Notes</label>
                              <Textarea
                                placeholder="Add notes about this status update..."
                                value={statusUpdate.notes}
                                onChange={(e) =>
                                  setStatusUpdate({ ...statusUpdate, notes: e.target.value })
                                }
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={updateGrievanceStatus}
                              disabled={isUpdating}
                            >
                              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Update Status
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
