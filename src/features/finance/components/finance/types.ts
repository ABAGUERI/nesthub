export type SavingsProjectProgress = {
  id: string;
  family_member_id: string;
  name: string;
  target_amount: number;
  emoji: string | null;
  image_url: string | null;
  priority: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  saved_amount: number;
  remaining_amount: number;
  progress_percent: number;
};
