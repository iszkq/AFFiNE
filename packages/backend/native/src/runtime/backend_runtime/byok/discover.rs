use std::collections::HashSet;
use std::time::Duration;

use llm_adapter::target::EgressPolicy;
use reqwest::{Client, StatusCode};
use serde_json::Value;
use url::Url;

use super::{RuntimeError, RuntimeResult};
use super::super::webpki_tls_config;
use crate::llm::{
  ByokDiscoveredModelOutput, DiscoverByokModelsInput,
  byok::{ByokEndpoint, ByokPolicy, validate_endpoint},
};

const MAX_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

pub(in crate::runtime::backend_runtime) async fn discover(
  input: DiscoverByokModelsInput,
  policy: &ByokPolicy,
) -> RuntimeResult<Vec<ByokDiscoveredModelOutput>> {
  if input.credential.trim().is_empty() {
    return Err(RuntimeError::invalid_input("BYOK credential is required"));
  }
  let endpoint = validate_endpoint(&input.provider, input.endpoint)
    .map_err(|error| RuntimeError::invalid_input(error.to_string()))?;
  let ByokEndpoint::OpenAiCompatible { url, .. } = &endpoint else {
    return Err(RuntimeError::invalid_input(
      "model discovery requires an OpenAI-compatible endpoint",
    ));
  };
  policy.admit(&input.provider, &endpoint).await?;

  let mut models_url = Url::parse(url).map_err(|_| RuntimeError::invalid_input("invalid BYOK endpoint"))?;
  let path = models_url.path().trim_end_matches('/').to_string();
  models_url.set_path(&format!("{path}/models"));
  models_url.set_query(None);

  let mut builder = Client::builder()
    .tls_backend_preconfigured(
      webpki_tls_config().map_err(|_| RuntimeError::invalid_state("BYOK TLS configuration failed"))?,
    )
    .timeout(Duration::from_secs(15))
    .redirect(reqwest::redirect::Policy::none());
  if matches!(policy.egress_policy(&endpoint), EgressPolicy::PublicOnly) {
    let host = models_url
      .host_str()
      .ok_or_else(|| RuntimeError::invalid_input("invalid BYOK endpoint"))?;
    let addresses = policy.resolve_public_addresses(url).await?;
    builder = builder.resolve_to_addrs(host, &addresses);
  }
  let client = builder
    .build()
    .map_err(|_| RuntimeError::invalid_state("BYOK HTTP client unavailable"))?;
  let mut response = client
    .get(models_url)
    .bearer_auth(input.credential)
    .send()
    .await
    .map_err(|_| RuntimeError::invalid_state("BYOK model discovery request failed"))?;
  let status = response.status();
  if !status.is_success() {
    return Err(RuntimeError::invalid_input(discovery_error(status)));
  }
  if response
    .content_length()
    .is_some_and(|length| length > MAX_RESPONSE_BYTES as u64)
  {
    return Err(RuntimeError::invalid_input("BYOK model discovery response is too large"));
  }
  let mut body = Vec::new();
  while let Some(chunk) = response
    .chunk()
    .await
    .map_err(|_| RuntimeError::invalid_state("BYOK model discovery response failed"))?
  {
    if body.len() + chunk.len() > MAX_RESPONSE_BYTES {
      return Err(RuntimeError::invalid_input("BYOK model discovery response is too large"));
    }
    body.extend_from_slice(&chunk);
  }
  let value: Value = serde_json::from_slice(&body)
    .map_err(|_| RuntimeError::invalid_input("BYOK model discovery returned invalid JSON"))?;
  parse_models(&value)
}

fn parse_models(value: &Value) -> RuntimeResult<Vec<ByokDiscoveredModelOutput>> {
  let candidates = value
    .get("data")
    .and_then(Value::as_array)
    .or_else(|| value.get("models").and_then(Value::as_array))
    .or_else(|| value.as_array())
    .ok_or_else(|| RuntimeError::invalid_input("BYOK model discovery returned no model list"))?;
  let mut seen = HashSet::new();
  let mut models = Vec::new();
  for candidate in candidates {
    let (id, display_name) = match candidate {
      Value::String(id) => (id.clone(), None),
      Value::Object(object) => {
        let id = object
          .get("id")
          .or_else(|| object.get("model"))
          .and_then(Value::as_str)
          .unwrap_or_default()
          .to_string();
        let display_name = object
          .get("name")
          .or_else(|| object.get("display_name"))
          .and_then(Value::as_str)
          .map(str::to_string);
        (id, display_name)
      }
      _ => (String::new(), None),
    };
    let id = id.trim().to_string();
    if id.is_empty() || id.len() > 512 || !seen.insert(id.clone()) {
      continue;
    }
    models.push(ByokDiscoveredModelOutput {
      model_id: id,
      display_name,
    });
  }
  Ok(models)
}

fn discovery_error(status: StatusCode) -> &'static str {
  match status.as_u16() {
    401 => "BYOK API key is invalid",
    403 => "BYOK API key has no model list permission",
    404 => "BYOK endpoint does not provide a /models route",
    429 => "BYOK model discovery was rate limited",
    500..=599 => "BYOK provider is unavailable",
    _ => "BYOK model discovery request was rejected",
  }
}

#[cfg(test)]
mod tests {
  use serde_json::json;

  use super::parse_models;

  #[test]
  fn accepts_any_opaque_model_id_from_gateway_without_catalog_filtering() {
    let models = parse_models(&json!({
      "data": [
        { "id": "vendor/unlisted-model:latest", "name": "自定义模型" },
        { "id": "vendor/unlisted-model:latest" },
        { "model": "another-model" }
      ]
    }))
    .unwrap();
    assert_eq!(models.len(), 2);
    assert_eq!(models[0].model_id, "vendor/unlisted-model:latest");
    assert_eq!(models[0].display_name.as_deref(), Some("自定义模型"));
    assert_eq!(models[1].model_id, "another-model");
  }

  #[test]
  fn accepts_alternative_model_list_shape() {
    let models = parse_models(&json!({ "models": ["model-a", { "id": "model-b" }] })).unwrap();
    assert_eq!(models.iter().map(|model| model.model_id.as_str()).collect::<Vec<_>>(), ["model-a", "model-b"]);
  }

  #[test]
  fn does_not_truncate_large_gateway_model_lists() {
    let ids = (0..128)
      .map(|index| json!({ "id": format!("vendor/model-{index}") }))
      .collect::<Vec<_>>();
    let models = parse_models(&json!({ "data": ids })).unwrap();
    assert_eq!(models.len(), 128);
    assert_eq!(models[127].model_id, "vendor/model-127");
  }
}
