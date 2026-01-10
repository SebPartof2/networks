# S-Auth OAuth2 Integration Guide

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [OAuth2 Flows](#oauth2-flows)
- [Endpoints Reference](#endpoints-reference)
- [Code Examples](#code-examples)
- [Security Best Practices](#security-best-practices)

## Overview

S-Auth is a fully-featured OAuth2 and OpenID Connect provider that supports multiple grant types:
- **Authorization Code Flow** - For server-side web applications
- **Authorization Code + PKCE** - For single-page apps and mobile apps
- **Client Credentials Flow** - For machine-to-machine authentication
- **Refresh Token Flow** - For obtaining new access tokens

**Base URL**: `https://auth.sebbyk.net`

## Getting Started

### 1. Register Your Application

Contact your administrator to register your application. You'll receive:
- **Client ID**: Unique identifier for your application
- **Client Secret**: Secret key (for confidential clients only)
- **Redirect URIs**: Allowed callback URLs

### 2. OpenID Connect Discovery

S-Auth supports OpenID Connect Discovery. Fetch the configuration:

```bash
GET https://auth.sebbyk.net/.well-known/openid-configuration
```

**Response:**
```json
{
  "issuer": "https://auth.sebbyk.net",
  "authorization_endpoint": "https://auth.sebbyk.net/authorize",
  "token_endpoint": "https://auth.sebbyk.net/token",
  "userinfo_endpoint": "https://auth.sebbyk.net/userinfo",
  "revocation_endpoint": "https://auth.sebbyk.net/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": [
    "authorization_code",
    "client_credentials",
    "refresh_token"
  ],
  "code_challenge_methods_supported": ["S256", "plain"],
  "scopes_supported": ["openid", "profile", "email"],
  "token_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post"
  ],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

## OAuth2 Flows

### Authorization Code Flow (Server-Side Web Apps)

**Best for:** Traditional web applications with a secure backend

#### Step 1: Authorization Request

Redirect the user to the authorization endpoint:

```
https://auth.sebbyk.net/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile email&
  state=RANDOM_STATE_STRING
```

**Parameters:**
- `response_type`: Must be `code`
- `client_id`: Your application's client ID
- `redirect_uri`: One of your registered redirect URIs
- `scope`: Space-separated list of scopes (`openid profile email`)
- `state`: Random string to prevent CSRF attacks (recommended)

#### Step 2: User Authentication & Consent

The user will:
1. Log in with their credentials
2. See a consent screen showing requested permissions
3. Approve or deny the request

#### Step 3: Authorization Code Response

On approval, the user is redirected to your redirect URI:

```
https://yourapp.com/callback?
  code=AUTH_CODE&
  state=RANDOM_STATE_STRING
```

**Verify the `state` parameter matches what you sent!**

#### Step 4: Exchange Code for Tokens

Make a POST request to the token endpoint:

```bash
POST https://auth.sebbyk.net/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback
```

**Response:**
```json
{
  "access_token": "sat_a1b2c3d4e5f6...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "srt_x9y8z7w6v5...",
  "scope": "openid profile email"
}
```

### Authorization Code + PKCE (Single-Page & Mobile Apps)

**Best for:** Public clients (SPAs, mobile apps, CLI tools) that cannot securely store a client secret

#### Step 1: Generate Code Verifier and Challenge

```javascript
// Generate code verifier (43-128 random characters)
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate code challenge from verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

#### Step 2: Authorization Request with PKCE

```
https://auth.sebbyk.net/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile email&
  state=RANDOM_STATE&
  code_challenge=CODE_CHALLENGE&
  code_challenge_method=S256
```

**New Parameters:**
- `code_challenge`: Base64URL-encoded SHA256 hash of code_verifier
- `code_challenge_method`: `S256` (recommended) or `plain`

#### Step 3: Exchange Code with Verifier

```bash
POST https://auth.sebbyk.net/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID&
code_verifier=ORIGINAL_CODE_VERIFIER
```

**Note:** No `client_secret` required! The `code_verifier` proves you're the same client.

### Client Credentials Flow (Machine-to-Machine)

**Best for:** Backend services, APIs, scheduled jobs

```bash
POST https://auth.sebbyk.net/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=client_credentials&
scope=api:read api:write
```

**Response:**
```json
{
  "access_token": "sat_m2m3n4o5p6...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "api:read api:write"
}
```

**Note:** No `refresh_token` is issued for this flow.

### Refresh Token Flow

When your access token expires, use the refresh token to get a new one:

```bash
POST https://auth.sebbyk.net/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=refresh_token&
refresh_token=srt_x9y8z7w6v5...
```

**Response:**
```json
{
  "access_token": "sat_new_token...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "srt_new_refresh...",
  "scope": "openid profile email"
}
```

**Note:** The refresh token may be rotated (new one issued).

## Endpoints Reference

### GET /authorize

Authorization endpoint for obtaining authorization codes.

**Parameters:**
- `response_type` (required): `code`
- `client_id` (required): Your client ID
- `redirect_uri` (required): Registered redirect URI
- `scope` (optional): Space-separated scopes (default: `openid`)
- `state` (recommended): Random CSRF protection string
- `code_challenge` (PKCE): Base64URL SHA256 hash of verifier
- `code_challenge_method` (PKCE): `S256` or `plain`

**Success Response:** Redirect to `redirect_uri` with `code` and `state` parameters

**Error Response:** Redirect to `redirect_uri` with `error` and `error_description`

### POST /token

Token endpoint for exchanging codes and refreshing tokens.

**Content-Type:** `application/x-www-form-urlencoded`

**Authentication:**
- `Authorization: Basic base64(client_id:client_secret)` (confidential clients)
- OR `client_id` in request body (public clients with PKCE)

**Grant Types:**

1. **authorization_code**
   - `grant_type=authorization_code`
   - `code`: Authorization code
   - `redirect_uri`: Must match authorization request
   - `code_verifier`: (PKCE only) Original verifier

2. **client_credentials**
   - `grant_type=client_credentials`
   - `scope`: (optional) Requested scopes

3. **refresh_token**
   - `grant_type=refresh_token`
   - `refresh_token`: Refresh token

**Success Response (200 OK):**
```json
{
  "access_token": "sat_...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "srt_...",
  "scope": "openid profile email"
}
```

**Error Response (400/401):**
```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization code is invalid"
}
```

### GET /userinfo

Get authenticated user information.

**Authentication:** `Authorization: Bearer ACCESS_TOKEN`

**Success Response (200 OK):**
```json
{
  "sub": "JD-7392",
  "email": "john.doe@example.com",
  "given_name": "John",
  "family_name": "Doe",
  "access_level": "user"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "invalid_token",
  "error_description": "The access token is invalid or expired"
}
```

### POST /revoke

Revoke an access or refresh token.

**Content-Type:** `application/x-www-form-urlencoded`

**Authentication:** `Authorization: Basic base64(client_id:client_secret)`

**Parameters:**
- `token` (required): Token to revoke
- `token_type_hint` (optional): `access_token` or `refresh_token`

**Success Response (200 OK):**
```json
{
  "success": true
}
```

## Code Examples

### JavaScript (Browser/SPA with PKCE)

```javascript
class OAuth2Client {
  constructor(config) {
    this.config = {
      authorizationEndpoint: 'https://auth.sebbyk.net/authorize',
      tokenEndpoint: 'https://auth.sebbyk.net/token',
      userinfoEndpoint: 'https://auth.sebbyk.net/userinfo',
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scope: config.scope || 'openid profile email'
    };
  }

  // Generate PKCE verifier and challenge
  async generatePKCE() {
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);

    // Store verifier in sessionStorage
    sessionStorage.setItem('pkce_verifier', verifier);

    return { verifier, challenge };
  }

  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Start OAuth2 flow
  async login() {
    const { challenge } = await this.generatePKCE();
    const state = this.generateCodeVerifier(); // Random state

    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });

    window.location.href = `${this.config.authorizationEndpoint}?${params}`;
  }

  // Handle callback
  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    // Verify state
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const verifier = sessionStorage.getItem('pkce_verifier');
    const tokens = await this.exchangeCode(code, verifier);

    // Clean up
    sessionStorage.removeItem('pkce_verifier');
    sessionStorage.removeItem('oauth_state');

    return tokens;
  }

  async exchangeCode(code, verifier) {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        code_verifier: verifier
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }

    return await response.json();
  }

  async getUserInfo(accessToken) {
    const response = await fetch(this.config.userinfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return await response.json();
  }

  async refreshToken(refreshToken) {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return await response.json();
  }
}

// Usage
const oauth = new OAuth2Client({
  clientId: 'your_client_id',
  redirectUri: 'https://yourapp.com/callback',
  scope: 'openid profile email'
});

// Start login
document.getElementById('login-btn').addEventListener('click', () => {
  oauth.login();
});

// Handle callback
if (window.location.pathname === '/callback') {
  oauth.handleCallback()
    .then(tokens => {
      console.log('Access token:', tokens.access_token);
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);

      // Get user info
      return oauth.getUserInfo(tokens.access_token);
    })
    .then(user => {
      console.log('User:', user);
      window.location.href = '/dashboard';
    })
    .catch(error => {
      console.error('Authentication error:', error);
    });
}
```

### Node.js (Express)

```javascript
const express = require('express');
const axios = require('axios');
const session = require('express-session');

const app = express();

const config = {
  authorizationEndpoint: 'https://auth.sebbyk.net/authorize',
  tokenEndpoint: 'https://auth.sebbyk.net/token',
  userinfoEndpoint: 'https://auth.sebbyk.net/userinfo',
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  redirectUri: 'http://localhost:3000/callback',
  scope: 'openid profile email'
};

app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false
}));

// Login route
app.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: state
  });

  res.redirect(`${config.authorizationEndpoint}?${params}`);
});

// Callback route
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`OAuth error: ${error}`);
  }

  // Verify state
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state parameter');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      config.tokenEndpoint,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            `${config.clientId}:${config.clientSecret}`
          ).toString('base64')
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get(config.userinfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    // Store in session
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.user = userResponse.data;

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error);
    res.status(500).send('Authentication failed');
  }
});

// Protected route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.send(`
    <h1>Dashboard</h1>
    <p>Welcome, ${req.session.user.given_name}!</p>
    <pre>${JSON.stringify(req.session.user, null, 2)}</pre>
    <a href="/logout">Logout</a>
  `);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Python (Flask)

```python
from flask import Flask, redirect, request, session, url_for
import requests
import secrets
import base64

app = Flask(__name__)
app.secret_key = 'your-secret-key'

CONFIG = {
    'authorization_endpoint': 'https://auth.sebbyk.net/authorize',
    'token_endpoint': 'https://auth.sebbyk.net/token',
    'userinfo_endpoint': 'https://auth.sebbyk.net/userinfo',
    'client_id': 'your_client_id',
    'client_secret': 'your_client_secret',
    'redirect_uri': 'http://localhost:5000/callback',
    'scope': 'openid profile email'
}

@app.route('/login')
def login():
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state

    params = {
        'response_type': 'code',
        'client_id': CONFIG['client_id'],
        'redirect_uri': CONFIG['redirect_uri'],
        'scope': CONFIG['scope'],
        'state': state
    }

    auth_url = f"{CONFIG['authorization_endpoint']}?{requests.compat.urlencode(params)}"
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')

    if error:
        return f"OAuth error: {error}", 400

    # Verify state
    if state != session.get('oauth_state'):
        return "Invalid state parameter", 400

    # Exchange code for tokens
    auth_string = f"{CONFIG['client_id']}:{CONFIG['client_secret']}"
    auth_bytes = auth_string.encode('utf-8')
    auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

    token_response = requests.post(
        CONFIG['token_endpoint'],
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': CONFIG['redirect_uri']
        },
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': f'Basic {auth_b64}'
        }
    )

    if token_response.status_code != 200:
        return f"Token exchange failed: {token_response.text}", 500

    tokens = token_response.json()
    access_token = tokens['access_token']

    # Get user info
    userinfo_response = requests.get(
        CONFIG['userinfo_endpoint'],
        headers={'Authorization': f"Bearer {access_token}"}
    )

    if userinfo_response.status_code != 200:
        return "Failed to get user info", 500

    user = userinfo_response.json()

    # Store in session
    session['access_token'] = access_token
    session['refresh_token'] = tokens.get('refresh_token')
    session['user'] = user

    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))

    user = session['user']
    return f"""
        <h1>Dashboard</h1>
        <p>Welcome, {user['given_name']}!</p>
        <pre>{user}</pre>
        <a href="/logout">Logout</a>
    """

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True)
```

## Security Best Practices

### 1. Always Use HTTPS

OAuth2 requires HTTPS in production. Never use HTTP for OAuth flows.

### 2. Validate State Parameter

Always include a `state` parameter in authorization requests and validate it in the callback to prevent CSRF attacks.

```javascript
// Generate random state
const state = crypto.randomUUID();
sessionStorage.setItem('oauth_state', state);

// Validate in callback
const receivedState = new URLSearchParams(window.location.search).get('state');
if (receivedState !== sessionStorage.getItem('oauth_state')) {
  throw new Error('State mismatch - possible CSRF attack');
}
```

### 3. Use PKCE for Public Clients

Single-page apps and mobile apps MUST use PKCE (Proof Key for Code Exchange) to prevent authorization code interception.

### 4. Store Tokens Securely

- **Browser**: Use `httpOnly` cookies or sessionStorage (not localStorage for sensitive tokens)
- **Mobile**: Use secure storage (Keychain on iOS, KeyStore on Android)
- **Server**: Use encrypted session storage or secure databases

### 5. Handle Token Expiration

Implement automatic token refresh before expiration:

```javascript
async function ensureValidToken() {
  const expiresAt = localStorage.getItem('token_expires_at');
  const now = Date.now();

  if (now >= expiresAt - 60000) { // Refresh 1 minute before expiry
    const refreshToken = localStorage.getItem('refresh_token');
    const newTokens = await oauth.refreshToken(refreshToken);

    localStorage.setItem('access_token', newTokens.access_token);
    localStorage.setItem('token_expires_at', now + newTokens.expires_in * 1000);
  }

  return localStorage.getItem('access_token');
}
```

### 6. Validate Redirect URIs

Only use redirect URIs that are registered with your OAuth application. The authorization server will reject unregistered URIs.

### 7. Scope Principle of Least Privilege

Only request the scopes your application actually needs:

- `openid`: Basic OpenID Connect authentication
- `profile`: User's name and profile information
- `email`: User's email address

### 8. Revoke Tokens on Logout

When users log out, revoke their tokens:

```javascript
async function logout() {
  const accessToken = localStorage.getItem('access_token');

  await fetch('https://auth.sebbyk.net/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: new URLSearchParams({
      token: accessToken,
      token_type_hint: 'access_token'
    })
  });

  // Clear local storage
  localStorage.clear();
}
```

### 9. Error Handling

Always handle OAuth errors gracefully:

```javascript
const error = params.get('error');
const errorDescription = params.get('error_description');

if (error) {
  switch (error) {
    case 'access_denied':
      // User denied authorization
      showMessage('You denied access to the application');
      break;
    case 'invalid_request':
      // Malformed request
      showMessage('Invalid request parameters');
      break;
    case 'server_error':
      // Server error
      showMessage('Server error, please try again later');
      break;
    default:
      showMessage(`Error: ${errorDescription || error}`);
  }
}
```

### 10. Monitor Token Usage

- Set up logging for failed authentication attempts
- Monitor for unusual token usage patterns
- Implement rate limiting on token endpoints

## Common Error Codes

| Error | Description | Solution |
|-------|-------------|----------|
| `invalid_request` | Malformed request | Check request parameters |
| `invalid_client` | Invalid client credentials | Verify client ID and secret |
| `invalid_grant` | Invalid authorization code | Code expired or already used |
| `unauthorized_client` | Client not authorized for grant type | Check allowed grants in app config |
| `unsupported_grant_type` | Grant type not supported | Use supported grant types |
| `invalid_scope` | Requested scope is invalid | Use valid scopes (openid, profile, email) |
| `access_denied` | User denied authorization | User must approve the request |
| `server_error` | Internal server error | Retry or contact administrator |

## Rate Limits

To prevent abuse, the following rate limits apply:

- `/token` endpoint: 10 requests per minute per client
- `/authorize` endpoint: 20 requests per minute per IP
- `/userinfo` endpoint: 60 requests per minute per token

## Support

For issues or questions:
- Contact your S-Auth administrator
- Check server status at the `/health` endpoint

## Additional Resources

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
