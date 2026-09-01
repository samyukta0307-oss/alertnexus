/**
 * Anomaly Detector Service
 * Pure JavaScript Isolation Forest Anomaly Detection Algorithm.
 *
 * NOTE / UI LABELING REMINDER:
 * This is an experimental prototype adjustment layer.
 * UI copy in Phase 8 must label this as "prototype anomaly signal" (never certified ML accuracy).
 */

const { isMlEnabled } = require('../config/mlConfig');

// Simple seeded linear congruential generator for deterministic tree splits
function createRng(seed = 42) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Average path length of unbuilt tree of size n (Euler-Mascheroni constant approximation).
 */
function c(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const eulerMascheroni = 0.5772156649;
  return 2 * (Math.log(n - 1) + eulerMascheroni) - (2 * (n - 1)) / n;
}

/**
 * Builds a single Isolation Tree node recursively.
 */
function buildIsolationTree(data, currentDepth, maxDepth, rng) {
  if (data.length <= 1 || currentDepth >= maxDepth) {
    return { size: data.length, isLeaf: true };
  }

  const numFeatures = data[0].length;
  // Pick random feature
  const featureIdx = Math.floor(rng() * numFeatures);

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const point of data) {
    const v = point[featureIdx];
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }

  // If all points have the exact same value for this feature, cannot split
  if (minVal === maxVal) {
    return { size: data.length, isLeaf: true };
  }

  // Pick random split point between min and max
  const splitValue = minVal + rng() * (maxVal - minVal);

  const leftData = [];
  const rightData = [];

  for (const point of data) {
    if (point[featureIdx] < splitValue) {
      leftData.push(point);
    } else {
      rightData.push(point);
    }
  }

  // Edge case: if split resulted in empty partition, stop
  if (leftData.length === 0 || rightData.length === 0) {
    return { size: data.length, isLeaf: true };
  }

  return {
    featureIdx,
    splitValue,
    isLeaf: false,
    left: buildIsolationTree(leftData, currentDepth + 1, maxDepth, rng),
    right: buildIsolationTree(rightData, currentDepth + 1, maxDepth, rng)
  };
}

/**
 * Traverses an isolation tree to compute path length for a single data point.
 */
function computePathLength(point, node, currentDepth = 0) {
  if (node.isLeaf) {
    return currentDepth + c(node.size);
  }

  if (point[node.featureIdx] < node.splitValue) {
    return computePathLength(point, node.left, currentDepth + 1);
  } else {
    return computePathLength(point, node.right, currentDepth + 1);
  }
}

/**
 * Computes anomaly scores for an array of feature vectors using an ensemble of Isolation Trees.
 *
 * @param {Array<Array<number>>} featureVectors - Array of feature vectors
 * @param {number} [numTrees=64] - Number of random trees in the forest
 * @returns {Array<number>} Anomaly scores in range [0.0, 1.0] aligned to input order
 */
function computeAnomalyScores(featureVectors, numTrees = 64) {
  if (!isMlEnabled() || !featureVectors || featureVectors.length === 0) {
    return (featureVectors || []).map(() => 0.0);
  }

  const n = featureVectors.length;
  if (n <= 1) {
    return [0.0];
  }

  const rng = createRng(1337);
  const sampleSize = Math.min(64, n);
  const maxDepth = Math.ceil(Math.log2(sampleSize));

  // Build Forest
  const forest = [];
  for (let t = 0; t < numTrees; t++) {
    // Draw random subsample without replacement
    const indices = [];
    while (indices.length < sampleSize) {
      const idx = Math.floor(rng() * n);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }
    const sample = indices.map(i => featureVectors[i]);
    forest.push(buildIsolationTree(sample, 0, maxDepth, rng));
  }

  const avgC = c(sampleSize);
  const scores = [];

  for (const point of featureVectors) {
    let totalPathLength = 0;
    for (const tree of forest) {
      totalPathLength += computePathLength(point, tree, 0);
    }
    const avgPathLength = totalPathLength / numTrees;

    // Isolation forest standard score: s = 2^(-E(h)/c(n))
    const rawScore = Math.pow(2, -avgPathLength / avgC);

    // Normalize so that anomalies (scores > 0.45) scale smoothly to [0.0, 1.0]
    // Baseline noise typically clusters around 0.35-0.45; attack chains reach 0.60-0.85
    const normalizedScore = Math.max(0.0, Math.min(1.0, (rawScore - 0.40) / 0.35));
    scores.push(Math.round(normalizedScore * 10000) / 10000);
  }

  return scores;
}

module.exports = {
  computeAnomalyScores
};

