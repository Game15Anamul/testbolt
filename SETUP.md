# Cricket Auction Platform - Setup Guide

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase-schema.sql`
4. Paste and run the SQL in the editor
5. The database tables and policies will be created automatically

## Configuration

The environment variables are already configured in `.env`:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## Running the Application

```bash
npm install
npm run dev
```

## User Roles & Access

### Admin Panel
- URL: `?page=admin`
- Demo Password: `admin123`
- Capabilities:
  - Create new auctions
  - Add teams with passwords
  - Add players (individual or bulk)
  - Start player auctions
  - Control auction timer (pause/resume)
  - Finalize sales or pass players
  - Monitor all teams

### Team Captain Dashboard
- URL: `?page=team`
- Login: Use team name and password set by admin
- Capabilities:
  - View budget and squad
  - Place bids on players
  - View other teams' status
  - See upcoming players

### Public Viewer Dashboard
- URL: `?page=public`
- No login required
- Capabilities:
  - Watch auction live
  - See all bids in real-time
  - View team standings
  - Track sold and upcoming players

## Quick Start Guide

1. **Setup Database**: Run the SQL schema in Supabase
2. **Start Application**: `npm run dev`
3. **Admin Setup**:
   - Login as admin (password: admin123)
   - Create an auction
   - Add 4-5 teams with names and passwords
   - Add players (use bulk add for speed)
4. **Team Captains Login**: Use team names and passwords
5. **Start Auction**: Admin selects a player and starts the auction
6. **Teams Bid**: Captains place bids in real-time
7. **Finalize**: Admin clicks "Sold!" when timer ends

## Features

### Real-time Updates
- All data updates instantly across all connected clients
- No page refresh required

### Anti-Snipe Protection
- Bids placed in the last 5 seconds automatically reset timer to 15 seconds
- Prevents last-second sniping

### Budget Management
- Teams start with 100 points
- System warns if bid would leave insufficient budget for remaining players
- Cannot bid more than available budget

### Timer Control
- 60-second auction timer
- Admin can pause/resume
- Visual countdown with red alert in final 10 seconds

### Player Management
- Individual or bulk player addition
- Categorize by skill (Batsman, Bowler, All-Rounder, Wicket-Keeper)
- Set custom base prices

## Bulk Player Format

When using bulk add, use this format (one per line):
```
Player Name, Base Price, Skill
```

Example:
```
John Doe, 10, Batsman
Jane Smith, 15, Bowler
Mike Wilson, 12, All-Rounder
Sarah Johnson, 8, Wicket-Keeper
```

## Mobile Support

The platform is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and anon key in `.env`
- Ensure schema has been run in Supabase SQL Editor
- Check Supabase project is active

### Real-time Not Working
- Check browser console for errors
- Verify Supabase Realtime is enabled in project settings
- Ensure RLS policies are created correctly

### Timer Drift
- Timer is server-authoritative (based on database timestamps)
- Client-side timer is for display only
- Slight variations are normal due to network latency
