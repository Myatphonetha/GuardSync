import { PlaceholderScreen } from '../components/PlaceholderScreen';

export default function ParentLinkingScreen() {
  return (
    <PlaceholderScreen
      title="Link to athlete"
      subtitle="Port from web ParentLinkingScreen.tsx."
      actions={[
        { label: 'Back', back: true },
        { label: 'Parent dashboard', href: '/parent-dashboard' },
      ]}
    />
  );
}
