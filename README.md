# Fall Detection Backend

## API Usage

Base URL:

```text
http://localhost:5000
```

Protected endpoints require a JWT token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

The token is returned by the register and login endpoints.

## Auth Endpoints

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

### Get Current User

Protected endpoint.

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "user": {
    "_id": "user-id",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "createdAt": "2026-05-18T10:00:00.000Z",
    "updatedAt": "2026-05-18T10:00:00.000Z"
  }
}
```

## Sensor Data Endpoints

All sensor data endpoints are protected and require:

```http
Authorization: Bearer <token>
```

When creating sensor data, `userId` is taken from the authenticated JWT user. Do not send `userId` in the request body.

### Create Sensor Data

```http
POST /api/sensor-data
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "deviceId": "device-1",
  "timestamp": "2026-05-18T10:00:00.000Z",
  "accelerometer": {
    "x": 1,
    "y": 0,
    "z": 0
  },
  "gyroscope": {
    "x": 0,
    "y": 0,
    "z": 0
  }
}
```

Response:

```json
{
  "success": true,
  "message": "Sensor data saved successfully",
  "data": {
    "_id": "sensor-data-id",
    "userId": "authenticated-user-id",
    "deviceId": "device-1",
    "timestamp": "2026-05-18T10:00:00.000Z",
    "accelerometer": {
      "x": 1,
      "y": 0,
      "z": 0,
      "magnitude": 1
    },
    "gyroscope": {
      "x": 0,
      "y": 0,
      "z": 0
    },
    "isFallDetected": false,
    "fallScore": 1
  }
}
```

### List Sensor Data

```http
GET /api/sensor-data
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "sensor-data-id",
      "userId": "authenticated-user-id",
      "deviceId": "device-1",
      "isFallDetected": false,
      "fallScore": 1
    }
  ]
}
```

### Get Latest Sensor Data

```http
GET /api/sensor-data/latest
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "data": {
    "_id": "sensor-data-id",
    "userId": "authenticated-user-id",
    "deviceId": "device-1",
    "isFallDetected": false,
    "fallScore": 1
  }
}
```

### List Fall Detected Sensor Data

```http
GET /api/sensor-data/falls
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "sensor-data-id",
      "userId": "authenticated-user-id",
      "deviceId": "fall-device",
      "isFallDetected": true,
      "fallScore": 3
    }
  ]
}
```

## Admin Endpoints

Admin endpoints require a valid JWT token for a user whose `role` is `admin`.

```http
Authorization: Bearer <admin-token>
```

### Admin Example

```http
GET /api/admin/example
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "success": true,
  "message": "Admin endpoint accessed successfully"
}
```

If the token belongs to a non-admin user, the API returns:

```json
{
  "success": false,
  "message": "Admin access required"
}
```

## Test

Run the full backend test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The tests use Jest, Supertest, and an in-memory MongoDB instance, so they do not write to the configured development database.
