export interface Admin {
  discord_webhook: string | null;
  is_sudo: boolean;
  telegram_id: number | null;
  username: string;
  users_usage: number;
}
