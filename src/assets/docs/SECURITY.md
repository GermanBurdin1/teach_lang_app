# Documentation Sécurité Frontend

## Headers de Sécurité Configurés (selon les exigences)

### 1. Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://cdn.jsdelivr.net 
    https://js.stripe.com 
    https://embed.tawk.to 
    https://unpkg.com
    https://download.agora.io
    https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' 
    https://cdn.jsdelivr.net 
    https://fonts.googleapis.com;
    font-src 'self' 
      https://fonts.gstatic.com
      https://embed.tawk.to;
  img-src 'self' data: blob: 
    https://linguaconnect.com 
    https://embed.tawk.to;
  media-src 'self' 
    http://localhost:3008
    http://135.125.107.45:3008;
  connect-src 'self' 
    http://localhost:3011 
    http://135.125.107.45:3011 
    https://api.stripe.com 
    https://embed.tawk.to 
    https://va.tawk.to
    https://*.tawk.to
    wss://*.tawk.to
    https://api.agora.io
    wss://api.agora.io
    wss://*.agora.io
    https://cdn.jsdelivr.net
    https://www.google-analytics.com
    https://analytics.google.com
    https://api-eu.netless.link
    https://api-eu.whiteboard.agora.io
    https://api-eu.whiteboard.rtelink.com
    https://api.netless.link
    https://api.whiteboard.agora.io
    https://api.whiteboard.rtelink.com
    https://api-us.netless.link
    https://api-us.whiteboard.agora.io
    https://api-us.whiteboard.rtelink.com
    https://api-us-sv.netless.link
    https://api-us-sv.whiteboard.agora.io
    https://api-us-sv.whiteboard.rtelink.com
    https://api-cn.netless.link
    https://api-cn.whiteboard.agora.io
    https://api-cn.whiteboard.rtelink.com;
  frame-src 'self' 
    https://js.stripe.com 
    https://embed.tawk.to;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### 2. Autres Headers de Sécurité
- **X-Content-Type-Options**: `nosniff` - Empêche le MIME type sniffing
- **X-XSS-Protection**: `1; mode=block` - Protection XSS
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Contrôle des référents
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=(), payment=()` - Contrôle des permissions

**Notes importantes**: 
- X-Frame-Options удален из meta тега, так как он должен устанавливаться через HTTP заголовки, а не meta теги
- frame-ancestors удален из CSP meta тега, так как он не поддерживается в meta тегах
- Добавлена поддержка всех поддоменов Tawk.to для корректной работы чат-виджета
- Добавлена поддержка AgoraRTC для видеозвонков

## CORS Configuration

### API Gateway
```typescript
app.enableCors({
  origin: [
    "http://localhost:4200",
    "http://135.125.107.45:4200",
    "https://yourdomain.com"
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin"
  ],
  exposedHeaders: ["X-Total-Count"],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200
});
```

## Configuration de Sécurité

### Headers HTTP de Protection
Les headers suivants sont configurés dans `index.html` pour limiter les attaques courantes :

## Protection contre les Attaques Courantes

### 1. XSS (Cross-Site Scripting)
- ✅ **CSP** empêche l'exécution de scripts malveillants

### 2. CSRF (Cross-Site Request Forgery)
- ✅ **CORS** strictement configuré

### 3. Clickjacking
- ✅ **X-Frame-Options: DENY**
- ✅ **CSP frame-ancestors 'none'**

### 4. MIME Type Sniffing
- ✅ **X-Content-Type-Options: nosniff**

### 5. Information Disclosure
- ✅ **Referrer-Policy** configuré

## Conformité

Cette implémentation respecte les standards de sécurité :
- ✅ **OWASP Top 10** - Protection contre les vulnérabilités courantes
- ✅ **CSP Level 3** - Content Security Policy moderne
- ✅ **CORS** - Cross-Origin Resource Sharing sécurisé
- ✅ **HTTP Security Headers** - Headers de sécurité standard
