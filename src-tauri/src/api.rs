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

    pub async fn login(&mut self, username: String, password: String) -> Result<LoginResponse, ApiError> {
        let login_url = self.resolve_url(Some("@login"));
        let login_req = LoginRequest { login: username, password };

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

    pub async fn post(&self, path_or_url: Option<&str>, json_data: Value) -> Result<Value, ApiError> {
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

    pub async fn patch(&self, path_or_url: Option<&str>, json_data: Value) -> Result<Value, ApiError> {
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

    pub async fn search(
        &self,
        portal_type: Option<&str>,
        path: Option<&str>,
    ) -> Result<Value, ApiError> {
        let mut url = self.search_url()?;
        url.query_pairs_mut().append_pair("b_size", "1000");

        if let Some(pt) = portal_type {
            url.query_pairs_mut().append_pair("portal_type", pt);
        }

        if let Some(p) = path {
            url.query_pairs_mut().append_pair("path", p);
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
        let base = self.base_url.trim_end_matches('/');
        if id.starts_with(base) {
            Some(id[base.len()..].trim_start_matches('/').to_string())
        } else {
            None
        }
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
            url.query_pairs_mut().append_pair("b_size", &page_size.to_string());
            url.query_pairs_mut().append_pair("b_start", &b_start.to_string());
            url.query_pairs_mut().append_pair("metadata_fields", "Subject");
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
        let tag_list: Vec<(String, usize)> =
            tags.iter().map(|(k, v)| (k.clone(), *v)).collect();
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
                let similarity = ((max_len as i32 - distance as i32) * 100 / max_len as i32)
                    .max(0) as u32;

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
        url.query_pairs_mut().append_pair("metadata_fields", "Subject");
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
                    let has_source = subjects
                        .iter()
                        .any(|s| s.trim().eq_ignore_ascii_case(source_trimmed));
                    
                    if has_source {
                        // Remove source tag(s) - remove all case-insensitive matches
                        let before_count = subjects.len();
                        subjects.retain(|s| !s.trim().eq_ignore_ascii_case(source_trimmed));
                        
                        // Only mark as changed if we actually removed something
                        if subjects.len() < before_count {
                            changed = true;
                        }
                        
                        // Add target tag if not already present (case-insensitive)
                        let target_trimmed = target.trim();
                        if !subjects.iter().any(|s| s.trim().eq_ignore_ascii_case(target_trimmed)) {
                            subjects.push(target.to_string());
                            changed = true;
                        }
                    }

                    if changed {
                        if let Some(path) = self.relative_path_from_id(id) {
                            let result = self
                                .patch(Some(&path), json!({ "subjects": subjects }))
                                .await;
                            match result {
                                Ok(_) => updated += 1,
                                Err(err) => errors.push(format!(
                                    "Failed to update {}: {}",
                                    id, err
                                )),
                            }
                        } else {
                            errors.push(format!(
                                "Could not determine path for item: {}",
                                id
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
