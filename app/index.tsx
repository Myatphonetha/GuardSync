import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { hasActiveSession, signInWithEmail, signUpWithEmail } from '../services/auth';
import { theme } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const loggedIn = await hasActiveSession();
        if (loggedIn && active) {
          router.replace('/role');
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[auth] session check failed', e);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUpMode) {
        await signUpWithEmail(email, password);
        Alert.alert(
          'Account created',
          'If your project requires email confirmation, verify your email then sign in.',
        );
        setIsSignUpMode(false);
      } else {
        await signInWithEmail(email, password);
        router.replace('/role');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(isSignUpMode ? 'Sign up failed' : 'Sign in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Checking session…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoGlyph}>✓</Text>
        </View>
        <Text style={styles.brand}>GuardSync</Text>
        <Text style={styles.tagline}>Smart mouthguard monitoring</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#bbb"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#bbb"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />

        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.togglePw}>
          <Text style={styles.togglePwText}>{showPassword ? 'Hide' : 'Show'} password</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, loading && styles.disabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? 'Please wait…' : isSignUpMode ? 'Create account' : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable onPress={() => setIsSignUpMode((v) => !v)} style={styles.altAction} disabled={loading}>
          <Text style={styles.altActionText}>
            {isSignUpMode ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </Text>
        </Pressable>

        <Text style={styles.hint}>Supabase auth: email + password. Telemetry upload requires a signed-in user.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: theme.muted },
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24, paddingTop: 56 },
  hero: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoGlyph: { color: '#fff', fontSize: 36, fontWeight: '700' },
  brand: { fontSize: 26, fontWeight: '700', color: theme.text, marginBottom: 4 },
  tagline: { fontSize: 14, color: theme.muted },
  form: { flex: 1, gap: 6 },
  label: { fontSize: 14, color: '#555', marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.text,
  },
  togglePw: { alignSelf: 'flex-end', marginTop: 4 },
  togglePwText: { fontSize: 13, color: theme.primary, fontWeight: '500' },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnPressed: { backgroundColor: theme.primaryDark },
  disabled: { opacity: 0.65 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  altAction: { alignSelf: 'center', marginTop: 14 },
  altActionText: { fontSize: 13, color: theme.primary, fontWeight: '500' },
  hint: { fontSize: 12, color: theme.muted, textAlign: 'center', marginTop: 16 },
});
