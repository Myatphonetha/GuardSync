import { PlaceholderScreen } from '../components/PlaceholderScreen';

export default function ParentProfileSetupScreen() {
  return (
    <PlaceholderScreen
      title="Parent profile"
      subtitle="Complete parent profile fields, then link to your athlete."
      actions={[
        { label: 'Back', back: true },
        { label: 'Go to parent dashboard', href: '/parent-dashboard' },
      ]}
    />
  );
}
