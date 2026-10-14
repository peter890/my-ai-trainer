'use client'

import { CalendarDays, Dumbbell, House, PanelLeftClose, PanelLeftOpen, Sparkles, UserRound } from 'lucide-react'
import type { TabId } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

export const navItems: { id: TabId; label: string; icon: typeof House }[] = [
  { id: 'dashboard', label: 'Dziś', icon: House },
  { id: 'history', label: 'Historia', icon: CalendarDays },
  { id: 'exercises', label: 'Ćwiczenia', icon: Dumbbell },
  { id: 'profile', label: 'Profil', icon: UserRound },
]

type NavProps = {
  active: TabId
  onSelect: (tab: TabId) => void
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles className="size-5" aria-hidden="true" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">AI Trainer</p>
          <p className="text-xs text-muted-foreground">Twój trener AI</p>
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  active,
  onSelect,
  collapsed,
  onToggle,
  liveActive,
  onOpenLive,
}: NavProps & {
  collapsed: boolean
  onToggle: () => void
  liveActive: boolean
  onOpenLive: () => void
}) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 md:flex',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <div className={cn('flex h-16 items-center px-4', collapsed ? 'justify-center' : 'justify-between')}>
        <Logo compact={collapsed} />
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Zwiń panel boczny"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <nav aria-label="Nawigacja główna" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )}
            >
              {isActive && (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" aria-hidden="true" />
              )}
              <item.icon className={cn('size-5 shrink-0', isActive && 'text-primary')} aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}

        {liveActive && (
          <button
            type="button"
            onClick={onOpenLive}
            className={cn(
              'mt-4 flex h-11 items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            {!collapsed && <span>Trening w toku</span>}
          </button>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Rozwiń panel boczny"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
              KN
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">Kamil Nowak</p>
              <p className="truncate text-xs text-muted-foreground">Synchronizacja: OK</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export function BottomNav({ active, onSelect }: NavProps) {
  return (
    <nav
      aria-label="Nawigacja główna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {navItems.map((item) => {
          const isActive = item.id === active
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-primary/15',
                  )}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
