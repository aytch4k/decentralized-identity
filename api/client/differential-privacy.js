/**
 * Differential Privacy Utility
 * 
 * This is a simplified implementation for demonstration purposes.
 * In a production environment, you would use a proper differential privacy library
 * such as Google's Differential Privacy library or OpenDP.
 */

class DifferentialPrivacy {
  /**
   * Add Laplace noise to a numeric value
   * @param {number} value - Original value
   * @param {number} sensitivity - Sensitivity of the query
   * @param {number} epsilon - Privacy parameter (smaller = more privacy)
   * @returns {number} Value with Laplace noise
   */
  static addLaplaceNoise(value, sensitivity = 1.0, epsilon = 0.1) {
    // In a real implementation, this would use a proper DP library
    // For demonstration, we'll implement a basic Laplace mechanism
    
    // Calculate scale parameter
    const scale = sensitivity / epsilon;
    
    // Generate Laplace noise
    const noise = this._generateLaplaceNoise(scale);
    
    // Add noise to value
    return value + noise;
  }
  
  /**
   * Apply differential privacy to a count query
   * @param {number} count - Original count
   * @param {number} epsilon - Privacy parameter (smaller = more privacy)
   * @returns {number} Privatized count
   */
  static privatizeCount(count, epsilon = 0.1) {
    // For count queries, sensitivity is 1
    return Math.round(this.addLaplaceNoise(count, 1.0, epsilon));
  }
  
  /**
   * Apply differential privacy to a sum query
   * @param {number} sum - Original sum
   * @param {number} sensitivity - Maximum contribution of any individual
   * @param {number} epsilon - Privacy parameter (smaller = more privacy)
   * @returns {number} Privatized sum
   */
  static privatizeSum(sum, sensitivity, epsilon = 0.1) {
    return this.addLaplaceNoise(sum, sensitivity, epsilon);
  }
  
  /**
   * Apply differential privacy to an average query
   * @param {number} average - Original average
   * @param {number} count - Number of items in the average
   * @param {number} sensitivity - Maximum contribution of any individual
   * @param {number} epsilon - Privacy parameter (smaller = more privacy)
   * @returns {number} Privatized average
   */
  static privatizeAverage(average, count, sensitivity, epsilon = 0.1) {
    // For averages, we need to adjust the sensitivity
    const adjustedSensitivity = sensitivity / count;
    return this.addLaplaceNoise(average, adjustedSensitivity, epsilon);
  }
  
  /**
   * Apply differential privacy to a dataset of values
   * @param {Array<number>} values - Original values
   * @param {number} epsilon - Privacy parameter (smaller = more privacy)
   * @param {number} sensitivity - Sensitivity of the query
   * @returns {Array<number>} Privatized values
   */
  static privatizeDataset(values, epsilon = 0.1, sensitivity = 1.0) {
    return values.map(value => this.addLaplaceNoise(value, sensitivity, epsilon));
  }
  
  /**
   * Create a differentially private histogram
   * @param {Array<number>} values - Original values
   * @param {number} bins - Number of bins
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} epsilon - Privacy parameter (smaller = more privacy)
   * @returns {Object} Privatized histogram
   */
  static createPrivateHistogram(values, bins = 10, min = null, max = null, epsilon = 0.1) {
    // Determine min and max if not provided
    if (min === null) min = Math.min(...values);
    if (max === null) max = Math.max(...values);
    
    // Create bins
    const binSize = (max - min) / bins;
    const histogram = new Array(bins).fill(0);
    
    // Count values in each bin
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      histogram[binIndex]++;
    });
    
    // Add noise to each bin count
    const privateHistogram = histogram.map(count => this.privatizeCount(count, epsilon / bins));
    
    // Create bin labels
    const binLabels = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      binLabels.push(`${binStart.toFixed(2)}-${binEnd.toFixed(2)}`);
    }
    
    return {
      bins: binLabels,
      counts: privateHistogram
    };
  }
  
  /**
   * Apply randomized response to a boolean value
   * @param {boolean} value - Original boolean value
   * @param {number} probability - Probability of reporting true value
   * @returns {boolean} Privatized boolean value
   */
  static randomizedResponse(value, probability = 0.75) {
    // Flip a coin with probability
    const reportTruthfully = Math.random() < probability;
    
    if (reportTruthfully) {
      // Report true value
      return value;
    } else {
      // Report random value
      return Math.random() < 0.5;
    }
  }
  
  /**
   * Apply differential privacy to a set of categorical values
   * @param {Object} counts - Counts for each category
   * @param {number} epsilon - Privacy parameter (smaller = more privacy)
   * @returns {Object} Privatized category counts
   */
  static privatizeCategoricalCounts(counts, epsilon = 0.1) {
    const categories = Object.keys(counts);
    const privatizedCounts = {};
    
    // Add noise to each category count
    categories.forEach(category => {
      privatizedCounts[category] = this.privatizeCount(counts[category], epsilon / categories.length);
    });
    
    return privatizedCounts;
  }
  
  // Private helper methods
  
  /**
   * Generate Laplace noise
   * @param {number} scale - Scale parameter for Laplace distribution
   * @returns {number} Random noise from Laplace distribution
   * @private
   */
  static _generateLaplaceNoise(scale) {
    // Generate uniform random number in (0, 1)
    const u = Math.random() - 0.5;
    
    // Transform to Laplace distribution
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}

// Export for browser and Node.js environments
if (typeof window !== 'undefined') {
  window.DifferentialPrivacy = DifferentialPrivacy;
} else {
  module.exports = DifferentialPrivacy;
}