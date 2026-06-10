import { PlaceholderScreen } from '../components/PlaceholderScreen';

export default function TrainerProfileSetupScreen() {
  return (
    <PlaceholderScreen
      title="Trainer profile"
      subtitle="Team and notification settings — port from web TrainerProfileSetup."
      actions={[
        { label: 'Back', back: true },
        { label: 'Go to trainer dashboard', href: '/trainer-dashboard' },
      ]}
    />
  );
}
