export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Inactive" | "Suspended";
  role: "User" | "Practitioner" | "Seller" | "Admin";
  joinedDate: string;
  phone: string;
  sessionsCount: number;
}
