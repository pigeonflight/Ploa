// Plone REST API client for Tauri frontend
// Based on patterns from asajapi/ui/src/lib/api.ts

import { invoke } from "@tauri-apps/api/core";

export type ItemMetadata = {
  id?: string;
  title?: string;
  type?: string;
  review_state?: string;
  modified?: string;
  description?: string;
  path?: string;
  "@id"?: string;
  "@type"?: string;
  is_folderish?: boolean;
  Subject?: string[];
  subjects?: string[];
  document_type?: string;
};

export type LoginResponse = {
  token: string;
  [key: string]: any;
};

export type SearchResponse = {
  items: ItemMetadata[];
  items_total?: number;
  batching?: {
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
};

/**
 * Login to a Plone site
 */
export async function login(
  baseUrl: string,
  username: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await invoke<LoginResponse>("login", {
      baseUrl,
      username,
      password,
    });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Login failed"
    );
  }
}

/**
 * Connect anonymously to a Plone site
 */
export async function connect(baseUrl: string): Promise<any> {
  try {
    const response = await invoke("connect", { baseUrl });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Connection failed"
    );
  }
}

/**
 * Connect to a Plone site using a saved token
 */
export async function connectWithToken(
  baseUrl: string,
  token: string
): Promise<any> {
  try {
    const response = await invoke("connect_with_token", { baseUrl, token });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Token connection failed"
    );
  }
}

/**
 * Fetch content from a Plone REST API path
 */
export async function fetch(path?: string): Promise<any> {
  try {
    const response = await invoke("fetch", { path: path || null });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Fetch failed"
    );
  }
}

/**
 * Search for items by portal_type, path, or full-text search
 */
type SearchOptions = {
  portalType?: string;
  path?: string;
  searchableText?: string;
  metadataFields?: string[];
  fullObjects?: boolean;
  additionalParams?: Record<string, string>;
};

export async function search(options: SearchOptions = {}): Promise<SearchResponse> {
  const {
    portalType,
    path,
    searchableText,
    metadataFields,
    fullObjects,
    additionalParams,
  } = options;
  try {
    const response = await invoke<SearchResponse>("search", {
      portalType: portalType || null,
      path: path || null,
      searchableText: searchableText || null,
      metadataFields: metadataFields && metadataFields.length > 0 ? metadataFields : null,
      fullobjects: fullObjects ?? null,
      additionalParams: additionalParams || null,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "Search failed");
    throw new Error(message || "Search failed");
  }
}

/**
 * Update an item using PATCH
 */
export async function patch(path: string, data: Record<string, any>): Promise<any> {
  try {
    const response = await invoke("patch", { path, data });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Update failed"
    );
  }
}

/**
 * Create or perform POST operation
 */
export async function post(path: string, data: Record<string, any>): Promise<any> {
  try {
    const response = await invoke("post", { path, data });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "POST failed"
    );
  }
}

/**
 * Extract relative path from absolute URL
 * Removes the base URL and ++api++ prefix to get just the content path
 */
export function extractPath(url: string): string {
  if (!url) return "";
  // If it's already a relative path, return as is
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url;
  }
  // Extract path from absolute URL
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    // Remove ++api++ prefix if present
    if (path.includes("++api++")) {
      const parts = path.split("++api++");
      if (parts.length > 1) {
        path = parts[1];
      }
    }
    return path;
  } catch {
    return url;
  }
}

/**
 * Get all items in a path (browse)
 */
export async function getItems(path?: string): Promise<ItemMetadata[]> {
  try {
    // If path is an absolute URL, extract just the path part
    const relativePath = path ? extractPath(path) : undefined;
    const data = await fetch(relativePath);
    // Plone REST API returns items in an "items" array
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    }
    // If it's a single item, return it as an array
    if (data["@id"]) {
      return [data];
    }
    return [];
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to get items"
    );
  }
}

/**
 * Get all tags/subjects from items in a path
 */
export async function getAllTags(path?: string): Promise<Record<string, number>> {
  try {
    // First, get all items
    const items = await getItems(path);
    const tagCounts: Record<string, number> = {};

    // Extract subjects from items
    for (const item of items) {
      const subjects = item.Subject || item.subjects || [];
      if (Array.isArray(subjects)) {
        for (const subject of subjects) {
          if (subject && typeof subject === "string") {
            tagCounts[subject] = (tagCounts[subject] || 0) + 1;
          }
        }
      }
    }

    return tagCounts;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to get tags"
    );
  }
}

/**
 * Update subjects/tags for an item
 */
export async function updateSubjects(
  itemPath: string,
  subjects: string[]
): Promise<any> {
  // Clean subjects - filter out empty strings
  const cleanSubjects = subjects.filter((s) => s && s.trim());

  // Try Subject (capital S) first, as per Plone REST API docs
  try {
    return await patch(itemPath, { Subject: cleanSubjects });
  } catch (error) {
    // Fallback to lowercase
    try {
      return await patch(itemPath, { subjects: cleanSubjects });
    } catch (fallbackError) {
      throw new Error(
        `Failed to update subjects: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// ===== Keyword Management =====

export type SimilarTagPair = {
  tag: string;
  matched: string;
  similarity: number;
  count: number;
  matched_count: number;
};

export type MergeResult = {
  updated: number;
  affected_items: number;
  errors: string[];
};

/**
 * Collect all tags/keywords from the site
 * Uses the @search endpoint to efficiently retrieve all subjects
 */
export async function collectTags(path?: string): Promise<Record<string, number>> {
  try {
    const response = await invoke<Record<string, number>>("collect_tags", {
      path: path || null,
    });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to collect tags"
    );
  }
}

/**
 * Collect all content types from the site
 */
export async function collectContentTypes(path?: string): Promise<Record<string, number>> {
  try {
    const response = await invoke<Record<string, number>>("collect_content_types", {
      path: path || null,
    });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to collect content types"
    );
  }
}

/**
 * Find similar tag pairs using Levenshtein distance
 */
export async function findSimilarTags(
  tags: Record<string, number>,
  threshold: number = 70,
  limit: number = 100
): Promise<SimilarTagPair[]> {
  try {
    const response = await invoke<SimilarTagPair[]>("find_similar_tags", {
      tags,
      threshold,
      limit,
    });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to find similar tags"
    );
  }
}

/**
 * Merge tags - replace source tags with target tag across all items
 */
export async function mergeTags(
  target: string,
  sources: string[],
  path?: string
): Promise<MergeResult> {
  try {
    const response = await invoke<MergeResult>("merge_tags", {
      target,
      sources,
      path: path || null,
    });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to merge tags"
    );
  }
}

/**
 * Search for items by subject/keyword
 * @param subject - The subject/keyword to search for
 * @param path - Optional path to limit search scope
 */
export async function searchItemsBySubject(
  subject: string,
  path?: string
): Promise<ItemMetadata[]> {
  try {
    const response = await search({
      additionalParams: {
        Subject: subject,
      },
      path,
      metadataFields: ["title", "path", "@id", "Subject", "description", "portal_type"],
    });
    return response.items || [];
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to search items by subject"
    );
  }
}

/**
 * Move an item to a new parent folder
 * @param sourcePath - Path to the item to move (e.g., "/plone/front-page")
 * @param destinationPath - Path to the destination folder (e.g., "/plone/folder")
 */
export async function moveItem(
  sourcePath: string,
  destinationPath: string
): Promise<any> {
  try {
    const response = await invoke("move_item", {
      sourcePath,
      destinationPath,
    });
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to move item"
    );
  }
}
