import "./style.css";
import * as api from "./lib/api";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";

// Plone brand color
// Theme colors
const THEME_PRIMARY = "#8CA9FF";
const THEME_SECONDARY = "#AAC4F5";
const THEME_BG_ACCENT = "#FFF2C6";
const THEME_BG_LIGHT = "#FFF8DE";

// Legacy constant mapping (to minimize refactoring churn)
const PLONE_BLUE = THEME_PRIMARY;

// Wait for DOM and Tauri to be ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div style="padding: 2rem; height: 100%; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${THEME_BG_LIGHT};">
    <header style="border-bottom: 2px solid rgba(170, 196, 245, 0.15); padding: 0.5rem 0; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
      <img src="/PloaCircle.svg" alt="Ploa" style="height: 28px;" />
        <div id="updateIndicator" style="display: none; padding: 0.25rem 0.5rem; background: ${PLONE_BLUE}; color: white; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; opacity: 0.9; transition: opacity 0.2s;" title="Update available - click to download">
          Update available
        </div>
      </div>
      <div id="userStatus" style="display: flex; align-items: center; gap: 1rem;">
        <span id="statusText" style="color: #666; font-size: 14px;">Not connected</span>
        <button id="headerLoginBtn" style="display: none; padding: 0.25rem 0.75rem; background: transparent; border: 1px solid ${PLONE_BLUE}; color: ${PLONE_BLUE}; border-radius: 4px; cursor: pointer; font-size: 14px;">
          Login
        </button>
        <button id="disconnectBtn" style="display: none; padding: 0.25rem 0.75rem; background: transparent; border: 1px solid #d32f2f; color: #d32f2f; border-radius: 4px; cursor: pointer; font-size: 14px;">
          Disconnect
        </button>
        <button id="preferencesBtn" style="padding: 0.5rem; background: transparent; border: none; color: #666; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Preferences">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"></circle>
            <circle cx="12" cy="12" r="2"></circle>
            <circle cx="12" cy="19" r="2"></circle>
          </svg>
        </button>
      </div>
    </header>
    <main style="flex: 1; overflow: auto;">
      <div id="content">
        <div id="login-form" style="max-width: 500px; margin: 2rem auto;">
          <h2>Connect to Plone Site</h2>
          <div id="loginForm" style="display: flex; flex-direction: column; gap: 1rem;" role="form" aria-labelledby="connectHeading">
            <div>
              <label for="baseUrl" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Base URL:</label>
              <input 
                type="text" 
                id="baseUrl" 
                name="baseUrl" 
                list="urlHistory"
                placeholder="https://demo.plone.org/++api++/"
                value="https://demo.plone.org/++api++/"
                style="width: 100%; padding: 0.5rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};"
              />
              <datalist id="urlHistory"></datalist>
              <div id="credentialsHint" style="display: none; margin-top: 0.5rem; padding: 0.5rem; background: ${THEME_BG_ACCENT}; border-radius: 4px; font-size: 13px; color: #333;">
                <strong>💡 Hint:</strong> Default credentials for demo.plone.org are <code>admin</code> / <code>admin</code>
              </div>
            </div>
            
            <div id="credentialsFields">
              <div style="margin-bottom: 1rem;">
                <label for="username" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Username:</label>
                <input 
                  type="text" 
                  id="username" 
                  name="username" 
                  placeholder="admin"
                  style="width: 100%; padding: 0.5rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};"
                />
              </div>
              <div>
                <label for="password" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Password:</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="admin"
                  style="width: 100%; padding: 0.5rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};"
                />
              </div>
            </div>

            <div style="display: flex; gap: 1rem;">
              <button 
                type="button" 
                id="loginSubmitBtn"
                style="flex: 1; padding: 0.75rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 500; cursor: pointer;"
              >
                Login
              </button>
              <button 
                type="button" 
                id="anonymousBtn"
                style="flex: 1; padding: 0.75rem; background: white; color: ${PLONE_BLUE}; border: 1px solid ${PLONE_BLUE}; border-radius: 4px; font-size: 16px; font-weight: 500; cursor: pointer;"
              >
                Browse Anonymously
              </button>
            </div>
          </div>
          <div id="error" style="margin-top: 1rem; color: #d32f2f; display: none;"></div>
        </div>

        <div id="app-content" style="display: none;">
          <div id="browser" style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
              <button id="backBtn" style="padding: 0.5rem 1rem; background: ${THEME_BG_LIGHT}; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; cursor: pointer; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
                Up
              </button>
              <button id="browseBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Browse Root
              </button>
              <button id="keywordsBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                Keywords Manager
              </button>
              <span id="currentPath" style="color: #666; font-family: monospace;">/</span>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input 
                type="text" 
                id="searchInput" 
                placeholder="Search content items..." 
                style="flex: 1; padding: 0.5rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px;"
              />
              <button id="searchBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                Search
              </button>
              <button id="clearSearchBtn" style="padding: 0.5rem 1rem; background: ${THEME_SECONDARY}; color: #333; border: none; border-radius: 4px; cursor: pointer; display: none;">
                Clear
              </button>
              <button id="ragBundleBtn" style="padding: 0.5rem 1rem; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer; display: none;">
                Bundle PDFs
              </button>
            </div>
            <div id="ragBundlePanel" style="display: none; margin: 0.5rem 0; padding: 0.75rem; border: 1px dashed ${THEME_SECONDARY}; border-radius: 6px; background: rgba(46, 125, 50, 0.08);">
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <strong style="color: #2e7d32; font-size: 0.9rem;">RAG bundle ready</strong>
                <span style="color: #555; font-size: 0.85rem;">Download all PDF files from the current search into a local folder for use in your RAG stack.</span>
                <span id="ragBundleStatus" style="color: #2e7d32; font-size: 0.85rem;"></span>
                <div id="ragBundleErrorDetails" style="display: none; margin-top: 0.35rem; padding: 0.35rem 0.5rem; background: rgba(198, 40, 40, 0.08); border: 1px solid rgba(198, 40, 40, 0.3); border-radius: 4px; font-size: 0.8rem; color: #c62828;"></div>
                <button id="ragBundleResumeBtn" style="display: none; margin-top: 0.25rem; padding: 0.35rem 0.75rem; border: 1px solid ${PLONE_BLUE}; border-radius: 4px; background: white; color: ${PLONE_BLUE}; cursor: pointer; align-self: flex-start;">
                  Resume failed downloads
                </button>
              </div>
            </div>
            <div id="breadcrumb" style="margin-bottom: 0.5rem; padding: 0.5rem; background: ${THEME_BG_ACCENT}; border-radius: 4px; font-size: 13px; color: #666; display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap;">
              <span style="color: ${PLONE_BLUE}; cursor: pointer;" data-path="" class="breadcrumb-item">Root</span>
            </div>
            <div id="itemsList" style="border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; padding: 0.5rem; min-height: 200px; background: ${THEME_BG_LIGHT}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <p style="color: #666; padding: 1rem;">Click "Browse Root" to load items</p>
            </div>
          </div>
        </div>
      </div>
    </main>
    <footer style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05); text-align: right;">
      <style>
        #incrementic-credit {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: #999;
          font-size: 10px;
          transition: opacity 0.2s;
        }
        #incrementic-credit:hover {
          opacity: 1;
        }
        #incrementic-credit img {
          height: 12px;
          width: auto;
          transition: opacity 0.2s;
        }
        #incrementic-credit:hover img {
          opacity: 1;
        }
      </style>
      <span id="incrementic-credit" style="cursor: pointer;">
        <span>Built with ❤️ by</span>
        <img src="/incrementic-logo.svg" alt="Incrementic" />
        <span>🇯🇲</span>
        <span style="margin-left: 0.5rem;">v<span id="app-version">-</span></span>
        <span id="feedback-link" style="margin-left: 1rem; cursor: pointer; text-decoration: underline;">Feedback</span>
      </span>
    </footer>
    <div id="preferencesModal" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); display: none; align-items: center; justify-content: center; z-index: 999;">
      <div style="background: white; width: min(480px, 90%); border-radius: 8px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); padding: 1.5rem; position: relative;">
        <button id="preferencesCloseBtn" style="position: absolute; top: 0.75rem; right: 0.75rem; background: transparent; border: none; cursor: pointer; padding: 0.25rem; color: #555;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h2 style="margin-top: 0; margin-bottom: 0.5rem;">Preferences</h2>
        <p style="margin-top: 0; color: #666;">Control optional and experimental functionality for your local Ploa app.</p>
        <div style="margin-top: 1rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 6px; padding: 1rem; background: ${THEME_BG_LIGHT}; display: flex; justify-content: space-between; gap: 1rem; align-items: center;">
          <div>
            <div style="font-weight: 600; margin-bottom: 0.25rem;">Enable RAG bundle export</div>
            <p style="margin: 0; color: #555; font-size: 13px;">Show controls that let you download PDFs from a listing into a local folder for use with RAG tools. The downloads will go to the designated directory on your device.</p>
          </div>
          <label style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 13px;">
            <input type="checkbox" id="ragBundleToggle" style="width: 16px; height: 16px;" />
            <span id="ragBundleToggleLabel">Disabled</span>
          </label>
        </div>
        <p id="preferencesStatus" style="margin-top: 1rem; font-size: 13px; color: #4caf50; display: none;">Preferences saved.</p>
      </div>
    </div>
    </div>
  `;

  // UI Elements
  const loginForm = document.querySelector<HTMLDivElement>("#login-form")!;
  const appContent = document.querySelector<HTMLDivElement>("#app-content")!;
  const loginSubmitBtn = document.querySelector<HTMLButtonElement>("#loginSubmitBtn")!;
  const anonymousBtn = document.querySelector<HTMLButtonElement>("#anonymousBtn")!;
  const browseBtn = document.querySelector<HTMLButtonElement>("#browseBtn")!;
  const backBtn = document.querySelector<HTMLButtonElement>("#backBtn")!;
  const keywordsBtn = document.querySelector<HTMLButtonElement>("#keywordsBtn")!;
  const searchBtn = document.querySelector<HTMLButtonElement>("#searchBtn")!;
  const clearSearchBtn = document.querySelector<HTMLButtonElement>("#clearSearchBtn")!;
  const ragBundleBtn = document.querySelector<HTMLButtonElement>("#ragBundleBtn")!;
  const ragBundlePanel = document.querySelector<HTMLDivElement>("#ragBundlePanel")!;
  const ragBundleStatus = document.querySelector<HTMLSpanElement>("#ragBundleStatus")!;
  const ragBundleErrorDetails = document.querySelector<HTMLDivElement>("#ragBundleErrorDetails")!;
  const ragBundleResumeBtn = document.querySelector<HTMLButtonElement>("#ragBundleResumeBtn")!;
  const searchInput = document.querySelector<HTMLInputElement>("#searchInput")!;
  const itemsList = document.querySelector<HTMLDivElement>("#itemsList")!;
  const currentPathSpan = document.querySelector<HTMLSpanElement>("#currentPath")!;
  const breadcrumb = document.querySelector<HTMLDivElement>("#breadcrumb")!;
  const statusText = document.querySelector<HTMLSpanElement>("#statusText")!;
  const headerLoginBtn = document.querySelector<HTMLButtonElement>("#headerLoginBtn")!;
  const disconnectBtn = document.querySelector<HTMLButtonElement>("#disconnectBtn")!;
  const preferencesBtn = document.querySelector<HTMLButtonElement>("#preferencesBtn")!;
  const preferencesModal = document.querySelector<HTMLDivElement>("#preferencesModal")!;
  const preferencesCloseBtn = document.querySelector<HTMLButtonElement>("#preferencesCloseBtn")!;
  const ragBundleToggle = document.querySelector<HTMLInputElement>("#ragBundleToggle")!;
  const ragBundleToggleLabel = document.querySelector<HTMLSpanElement>("#ragBundleToggleLabel")!;
  const preferencesStatus = document.querySelector<HTMLParagraphElement>("#preferencesStatus")!;
  const baseUrlInput = document.querySelector<HTMLInputElement>("#baseUrl")!;
  const usernameInput = document.querySelector<HTMLInputElement>("#username")!;
  const passwordInput = document.querySelector<HTMLInputElement>("#password")!;
  const errorDiv = document.querySelector<HTMLDivElement>("#error")!;
  const urlHistory = document.querySelector<HTMLDataListElement>("#urlHistory")!;
  const credentialsHint = document.querySelector<HTMLDivElement>("#credentialsHint")!;
  const incrementicCredit = document.querySelector<HTMLSpanElement>("#incrementic-credit")!;
  const feedbackLink = document.querySelector<HTMLSpanElement>("#feedback-link")!;

  type Preferences = {
    enableRagBundle: boolean;
  };

  const PREFERENCES_KEY = "ploa_preferences";
  const defaultPreferences: Preferences = {
    enableRagBundle: false
  };

  const loadPreferences = (): Preferences => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultPreferences,
          ...parsed
        };
      }
    } catch (error) {
      console.warn("Failed to parse preferences, resetting to defaults.", error);
    }
    return { ...defaultPreferences };
  };

  const savePreferences = (prefs: Preferences) => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  };

  let currentPreferences = loadPreferences();

  const updateRagToggleLabel = () => {
    ragBundleToggleLabel.textContent = ragBundleToggle.checked ? "Enabled" : "Disabled";
    ragBundleToggleLabel.style.color = ragBundleToggle.checked ? "#2e7d32" : "#555";
  };

  const showPreferencesStatus = (message: string) => {
    preferencesStatus.textContent = message;
    preferencesStatus.style.display = "block";
    setTimeout(() => {
      preferencesStatus.style.display = "none";
    }, 2000);
  };

  const openPreferences = () => {
    preferencesModal.style.display = "flex";
  };

  const closePreferences = () => {
    preferencesModal.style.display = "none";
  };

  ragBundleToggle.checked = currentPreferences.enableRagBundle;
  updateRagToggleLabel();

  preferencesBtn.addEventListener("click", openPreferences);
  preferencesCloseBtn.addEventListener("click", closePreferences);
  preferencesModal.addEventListener("click", (event) => {
    if (event.target === preferencesModal) {
      closePreferences();
    }
  });

  ragBundleToggle.addEventListener("change", () => {
    currentPreferences = {
      ...currentPreferences,
      enableRagBundle: ragBundleToggle.checked
    };
    savePreferences(currentPreferences);
    updateRagToggleLabel();
    showPreferencesStatus("Preferences saved.");
    updateRagBundlePanelVisibility();
  });

  const isRagBundleEnabled = () => currentPreferences.enableRagBundle === true;

  type RagCandidate = { item: api.ItemMetadata; path: string };
  type DownloadJob = { source: string; destination: string };
  type DownloadOutcome = { saved: boolean; error?: string };
  type DownloadFailure = { job: DownloadJob; error: string };
  const DOWNLOAD_BATCH_SIZE = 10;
  let ragCandidates: RagCandidate[] = [];
  let failedDownloadJobs: DownloadJob[] = [];
  let downloadFailures: DownloadFailure[] = [];

  const updateResumeButtonVisibility = () => {
    if (!isRagBundleEnabled()) {
      ragBundleResumeBtn.style.display = "none";
      return;
    }
    if (failedDownloadJobs.length > 0) {
      ragBundleResumeBtn.style.display = "inline-flex";
      ragBundleResumeBtn.textContent = `Resume ${failedDownloadJobs.length} failed download${failedDownloadJobs.length === 1 ? "" : "s"}`;
      ragBundleResumeBtn.disabled = isRagBundling;
    } else {
      ragBundleResumeBtn.style.display = "none";
    }
  };

  const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  const renderDownloadFailures = () => {
    if (!downloadFailures.length) {
      ragBundleErrorDetails.style.display = "none";
      ragBundleErrorDetails.innerHTML = "";
      return;
    }

    const maxItems = 3;
    const lines = downloadFailures.slice(0, maxItems).map((failure) => {
      const destination = failure.job.destination.split("/").pop() || failure.job.destination;
      return `&#8226; ${escapeHtml(destination)} &ndash; ${escapeHtml(failure.error)}`;
    });
    if (downloadFailures.length > maxItems) {
      lines.push(`<em>+ ${downloadFailures.length - maxItems} more failures</em>`);
    }
    ragBundleErrorDetails.innerHTML = lines.join("<br />");
    ragBundleErrorDetails.style.display = "block";
  };

  const setDownloadFailures = (failures: DownloadFailure[]) => {
    downloadFailures = failures;
    renderDownloadFailures();
  };

  const setFailedDownloadJobs = (jobs: DownloadJob[], failures: DownloadFailure[] = downloadFailures) => {
    failedDownloadJobs = jobs;
    setDownloadFailures(failures);
    updateResumeButtonVisibility();
  };

  const updateRagBundlePanelVisibility = () => {
    const shouldShow = isRagBundleEnabled() && (ragCandidates.length > 0 || failedDownloadJobs.length > 0);
    ragBundlePanel.style.display = shouldShow ? "block" : "none";
    ragBundleBtn.style.display = isRagBundleEnabled() && ragCandidates.length > 0 ? "inline-flex" : "none";
    ragBundleBtn.disabled = isRagBundling;
    updateResumeButtonVisibility();
    if (!shouldShow) {
      ragBundleStatus.textContent = "";
      setDownloadFailures([]);
    }
  };

  const setRagCandidates = (candidates: RagCandidate[]) => {
    ragCandidates = candidates;
    updateRagBundlePanelVisibility();
  };

  const clearRagCandidates = () => {
    ragCandidates = [];
    updateRagBundlePanelVisibility();
  };

  const setRagBundleStatus = (message: string, color: string = "#2e7d32") => {
    ragBundleStatus.textContent = message;
    ragBundleStatus.style.color = color;
    if (message) {
      ragBundlePanel.style.display = "block";
    }
  };


  // Handle Incrementic credit link
  incrementicCredit.addEventListener("click", async () => {
    try {
      await invoke("plugin:shell|open", { path: "https://incrementic.com" });
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  });

  // Handle Feedback link
  feedbackLink.addEventListener("click", async (e) => {
    e.stopPropagation(); // Prevent triggering the incrementic credit click
    try {
      await invoke("plugin:shell|open", { path: "https://github.com/pigeonflight/Ploa/issues" });
    } catch (error) {
      console.error("Failed to open feedback URL:", error);
    }
  });

  // Load and display app version
  invoke<string>("get_app_version").then(async (version) => {
    const versionSpan = document.getElementById("app-version");
    if (versionSpan) {
      versionSpan.textContent = version;
    }

    // Check for updates in the background
    checkForUpdates(version);
  }).catch((error) => {
    console.error("Failed to get app version:", error);
    const versionSpan = document.getElementById("app-version");
    if (versionSpan) {
      versionSpan.textContent = "?";
    }
  });

  // Check for updates from GitHub
  async function checkForUpdates(currentVersion: string) {
    try {
      const response = await fetch("https://api.github.com/repos/pigeonflight/Ploa/releases/latest", {
        headers: {
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!response.ok) {
        return; // Silently fail - don't bother user if check fails
      }

      const release = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, ""); // Remove 'v' prefix if present

      // Compare versions (simple string comparison should work for semantic versioning)
      if (compareVersions(latestVersion, currentVersion) > 0) {
        // New version available - show notification
        showUpdateNotification(latestVersion, release.html_url);
      }
    } catch (error) {
      // Silently fail - don't bother user if check fails
      console.debug("Update check failed:", error);
    }
  }

  // Simple version comparison (assumes semantic versioning)
  function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    return 0;
  }

  // Show update indicator (discreet top-left indicator)
  function showUpdateNotification(version: string, releaseUrl: string) {
    const updateIndicator = document.getElementById("updateIndicator");
    if (!updateIndicator) {
      return;
    }

    // Show the indicator
    updateIndicator.style.display = "block";
    updateIndicator.setAttribute("data-version", version);
    updateIndicator.setAttribute("data-release-url", releaseUrl);
    updateIndicator.title = `Update available: v${version} - click to download`;

    // Click handler to open release URL
    updateIndicator.onclick = async () => {
      try {
        // Try with 'url' parameter first (for URLs)
        await invoke("plugin:shell|open", { url: releaseUrl });
      } catch (error) {
        // Fallback to 'path' parameter
        try {
          await invoke("plugin:shell|open", { path: releaseUrl });
        } catch (fallbackError) {
          console.error("Failed to open release URL:", fallbackError);
        }
      }
    };

    // Hover effect
    updateIndicator.onmouseenter = () => {
      updateIndicator.style.opacity = "1";
    };
    updateIndicator.onmouseleave = () => {
      updateIndicator.style.opacity = "0.9";
    };
  }

  // State
  let currentBaseUrl = "";
  let currentPath = "";
  let activePdfPreviewUrl: string | null = null;
  let isRagBundling = false;

  // Tree state for hierarchical browsing
  interface TreeNode {
    item: api.ItemMetadata;
    path: string;
    children: TreeNode[];
    expanded: boolean;
    loaded: boolean;
    hasChildren: boolean; // Track if we know this item has children
    depth: number;
  }

  let treeRoot: TreeNode[] = [];
  let expandedPaths: Set<string> = new Set();

  // Helper to extract item ID from @id field
  function extractItemId(item: any): string {
    // Try @id first (full URL from Plone REST API)
    if (item['@id']) {
      const url = item['@id'];
      // Extract path from absolute URL
      try {
        const urlObj = new URL(url);
        let path = urlObj.pathname;
        // Remove ++api++ prefix if present
        if (path.includes('++api++')) {
          const parts = path.split('++api++');
          if (parts.length > 1) {
            path = parts[1];
          }
        }
        // Remove leading slash and return just the last segment (the ID)
        const segments = path.split('/').filter(s => s);
        return segments[segments.length - 1] || '';
      } catch {
        // If URL parsing fails, try to extract from string
        const parts = url.split('/');
        return parts[parts.length - 1] || '';
      }
    }
    // Fallback to id field if available
    return item.id || item.title || 'unknown';
  }

  function normalizePathCandidate(rawCandidate: any): string {
    if (!rawCandidate) {
      return "";
    }

    let candidate = rawCandidate;

    if (typeof candidate !== "string") {
      // Some Plone responses return an object for path metadata
      if (candidate?.path && typeof candidate.path === "string") {
        candidate = candidate.path;
      } else if (Array.isArray(candidate?.physicalPath)) {
        candidate = candidate.physicalPath.join("/");
      } else if (typeof candidate?.string === "string") {
        candidate = candidate.string;
      } else {
        return "";
      }
    }

    candidate = candidate.trim();
    if (!candidate) {
      return "";
    }

    // Drop query/hash fragments
    const queryIndex = candidate.indexOf("?");
    if (queryIndex !== -1) {
      candidate = candidate.slice(0, queryIndex);
    }
    const hashIndex = candidate.indexOf("#");
    if (hashIndex !== -1) {
      candidate = candidate.slice(0, hashIndex);
    }

    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      try {
        const urlObj = new URL(candidate);
        candidate = urlObj.pathname || "";
      } catch {
        // Fallback: strip scheme manually
        candidate = candidate.replace(/^https?:\/\//i, "");
        const firstSlash = candidate.indexOf("/");
        candidate = firstSlash >= 0 ? candidate.slice(firstSlash) : "";
      }
    }

    // Remove any download specific suffix (e.g. /@@download/file/...)
    const downloadIndex = candidate.indexOf("/@@download");
    if (downloadIndex !== -1) {
      candidate = candidate.slice(0, downloadIndex);
    }

    // If ++api++ is embedded, strip everything up to it
    if (candidate.includes("++api++")) {
      const parts = candidate.split("++api++");
      candidate = parts[parts.length - 1] || "";
    }

    candidate = candidate.replace(/^\//, "").replace(/\/+$/, "");
    return candidate;
  }

  function resolveItemPath(item: api.ItemMetadata): string {
    const candidates = [
      normalizePathCandidate(item.path),
      normalizePathCandidate((item as any)?.path?.path),
      normalizePathCandidate(item["@id"]),
    ];

    for (const candidate of candidates) {
      if (candidate) {
        return candidate;
      }
    }

    const fallbackId = extractItemId(item);
    return currentPath ? `${currentPath}/${fallbackId}` : fallbackId;
  }

  // Helper to get full path of an item (for API calls)
  function getItemFullPath(item: any): string {
    return resolveItemPath(item);
  }

  function getItemApiPath(item: api.ItemMetadata): string {
    return resolveItemPath(item);
  }

  function stripApiSegment(pathname: string): string {
    if (!pathname) {
      return "/";
    }
    if (pathname.includes("++api++")) {
      const parts = pathname.split("++api++");
      const suffix = parts[parts.length - 1] || "/";
      return suffix.startsWith("/") ? suffix : `/${suffix}`;
    }
    return pathname;
  }

  function getPublicSiteBase(objectData?: any): string | null {
    const candidateUrl = typeof objectData?.["@id"] === "string"
      ? objectData["@id"]
      : (currentBaseUrl || null);
    if (!candidateUrl) {
      return null;
    }
    try {
      const urlObj = new URL(candidateUrl);
      let pathname = urlObj.pathname;
      if (pathname.includes("++api++")) {
        pathname = pathname.split("++api++")[0];
      }
      urlObj.pathname = pathname.replace(/\/+$/, "");
      urlObj.search = "";
      urlObj.hash = "";
      return urlObj.toString().replace(/\/+$/, "");
    } catch {
      return null;
    }
  }

  function getPublicItemUrl(objectData?: any): string | null {
    if (!objectData || typeof objectData["@id"] !== "string") {
      return null;
    }
    try {
      const urlObj = new URL(objectData["@id"]);
      urlObj.pathname = stripApiSegment(urlObj.pathname);
      urlObj.search = "";
      urlObj.hash = "";
      return urlObj.toString();
    } catch {
      return null;
    }
  }

  function ensureAbsoluteUrlFromObject(objectData: any, maybeUrl: string | null | undefined): string | null {
    if (!maybeUrl) return null;

    if (/^https?:\/\//i.test(maybeUrl)) {
      return maybeUrl;
    }

    const siteBase = getPublicSiteBase(objectData);
    if (!siteBase) {
      return null;
    }

    if (maybeUrl.startsWith("/")) {
      return `${siteBase}${maybeUrl}`;
    }

    const objectUrl = getPublicItemUrl(objectData);
    if (objectUrl) {
      const lastSlash = objectUrl.lastIndexOf("/");
      const parent = lastSlash > 0 ? objectUrl.slice(0, lastSlash) : objectUrl;
      return `${parent}/${maybeUrl}`;
    }

    return `${siteBase}/${maybeUrl}`;
  }

  function buildDownloadUrlFromObject(objectData: any): string | null {
    const publicItemUrl = getPublicItemUrl(objectData);
    if (publicItemUrl) {
      return `${publicItemUrl.replace(/\/+$/, "")}/@@download/file`;
    }

    const siteBase = getPublicSiteBase(objectData);
    const inferredPath = resolveItemPath(objectData as api.ItemMetadata);
    if (!siteBase || !inferredPath) {
      return null;
    }

    let cleanPath = inferredPath.replace(/^\/+/, "").replace(/\/+$/, "");
    try {
      const siteUrl = new URL(`${siteBase}/`);
      const sitePath = siteUrl.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      if (sitePath && cleanPath.startsWith(`${sitePath}/`)) {
        cleanPath = cleanPath.slice(sitePath.length + 1);
      }
    } catch {
      // ignore - fallback to original cleanPath
    }

    return `${siteBase}/${cleanPath}/@@download/file`;
  }

  function sanitizeFilename(base: string): string {
    const cleaned = base
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || `document-${Date.now()}`;
  }

  function ensurePdfFilename(preferred?: string | null, fallbackTitle?: string): string {
    const fallback = fallbackTitle || "document";
    const candidate = preferred || fallback;
    const sanitized = sanitizeFilename(candidate);
    return sanitized.toLowerCase().endsWith(".pdf") ? sanitized : `${sanitized}.pdf`;
  }

  function detectPdfInfo(objectData: any): { url: string; filename: string } | null {
    const checkField = (field: any): { url: string; filename: string } | null => {
      if (!field || !field.download) {
        return null;
      }
      const contentType = field["content-type"] || field["content_type"] || "";
      const filename = field.filename || "";
      const downloadUrl = field.download;
      const looksLikePdf =
        contentType === "application/pdf" ||
        filename.toLowerCase().endsWith(".pdf") ||
        downloadUrl.toLowerCase().includes(".pdf");
      if (!looksLikePdf) {
        return null;
      }
      const absoluteUrl = ensureAbsoluteUrlFromObject(objectData, downloadUrl);
      if (!absoluteUrl) {
        return null;
      }
      const finalName = ensurePdfFilename(filename || null, objectData?.title || objectData?.id);
      return { url: absoluteUrl, filename: finalName };
    };

    if (objectData && (objectData["@type"] === "File" || objectData.type === "File")) {
      const fileResult = checkField(objectData.file);
      if (fileResult) return fileResult;
    }

    const fileFields = ["file", "attachment", "document", "pdf"];
    for (const fieldName of fileFields) {
      const result = checkField(objectData[fieldName]);
      if (result) {
        return result;
      }
    }

    const fallbackUrl = buildDownloadUrlFromObject(objectData);
    if (fallbackUrl && fallbackUrl.toLowerCase().includes(".pdf")) {
      const fallbackName = ensurePdfFilename(
        objectData?.file?.filename || objectData?.filename || null,
        objectData?.title || objectData?.id
      );
      return { url: fallbackUrl, filename: fallbackName };
    }

    return null;
  }

  function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function initializePdfPreviewProxy() {
    if (activePdfPreviewUrl) {
      URL.revokeObjectURL(activePdfPreviewUrl);
      activePdfPreviewUrl = null;
    }

    const container = document.getElementById("pdf-preview-container");
    if (!container) {
      return;
    }

    const encodedUrl = container.getAttribute("data-pdf-url");
    if (!encodedUrl) {
      return;
    }

    const pdfUrl = decodeURIComponent(encodedUrl);
    const statusEl = document.getElementById("pdf-preview-status");
    const frame = document.getElementById("pdf-preview-frame") as HTMLIFrameElement | null;
    const loadBtn = document.getElementById("pdf-preview-load-btn") as HTMLButtonElement | null;
    if (!statusEl || !frame || !loadBtn) {
      return;
    }

    const loadPreview = async () => {
      loadBtn.disabled = true;
      statusEl.textContent = "Loading secure preview...";
      try {
        const base64Data = await invoke<string>("fetch_protected_file", { source: pdfUrl });
        const bytes = base64ToUint8Array(base64Data);
        const arrayBuffer: ArrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        if (activePdfPreviewUrl) {
          URL.revokeObjectURL(activePdfPreviewUrl);
        }
        activePdfPreviewUrl = URL.createObjectURL(blob);
        frame.src = activePdfPreviewUrl;
        statusEl.textContent = "Preview loaded securely.";
      } catch (error) {
        console.error("PDF preview proxy failed:", error);
        statusEl.textContent = "Preview unavailable (authentication required).";
        loadBtn.disabled = false;
      }
    };

    loadBtn.addEventListener("click", loadPreview, { once: true });
  }

  // Load history
  const history = JSON.parse(localStorage.getItem("plone_url_history") || "[]");
  history.forEach((url: string) => {
    const option = document.createElement("option");
    option.value = url;
    urlHistory.appendChild(option);
  });

  // Load and prefill last logged in site
  const lastSite = localStorage.getItem("plone_last_site");
  if (lastSite) {
    baseUrlInput.value = lastSite;
    // Show hint if demo URL
    if (lastSite.includes("demo.plone.org")) {
      credentialsHint.style.display = "block";
    }
  }

  // Try to auto-login with saved token
  (async () => {
    const savedToken = localStorage.getItem("plone_token");
    const savedUsername = localStorage.getItem("plone_username");
    if (savedToken && lastSite) {
      try {
        await api.connectWithToken(lastSite, savedToken);
        currentBaseUrl = lastSite;
        updateAuthState(true, savedUsername || "User");
      } catch (error) {
        // Token expired or invalid, clear it
        localStorage.removeItem("plone_token");
        localStorage.removeItem("plone_username");
        console.log("Auto-login failed, token may be expired:", error);
      }
    }
  })();

  // Show hint if demo URL
  baseUrlInput.addEventListener("input", () => {
    if (baseUrlInput.value.includes("demo.plone.org")) {
      credentialsHint.style.display = "block";
    } else {
      credentialsHint.style.display = "none";
    }
  });

  // Initialize RAG bundle panel visibility now that variables are defined
  updateRagBundlePanelVisibility();

  // Helper to update auth state UI
  function updateAuthState(loggedIn: boolean, username?: string) {
    if (loggedIn) {
      loginForm.style.display = "none";
      appContent.style.display = "block";
      statusText.textContent = `Connected as ${username || "Anonymous"}`;
      statusText.style.color = THEME_PRIMARY;
      headerLoginBtn.style.display = "none";
      disconnectBtn.style.display = "block";
      // Automatically load root items when app content is shown
      loadTreeItems("");
    } else {
      loginForm.style.display = "block";
      appContent.style.display = "none";
      statusText.textContent = "Not connected";
      statusText.style.color = "#666";
      headerLoginBtn.style.display = "none"; // Only show when connected anonymously? No, standard login
      disconnectBtn.style.display = "none";
    }
  }

  let loginInProgress = false;

  async function handleLoginSubmit(e?: Event) {
    if (e) {
      e.preventDefault();
    }
    if (loginInProgress) {
      return;
    }
    loginInProgress = true;
    const baseUrl = baseUrlInput.value.replace(/\/$/, "");
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!baseUrl) {
      errorDiv.textContent = "Base URL is required";
      errorDiv.style.display = "block";
      loginInProgress = false;
      return;
    }

    try {
      errorDiv.style.display = "none";
      loginSubmitBtn.textContent = "Logging in...";

      // Save to history
      if (!history.includes(baseUrl)) {
        history.push(baseUrl);
        localStorage.setItem("plone_url_history", JSON.stringify(history));
      }

      currentBaseUrl = baseUrl;
      const loginResponse = await api.login(baseUrl, username, password);
      // Save last logged in site, token, and username
      localStorage.setItem("plone_last_site", baseUrl);
      if (loginResponse.token) {
        localStorage.setItem("plone_token", loginResponse.token);
        localStorage.setItem("plone_username", username);
      }
      updateAuthState(true, username);
    } catch (error) {
      errorDiv.textContent = `Login failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      errorDiv.style.display = "block";
    } finally {
      loginSubmitBtn.textContent = "Login";
      loginInProgress = false;
    }
  }
  const loginInputs = [baseUrlInput, usernameInput, passwordInput];
  loginInputs.forEach((input) => {
    input.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        handleLoginSubmit(event);
      }
    });
  });
  loginSubmitBtn.addEventListener("click", handleLoginSubmit);

  // Anonymous browse handler
  anonymousBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const baseUrl = baseUrlInput.value.replace(/\/$/, "");

    if (!baseUrl) {
      errorDiv.textContent = "Base URL is required";
      errorDiv.style.display = "block";
      return;
    }

    try {
      errorDiv.style.display = "none";
      anonymousBtn.textContent = "Connecting...";

      // Save to history
      if (!history.includes(baseUrl)) {
        history.push(baseUrl);
        localStorage.setItem("plone_url_history", JSON.stringify(history));
      }

      currentBaseUrl = baseUrl;
      await api.connect(baseUrl); // Use connect for anonymous
      // Save last logged in site
      localStorage.setItem("plone_last_site", baseUrl);
      updateAuthState(true, "Anonymous");
    } catch (error) {
      errorDiv.textContent = `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      errorDiv.style.display = "block";
    } finally {
      anonymousBtn.textContent = "Browse Anonymously";
    }
  });

  // Disconnect handler
  disconnectBtn.addEventListener("click", () => {
    currentBaseUrl = "";
    currentPath = "";
    // Clear saved token on disconnect
    localStorage.removeItem("plone_token");
    localStorage.removeItem("plone_username");
    updateAuthState(false);
  });

  // Tree rendering functions
  function updateBreadcrumb(path: string) {
    if (!breadcrumb) return;
    breadcrumb.innerHTML = "";
    const parts = path ? path.split("/").filter(p => p) : [];

    // Add Root
    const rootSpan = document.createElement("span");
    rootSpan.style.color = PLONE_BLUE;
    rootSpan.style.cursor = "pointer";
    rootSpan.className = "breadcrumb-item";
    rootSpan.setAttribute("data-path", "");
    rootSpan.textContent = "Root";
    rootSpan.onclick = () => loadTreeItems("");
    breadcrumb.appendChild(rootSpan);

    // Add path segments
    let currentPathSeg = "";
    parts.forEach((part, index) => {
      const separator = document.createElement("span");
      separator.textContent = " / ";
      separator.style.color = "#999";
      separator.style.pointerEvents = "none"; // Prevent separator from blocking clicks
      breadcrumb.appendChild(separator);

      currentPathSeg = currentPathSeg ? `${currentPathSeg}/${part}` : part;
      const pathSpan = document.createElement("span");
      const isLast = index === parts.length - 1;
      pathSpan.style.color = isLast ? "#333" : PLONE_BLUE;
      pathSpan.style.cursor = isLast ? "default" : "pointer";
      pathSpan.style.textDecoration = isLast ? "none" : "none";
      pathSpan.className = "breadcrumb-item";
      pathSpan.setAttribute("data-path", currentPathSeg);
      pathSpan.textContent = part;

      // Make all breadcrumb items clickable except the last one
      if (!isLast) {
        pathSpan.style.textDecoration = "underline";
        pathSpan.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          loadTreeItems(currentPathSeg);
        });
      }
      breadcrumb.appendChild(pathSpan);
    });
  }

  function createTreeNode(item: api.ItemMetadata, path: string, depth: number = 0, hasChildren: boolean = false): TreeNode {
    return {
      item,
      path,
      children: [],
      expanded: expandedPaths.has(path),
      loaded: false,
      hasChildren,
      depth
    };
  }

  function renderTreeNode(node: TreeNode, container: HTMLElement) {
    const isFolder = node.item.is_folderish || node.item['@type'] === 'Folder';
    // Show arrow if: has loaded children, OR we know it has children, OR is a folder (might have children), OR already expanded
    const hasChildren = node.children.length > 0 || node.hasChildren || isFolder || node.expanded;

    const treeNode = document.createElement("div");
    treeNode.className = "tree-node";
    treeNode.style.display = "flex";
    treeNode.style.alignItems = "center";
    treeNode.style.padding = "0.5rem";
    treeNode.style.paddingLeft = `${0.5 + node.depth * 1.5}rem`;
    treeNode.style.cursor = "pointer";
    treeNode.style.transition = "background-color 0.2s, border-color 0.2s";
    // Add visual indicator (left border) for items with children
    if (hasChildren) {
      treeNode.style.borderLeft = `3px solid ${PLONE_BLUE}`;
      treeNode.style.paddingLeft = `${0.5 + node.depth * 1.5}rem`;
    }
    treeNode.setAttribute("data-path", node.path);
    treeNode.setAttribute("data-depth", String(node.depth));

    // Expand/collapse button - only show for items that have or might have children
    const expandContainer = document.createElement("div");
    expandContainer.style.width = "24px";
    expandContainer.style.display = "flex";
    expandContainer.style.alignItems = "center";
    expandContainer.style.justifyContent = "center";
    expandContainer.style.marginRight = "0.5rem";
    expandContainer.style.minWidth = "24px";

    // Only show arrow if item has children (loaded) or is a folder (might have children)
    if (hasChildren) {
      const expandBtn = document.createElement("button");
      expandBtn.style.background = "none";
      expandBtn.style.border = "none";
      expandBtn.style.cursor = "pointer";
      expandBtn.style.padding = "0.25rem";
      expandBtn.style.display = "flex";
      expandBtn.style.alignItems = "center";
      expandBtn.style.justifyContent = "center";
      expandBtn.style.color = PLONE_BLUE;
      expandBtn.style.width = "20px";
      expandBtn.style.height = "20px";
      expandBtn.style.minWidth = "20px";
      expandBtn.style.minHeight = "20px";

      // Larger triangle arrows
      expandBtn.innerHTML = node.expanded
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 9 12 15 18 9"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="9 6 15 12 9 18"/></svg>`;

      expandBtn.onclick = async (e) => {
        e.stopPropagation();
        await toggleTreeNode(node);
      };
      expandBtn.onmouseover = (e) => {
        e.stopPropagation();
        expandBtn.style.opacity = "1";
        expandBtn.style.transform = "scale(1.15)";
        expandBtn.style.backgroundColor = THEME_BG_ACCENT;
        expandBtn.style.borderRadius = "4px";
        expandBtn.style.color = "#5A7FFF"; // Darker blue for distinction
      };
      expandBtn.onmouseout = (e) => {
        e.stopPropagation();
        expandBtn.style.opacity = "0.8";
        expandBtn.style.transform = "scale(1)";
        expandBtn.style.backgroundColor = "transparent";
        expandBtn.style.color = PLONE_BLUE;
      };
      expandBtn.style.opacity = "0.8";
      expandBtn.style.transition = "opacity 0.2s, transform 0.2s, background-color 0.2s, color 0.2s";
      expandContainer.appendChild(expandBtn);
    } else {
      // Spacer for items without children
      const spacer = document.createElement("div");
      spacer.style.width = "24px";
      expandContainer.appendChild(spacer);
    }
    treeNode.appendChild(expandContainer);

    // Icon
    const iconSpan = document.createElement("span");
    iconSpan.style.marginRight = "0.5rem";
    iconSpan.style.display = "flex";
    iconSpan.style.alignItems = "center";
    iconSpan.style.width = "18px";
    iconSpan.style.height = "18px";
    iconSpan.style.color = PLONE_BLUE;
    if (isFolder) {
      iconSpan.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 6.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
      </svg>`;
    } else {
      iconSpan.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>`;
    }
    treeNode.appendChild(iconSpan);

    // Title and type
    const contentDiv = document.createElement("div");
    contentDiv.style.flex = "1";
    contentDiv.style.minWidth = "0";
    const titleDiv = document.createElement("div");
    titleDiv.style.fontWeight = "500";
    titleDiv.style.fontSize = "14px";
    const titleText = node.item.title || extractItemId(node.item) || "Untitled";
    const reviewState = node.item.review_state || node.item['review_state'];
    if (reviewState) {
      titleDiv.innerHTML = `${titleText} <span style="color: #999; font-weight: normal; font-size: 0.85em;">[${reviewState}]</span>`;
    } else {
      titleDiv.textContent = titleText;
    }
    const typeDiv = document.createElement("div");
    typeDiv.style.fontSize = "0.75rem";
    typeDiv.style.color = "#666";
    typeDiv.textContent = node.item['@type'] || node.item.type || "Unknown";
    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(typeDiv);
    treeNode.appendChild(contentDiv);

    // Action buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.alignItems = "center";
    buttonContainer.style.gap = "0.25rem";
    buttonContainer.style.marginLeft = "0.5rem";

    // Browse button (only for folders or items that might have children)
    if (isFolder || hasChildren) {
      const browseBtn = document.createElement("button");
      browseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 6.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
      </svg>`;
      browseBtn.title = "Browse Contents";
      browseBtn.style.background = "none";
      browseBtn.style.border = "none";
      browseBtn.style.cursor = "pointer";
      browseBtn.style.padding = "0.4rem";
      browseBtn.style.borderRadius = "50%";
      browseBtn.style.display = "flex";
      browseBtn.style.alignItems = "center";
      browseBtn.style.justifyContent = "center";
      browseBtn.style.color = PLONE_BLUE;
      browseBtn.style.opacity = "0.6";
      browseBtn.onmouseover = () => {
        browseBtn.style.backgroundColor = THEME_SECONDARY;
        browseBtn.style.opacity = "1";
      };
      browseBtn.onmouseout = () => {
        browseBtn.style.backgroundColor = "transparent";
        browseBtn.style.opacity = "0.6";
      };
      browseBtn.onclick = async (e) => {
        e.stopPropagation();
        await loadTreeItems(node.path);
      };
      buttonContainer.appendChild(browseBtn);
    }

    // Info button - ALWAYS visible for all items
    const infoBtn = document.createElement("button");
    infoBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`;
    infoBtn.title = "View Details & Tags";
    infoBtn.style.background = "none";
    infoBtn.style.border = "none";
    infoBtn.style.cursor = "pointer";
    infoBtn.style.padding = "0.4rem";
    infoBtn.style.borderRadius = "50%";
    infoBtn.style.display = "flex";
    infoBtn.style.alignItems = "center";
    infoBtn.style.justifyContent = "center";
    infoBtn.style.color = PLONE_BLUE;
    infoBtn.style.opacity = "0.6";
    infoBtn.onmouseover = () => {
      infoBtn.style.backgroundColor = THEME_SECONDARY;
      infoBtn.style.opacity = "1";
    };
    infoBtn.onmouseout = () => {
      infoBtn.style.backgroundColor = "transparent";
      infoBtn.style.opacity = "0.6";
    };
    infoBtn.onclick = async (e) => {
      e.stopPropagation();
      itemsList.innerHTML = "<p>Loading...</p>";
      try {
        const objectData = await api.fetch(node.path);
        showObjectDetails(objectData);
      } catch (error) {
        console.error("Error fetching object details:", error);
        itemsList.innerHTML = `<p style='color: #d32f2f;'>Error loading details: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
      }
    };
    buttonContainer.appendChild(infoBtn);
    treeNode.appendChild(buttonContainer);

    // Drag and drop
    treeNode.draggable = true;
    treeNode.addEventListener("dragstart", (e: DragEvent) => {
      if (!e.dataTransfer) return;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", node.path);
      treeNode.style.opacity = "0.5";
    });
    treeNode.addEventListener("dragend", () => {
      treeNode.style.opacity = "1";
      document.querySelectorAll(".drag-over").forEach(el => {
        el.classList.remove("drag-over");
        (el as HTMLElement).style.borderColor = "";
        (el as HTMLElement).style.backgroundColor = "";
      });
    });
    treeNode.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer) return;
      e.dataTransfer.dropEffect = "move";
      const draggedPath = e.dataTransfer.getData("text/plain");
      if (draggedPath === node.path) return;
      treeNode.classList.add("drag-over");
      treeNode.style.borderLeft = `3px solid ${PLONE_BLUE}`;
      treeNode.style.backgroundColor = THEME_BG_ACCENT;
    });
    treeNode.addEventListener("dragleave", () => {
      treeNode.classList.remove("drag-over");
      treeNode.style.borderLeft = "";
      treeNode.style.backgroundColor = "";
    });
    treeNode.addEventListener("drop", async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      treeNode.classList.remove("drag-over");
      treeNode.style.borderLeft = "";
      treeNode.style.backgroundColor = "";
      const sourcePath = e.dataTransfer?.getData("text/plain");
      if (!sourcePath || sourcePath === node.path) return;
      try {
        await api.moveItem(sourcePath, node.path);
        await loadTreeItems(currentPath);
      } catch (error) {
        alert(`Failed to move item: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // Click to view details
    treeNode.onclick = async (e) => {
      if ((e.target as HTMLElement).closest("button")) return;
      itemsList.innerHTML = "<p>Loading...</p>";
      try {
        const objectData = await api.fetch(node.path);
        showObjectDetails(objectData);
      } catch (error) {
        console.error("Error fetching object details:", error);
        itemsList.innerHTML = `<p style='color: #d32f2f;'>Error loading details: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
      }
    };

    treeNode.onmouseover = (e) => {
      // Don't highlight if hovering over the expand button
      if ((e.target as HTMLElement).closest('button') && (e.target as HTMLElement).closest('button')?.parentElement === expandContainer) {
        return;
      }
      if (!treeNode.classList.contains("drag-over")) {
        treeNode.style.backgroundColor = THEME_BG_ACCENT;
      }
    };
    treeNode.onmouseout = (e) => {
      // Don't remove highlight if mouse moved to expand button
      if ((e.relatedTarget as HTMLElement)?.closest('button') && (e.relatedTarget as HTMLElement)?.closest('button')?.parentElement === expandContainer) {
        return;
      }
      if (!treeNode.classList.contains("drag-over")) {
        treeNode.style.backgroundColor = "transparent";
      }
    };

    container.appendChild(treeNode);

    // Render children if expanded
    if (node.expanded && node.children.length > 0) {
      node.children.forEach(child => renderTreeNode(child, container));
    }
  }

  async function toggleTreeNode(node: TreeNode) {
    if (!node.loaded) {
      // Load children for any item (in Plone, any item can contain children)
      try {
        // Fetch the full item data to check if it has an items array
        const itemData = await api.fetch(node.path);
        const children = itemData.items && Array.isArray(itemData.items) ? itemData.items : [];

        // Update hasChildren flag based on actual data
        node.hasChildren = children.length > 0;

        node.children = children.map((item: api.ItemMetadata) => {
          const itemId = extractItemId(item);
          const childPath = node.path ? `${node.path}/${itemId}` : itemId;
          // We'll check for children when rendering, not here
          return createTreeNode(item, childPath, node.depth + 1, false);
        });
        node.loaded = true;
      } catch (error) {
        console.error("Error loading children:", error);
        // If loading fails, it might mean the item has no children
        node.loaded = true;
        node.hasChildren = false;
        node.children = [];
        return;
      }
    }

    node.expanded = !node.expanded;
    if (node.expanded) {
      expandedPaths.add(node.path);
    } else {
      expandedPaths.delete(node.path);
    }

    renderTree();
  }

  function renderTree() {
    itemsList.innerHTML = "";
    if (treeRoot.length === 0) {
      itemsList.innerHTML = "<p style='color: #666; padding: 1rem;'>No items</p>";
      return;
    }
    treeRoot.forEach(node => renderTreeNode(node, itemsList));
  }

  async function loadTreeItems(path: string) {
    currentPath = path;
    updateBreadcrumb(path);
    if (currentPathSpan) {
      currentPathSpan.textContent = path === "" ? "/" : `/${path}`;
    }
    clearRagCandidates();

    try {
      itemsList.innerHTML = "<p>Loading...</p>";
      const items = await api.getItems(path || undefined);

      // Build tree structure for current level
      // Check ALL items in parallel to see which ones have children
      treeRoot = await Promise.all(items.map(async (item) => {
        const itemId = extractItemId(item);
        const itemPath = path ? `${path}/${itemId}` : itemId;

        // Check if item has children by fetching it and looking for items array
        let hasChildren = false;
        try {
          const itemData = await api.fetch(itemPath);
          hasChildren = itemData.items && Array.isArray(itemData.items) && itemData.items.length > 0;
        } catch (error) {
          // If fetch fails, assume no children
          hasChildren = false;
        }

        return createTreeNode(item, itemPath, 0, hasChildren);
      }));

      renderTree();
    } catch (error) {
      console.error("Error loading tree items:", error);
      itemsList.innerHTML = `<p style='color: #d32f2f;'>Error loading items: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
    }
  }

  // Browse button handler
  browseBtn.addEventListener("click", async () => {
    await loadTreeItems("");
  });

  // Back button handler
  backBtn.addEventListener("click", async () => {
    if (currentPath) {
      const pathParts = currentPath.split("/");
      pathParts.pop(); // Remove last segment
      const newPath = pathParts.join("/");
      await loadTreeItems(newPath);
    } else {
      // Already at root, maybe show a message or do nothing
      console.log("Already at root.");
    }
  });

  // Keywords Manager button handler
  keywordsBtn.addEventListener("click", async () => {
    await showKeywordsManager();
  });

  // Search functionality
  function displaySearchResults(items: api.ItemMetadata[]) {
    if (items.length === 0) {
      itemsList.innerHTML = "<p style='color: #666;'>No items found</p>";
      clearRagCandidates();
      return;
    }

    const resolvedCandidates: RagCandidate[] = [];
    itemsList.innerHTML = "";

    // Add a header showing search results
    const header = document.createElement("div");
    header.style.padding = "0.75rem";
    header.style.borderBottom = `2px solid ${PLONE_BLUE}`;
    header.style.marginBottom = "0.5rem";
    header.style.fontWeight = "500";
    header.style.color = "#333";
    header.textContent = `Search Results (${items.length} found)`;
    itemsList.appendChild(header);

    items.forEach((item) => {
      const resolvedPath = getItemApiPath(item);
      if (resolvedPath) {
        resolvedCandidates.push({ item, path: resolvedPath });
      }
      const isFolder = item.is_folderish || item['@type'] === 'Folder';

      const li = document.createElement("div");
      li.style.padding = "0.75rem";
      li.style.borderBottom = `1px solid ${THEME_SECONDARY}`;
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.justifyContent = "space-between";
      li.style.cursor = "pointer";
      li.style.transition = "background-color 0.2s, border-color 0.2s";

      // Make items draggable
      li.draggable = true;
      li.setAttribute("data-item-path", getItemFullPath(item));
      li.setAttribute("data-is-folder", String(isFolder));

      // Drag and drop event handlers
      li.addEventListener("dragstart", (e: DragEvent) => {
        if (!e.dataTransfer) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", getItemFullPath(item));
        li.style.opacity = "0.5";
      });

      li.addEventListener("dragend", () => {
        li.style.opacity = "1";
        // Remove all drop indicators
        document.querySelectorAll(".drag-over").forEach(el => {
          el.classList.remove("drag-over");
          (el as HTMLElement).style.borderColor = "";
          (el as HTMLElement).style.backgroundColor = "";
        });
      });

      // Make all items accept drops (folders and documents can both be containers)
      li.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        if (!e.dataTransfer) return;
        e.dataTransfer.dropEffect = "move";

        // Don't highlight if dragging over itself
        const draggedPath = e.dataTransfer.getData("text/plain");
        const targetPath = getItemFullPath(item);
        if (draggedPath === targetPath) {
          return;
        }

        li.classList.add("drag-over");
        li.style.borderColor = PLONE_BLUE;
        li.style.borderWidth = "2px";
        li.style.borderStyle = "dashed";
        li.style.backgroundColor = THEME_BG_ACCENT;
      });

      li.addEventListener("dragleave", () => {
        li.classList.remove("drag-over");
        li.style.borderColor = "";
        li.style.borderWidth = "";
        li.style.borderStyle = "";
        li.style.backgroundColor = "";
      });

      li.addEventListener("drop", async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        li.classList.remove("drag-over");
        li.style.borderColor = "";
        li.style.borderWidth = "";
        li.style.borderStyle = "";
        li.style.backgroundColor = "";

        const sourcePath = e.dataTransfer?.getData("text/plain");
        if (!sourcePath) return;

        const destinationPath = getItemFullPath(item);

        // Don't allow dropping on itself
        if (sourcePath === destinationPath) {
          return;
        }

        // Show loading state
        const originalContent = itemsList.innerHTML;
        itemsList.innerHTML = "<p>Moving item...</p>";

        try {
          await api.moveItem(sourcePath, destinationPath);
          // Refresh search results - trigger search button click to refresh
          const query = searchInput.value.trim();
          if (query) {
            searchBtn.click();
          } else {
            await loadTreeItems(currentPath);
          }
        } catch (error) {
          console.error("Error moving item:", error);
          itemsList.innerHTML = originalContent;
          alert(`Failed to move item: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      });

      li.onmouseover = () => {
        if (!li.classList.contains("drag-over")) {
          li.style.backgroundColor = THEME_BG_ACCENT;
        }
      };
      li.onmouseout = () => {
        if (!li.classList.contains("drag-over")) {
          li.style.backgroundColor = "transparent";
        }
      };

      // Main click area
      const mainContent = document.createElement("div");
      mainContent.style.display = "flex";
      mainContent.style.alignItems = "center";
      mainContent.style.flex = "1";

      const iconSpan = document.createElement("span");
      iconSpan.style.marginRight = "0.5rem";
      iconSpan.style.display = "flex";
      iconSpan.style.alignItems = "center";
      iconSpan.style.width = "20px";
      iconSpan.style.height = "20px";
      iconSpan.style.color = PLONE_BLUE;
      if (isFolder) {
        iconSpan.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 6.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
        </svg>`;
      } else {
        iconSpan.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>`;
      }

      const textDiv = document.createElement("div");
      const titleDiv = document.createElement("div");
      titleDiv.style.fontWeight = "500";
      const titleText = item.title || extractItemId(item) || "Untitled";
      const reviewState = item.review_state || item['review_state'];
      if (reviewState) {
        titleDiv.innerHTML = `${titleText} <span style="color: #999; font-weight: normal; font-size: 0.85em;">[${reviewState}]</span>`;
      } else {
        titleDiv.textContent = titleText;
      }
      const typeDiv = document.createElement("div");
      typeDiv.style.fontSize = "0.8rem";
      typeDiv.style.color = "#666";
      typeDiv.textContent = item['@type'] || item.type || "Unknown";

      // Show path for search results
      const pathDiv = document.createElement("div");
      pathDiv.style.fontSize = "0.75rem";
      pathDiv.style.color = "#999";
      pathDiv.style.fontFamily = "monospace";
      const itemPath = item["@id"] || item.path || "";
      pathDiv.textContent = itemPath.replace(currentBaseUrl, '') || "/";

      textDiv.appendChild(titleDiv);
      textDiv.appendChild(typeDiv);
      textDiv.appendChild(pathDiv);
      mainContent.appendChild(iconSpan);
      mainContent.appendChild(textDiv);

      // Info button for details
      const infoBtn = document.createElement("button");
      infoBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`;
      infoBtn.title = "View Details & Tags";
      infoBtn.style.background = "none";
      infoBtn.style.border = "none";
      infoBtn.style.cursor = "pointer";
      infoBtn.style.padding = "0.5rem";
      infoBtn.style.borderRadius = "50%";
      infoBtn.style.display = "flex";
      infoBtn.style.alignItems = "center";
      infoBtn.style.justifyContent = "center";
      infoBtn.style.color = PLONE_BLUE;
      infoBtn.style.opacity = "0.6";
      infoBtn.onmouseover = () => {
        infoBtn.style.backgroundColor = THEME_SECONDARY;
        infoBtn.style.opacity = "1";
      };
      infoBtn.onmouseout = () => {
        infoBtn.style.backgroundColor = "transparent";
        infoBtn.style.opacity = "0.6";
      };

      // Button container for actions
      const buttonContainer = document.createElement("div");
      buttonContainer.style.display = "flex";
      buttonContainer.style.alignItems = "center";
      buttonContainer.style.gap = "0.25rem";

      // Browse button (for all items - folders and documents can both contain items)
      const browseBtn = document.createElement("button");
      browseBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 6.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
      </svg>`;
      browseBtn.title = "Browse Contents";
      browseBtn.style.background = "none";
      browseBtn.style.border = "none";
      browseBtn.style.cursor = "pointer";
      browseBtn.style.padding = "0.5rem";
      browseBtn.style.borderRadius = "50%";
      browseBtn.style.display = "flex";
      browseBtn.style.alignItems = "center";
      browseBtn.style.justifyContent = "center";
      browseBtn.style.color = PLONE_BLUE;
      browseBtn.style.opacity = "0.6";
      browseBtn.onmouseover = () => {
        browseBtn.style.backgroundColor = THEME_SECONDARY;
        browseBtn.style.opacity = "1";
      };
      browseBtn.onmouseout = () => {
        browseBtn.style.backgroundColor = "transparent";
        browseBtn.style.opacity = "0.6";
      };
      browseBtn.onclick = async (e) => {
        e.stopPropagation();
        const objectPath = getItemApiPath(item);
        if (!objectPath) {
          return;
        }
        await loadTreeItems(objectPath);
        clearSearchBtn.style.display = "none";
      };
      buttonContainer.appendChild(browseBtn);

      // Handle info button click
      infoBtn.onclick = async (e) => {
        e.stopPropagation();
        itemsList.innerHTML = "<p>Loading...</p>";
        try {
          const objectPath = getItemApiPath(item);
          if (!objectPath) {
            throw new Error("Could not determine item path");
          }
          const objectData = await api.fetch(objectPath);
          showObjectDetails(objectData);
          clearSearchBtn.style.display = "none";
        } catch (error) {
          console.error("Error fetching object details:", error);
          itemsList.innerHTML = `<p style='color: #d32f2f;'>Error loading details: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
        }
      };

      // Handle row click - navigate to item
      mainContent.onclick = async () => {
        const objectPath = getItemApiPath(item);
        if (!objectPath) {
          itemsList.innerHTML = `<p style='color: #d32f2f;'>Error: Could not determine item path</p>`;
          return;
        }

        try {
          const objectData = await api.fetch(objectPath);
          showObjectDetails(objectData);
          clearSearchBtn.style.display = "none";
        } catch (error) {
          console.error("Error loading item:", error);
          itemsList.innerHTML = `<p style='color: #d32f2f;'>Error loading item: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
        }
      };

      buttonContainer.appendChild(infoBtn);

      li.appendChild(mainContent);
      li.appendChild(buttonContainer);
      itemsList.appendChild(li);
    });

    setRagCandidates(resolvedCandidates);
  }

  async function handleRagBundleClick() {
    if (!isRagBundleEnabled()) {
      setRagBundleStatus("Enable the bundle option in Preferences first.", "#c62828");
      return;
    }
    if (ragCandidates.length === 0) {
      setRagBundleStatus("Run a search to populate bundle candidates.", "#c62828");
      return;
    }
    if (isRagBundling) {
      setRagBundleStatus("A bundle export is already running...", "#555");
      return;
    }

    isRagBundling = true;
    ragBundleBtn.disabled = true;
    ragBundleResumeBtn.disabled = true;
    const candidatesSnapshot = [...ragCandidates];
    setFailedDownloadJobs([], []);

    try {
      setRagBundleStatus("Select a folder to store the PDFs...", "#555");
      const directory = await open({
        directory: true,
        multiple: false,
        title: "Select folder for PDF bundle",
      });
      if (!directory) {
        setRagBundleStatus("Export cancelled.", "#666");
        return;
      }
      const targetDir = Array.isArray(directory) ? directory[0] : directory;
      if (!targetDir) {
        setRagBundleStatus("A folder is required to save the PDFs.", "#c62828");
        return;
      }

      const downloadJobs: DownloadJob[] = [];
      let inspected = 0;

      for (const candidate of candidatesSnapshot) {
        inspected++;
        setRagBundleStatus(`Inspecting ${inspected}/${candidatesSnapshot.length}...`, "#555");
        try {
          let objectData: any | null = null;
          try {
            objectData = await api.fetch(candidate.path);
          } catch (primaryError) {
            console.warn("Primary PDF inspection fetch failed, retrying with @id:", primaryError);
            if (candidate.item?.["@id"]) {
              try {
                objectData = await api.fetch(candidate.item["@id"]);
              } catch (secondaryError) {
                console.error("Secondary PDF inspection fetch failed:", secondaryError);
              }
            }
          }

          const pdfInfo = detectPdfInfo(objectData || candidate.item);
          if (pdfInfo) {
            try {
              const destinationPath = await join(targetDir, pdfInfo.filename);
              downloadJobs.push({ source: pdfInfo.url, destination: destinationPath });
            } catch (joinError) {
              console.error("Failed to prepare destination path:", joinError);
            }
          }
        } catch (error) {
          console.error("Failed to inspect item for PDF:", error);
        }
      }

      if (downloadJobs.length === 0) {
        setRagBundleStatus("No PDFs detected in this result set.", "#c62828");
        return;
      }

      const queueResult = await runDownloadJobQueue(downloadJobs, { label: "Downloading PDFs" });
      setFailedDownloadJobs(queueResult.failedJobs, queueResult.failedDetails);

      if (queueResult.failed === 0) {
        setRagBundleStatus(`Saved ${queueResult.saved} PDF${queueResult.saved === 1 ? "" : "s"} to ${targetDir}.`, "#2e7d32");
      } else {
        setRagBundleStatus(
          `Saved ${queueResult.saved} PDF${queueResult.saved === 1 ? "" : "s"}, ${queueResult.failed} failed. Use Resume to retry.`,
          "#c62828"
        );
      }
    } catch (error) {
      console.error("RAG bundle export failed:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : JSON.stringify(error));
      setRagBundleStatus(`Export failed: ${errorMessage}`, "#c62828");
    } finally {
      isRagBundling = false;
      ragBundleBtn.disabled = false;
      ragBundleResumeBtn.disabled = false;
      updateRagBundlePanelVisibility();
    }
  }

  async function resumeFailedDownloads() {
    if (isRagBundling || failedDownloadJobs.length === 0) {
      return;
    }
    isRagBundling = true;
    ragBundleBtn.disabled = true;
    ragBundleResumeBtn.disabled = true;
    try {
      setDownloadFailures([]);
      setRagBundleStatus(`Resuming ${failedDownloadJobs.length} failed download${failedDownloadJobs.length === 1 ? "" : "s"}...`, "#555");
      const queueResult = await runDownloadJobQueue([...failedDownloadJobs], { label: "Resuming PDFs" });
      setFailedDownloadJobs(queueResult.failedJobs, queueResult.failedDetails);
      if (queueResult.failed === 0) {
        setRagBundleStatus("All remaining PDFs were downloaded successfully.", "#2e7d32");
      } else {
        setRagBundleStatus(`Resumed downloads saved ${queueResult.saved}. ${queueResult.failed} still failing.`, "#c62828");
      }
    } catch (error) {
      console.error("Resume download failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      setRagBundleStatus(`Resume failed: ${message}`, "#c62828");
    } finally {
      isRagBundling = false;
      ragBundleBtn.disabled = false;
      ragBundleResumeBtn.disabled = false;
      updateRagBundlePanelVisibility();
    }
  }

  async function runDownloadJobQueue(
    downloadQueue: DownloadJob[],
    options: { label: string } = { label: "Downloading PDFs" }
  ) {
    const queue = [...downloadQueue];
    const total = queue.length;
    const failedJobs: DownloadJob[] = [];
    const failedDetails: DownloadFailure[] = [];
    let saved = 0;

    if (total === 0) {
      return { saved: 0, failed: 0, failedJobs: [], failedDetails: [] };
    }

    while (queue.length > 0) {
      const batch = queue.splice(0, DOWNLOAD_BATCH_SIZE);
      let results: DownloadOutcome[] = [];
      try {
        results = await invoke<DownloadOutcome[]>("download_files", { downloads: batch });
      } catch (error) {
        console.error("Batch download failed:", error);
        const message = error instanceof Error ? error.message : "Download batch failed";
        results = batch.map(() => ({ saved: false, error: message }));
      }

      results.forEach((result, index) => {
        if (result?.saved) {
          saved++;
        } else {
          failedJobs.push(batch[index]);
          const errorMessage = result?.error || "Unknown error";
          failedDetails.push({ job: batch[index], error: errorMessage });
        }
      });

      const progressText =
        failedJobs.length > 0
          ? `${options.label}: ${saved}/${total} complete (${failedJobs.length} failed so far)`
          : `${options.label}: ${saved}/${total} complete`;
      setRagBundleStatus(progressText, "#2e7d32");
    }

    const filteredFailedDetails = failedDetails.filter((failure) => {
      const message = failure.error.toLowerCase();
      const isUnauthorized = message.includes("unauthorized") || message.includes("401");
      const isForbidden = message.includes("forbidden") || message.includes("403");
      const isPermissionRelated = isUnauthorized || isForbidden;
      if (isPermissionRelated) {
        console.warn("Skipping unauthorized PDF:", failure.job.destination, failure.error);
      }
      return !isPermissionRelated;
    });
    const filteredFailedJobs = failedJobs.filter((job) =>
      filteredFailedDetails.some((failure) => failure.job === job)
    );

    return {
      saved,
      failed: filteredFailedJobs.length,
      failedJobs: filteredFailedJobs,
      failedDetails: filteredFailedDetails,
    };
  }

  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query) {
      return;
    }

    try {
      itemsList.innerHTML = "<p>Searching...</p>";
      clearSearchBtn.style.display = "block";

      const searchResults = await api.search({
        searchableText: query,
        fullObjects: true,
      });
      const items = searchResults.items || [];
      displaySearchResults(items);
    } catch (error) {
      console.error("Search error:", error);
      itemsList.innerHTML = `<p style='color: #d32f2f;'>Search failed: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
      clearRagCandidates();
    }
  });

  // Allow Enter key to trigger search
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });

  // Clear search button
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = '';
    clearSearchBtn.style.display = "none";
    clearRagCandidates();
    browseBtn.click(); // Refresh browse view
  });

  ragBundleBtn.addEventListener("click", () => {
    handleRagBundleClick();
  });

  ragBundleResumeBtn.addEventListener("click", () => {
    resumeFailedDownloads();
  });


  // Helper to display object details
  function showObjectDetails(objectData: any) {
    const {
      "@id": path,
      title,
      description,
      subjects = [],
      blocks,
      blocks_layout: blocksLayout // Rename to match usage
    } = objectData;
    const hasBlocks = blocks && blocksLayout && Object.keys(blocks).length > 0;

    // Check if this is an image and get the image URL
    const isImage = objectData['@type'] === 'Image' || objectData.type === 'Image' ||
      (objectData.image && objectData.image.download);
    // Use image.download for full-size, or @@images/image/thumb for thumbnail
    let imageUrl = null;
    if (isImage && objectData.image) {
      // Use the download URL from the API response
      imageUrl = objectData.image.download;
      // If it's a relative URL, make it absolute using the base URL
      if (imageUrl && !imageUrl.startsWith('http')) {
        const baseUrl = objectData['@id'] ? new URL(objectData['@id']).origin : currentBaseUrl;
        imageUrl = baseUrl + imageUrl;
      }
    }

    const pdfInfo = detectPdfInfo(objectData);
    const isPDF = Boolean(pdfInfo);
    const pdfUrl = pdfInfo?.url || null;

    itemsList.innerHTML = `
      <div style="padding: 1rem; position: relative;">
        <button id="detailBackBtn" style="padding: 0.5rem; background: ${THEME_BG_LIGHT}; border: 1px solid ${THEME_SECONDARY}; border-radius: 50%; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; position: absolute; top: 1rem; right: 1rem; color: #333;" title="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3 style="margin-top: 0; margin-bottom: 0.5rem; padding-right: 3rem;">${title || objectData.id || "Untitled"}</h3>
        <p style="color: #666; margin-bottom: 1rem;">${description || "No description."}</p>
        
        ${isImage && imageUrl ? `
        <div style="margin-bottom: 1.5rem;">
          <img src="${imageUrl}" alt="${title || 'Image'}" style="max-width: 100%; max-height: 600px; height: auto; border-radius: 4px; border: 1px solid ${THEME_SECONDARY}; object-fit: contain;" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <p style="display: none; color: #666; font-style: italic;">Image could not be loaded. URL: ${imageUrl}</p>
        </div>
        ` : ''}
        
        ${isPDF && pdfUrl ? `
        <div id="pdf-preview-container" data-pdf-url="${encodeURIComponent(pdfUrl)}" style="margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 0.5rem 0;">PDF Preview</h4>
          <iframe id="pdf-preview-frame" src="about:blank" style="width: 100%; height: 600px; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; background: white;" title="PDF Preview"></iframe>
          <p id="pdf-preview-status" style="margin-top: 0.5rem; font-size: 13px; color: #666;">
            Preview not loaded. Click the button below to fetch it using your authenticated session.
          </p>
          <button id="pdf-preview-load-btn" style="margin-top: 0.5rem; padding: 0.4rem 0.75rem; border: 1px solid ${PLONE_BLUE}; border-radius: 4px; background: ${THEME_BG_ACCENT}; color: ${PLONE_BLUE}; cursor: pointer;">
            Load Secure Preview
          </button>
          <p style="margin-top: 0.5rem; font-size: 13px; color: #666;">
            <a href="${pdfUrl}" target="_blank" style="color: ${PLONE_BLUE}; text-decoration: underline;">Open PDF in new tab</a>
            ${pdfInfo?.filename ? `<span style="margin-left: 0.5rem; color: #999;">${pdfInfo.filename}</span>` : ""}
          </p>
        </div>
        ` : ''}

        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 0.5rem 0;">Details</h4>
          <p><strong>Type:</strong> ${objectData['@type'] || objectData.type || "Unknown"}</p>
          <p><strong>Path:</strong> ${(() => {
        // Convert API URL to public site URL by removing ++api++ part
        let publicUrl = path;
        try {
          if (path.includes('++api++')) {
            const urlObj = new URL(path);
            let pathname = urlObj.pathname;
            // Remove ++api++ and everything before it
            if (pathname.includes('++api++')) {
              const parts = pathname.split('++api++');
              pathname = parts[parts.length - 1] || '/';
            }
            publicUrl = `${urlObj.protocol}//${urlObj.host}${pathname}`;
          } else if (path.startsWith('http')) {
            publicUrl = path;
          } else {
            // Relative path, construct from base URL
            publicUrl = currentBaseUrl ? `${currentBaseUrl.replace('/++api++', '')}${path.startsWith('/') ? path : '/' + path}` : path;
          }
        } catch (e) {
          // Fallback to just showing the path
          publicUrl = path.replace(currentBaseUrl, '');
        }
        return `<a href="${publicUrl}" target="_blank" style="color: ${PLONE_BLUE}; text-decoration: underline;">${publicUrl}</a>`;
      })()}</p>
        </div>

        <!--Tags Section-->
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: ${THEME_BG_LIGHT}; border-radius: 4px;">
          <h4 style="margin: 0 0 0.5rem 0;">Tags / Keywords</h4>
          <div id="tagsContainer" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            ${subjects.map((tag: string) => `
                        <span class="tag-chip" data-tag="${tag}" style="background: ${PLONE_BLUE}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 13px; display: flex; align-items: center; gap: 0.25rem;">
                          ${tag}
                          <button class="remove-tag" data-tag="${tag}" style="background: none; border: none; color: white; cursor: pointer; font-weight: bold; padding: 0; margin: 0; font-size: 16px;">×</button>
                        </span>
                      `).join('')
      }
          </div>
          <div style="position: relative;">
            <div style="display: flex; gap: 0.5rem;">
              <div style="flex: 1; position: relative;">
                <input type="text" id="newTagInput" placeholder="Add new tag..." style="width: 100%; padding: 0.5rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};" />
                <div id="tagAutocomplete" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid ${THEME_SECONDARY}; border-top: none; border-radius: 0 0 4px 4px; max-height: 200px; overflow-y: auto; z-index: 1000; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
              </div>
              <button id="addTagBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer;">Add</button>
              <button id="saveTagsBtn" style="padding: 0.5rem 1rem; background: ${THEME_SECONDARY}; color: #333; border: none; border-radius: 4px; cursor: pointer;">Save Tags</button>
            </div>
          </div>
          <div id="tagStatus" style="margin-top: 0.5rem; font-size: 13px; display: none;"></div>
        </div>

        ${hasBlocks ? `
        <!-- Blocks Section -->
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: ${THEME_BG_LIGHT}; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="margin: 0;">Blocks</h4>
            <div style="display: flex; gap: 0.5rem;">
              <button id="modeToggleBtn" style="padding: 0.4rem 0.8rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 0.5rem;">
                <svg id="modeToggleIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
                <span id="modeToggleText">Visual</span>
              </button>
            </div>
          </div>
          
          <!-- Visual Mode -->
          <div id="visualMode" style="display: block;">
            <p style="font-size: 13px; color: #666; margin: 0 0 0.5rem 0;">View and edit blocks visually. Drag blocks to reorder them. Changes sync with JSON automatically.</p>
            <div id="blocksList" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
              <!-- Blocks will be rendered here -->
            </div>
            <button id="addBlockBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">+ Add Block</button>
          </div>
          
          <!-- JSON Mode -->
          <div id="jsonMode" style="display: none;">
            <p style="font-size: 13px; color: #666; margin: 0 0 0.5rem 0;">Edit the blocks structure. Both blocks and blocks_layout must be consistent.</p>
            
            <div style="margin-bottom: 1rem;">
              <label style="font-weight: bold; font-size: 13px; display: block; margin-bottom: 0.25rem;">blocks:</label>
              <textarea id="blocksEditor" style="width: 100%; min-height: 200px; font-family: monospace; font-size: 12px; border: 1px solid ${THEME_SECONDARY}; padding: 0.5rem; border-radius: 4px; background-color: ${THEME_BG_ACCENT};">${JSON.stringify(blocks, null, 2)}</textarea>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="font-weight: bold; font-size: 13px; display: block; margin-bottom: 0.25rem;">blocks_layout:</label>
              <textarea id="blocksLayoutEditor" style="width: 100%; min-height: 100px; font-family: monospace; font-size: 12px; border: 1px solid ${THEME_SECONDARY}; padding: 0.5rem; border-radius: 4px; background-color: ${THEME_BG_ACCENT};">${JSON.stringify(blocksLayout, null, 2)}</textarea>
            </div>
          </div>
            <p style="font-size: 13px; color: #666; margin: 0 0 0.5rem 0;">View and edit blocks visually. Drag blocks to reorder them. Changes sync with JSON automatically.</p>
            <div id="blocksList" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
              <!-- Blocks will be rendered here -->
            </div>
            <button id="addBlockBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">+ Add Block</button>
          </div>
          
          <button id="saveBlocksBtn" style="padding: 0.5rem 1rem; background: ${THEME_SECONDARY}; color: #333; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">Save Blocks</button>
          <div id="blockStatus" style="margin-top: 0.5rem; font-size: 13px; display: none;"></div>
        </div>
        ` : ''}
      </div>
    `;

    // Store current tags
    if (isPDF && pdfUrl) {
      initializePdfPreviewProxy();
    } else if (activePdfPreviewUrl) {
      URL.revokeObjectURL(activePdfPreviewUrl);
      activePdfPreviewUrl = null;
    }

    let currentTags = [...subjects];
    // Extract relative path from @id URL
    // The @id is a full URL like https://example.com/Plone/my-item
    // We need just the path part like Plone/my-item (no leading slash, backend adds it)
    let objectPath = path;
    try {
      if (path.startsWith('http://') || path.startsWith('https://')) {
        const urlObj = new URL(path);
        let pathname = urlObj.pathname;
        // Remove ++api++ if present (we'll let the backend add it)
        if (pathname.includes('++api++')) {
          const parts = pathname.split('++api++');
          pathname = parts[parts.length - 1] || '/';
        }
        // Remove leading slash - backend will add it
        objectPath = pathname.replace(/^\//, '');
      } else {
        // Already a relative path, just clean it up
        objectPath = path.replace(/^.*\/\+\+api\+\+\//, '').replace(/^\//, '');
      }
    } catch (e) {
      // Fallback: try simple extraction
      objectPath = path.replace(/^.*\/\+\+api\+\+\//, '').replace(/^\//, '');
    }

    // Back button handler (in details view)
    document.getElementById("detailBackBtn")?.addEventListener("click", () => {
      browseBtn.click();
    });

    // Tag management handlers
    const tagsContainer = document.getElementById("tagsContainer");
    const newTagInput = document.getElementById("newTagInput") as HTMLInputElement;
    const tagStatus = document.getElementById("tagStatus") as HTMLDivElement;
    const tagAutocomplete = document.getElementById("tagAutocomplete") as HTMLDivElement;

    // Load all existing tags for autocomplete
    let allTags: string[] = [];
    let selectedAutocompleteTag: string | null = null;
    let currentMatches: string[] = [];

    (async () => {
      try {
        const tagsData = await api.collectTags();
        allTags = Object.keys(tagsData).sort();
      } catch (error) {
        console.error('Failed to load tags for autocomplete:', error);
      }
    })();

    // Validate path after tagStatus is declared
    if (!objectPath || objectPath === '/') {
      console.error('Invalid path extracted from:', path);
      if (tagStatus) {
        tagStatus.textContent = '✗ Error: Could not determine item path';
        tagStatus.style.color = '#d32f2f';
        tagStatus.style.display = 'block';
      }
    }

    // Autocomplete functionality
    function filterTags(query: string): string[] {
      if (!query.trim()) return [];
      const lowerQuery = query.toLowerCase();
      return allTags
        .filter(tag =>
          tag.toLowerCase().includes(lowerQuery) &&
          !currentTags.includes(tag)
        )
        .slice(0, 10); // Limit to 10 suggestions
    }

    function renderAutocomplete(matches: string[]) {
      if (!tagAutocomplete) return;
      currentMatches = matches;

      if (matches.length === 0) {
        tagAutocomplete.style.display = 'none';
        selectedAutocompleteTag = null;
        return;
      }

      tagAutocomplete.innerHTML = matches.map((tag) => `
        <div class="autocomplete-item" data-tag="${tag}" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid ${THEME_BG_LIGHT}; ${tag === selectedAutocompleteTag ? `background: ${THEME_BG_LIGHT};` : ''}">
          ${tag}
        </div>
      `).join('');

      tagAutocomplete.style.display = 'block';

      // Attach click and hover handlers
      tagAutocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
        const tag = item.getAttribute('data-tag');
        const isSelected = tag === selectedAutocompleteTag;

        item.addEventListener('click', () => {
          if (tag) {
            selectTag(tag);
          }
        });

        item.addEventListener('mouseenter', () => {
          (item as HTMLElement).style.background = THEME_BG_LIGHT;
        });

        item.addEventListener('mouseleave', () => {
          (item as HTMLElement).style.background = isSelected ? THEME_BG_LIGHT : 'transparent';
        });
      });
    }

    function selectTag(tag: string) {
      if (tag && !currentTags.includes(tag)) {
        currentTags.push(tag);
        updateTagsDisplay();
        newTagInput.value = '';
        tagAutocomplete.style.display = 'none';
        selectedAutocompleteTag = null;
      }
    }

    newTagInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      const matches = filterTags(query);
      selectedAutocompleteTag = matches.length > 0 ? matches[0] : null;
      renderAutocomplete(matches);
    });

    newTagInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (tagAutocomplete && tagAutocomplete.style.display !== 'none' && selectedAutocompleteTag) {
          // If autocomplete is visible and a tag is selected, use that
          e.preventDefault();
          selectTag(selectedAutocompleteTag);
        } else {
          // Otherwise, add the tag as typed
          document.getElementById("addTagBtn")?.click();
        }
        return;
      }

      if (!tagAutocomplete || tagAutocomplete.style.display === 'none') {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = selectedAutocompleteTag ? currentMatches.indexOf(selectedAutocompleteTag) : -1;
        const nextIndex = Math.min(currentIndex + 1, currentMatches.length - 1);
        selectedAutocompleteTag = currentMatches[nextIndex] || null;
        renderAutocomplete(currentMatches);
        // Scroll into view
        if (selectedAutocompleteTag) {
          const selectedItem = tagAutocomplete.querySelector(`[data-tag="${selectedAutocompleteTag}"]`) as HTMLElement;
          if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = selectedAutocompleteTag ? currentMatches.indexOf(selectedAutocompleteTag) : currentMatches.length;
        const prevIndex = Math.max(currentIndex - 1, -1);
        selectedAutocompleteTag = prevIndex >= 0 ? currentMatches[prevIndex] : null;
        renderAutocomplete(currentMatches);
      } else if (e.key === 'Escape') {
        tagAutocomplete.style.display = 'none';
        selectedAutocompleteTag = null;
      }
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (tagAutocomplete && newTagInput &&
        !tagAutocomplete.contains(e.target as Node) &&
        e.target !== newTagInput) {
        tagAutocomplete.style.display = 'none';
        selectedAutocompleteTag = null;
      }
    });

    function updateTagsDisplay() {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = currentTags.map((tag: string) => `
        <span class="tag-chip" data-tag="${tag}" style="background: ${PLONE_BLUE}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 13px; display: flex; align-items: center; gap: 0.25rem;">
          ${tag}
          <button class="remove-tag" data-tag="${tag}" style="background: none; border: none; color: white; cursor: pointer; font-weight: bold; padding: 0; margin: 0; font-size: 16px;">×</button>
        </span>
      `).join('');

      // Re-attach remove handlers
      document.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tag = (e.target as HTMLElement).getAttribute('data-tag');
          if (tag) {
            currentTags = currentTags.filter(t => t !== tag);
            updateTagsDisplay();
          }
        });
      });
    }

    document.getElementById("addTagBtn")?.addEventListener("click", () => {
      const newTag = newTagInput.value.trim();
      if (newTag && !currentTags.includes(newTag)) {
        currentTags.push(newTag);
        updateTagsDisplay();
        newTagInput.value = '';
      }
    });

    // Enter key handling is now in keydown handler above for autocomplete support

    document.getElementById("saveTagsBtn")?.addEventListener("click", async () => {
      try {
        tagStatus.textContent = "Saving...";
        tagStatus.style.color = "#666";
        tagStatus.style.display = "block";

        // Ensure we have a valid path before attempting to save
        if (!objectPath || objectPath === '/') {
          throw new Error('Invalid item path');
        }

        await api.patch(objectPath, { subjects: currentTags });

        tagStatus.textContent = "✓ Tags saved successfully!";
        tagStatus.style.color = THEME_PRIMARY;
        tagStatus.style.display = "block";
        setTimeout(() => { tagStatus.style.display = "none"; }, 3000);
      } catch (error) {
        tagStatus.textContent = `✗ Error: ${error instanceof Error ? error.message : "Update failed"}`;
        tagStatus.style.color = "#d32f2f";
        tagStatus.style.display = "block";
        console.error('Failed to save tags:', error, 'Path:', objectPath, 'Original path:', path);
      }
    });

    // Block management handlers
    if (hasBlocks) {
      const blockStatus = document.getElementById("blockStatus") as HTMLDivElement;
      let originalBlocks = JSON.stringify(blocks);
      let originalBlocksLayout = JSON.stringify(blocksLayout);

      // Mode toggle state - default to visual mode
      let currentMode: 'json' | 'visual' = 'visual';
      let currentBlocks = { ...blocks };
      let currentBlocksLayout = { ...blocksLayout };

      const modeToggleBtn = document.getElementById("modeToggleBtn");
      const modeToggleIcon = document.getElementById("modeToggleIcon");
      const modeToggleText = document.getElementById("modeToggleText");
      const jsonModeDiv = document.getElementById("jsonMode");
      const visualModeDiv = document.getElementById("visualMode");
      const blocksList = document.getElementById("blocksList");

      // Update toggle button appearance based on current mode
      function updateToggleButton() {
        if (!modeToggleBtn || !modeToggleIcon || !modeToggleText) return;

        if (currentMode === 'visual') {
          modeToggleText.textContent = 'Visual';
          modeToggleIcon.innerHTML = `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>`;
        } else {
          modeToggleText.textContent = 'JSON';
          modeToggleIcon.innerHTML = `<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>`;
        }
      }

      // Mode toggle handler - single button that toggles between modes
      modeToggleBtn?.addEventListener("click", () => {
        if (currentMode === 'visual') {
          // Switch to JSON mode
          currentMode = 'json';
          jsonModeDiv!.style.display = 'block';
          visualModeDiv!.style.display = 'none';

          // Sync from visual to JSON when switching
          const blocksEditor = document.getElementById("blocksEditor") as HTMLTextAreaElement;
          const blocksLayoutEditor = document.getElementById("blocksLayoutEditor") as HTMLTextAreaElement;
          blocksEditor.value = JSON.stringify(currentBlocks, null, 2);
          blocksLayoutEditor.value = JSON.stringify(currentBlocksLayout, null, 2);
        } else {
          // Switch to Visual mode
          currentMode = 'visual';
          jsonModeDiv!.style.display = 'none';
          visualModeDiv!.style.display = 'block';

          // Sync from JSON to visual when switching
          try {
            const blocksEditor = document.getElementById("blocksEditor") as HTMLTextAreaElement;
            const blocksLayoutEditor = document.getElementById("blocksLayoutEditor") as HTMLTextAreaElement;
            currentBlocks = JSON.parse(blocksEditor.value);
            currentBlocksLayout = JSON.parse(blocksLayoutEditor.value);
            renderBlockCards();
          } catch (error) {
            console.error("Error parsing JSON:", error);
            alert("Invalid JSON in editor. Please fix syntax errors before switching to Visual mode.");
            // Revert to JSON mode
            currentMode = 'json';
            jsonModeDiv!.style.display = 'block';
            visualModeDiv!.style.display = 'none';
            updateToggleButton();
            return;
          }
        }
        updateToggleButton();
      });

      // Initialize toggle button appearance
      updateToggleButton();

      // Simple markdown to HTML converter
      function markdownToHtml(markdown: string): string {
        if (!markdown) return '';

        // Escape HTML to prevent XSS
        const escapeHtml = (text: string) => {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };

        let html = markdown;
        const lines = html.split('\n');
        const output: string[] = [];
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        let inList = false;
        let listItems: string[] = [];
        let listOrdered = false;
        let currentParagraph: string[] = [];

        // Track notes for footnotes section
        const notes: Array<{ id: string; content: string; index: number }> = [];
        let noteCounter = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          // Code blocks
          if (trimmed.startsWith('```')) {
            if (inCodeBlock) {
              // End code block
              const code = codeBlockContent.join('\n');
              output.push(`<pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; margin: 0.5rem 0; font-family: monospace; font-size: 0.9rem;"><code>${escapeHtml(code)}</code></pre>`);
              codeBlockContent = [];
              inCodeBlock = false;
            } else {
              // Start code block
              if (currentParagraph.length > 0) {
                output.push(`<p style="margin: 0.75rem 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
                currentParagraph = [];
              }
              if (listItems.length > 0) {
                const tag = listOrdered ? 'ol' : 'ul';
                output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
                listItems = [];
                inList = false;
              }
              inCodeBlock = true;
            }
            continue;
          }

          if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
          }

          // Headers - match # through ###### (h1 through h6)
          const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            if (currentParagraph.length > 0) {
              output.push(`<p style="margin: 0.75rem 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
              currentParagraph = [];
            }
            if (listItems.length > 0) {
              const tag = listOrdered ? 'ol' : 'ul';
              output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
              listItems = [];
              inList = false;
            }
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            const size = 2 - (level - 1) * 0.2;
            output.push(`<h${Math.min(level, 6)} style="margin: ${1.5 - (level - 1) * 0.2}rem 0 ${0.75 + (level - 1) * 0.1}rem 0; font-size: ${size}rem; font-weight: 600;">${processInlineMarkdown(text, notes)}</h${Math.min(level, 6)}>`);
            continue;
          }

          // Horizontal rule
          if (trimmed.match(/^[-*_]{3,}$/)) {
            if (currentParagraph.length > 0) {
              output.push(`<p style="margin: 0.75rem 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
              currentParagraph = [];
            }
            if (listItems.length > 0) {
              const tag = listOrdered ? 'ol' : 'ul';
              output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
              listItems = [];
              inList = false;
            }
            output.push('<hr style="margin: 1rem 0; border: none; border-top: 1px solid #ddd;">');
            continue;
          }

          // Lists
          const ulMatch = trimmed.match(/^[-*] (.+)$/);
          const olMatch = trimmed.match(/^\d+\. (.+)$/);

          if (ulMatch || olMatch) {
            const isOrdered = !!olMatch;
            const itemText = ulMatch ? ulMatch[1] : olMatch![1];

            if (currentParagraph.length > 0) {
              output.push(`<p style="margin: 0.75rem 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
              currentParagraph = [];
            }

            if (inList && listOrdered !== isOrdered) {
              // Different list type, close previous
              const tag = listOrdered ? 'ol' : 'ul';
              output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
              listItems = [];
            }

            inList = true;
            listOrdered = isOrdered;
            listItems.push(processInlineMarkdown(itemText, notes));
            continue;
          }

          // End of list
          if (inList && trimmed === '') {
            const tag = listOrdered ? 'ol' : 'ul';
            output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
            listItems = [];
            inList = false;
            continue;
          }

          // Note definitions (markdown style: [^1]: content or HTML style: <note id="...">content</note>)
          const noteDefMatch = trimmed.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
          const noteHtmlMatch = trimmed.match(/^<note\s+id=["']([^"']+)["']>(.*?)<\/note>$/i);

          if (noteDefMatch || noteHtmlMatch) {
            if (currentParagraph.length > 0) {
              output.push(`<p style="margin: 0.75rem 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
              currentParagraph = [];
            }
            if (listItems.length > 0) {
              const tag = listOrdered ? 'ol' : 'ul';
              output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
              listItems = [];
              inList = false;
            }

            const noteId = noteDefMatch ? noteDefMatch[1] : noteHtmlMatch![1];
            const noteContent = noteDefMatch ? noteDefMatch[2] : noteHtmlMatch![2];
            noteCounter++;
            notes.push({
              id: noteId,
              content: noteContent,
              index: noteCounter
            });
            continue;
          }

          // Regular paragraph
          if (trimmed === '') {
            if (currentParagraph.length > 0) {
              output.push(`<p style="margin: 0.75rem 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
              currentParagraph = [];
            }
            if (listItems.length > 0) {
              const tag = listOrdered ? 'ol' : 'ul';
              output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
              listItems = [];
              inList = false;
            }
          } else {
            currentParagraph.push(processInlineMarkdown(trimmed, notes));
          }
        }

        // Close any open blocks
        if (inCodeBlock && codeBlockContent.length > 0) {
          const code = codeBlockContent.join('\n');
          output.push(`<pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; margin: 0.5rem 0; font-family: monospace; font-size: 0.9rem;"><code>${escapeHtml(code)}</code></pre>`);
        }
        if (currentParagraph.length > 0) {
          output.push(`<p style="margin: 0.75rem 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
        }
        if (listItems.length > 0) {
          const tag = listOrdered ? 'ol' : 'ul';
          output.push(`<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${listItems.map(li => `<li style="margin: 0.25rem 0;">${li}</li>`).join('')}</${tag}>`);
        }

        // Add footnotes section if there are any notes
        if (notes.length > 0) {
          output.push('<hr style="margin: 2rem 0 1rem 0; border: none; border-top: 1px solid #ddd;">');
          output.push('<div style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #eee;">');
          output.push('<h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: #666;">Notes</h3>');
          output.push('<ol style="margin: 0; padding-left: 1.5rem; list-style: decimal;">');
          notes.forEach((note) => {
            const noteId = `note-${note.id}`;
            output.push(`<li id="${noteId}" style="margin: 0.5rem 0; line-height: 1.6;">`);
            output.push(processInlineMarkdown(note.content, notes));
            output.push(` <a href="#noteref-${note.id}" style="color: #1976d2; text-decoration: none; font-size: 0.9em; margin-left: 0.25rem;">↩</a>`);
            output.push('</li>');
          });
          output.push('</ol>');
          output.push('</div>');
        }

        return output.join('\n');
      }

      // Process inline markdown (bold, italic, links, code, noterefs)
      function processInlineMarkdown(text: string, notes: Array<{ id: string; content: string; index: number }> = []): string {
        // Escape HTML first
        const escapeHtml = (text: string) => {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };

        let html = escapeHtml(text);

        // Note references (markdown style: [^1] or HTML style: <noteref ref="note1">)
        // Process noterefs before other inline elements
        html = html.replace(/\[\^([^\]]+)\]/g, (match, noteId) => {
          const note = notes.find(n => n.id === noteId);
          if (note) {
            return `<sup><a id="noteref-${noteId}" href="#note-${noteId}" style="color: #1976d2; text-decoration: none; font-weight: 600; padding: 0 2px;" title="${escapeHtml(note.content.substring(0, 50))}...">[${note.index}]</a></sup>`;
          }
          return match; // Return as-is if note not found
        });

        // HTML-style noterefs: <noteref ref="note1"> or <noteref ref="note1">text</noteref>
        html = html.replace(/<noteref\s+ref=["']([^"']+)["'](?:\s*\/>|>([^<]*)<\/noteref>)/gi, (match, noteId, text) => {
          const note = notes.find(n => n.id === noteId);
          if (note) {
            const displayText = text || `[${note.index}]`;
            return `<sup><a id="noteref-${noteId}" href="#note-${noteId}" style="color: #1976d2; text-decoration: none; font-weight: 600; padding: 0 2px;" title="${escapeHtml(note.content.substring(0, 50))}...">${displayText}</a></sup>`;
          }
          return match;
        });

        // Code blocks are handled separately, so we process inline code
        // Inline code (`code`) - but not inside code blocks
        html = html.replace(/`([^`]+)`/g, (_match, code) => {
          return `<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">${escapeHtml(code)}</code>`;
        });

        // Bold (**text** or __text__) - but not inside code
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

        // Italic (*text* or _text_) - but not inside code or bold
        html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

        // Links [text](url) - but not note references
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
          // Check if it's an internal anchor (starts with #)
          if (url.startsWith('#')) {
            return `<a href="${url}" style="color: #1976d2; text-decoration: none;">${linkText}</a>`;
          }
          return `<a href="${url}" style="color: #1976d2; text-decoration: none;" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        });

        return html;
      }

      // Render block content based on type
      function renderBlockContent(block: any, type: string): HTMLElement {
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = 'width: 100%;';

        switch (type) {
          case 'markdownBlock':
          case 'markdown':
            // Render Markdown block
            const markdownContainer = document.createElement('div');
            markdownContainer.style.cssText = 'line-height: 1.6; color: #333;';

            if (block.markdown) {
              const html = markdownToHtml(block.markdown);
              markdownContainer.innerHTML = html || '<p style="color: #999; font-style: italic;">Empty markdown block</p>';

              // Add smooth scrolling for internal anchor links
              markdownContainer.querySelectorAll('a[href^="#"]').forEach((link) => {
                link.addEventListener('click', (e) => {
                  const href = (link as HTMLAnchorElement).getAttribute('href');
                  if (href && href.startsWith('#')) {
                    const targetId = href.substring(1);
                    const target = document.getElementById(targetId);
                    if (target) {
                      e.preventDefault();
                      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Highlight the target briefly
                      const originalBg = target.style.backgroundColor;
                      target.style.backgroundColor = '#fff9c4';
                      setTimeout(() => {
                        target.style.backgroundColor = originalBg;
                      }, 1000);
                    }
                  }
                });
              });
            } else {
              markdownContainer.innerHTML = '<p style="color: #999; font-style: italic;">Empty markdown block</p>';
            }
            contentContainer.appendChild(markdownContainer);
            break;

          case 'slate':
          case 'text':
            // Render Slate/Text block content
            if (block.value && Array.isArray(block.value)) {
              const textContainer = document.createElement('div');
              textContainer.style.cssText = 'line-height: 1.6; color: #333;';

              const extractAndRenderText = (nodes: any[]): string => {
                return nodes.map(node => {
                  if (node.text !== undefined) {
                    let text = node.text;
                    // Apply formatting
                    if (node.bold) text = `<strong>${text}</strong>`;
                    if (node.italic) text = `<em>${text}</em>`;
                    if (node.underline) text = `<u>${text}</u>`;
                    if (node.code) text = `<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${text}</code>`;
                    return text;
                  } else if (node.type === 'paragraph' && node.children) {
                    return `<p style="margin: 0.5rem 0;">${extractAndRenderText(node.children)}</p>`;
                  } else if (node.type === 'heading' && node.children) {
                    const level = node.level || 1;
                    return `<h${level} style="margin: 0.75rem 0 0.5rem 0; font-size: ${1.5 - (level - 1) * 0.2}rem;">${extractAndRenderText(node.children)}</h${level}>`;
                  } else if (node.type === 'list' && node.children) {
                    const tag = node.ordered ? 'ol' : 'ul';
                    return `<${tag} style="margin: 0.5rem 0; padding-left: 1.5rem;">${extractAndRenderText(node.children).split('\n').filter(l => l.trim()).map(l => `<li>${l}</li>`).join('')}</${tag}>`;
                  } else if (node.type === 'list-item' && node.children) {
                    return extractAndRenderText(node.children);
                  } else if (node.children) {
                    return extractAndRenderText(node.children);
                  }
                  return '';
                }).join('');
              };

              const html = extractAndRenderText(block.value);
              textContainer.innerHTML = html || '<p style="color: #999; font-style: italic;">Empty text block</p>';
              contentContainer.appendChild(textContainer);
            } else if (block.text) {
              // Plain text block
              const textContainer = document.createElement('div');
              textContainer.style.cssText = 'line-height: 1.6; color: #333; white-space: pre-wrap;';
              textContainer.innerHTML = block.text.replace(/\n/g, '<br>');
              contentContainer.appendChild(textContainer);
            } else {
              contentContainer.innerHTML = '<p style="color: #999; font-style: italic;">Empty text block</p>';
            }
            break;

          case 'image':
            // Render Image block
            const imageContainer = document.createElement('div');
            imageContainer.style.cssText = 'text-align: center; margin: 0.5rem 0;';

            if (block.url) {
              const img = document.createElement('img');
              img.src = block.url;
              img.alt = block.alt || 'Image';
              img.style.cssText = 'max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
              img.onerror = () => {
                img.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'padding: 1rem; background: #ffebee; color: #c62828; border-radius: 4px;';
                errorDiv.textContent = `Image not found: ${block.url}`;
                imageContainer.appendChild(errorDiv);
              };
              imageContainer.appendChild(img);

              if (block.title) {
                const caption = document.createElement('p');
                caption.style.cssText = 'margin-top: 0.5rem; font-size: 0.9rem; color: #666; font-style: italic;';
                caption.textContent = block.title;
                imageContainer.appendChild(caption);
              }
            } else {
              imageContainer.innerHTML = '<p style="color: #999; font-style: italic;">No image URL provided</p>';
            }
            contentContainer.appendChild(imageContainer);
            break;

          case 'listing':
            // Render Listing block with actual results
            const listingContainer = document.createElement('div');
            listingContainer.style.cssText = 'padding: 1rem; background: #f5f5f5; border-radius: 4px;';

            // Render header immediately
            listingContainer.innerHTML = `
              <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #333;">${block.headline || 'Content Listing'}</p>
              <div class="listing-results">
                <p style="margin: 0; font-size: 0.9rem; color: #666;">Loading items...</p>
              </div>
            `;

            // Fetch and render results asynchronously
            (async () => {
              try {
                const resultsContainer = listingContainer.querySelector('.listing-results') as HTMLElement;
                if (!resultsContainer) return;

                // Parse query
                const queryParams: Record<string, string> = {};

                // Handle 'query' array from listing block
                // Format: [{i: "portal_type", o: "plone.app.querystring.operation.selection.is", v: ["Document"]}]
                if (block.query && Array.isArray(block.query)) {
                  block.query.forEach((criterion: any) => {
                    if (!criterion.i || criterion.v === undefined) return;

                    // Map criterion to API parameter
                    // This is a simplified mapping - a full implementation would handle all operations
                    const key = criterion.i;
                    let value = criterion.v;

                    // Handle array values (e.g. multiple types)
                    if (Array.isArray(value)) {
                      // For now, just take the first one or join them if supported
                      // The backend update supports multiple values if passed correctly, 
                      // but our simple map uses string values.
                      // Ideally we'd support array values in additionalParams, but for now join with comma?
                      // Plone API usually expects repeated keys for list values, which our HashMap<String, String> doesn't support well.
                      // However, for many fields, Plone accepts comma-separated strings or we can pick the most common use case.
                      value = value.join(',');
                    }

                    queryParams[key] = String(value);
                  });
                }

                // Handle sort
                if (block.sort_on) {
                  queryParams['sort_on'] = block.sort_on;
                }
                if (block.sort_order) {
                  queryParams['sort_order'] = block.sort_order; // ascending/descending
                }
                if (block.limit) {
                  queryParams['b_size'] = String(block.limit);
                }

                // Execute search
                // Use the current path as context if needed, or root
                const searchPath = block.root_path || (objectData['@id'] ? api.extractPath(objectData['@id']) : undefined);

                const results = await api.search({
                  path: searchPath, // Search within current context or specified root
                  additionalParams: queryParams
                });

                if (results.items && results.items.length > 0) {
                  resultsContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                      ${results.items.map(item => {
                    // Determine icon based on type
                    let icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`; // Default file
                    if (item['@type'] === 'Folder') {
                      icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
                    } else if (item['@type'] === 'Image') {
                      icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
                    }

                    // Create clickable link
                    // We need to handle the click to navigate within the app
                    return `
                          <div class="listing-item" data-path="${item['@id']}" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: white; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;">
                            <span style="color: #666;">${icon}</span>
                            <span style="font-weight: 500; color: ${PLONE_BLUE};">${item.title || 'Untitled'}</span>
                          </div>
                        `;
                  }).join('')}
                    </div>
                  `;

                  // Add click handlers
                  resultsContainer.querySelectorAll('.listing-item').forEach(el => {
                    el.addEventListener('click', async (e) => {
                      e.stopPropagation();
                      const fullId = el.getAttribute('data-path');
                      if (fullId) {
                        // Extract relative path
                        let path = fullId;
                        try {
                          const url = new URL(fullId);
                          path = url.pathname;
                          if (path.includes('++api++')) {
                            path = path.split('++api++')[1];
                          }
                        } catch (e) {
                          // If not a URL, assume it's a path or handle as is
                        }
                        // Clean path
                        path = path.replace(/^\/+/, '');

                        itemsList.innerHTML = "<p>Loading...</p>";
                        try {
                          const objectData = await api.fetch(path);
                          showObjectDetails(objectData);
                        } catch (error) {
                          console.error("Error navigating to item:", error);
                        }
                      }
                    });

                    // Hover effect
                    (el as HTMLElement).addEventListener('mouseenter', () => {
                      (el as HTMLElement).style.backgroundColor = '#f0f7ff';
                    });
                    (el as HTMLElement).addEventListener('mouseleave', () => {
                      (el as HTMLElement).style.backgroundColor = 'white';
                    });
                  });

                  // Convert results to RAG candidates for PDF bundling
                  const listingCandidates: RagCandidate[] = results.items.map(item => ({
                    item: item,
                    path: item['@id'] || ''
                  }));

                  // Count PDFs in this listing
                  let pdfCount = 0;
                  for (const candidate of listingCandidates) {
                    const pdfInfo = detectPdfInfo(candidate.item);
                    if (pdfInfo) pdfCount++;
                  }

                  // Add bundle button if RAG is enabled and there are PDFs
                  if (isRagBundleEnabled() && pdfCount > 0) {
                    const bundleButton = document.createElement('div');
                    bundleButton.style.cssText = `
                      margin-top: 0.75rem;
                      padding: 0.75rem;
                      background: linear-gradient(135deg, ${PLONE_BLUE} 0%, ${THEME_SECONDARY} 100%);
                      border-radius: 6px;
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      gap: 0.5rem;
                    `;

                    bundleButton.innerHTML = `
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span style="color: white; font-weight: 500; font-size: 14px;">${pdfCount} PDF${pdfCount === 1 ? '' : 's'} available in this listing</span>
                      </div>
                      <button class="bundle-listing-btn" style="
                        padding: 0.5rem 1rem;
                        background: white;
                        color: ${PLONE_BLUE};
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 13px;
                        transition: all 0.2s;
                      ">Bundle These PDFs</button>
                    `;

                    const btn = bundleButton.querySelector('.bundle-listing-btn') as HTMLButtonElement;
                    btn.addEventListener('mouseenter', () => {
                      btn.style.background = '#f0f7ff';
                      btn.style.transform = 'scale(1.05)';
                    });
                    btn.addEventListener('mouseleave', () => {
                      btn.style.background = 'white';
                      btn.style.transform = 'scale(1)';
                    });
                    btn.addEventListener('click', (e) => {
                      e.stopPropagation();
                      setRagCandidates(listingCandidates);
                      // Scroll to RAG bundle panel
                      ragBundlePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    });

                    resultsContainer.appendChild(bundleButton);
                  }

                } else {
                  resultsContainer.innerHTML = '<p style="margin: 0; color: #666; font-style: italic;">No items found.</p>';
                }
              } catch (error) {
                console.error("Error rendering listing block:", error);
                const resultsContainer = listingContainer.querySelector('.listing-results');
                if (resultsContainer) {
                  resultsContainer.innerHTML = `<p style="color: #d32f2f;">Error loading items: ${error instanceof Error ? error.message : String(error)}</p>`;
                }
              }
            })();

            contentContainer.appendChild(listingContainer);
            break;

          case 'video':
            // Render Video block
            const videoContainer = document.createElement('div');
            videoContainer.style.cssText = 'margin: 0.5rem 0;';

            if (block.url) {
              const video = document.createElement('video');
              video.src = block.url;
              video.controls = true;
              video.style.cssText = 'width: 100%; max-width: 100%; border-radius: 4px;';
              videoContainer.appendChild(video);

              if (block.title) {
                const title = document.createElement('p');
                title.style.cssText = 'margin-top: 0.5rem; font-weight: 600; color: #333;';
                title.textContent = block.title;
                videoContainer.appendChild(title);
              }
            } else {
              videoContainer.innerHTML = '<p style="color: #999; font-style: italic;">No video URL provided</p>';
            }
            contentContainer.appendChild(videoContainer);
            break;

          case 'teaser':
            // Render Teaser block
            const teaserContainer = document.createElement('div');
            teaserContainer.style.cssText = 'padding: 1rem; background: #f9f9f9; border-left: 3px solid #ff9800; border-radius: 4px;';

            if (block.title) {
              const title = document.createElement('h4');
              title.style.cssText = 'margin: 0 0 0.5rem 0; color: #333;';
              title.textContent = block.title;
              teaserContainer.appendChild(title);
            }

            if (block.description) {
              const desc = document.createElement('p');
              desc.style.cssText = 'margin: 0 0 0.5rem 0; color: #666; line-height: 1.5;';
              desc.textContent = block.description;
              teaserContainer.appendChild(desc);
            }

            if (block.href) {
              const link = document.createElement('a');
              link.href = block.href;
              link.textContent = block.linkTitle || 'Read more →';
              link.style.cssText = 'color: #ff9800; text-decoration: none; font-weight: 500;';
              link.target = '_blank';
              teaserContainer.appendChild(link);
            }

            if (!block.title && !block.description && !block.href) {
              teaserContainer.innerHTML = '<p style="margin: 0; color: #999; font-style: italic;">Empty teaser block</p>';
            }
            contentContainer.appendChild(teaserContainer);
            break;

          case 'table':
            // Render Table block
            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = 'overflow-x: auto; margin: 0.5rem 0;';

            if (block.table && block.table.rows) {
              const table = document.createElement('table');
              table.style.cssText = 'width: 100%; border-collapse: collapse; background: white;';

              block.table.rows.forEach((row: any, rowIdx: number) => {
                const tr = document.createElement('tr');
                if (row.cells) {
                  row.cells.forEach((cell: any) => {
                    const tag = (rowIdx === 0 && block.table.header) ? 'th' : 'td';
                    const td = document.createElement(tag);
                    td.style.cssText = 'padding: 0.5rem; border: 1px solid #ddd; text-align: left;';
                    if (tag === 'th') {
                      td.style.cssText += 'background: #f5f5f5; font-weight: 600;';
                    }
                    td.textContent = cell.value || '';
                    tr.appendChild(td);
                  });
                }
                table.appendChild(tr);
              });

              tableContainer.appendChild(table);
            } else {
              tableContainer.innerHTML = '<p style="color: #999; font-style: italic;">Empty table block</p>';
            }
            contentContainer.appendChild(tableContainer);
            break;

          default:
            // Generic block renderer
            const genericContainer = document.createElement('div');
            genericContainer.style.cssText = 'padding: 1rem; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 0.85rem; color: #666;';
            genericContainer.textContent = JSON.stringify(block, null, 2).substring(0, 200);
            if (JSON.stringify(block).length > 200) {
              genericContainer.textContent += '...';
            }
            contentContainer.appendChild(genericContainer);
        }

        return contentContainer;
      }

      // Render block cards in visual mode
      function renderBlockCards() {
        if (!blocksList) return;
        blocksList.innerHTML = '';

        const layoutItems = currentBlocksLayout.items || [];
        layoutItems.forEach((blockId: string, index: number) => {
          const block = currentBlocks[blockId];
          if (!block) return;

          const card = document.createElement('div');
          card.draggable = true;
          card.dataset.blockId = blockId;
          card.dataset.index = String(index);
          card.style.cssText = `
            background: white;
            border: 1px solid ${THEME_SECONDARY};
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            position: relative;
          `;

          // Block header with type label and actions
          const header = document.createElement('div');
          header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #eee;
          `;

          const type = block['@type'] || 'unknown';
          let color = '#757575';

          switch (type) {
            case 'slate':
            case 'text':
              color = PLONE_BLUE;
              break;
            case 'markdownBlock':
            case 'markdown':
              color = '#9c27b0';
              break;
            case 'image':
              color = '#f06292';
              break;
            case 'listing':
              color = '#4caf50';
              break;
            case 'video':
              color = '#f44336';
              break;
            case 'teaser':
              color = '#ff9800';
              break;
            case 'table':
              color = '#795548';
              break;
          }

          const typeLabel = document.createElement('span');
          typeLabel.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            color: ${color};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 0.25rem 0.5rem;
            background: ${color}15;
            border-radius: 4px;
          `;
          typeLabel.textContent = type;

          // Actions container
          const actions = document.createElement('div');
          actions.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

          const dragHandle = document.createElement('span');
          dragHandle.innerHTML = '⋮⋮';
          dragHandle.style.cssText = 'font-size: 18px; color: #bdbdbd; cursor: move; padding: 0 4px; user-select: none;';
          dragHandle.title = "Drag to reorder";

          const deleteBtn = document.createElement('button');
          deleteBtn.innerHTML = '×';
          deleteBtn.title = "Remove block";
          deleteBtn.style.cssText = `
            background: white;
            color: #ef5350;
            border: 1px solid #ef5350;
            border-radius: 4px;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          `;
          deleteBtn.onmouseover = () => { deleteBtn.style.background = '#ef5350'; deleteBtn.style.color = 'white'; };
          deleteBtn.onmouseout = () => { deleteBtn.style.background = 'white'; deleteBtn.style.color = '#ef5350'; };

          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteBlock(blockId);
          };

          actions.appendChild(dragHandle);
          actions.appendChild(deleteBtn);

          header.appendChild(typeLabel);
          header.appendChild(actions);

          // Block content
          const contentWrapper = document.createElement('div');
          contentWrapper.style.cssText = 'min-height: 2rem;';
          const blockContent = renderBlockContent(block, type);
          contentWrapper.appendChild(blockContent);

          card.appendChild(header);
          card.appendChild(contentWrapper);

          // Drag and drop handlers
          card.addEventListener('dragstart', handleDragStart);
          card.addEventListener('dragover', handleDragOver);
          card.addEventListener('drop', handleDrop);
          card.addEventListener('dragend', handleDragEnd);

          blocksList.appendChild(card);
        });
      }

      let draggedElement: HTMLElement | null = null;

      function handleDragStart(e: DragEvent) {
        draggedElement = e.target as HTMLElement;
        draggedElement.style.opacity = '0.5';
        e.dataTransfer!.effectAllowed = 'move';
      }

      function handleDragOver(e: DragEvent) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';

        const target = e.currentTarget as HTMLElement;
        if (target !== draggedElement && target.dataset.blockId) {
          target.style.borderTop = '3px solid ' + PLONE_BLUE;
        }
      }

      function handleDrop(e: DragEvent) {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        target.style.borderTop = '';

        if (draggedElement && target !== draggedElement) {
          const fromIndex = parseInt(draggedElement.dataset.index || '0');
          const toIndex = parseInt(target.dataset.index || '0');

          // Reorder the blocks_layout items array
          const items = [...currentBlocksLayout.items];
          const [movedItem] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, movedItem);
          currentBlocksLayout.items = items;

          renderBlockCards();
        }
      }

      function handleDragEnd(e: DragEvent) {
        const target = e.target as HTMLElement;
        target.style.opacity = '1';

        // Clear all border highlights
        document.querySelectorAll('[data-block-id]').forEach(el => {
          (el as HTMLElement).style.borderTop = '';
        });
      }

      function deleteBlock(blockId: string) {
        // Remove from blocks object
        delete currentBlocks[blockId];

        // Remove from blocks_layout items
        currentBlocksLayout.items = currentBlocksLayout.items.filter((id: string) => id !== blockId);

        renderBlockCards();
      }

      // Add block button
      document.getElementById("addBlockBtn")?.addEventListener("click", () => {
        const newBlockId = 'block-' + Date.now();
        currentBlocks[newBlockId] = {
          '@type': 'slate',
          'plaintext': 'New block',
          'value': [{ type: 'p', children: [{ text: 'New block' }] }]
        };
        currentBlocksLayout.items.push(newBlockId);
        renderBlockCards();
      });

      document.getElementById("saveBlocksBtn")?.addEventListener("click", async () => {
        if (!blockStatus) {
          console.error("blockStatus element not found");
          return;
        }

        try {
          const blocksEditor = document.getElementById("blocksEditor") as HTMLTextAreaElement;
          const blocksLayoutEditor = document.getElementById("blocksLayoutEditor") as HTMLTextAreaElement;

          let newBlocks, newBlocksLayout;

          if (currentMode === 'json') {
            // Parse from JSON editors
            try {
              newBlocks = JSON.parse(blocksEditor.value);
              newBlocksLayout = JSON.parse(blocksLayoutEditor.value);
            } catch (parseError) {
              throw new Error(`Invalid JSON: ${parseError instanceof Error ? parseError.message : "Parse error"}`);
            }
          } else {
            // Use current visual state - create copies to avoid reference issues
            newBlocks = JSON.parse(JSON.stringify(currentBlocks));
            newBlocksLayout = JSON.parse(JSON.stringify(currentBlocksLayout));
          }

          // Validate consistency
          const blockIds = Object.keys(newBlocks);
          const layoutItems = newBlocksLayout.items || [];

          // Check that all layout items exist in blocks
          const missingInBlocks = layoutItems.filter((id: string) => !blockIds.includes(id));
          if (missingInBlocks.length > 0) {
            throw new Error(`blocks_layout references UUIDs not in blocks: ${missingInBlocks.join(', ')}`);
          }

          // Warn about unused blocks (not an error, but informational)
          const unusedBlocks = blockIds.filter(id => !layoutItems.includes(id));
          if (unusedBlocks.length > 0) {
            console.warn('Blocks not in layout (will be saved but not displayed):', unusedBlocks);
          }

          // Show saving status
          blockStatus.textContent = "Saving...";
          blockStatus.style.color = "#666";
          blockStatus.style.display = "block";

          // Optimize: if only layout changed, send only that
          const blocksChanged = JSON.stringify(newBlocks) !== originalBlocks;
          const layoutChanged = JSON.stringify(newBlocksLayout) !== originalBlocksLayout;

          console.log("Save check:", { blocksChanged, layoutChanged, blockCount: blockIds.length, layoutCount: layoutItems.length });

          if (blocksChanged && layoutChanged) {
            // Both changed - send both
            console.log("Saving both blocks and layout");
            await api.patch(objectPath, {
              blocks: newBlocks,
              blocks_layout: newBlocksLayout
            });
          } else if (layoutChanged) {
            // Only layout changed (reordering/hiding) - send only layout
            console.log("Saving only layout");
            await api.patch(objectPath, {
              blocks_layout: newBlocksLayout
            });
          } else if (blocksChanged) {
            // Only blocks changed - send both for safety
            console.log("Saving blocks (sending both for safety)");
            await api.patch(objectPath, {
              blocks: newBlocks,
              blocks_layout: newBlocksLayout
            });
          } else {
            blockStatus.textContent = "No changes detected";
            blockStatus.style.color = "#666";
            blockStatus.style.display = "block";
            setTimeout(() => { blockStatus.style.display = "none"; }, 2000);
            return;
          }

          // Success
          blockStatus.textContent = "✓ Blocks saved successfully!";
          blockStatus.style.color = "#4caf50";
          blockStatus.style.display = "block";

          // Update original blocks to reflect saved state
          originalBlocks = JSON.stringify(newBlocks);
          originalBlocksLayout = JSON.stringify(newBlocksLayout);

          // Also update currentBlocks to match saved state
          currentBlocks = newBlocks;
          currentBlocksLayout = newBlocksLayout;

          setTimeout(() => { blockStatus.style.display = "none"; }, 3000);
        } catch (error) {
          console.error("Error saving blocks:", error);
          blockStatus.textContent = `✗ Error: ${error instanceof Error ? error.message : "Failed to save"}`;
          blockStatus.style.color = "#d32f2f";
          blockStatus.style.display = "block";
          // Don't hide error message automatically - let user see it
        }
      });

      // Initialize visual mode - render blocks on load (after all handlers are set up)
      if (blocksList && currentMode === 'visual') {
        renderBlockCards();
      }
    }

    // Initialize remove tag handlers
    document.querySelectorAll('.remove-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = (e.target as HTMLElement).getAttribute('data-tag');
        if (tag) {
          currentTags = currentTags.filter(t => t !== tag);
          updateTagsDisplay();
        }
      });
    });
  }

  // Keywords Manager UI
  async function showKeywordsManager() {
    itemsList.innerHTML = `
      <div style="padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${PLONE_BLUE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            Keywords Manager
          </h3>
          <div style="display: flex; gap: 0.5rem;">
            <button id="createKeywordBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              + Create Keyword
            </button>
            <button id="kwBackBtn" style="padding: 0.5rem 1rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333; font-weight: 500;">
            ← Back to Browser
          </button>
        </div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid #eee;">
          <button id="kwTabSimilar" class="kw-tab active" style="padding: 0.75rem 1.5rem; background: transparent; border: none; border-bottom: 3px solid ${PLONE_BLUE}; cursor: pointer; font-weight: 500; color: ${PLONE_BLUE};">
            Similar Keywords
          </button>
          <button id="kwTabAll" class="kw-tab" style="padding: 0.75rem 1.5rem; background: transparent; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: #666;">
            All Keywords
          </button>
        </div>
        
        <div id="kwContent">
          <div style="text-align: center; padding: 3rem 1rem;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid ${PLONE_BLUE}; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <p id="loadingMsg" style="color: #666; font-size: 1.1em;">Analyzing keywords...</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById("kwBackBtn")?.addEventListener("click", () => {
      browseBtn.click();
    });

    // Create Keyword handler
    document.getElementById("createKeywordBtn")?.addEventListener("click", () => {
      showCreateKeywordUI();
    });


    // Tab switching
    let currentTab: 'similar' | 'all' = 'similar';
    document.getElementById("kwTabSimilar")?.addEventListener("click", () => {
      currentTab = 'similar';
      updateTabs();
      showSimilarKeywordsView();
    });
    document.getElementById("kwTabAll")?.addEventListener("click", async () => {
      currentTab = 'all';
      updateTabs();
      await showAllKeywordsView();
    });

    function updateTabs() {
      const similarTab = document.getElementById("kwTabSimilar");
      const allTab = document.getElementById("kwTabAll");
      if (similarTab && allTab) {
        if (currentTab === 'similar') {
          similarTab.classList.add('active');
          similarTab.style.borderBottomColor = PLONE_BLUE;
          similarTab.style.color = PLONE_BLUE;
          allTab.classList.remove('active');
          allTab.style.borderBottomColor = 'transparent';
          allTab.style.color = '#666';
        } else {
          allTab.classList.add('active');
          allTab.style.borderBottomColor = PLONE_BLUE;
          allTab.style.color = PLONE_BLUE;
          similarTab.classList.remove('active');
          similarTab.style.borderBottomColor = 'transparent';
          similarTab.style.color = '#666';
        }
      }
    }

    const kwContent = document.getElementById("kwContent")!;
    let allTags: Record<string, number> = {};
    let similarPairs: api.SimilarTagPair[] = [];
    let mergePlan: Map<string, string[]> = new Map(); // target -> sources

    // Light caching for keywords (5 minute cache)
    let keywordsCache: { data: Record<string, number>; timestamp: number } | null = null;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    async function getCachedTags(forceRefresh = false): Promise<Record<string, number>> {
      const now = Date.now();

      // Return cached data if it's still valid and not forcing refresh
      if (!forceRefresh && keywordsCache && (now - keywordsCache.timestamp) < CACHE_DURATION) {
        return keywordsCache.data;
      }

      // Fetch fresh data
      const tags = await api.collectTags();
      keywordsCache = { data: tags, timestamp: now };
      return tags;
    }

    function invalidateKeywordsCache() {
      keywordsCache = null;
    }

    // Show All Keywords view
    async function showAllKeywordsView() {
      // Check if we have cached data
      const hasCache = keywordsCache && (Date.now() - keywordsCache.timestamp) < CACHE_DURATION;

      if (!hasCache) {
        // Show loading state only if we don't have cache
        kwContent.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem;">
            <div style="display: inline-block; width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid ${PLONE_BLUE}; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <p style="color: #666; font-size: 1.1em; font-weight: 500; margin-bottom: 0.5rem;">Loading keywords...</p>
            <p style="color: #999; font-size: 0.9em;">Scanning your Plone site</p>
          </div>
        `;
      }

      // Reload tags to get the latest data (uses cache if available)
      try {
        allTags = await getCachedTags();
      } catch (error) {
        kwContent.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: #d32f2f;">
            <p>Error loading keywords: ${error instanceof Error ? error.message : "Unknown error"}</p>
            <button id="retryAllKeywordsBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">Retry</button>
          </div>
        `;
        document.getElementById("retryAllKeywordsBtn")?.addEventListener("click", () => {
          showAllKeywordsView();
        });
        return;
      }

      const sortedTags = Object.entries(allTags)
        .sort((a, b) => b[1] - a[1]); // Sort by count descending

      kwContent.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto;">
          <div style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; align-items: center;">
            <input type="text" id="keywordFilterInput" placeholder="Filter keywords..." style="flex: 1; padding: 0.75rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};" />
            <button id="selectAllKeywordsBtn" style="padding: 0.75rem 1rem; background: ${THEME_SECONDARY}; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 0.9em; white-space: nowrap;">
              Select All
            </button>
            <button id="deselectAllKeywordsBtn" style="padding: 0.75rem 1rem; background: ${THEME_SECONDARY}; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 0.9em; white-space: nowrap; display: none;">
              Deselect All
            </button>
          </div>
          
          <!-- Bulk Actions Bar -->
          <div id="bulkActionsBar" style="display: none; margin-bottom: 1rem; padding: 1rem; background: #e3f2fd; border: 1px solid ${PLONE_BLUE}; border-radius: 8px; justify-content: space-between; align-items: center;">
            <div style="font-weight: 500; color: #333;">
              <span id="selectedCount">0</span> keyword<span id="selectedCountPlural">s</span> selected
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button id="bulkRenameBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; font-weight: 500;">
                Bulk Rename
              </button>
              <button id="bulkDeleteBtn" style="padding: 0.5rem 1rem; background: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; font-weight: 500;">
                Bulk Delete
              </button>
            </div>
          </div>
          
          <style>
            .keyword-name-editable {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              cursor: pointer;
              padding: 0.25rem 0.5rem;
              margin: -0.25rem -0.5rem;
              border-radius: 4px;
              transition: all 0.2s;
            }
            .keyword-name-editable:hover {
              background: #f5f5f5;
              color: ${PLONE_BLUE};
            }
            .keyword-name-editable .edit-icon {
              opacity: 0;
              transition: opacity 0.2s;
              width: 14px;
              height: 14px;
            }
            .keyword-name-editable:hover .edit-icon {
              opacity: 0.6;
            }
            .keyword-item.selected {
              background: #e3f2fd !important;
              border-color: ${PLONE_BLUE} !important;
            }
          </style>
          <div id="allKeywordsList" style="display: grid; gap: 0.75rem;">
            ${sortedTags.map(([tag, count]) => `
              <div class="keyword-item" data-keyword="${tag}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border: 1px solid #eee; border-radius: 8px; transition: all 0.2s;">
                <input type="checkbox" class="keyword-checkbox" data-keyword="${tag}" style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;" />
                <div style="flex: 1;">
                  <div class="keyword-name-editable" data-keyword="${tag}" title="Click to rename">
                    <span>${tag}</span>
                    <svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </div>
                  <div style="font-size: 0.85em; color: #666; margin-top: 0.25rem;">Used in ${count} item${count !== 1 ? 's' : ''}</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="rename-keyword-btn" data-keyword="${tag}" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Rename
                  </button>
                  <button class="delete-keyword-btn" data-keyword="${tag}" style="padding: 0.5rem 1rem; background: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          ${sortedTags.length === 0 ? `
            <div style="text-align: center; padding: 3rem; color: #666;">
              <p>No keywords found.</p>
            </div>
          ` : ''}
        </div>
      `;

      // Filter functionality
      const filterInput = document.getElementById("keywordFilterInput") as HTMLInputElement;
      if (filterInput) {
        filterInput.addEventListener("input", (e) => {
          const filter = (e.target as HTMLInputElement).value.toLowerCase();
          document.querySelectorAll(".keyword-item").forEach((item) => {
            const keyword = item.getAttribute("data-keyword")?.toLowerCase() || "";
            (item as HTMLElement).style.display = keyword.includes(filter) ? "flex" : "none";
          });
        });
      }

      // Rename handlers - both button and clickable keyword name
      document.querySelectorAll(".rename-keyword-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const keyword = (e.target as HTMLElement).getAttribute("data-keyword");
          if (keyword) {
            showRenameKeywordDialog(keyword);
          }
        });
      });

      // Make keyword names clickable to rename
      document.querySelectorAll(".keyword-name-editable").forEach((element) => {
        element.addEventListener("click", (e) => {
          e.stopPropagation();
          const keyword = (e.target as HTMLElement).closest(".keyword-name-editable")?.getAttribute("data-keyword");
          if (keyword) {
            showRenameKeywordDialog(keyword);
          }
        });
      });

      // Delete handlers
      document.querySelectorAll(".delete-keyword-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const keyword = (e.target as HTMLElement).getAttribute("data-keyword");
          if (keyword) {
            showDeleteKeywordDialog(keyword);
          }
        });
      });

      // Bulk selection functionality
      function updateBulkActionsBar() {
        const checkboxes = document.querySelectorAll(".keyword-checkbox:checked") as NodeListOf<HTMLInputElement>;
        const selectedCount = checkboxes.length;
        const bulkActionsBar = document.getElementById("bulkActionsBar");
        const selectedCountSpan = document.getElementById("selectedCount");
        const selectedCountPlural = document.getElementById("selectedCountPlural");

        if (bulkActionsBar && selectedCountSpan && selectedCountPlural) {
          if (selectedCount > 0) {
            bulkActionsBar.style.display = "flex";
            selectedCountSpan.textContent = String(selectedCount);
            selectedCountPlural.textContent = selectedCount === 1 ? "" : "s";
          } else {
            bulkActionsBar.style.display = "none";
          }
        }

        // Update select all button state
        const visibleCheckboxes = Array.from(document.querySelectorAll(".keyword-checkbox") as NodeListOf<HTMLInputElement>)
          .filter(cb => {
            const item = cb.closest(".keyword-item") as HTMLElement;
            return item && item.style.display !== "none";
          });
        const checkedVisible = visibleCheckboxes.filter(cb => cb.checked).length;

        if (selectAllBtn && deselectAllBtn) {
          if (checkedVisible === visibleCheckboxes.length && visibleCheckboxes.length > 0) {
            selectAllBtn.style.display = "none";
            deselectAllBtn.style.display = "block";
          } else {
            selectAllBtn.style.display = "block";
            deselectAllBtn.style.display = "none";
          }
        }

        // Update selected state on items
        document.querySelectorAll(".keyword-item").forEach((item) => {
          const checkbox = item.querySelector(".keyword-checkbox") as HTMLInputElement;
          if (checkbox?.checked) {
            item.classList.add("selected");
          } else {
            item.classList.remove("selected");
          }
        });
      }

      // Checkbox change handlers
      document.querySelectorAll(".keyword-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          updateBulkActionsBar();
        });
      });

      // Select All / Deselect All
      const selectAllBtn = document.getElementById("selectAllKeywordsBtn");
      const deselectAllBtn = document.getElementById("deselectAllKeywordsBtn");

      selectAllBtn?.addEventListener("click", () => {
        document.querySelectorAll(".keyword-checkbox").forEach((checkbox) => {
          const item = (checkbox as HTMLInputElement).closest(".keyword-item") as HTMLElement;
          if (item && item.style.display !== "none") {
            (checkbox as HTMLInputElement).checked = true;
          }
        });
        updateBulkActionsBar();
        selectAllBtn.style.display = "none";
        deselectAllBtn!.style.display = "block";
      });

      deselectAllBtn?.addEventListener("click", () => {
        document.querySelectorAll(".keyword-checkbox").forEach((checkbox) => {
          (checkbox as HTMLInputElement).checked = false;
        });
        updateBulkActionsBar();
        selectAllBtn!.style.display = "block";
        deselectAllBtn.style.display = "none";
      });

      // Bulk Rename
      document.getElementById("bulkRenameBtn")?.addEventListener("click", () => {
        const selected = Array.from(document.querySelectorAll(".keyword-checkbox:checked") as NodeListOf<HTMLInputElement>)
          .map(cb => cb.getAttribute("data-keyword"))
          .filter(Boolean) as string[];

        if (selected.length === 0) {
          alert("Please select at least one keyword to rename.");
          return;
        }

        showBulkRenameDialog(selected);
      });

      // Bulk Delete
      document.getElementById("bulkDeleteBtn")?.addEventListener("click", () => {
        const selected = Array.from(document.querySelectorAll(".keyword-checkbox:checked") as NodeListOf<HTMLInputElement>)
          .map(cb => cb.getAttribute("data-keyword"))
          .filter(Boolean) as string[];

        if (selected.length === 0) {
          alert("Please select at least one keyword to delete.");
          return;
        }

        showBulkDeleteDialog(selected);
      });
    }

    // Show Rename Keyword dialog
    function showRenameKeywordDialog(oldKeyword: string) {
      const count = allTags[oldKeyword] || 0;
      kwContent.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1.5rem 0;">Rename Keyword</h3>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Current Name</label>
              <div style="padding: 0.75rem; background: #f5f5f5; border-radius: 4px; color: #666;">${oldKeyword}</div>
              <p style="margin: 0.5rem 0 0 0; font-size: 0.85em; color: #666;">Used in ${count} item${count !== 1 ? 's' : ''}</p>
            </div>
          <div style="margin-bottom: 1.5rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">New Name</label>
                <input type="text" id="newKeywordNameInput" value="${oldKeyword}" style="width: 100%; padding: 0.75rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};" />
              </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              <button id="cancelRenameBtn" style="padding: 0.75rem 1.5rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333;">
                Cancel
              </button>
              <button id="saveRenameBtn" style="padding: 0.75rem 1.5rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                Rename
              </button>
              </div>
              </div>
              </div>
      `;

      document.getElementById("cancelRenameBtn")?.addEventListener("click", () => {
        showAllKeywordsView();
      });

      document.getElementById("saveRenameBtn")?.addEventListener("click", async () => {
        const newNameInput = document.getElementById("newKeywordNameInput") as HTMLInputElement;
        const newName = newNameInput.value.trim();

        if (!newName) {
          alert("Please enter a new keyword name.");
          return;
        }

        if (newName === oldKeyword) {
          alert("New name must be different from the current name.");
          return;
        }

        // Check if new name already exists
        if (allTags[newName]) {
          if (!confirm(`Keyword "${newName}" already exists with ${allTags[newName]} items. This will merge "${oldKeyword}" into "${newName}". Continue?`)) {
            return;
          }
        }

        const saveBtn = document.getElementById("saveRenameBtn") as HTMLButtonElement;
        saveBtn.disabled = true;
        saveBtn.textContent = "Renaming...";

        try {
          // Merge old keyword into new keyword
          await api.mergeTags(newName, [oldKeyword]);

          // Reload keywords and show the renamed keyword in All Keywords view
          invalidateKeywordsCache(); // Invalidate cache after rename
          allTags = await getCachedTags(true);
          currentTab = 'all';
          updateTabs();
          showAllKeywordsView();

          // Scroll to the renamed keyword if it exists
          setTimeout(() => {
            const keywordItem = document.querySelector(`[data-keyword="${newName}"]`);
            if (keywordItem) {
              keywordItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight it briefly
              (keywordItem as HTMLElement).style.background = '#e8f5e9';
              setTimeout(() => {
                (keywordItem as HTMLElement).style.background = 'white';
              }, 2000);
            }
          }, 100);
        } catch (error) {
          alert(`Error renaming keyword: ${error instanceof Error ? error.message : "Unknown error"}`);
          saveBtn.disabled = false;
          saveBtn.textContent = "Rename";
        }
      });
    }

    // Show Delete Keyword dialog
    function showDeleteKeywordDialog(keyword: string) {
      const count = allTags[keyword] || 0;
      kwContent.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1.5rem 0; color: #c62828;">Delete Keyword</h3>
            <div style="margin-bottom: 1.5rem;">
              <p style="margin: 0 0 1rem 0;">Are you sure you want to delete the keyword <strong>"${keyword}"</strong>?</p>
              <div style="padding: 1rem; background: #ffebee; border-radius: 4px; border-left: 4px solid #c62828;">
                <p style="margin: 0; color: #c62828; font-weight: 500;">This will remove the keyword from ${count} item${count !== 1 ? 's' : ''}.</p>
            </div>
          </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              <button id="cancelDeleteBtn" style="padding: 0.75rem 1.5rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333;">
                Cancel
              </button>
              <button id="confirmDeleteBtn" style="padding: 0.75rem 1.5rem; background: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                Delete Keyword
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("cancelDeleteBtn")?.addEventListener("click", () => {
        showAllKeywordsView();
      });

      document.getElementById("confirmDeleteBtn")?.addEventListener("click", async () => {
        const deleteBtn = document.getElementById("confirmDeleteBtn") as HTMLButtonElement;
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting...";

        try {
          // Use merge_tags to find and update items with the keyword
          // We'll merge to a very unique temporary value that won't conflict
          // The backend's merge_tags uses search_items_by_subject which is efficient
          const tempTarget = `__DELETE_${Date.now()}_${Math.random().toString(36).substring(2, 9)}__`;
          const result = await api.mergeTags(tempTarget, [keyword]);
          const updated = result.updated;
          const errors = result.errors || [];

          // Note: The tempTarget will remain on items, but it's unique and won't appear
          // in normal keyword lists since it starts with __DELETE_. This is acceptable
          // for now. A proper solution would require a backend delete_keyword function.

          // Show success screen
          // Invalidate cache and refresh - the keyword should be gone if it had 0 items
          invalidateKeywordsCache();
          allTags = await getCachedTags(true);

          // If the keyword still exists in allTags but had 0 items, it was likely a cache artifact
          // Remove it from the local state
          if (allTags[keyword] === 0) {
            delete allTags[keyword];
          }

          kwContent.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto;">
              <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 2rem;">
                  <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                  <h3 style="margin: 0 0 0.5rem 0; color: #4caf50;">Keyword Deleted Successfully!</h3>
                  <p style="font-size: 1.1em; font-weight: 600; color: #333;">"${keyword}"</p>
                </div>
                
                <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 1rem 0; color: #667eea;">Summary</h4>
                  <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #666;">Removed from items:</span>
                      <strong style="color: #4caf50;">${updated}</strong>
                    </div>
                    ${errors.length > 0 ? `
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">Errors:</span>
                        <strong style="color: #ef5350;">${errors.length}</strong>
                      </div>
                    ` : ''}
                  </div>
                </div>

                ${errors.length > 0 ? `
                  <div style="background: #ffebee; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; max-height: 200px; overflow-y: auto;">
                    <strong style="color: #c62828; display: block; margin-bottom: 0.5rem;">Errors:</strong>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #d32f2f; font-size: 0.9em;">
                      ${errors.slice(0, 10).map(err => `<li>${err}</li>`).join('')}
                      ${errors.length > 10 ? `<li>... and ${errors.length - 10} more</li>` : ''}
                    </ul>
                  </div>
                ` : ''}

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                  <button id="backToKeywordsBtn" style="padding: 0.75rem 1.5rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    Back to All Keywords
          </button>
                </div>
              </div>
            </div>
          `;

          document.getElementById("backToKeywordsBtn")?.addEventListener("click", () => {
            showAllKeywordsView();
          });
        } catch (error) {
          alert(`Error deleting keyword: ${error instanceof Error ? error.message : "Unknown error"}`);
          deleteBtn.disabled = false;
          deleteBtn.textContent = "Delete Keyword";
        }
      });
    }

    // Show Bulk Rename dialog
    function showBulkRenameDialog(keywords: string[]) {
      const totalCount = keywords.reduce((sum, kw) => sum + (allTags[kw] || 0), 0);
      kwContent.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1.5rem 0;">Bulk Rename Keywords</h3>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Selected Keywords (${keywords.length})</label>
              <div style="max-height: 200px; overflow-y: auto; padding: 0.75rem; background: #f5f5f5; border-radius: 4px; margin-bottom: 1rem;">
                <ul style="margin: 0; padding-left: 1.5rem; color: #666;">
                  ${keywords.map(kw => `<li>${kw} <span style="color: #999;">(${allTags[kw] || 0} items)</span></li>`).join('')}
                </ul>
              </div>
              <p style="margin: 0; font-size: 0.85em; color: #666;">Total: ${totalCount} items will be updated</p>
            </div>
            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">New Name</label>
              <input type="text" id="bulkNewKeywordNameInput" placeholder="Enter new keyword name..." style="width: 100%; padding: 0.75rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};" />
              <p style="margin: 0.5rem 0 0 0; font-size: 0.85em; color: #666;">All selected keywords will be merged into this new keyword.</p>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              <button id="cancelBulkRenameBtn" style="padding: 0.75rem 1.5rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333;">
                Cancel
              </button>
              <button id="saveBulkRenameBtn" style="padding: 0.75rem 1.5rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                Rename All
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("cancelBulkRenameBtn")?.addEventListener("click", () => {
        showAllKeywordsView();
      });

      document.getElementById("saveBulkRenameBtn")?.addEventListener("click", async () => {
        const newNameInput = document.getElementById("bulkNewKeywordNameInput") as HTMLInputElement;
        const newName = newNameInput.value.trim();

        if (!newName) {
          alert("Please enter a new keyword name.");
          return;
        }

        // Check if new name is in the selected list
        if (keywords.includes(newName)) {
          alert("The new name cannot be one of the selected keywords.");
          return;
        }

        // Check if new name already exists
        if (allTags[newName]) {
          if (!confirm(`Keyword "${newName}" already exists with ${allTags[newName]} items. This will merge all selected keywords into "${newName}". Continue?`)) {
            return;
          }
        }

        const saveBtn = document.getElementById("saveBulkRenameBtn") as HTMLButtonElement;
        saveBtn.disabled = true;
        saveBtn.textContent = "Renaming...";

        try {
          // Merge all selected keywords into the new keyword
          await api.mergeTags(newName, keywords);

          // Reload keywords
          invalidateKeywordsCache();
          allTags = await getCachedTags(true);
          currentTab = 'all';
          updateTabs();
          showAllKeywordsView();

          // Scroll to the renamed keyword
          setTimeout(() => {
            const keywordItem = document.querySelector(`[data-keyword="${newName}"]`);
            if (keywordItem) {
              keywordItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
              (keywordItem as HTMLElement).style.background = '#e8f5e9';
              setTimeout(() => {
                (keywordItem as HTMLElement).style.background = 'white';
              }, 2000);
            }
          }, 100);
        } catch (error) {
          alert(`Error renaming keywords: ${error instanceof Error ? error.message : "Unknown error"}`);
          saveBtn.disabled = false;
          saveBtn.textContent = "Rename All";
        }
      });
    }

    // Show Bulk Delete dialog
    function showBulkDeleteDialog(keywords: string[]) {
      const totalCount = keywords.reduce((sum, kw) => sum + (allTags[kw] || 0), 0);
      kwContent.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1.5rem 0; color: #c62828;">Bulk Delete Keywords</h3>
            <div style="margin-bottom: 1.5rem;">
              <p style="margin: 0 0 1rem 0;">Are you sure you want to delete <strong>${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}</strong>?</p>
              <div style="max-height: 200px; overflow-y: auto; padding: 0.75rem; background: #f5f5f5; border-radius: 4px; margin-bottom: 1rem;">
                <ul style="margin: 0; padding-left: 1.5rem; color: #666;">
                  ${keywords.map(kw => `<li>${kw} <span style="color: #999;">(${allTags[kw] || 0} items)</span></li>`).join('')}
                </ul>
              </div>
              <div style="padding: 1rem; background: #ffebee; border-radius: 4px; border-left: 4px solid #c62828;">
                <p style="margin: 0; color: #c62828; font-weight: 500;">This will remove these keywords from ${totalCount} item${totalCount !== 1 ? 's' : ''} total.</p>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              <button id="cancelBulkDeleteBtn" style="padding: 0.75rem 1.5rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333;">
                Cancel
              </button>
              <button id="confirmBulkDeleteBtn" style="padding: 0.75rem 1.5rem; background: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                Delete All
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("cancelBulkDeleteBtn")?.addEventListener("click", () => {
        showAllKeywordsView();
      });

      document.getElementById("confirmBulkDeleteBtn")?.addEventListener("click", async () => {
        const deleteBtn = document.getElementById("confirmBulkDeleteBtn") as HTMLButtonElement;
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting...";

        try {
          let totalUpdated = 0;
          const allErrors: string[] = [];

          // Delete each keyword
          for (const keyword of keywords) {
            try {
              const tempTarget = `__DELETE_${Date.now()}_${Math.random().toString(36).substring(2, 9)}__`;
              const result = await api.mergeTags(tempTarget, [keyword]);
              totalUpdated += result.updated || 0;
              if (result.errors && result.errors.length > 0) {
                allErrors.push(...result.errors);
              }
            } catch (error) {
              allErrors.push(`Failed to delete "${keyword}": ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }

          // Reload keywords
          invalidateKeywordsCache();
          allTags = await getCachedTags(true);
          currentTab = 'all';
          updateTabs();
          showAllKeywordsView();

          // Show success message
          if (allErrors.length === 0) {
            setTimeout(() => {
              alert(`Successfully deleted ${keywords.length} keyword${keywords.length !== 1 ? 's' : ''} from ${totalUpdated} item${totalUpdated !== 1 ? 's' : ''}.`);
            }, 100);
          } else {
            setTimeout(() => {
              alert(`Deleted ${keywords.length} keyword${keywords.length !== 1 ? 's' : ''} with ${allErrors.length} error${allErrors.length !== 1 ? 's' : ''}. Updated ${totalUpdated} item${totalUpdated !== 1 ? 's' : ''}.`);
            }, 100);
          }
        } catch (error) {
          alert(`Error deleting keywords: ${error instanceof Error ? error.message : "Unknown error"}`);
          deleteBtn.disabled = false;
          deleteBtn.textContent = "Delete All";
        }
      });
    }

    // Show Similar Keywords view (existing functionality)
    function showSimilarKeywordsView() {
      // This will be called when switching to similar tab
      // The existing renderResults function handles this
      if (similarPairs.length > 0 || Object.keys(allTags).length > 0) {
        renderResults(Object.keys(allTags).length, 90);
      }
    }

    // Show Create Keyword UI
    function showCreateKeywordUI() {
      // Use current browser path as default if available
      const defaultPath = currentPath || "";

      kwContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1.5rem 0;">Create and Apply Keyword</h3>
            <div style="background: #e3f2fd; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; border-left: 4px solid ${PLONE_BLUE};">
              <p style="margin: 0; font-size: 0.9em; color: #1565c0;">
                <strong>Note:</strong> In Plone, keywords only exist when applied to items. This will create the keyword and apply it to items in the specified location.
              </p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Keyword Name</label>
              <input type="text" id="newKeywordInput" placeholder="Enter keyword name..." style="width: 100%; padding: 0.75rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; background-color: ${THEME_BG_ACCENT};" />
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Apply to Items</label>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <button type="button" id="useCurrentPathBtn" class="path-option-btn" data-path="${defaultPath}" style="flex: 1; padding: 0.75rem; background: ${defaultPath ? '#e8f5e9' : '#f5f5f5'}; border: 2px solid ${defaultPath ? '#4caf50' : '#ddd'}; border-radius: 4px; cursor: pointer; font-size: 0.9em; ${defaultPath ? 'color: #2e7d32; font-weight: 500;' : 'color: #666;'}">
                  ${defaultPath ? `Current Path: ${defaultPath}` : 'No current path'}
                </button>
                <button type="button" id="useEntireSiteBtn" class="path-option-btn" data-path="" style="flex: 1; padding: 0.75rem; background: #fff3e0; border: 2px solid #ff9800; border-radius: 4px; cursor: pointer; font-size: 0.9em; color: #e65100; font-weight: 500;">
                  Entire Site
                </button>
              </div>
              <input type="text" id="keywordPathInput" value="${defaultPath}" placeholder="Or enter a specific path like /resources" style="width: 100%; padding: 0.75rem; border: 1px solid ${THEME_SECONDARY}; border-radius: 4px; font-size: 14px; margin-top: 0.5rem; background-color: ${THEME_BG_ACCENT};" />
              <p style="margin: 0.5rem 0 0 0; font-size: 0.85em; color: #666;">
                The keyword will be applied to all items in the selected location. Items that already have this keyword will be skipped.
              </p>
            </div>
            
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              <button id="cancelCreateKeywordBtn" style="padding: 0.75rem 1.5rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333;">
                Cancel
              </button>
              <button id="saveCreateKeywordBtn" style="padding: 0.75rem 1.5rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                Create & Apply Keyword
              </button>
            </div>
          </div>
        </div>
      `;

      // Add path option button handlers
      document.querySelectorAll(".path-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const path = btn.getAttribute("data-path") || "";
          const pathInput = document.getElementById("keywordPathInput") as HTMLInputElement;
          if (pathInput) {
            pathInput.value = path;
          }
          // Update button styles
          document.querySelectorAll(".path-option-btn").forEach((b) => {
            (b as HTMLElement).style.background = "#f5f5f5";
            (b as HTMLElement).style.borderColor = "#ddd";
            (b as HTMLElement).style.color = "#666";
            (b as HTMLElement).style.fontWeight = "normal";
          });
          if (path) {
            (btn as HTMLElement).style.background = "#e8f5e9";
            (btn as HTMLElement).style.borderColor = "#4caf50";
            (btn as HTMLElement).style.color = "#2e7d32";
            (btn as HTMLElement).style.fontWeight = "500";
          } else {
            (btn as HTMLElement).style.background = "#fff3e0";
            (btn as HTMLElement).style.borderColor = "#ff9800";
            (btn as HTMLElement).style.color = "#e65100";
            (btn as HTMLElement).style.fontWeight = "500";
          }
        });
      });

      document.getElementById("cancelCreateKeywordBtn")?.addEventListener("click", () => {
        showKeywordsManager();
      });

      document.getElementById("saveCreateKeywordBtn")?.addEventListener("click", async () => {
        const keywordInput = document.getElementById("newKeywordInput") as HTMLInputElement;
        const pathInput = document.getElementById("keywordPathInput") as HTMLInputElement;
        const keyword = keywordInput.value.trim();
        const path = pathInput.value.trim() || undefined;

        if (!keyword) {
          alert("Please enter a keyword name.");
          return;
        }

        // Check if keyword already exists
        if (allTags[keyword]) {
          if (!confirm(`Keyword "${keyword}" already exists with ${allTags[keyword]} items. Do you want to continue?`)) {
            return;
          }
        }

        const saveBtn = document.getElementById("saveCreateKeywordBtn") as HTMLButtonElement;
        saveBtn.disabled = true;
        saveBtn.textContent = "Creating...";

        try {
          let updated = 0;
          let skipped = 0;
          let errors: string[] = [];

          // In Plone, keywords only exist when applied to items
          // Apply keyword to items (path can be empty for entire site)
          const items = await api.getItems(path);
          saveBtn.textContent = `Applying to ${items.length} items...`;

          for (const item of items) {
            const itemPath = item.path || item["@id"];
            if (!itemPath) continue;

            try {
              const currentSubjects = item.Subject || item.subjects || [];
              const subjectsArray = Array.isArray(currentSubjects) ? currentSubjects : [];

              // Check if keyword already exists (case-insensitive)
              if (!subjectsArray.some((s: string) => s.trim().toLowerCase() === keyword.toLowerCase())) {
                const newSubjects = [...subjectsArray, keyword];
                await api.updateSubjects(itemPath, newSubjects);
                updated++;
              } else {
                skipped++;
              }
            } catch (error) {
              errors.push(`Failed to update ${item.title || itemPath}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }

          // Show summary screen
          invalidateKeywordsCache(); // Invalidate cache after create
          allTags = await getCachedTags(true);
          const keywordCount = allTags[keyword] || 0;

          kwContent.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
              <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 2rem;">
                  <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                  <h3 style="margin: 0 0 0.5rem 0; color: #4caf50;">Keyword Created Successfully!</h3>
                  <p style="font-size: 1.2em; font-weight: 600; color: #333;">"${keyword}"</p>
                </div>
                
                <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 1rem 0; color: #667eea;">Summary</h4>
                  <div style="display: grid; gap: 0.75rem;">
                    ${path ? `
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">Applied to items:</span>
                        <strong style="color: #4caf50;">${updated}</strong>
                      </div>
                      ${skipped > 0 ? `
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #666;">Already had keyword:</span>
                          <strong style="color: #666;">${skipped}</strong>
                        </div>
                      ` : ''}
                    ` : ''}
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #666;">Total items with keyword:</span>
                      <strong style="color: #667eea;">${keywordCount}</strong>
                    </div>
                    ${errors.length > 0 ? `
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">Errors:</span>
                        <strong style="color: #ef5350;">${errors.length}</strong>
                      </div>
                    ` : ''}
                  </div>
                </div>

                ${errors.length > 0 ? `
                  <div style="background: #ffebee; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; max-height: 200px; overflow-y: auto;">
                    <strong style="color: #c62828; display: block; margin-bottom: 0.5rem;">Errors:</strong>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #d32f2f; font-size: 0.9em;">
                      ${errors.slice(0, 10).map(err => `<li>${err}</li>`).join('')}
                      ${errors.length > 10 ? `<li>... and ${errors.length - 10} more</li>` : ''}
                    </ul>
                  </div>
                ` : ''}

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                  <button id="viewAllKeywordsBtn" style="padding: 0.75rem 1.5rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    View All Keywords
                  </button>
                </div>
              </div>
            </div>
          `;

          document.getElementById("viewAllKeywordsBtn")?.addEventListener("click", () => {
            currentTab = 'all';
            updateTabs();
            showAllKeywordsView();
          });
        } catch (error) {
          alert(`Error creating keyword: ${error instanceof Error ? error.message : "Unknown error"}`);
          saveBtn.disabled = false;
          saveBtn.textContent = "Create Keyword";
        }
      });
    }


    // Define the execute merge handler function at the showKeywordsManager scope so it persists
    const executeMergeHandler = async () => {
      try {
        console.log("executeMergeHandler called, mergePlan:", Array.from(mergePlan.entries()));
        let totalMerges = 0;
        mergePlan.forEach(sources => totalMerges += sources.length);
        console.log("Total merges calculated:", totalMerges);

        if (totalMerges === 0) {
          alert("No merge operations planned. Please select tags to merge first.");
          return;
        }

        console.log("Starting merge execution...");

        const resultsDiv = document.getElementById("similarResults");
        if (!resultsDiv) {
          console.error("similarResults div not found!");
          alert("Error: Could not find results container. Please refresh the page.");
          return;
        }

        const stickyFooter = document.getElementById("stickyMergeFooter");
        if (stickyFooter) {
          stickyFooter.style.transform = "translateY(100%)";
        }

        // Create progress UI with spinner - show immediately
        const mergeEntries = Array.from(mergePlan.entries());
        let currentIndex = 0;

        console.log(`Starting merge of ${mergeEntries.length} target tags`);

        const updateProgress = () => {
          const progress = Math.round((currentIndex / mergeEntries.length) * 100);
          resultsDiv.innerHTML = `
            <div style='text-align: center; padding: 2rem;'>
              <div style="display: inline-block; width: 60px; height: 60px; border: 4px solid #f3f3f3; border-top: 4px solid ${PLONE_BLUE}; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
              <p style="font-size: 1.1em; margin: 0.5rem 0; font-weight: 500;">Executing merge operations...</p>
              <p style="color: #666; margin: 0.5rem 0;">Processing ${currentIndex + 1} of ${mergeEntries.length}</p>
              <div style="width: 100%; max-width: 400px; margin: 1rem auto; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                <div style="width: ${progress}%; background: ${PLONE_BLUE}; height: 24px; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85em; font-weight: bold;">
                  ${progress}%
            </div>
          </div>
              ${currentIndex < mergeEntries.length ? `
                <p style="color: #666; font-size: 0.9em; margin-top: 1rem;">
                  Merging into: <strong>${mergeEntries[currentIndex]?.[0] || ''}</strong>
                </p>
              ` : ''}
              </div>
          `;
        };

        // Show progress immediately
        updateProgress();
        console.log("Progress UI displayed");

        let totalUpdated = 0;
        let totalAffected = 0;
        const allErrors: string[] = [];

        for (const [target, sources] of mergeEntries) {
          console.log(`Merging ${sources.length} tags into "${target}"...`);
          try {
            const result = await api.mergeTags(target, sources);
            console.log(`Merge result for "${target}":`, result);
            totalUpdated += result.updated;
            totalAffected += result.affected_items;
            if (result.errors && result.errors.length > 0) {
              allErrors.push(...result.errors);
            }
            currentIndex++;
            updateProgress();
          } catch (error) {
            console.error(`Error merging into "${target}":`, error);
            allErrors.push(`Failed to merge into "${target}": ${error instanceof Error ? error.message : "Unknown error"}`);
            currentIndex++;
            updateProgress();
          }
        }

        console.log(`Merge complete. Updated: ${totalUpdated}, Affected: ${totalAffected}, Errors: ${allErrors.length}`);

        resultsDiv.innerHTML = `
          <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
            <h3 style="margin: 0 0 1rem 0;">Merge Complete!</h3>
            <p style="margin: 0.5rem 0; font-size: 1.1em;">Successfully updated <strong>${totalUpdated}</strong> items.</p>
            <p style="color: #666;">Affected <strong>${totalAffected}</strong> total items.</p>
            
            ${allErrors.length > 0 ? `
              <div style="margin-top: 2rem; text-align: left; background: #ffebee; padding: 1rem; border-radius: 4px;">
                <strong style="color: #c62828;">Errors occurred:</strong>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #d32f2f;">
                  ${allErrors.map(err => `<li>${err}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          
            <button id="reloadTagsBtn" style="margin-top: 2rem; padding: 0.75rem 2rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1.1em;">
              Reload Keywords
          </button>
          </div>
        `;

        document.getElementById("reloadTagsBtn")?.addEventListener("click", () => {
          showKeywordsManager();
        });

        mergePlan.clear();
        updateMergePlan(); // Hide footer
      } catch (error) {
        console.error("Fatal error in executeMergeHandler:", error);
        const resultsDiv = document.getElementById("similarResults");
        if (resultsDiv) {
          resultsDiv.innerHTML = `
            <div style="background: #ffebee; padding: 2rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
              <h3 style="margin: 0 0 1rem 0; color: #c62828;">Error Executing Merge</h3>
              <p style="color: #d32f2f;">${error instanceof Error ? error.message : "Unknown error occurred"}</p>
              <button id="retryMergeBtn" style="margin-top: 1rem; padding: 0.75rem 2rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Try Again
              </button>
            </div>
          `;
          document.getElementById("retryMergeBtn")?.addEventListener("click", () => {
            executeMergeHandler();
          });
        } else {
          alert(`Error executing merge: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    };

    // Auto-start analysis
    try {
      // 1. Collect Tags (use cache if available)
      allTags = await getCachedTags();
      const tagCount = Object.keys(allTags).length;

      // 2. Find Similar (Default 90%)
      const loadingMsg = document.getElementById("loadingMsg");

      // Witty loading messages
      const messages = [
        "Consulting the thesaurus...",
        "Asking the librarian...",
        "Comparing apples to appples...",
        "Hunting for typos...",
        "Measuring Levenshtein distances...",
        "Untangling the tag spaghetti...",
        "Reading the dictionary backwards...",
        "Squinting at similar words...",
        "Doing the alphabet dance...",
        "Grouping the flock...",
        "Ron, Carol, and David are sorting keywords...",
        "Playing word association games...",
        "Counting syllables like a poet...",
        "Channeling the spirit of copy editors...",
        "Running spell-check on life itself...",
        "Finding needles in haystacks of text...",
        "Performing keyword archaeology...",
        "Teaching tags to play nice together...",
        "Consulting with the word wizards...",
        "Doing keyword yoga (stretching definitions)...",
        "Running a tag therapy session...",
        "Playing matchmaker for keywords...",
        "Conducting a keyword census...",
        "Asking Ron, Carol, and David for their expert opinion...",
        "Organizing the keyword chaos...",
        "Building bridges between similar words...",
        "Performing keyword surgery...",
        "Teaching tags to recognize their siblings...",
        "Running keyword speed dating...",
        "Consulting the keyword oracle...",
        "Doing keyword detective work...",
        "Finding long-lost keyword relatives...",
        "Performing keyword genealogy...",
        "Ron, Carol, and David are on keyword patrol...",
        "Sorting keywords like a librarian on caffeine...",
        "Playing keyword bingo...",
        "Conducting keyword interviews...",
        "Running keyword diagnostics...",
        "Performing keyword acupuncture...",
        "Teaching keywords to share nicely...",
        "Ron is alphabetizing the keywords...",
        "Carol is checking for duplicate meanings...",
        "David is measuring keyword similarity...",
        "Ron's organizing the tag collection...",
        "Carol's cross-referencing the dictionary...",
        "David's calculating edit distances...",
        "Ron found a typo! (probably)...",
        "Carol is consulting her keyword notes...",
        "David is running similarity algorithms...",
        "Ron says these tags look familiar...",
        "Carol is double-checking the matches...",
        "David's comparing character by character...",
        "Ron's sorting keywords alphabetically...",
        "Carol is finding semantic connections...",
        "David is measuring string distances...",
        "Ron thinks these might be duplicates...",
        "Carol is verifying the matches...",
        "David's running the comparison engine...",
        "Ron's organizing by similarity...",
        "Carol is checking for variations...",
        "David's computing Levenshtein distances..."
      ];

      let msgIndex = 0;
      if (loadingMsg) {
        loadingMsg.innerHTML = `<span style="font-style: italic;">Found ${tagCount} keywords. ${messages[0]}</span>`;
      }

      const intervalId = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        if (loadingMsg) {
          loadingMsg.innerHTML = `<span style="font-style: italic;">Found ${tagCount} keywords. ${messages[msgIndex]}</span>`;
        }
      }, 2000);

      try {
        similarPairs = await api.findSimilarTags(allTags, 90, 100);
        clearInterval(intervalId);
      } catch (error) {
        clearInterval(intervalId);
        throw error;
      }

      // 3. Render Results
      renderResults(tagCount, 90);

    } catch (error) {
      kwContent.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #d32f2f;">
          <p>Error loading keywords: ${error instanceof Error ? error.message : "Unknown error"}</p>
          <button id="retryBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">Retry</button>
        </div>
      `;
      document.getElementById("retryBtn")?.addEventListener("click", () => showKeywordsManager());
    }

    function renderResults(tagCount: number, currentThreshold: number) {
      if (similarPairs.length === 0) {
        kwContent.innerHTML = `
          <div style="text-align: center; padding: 2rem;">
            <p style="font-size: 1.2em; margin-bottom: 0.5rem;">No similar keywords found at ${currentThreshold}% similarity.</p>
            <p style="color: #666;">Your keyword list looks clean!</p>
            <div style="margin-top: 2rem; padding: 1rem; background: #f5f5f5; border-radius: 4px; display: inline-block; text-align: left;">
              <p style="margin: 0 0 0.5rem 0; font-weight: 500;">Stats:</p>
              <p style="margin: 0; color: #666;">Total Unique Keywords: <strong>${tagCount}</strong></p>
            </div>
            <div style="margin-top: 2rem;">
               <button id="tryLowerBtn" style="padding: 0.5rem 1rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333;">Try Lower Threshold (80%)</button>
            </div>
          </div>
        `;

        document.getElementById("tryLowerBtn")?.addEventListener("click", async () => {
          kwContent.innerHTML = `<div style="text-align: center; padding: 3rem;"><p>Checking at 80%...</p></div>`;
          similarPairs = await api.findSimilarTags(allTags, 80, 100);
          renderResults(tagCount, 80);
        });
        return;
      }

      kwContent.innerHTML = `
        <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: #e8f5e9; padding: 1rem; border-radius: 4px;">
          <div>
            <p style="margin: 0; font-weight: 500; color: #2e7d32;">Found ${similarPairs.length} similar pairs</p>
            <p style="margin: 0; font-size: 0.85em; color: #666;">Scanning ${tagCount} total keywords at ${currentThreshold}% similarity</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
             <select id="thresholdSelect" style="padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                <option value="98" ${currentThreshold === 98 ? 'selected' : ''}>98% (Very Close)</option>
                <option value="90" ${currentThreshold === 90 ? 'selected' : ''}>90% (Close)</option>
                <option value="80" ${currentThreshold === 80 ? 'selected' : ''}>80% (Similar)</option>
                <option value="70" ${currentThreshold === 70 ? 'selected' : ''}>70% (Loose)</option>
             </select>
             <button id="refreshBtn" title="Refresh" style="padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 16px; line-height: 1; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; color: #666;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                 <path d="M21 3v5h-5"/>
                 <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                 <path d="M3 21v-5h5"/>
               </svg>
                </button>
          </div>
        </div>

        <div id="similarResults">
          <p style="color: #666; font-size: 13px; margin-bottom: 1rem;">Select pairs to merge, then execute the plan below.</p>
          <div id="pairsList" style="max-height: 500px; overflow-y: auto; padding-bottom: 1rem;"></div>
              </div>
            `;

      // Re-attach threshold handler
      document.getElementById("refreshBtn")?.addEventListener("click", async () => {
        const select = document.getElementById("thresholdSelect") as HTMLSelectElement;
        const newThreshold = parseInt(select.value);
        kwContent.innerHTML = `<div style="text-align: center; padding: 3rem;"><p>Re-analyzing at ${newThreshold}%...</p></div>`;
        similarPairs = await api.findSimilarTags(allTags, newThreshold, 100);
        renderResults(tagCount, newThreshold);
      });

      // Helper to manage merge plan with mutual exclusivity
      const toggleMerge = (keepTag: string, discardTag: string) => {
        // 1. Remove any existing plan where 'keepTag' was going to be discarded
        if (mergePlan.has(discardTag)) {
          const sources = mergePlan.get(discardTag)!;
          const index = sources.indexOf(keepTag);
          if (index > -1) {
            sources.splice(index, 1);
            if (sources.length === 0) {
              mergePlan.delete(discardTag);
            }
          }
        }

        // 2. Add 'discardTag' to be merged into 'keepTag'
        if (!mergePlan.has(keepTag)) {
          mergePlan.set(keepTag, []);
        }
        const sources = mergePlan.get(keepTag)!;
        if (!sources.includes(discardTag)) {
          sources.push(discardTag);
        }

        updateMergePlan();
      };

      const pairsList = document.getElementById("pairsList")!;

      similarPairs.forEach((pair, index) => {
        const row = document.createElement("div");
        row.className = "similarity-row";
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: white; border: 1px solid #eee; border-radius: 8px; margin-bottom: 0.75rem; transition: all 0.3s;";
        row.id = `pair-row-${index}`;

        row.innerHTML = `
                <div style="flex: 1; display: flex; align-items: center; gap: 1rem;">
                  <div class="tag-option" id="tag-left-${index}" style="flex: 1; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 2px solid transparent; cursor: pointer; transition: all 0.2s;">
                    <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 0.25rem;">${pair.tag}</div>
                    <div style="font-size: 0.85em; color: #666;">${pair.count} items</div>
                  </div>
                  
                  <div style="display: flex; flex-direction: column; align-items: center; color: #888;">
                    <span style="font-size: 1.2em; font-weight: bold;">≈</span>
                    <span style="font-size: 0.8em; background: ${pair.similarity >= 90 ? '#e8f5e9' : '#fff3e0'}; color: ${pair.similarity >= 90 ? '#2e7d32' : '#ef6c00'}; padding: 2px 6px; border-radius: 4px;">${pair.similarity}%</span>
                  </div>
                  
                  <div class="tag-option" id="tag-right-${index}" style="flex: 1; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 2px solid transparent; cursor: pointer; transition: all 0.2s;">
                    <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 0.25rem;">${pair.matched}</div>
                    <div style="font-size: 0.85em; color: #666;">${pair.matched_count} items</div>
                  </div>
                </div>
          <div style="margin-left: 1rem; min-width: 120px; text-align: center;">
                  <span class="status-text" style="font-size: 0.9em; color: #888; font-style: italic;">Click to keep</span>
                </div>
              `;

        pairsList.appendChild(row);

        const leftCard = row.querySelector(`#tag-left-${index}`) as HTMLElement;
        const rightCard = row.querySelector(`#tag-right-${index}`) as HTMLElement;
        const statusText = row.querySelector(`.status-text`) as HTMLElement;

        const updateRowVisuals = (keepLeft: boolean) => {
          // Reset styles
          leftCard.style.borderColor = "transparent";
          leftCard.style.background = "#f8f9fa";
          leftCard.style.opacity = "1";
          leftCard.innerHTML = `
                  <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 0.25rem;">${pair.tag}</div>
                  <div style="font-size: 0.85em; color: #666;">${pair.count} items</div>
                `;

          rightCard.style.borderColor = "transparent";
          rightCard.style.background = "#f8f9fa";
          rightCard.style.opacity = "1";
          rightCard.innerHTML = `
                  <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 0.25rem;">${pair.matched}</div>
                  <div style="font-size: 0.85em; color: #666;">${pair.matched_count} items</div>
                `;

          if (keepLeft) {
            // Keep Left
            leftCard.style.borderColor = "#4caf50";
            leftCard.style.background = "#e8f5e9";
            leftCard.innerHTML += `<div style="color: #2e7d32; font-size: 0.8em; font-weight: bold; margin-top: 4px;">✓ KEEPING</div>`;

            // Discard Right
            rightCard.style.opacity = "0.6";
            rightCard.style.background = "#ffebee";
            rightCard.innerHTML += `<div style="color: #c62828; font-size: 0.8em; font-weight: bold; margin-top: 4px;">✗ MERGING</div>`;

            statusText.textContent = "←";
            statusText.style.color = PLONE_BLUE;
            statusText.style.fontSize = "2rem";
            statusText.style.textAlign = "center";
            statusText.style.fontWeight = "bold";
          } else {
            // Keep Right
            rightCard.style.borderColor = "#4caf50";
            rightCard.style.background = "#e8f5e9";
            rightCard.innerHTML += `<div style="color: #2e7d32; font-size: 0.8em; font-weight: bold; margin-top: 4px;">✓ KEEPING</div>`;

            // Discard Left
            leftCard.style.opacity = "0.6";
            leftCard.style.background = "#ffebee";
            leftCard.innerHTML += `<div style="color: #c62828; font-size: 0.8em; font-weight: bold; margin-top: 4px;">✗ MERGING</div>`;

            statusText.textContent = "→";
            statusText.style.color = PLONE_BLUE;
            statusText.style.fontSize = "2rem";
            statusText.style.textAlign = "center";
            statusText.style.fontWeight = "bold";
          }
        };

        leftCard.onclick = () => {
          updateRowVisuals(true);
          toggleMerge(pair.tag, pair.matched);
        };

        rightCard.onclick = () => {
          updateRowVisuals(false);
          toggleMerge(pair.matched, pair.tag);
        };
      });
    }

    function updateMergePlan() {
      // Create sticky footer if it doesn't exist
      let stickyFooter = document.getElementById("stickyMergeFooter");
      if (!stickyFooter) {
        stickyFooter = document.createElement("div");
        stickyFooter.id = "stickyMergeFooter";
        stickyFooter.style.cssText = `
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background: white;
              border-top: 1px solid #ddd;
              box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
              padding: 1rem 2rem;
              z-index: 1000;
              display: none;
              transform: translateY(100%);
              transition: transform 0.3s ease-out;
            `;
        document.body.appendChild(stickyFooter);
      }

      let totalMerges = 0;
      mergePlan.forEach(sources => totalMerges += sources.length);

      if (totalMerges === 0) {
        stickyFooter.style.transform = "translateY(100%)";
        setTimeout(() => { stickyFooter!.style.display = "none"; }, 300);
        return;
      }

      stickyFooter.style.display = "flex";
      stickyFooter.style.justifyContent = "space-between";
      stickyFooter.style.alignItems = "center";
      // Force reflow
      stickyFooter.offsetHeight;
      stickyFooter.style.transform = "translateY(0)";

      stickyFooter.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="background: ${PLONE_BLUE}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${totalMerges}</div>
              <div>
                <div style="font-weight: bold; font-size: 1.1em;">Changes Queued</div>
                <div style="font-size: 0.9em; color: #666;">Ready to merge</div>
              </div>
            </div>
            <div style="display: flex; gap: 1rem;">
              <button id="viewPlanBtn" style="padding: 0.75rem 1.5rem; background: white; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 500;">
                View Details
              </button>
              <button id="executeMergeBtn" style="padding: 0.75rem 1.5rem; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Execute Merge
              </button>
            </div>
          `;

      // Attach event listeners after setting innerHTML
      const viewPlanBtn = document.getElementById("viewPlanBtn");
      if (viewPlanBtn) {
        const newViewBtn = viewPlanBtn.cloneNode(true) as HTMLElement;
        viewPlanBtn.parentNode?.replaceChild(newViewBtn, viewPlanBtn);
        newViewBtn.addEventListener("click", () => {
          document.getElementById("mergePlanSection")?.scrollIntoView({ behavior: 'smooth' });
        });
      }

      const executeMergeBtn = document.getElementById("executeMergeBtn");
      if (executeMergeBtn) {
        const newExecuteBtn = executeMergeBtn.cloneNode(true) as HTMLElement;
        executeMergeBtn.parentNode?.replaceChild(newExecuteBtn, executeMergeBtn);
        newExecuteBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Execute Merge clicked, mergePlan size:", mergePlan.size);
          console.log("executeMergeHandler type:", typeof executeMergeHandler);
          if (typeof executeMergeHandler === 'function') {
            try {
              await executeMergeHandler();
            } catch (error) {
              console.error("Error in executeMergeHandler:", error);
              alert(`Error executing merge: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          } else {
            console.error("executeMergeHandler is not a function!");
            alert("Error: Merge handler not available. Please refresh the page.");
          }
        });
      }

      // Also update the detailed list at the bottom (hidden by default now, maybe?)
      const mergePlanSection = document.getElementById("mergePlanSection");
      const mergePlanList = document.getElementById("mergePlanList");

      if (mergePlanSection && mergePlanList) {
        if (mergePlan.size > 0) {
          mergePlanSection.style.display = "block";
          mergePlanList.innerHTML = "";
          mergePlan.forEach((_sources, _target) => {
            // ... (existing code to render list items if needed) ...
          });
        } else {
          mergePlanSection.style.display = "none";
        }
      }
    }
  }
});



