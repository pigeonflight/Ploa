// Plone REST API client implementation
// Based on patterns from asajapi/ploneapi_shell/api.py

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use url::Url;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub login: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub message: String,
    pub status: Option<u16>,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if let Some(status) = self.status {
            write!(f, "{} (status: {})", self.message, status)
        } else {
            write!(f, "{}", self.message)
        }
    }
}

impl std::error::Error for ApiError {}

#[derive(Clone)]
pub struct PloneApiClient {
    base_url: String,
    token: Option<String>,
    client: reqwest::Client,
}

impl PloneApiClient {
    pub fn new(base_url: String) -> Result<Self, ApiError> {
        // Normalize base URL to ensure it points to ++api++
        let normalized = Self::normalize_base_url(&base_url)?;

        Ok(Self {
            base_url: normalized,
            token: None,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(15))
                .build()
                .map_err(|e| ApiError {
                    message: format!("Failed to create HTTP client: {}", e),
                    status: None,
                })?,
        })
    }

    fn search_url(&self) -> Result<Url, ApiError> {
        Url::parse(&self.resolve_url(Some("@search"))).map_err(|e| ApiError {
            message: format!("Invalid search URL: {}", e),
            status: None,
        })
    }

    fn normalize_base_url(raw: &str) -> Result<String, ApiError> {
        let text = raw.trim();
        if text.is_empty() {
            return Err(ApiError {
                message: "Base URL cannot be empty".to_string(),
                status: None,
            });
        }

        // Add scheme if missing
        let url_str = if !text.contains("://") {
            let scheme = if text.starts_with("localhost")
                || text.starts_with("127.")
                || text.starts_with("0.0.0.0")
            {
                "http"
            } else {
                "https"
            };
            format!("{}://{}", scheme, text)
        } else {
            text.to_string()
        };

        let mut url = Url::parse(&url_str).map_err(|e| ApiError {
            message: format!("Invalid URL: {}", e),
            status: None,
        })?;

        // Ensure path points to ++api++
        let path = url.path();
        if path.contains("++api++") {
            let parts: Vec<&str> = path.split("++api++").collect();
            let before = parts[0].trim_end_matches('/');
            url.set_path(&format!("{}/++api++/", before));
        } else {
            let trimmed = path.trim_end_matches('/');
            if trimmed.is_empty() || trimmed == "/" {
                url.set_path("/++api++/");
            } else {
                url.set_path(&format!("{}/++api++/", trimmed));
            }
        }

        Ok(url.to_string())
    }

    pub fn resolve_url(&self, path_or_url: Option<&str>) -> String {
        match path_or_url {
            None => self.base_url.clone(),
            Some(path) if path.starts_with("http://") || path.starts_with("https://") => {
                path.to_string()
            }
            Some(path) => {
                let base = self.base_url.trim_end_matches('/');
                let path = path.trim_start_matches('/');
                format!("{}/{}", base, path)
            }
        }
    }

    fn build_request(&self, method: reqwest::Method, url: &str) -> reqwest::RequestBuilder {
        let mut request = self.client.request(method, url);

        request = request.header("Content-Type", "application/json");
        request = request.header("Accept", "application/json");

        if let Some(token) = &self.token {
            request = request.bearer_auth(token);
        }

        request
    }

    pub async fn login(
        &mut self,
        username: String,
        password: String,
    ) -> Result<LoginResponse, ApiError> {
        let login_url = self.resolve_url(Some("@login"));
        let login_req = LoginRequest {
            login: username,
            password,
        };

        let response = self
            .client
            .post(&login_url)
            .json(&login_req)
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Request failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            return Err(ApiError {
                message: format!("Login failed with status {}", status.as_u16()),
                status: Some(status.as_u16()),
            });
        }

        let login_resp: LoginResponse = response.json().await.map_err(|e| ApiError {
            message: format!("Failed to parse login response: {}", e),
            status: Some(status.as_u16()),
        })?;

        self.token = Some(login_resp.token.clone());
        Ok(login_resp)
    }

    pub fn set_token(&mut self, token: String) {
        self.token = Some(token);
    }

    pub async fn fetch(&self, path_or_url: Option<&str>) -> Result<Value, ApiError> {
        let url = self.resolve_url(path_or_url);
        let response = self
            .build_request(reqwest::Method::GET, &url)
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Request failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_msg = response
                .text()
                .await
                .unwrap_or_else(|_| format!("Request failed with status {}", status.as_u16()));
            return Err(ApiError {
                message: error_msg,
                status: Some(status.as_u16()),
            });
        }

        response.json().await.map_err(|e| ApiError {
            message: format!("Failed to parse JSON response: {}", e),
            status: Some(status.as_u16()),
        })
    }

    pub async fn download_binary(&self, path_or_url: Option<&str>) -> Result<Vec<u8>, ApiError> {
        let url = self.resolve_url(path_or_url);
        let response = self
            .build_request(reqwest::Method::GET, &url)
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Request failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_msg = response
                .text()
                .await
                .unwrap_or_else(|_| format!("Request failed with status {}", status.as_u16()));
            return Err(ApiError {
                message: error_msg,
                status: Some(status.as_u16()),
            });
        }

        response
            .bytes()
            .await
            .map(|bytes| bytes.to_vec())
            .map_err(|e| ApiError {
                message: format!("Failed to read binary response: {}", e),
                status: Some(status.as_u16()),
            })
    }

    pub async fn post(
        &self,
        path_or_url: Option<&str>,
        json_data: Value,
    ) -> Result<Value, ApiError> {
        let url = self.resolve_url(path_or_url);
        let response = self
            .build_request(reqwest::Method::POST, &url)
            .json(&json_data)
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Request failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_msg = response
                .text()
                .await
                .unwrap_or_else(|_| format!("Request failed with status {}", status.as_u16()));
            return Err(ApiError {
                message: error_msg,
                status: Some(status.as_u16()),
            });
        }

        let content = response.text().await.map_err(|e| ApiError {
            message: format!("Failed to read response: {}", e),
            status: Some(status.as_u16()),
        })?;

        if content.is_empty() {
            Ok(Value::Object(serde_json::Map::new()))
        } else {
            serde_json::from_str(&content).map_err(|e| ApiError {
                message: format!("Failed to parse JSON response: {}", e),
                status: Some(status.as_u16()),
            })
        }
    }

    pub async fn patch(
        &self,
        path_or_url: Option<&str>,
        json_data: Value,
    ) -> Result<Value, ApiError> {
        let url = self.resolve_url(path_or_url);
        let response = self
            .build_request(reqwest::Method::PATCH, &url)
            .json(&json_data)
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Request failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| format!("Request failed with status {}", status.as_u16()));

            // Try to extract error message from JSON
            let error_msg = if let Ok(error_json) = serde_json::from_str::<Value>(&error_text) {
                error_json
                    .get("message")
                    .or_else(|| error_json.get("error"))
                    .or_else(|| error_json.get("type"))
                    .and_then(|v| v.as_str())
                    .map(|s| format!("{}: {}", status.as_u16(), s))
                    .unwrap_or_else(|| error_text)
            } else {
                error_text
            };

            return Err(ApiError {
                message: error_msg,
                status: Some(status.as_u16()),
            });
        }

        let content = response.text().await.map_err(|e| ApiError {
            message: format!("Failed to read response: {}", e),
            status: Some(status.as_u16()),
        })?;

        if content.is_empty() {
            Ok(Value::Object(serde_json::Map::new()))
        } else {
            serde_json::from_str(&content).map_err(|e| ApiError {
                message: format!("Failed to parse JSON response: {}", e),
                status: Some(status.as_u16()),
            })
        }
    }

    pub async fn move_item(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<Value, ApiError> {
        // POST to destination/@move with source in body
        let move_url = self.resolve_url(Some(&format!(
            "{}/@move",
            destination_path.trim_end_matches('/')
        )));
        let move_data = json!({
            "source": source_path
        });

        let response = self
            .build_request(reqwest::Method::POST, &move_url)
            .json(&move_data)
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Move request failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| format!("Move failed with status {}", status.as_u16()));

            // Try to extract error message from JSON
            let error_msg = if let Ok(error_json) = serde_json::from_str::<Value>(&error_text) {
                error_json
                    .get("message")
                    .or_else(|| error_json.get("error"))
                    .or_else(|| error_json.get("type"))
                    .and_then(|v| v.as_str())
                    .map(|s| format!("{}: {}", status.as_u16(), s))
                    .unwrap_or_else(|| error_text)
            } else {
                error_text
            };

            return Err(ApiError {
                message: error_msg,
                status: Some(status.as_u16()),
            });
        }

        let content = response.text().await.map_err(|e| ApiError {
            message: format!("Failed to read move response: {}", e),
            status: Some(status.as_u16()),
        })?;

        if content.is_empty() {
            Ok(Value::Object(serde_json::Map::new()))
        } else {
            serde_json::from_str(&content).map_err(|e| ApiError {
                message: format!("Failed to parse move response: {}", e),
                status: Some(status.as_u16()),
            })
        }
    }

    pub async fn search(
        &self,
        portal_type: Option<&str>,
        path: Option<&str>,
        searchable_text: Option<&str>,
        metadata_fields: Option<&[String]>,
        fullobjects: Option<bool>,
        additional_params: Option<&HashMap<String, String>>,
    ) -> Result<Value, ApiError> {
        let mut url = self.search_url()?;
        url.query_pairs_mut().append_pair("b_size", "1000");

        if let Some(pt) = portal_type {
            url.query_pairs_mut().append_pair("portal_type", pt);
        }

        if let Some(p) = path {
            url.query_pairs_mut().append_pair("path", p);
        }

        if let Some(st) = searchable_text {
            url.query_pairs_mut().append_pair("SearchableText", st);
        }

        if let Some(fields) = metadata_fields {
            for field in fields {
                if !field.trim().is_empty() {
                    url.query_pairs_mut().append_pair("metadata_fields", field);
                }
            }
        }

        // Add any additional parameters (e.g. from listing blocks)
        if let Some(params) = additional_params {
            for (key, value) in params {
                // Skip parameters we already handle explicitly to avoid duplicates
                if key != "b_size" 
                    && key != "portal_type" 
                    && key != "path" 
                    && key != "SearchableText" 
                    && key != "metadata_fields" 
                    && key != "fullobjects" 
                {
                    url.query_pairs_mut().append_pair(key, value);
                }
            }
        }

        if fullobjects.unwrap_or(false) {
            url.query_pairs_mut().append_pair("fullobjects", "1");
        }

        let response = self
            .build_request(reqwest::Method::GET, url.as_str())
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Search request failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            return Err(ApiError {
                message: format!("Search failed with status {}", status.as_u16()),
                status: Some(status.as_u16()),
            });
        }

        response.json().await.map_err(|e| ApiError {
            message: format!("Failed to parse search response: {}", e),
            status: Some(status.as_u16()),
        })
    }

    fn extract_subjects(value: &Value) -> Vec<String> {
        if let Some(subjects) = value.get("Subject") {
            Self::value_to_string_list(subjects)
        } else if let Some(subjects) = value.get("subjects") {
            Self::value_to_string_list(subjects)
        } else if let Some(components) = value
            .get("@components")
            .and_then(|c| c.get("Subject").or_else(|| c.get("subjects")))
        {
            Self::value_to_string_list(components)
        } else {
            Vec::new()
        }
    }

    fn value_to_string_list(value: &Value) -> Vec<String> {
        match value {
            Value::Array(items) => items
                .iter()
                .filter_map(|item| item.as_str().map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
                .collect(),
            Value::String(s) => {
                let trimmed = s.trim();
                if trimmed.is_empty() {
                    Vec::new()
                } else {
                    vec![trimmed.to_string()]
                }
            }
            _ => Vec::new(),
        }
    }

    fn relative_path_from_id(&self, id: &str) -> Option<String> {
        // The @id from Plone REST API is typically a full public URL like:
        // https://domain.com/path/to/item
        // We need to extract just the path portion: path/to/item

        // First, try to match against base_url (in case it's already an API URL)
        let base = self.base_url.trim_end_matches('/');
        if id.starts_with(base) {
            return Some(id[base.len()..].trim_start_matches('/').to_string());
        }

        // Parse as URL to extract the path
        if let Ok(url) = Url::parse(id) {
            let mut path = url.path().to_string();

            // Remove leading slash
            path = path.trim_start_matches('/').to_string();

            // If the path contains ++api++, remove it (we'll add it back via base_url)
            if path.contains("++api++") {
                let parts: Vec<&str> = path.split("++api++").collect();
                if parts.len() > 1 {
                    path = parts[1].trim_start_matches('/').to_string();
                } else {
                    path = parts[0].trim_start_matches('/').to_string();
                }
            }

            // Verify the domain matches (security check)
            if let Ok(base_url_obj) = Url::parse(&self.base_url) {
                if base_url_obj.host_str() == url.host_str() || base_url_obj.host_str().is_none() {
                    return Some(path);
                }
            } else {
                // If base_url parsing fails, still try to use the path
                // (might be a relative path scenario)
                return Some(path);
            }
        }

        // Fallback: manual string extraction for edge cases
        if let Some(domain_end) = id.find("://") {
            if let Some(path_start) = id[domain_end + 3..].find('/') {
                let full_path = &id[domain_end + 3 + path_start..];
                let mut path = full_path.trim_start_matches('/').to_string();

                // Remove ++api++ if present
                if path.contains("++api++") {
                    let parts: Vec<&str> = path.split("++api++").collect();
                    if parts.len() > 1 {
                        path = parts[1].trim_start_matches('/').to_string();
                    } else {
                        path = parts[0].trim_start_matches('/').to_string();
                    }
                }

                return Some(path);
            }
        }

        None
    }

    pub async fn collect_tags(
        &self,
        path: Option<&str>,
    ) -> Result<HashMap<String, usize>, ApiError> {
        let mut tags: HashMap<String, usize> = HashMap::new();
        let mut b_start = 0;
        let page_size = 200;

        loop {
            let mut url = self.search_url()?;
            url.query_pairs_mut()
                .append_pair("b_size", &page_size.to_string());
            url.query_pairs_mut()
                .append_pair("b_start", &b_start.to_string());
            url.query_pairs_mut()
                .append_pair("metadata_fields", "Subject");
            if let Some(p) = path {
                url.query_pairs_mut().append_pair("path", p);
            }

            let response = self
                .build_request(reqwest::Method::GET, url.as_str())
                .send()
                .await
                .map_err(|e| ApiError {
                    message: format!("Tag search failed: {}", e),
                    status: None,
                })?;

            let status = response.status();
            if !status.is_success() {
                return Err(ApiError {
                    message: format!("Tag search failed with status {}", status.as_u16()),
                    status: Some(status.as_u16()),
                });
            }

            let data: Value = response.json().await.map_err(|e| ApiError {
                message: format!("Failed to parse tag search response: {}", e),
                status: Some(status.as_u16()),
            })?;

            let items = data
                .get("items")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();

            for item in items.iter() {
                for subject in Self::extract_subjects(item) {
                    *tags.entry(subject).or_insert(0) += 1;
                }
            }

            let items_total = data
                .get("items_total")
                .and_then(|v| v.as_u64())
                .unwrap_or(items.len() as u64);

            if items.len() < page_size || (b_start as u64 + items.len() as u64) >= items_total {
                break;
            }

            b_start += items.len();
        }

        Ok(tags)
    }

    pub fn find_similar_tag_pairs(
        &self,
        tags: &HashMap<String, usize>,
        threshold: u32,
        limit: usize,
    ) -> Vec<SimilarTagPair> {
        let tag_list: Vec<(String, usize)> = tags.iter().map(|(k, v)| (k.clone(), *v)).collect();
        let mut pairs = Vec::new();

        for i in 0..tag_list.len() {
            for j in (i + 1)..tag_list.len() {
                let (tag1, count1) = &tag_list[i];
                let (tag2, count2) = &tag_list[j];

                let distance = strsim::levenshtein(tag1, tag2);
                let max_len = tag1.len().max(tag2.len());
                if max_len == 0 {
                    continue;
                }
                let similarity =
                    ((max_len as i32 - distance as i32) * 100 / max_len as i32).max(0) as u32;

                if similarity >= threshold {
                    pairs.push(SimilarTagPair {
                        tag: tag1.clone(),
                        matched: tag2.clone(),
                        similarity,
                        count: *count1,
                        matched_count: *count2,
                    });
                }
            }
        }

        pairs.sort_by(|a, b| {
            b.similarity
                .cmp(&a.similarity)
                .then(b.count.cmp(&a.count))
                .then(a.tag.cmp(&b.tag))
        });

        pairs.truncate(limit);
        pairs
    }

    async fn search_items_by_subject(
        &self,
        subject: &str,
        path: Option<&str>,
    ) -> Result<Vec<Value>, ApiError> {
        let mut url = self.search_url()?;
        url.query_pairs_mut().append_pair("Subject", subject);
        url.query_pairs_mut().append_pair("b_size", "200");
        url.query_pairs_mut()
            .append_pair("metadata_fields", "Subject");
        if let Some(p) = path {
            url.query_pairs_mut().append_pair("path", p);
        }

        let response = self
            .build_request(reqwest::Method::GET, url.as_str())
            .send()
            .await
            .map_err(|e| ApiError {
                message: format!("Subject search failed: {}", e),
                status: None,
            })?;

        let status = response.status();
        if !status.is_success() {
            return Err(ApiError {
                message: format!("Search failed with status {}", status.as_u16()),
                status: Some(status.as_u16()),
            });
        }

        let data: Value = response.json().await.map_err(|e| ApiError {
            message: format!("Failed to parse subject search response: {}", e),
            status: Some(status.as_u16()),
        })?;

        Ok(data
            .get("items")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default())
    }

    pub async fn merge_tags(
        &self,
        target: &str,
        sources: &[String],
        path: Option<&str>,
    ) -> Result<MergeResult, ApiError> {
        let mut updated = 0usize;
        let mut errors = Vec::new();
        let mut affected_items = 0usize;

        for source in sources {
            if source == target {
                continue;
            }

            let items = self.search_items_by_subject(source, path).await?;
            affected_items += items.len();

            for item in items {
                if let Some(id) = item.get("@id").and_then(|v| v.as_str()) {
                    let mut subjects = Self::extract_subjects(&item);
                    let original_subjects = subjects.clone();
                    let mut changed = false;

                    // Check if source tag exists (case-insensitive, trimmed)
                    let source_trimmed = source.trim();
                    let target_trimmed = target.trim();

                    // Skip if source and target are the same (case-insensitive)
                    if source_trimmed.eq_ignore_ascii_case(target_trimmed) {
                        continue;
                    }

                    let has_source = subjects
                        .iter()
                        .any(|s| s.trim().eq_ignore_ascii_case(source_trimmed));

                    let _has_target = subjects
                        .iter()
                        .any(|s| s.trim().eq_ignore_ascii_case(target_trimmed));

                    // Only process if source exists
                    if has_source {
                        // If item has both source and target, we just need to remove source
                        // If item only has source, we need to remove source and add target

                        // Remove source tag(s) - remove all case-insensitive matches
                        let before_count = subjects.len();
                        subjects.retain(|s| !s.trim().eq_ignore_ascii_case(source_trimmed));

                        // Check if we actually removed something
                        if subjects.len() < before_count {
                            changed = true;

                            // Add target tag if not already present (case-insensitive)
                            // Check again after removing source in case target was removed somehow
                            let still_has_target = subjects
                                .iter()
                                .any(|s| s.trim().eq_ignore_ascii_case(target_trimmed));

                            if !still_has_target {
                                subjects.push(target.to_string());
                            }
                        }
                    }

                    // Only update if the final subjects list is actually different from original
                    // This prevents unnecessary updates and handles edge cases
                    if changed {
                        // Normalize both lists for comparison (trim, lowercase, sort)
                        let mut final_subjects_normalized: Vec<String> =
                            subjects.iter().map(|s| s.trim().to_lowercase()).collect();
                        final_subjects_normalized.sort();
                        final_subjects_normalized.dedup();

                        let mut original_subjects_normalized: Vec<String> = original_subjects
                            .iter()
                            .map(|s| s.trim().to_lowercase())
                            .collect();
                        original_subjects_normalized.sort();
                        original_subjects_normalized.dedup();

                        // Only proceed if they're actually different
                        if final_subjects_normalized == original_subjects_normalized {
                            changed = false;
                        }
                    }

                    if changed {
                        // Convert @id URL to API URL by inserting ++api++ into the path
                        let api_url = if let Ok(mut url) = Url::parse(id) {
                            let path = url.path();
                            // Insert ++api++ after the domain but before the content path
                            // e.g., /committees/... becomes /++api++/committees/...
                            let new_path = if path.starts_with('/') {
                                format!("/++api++{}", path)
                            } else {
                                format!("/++api++/{}", path)
                            };
                            url.set_path(&new_path);
                            Some(url.to_string())
                        } else {
                            None
                        };

                        let mut patch_succeeded = false;
                        let mut last_error: Option<String> = None;

                        // First attempt: use converted API URL
                        if let Some(api_url_str) = &api_url {
                            let result = self
                                .patch(Some(api_url_str), json!({ "subjects": subjects }))
                                .await;

                            match result {
                                Ok(_) => {
                                    updated += 1;
                                    patch_succeeded = true;
                                }
                                Err(err) => {
                                    last_error = Some(err.message.clone());
                                }
                            }
                        }

                        // Fallback: try with extracted relative path
                        if !patch_succeeded {
                            if let Some(path) = self.relative_path_from_id(id) {
                                let result = self
                                    .patch(Some(&path), json!({ "subjects": subjects }))
                                    .await;
                                match result {
                                    Ok(_) => {
                                        updated += 1;
                                        patch_succeeded = true;
                                    }
                                    Err(err) => {
                                        if let Some(existing_err) = last_error {
                                            last_error = Some(format!(
                                                "API URL failed: {}; Path also failed: {}",
                                                existing_err, err.message
                                            ));
                                        } else {
                                            last_error = Some(err.message.clone());
                                        }
                                    }
                                }
                            }
                        }

                        if !patch_succeeded {
                            errors.push(format!(
                                "Failed to update {}: {}",
                                id,
                                last_error
                                    .unwrap_or_else(|| "Could not determine path".to_string())
                            ));
                        }
                    }
                }
            }
        }

        Ok(MergeResult {
            updated,
            affected_items,
            errors,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SimilarTagPair {
    pub tag: String,
    pub matched: String,
    pub similarity: u32,
    pub count: usize,
    pub matched_count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct MergeResult {
    pub updated: usize,
    pub affected_items: usize,
    pub errors: Vec<String>,
}
