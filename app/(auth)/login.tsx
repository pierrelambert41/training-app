import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, errorMessage, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    await login(email.trim(), password);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 items-center justify-center p-6 gap-6">
        <Text className="text-heading text-content-primary">Training App</Text>
        <Text className="text-label text-content-secondary">Connexion</Text>

        <View className="w-full gap-3">
          <TextInput
            className="w-full bg-surface border border-border rounded-button h-tap px-4 text-body text-content-primary"
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
            className="w-full bg-surface border border-border rounded-button h-tap px-4 text-body text-content-primary"
            placeholder="Mot de passe"
            placeholderTextColor="#6B7280"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError(); }}
            editable={!isLoading}
          />
        </View>

        {errorMessage ? (
          <Text className="text-label text-red-400 text-center">{errorMessage}</Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          disabled={isLoading || !email || !password}
          className="w-full bg-accent rounded-button h-tap items-center justify-center disabled:opacity-50"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-body text-white font-semibold">Se connecter</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/register')} disabled={isLoading}>
          <Text className="text-label text-content-secondary">
            Pas de compte ?{' '}
            <Text className="text-accent">S&apos;inscrire</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
