# Supabase Minimal Persistence

## Purpose

This document describes the minimal Deal Analyzer persistence implementation using the existing live schema only.

No migrations are required.
No new tables are required.

## Environment Variables

The frontend now resolves Supabase config from:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Legacy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are still accepted as fallback values.

## What Was Implemented

### 1) Safe client initialization

File:

- `src/services/supabase/client.ts`

Behavior:

- lazily creates a Supabase client using anon key only
- returns `null` when Supabase is not configured
- preserves mock/local fallback behavior

### 2) Minimal deal persistence service

File:

- `src/services/supabase/dealPersistence.service.ts`

Implemented flow:

1. Resolve organization id:
   - first try current user profile (`profiles.organization_id`)
   - otherwise use first row from `organizations`
   - if none exists, return clear error
2. Insert property facts into `properties`
3. Insert workflow row into `opportunities` linked by `property_id`
4. Insert full AI analysis JSON snapshot into `notes.content` linked by `opportunity_id`

### 3) Deal Analyzer wiring

File:

- `src/App.tsx`

Behavior:

- persistence is attempted only after successful AI response
- AI analysis display is never blocked by persistence failure
- persistence failures log warning to console only
- fallback/mock analysis flow still works if AI call fails

## Current Table Usage

### `properties`

Used for canonical property facts from Deal Analyzer input.

### `opportunities`

Used for workflow tracking row linked to property.

### `notes`

Used as temporary analysis snapshot storage (`JSON.stringify(analysis)`).

## Non-Goals In This Minimal Slice

- Full auth implementation
- RLS policy changes
- Schema changes
- Dedicated `deal_analyses` table
- Full tracker/pipeline migration off local KV

## Failure Behavior

If Supabase is unavailable or persistence fails:

- analysis still renders in UI
- app remains usable
- warning is logged to console

This keeps behavior safe and incremental while introducing real persistence.