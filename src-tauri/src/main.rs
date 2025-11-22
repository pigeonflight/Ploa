// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;

use api::PloneApiClient;
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::State;

// Store API client in Tauri state
type ApiClientState = Mutex<Option<PloneApiClient>>;

#[tauri::command]
async fn login(
    base_url: String,
    username: String,
    password: String,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let mut client = PloneApiClient::new(base_url).map_err(|e| e.to_string())?;
    let response = client.login(username, password).await.map_err(|e| e.to_string())?;
    
    // Store the client with token in state
    *state.lock().unwrap() = Some(client);
    
    Ok(serde_json::to_value(response).map_err(|e| e.to_string())?)
}

#[tauri::command]
async fn fetch(
    path: Option<String>,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = {
        state
            .lock()
            .unwrap()
            .clone()
            .ok_or("Not connected. Please connect to a Plone site first.")?
    };
    
    client
        .fetch(path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn search(
    portal_type: Option<String>,
    path: Option<String>,
    searchable_text: Option<String>,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = {
        state
            .lock()
            .unwrap()
            .clone()
            .ok_or("Not connected. Please connect to a Plone site first.")?
    };
    
    client
        .search(portal_type.as_deref(), path.as_deref(), searchable_text.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn patch(
    path: String,
    data: Value,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = {
        state
            .lock()
            .unwrap()
            .clone()
            .ok_or("Not connected. Please connect to a Plone site first.")?
    };
    
    client
        .patch(Some(&path), data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn post(
    path: String,
    data: Value,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = {
        state
            .lock()
            .unwrap()
            .clone()
            .ok_or("Not connected. Please connect to a Plone site first.")?
    };
    
    client
        .post(Some(&path), data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn connect(
    base_url: String,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = PloneApiClient::new(base_url).map_err(|e| e.to_string())?;
    
    // Store the client without token in state
    *state.lock().unwrap() = Some(client);
    
    Ok(json!({ "connected": true }))
}

#[tauri::command]
async fn connect_with_token(
    base_url: String,
    token: String,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let mut client = PloneApiClient::new(base_url).map_err(|e| e.to_string())?;
    client.set_token(token);
    
    // Verify token by trying to fetch user info
    match client.fetch(Some("@users/me")).await {
        Ok(_) => {
            // Token is valid, store client
            *state.lock().unwrap() = Some(client);
            Ok(json!({ "connected": true, "authenticated": true }))
        }
        Err(e) => {
            // Token might be expired or invalid
            Err(format!("Token validation failed: {}", e))
        }
    }
}

#[tauri::command]
async fn collect_tags(
    path: Option<String>,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = {
        state
            .lock()
            .unwrap()
            .clone()
            .ok_or("Not connected. Please connect to a Plone site first.")?
    };
    
    let tags = client
        .collect_tags(path.as_deref())
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::to_value(tags).map_err(|e| e.to_string())?)
}

#[tauri::command]
async fn find_similar_tags(
    tags: Value,
    threshold: u32,
    limit: usize,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = {
        state
            .lock()
            .unwrap()
            .clone()
            .ok_or("Not connected. Please connect to a Plone site first.")?
    };
    
    // Convert Value to HashMap<String, usize>
    let tags_map: std::collections::HashMap<String, usize> = 
        serde_json::from_value(tags).map_err(|e| e.to_string())?;
    
    let similar_pairs = client.find_similar_tag_pairs(&tags_map, threshold, limit);
    
    Ok(serde_json::to_value(similar_pairs).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn merge_tags(
    target: String,
    sources: Vec<String>,
    path: Option<String>,
    state: State<'_, ApiClientState>,
) -> Result<Value, String> {
    let client = {
        state
            .lock()
            .unwrap()
            .clone()
            .ok_or("Not connected. Please connect to a Plone site first.")?
    };
    
    let result = client
        .merge_tags(&target, &sources, path.as_deref())
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ApiClientState::default())
        .invoke_handler(tauri::generate_handler![
            login, 
            connect,
            connect_with_token,
            fetch, 
            search, 
            patch, 
            post,
            collect_tags,
            find_similar_tags,
            merge_tags,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

