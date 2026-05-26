// Recommendation Versioning System

export const CURRENT_VERSIONS = {
  scoring_engine: '2.1',
  prediction_model: '1.3',
  memory_schema: '1.2',
  policy_engine: '1.1',
  confidence_model: '1.4'
};

export function createVersionedRecommendation(recommendation, scoringContext, aiMemorySnapshot) {
  return {
    ...recommendation,
    version_metadata: {
      scoring_engine_version: CURRENT_VERSIONS.scoring_engine,
      prediction_model_version: CURRENT_VERSIONS.prediction_model,
      memory_schema_version: CURRENT_VERSIONS.memory_schema,
      policy_engine_version: CURRENT_VERSIONS.policy_engine,
      confidence_model_version: CURRENT_VERSIONS.confidence_model,
      created_at: new Date().toISOString(),
      feature_snapshot: JSON.stringify(scoringContext).substring(0, 500),
      memory_snapshot: JSON.stringify(aiMemorySnapshot).substring(0, 300),
    }
  };
}

export function getVersionLabel(metadata) {
  if (!metadata) return 'v1.0';
  return `SE:${metadata.scoring_engine_version} PM:${metadata.prediction_model_version}`;
}

export function extractVersionInfo(logEntry) {
  if (!logEntry || !logEntry.version_metadata) {
    return {
      scoring_engine_version: 'unknown',
      prediction_model_version: 'unknown',
      created_at: null
    };
  }
  return {
    scoring_engine_version: logEntry.version_metadata.scoring_engine_version,
    prediction_model_version: logEntry.version_metadata.prediction_model_version,
    created_at: logEntry.version_metadata.created_at
  };
}