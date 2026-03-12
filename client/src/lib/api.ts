import { apiRequest } from "./queryClient";
import type { User, Trip, SavedPlace, VehicleType } from "@shared/schema";

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

export async function seedData(): Promise<void> {
  await apiRequest("POST", "/api/seed");
}
