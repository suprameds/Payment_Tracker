'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { AuditLog, Profile } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/format';
import { useToast } from '@/components/providers/toast-provider';

interface AuditLogWithUser extends AuditLog {
  user_email?: string;
  user_role?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Access denied. Admin only.');
      router.push('/');
    }
  }, [isAdmin, authLoading, router, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Fetch logs and join with profiles to get user info
      // Note: Supabase JS doesn't do deep joins easily on auth.users, 
      // but we linked profiles to auth.users. 
      // Let's fetch logs and profiles.
      
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100);

      const logs = (logsData || []) as unknown as AuditLog[];

      if (logsError) throw logsError;

      // Get unique user IDs
      // Get unique user IDs
      const userIds: string[] = Array.from(new Set(
        logs
          .map((l) => l.changed_by)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ));

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, role')
          .in('id', userIds);
        
        const profiles = (profilesData || []) as unknown as Profile[];
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        const enrichedLogs = logs.map(log => ({
          ...log,
          user_email: profileMap.get(log.changed_by)?.email || undefined,
          user_role: profileMap.get(log.changed_by)?.role,
        })) || [];

        setLogs(enrichedLogs);
      } else {
        setLogs(logs);
      }

    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Audit Logs</h1>
          <p className="mt-2 text-gray-600">Track all critical changes in the system</p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500">
                        {new Date(log.changed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{log.user_email || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">{log.user_role}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600">{log.table_name}</td>
                      <td className="py-3 px-4">
                        <details className="cursor-pointer group">
                          <summary className="text-blue-600 hover:text-blue-800 font-medium focus:outline-none">
                            View Changes
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono overflow-auto max-h-40 max-w-lg">
                            {log.action === 'UPDATE' ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-red-600 font-bold">Old:</span>
                                  <pre>{JSON.stringify(log.old_data, null, 2)}</pre>
                                </div>
                                <div>
                                  <span className="text-green-600 font-bold">New:</span>
                                  <pre>{JSON.stringify(log.new_data, null, 2)}</pre>
                                </div>
                              </div>
                            ) : (
                              <pre>{JSON.stringify(log.new_data || log.old_data, null, 2)}</pre>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
