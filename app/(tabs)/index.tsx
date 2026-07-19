import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebaseConfig';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: any;
};

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertSent, setAlertSent] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTransactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        fetchedTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      
      // Sort by date descending
      fetchedTransactions.sort((a, b) => {
        const timeA = a.date?.toMillis ? a.date.toMillis() : 0;
        const timeB = b.date?.toMillis ? b.date.toMillis() : 0;
        return timeB - timeA;
      });

      setTransactions(fetchedTransactions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!filterCategory) return transactions;
    return transactions.filter(t => t.category === filterCategory);
  }, [transactions, filterCategory]);

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    });
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp };
  }, [transactions]);

  // Check budget limit alert
  useEffect(() => {
    if (profile?.budgetLimit && profile.budgetLimit > 0) {
      if (totalExpense >= profile.budgetLimit && !alertSent) {
        Alert.alert('Budget Alert! ⚠️', `You have exceeded your budget limit of $${profile.budgetLimit}.`);
        setAlertSent(true);
      } else if (totalExpense < profile.budgetLimit) {
        setAlertSent(false); // Reset if they delete transactions and go under
      }
    }
  }, [totalExpense, profile?.budgetLimit]);

  const exportData = async () => {
    if (transactions.length === 0) {
      Alert.alert('No data', 'There are no transactions to export.');
      return;
    }
    
    try {
      let csvContent = 'Expense Tracker Summary\n';
      csvContent += `Total Income,$${totalIncome.toFixed(2)}\n`;
      csvContent += `Total Expense,$${totalExpense.toFixed(2)}\n`;
      csvContent += `Net Balance,$${balance.toFixed(2)}\n\n`;
      csvContent += 'Date,Type,Category,Amount,Note\n';
      
      transactions.forEach(t => {
        const dateStr = t.date?.toDate ? t.date.toDate().toLocaleDateString() : 'N/A';
        const typeStr = t.type.charAt(0).toUpperCase() + t.type.slice(1);
        const amountStr = t.type === 'expense' ? `-${t.amount.toFixed(2)}` : `${t.amount.toFixed(2)}`;
        const escapedNote = t.note ? `"${t.note.replace(/"/g, '""')}"` : '';
        csvContent += `${dateStr},${typeStr},${t.category},${amountStr},${escapedNote}\n`;
      });
      
      const fileUri = FileSystem.cacheDirectory + 'transactions.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (err: any) {
      console.error('Export Error:', err);
      Alert.alert('Export Error Details', err.message || JSON.stringify(err) || String(err));
    }
  };

  const exportPDF = async () => {
    if (transactions.length === 0) {
      Alert.alert('No data', 'There are no transactions to export.');
      return;
    }
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              h1 { color: #10b981; }
              .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #10b981; color: white; }
              .expense { color: #ef4444; }
              .income { color: #10b981; }
            </style>
          </head>
          <body>
            <h1>Expense Tracker - Monthly Report</h1>
            <div class="summary">
              <h3>Summary</h3>
              <p>Total Income: <strong>$${totalIncome.toFixed(2)}</strong></p>
              <p>Total Expense: <strong>$${totalExpense.toFixed(2)}</strong></p>
              <p>Net Balance: <strong>$${balance.toFixed(2)}</strong></p>
            </div>
            <table>
              <tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Note</th></tr>
              ${transactions.map(t => `
                <tr>
                  <td>${t.date?.toDate ? t.date.toDate().toLocaleDateString() : 'N/A'}</td>
                  <td>${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
                  <td>${t.category}</td>
                  <td class="${t.type}">$${t.amount.toFixed(2)}</td>
                  <td>${t.note || ''}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;
      
      const { base64 } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: true 
      });
      
      const pdfUri = FileSystem.cacheDirectory + 'monthly-report.pdf';
      await FileSystem.writeAsStringAsync(pdfUri, base64 || '', { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      Alert.alert('Export Error', err.message);
    }
  };

  const handleExportPress = () => {
    Alert.alert('Export Report', 'Choose a format to export your monthly report:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'CSV', onPress: exportData },
      { text: 'PDF', onPress: exportPDF },
    ]);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    const iconName = isIncome ? 'arrow-down-circle' : 'arrow-up-circle';
    const iconColor = isIncome ? '#10b981' : '#ef4444';

    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/edit-transaction', params: { id: item.id } })}
      >
        <View style={styles.transactionLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>
          <View>
            <Text style={styles.transactionCategory}>{item.category}</Text>
            {item.note ? <Text style={styles.transactionNote}>{item.note}</Text> : null}
          </View>
        </View>
        <Text style={[styles.transactionAmount, { color: isIncome ? '#10b981' : '#f8fafc' }]}>
          {isIncome ? '+' : '-'}${item.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const budgetLimit = profile?.budgetLimit || 0;
  const budgetProgress = budgetLimit > 0 ? Math.min(totalExpense / budgetLimit, 1) : 0;
  const isOverBudget = budgetLimit > 0 && totalExpense >= budgetLimit;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{profile?.name || user?.email?.split('@')[0] || 'User'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={exportData} style={styles.exportButton}>
            <Ionicons name="download-outline" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportPDF} style={styles.exportButton}>
            <Ionicons name="document-text-outline" size={24} color="#f8fafc" />
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient
        colors={['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Ionicons name="arrow-down-outline" size={16} color="#d1fae5" />
              <Text style={styles.statLabel}>Income</Text>
            </View>
            <Text style={styles.statAmount}>${totalIncome.toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Ionicons name="arrow-up-outline" size={16} color="#fee2e2" />
              <Text style={styles.statLabel}>Expenses</Text>
            </View>
            <Text style={styles.statAmount}>${totalExpense.toFixed(2)}</Text>
          </View>
        </View>
      </LinearGradient>

      {budgetLimit > 0 ? (
        <View style={styles.budgetSection}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>Monthly Budget</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.budgetAmount, isOverBudget && { color: '#ef4444' }]}>
                ${totalExpense.toFixed(2)} / ${budgetLimit.toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => router.push('/set-budget')} style={{ marginLeft: 8 }}>
                <Ionicons name="pencil" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${budgetProgress * 100}%` },
                isOverBudget && { backgroundColor: '#ef4444' }
              ]} 
            />
          </View>
          {isOverBudget && (
            <Text style={styles.budgetWarning}>You have exceeded your budget!</Text>
          )}
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.setBudgetPrompt}
          onPress={() => router.push('/set-budget')}
        >
          <View style={styles.setBudgetIcon}>
            <Ionicons name="wallet-outline" size={24} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.setBudgetTitle}>Set a Monthly Budget</Text>
            <Text style={styles.setBudgetSubtext}>Track your spending limits easily</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      )}

      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => setFilterCategory(null)}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={{ paddingHorizontal: 24, alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.filterChip, filterCategory === null && styles.filterChipActive]}
              onPress={() => setFilterCategory(null)}
            >
              <Text style={[styles.filterText, filterCategory === null && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat}
                style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                onPress={() => setFilterCategory(cat)}
              >
                <Text style={[styles.filterText, filterCategory === cat && styles.filterTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Click the + button to add one</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.fabContainer} 
        onPress={() => router.push('/add-transaction')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={32} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Midnight background
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: '#94a3b8',
    fontSize: 16,
  },
  name: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: 'bold',
  },
  exportButton: {
    padding: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
  },
  balanceCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  balanceLabel: {
    color: '#d1fae5',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  statLabel: {
    color: '#d1fae5',
    fontSize: 13,
  },
  statAmount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  budgetSection: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  budgetAmount: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  budgetWarning: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  setBudgetPrompt: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  setBudgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setBudgetTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  setBudgetSubtext: {
    color: '#94a3b8',
    fontSize: 13,
  },
  transactionsSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    color: '#10b981',
    fontWeight: '600',
  },
  filterContainer: {
    marginTop: 10,
    marginBottom: 5,
    flexGrow: 0,
  },
  filterChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  filterText: {
    color: '#94a3b8',
    fontWeight: '500',
    fontSize: 15,
  },
  filterTextActive: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 100,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  transactionCategory: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionNote: {
    color: '#94a3b8',
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
