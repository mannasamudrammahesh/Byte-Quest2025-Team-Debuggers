import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Settings,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  Search,
  UserCheck,
  Shield,
  Loader2,
  BarChart3,
  MapPin,
} from 'lucide-react';

type AppRole = 'citizen' | 'officer' | 'admin';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  role: AppRole;
}

interface GrievanceStats {
  total: number;
  pending: number;
  resolved: number;
  critical: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<GrievanceStats>({
    total: 0,
    pending: 0,
    resolved: 0,
    critical: 0,
    byCategory: {},
    byPriority: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('citizen');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          user_roles!inner(role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithRoles = data?.map(user => ({
        ...user,
        role: user.user_roles[0]?.role || 'citizen'
      })) || [];

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch users. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchStats = async () => {
    try {
      const { data: grievances, error } = await supabase
        .from('grievances')
        .select('status, priority, category');

      if (error) throw error;

      const total = grievances?.length || 0;
      const pending = grievances?.filter(g => ['received', 'assigned'].includes(g.status)).length || 0;
      const resolved = grievances?.filter(g => ['resolved', 'closed'].includes(g.status)).length || 0;
      const critical = grievances?.filter(g => g.priority === 'critical').length || 0;

      const byCategory: Record<string, number> = {};
      const byPriority: Record<string, number> = {};

      grievances?.forEach(g => {
        byCategory[g.category] = (byCategory[g.category] || 0) + 1;
        byPriority[g.priority] = (byPriority[g.priority] || 0) + 1;
      });

      setStats({
        total,
        pending,
        resolved,
        critical,
        byCategory,
        byPriority,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `${selectedUser.full_name || selectedUser.email}'s role has been updated to ${newRole}.`,
      });

      await fetchUsers();
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating role:', err);
      toast({
        title: 'Update Failed',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return <Settings className="h-4 w-4" />;
      case 'officer':
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleClass = (role: AppRole) => {
    const classes: Record<AppRole, string> = {
      admin: 'bg-purple-100 text-purple-800',
      officer: 'bg-blue-100 text-blue-800',
      citizen: 'bg-green-100 text-green-800',
    };
    return classes[role];
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
            <Settings className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || 'Admin'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Grievances</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
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
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <TrendingUp className="h-5 w-5" />
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

        {/* Category Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Grievances by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {category.replace('_', ' ')}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Grievances by Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byPriority).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{priority}</span>
                    <Badge 
                      variant="outline"
                      className={
                        priority === 'critical' ? 'border-red-200 text-red-800' :
                        priority === 'high' ? 'border-orange-200 text-orange-800' :
                        priority === 'medium' ? 'border-yellow-200 text-yellow-800' :
                        'border-green-200 text-green-800'
                      }
                    >
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <div className="flex gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No users match your search criteria.' : 'No users have registered yet.'}
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{user.full_name || 'No name'}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleClass(user.role)}>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          {user.role}
                        </div>
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Change Role
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Change User Role</DialogTitle>
                            <DialogDescription>
                              Update the role for {user.full_name || user.email}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">New Role</label>
                              <Select
                                value={newRole}
                                onValueChange={(value) => setNewRole(value as AppRole)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="citizen">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      Citizen
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="officer">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-4 w-4" />
                                      Officer
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Settings className="h-4 w-4" />
                                      Admin
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={updateUserRole}
                              disabled={isUpdating || newRole === user.role}
                            >
                              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Update Role
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}