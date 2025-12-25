#include "feature_extractor.hpp"
#include <iostream>
#include <cmath>
#include <cassert>

// Simple test framework
#define TEST(name) void test_##name()
#define RUN_TEST(name) do { \
    std::cout << "Running " #name "... "; \
    try { \
        test_##name(); \
        std::cout << "PASSED\n"; \
        passed++; \
    } catch (const std::exception& e) { \
        std::cout << "FAILED: " << e.what() << "\n"; \
        failed++; \
    } \
} while(0)

#define ASSERT_NEAR(a, b, tol) do { \
    double _a = (a), _b = (b), _tol = (tol); \
    if (std::abs(_a - _b) > _tol) { \
        throw std::runtime_error("Expected " + std::to_string(_b) + \
            " but got " + std::to_string(_a) + " (tolerance: " + std::to_string(_tol) + ")"); \
    } \
} while(0)

#define ASSERT_TRUE(cond) do { \
    if (!(cond)) { \
        throw std::runtime_error("Assertion failed: " #cond); \
    } \
} while(0)

int passed = 0;
int failed = 0;

// Generate a sine wave
std::vector<double> generate_sine(double freq, double sample_rate, size_t n_samples, double amplitude = 1.0) {
    std::vector<double> signal(n_samples);
    for (size_t i = 0; i < n_samples; ++i) {
        double t = static_cast<double>(i) / sample_rate;
        signal[i] = amplitude * std::sin(2.0 * cpm::PI * freq * t);
    }
    return signal;
}

// Generate a constant signal
std::vector<double> generate_constant(double value, size_t n_samples) {
    return std::vector<double>(n_samples, value);
}

// Tests

TEST(rms_constant) {
    cpm::FeatureExtractor fe(1000.0);
    auto signal = generate_constant(5.0, 1000);
    double rms = fe.compute_rms(signal);
    ASSERT_NEAR(rms, 5.0, 0.001);
}

TEST(rms_sine) {
    cpm::FeatureExtractor fe(5000.0);
    // RMS of a sine wave with amplitude A is A / sqrt(2)
    double amplitude = 2.0;
    auto signal = generate_sine(100.0, 5000.0, 5000, amplitude);
    double rms = fe.compute_rms(signal);
    double expected = amplitude / std::sqrt(2.0);
    ASSERT_NEAR(rms, expected, 0.01);
}

TEST(peak_sine) {
    cpm::FeatureExtractor fe(5000.0);
    double amplitude = 3.5;
    auto signal = generate_sine(200.0, 5000.0, 5000, amplitude);
    double peak = fe.compute_peak(signal);
    ASSERT_NEAR(peak, amplitude, 0.01);
}

TEST(crest_factor_sine) {
    cpm::FeatureExtractor fe(5000.0);
    // Crest factor of sine wave = sqrt(2) ≈ 1.414
    auto signal = generate_sine(100.0, 5000.0, 5000);
    double cf = fe.compute_crest_factor(signal);
    ASSERT_NEAR(cf, std::sqrt(2.0), 0.01);
}

TEST(kurtosis_normal) {
    cpm::FeatureExtractor fe(1000.0);
    // Sine wave has kurtosis of -1.5 (excess kurtosis)
    auto signal = generate_sine(50.0, 1000.0, 10000);
    double kurt = fe.compute_kurtosis(signal);
    ASSERT_NEAR(kurt, -1.5, 0.1);
}

TEST(skewness_sine) {
    cpm::FeatureExtractor fe(1000.0);
    // Symmetric sine wave should have skewness ≈ 0
    auto signal = generate_sine(50.0, 1000.0, 10000);
    double skew = fe.compute_skewness(signal);
    ASSERT_NEAR(skew, 0.0, 0.1);
}

TEST(fft_single_frequency) {
    cpm::FeatureExtractor fe(1000.0);

    // Generate 100 Hz sine at 1000 Hz sample rate
    double target_freq = 100.0;
    auto signal = generate_sine(target_freq, 1000.0, 1024);

    auto [mags, freqs] = fe.compute_fft(signal);

    // Find the peak frequency
    size_t peak_idx = 0;
    double peak_mag = 0.0;
    for (size_t i = 1; i < mags.size(); ++i) {  // Skip DC
        if (mags[i] > peak_mag) {
            peak_mag = mags[i];
            peak_idx = i;
        }
    }

    double peak_freq = freqs[peak_idx];
    ASSERT_NEAR(peak_freq, target_freq, 2.0);  // Within 2 Hz
}

TEST(spectral_centroid) {
    cpm::FeatureExtractor fe(1000.0);

    // For a pure sine wave, spectral centroid should be at that frequency
    double target_freq = 150.0;
    auto signal = generate_sine(target_freq, 1000.0, 2048);

    auto [mags, freqs] = fe.compute_fft(signal);
    double centroid = fe.compute_spectral_centroid(mags, freqs);

    ASSERT_NEAR(centroid, target_freq, 5.0);  // Within 5 Hz
}

TEST(bandpower_low_freq) {
    cpm::FeatureExtractor fe(5000.0);

    // Generate 50 Hz signal - should be mostly in 0-100 Hz band
    auto signal = generate_sine(50.0, 5000.0, 4096);

    auto [mags, freqs] = fe.compute_fft(signal);
    auto bandpowers = fe.compute_bandpower(mags, freqs);

    // First band (0-100 Hz) should have most power
    double total_power = 0.0;
    for (double bp : bandpowers) {
        total_power += bp;
    }

    double low_band_ratio = bandpowers[0] / total_power;
    ASSERT_TRUE(low_band_ratio > 0.9);  // At least 90% in low band
}

TEST(bandpower_high_freq) {
    cpm::FeatureExtractor fe(5000.0);

    // Generate 1500 Hz signal - should be in 1000-2000 Hz band
    auto signal = generate_sine(1500.0, 5000.0, 4096);

    auto [mags, freqs] = fe.compute_fft(signal);
    auto bandpowers = fe.compute_bandpower(mags, freqs);

    // Fourth band (1000-2000 Hz) should have most power
    double total_power = 0.0;
    for (double bp : bandpowers) {
        total_power += bp;
    }

    double band_ratio = bandpowers[3] / total_power;
    ASSERT_TRUE(band_ratio > 0.9);  // At least 90% in correct band
}

TEST(extract_all) {
    cpm::FeatureExtractor fe(5000.0);
    auto signal = generate_sine(200.0, 5000.0, 2048);

    auto features = fe.extract_all(signal);

    // Check that all features are populated
    ASSERT_TRUE(features.rms > 0);
    ASSERT_TRUE(features.peak > 0);
    ASSERT_TRUE(features.crest_factor > 0);
    ASSERT_TRUE(!features.fft_magnitude.empty());
    ASSERT_TRUE(!features.fft_frequencies.empty());
    ASSERT_TRUE(features.bandpowers.size() == 5);
    ASSERT_TRUE(features.band_names.size() == 5);
}

TEST(empty_signal) {
    cpm::FeatureExtractor fe(1000.0);
    std::vector<double> empty;

    // Should not crash, return zeros
    ASSERT_NEAR(fe.compute_rms(empty), 0.0, 0.001);
    ASSERT_NEAR(fe.compute_peak(empty), 0.0, 0.001);
}

TEST(sample_rate_change) {
    cpm::FeatureExtractor fe(1000.0);
    ASSERT_NEAR(fe.get_sample_rate(), 1000.0, 0.001);

    fe.set_sample_rate(5000.0);
    ASSERT_NEAR(fe.get_sample_rate(), 5000.0, 0.001);
}

int main() {
    std::cout << "=== CPM Feature Extractor Tests ===\n\n";

    RUN_TEST(rms_constant);
    RUN_TEST(rms_sine);
    RUN_TEST(peak_sine);
    RUN_TEST(crest_factor_sine);
    RUN_TEST(kurtosis_normal);
    RUN_TEST(skewness_sine);
    RUN_TEST(fft_single_frequency);
    RUN_TEST(spectral_centroid);
    RUN_TEST(bandpower_low_freq);
    RUN_TEST(bandpower_high_freq);
    RUN_TEST(extract_all);
    RUN_TEST(empty_signal);
    RUN_TEST(sample_rate_change);

    std::cout << "\n=== Results ===\n";
    std::cout << "Passed: " << passed << "\n";
    std::cout << "Failed: " << failed << "\n";

    return failed > 0 ? 1 : 0;
}
