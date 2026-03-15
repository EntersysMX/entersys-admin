# EnterSys Admin Platform - Deployment Guide

## Overview

Admin dashboard for EnterSys at `admin.entersys.mx`. Built with Next.js 14 + TypeScript + Tailwind CSS. Manages CRM, blog, live chat, email service, and team administration.

## Tech Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **State**: Zustand 5
- **Charts**: Recharts 3.8
- **Icons**: Lucide React
- **Auth**: JWT (localStorage) + Google OAuth
- **Real-time**: Socket.io-client (live chat)

## Architecture

```
entersys-admin/
├── src/
│   ├── app/
│   │   ├── (auth)/                     # Public auth pages
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (dashboard)/                # Protected admin pages
│   │       ├── dashboard/page.tsx      # Main dashboard
│   │       ├── crm/                    # CRM module (10 pages)
│   │       │   ├── dashboard/          # CRM analytics
│   │       │   ├── contacts/           # Contact list + detail
│   │       │   ├── companies/          # Company list + detail
│   │       │   ├── deals/              # Sales pipeline kanban
│   │       │   ├── tasks/              # Task management
│   │       │   ├── automations/        # Workflow automation
│   │       │   ├── segments/           # Contact segmentation
│   │       │   └── settings/           # CRM config
│   │       ├── live-chat/              # Chat supervision panel
│   │       ├── posts/                  # Blog management (list, create, edit)
│   │       ├── email/                  # Email service dashboard
│   │       ├── team/                   # Team management
│   │       ├── users/                  # User roles & permissions
│   │       └── settings/               # Global settings
│   ├── components/
│   │   ├── layout/PlatformSidebar.tsx  # Main navigation sidebar
│   │   ├── chat/InternalChatWidget.tsx # Internal team chat
│   │   └── crm/                       # CRM components (command palette, shortcuts)
│   ├── lib/api-client.ts              # API client singleton (auto token refresh)
│   ├── stores/auth-store.ts           # Zustand auth state
│   └── hooks/useLiveChatBadge.ts      # Live chat notification badge
├── Dockerfile                          # Multi-stage Node 20 Alpine
├── docker-compose.yml                  # Traefik routing for admin.entersys.mx
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## Backend API Connection

This admin connects to the **EnterSys FastAPI backend** at `api.entersys.mx/api`.

### API Endpoints Used

| Module | Endpoint Prefix | Backend File |
|--------|----------------|--------------|
| **Auth** | `/v1/auth/*` | `auth.py` |
| **CRM Contacts** | `/v1/crm/contacts/*` | `crm.py` |
| **CRM Deals** | `/v1/crm/deals/*` | `crm.py` |
| **CRM Activities** | `/v1/crm/activities/*` | `crm.py` |
| **Chat** | `/v1/chat/*` | `chat.py` |
| **Blog Posts** | `/v1/posts/*` | `posts.py` |
| **Email** | `/v1/email/*` | `email_admin.py`, `email_send.py` |
| **Support** | External: `soporte.entersys.mx` | Separate service |

### API Client

`src/lib/api-client.ts` is a singleton that:
- Injects JWT Bearer token from localStorage
- Auto-refreshes expired tokens via `/v1/auth/refresh`
- Redirects to `/login` on auth failure
- Supports SSE streaming for AI chat responses

## Sidebar Navigation

| Section | Route | Access |
|---------|-------|--------|
| Dashboard | `/dashboard` | All roles |
| Chat en Vivo | `/live-chat` | Sales, Support, Admin |
| CRM | `/crm` | Sales, Admin |
| Mesa de Servicio | `soporte.entersys.mx` (external) | Support, Admin |
| Blog | `/posts` | Admin |
| Email | `/email` | Admin |
| Equipo | `/team` | HR, Admin |
| Users & Permisos | `/users` | Platform Admin |
| Configuracion | `/settings` | Admin, Director |

## Chatbot Integration

- **Sales chatbot** on `www.entersys.mx` creates CRM contacts via `/v1/chat/sessions/{id}/visitor-info`
- **Live chat panel** at `/live-chat` shows active sessions for agents to monitor/intervene
- **Support chatbot** connects to `soporte.entersys.mx` (separate mesa de servicio)

## Deployment

```bash
# On production server (34.59.193.54)
cd /opt/apps/Web_Entersys/entersys-admin

# Build and deploy
docker compose up -d --build

# Verify
curl -I https://admin.entersys.mx
```

## Environment Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.entersys.mx/api` |
| `NEXT_PUBLIC_APP_URL` | `https://admin.entersys.mx` |
| `NODE_ENV` | `production` |

## Important Notes

- EnterSys does NOT use ERP or logistics systems
- Mautic CRM has been removed from the server
- Support is handled by the separate mesa de servicio at soporte.entersys.mx
- Docker: use ONLY soft limits (reservations), NEVER hard limits
- The admin panel replaces the previous React+Vite admin (entersys-admin-backup)
