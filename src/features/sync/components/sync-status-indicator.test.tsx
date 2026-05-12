import { render, screen } from '@testing-library/react-native';
import { SyncStatusIndicator } from './sync-status-indicator';

describe('SyncStatusIndicator', () => {
  it('renders nothing when synced (no pending, no error, not syncing)', () => {
    const { toJSON } = render(
      <SyncStatusIndicator isSyncing={false} pendingCount={0} error={null} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders spinner when isSyncing', () => {
    render(<SyncStatusIndicator isSyncing={true} pendingCount={0} error={null} />);
    expect(screen.getByTestId('sync-indicator-syncing')).toBeTruthy();
  });

  it('renders error badge when error is set', () => {
    render(<SyncStatusIndicator isSyncing={false} pendingCount={0} error="Erreur réseau" />);
    expect(screen.getByTestId('sync-indicator-error')).toBeTruthy();
  });

  it('renders pending badge with count when pendingCount > 0', () => {
    render(<SyncStatusIndicator isSyncing={false} pendingCount={3} error={null} />);
    const badge = screen.getByTestId('sync-indicator-pending');
    expect(badge).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders 99+ when pendingCount > 99', () => {
    render(<SyncStatusIndicator isSyncing={false} pendingCount={150} error={null} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('prioritizes syncing over error', () => {
    render(<SyncStatusIndicator isSyncing={true} pendingCount={0} error="Erreur" />);
    expect(screen.getByTestId('sync-indicator-syncing')).toBeTruthy();
    expect(screen.queryByTestId('sync-indicator-error')).toBeNull();
  });

  it('prioritizes error over pending when not syncing', () => {
    render(<SyncStatusIndicator isSyncing={false} pendingCount={5} error="Erreur" />);
    expect(screen.getByTestId('sync-indicator-error')).toBeTruthy();
    expect(screen.queryByTestId('sync-indicator-pending')).toBeNull();
  });
});
