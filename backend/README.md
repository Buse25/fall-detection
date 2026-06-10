# Fall Detection Backend

## Authentication

Protected endpoints require a JWT in the `Authorization` header:

```http
Authorization: Bearer <token>
```

## Emergency Contacts

All emergency contact endpoints are protected and operate only on the authenticated user's contacts.

### Create Emergency Contact

```http
POST /api/emergency-contacts
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "name": "Jane Doe",
  "phone": "+905551112233",
  "relationship": "Sister",
  "isPrimary": true
}
```

Response:

```json
{
  "success": true,
  "message": "Emergency contact created successfully",
  "data": {
    "_id": "contactId",
    "userId": "authenticatedUserId",
    "name": "Jane Doe",
    "phone": "+905551112233",
    "relationship": "Sister",
    "isPrimary": true,
    "createdAt": "2026-06-10T00:00:00.000Z",
    "updatedAt": "2026-06-10T00:00:00.000Z"
  }
}
```

If `isPrimary` is `true`, the authenticated user's other emergency contacts are marked as non-primary.

### List Emergency Contacts

```http
GET /api/emergency-contacts
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "contactId",
      "userId": "authenticatedUserId",
      "name": "Jane Doe",
      "phone": "+905551112233",
      "relationship": "Sister",
      "isPrimary": true,
      "createdAt": "2026-06-10T00:00:00.000Z",
      "updatedAt": "2026-06-10T00:00:00.000Z"
    }
  ]
}
```

The list is sorted newest first.

### Get Emergency Contact

```http
GET /api/emergency-contacts/:id
Authorization: Bearer <token>
```

### Update Emergency Contact

```http
PUT /api/emergency-contacts/:id
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "name": "Jane Updated",
  "phone": "+905559998877",
  "relationship": "Mother",
  "isPrimary": false
}
```

### Delete Emergency Contact

```http
DELETE /api/emergency-contacts/:id
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "message": "Emergency contact deleted successfully"
}
```
