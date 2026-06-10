import { PlaceholderScreen } from '../components/PlaceholderScreen';

export default function ProfileSetupScreen() {
  return (
    <PlaceholderScreen
      title="Profile setup"
      subtitle="Athlete profile — mirror fields from the web ProfileSetup screen here."
      actions={[
        { label: 'Back', back: true },
        { label: 'Continue to device pairing', href: '/onboarding' },
      ]}
    />
  );
}
