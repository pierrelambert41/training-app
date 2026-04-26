# Feature : auth

Gère l'authentification utilisateur (Supabase Auth).

## Public API (`index.ts`)

- `useAuth` — hook UI : login, register, logout, errorMessage, isLoading
- `useAuthStore` — store Zustand : user, isAuthenticated, isHydrated
- `signIn`, `signUp`, `signOut`, `getSession` — fonctions I/O Supabase
- `AUTH_ERROR_MESSAGES` — messages d'erreur localisés
- `AuthError`, `AuthResult` — types

## Structure

```
api/
  auth.ts          # I/O Supabase (signIn, signUp, signOut, getSession)
  auth.test.ts
hooks/
  use-auth.ts      # Hook UI qui orchestre api/ + stores/
  use-auth.test.ts
stores/
  auth-store.ts    # Zustand : user, isAuthenticated, isHydrated
index.ts           # Public API — seul point d'entrée autorisé depuis l'extérieur
```

## Règles

- `api/` appelle Supabase, ne connaît pas React.
- `hooks/` consomme `api/` et `stores/`, expose l'interface aux composants.
- `stores/` est l'état en mémoire, hydraté par `app/_layout.tsx` au démarrage.
- Rien dans cette feature n'importe depuis d'autres features.
