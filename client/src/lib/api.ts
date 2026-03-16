import { apiRequest } from "./queryClient";
import type { User, Trip, SavedPlace, VehicleType, TaxiRoute, Message, SosAlert } from "@shared/schema";

export async function login(username: string, password: string): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/login", { username, password });
  return res.json();
}

export async function register(data: any): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/register", data);
  return res.json();
}

export async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`, { credentials: "include" });
  return res.json();
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const res = await apiRequest("PATCH", `/api/users/${id}`, data);
  return res.json();
}

export async function createTrip(data: any): Promise<Trip> {
  const res = await apiRequest("POST", "/api/trips", data);
  return res.json();
}

export async function updateTrip(id: string, data: any): Promise<Trip> {
  const res = await apiRequest("PATCH", `/api/trips/${id}`, data);
  return res.json();
}

export async function submitOnboarding(driverId: string, data: any): Promise<User> {
  const res = await apiRequest("PATCH", `/api/drivers/${driverId}/onboarding`, data);
  return res.json();
}

export async function approveDriver(driverId: string): Promise<User> {
  const res = await apiRequest("PATCH", `/api/admin/drivers/${driverId}/approve`);
  return res.json();
}

export async function rejectDriver(driverId: string, reason: string): Promise<User> {
  const res = await apiRequest("PATCH", `/api/admin/drivers/${driverId}/reject`, { reason });
  return res.json();
}

export async function seedData(): Promise<void> {
  await apiRequest("POST", "/api/seed");
}

export async function getMessages(tripId: string): Promise<Message[]> {
  const res = await fetch(`/api/messages/${tripId}`, { credentials: "include" });
  return res.json();
}

export async function sendMessage(data: { tripId: string; senderId: string; senderRole: string; text: string }): Promise<Message> {
  const res = await apiRequest("POST", "/api/messages", data);
  return res.json();
}

export async function sendSosAlert(data: { tripId?: string; userId: string; userRole: string; lat?: number; lng?: number }): Promise<SosAlert> {
  const res = await apiRequest("POST", "/api/sos", data);
  return res.json();
}

export async function updateSosAlert(id: string, data: { status?: string; adminNotes?: string }): Promise<SosAlert> {
  const res = await apiRequest("PATCH", `/api/sos/${id}`, data);
  return res.json();
}

export async function forgotPassword(username: string, phone: string): Promise<{ message: string; requestId?: string }> {
  const res = await apiRequest("POST", "/api/auth/forgot-password", { username, phone });
  return res.json();
}

export async function resetPassword(username: string, phone: string, newPassword: string): Promise<{ message: string }> {
  const res = await apiRequest("POST", "/api/auth/reset-password", { username, phone, newPassword });
  return res.json();
}

export async function getPasswordResetRequests(): Promise<any[]> {
  const res = await fetch("/api/password-reset-requests", { credentials: "include" });
  return res.json();
}

export async function getPendingPasswordResetRequests(): Promise<any[]> {
  const res = await fetch("/api/password-reset-requests/pending", { credentials: "include" });
  return res.json();
}

export async function updatePasswordResetRequest(id: string, data: any): Promise<any> {
  const res = await apiRequest("PATCH", `/api/password-reset-requests/${id}`, data);
  return res.json();
}

export async function adminResetUserPassword(userId: string, newPassword: string): Promise<{ message: string }> {
  const res = await apiRequest("POST", "/api/admin/reset-user-password", { userId, newPassword });
  return res.json();
}

export async function verifyUser(userId: string, isVerified: boolean): Promise<User> {
  const res = await apiRequest("PATCH", `/api/admin/users/${userId}/verify`, { isVerified });
  return res.json();
}

export async function getAllUsers(): Promise<User[]> {
  const res = await fetch("/api/users", { credentials: "include" });
  return res.json();
}
