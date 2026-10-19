import type { SettingsRowEntry } from "./types";

/** The four histories, each a row on Your activity and its own list (`?list=<id>`). */
export const ACTIVITY_LISTS = ["appreciated", "comments", "videos", "searches"] as const;
export type ActivityList = (typeof ACTIVITY_LISTS)[number];

export const activityRows: SettingsRowEntry[] = [
  { id: "appreciated", label: "Appreciated", help: "Posts you appreciated on Innovations", keywords: ["liked", "likes", "liked post"] },
  { id: "comments", label: "Comments", help: "Comments you wrote on Innovations posts", keywords: ["my comments"] },
  { id: "videos", label: "Videos you have watched", help: "Post videos you watched; clear your watch history", keywords: ["watch history", "clear watch history"] },
  { id: "searches", label: "Your search history", help: "Searches in ⌘K, Innovations and Explore; clear them", keywords: ["clear search history", "searches"] },
];
