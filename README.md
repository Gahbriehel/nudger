# Nudger — Task Memory System

A production-grade productivity system for tracking tasks, subtasks, recurrence rules, and cognitive memory cues. Built with Next.js (App Router), Tailwind CSS, Radix UI, Zustand, and Supabase.

## Features

- **Multi-Page Routing**: Full page-level navigation using Next.js App Router with browser back-button support and deep-linkable task views.
- **Dynamic Task Board**: Manage flexible, scheduled, and recurring tasks with a premium dark/light-mode interface.
- **Quick-Complete Checkboxes**: Mark tasks done directly from the collapsed card view without entering edit mode.
- **Subtasks & Checklists**: Break down tasks into smaller, trackable steps you can check off individually.
- **Cognitive Memory Cues**: Attach environmental trigger notes to tasks (e.g. "Place spreadsheet on secondary monitor") to prompt real-world action.
- **Flexible Recurrence Engine**: Set daily, weekly, monthly, or yearly recurrence with automatic resets when overdue tasks are detected.
- **Snooze**: Defer tasks to a later time via custom snooze durations.
- **Push Notifications**: Web Push API integration with a proactive in-dashboard prompt to encourage opt-in and deliver timely reminders.
- **Urgent Nudges Panel**: Dashboard widget that surfaces high-priority or overdue tasks and navigates directly to the relevant task on click.
- **Input Validation & Toasts**: Strict "no past date" enforcement on due dates and reminders; unsaved checklist/cue/tag inputs surface as dismissible toast notifications (bottom-right) so users never miss the error regardless of scroll position.
- **Options Menu on Cards**: Per-task dropdown (⋯) for editing, deleting, and managing task state.
- **State Management**: Zustand store for fast, predictable client state without prop drilling.
- **Robust Authentication**: SSR-compatible auth powered by Supabase Auth with cookie session synchronization.
- **Theme Support**: Fully theme-aware components with clean light/dark modes.

## Tech Stack

| Layer               | Technology                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Framework**       | [Next.js 14+ (App Router)](https://nextjs.org/)                                                              |
| **Language**        | TypeScript                                                                                                   |
| **Styling**         | [Tailwind CSS](https://tailwindcss.com/) + [lucide-react](https://lucide.dev/)                               |
| **Database & Auth** | [Supabase](https://supabase.com/) + [@supabase/ssr](https://github.com/supabase/ssr)                         |
| **State Store**     | [Zustand](https://github.com/pmndrs/zustand)                                                                 |
| **UI Primitives**   | [Radix UI](https://www.radix-ui.com/) (Badge, Button, Card, Checkbox, Dropdown Menu, Input, Label, Textarea) |
| **Notifications**   | Web Push API + service worker                                                                                |
| **Forms**           | React Hook Form + Zod                                                                                        |

## Getting Started

### Local Setup

1. **Clone the Repository & Install Dependencies**:

   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and fill in your Supabase project credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
   VAPID_PRIVATE_KEY=your-vapid-private-key
   ```

3. **Run the Database Migrations**:
   The schema lives in `supabase/migrations/`. Apply via the Supabase CLI or paste the SQL directly into your Supabase Dashboard SQL Editor.

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database Schema

Core tables managed under `supabase/migrations/`:

| Table                | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `tasks`              | Primary tasks table: metadata, type, recurrence rules, status |
| `subtasks`           | Flat checklist items linked to a parent task                  |
| `tags` / `task_tags` | Many-to-many tag relationships for filtering                  |
| `task_memory_cues`   | Cognitive nudges / environmental trigger notes                |
| `push_subscriptions` | Web Push subscription records per user                        |

## Project Structure

```
src/
├── app/              # Next.js App Router pages & layouts
├── components/
│   ├── dashboard/    # Task board, task cards, forms, nudge panel
│   └── ui/           # Shared primitives (Button, Input, Toaster, …)
├── hooks/            # useToast, custom data hooks
├── services/         # Supabase data-access layer (tasks, tags, …)
├── store/            # Zustand stores (taskStore, …)
└── types/            # Shared TypeScript types & database types
```
