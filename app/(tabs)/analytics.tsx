import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebaseConfig';
import { useAuth } from '../../src/context/AuthContext';
import { PieChart, BarChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: any;
};

export default function AnalyticsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
      
      setTransactions(fetchedTransactions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const { pieData, barData } = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'expense') {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        totalExpense += t.amount;
      }
    });

    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
    let colorIndex = 0;

    const pieDataMap = Object.keys(expensesByCategory).map(key => {
      const color = colors[colorIndex % colors.length];
      colorIndex++;
      return {
        value: expensesByCategory[key],
        color,
        text: key,
      };
    }).sort((a, b) => b.value - a.value);

    // Group expenses by day (simple example, last 7 days)
    const dailyExpenses: Record<string, number> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyExpenses[label] = 0;
    }

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date) {
        const d = t.date.toDate ? t.date.toDate() : new Date(t.date);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 0 && diffDays <= 6) {
          const label = d.toLocaleDateString('en-US', { weekday: 'short' });
          if (dailyExpenses[label] !== undefined) {
            dailyExpenses[label] += t.amount;
          }
        }
      }
    });

    const barDataMap = Object.keys(dailyExpenses).map(key => ({
      value: dailyExpenses[key],
      label: key,
      frontColor: '#10b981',
    }));

    return { pieData: pieDataMap, barData: barDataMap };
  }, [transactions]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Analytics</Text>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Expenses by Category</Text>
        {pieData.length > 0 ? (
          <View style={styles.pieContainer}>
            <PieChart
              data={pieData}
              donut
              showText
              textColor="black"
              radius={width * 0.3}
              innerRadius={width * 0.15}
              textSize={12}
              centerLabelComponent={() => {
                return (
                  <View style={{justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{fontSize: 22, color: 'white', fontWeight: 'bold'}}>
                      ${pieData.reduce((acc, curr) => acc + curr.value, 0).toFixed(0)}
                    </Text>
                  </View>
                );
              }}
            />
            <View style={styles.legendContainer}>
              {pieData.map(item => (
                <View key={item.text} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No expenses yet</Text>
        )}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days (Expenses)</Text>
        <BarChart
          data={barData}
          barWidth={22}
          noOfSections={4}
          barBorderRadius={4}
          frontColor="lightgray"
          yAxisThickness={0}
          xAxisThickness={0}
          xAxisLabelTextStyle={{color: '#94a3b8'}}
          yAxisTextStyle={{color: '#94a3b8'}}
          hideRules
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Midnight background
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    color: '#f8fafc',
    fontWeight: 'bold',
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    color: '#f8fafc',
    fontWeight: '600',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  pieContainer: {
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 20,
    marginBottom: 20,
  }
});
