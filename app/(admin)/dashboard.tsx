import { useAuth } from '@/contexts/auth-context';
import { Complaint, ComplaintAnalytics, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [analytics, setAnalytics] = useState<ComplaintAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  async function checkAdminAccess() {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      router.replace('/(tabs)');
    }
  }

  async function fetchData() {
    try {
      // Fetch all complaints with user information
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select(`
          *,
          users(name, email)
        `)
        .order('created_at', { ascending: false });

      if (complaintsError) throw complaintsError;
      setComplaints(complaintsData || []);

      // Fetch analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('complaint_analytics')
        .select('*');

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function updateComplaintStatus(complaintId: string, newStatus: 'acknowledged' | 'resolved') {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', complaintId);

      if (error) throw error;

      Alert.alert('Success', `Complaint marked as ${newStatus}`);
      setModalVisible(false);
      await fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update complaint status');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function getCategoryColor(category: string): string {
    switch (category) {
      case 'delivery': return '#FF9500';
      case 'manufacturing': return '#5856D6';
      case 'retail': return '#34C759';
      case 'warehouse': return '#007AFF';
      default: return '#8E8E93';
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'sent': return '#FF3B30';
      case 'acknowledged': return '#FF9500';
      case 'resolved': return '#34C759';
      default: return '#8E8E93';
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderAnalyticsCard(item: ComplaintAnalytics) {
    const total = item.total_complaints;
    const resolved = item.resolved_complaints;
    const resolvedPercentage = total > 0 ? ((resolved / total) * 100).toFixed(0) : 0;

    return (
      <View key={item.category} style={[styles.analyticsCard, { borderLeftColor: getCategoryColor(item.category) }]}>
        <View style={styles.analyticsHeader}>
          <Text style={styles.categoryTitle}>{item.category.toUpperCase()}</Text>
          <Text style={styles.totalComplaints}>{total} Total</Text>
        </View>
        <View style={styles.analyticsStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{item.pending_complaints}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF9500' }]}>{item.acknowledged_complaints}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>{resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${resolvedPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{resolvedPercentage}% Resolution Rate</Text>
        <Text style={styles.avgTime}>Avg Age: {item.avg_age_hours.toFixed(1)} hours</Text>
      </View>
    );
  }

  function renderComplaintItem(item: Complaint) {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.complaintItem}
        onPress={() => {
          setSelectedComplaint(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.complaintHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
            <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>
              {item.category}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.complaintText} numberOfLines={2}>
          {item.text}
        </Text>
        <View style={styles.complaintFooter}>
          <Text style={styles.userName}>
            👤 {(item as any).users?.name || (item as any).users?.email?.split('@')[0] || 'Unknown User'}
          </Text>
          <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Supply Chain Oversight</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overview Stats */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>📊 Department Analytics</Text>
          {analytics.map(renderAnalyticsCard)}
        </View>

        {/* All Complaints */}
        <View style={styles.complaintsSection}>
          <Text style={styles.sectionTitle}>📋 All Complaints ({complaints.length})</Text>
          {complaints.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No complaints yet</Text>
            </View>
          ) : (
            complaints.map(renderComplaintItem)
          )}
        </View>
      </ScrollView>

      {/* Complaint Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complaint Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Category</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(selectedComplaint.category) + '20' }]}>
                    <Text style={[styles.categoryBadgeText, { color: getCategoryColor(selectedComplaint.category) }]}>
                      {selectedComplaint.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedComplaint.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedComplaint.status) }]}>
                      {selectedComplaint.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>User</Text>
                  <Text style={styles.modalValue}>
                    {(selectedComplaint as any).users?.name || 
                     (selectedComplaint as any).users?.email?.split('@')[0] || 
                     'Unknown User'}
                  </Text>
                  <Text style={styles.modalSubValue}>
                    {(selectedComplaint as any).users?.email || 'No email available'}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Complaint</Text>
                  <Text style={styles.modalValue}>{selectedComplaint.text}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Submitted</Text>
                  <Text style={styles.modalValue}>{formatDate(selectedComplaint.created_at)}</Text>
                </View>

                {selectedComplaint.status !== 'resolved' && (
                  <View style={styles.modalActions}>
                    <Text style={styles.modalLabel}>Update Status</Text>
                    {selectedComplaint.status === 'sent' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                        onPress={() => updateComplaintStatus(selectedComplaint.id, 'acknowledged')}
                      >
                        <Text style={styles.actionButtonText}>Mark as Acknowledged</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#34C759' }]}
                      onPress={() => updateComplaintStatus(selectedComplaint.id, 'resolved')}
                    >
                      <Text style={styles.actionButtonText}>Mark as Resolved</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  signOutButton: {
    padding: 8,
  },
  overviewSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalComplaints: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  analyticsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 4,
  },
  avgTime: {
    fontSize: 12,
    color: '#999',
  },
  complaintsSection: {
    padding: 20,
  },
  complaintItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  complaintText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalSubValue: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  modalActions: {
    marginTop: 10,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
