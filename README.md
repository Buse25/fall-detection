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

## Health Check

```http
GET /health
```

Response:

```json
{
  "status": "OK",
  "service": "fall-detection-backend",
  "timestamp": "2026-05-18T10:00:00.000Z"
}
```

## Validation Errors

Request validation errors return this standard JSON format:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

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

Validation rules:

- `name` is required.
- `email` must be a valid email address.
- `password` must be at least 6 characters long.

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

Validation rules:

- `email` must be a valid email address.
- `password` is required.

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

Validation rules:

- `deviceId` is required and must be a string.
- `accelerometer.x`, `accelerometer.y`, and `accelerometer.z` are required numbers.
- `gyroscope.x`, `gyroscope.y`, and `gyroscope.z` are required numbers.
- `timestamp` is optional. When provided, it must be a valid ISO date.

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

Supported query params:

- `page`: positive integer, defaults to `1`.
- `limit`: positive integer between `1` and `100`, defaults to `10`.
- `deviceId`: filters by exact device id.
- `isFallDetected`: filters by `true` or `false`.
- `startDate`: filters records whose `timestamp` is greater than or equal to this ISO date.
- `endDate`: filters records whose `timestamp` is less than or equal to this ISO date.

Examples:

```http
GET /api/sensor-data?page=1&limit=20
GET /api/sensor-data?deviceId=device-1
GET /api/sensor-data?isFallDetected=true
GET /api/sensor-data?startDate=2026-05-18T00:00:00.000Z&endDate=2026-05-19T23:59:59.999Z
GET /api/sensor-data?page=2&limit=10&deviceId=device-1&isFallDetected=false
```

Response:

```json
{
  "success": true,
  "count": 1,
  "page": 1,
  "limit": 10,
  "total": 1,
  "pages": 1,
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

### List Users

```http
GET /api/admin/users
Authorization: Bearer <admin-token>
```

Returns all users newest first by `createdAt`. User passwords are never returned.

Response:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "user-id",
      "name": "Test User",
      "email": "test@example.com",
      "role": "user",
      "createdAt": "2026-05-18T10:00:00.000Z",
      "updatedAt": "2026-05-18T10:00:00.000Z"
    }
  ]
}
```

### List Falls

```http
GET /api/admin/falls?page=1&limit=10
Authorization: Bearer <admin-token>
```

Returns all `isFallDetected=true` sensor records across all users, newest first by `timestamp`.

Supported query params:

- `page`: positive integer, defaults to `1`.
- `limit`: positive integer between `1` and `100`, defaults to `10`.

Response:

```json
{
  "success": true,
  "count": 1,
  "page": 1,
  "limit": 10,
  "total": 1,
  "pages": 1,
  "data": [
    {
      "_id": "sensor-data-id",
      "userId": "user-id",
      "deviceId": "fall-device",
      "timestamp": "2026-05-18T10:00:00.000Z",
      "isFallDetected": true,
      "fallScore": 3
    }
  ]
}
```

### Dashboard

```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "success": true,
  "data": {
    "totalUsers": 10,
    "totalSensorRecords": 125,
    "totalFalls": 4,
    "latestFalls": [],
    "latestSensorRecords": []
  }
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

## Environment

Create a `.env` file from `.env.example` before running the server:

```bash
cp .env.example .env
```

Available variables:

- `NODE_ENV`: runtime environment, for example `development` or `production`.
- `PORT`: HTTP port, defaults to `5000`.
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: secret used to sign JWT tokens. Use a long random value in production.
- `CORS_ORIGIN`: allowed browser origins. Use a comma-separated list for multiple origins, for example `https://app.example.com,https://admin.example.com`.
- `RATE_LIMIT_WINDOW_MS`: rate limit window in milliseconds.
- `RATE_LIMIT_MAX`: max requests per IP per window.

## Deployment Notes

- Set `NODE_ENV=production`.
- Set a production `MONGO_URI`; do not use the test or local database.
- Set a strong `JWT_SECRET` through the deployment platform secret manager.
- Set `CORS_ORIGIN` to the deployed frontend origin instead of `*`.
- Configure `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` for the expected traffic level.
- Run `npm install --production` and start with `npm start`.
- Use `GET /health` for uptime checks.
