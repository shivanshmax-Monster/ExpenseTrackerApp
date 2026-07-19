import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebaseConfig';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SetBudgetScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [budget, setBudget] = useState(profile?.budgetLimit ? profile.budgetLimit.toString() : '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    const budgetNum = parseFloat(budget);
    
    if (isNaN(budgetNum) || budgetNum < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          budgetLimit: budgetNum
        });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          name: user.email?.split('@')[0] || 'User',
          budgetLimit: budgetNum,
          currency: 'USD'
        });
      }
      
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to save budget.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Monthly Budget</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Monthly Budget Limit ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#475569"
          keyboardType="decimal-pad"
          value={budget}
          onChangeText={setBudget}
          autoFocus
        />
        
        <Text style={styles.hint}>
          We'll notify you when your total monthly expenses exceed this amount. Set to 0 to disable.
        </Text>

        <TouchableOpacity 
          style={styles.saveButtonContainer}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButton}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Budget</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    paddingHorizontal: 24,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  hint: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 32,
    lineHeight: 20,
  },
  saveButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
