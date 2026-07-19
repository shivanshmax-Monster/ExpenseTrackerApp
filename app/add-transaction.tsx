import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebaseConfig';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddTransactionScreen() {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  const categories = {
    expense: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Other'],
    income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Other']
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || !category) {
      alert('Please enter a valid amount and select a category');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type,
        amount: parseFloat(amount),
        category,
        note,
        date: serverTimestamp(),
      });
      router.back();
    } catch (error) {
      console.error("Error saving transaction: ", error);
      alert('Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.title}>New Transaction</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'expense' && styles.typeButtonExpense]}
          onPress={() => { setType('expense'); setCategory(''); }}
        >
          <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'income' && styles.typeButtonIncome]}
          onPress={() => { setType('income'); setCategory(''); }}
        >
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Income</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoriesGrid}>
          {categories[type].map((cat) => (
            <TouchableOpacity 
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="What was this for?"
          placeholderTextColor="#64748b"
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity 
          style={styles.saveButtonContainer}
          onPress={handleSave}
          disabled={loading}
        >
          <LinearGradient
            colors={type === 'income' ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Transaction</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Midnight background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  iconButton: {
    padding: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonExpense: {
    backgroundColor: '#ef4444',
  },
  typeButtonIncome: {
    backgroundColor: '#10b981',
  },
  typeText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 16,
  },
  typeTextActive: {
    color: '#ffffff',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  currencySymbol: {
    color: '#f8fafc',
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    color: '#f8fafc',
    fontSize: 56,
    fontWeight: 'bold',
    minWidth: 150,
  },
  formContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    padding: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryChipActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  categoryText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#f8fafc',
  },
  noteInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 32,
  },
  saveButtonContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
