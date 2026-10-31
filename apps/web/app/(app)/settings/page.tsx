import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Users, UserCog, Phone, MessageCircle, Building2 } from 'lucide-react';

const TILES = [
  { href: '/settings/users', label: 'Users', desc: 'Team members and roles', icon: Users },
  { href: '/settings/teams', label: 'Teams', desc: 'Group users under leaders', icon: UserCog },
  { href: '/settings/pipeline', label: 'Pipeline', desc: 'Lead statuses and order', icon: Settings },
  { href: '/settings/sources', label: 'Lead sources', desc: 'Facebook, portals, referrals', icon: Building2 },
  { href: '/settings/telephony', label: 'Telephony', desc: 'Exotel / Twilio credentials', icon: Phone },
  { href: '/settings/messaging', label: 'Messaging', desc: 'WhatsApp + SMS providers', icon: MessageCircle },
];

export default function SettingsIndex() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href}>
              <Card className="transition-colors hover:bg-secondary/60">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Icon className="h-5 w-5" /></div>
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
