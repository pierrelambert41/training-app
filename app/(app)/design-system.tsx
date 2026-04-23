import { ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppText } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/themed-card';
import { useState } from 'react';

export default function DesignSystemScreen() {
  if (!__DEV__) {
    return <Redirect href="/(app)" />;
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-8"
    >
      <AppText variant="heading">Design System</AppText>

      {/* Typographie */}
      <Section title="Typographie">
        <AppText variant="heading">Heading — Bench Press 95 kg</AppText>
        <AppText variant="body">Body — Prochain set : 5 reps à RIR 2</AppText>
        <AppText variant="caption">Caption — Dernière séance il y a 3 jours</AppText>
        <AppText variant="body" muted>Body muted — Détails optionnels</AppText>
      </Section>

      {/* Boutons */}
      <Section title="Boutons — Primary">
        <Button label="LOG SET" onPress={() => {}} size="lg" />
        <Button label="Démarrer la séance" onPress={() => {}} />
        <Button label="Chargement..." onPress={() => {}} loading />
        <Button label="Désactivé" onPress={() => {}} disabled />
      </Section>

      <Section title="Boutons — Secondary & Ghost">
        <Button label="Modifier le set" onPress={() => {}} variant="secondary" />
        <Button label="Skip exercice" onPress={() => {}} variant="ghost" />
        <Button label="Secondary désactivé" onPress={() => {}} variant="secondary" disabled />
      </Section>

      {/* Inputs */}
      <Section title="Inputs">
        <Input
          label="Email"
          placeholder="exemple@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label="Mot de passe"
          placeholder="••••••••"
          secure
          value={password}
          onChangeText={setPassword}
        />
        <Input
          label="Charge (kg)"
          placeholder="0"
          keyboardType="numeric"
          error="Valeur requise"
        />
        <Input
          placeholder="Sans label ni erreur"
        />
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <Card>
          <AppText variant="body">Card par défaut — surface</AppText>
          <AppText variant="caption">Contenu secondaire</AppText>
        </Card>
        <Card elevation="elevated">
          <AppText variant="body">Card élevée</AppText>
          <AppText variant="caption">Apparaît au-dessus</AppText>
        </Card>
      </Section>

      {/* ThemedCard (composant existant) */}
      <Section title="ThemedCard (composant existant)">
        <ThemedCard title="Charge cible" value="95" unit="kg" />
        <ThemedCard title="Progression" value="+2.5" unit="kg" status="success" />
        <ThemedCard title="Fatigue" value="Modérée" status="warning" />
        <ThemedCard title="Dernier set" value="Échec" status="danger" />
      </Section>

      {/* Statuts couleurs */}
      <Section title="Statuts">
        <Card>
          <View className="gap-2">
            <AppText variant="body" className="text-status-success">Vert — Progression / Réussite</AppText>
            <AppText variant="body" className="text-status-warning">Orange — Maintien / Attention</AppText>
            <AppText variant="body" className="text-status-danger">Rouge — Échec / Deload</AppText>
            <AppText variant="body" className="text-accent">Bleu — Action principale</AppText>
          </View>
        </Card>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <AppText variant="caption" className="text-content-muted uppercase tracking-wider">{title}</AppText>
      {children}
    </View>
  );
}
