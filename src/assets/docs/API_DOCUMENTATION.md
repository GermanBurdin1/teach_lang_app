# Documentation API - Appels Vidéo

## Événements WebSocket

### Connexion
- **URL**: `ws://localhost:3011` (dev) / `ws://135.125.107.45:3011` (prod)
- **Transport**: WebSocket + Polling fallback

### Événements

#### 1. Enregistrement Utilisateur
```typescript
// Envoi
ws.emit('register', userId: string)

// Exemple
ws.emit('register', 'teacher1')
```

#### 2. Invitation Appel
```typescript
// Envoi
ws.emit('call_invite', { from: string, to: string })

// Exemple
ws.emit('call_invite', { from: 'teacher1', to: 'student1' })
```

#### 3. Accepter Appel
```typescript
// Envoi
ws.emit('call_accept', { from: string, to: string })

// Exemple
ws.emit('call_accept', { from: 'student1', to: 'teacher1' })
```

#### 4. Rejeter Appel
```typescript
// Envoi
ws.emit('call_reject', { from: string, to: string })

// Exemple
ws.emit('call_reject', { from: 'student1', to: 'teacher1' })
```

## Configuration Agora RTC

### App ID
```
a020b374553e4fac80325223fba38531
```

### Nom du Canal
```
test_channel_123
```

### Paramètres Vidéo
- **Largeur**: 640px
- **Hauteur**: 360px
- **Codec**: VP8
- **Mode**: RTC

## Endpoints API (Services Frontend)

### Méthodes WebSocketService

#### `registerUser(userId: string)`
Enregistre l'utilisateur dans le système WebSocket

#### `initiateCall(targetUserId: string, fromUserId: string)`
Initie un appel vidéo

#### `acceptCall(fromUserId: string, toUserId: string)`
Accepte un appel vidéo

#### `rejectCall(fromUserId: string, toUserId: string)`
Rejette un appel vidéo

### Méthodes VideoCallService

#### `setLessonData(lessonId: string, userId: string)`
Définit les données de la leçon

#### `joinChannel(): Promise<void>`
Se connecte au canal Agora

#### `leaveChannel(): Promise<void>`
Se déconnecte du canal Agora

#### `startVideoCall(): void`
Démarre l'appel vidéo

#### `stopVideoCall(): void`
Arrête l'appel vidéo

## Codes de Réponse

- **200**: Succès
- **400**: Requête invalide
- **404**: Utilisateur non trouvé
- **500**: Erreur serveur

## Exemple d'Utilisation

```typescript
// 1. Connexion WebSocket
const ws = new WebSocketService()

// 2. Enregistrement utilisateur
ws.registerUser('teacher1')

// 3. Initiation appel
ws.initiateCall('student1', 'teacher1')

// 4. Acceptation appel
ws.acceptCall('teacher1', 'student1')
```

## Comment Vérifier que ça Fonctionne

### 1. Ouvrir la Documentation Swagger
- Ouvrir le fichier `swagger-ui.html` dans le navigateur
- Ou aller sur: `http://localhost:4200/assets/docs/swagger-ui.html`
- La documentation OpenAPI sera chargée automatiquement

### 2. Vérifier la Connexion WebSocket
```typescript
// Dans la console du navigateur
const ws = new WebSocketService()
// Doit afficher: "✅ WebSocket успешно подключен к API Gateway"
```

### 3. Tester l'Enregistrement
```typescript
ws.registerUser('test-user')
// Doit afficher: "✅ User registered: test-user -> [socket-id]"
```

### 4. Tester les Appels
1. Ouvrir 2 onglets du navigateur
2. Dans le premier: `ws.registerUser('teacher1')`
3. Dans le second: `ws.registerUser('student1')`
4. Dans le premier: `ws.initiateCall('student1', 'teacher1')`
5. Dans le second: `ws.acceptCall('teacher1', 'student1')`

### 5. Vérifier les Logs
- Console du navigateur: logs WebSocket
- Console du serveur: logs des événements

## Fichiers de Documentation

- `API_DOCUMENTATION.md` - Documentation Markdown complète
- `openapi.json` - Spécification OpenAPI 3.0
- `swagger-ui.html` - Interface Swagger UI interactive
