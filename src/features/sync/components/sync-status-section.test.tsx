import { render, screen, fireEvent } from '@testing-library/react-native';
import { SyncStatusSection } from './sync-status-section';
import { useSyncStore } from '../stores/sync-store';

jest.mock('../hooks/use-network-status', () => ({
  useNetworkStatus: jest.fn(() => ({ isOffline: false })),
}));

import { useNetworkStatus } from '../hooks/use-network-status';
const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;

function resetStore() {
  useSyncStore.setState({
    isSyncing: false,
    pendingCount: 0,
    error: null,
    lastSyncedAt: null,
    _triggerPush: null,
  });
}

describe('SyncStatusSection', () => {
  beforeEach(() => {
    resetStore();
    mockUseNetworkStatus.mockReturnValue({ isOffline: false });
  });

  it('affiche "Synchronisé" quand tout est clean', () => {
    render(<SyncStatusSection />);
    expect(screen.getByTestId('sync-status-label')).toHaveTextContent('Synchronisé');
  });

  it('affiche le statut pending avec le nombre', () => {
    useSyncStore.setState({ pendingCount: 4 });
    render(<SyncStatusSection />);
    expect(screen.getByTestId('sync-status-label')).toHaveTextContent('4 éléments en attente');
  });

  it('affiche "Synchronisation en cours" quand isSyncing', () => {
    useSyncStore.setState({ isSyncing: true });
    render(<SyncStatusSection />);
    expect(screen.getByTestId('sync-status-label')).toHaveTextContent('Synchronisation en cours…');
  });

  it("affiche le message d'erreur quand error est set", () => {
    useSyncStore.setState({ error: 'Erreur réseau' });
    render(<SyncStatusSection />);
    expect(screen.getByTestId('sync-status-label')).toHaveTextContent('Erreur de synchronisation');
  });

  it('le bouton est désactivé si isSyncing', () => {
    useSyncStore.setState({ isSyncing: true });
    render(<SyncStatusSection />);
    const button = screen.getByTestId('sync-manual-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('le bouton est actif si !isSyncing', () => {
    useSyncStore.setState({ isSyncing: false });
    render(<SyncStatusSection />);
    const button = screen.getByTestId('sync-manual-button');
    expect(button.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('appelle triggerPush au press du bouton', () => {
    const mockPush = jest.fn().mockResolvedValue(undefined);
    useSyncStore.setState({ _triggerPush: mockPush });
    render(<SyncStatusSection />);
    fireEvent.press(screen.getByTestId('sync-manual-button'));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('le bouton est désactivé si offline', () => {
    mockUseNetworkStatus.mockReturnValue({ isOffline: true });
    render(<SyncStatusSection />);
    const button = screen.getByTestId('sync-manual-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('affiche "Hors-ligne" si offline', () => {
    mockUseNetworkStatus.mockReturnValue({ isOffline: true });
    render(<SyncStatusSection />);
    expect(screen.getByText('Hors-ligne')).toBeTruthy();
  });
});
