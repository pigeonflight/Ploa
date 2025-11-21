import "./style.css";
import * as api from "./lib/api";
import { invoke } from "@tauri-apps/api/core";

// Plone brand color
const PLONE_BLUE = "#0283be";

// Wait for DOM and Tauri to be ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div style="padding: 2rem; height: 100%; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <header style="border-bottom: 2px solid rgba(2, 131, 190, 0.4); padding: 0.5rem 0; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
      <img src="/icons/plone-logo.png" alt="Plone" style="height: 28px;" />
      <div id="userStatus" style="display: flex; align-items: center; gap: 1rem;">
        <span id="statusText" style="color: #666; font-size: 14px;">Not connected</span>
        <button id="headerLoginBtn" style="display: none; padding: 0.25rem 0.75rem; background: transparent; border: 1px solid ${PLONE_BLUE}; color: ${PLONE_BLUE}; border-radius: 4px; cursor: pointer; font-size: 14px;">
          Login
        </button>
        <button id="disconnectBtn" style="display: none; padding: 0.25rem 0.75rem; background: transparent; border: 1px solid #d32f2f; color: #d32f2f; border-radius: 4px; cursor: pointer; font-size: 14px;">
          Disconnect
        </button>
      </div>
    </header>
    <main style="flex: 1; overflow: auto;">
      <div id="content">
        <div id="login-form" style="max-width: 500px; margin: 2rem auto;">
          <h2>Connect to Plone Site</h2>
          <form id="loginForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label for="baseUrl" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Base URL:</label>
              <input 
                type="text" 
                id="baseUrl" 
                name="baseUrl" 
                list="urlHistory"
                placeholder="https://demo.plone.org/++api++/"
                value="https://demo.plone.org/++api++/"
                style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
              />
              <datalist id="urlHistory"></datalist>
              <div id="credentialsHint" style="display: none; margin-top: 0.5rem; padding: 0.5rem; background: #e3f2fd; border-radius: 4px; font-size: 13px; color: #0d47a1;">
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
                  style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                />
              </div>
              <div>
                <label for="password" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Password:</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="admin"
                  style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                />
              </div>
            </div>

            <div style="display: flex; gap: 1rem;">
              <button 
                type="submit" 
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
          </form>
          <div id="error" style="margin-top: 1rem; color: #d32f2f; display: none;"></div>
        </div>

        <div id="app-content" style="display: none;">
          <div id="browser" style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
              <button id="backBtn" style="padding: 0.5rem 1rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333;">
                ← Up
              </button>
              <button id="browseBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Browse Root
              </button>
              <button id="keywordsBtn" style="padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🏷️ Keywords Manager
              </button>
              <span id="currentPath" style="color: #666; font-family: monospace;">/</span>
            </div>
            <div id="itemsList" style="border: 1px solid #ddd; border-radius: 4px; padding: 1rem; min-height: 200px; background: #f9f9f9;">
              <p style="color: #666;">Click "Browse Root" to load items</p>
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
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        #incrementic-credit:hover {
          opacity: 1;
        }
        #incrementic-credit img {
          height: 12px;
          width: auto;
          opacity: 0.6;
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
      </span>
    </footer>
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
  const itemsList = document.querySelector<HTMLDivElement>("#itemsList")!;
  const currentPathSpan = document.querySelector<HTMLSpanElement>("#currentPath")!;
  const statusText = document.querySelector<HTMLSpanElement>("#statusText")!;
  const headerLoginBtn = document.querySelector<HTMLButtonElement>("#headerLoginBtn")!;
  const disconnectBtn = document.querySelector<HTMLButtonElement>("#disconnectBtn")!;
  const baseUrlInput = document.querySelector<HTMLInputElement>("#baseUrl")!;
  const usernameInput = document.querySelector<HTMLInputElement>("#username")!;
  const passwordInput = document.querySelector<HTMLInputElement>("#password")!;
  const errorDiv = document.querySelector<HTMLDivElement>("#error")!;
  const urlHistory = document.querySelector<HTMLDataListElement>("#urlHistory")!;
  const credentialsHint = document.querySelector<HTMLDivElement>("#credentialsHint")!;
  const incrementicCredit = document.querySelector<HTMLSpanElement>("#incrementic-credit")!;

  // Handle Incrementic credit link
  incrementicCredit.addEventListener("click", async () => {
    try {
      await invoke("plugin:shell|open", { path: "https://incrementic.com" });
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  });

  // State
  let currentBaseUrl = "";
  let currentPath = "";

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

  // Helper to update auth state UI
  function updateAuthState(loggedIn: boolean, username?: string) {
    if (loggedIn) {
      loginForm.style.display = "none";
      appContent.style.display = "block";
      statusText.textContent = `Connected as ${username || "Anonymous"}`;
      statusText.style.color = "#4caf50";
      headerLoginBtn.style.display = "none";
      disconnectBtn.style.display = "block";
    } else {
      loginForm.style.display = "block";
      appContent.style.display = "none";
      statusText.textContent = "Not connected";
      statusText.style.color = "#666";
      headerLoginBtn.style.display = "none"; // Only show when connected anonymously? No, standard login
      disconnectBtn.style.display = "none";
    }
  }

  // Login handler
  loginSubmitBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const baseUrl = baseUrlInput.value.replace(/\/$/, "");
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!baseUrl) {
      errorDiv.textContent = "Base URL is required";
      errorDiv.style.display = "block";
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
    }
  });

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

  // Browse button handler
  browseBtn.addEventListener("click", async () => {
    console.log("Browse button clicked, currentPath:", currentPath);
    try {
      itemsList.innerHTML = "<p>Loading...</p>";
      console.log("Calling api.getItems with path:", currentPath || undefined);
      const items = await api.getItems(currentPath || undefined);
      console.log("Received items:", items);

      if (items.length === 0) {
        itemsList.innerHTML = "<p style='color: #666;'>No items found</p>";
        return;
      }

      // Clear list
      itemsList.innerHTML = "";

      items.forEach((item) => {
        const isFolder = item.is_folderish || item['@type'] === 'Folder';
        const icon = isFolder ? "📁" : "📄";

        const li = document.createElement("div");
        li.style.padding = "0.75rem";
        li.style.borderBottom = "1px solid #eee";
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.justifyContent = "space-between";
        li.style.cursor = "pointer";
        li.style.transition = "background-color 0.2s";

        li.onmouseover = () => { li.style.backgroundColor = "#f5f5f5"; };
        li.onmouseout = () => { li.style.backgroundColor = "transparent"; };

        // Main click area (navigate or view)
        const mainContent = document.createElement("div");
        mainContent.style.display = "flex";
        mainContent.style.alignItems = "center";
        mainContent.style.flex = "1";

        const iconSpan = document.createElement("span");
        iconSpan.style.marginRight = "0.5rem";
        iconSpan.style.fontSize = "1.2rem";
        iconSpan.textContent = icon;

        const textDiv = document.createElement("div");
        const titleDiv = document.createElement("div");
        titleDiv.style.fontWeight = "500";
        titleDiv.textContent = item.title || extractItemId(item) || "Untitled";
        const typeDiv = document.createElement("div");
        typeDiv.style.fontSize = "0.8rem";
        typeDiv.style.color = "#666";
        typeDiv.textContent = item['@type'] || item.type || "Unknown";

        textDiv.appendChild(titleDiv);
        textDiv.appendChild(typeDiv);
        mainContent.appendChild(iconSpan);
        mainContent.appendChild(textDiv);

        // Info button for details/tags (especially for folders)
        const infoBtn = document.createElement("button");
        infoBtn.innerHTML = "ℹ️";
        infoBtn.title = "View Details & Tags";
        infoBtn.style.background = "none";
        infoBtn.style.border = "none";
        infoBtn.style.cursor = "pointer";
        infoBtn.style.padding = "0.5rem";
        infoBtn.style.borderRadius = "50%";
        infoBtn.style.fontSize = "1.1rem";
        infoBtn.style.marginLeft = "0.5rem";
        infoBtn.style.opacity = "0.6";
        infoBtn.onmouseover = () => {
          infoBtn.style.backgroundColor = "#e0e0e0";
          infoBtn.style.opacity = "1";
        };
        infoBtn.onmouseout = () => {
          infoBtn.style.backgroundColor = "transparent";
          infoBtn.style.opacity = "0.6";
        };

        // Handle info button click - always show details
        infoBtn.onclick = async (e) => {
          e.stopPropagation(); // Prevent row click
          itemsList.innerHTML = "<p>Loading...</p>";
          try {
            const itemId = extractItemId(item);
            const objectPath = currentPath ? `${currentPath}/${itemId}` : itemId;
            const objectData = await api.fetch(objectPath);
            showObjectDetails(objectData);
          } catch (error) {
            console.error("Error fetching object details:", error);
            itemsList.innerHTML = `<p style='color: #d32f2f;'>Error loading details: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
          }
        };

        // Handle row click - navigate if folder, show details if not
        mainContent.onclick = async () => {
          const itemId = extractItemId(item);
          if (isFolder) {
            // It's a folderish item, navigate into it
            const newPath = currentPath ? `${currentPath}/${itemId}` : itemId;
            await loadItems(newPath);
          } else {
            // It's a leaf node, fetch full object to check if it has items (smart container check)
            try {
              const objectPath = currentPath ? `${currentPath}/${itemId}` : itemId;
              const objectData = await api.fetch(objectPath);

              if (objectData.items && Array.isArray(objectData.items) && objectData.items.length > 0) {
                // It has items, treat as container
                await loadItems(objectPath);
              } else {
                // Show details
                showObjectDetails(objectData);
              }
            } catch (error) {
              console.error("Error fetching object details:", error);
            }
          }
        };

        li.appendChild(mainContent);
        li.appendChild(infoBtn);
        itemsList.appendChild(li);
      });
      // End of items.forEach loop

    } catch (error) {
      console.error("Error in browse button handler:", error);
      itemsList.innerHTML = `<p style='color: #d32f2f;'>Error loading items: ${error instanceof Error ? error.message : "Unknown error"}</p>`;
      console.error("Error browsing:", error);
    }
  });

  // Back button handler
  backBtn.addEventListener("click", async () => {
    if (currentPath) {
      const pathParts = currentPath.split("/");
      pathParts.pop(); // Remove last segment
      const newPath = pathParts.join("/");
      await loadItems(newPath);
    } else {
      // Already at root, maybe show a message or do nothing
      console.log("Already at root.");
    }
  });

  // Keywords Manager button handler
  keywordsBtn.addEventListener("click", async () => {
    await showKeywordsManager();
  });

  // Helper to load items and update UI
  async function loadItems(path: string) {
    currentPath = path;
    currentPathSpan.textContent = currentPath === "" ? "/" : `/${currentPath}`;
    browseBtn.click(); // Trigger browse to refresh list
  }

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

    itemsList.innerHTML = `
      <div style="padding: 1rem;">
        <button id="detailBackBtn" style="padding: 0.5rem 1rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; margin-bottom: 1rem;">
          ← Back to List
        </button>
        <h3 style="margin-top: 0; margin-bottom: 0.5rem;">${title || objectData.id || "Untitled"}</h3>
        <p style="color: #666; margin-bottom: 1rem;">${description || "No description."}</p>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 0.5rem 0;">Details</h4>
          <p><strong>Type:</strong> ${objectData['@type'] || objectData.type || "Unknown"}</p>
          <p><strong>Path:</strong> ${path.replace(currentBaseUrl, '')}</p>
        </div>

        <!--Tags Section-->
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
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
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="newTagInput" placeholder="Add new tag..." style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" />
            <button id="addTagBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer;">Add</button>
            <button id="saveTagsBtn" style="padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Tags</button>
          </div>
          <div id="tagStatus" style="margin-top: 0.5rem; font-size: 13px; display: none;"></div>
        </div>

        ${hasBlocks ? `
        <!-- Blocks Section -->
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="margin: 0;">Blocks</h4>
            <div style="display: flex; gap: 0.5rem;">
              <button id="jsonModeBtn" style="padding: 0.4rem 0.8rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">JSON</button>
              <button id="visualModeBtn" style="padding: 0.4rem 0.8rem; background: #e0e0e0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">Visual</button>
            </div>
          </div>
          
          <!-- JSON Mode -->
          <div id="jsonMode" style="display: block;">
            <p style="font-size: 13px; color: #666; margin: 0 0 0.5rem 0;">Edit the blocks structure. Both blocks and blocks_layout must be consistent.</p>
            
            <div style="margin-bottom: 1rem;">
              <label style="font-weight: bold; font-size: 13px; display: block; margin-bottom: 0.25rem;">blocks:</label>
              <textarea id="blocksEditor" style="width: 100%; min-height: 200px; font-family: monospace; font-size: 12px; border: 1px solid #ddd; padding: 0.5rem; border-radius: 4px;">${JSON.stringify(blocks, null, 2)}</textarea>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="font-weight: bold; font-size: 13px; display: block; margin-bottom: 0.25rem;">blocks_layout:</label>
              <textarea id="blocksLayoutEditor" style="width: 100%; min-height: 100px; font-family: monospace; font-size: 12px; border: 1px solid #ddd; padding: 0.5rem; border-radius: 4px;">${JSON.stringify(blocksLayout, null, 2)}</textarea>
            </div>
          </div>
          
          <!-- Visual Mode -->
          <div id="visualMode" style="display: none;">
            <p style="font-size: 13px; color: #666; margin: 0 0 0.5rem 0;">Drag blocks to reorder them. Changes sync with JSON automatically.</p>
            <div id="blocksList" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
              <!-- Blocks will be rendered here -->
            </div>
            <button id="addBlockBtn" style="padding: 0.5rem 1rem; background: ${PLONE_BLUE}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">+ Add Block</button>
          </div>
          
          <button id="saveBlocksBtn" style="padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">Save Blocks</button>
          <div id="blockStatus" style="margin-top: 0.5rem; font-size: 13px; display: none;"></div>
        </div>
        ` : ''}
      </div>
    `;

    // Store current tags
    let currentTags = [...subjects];
    const objectPath = path.replace(/^.*\/\+\+api\+\+\//, '');

    // Back button handler (in details view)
    document.getElementById("detailBackBtn")?.addEventListener("click", () => {
      browseBtn.click();
    });

    // Tag management handlers
    const tagsContainer = document.getElementById("tagsContainer");
    const newTagInput = document.getElementById("newTagInput") as HTMLInputElement;
    const tagStatus = document.getElementById("tagStatus") as HTMLDivElement;

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

    newTagInput?.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        document.getElementById("addTagBtn")?.click();
      }
    });

    document.getElementById("saveTagsBtn")?.addEventListener("click", async () => {
      try {
        tagStatus.textContent = "Saving...";
        tagStatus.style.color = "#666";
        tagStatus.style.display = "block";

        await api.patch(objectPath, { subjects: currentTags });

        tagStatus.textContent = "✓ Tags saved successfully!";
        tagStatus.style.color = "#4caf50";
        setTimeout(() => { tagStatus.style.display = "none"; }, 3000);
      } catch (error) {
        tagStatus.textContent = `✗ Error: ${error instanceof Error ? error.message : "Failed to save"}`;
        tagStatus.style.color = "#d32f2f";
      }
    });

    // Block management handlers
    if (hasBlocks) {
      const blockStatus = document.getElementById("blockStatus") as HTMLDivElement;
      const originalBlocks = JSON.stringify(blocks);
      const originalBlocksLayout = JSON.stringify(blocksLayout);

      // Mode toggle state
      let currentMode: 'json' | 'visual' = 'json';
      let currentBlocks = { ...blocks };
      let currentBlocksLayout = { ...blocksLayout };

      const jsonModeBtn = document.getElementById("jsonModeBtn");
      const visualModeBtn = document.getElementById("visualModeBtn");
      const jsonModeDiv = document.getElementById("jsonMode");
      const visualModeDiv = document.getElementById("visualMode");
      const blocksList = document.getElementById("blocksList");

      // Mode toggle handlers
      jsonModeBtn?.addEventListener("click", () => {
        currentMode = 'json';
        jsonModeBtn.style.background = PLONE_BLUE;
        jsonModeBtn.style.color = 'white';
        visualModeBtn!.style.background = '#e0e0e0';
        visualModeBtn!.style.color = '#333';
        jsonModeDiv!.style.display = 'block';
        visualModeDiv!.style.display = 'none';

        // Sync from visual to JSON when switching
        const blocksEditor = document.getElementById("blocksEditor") as HTMLTextAreaElement;
        const blocksLayoutEditor = document.getElementById("blocksLayoutEditor") as HTMLTextAreaElement;
        blocksEditor.value = JSON.stringify(currentBlocks, null, 2);
        blocksLayoutEditor.value = JSON.stringify(currentBlocksLayout, null, 2);
      });

      visualModeBtn?.addEventListener("click", () => {
        currentMode = 'visual';
        visualModeBtn.style.background = PLONE_BLUE;
        visualModeBtn.style.color = 'white';
        jsonModeBtn!.style.background = '#e0e0e0';
        jsonModeBtn!.style.color = '#333';
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
          // Revert toggle UI
          currentMode = 'json';
          jsonModeBtn!.click();
          return;
        }
      });

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
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 0.75rem;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            margin-bottom: 0.5rem;
          `;

          // Block info container
          const info = document.createElement('div');
          info.style.flex = '1';
          info.style.display = 'flex';
          info.style.alignItems = 'center';
          info.style.gap = '0.75rem';
          info.style.overflow = 'hidden';

          // Icon based on type
          const type = block['@type'] || 'unknown';
          let icon = '🧩';
          let color = '#757575';

          switch (type) {
            case 'slate':
            case 'text':
              icon = '📝';
              color = PLONE_BLUE;
              break;
            case 'image':
              icon = '🖼️';
              color = '#f06292';
              break;
            case 'listing':
              icon = '📋';
              color = '#4caf50';
              break;
            case 'video':
              icon = '🎥';
              color = '#f44336';
              break;
            case 'teaser':
              icon = '🔗';
              color = '#ff9800';
              break;
            case 'table':
              icon = '▦';
              color = '#795548';
              break;
          }

          const iconSpan = document.createElement('div');
          iconSpan.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: ${color}20;
            color: ${color};
            border-radius: 6px;
            font-size: 16px;
            flex-shrink: 0;
          `;
          iconSpan.textContent = icon;

          // Content Preview
          const contentDiv = document.createElement('div');
          contentDiv.style.cssText = 'display: flex; flex-direction: column; overflow: hidden;';

          const typeLabel = document.createElement('span');
          typeLabel.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            color: ${color};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          `;
          typeLabel.textContent = type;

          const previewText = document.createElement('span');
          previewText.style.cssText = 'font-size: 13px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

          // Generate preview based on type
          let previewStr = '';
          if (type === 'slate' && block.value) {
            // Extract text from Slate JSON
            try {
              const extractText = (nodes: any[]): string => {
                return nodes.map(n => n.text || (n.children ? extractText(n.children) : '')).join(' ');
              };
              previewStr = extractText(block.value) || 'Empty text block';
            } catch (e) {
              previewStr = 'Text block';
            }
          } else if (type === 'image') {
            previewStr = block.url ? block.url.split('/').pop() : (block.alt || 'Image block');
          } else if (type === 'listing') {
            previewStr = block.query ? `Query: ${block.query.length} criteria` : 'Content Listing';
          } else if (type === 'video') {
            previewStr = block.url || 'Video block';
          } else if (type === 'teaser') {
            previewStr = block.title || block.href || 'Teaser';
          } else {
            previewStr = block.title || JSON.stringify(block).substring(0, 50);
          }

          previewText.textContent = previewStr;

          contentDiv.appendChild(typeLabel);
          contentDiv.appendChild(previewText);

          info.appendChild(iconSpan);
          info.appendChild(contentDiv);

          // Drag handle and delete button
          const actions = document.createElement('div');
          actions.style.cssText = 'display: flex; gap: 0.5rem; align-items: center; margin-left: 0.5rem;';

          const dragHandle = document.createElement('span');
          dragHandle.innerHTML = '⋮⋮';
          dragHandle.style.cssText = 'font-size: 18px; color: #bdbdbd; cursor: move; padding: 0 4px;';
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
            if (confirm('Delete this block?')) {
              deleteBlock(blockId);
            }
          };

          actions.appendChild(dragHandle);
          actions.appendChild(deleteBtn);

          card.appendChild(info);
          card.appendChild(actions);

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
        try {
          const blocksEditor = document.getElementById("blocksEditor") as HTMLTextAreaElement;
          const blocksLayoutEditor = document.getElementById("blocksLayoutEditor") as HTMLTextAreaElement;

          let newBlocks, newBlocksLayout;

          if (currentMode === 'json') {
            // Parse from JSON editors
            newBlocks = JSON.parse(blocksEditor.value);
            newBlocksLayout = JSON.parse(blocksLayoutEditor.value);
          } else {
            // Use current visual state
            newBlocks = currentBlocks;
            newBlocksLayout = currentBlocksLayout;
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

          blockStatus.textContent = "Saving...";
          blockStatus.style.color = "#666";
          blockStatus.style.display = "block";

          // Optimize: if only layout changed, send only that
          const blocksChanged = JSON.stringify(newBlocks) !== originalBlocks;
          const layoutChanged = JSON.stringify(newBlocksLayout) !== originalBlocksLayout;

          if (blocksChanged && layoutChanged) {
            // Both changed - send both
            await api.patch(objectPath, {
              blocks: newBlocks,
              blocks_layout: newBlocksLayout
            });
          } else if (layoutChanged) {
            // Only layout changed (reordering/hiding) - send only layout
            await api.patch(objectPath, {
              blocks_layout: newBlocksLayout
            });
          } else if (blocksChanged) {
            // Only blocks changed - send both for safety
            await api.patch(objectPath, {
              blocks: newBlocks,
              blocks_layout: newBlocksLayout
            });
          } else {
            blockStatus.textContent = "No changes detected";
            blockStatus.style.color = "#666";
            setTimeout(() => { blockStatus.style.display = "none"; }, 2000);
            return;
          }

          blockStatus.textContent = "✓ Blocks saved successfully!";
          blockStatus.style.color = "#4caf50";
          setTimeout(() => { blockStatus.style.display = "none"; }, 3000);
        } catch (error) {
          blockStatus.textContent = `✗ Error: ${error instanceof Error ? error.message : "Failed to save"}`;
          blockStatus.style.color = "#d32f2f";
        }
      });
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
          <h3 style="margin: 0;">🏷️ Keywords Manager</h3>
          <button id="kwBackBtn" style="padding: 0.5rem 1rem; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #333; font-weight: 500;">
            ← Back to Browser
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

    const kwContent = document.getElementById("kwContent")!;
    let allTags: Record<string, number> = {};
    let similarPairs: api.SimilarTagPair[] = [];
    let mergePlan: Map<string, string[]> = new Map(); // target -> sources

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
      // 1. Collect Tags
      allTags = await api.collectTags();
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
            <p style="color: #666;">Your keyword list looks clean! ✨</p>
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
