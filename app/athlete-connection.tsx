import { PlaceholderScreen } from '../components/PlaceholderScreen';

export default function AthleteConnectionScreen() {
  return (
    <PlaceholderScreen
      title="Connect parent or trainer"
      subtitle="Invite codes and QR — port from web AthleteConnectionScreen.tsx."
      actions={[
        { label: 'Back', back: true },
        { label: 'Athlete dashboard', href: '/dashboard' },
      ]}
    />
  );
}
