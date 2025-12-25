#pragma once

#include <vector>
#include <complex>
#include <cmath>
#include <numeric>
#include <algorithm>
#include <stdexcept>
#include <string>
#include <unordered_map>

namespace cpm {

// Constants
constexpr double PI = 3.14159265358979323846;

/**
 * Struct to hold all extracted features from a vibration signal
 */
struct SignalFeatures {
    double rms;                          // Root Mean Square
    double peak;                         // Maximum absolute value
    double crest_factor;                 // Peak / RMS
    double kurtosis;                     // Fourth moment / variance^2
    double skewness;                     // Third moment / variance^1.5
    double spectral_centroid;            // Weighted mean frequency
    double spectral_spread;              // Spectral standard deviation
    std::vector<double> fft_magnitude;   // FFT magnitude spectrum
    std::vector<double> fft_frequencies; // Corresponding frequencies
    std::vector<double> bandpowers;      // Power in frequency bands
    std::vector<std::string> band_names; // Names of frequency bands
};

/**
 * Feature Extractor class for vibration signal analysis
 */
class FeatureExtractor {
public:
    /**
     * Constructor
     * @param sample_rate Sample rate in Hz (default 5000 Hz)
     */
    explicit FeatureExtractor(double sample_rate = 5000.0);

    /**
     * Extract all features from a signal
     * @param signal Input signal samples
     * @return SignalFeatures struct with all computed features
     */
    SignalFeatures extract_all(const std::vector<double>& signal) const;

    /**
     * Compute Root Mean Square
     */
    double compute_rms(const std::vector<double>& signal) const;

    /**
     * Compute peak (maximum absolute value)
     */
    double compute_peak(const std::vector<double>& signal) const;

    /**
     * Compute Crest Factor (Peak / RMS)
     */
    double compute_crest_factor(const std::vector<double>& signal) const;

    /**
     * Compute Kurtosis (fourth moment / variance^2)
     * Fisher's definition: excess kurtosis (normal = 0)
     */
    double compute_kurtosis(const std::vector<double>& signal) const;

    /**
     * Compute Skewness (third moment / variance^1.5)
     */
    double compute_skewness(const std::vector<double>& signal) const;

    /**
     * Compute FFT and return magnitude spectrum
     * @param signal Input signal
     * @return Pair of (magnitudes, frequencies)
     */
    std::pair<std::vector<double>, std::vector<double>>
    compute_fft(const std::vector<double>& signal) const;

    /**
     * Compute Spectral Centroid (weighted mean frequency)
     * @param magnitudes FFT magnitude spectrum
     * @param frequencies Corresponding frequencies
     */
    double compute_spectral_centroid(
        const std::vector<double>& magnitudes,
        const std::vector<double>& frequencies) const;

    /**
     * Compute Spectral Spread (standard deviation around centroid)
     */
    double compute_spectral_spread(
        const std::vector<double>& magnitudes,
        const std::vector<double>& frequencies,
        double centroid) const;

    /**
     * Compute bandpower in predefined frequency bands
     * Bands: [0-100, 100-500, 500-1000, 1000-2000, 2000+] Hz
     * @param magnitudes FFT magnitude spectrum
     * @param frequencies Corresponding frequencies
     * @return Vector of powers for each band
     */
    std::vector<double> compute_bandpower(
        const std::vector<double>& magnitudes,
        const std::vector<double>& frequencies) const;

    /**
     * Get frequency band names
     */
    std::vector<std::string> get_band_names() const;

    /**
     * Set sample rate
     */
    void set_sample_rate(double rate);

    /**
     * Get sample rate
     */
    double get_sample_rate() const;

private:
    double sample_rate_;

    // FFT implementation (Cooley-Tukey radix-2)
    void fft_recursive(std::vector<std::complex<double>>& x) const;

    // Bit-reversal for FFT
    static size_t bit_reverse(size_t n, size_t bits);

    // Next power of 2
    static size_t next_power_of_2(size_t n);

    // Frequency bands [low, high) in Hz
    static constexpr std::array<std::pair<double, double>, 5> FREQ_BANDS = {{
        {0.0, 100.0},
        {100.0, 500.0},
        {500.0, 1000.0},
        {1000.0, 2000.0},
        {2000.0, 10000.0}  // Up to Nyquist for 5kHz
    }};
};

} // namespace cpm
