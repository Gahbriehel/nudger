# Task Memory System (Nudger)

A production-grade productivity system for tracking tasks, subtasks, recurrence rules, and cognitive memory cues. Built with Next.js, Tailwind CSS, Radix UI, Zustand, and Supabase.

## Features

- **Dynamic Task Board**: Manage daily, recurring, and one-off tasks with a sleek, responsive interface.
- **Subtasks & Checklists**: Break down tasks into manageable subtasks.
- **Cognitive Memory Cues**: Attach memory nudges to tasks to prompt action or trigger retention.
- **Flexible Recurrence Engine**: Set daily, weekly, monthly, or yearly recurrence rules with automatic resets.
- **State Management**: Built on Zustand for fast, predictable client state transitions.
- **Robust Authentication**: Fully managed authentication powered by Supabase Auth (with Server-Side Rendering support and cookie session synchronization).
- **Theme Support**: Fully theme-aware components supporting clean light/dark modes.

## Tech Stack

- **Frontend**: [Next.js (App Router)](https://nextjs.org/) & [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [lucide-react](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) & [@supabase/ssr](https://github.com/supabase/ssr)
- **State Store**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) (Badge, Button, Card, Checkbox, Dropdown Menu, Input, Label, Textarea)

## Getting Started

### Local Setup

1. **Clone the Repository & Install Dependencies**:

   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Supabase project credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
   ```

3. **Run the Database Migrations**:
   The database schema is defined in the `supabase/migrations/` directory. Use the Supabase CLI to apply migrations locally, or copy the SQL into your Supabase Dashboard SQL Editor.

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

## Database Schema

The core database tables managed under `supabase/migrations/` include:

- `tasks`: The primary tasks table supporting metadata, recurrence rules, and status.
- `subtasks`: Flat checklists related to parent tasks.
- `tags` / `task_tags`: Many-to-many tag relationships for categorizing tasks.
- `task_memory_cues`: Cognitive nudges/cues associated with tasks.
