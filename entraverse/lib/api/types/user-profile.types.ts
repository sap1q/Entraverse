export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  country: string | null;
  date_of_birth: string | null;
  avatar: string | null;
  avatar_path: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
