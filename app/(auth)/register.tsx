import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, errorMessage, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const passwordsMatch = password === confirm;
  const canSubmit = !!email && !!password && !!confirm && passwordsMatch && !isLoading;

  async function handleRegister() {
    if (!passwordsMatch) return;
    await register(email.trim(), password);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 items-center justify-center p-6 gap-6">
        <Text className="text-heading text-content-primary">Créer un compte</Text>

        <View className="w-full gap-3">
          <TextInput
            className="w-full bg-background-surface border border-border rounded-button h-tap px-4 text-body text-content-primary"
            placeholder="Email"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError(); }}
            editable={!isLoading}
          />
          <TextInput
            className="w-full bg-background-surface border border-border rounded-button h-tap px-4 text-body text-content-primary"
            placeholder="Mot de passe"
            placeholderTextColor="#6B7280"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError(); }}
            editable={!isLoading}
          />
          <TextInput
            className="w-full bg-background-surface border border-border rounded-button h-tap px-4 text-body text-content-primary"
            placeholder="Confirmer le mot de passe"
            placeholderTextColor="#6B7280"
            secureTextEntry
            autoComplete="new-password"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); clearError(); }}
            editable={!isLoading}
          />
        </View>

        {confirm.length > 0 && !passwordsMatch ? (
          <Text className="text-label text-red-400 text-center">Les mots de passe ne correspondent pas.</Text>
        ) : null}

        {errorMessage ? (
          <Text className="text-label text-red-400 text-center">{errorMessage}</Text>
        ) : null}

        <Pressable
          onPress={handleRegister}
          disabled={!canSubmit}
          className="w-full bg-accent rounded-button h-tap items-center justify-center disabled:opacity-50"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-body text-white font-semibold">Créer mon compte</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} disabled={isLoading}>
          <Text className="text-label text-content-secondary">
            Déjà un compte ?{' '}
            <Text className="text-accent">Se connecter</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
