/**
 * ML Runtime Configuration
 * Manages runtime enable/disable toggle for the anomaly detection adjustment layer.
 */

let mlEnabled = process.env.ML_ENABLED !== 'false'; // Defaults to true

function isMlEnabled() {
  return mlEnabled;
}

function setMlEnabled(enabled) {
  mlEnabled = Boolean(enabled);
  return mlEnabled;
}

module.exports = {
  isMlEnabled,
  setMlEnabled,
  ML_PROTOTYPE_LABEL: 'prototype anomaly signal'
};

