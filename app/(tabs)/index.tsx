import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { sendAcknowledgmentToUser, sendComplaintToDepartment } from '@/services/email-service';
import { classifyComplaint, transcribeAudio } from '@/services/openai-service';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [complaintText, setComplaintText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        Alert.alert('Error', 'No recording found');
        return;
      }

      // Transcribe audio using OpenAI Whisper
      const transcribedText = await transcribeAudio(uri);
      setComplaintText(transcribedText);
      Alert.alert('Success', 'Audio transcribed successfully!');
    } catch (error) {
      console.error('Failed to transcribe audio', error);
      Alert.alert('Error', 'Failed to transcribe audio. Please try typing instead.');
    } finally {
      setRecording(null);
      setIsProcessing(false);
    }
  }

  async function handleSubmitComplaint() {
    if (!complaintText.trim()) {
      Alert.alert('Error', 'Please enter or record a complaint');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a complaint');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Classify the complaint using OpenAI
      const category = await classifyComplaint(complaintText);

      // Step 2: Get department email from database
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('email, name')
        .eq('name', category)
        .single();

      if (deptError || !department) {
        console.error('Department error:', deptError);
        throw new Error(`Failed to find department for category: ${category}`);
      }

      // Step 3: Get user details
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single();

      // If user profile doesn't exist, create it
      if (userError || !userData) {
        console.log('User profile not found, creating one...');
        
        // Get name from user metadata (set during signup) or email
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            name: userName,
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create user profile:', createError);
          throw new Error('Please make sure you have verified your email address before submitting a complaint.');
        }
        
        userData = newUser || {
          name: userName,
          email: user.email || '',
        };
      }

      // Step 4: Save complaint to database
      const { error: complaintError } = await supabase
        .from('complaints')
        .insert({
          user_id: user.id,
          text: complaintText,
          category,
          status: 'sent',
        });

      if (complaintError) {
        console.error('Complaint save error:', complaintError);
        throw new Error('Failed to save complaint');
      }

      // Step 5: Send emails
      const emailSent = await sendComplaintToDepartment(
        department.email,
        userData.name,
        userData.email,
        complaintText,
        category
      );

      const ackSent = await sendAcknowledgmentToUser(
        userData.email,
        userData.name,
        complaintText,
        category
      );

      if (!emailSent || !ackSent) {
        Alert.alert(
          'Warning',
          'Complaint saved but there was an issue sending emails. The department will still receive your complaint.'
        );
      } else {
        Alert.alert(
          'Success!',
          `Your complaint has been routed to the ${category} department. You will receive an acknowledgment email shortly.`,
          [{ text: 'OK', onPress: () => setComplaintText('') }]
        );
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit complaint. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Submit a Complaint</Text>
          <Text style={styles.subtitle}>
            Describe your issue and we'll route it to the right department
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Complaint Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your complaint here..."
            value={complaintText}
            onChangeText={setComplaintText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!isProcessing && !isRecording}
          />

          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              isProcessing && styles.buttonDisabled,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <Ionicons
              name={isRecording ? 'stop-circle' : 'mic'}
              size={24}
              color="#fff"
            />
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop Recording' : 'Record Voice Complaint'}
            </Text>
          </TouchableOpacity>

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>
                {isRecording ? 'Processing...' : 'Analyzing and routing your complaint...'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (isProcessing || !complaintText.trim()) && styles.buttonDisabled,
            ]}
            onPress={handleSubmitComplaint}
            disabled={isProcessing || !complaintText.trim()}
          >
            <Text style={styles.submitButtonText}>Submit Complaint</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 150,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orText: {
    marginHorizontal: 15,
    color: '#999',
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recordButtonActive: {
    backgroundColor: '#FF3B30',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  processingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
