# BaseDare API Documentation

This document describes the backend API routes for the BaseDare application.

## Base URL

All API routes are prefixed with `/api`

## Authentication

Most routes require authentication. Include the authorization token in the request headers:

```
Authorization: Bearer <token>
```

## Endpoints

### Dares

#### GET `/api/dares`

List all dares with optional filtering and sorting.

**Query Parameters:**
- `sortBy` (optional): Sort order (default: `-created_date` for newest first)
- `status` (optional): Filter by status (`pending`, `accepted`, `completed`, `failed`, `verified`)
- `streamer` (optional): Filter by streamer name or address
- `limit` (optional): Number of results per page (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

#### POST `/api/dares`

Create a new dare.

**Request Body:**
```json
{
  "title": "Dare title",
  "description": "Dare description",
  "stake_amount": 100,
  "expiry_timer": "2024-12-31T23:59:59Z",
  "streamer_name": "StreamerName",
  "streamer_address": "0x...",
  "category": "gaming",
  "difficulty": "medium",
  "image_url": "https://...",
  "created_by": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

#### GET `/api/dares/[id]`

Get a single dare by ID.

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

#### PUT `/api/dares/[id]`

Update a dare.

**Request Body:**
```json
{
  "status": "completed",
  "proof_video_url": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

#### DELETE `/api/dares/[id]`

Delete a dare.

**Response:**
```json
{
  "success": true,
  "message": "Dare deleted successfully"
}
```

#### POST `/api/dares/create-onchain`

Create a dare on the blockchain and optionally sync to Base44.

**Request Body:**
```json
{
  "streamerAddress": "0x...",
  "amount": 100,
  "referrerAddress": "0x...",
  "base44Data": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "receipt": { ... },
    "dareId": "1",
    "base44Dare": { ... }
  }
}
```

### Verification

#### POST `/api/verify-proof`

Verify a dare proof and trigger on-chain payout.

**Request Body:**
```json
{
  "dareId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "receipt": { ... }
  }
}
```

### File Upload

#### POST `/api/upload`

Upload a file (image, video, etc.).

**Request:** `multipart/form-data`
- `file`: The file to upload

**Response:**
```json
{
  "success": true,
  "data": {
    "file_url": "https://...",
    "file_id": "..."
  }
}
```

### Authentication

#### GET `/api/auth/me`

Get current authenticated user information.

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### Contract Information

#### GET `/api/contracts/config`

Get protocol configuration (fees, oracle address, etc.).

**Response:**
```json
{
  "success": true,
  "data": {
    "protocolFee": 500,
    "referralFee": 100,
    "oracleAddress": "0x...",
    "accumulatedFees": "..."
  }
}
```

#### GET `/api/contracts/dares/[id]`

Get dare data directly from the on-chain contract.

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
```

HTTP status codes:
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required)
- `404`: Not Found
- `500`: Internal Server Error



