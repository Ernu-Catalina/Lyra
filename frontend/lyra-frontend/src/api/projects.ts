import { apiRequest } from "./client";
import type { Project } from "../types/api";

export async function getProjects(): Promise<Project[]> {
  return apiRequest("/projects");
}

export async function createProject(name: string): Promise<Project> {
  return apiRequest("/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
