import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from './use-debounce';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDebounce', () => {
  it('retourne la valeur initiale immédiatement', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it("ne met pas à jour la valeur avant l'expiration du délai", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(result.current).toBe('initial');
  });

  it('met à jour la valeur après 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('repart de zéro si la valeur change avant expiration', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => { jest.advanceTimersByTime(200); });

    rerender({ value: 'abc' });
    act(() => { jest.advanceTimersByTime(200); });

    expect(result.current).toBe('a');

    act(() => { jest.advanceTimersByTime(100); });

    expect(result.current).toBe('abc');
  });
});
