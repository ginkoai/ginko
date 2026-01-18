/**
 * @fileType: page
 * @status: placeholder
 * @updated: 2026-01-17
 * @tags: [dashboard, notifications, placeholder]
 * @related: [../settings/page.tsx]
 * @priority: low
 * @complexity: low
 * @dependencies: [next, lucide-react]
 */

'use client';

import { BellIcon } from '@heroicons/react/24/outline';

export default function NotificationsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Stay updated on your project activity
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <BellIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="font-medium text-foreground mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Notifications will help you stay informed about team activity,
            task assignments, and important project updates.
          </p>
        </div>
      </div>
    </div>
  );
}
