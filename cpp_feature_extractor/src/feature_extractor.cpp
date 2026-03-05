#include "feature_extractor.hpp"
#include <cmath>
#include <algorithm>

namespace cpm {

FeatureExtractor::FeatureExtractor(double sample_rate)
    : sample_rate_(sample_rate) {
    if (sample_rate <= 0) {
        throw std::invalid_argument("Sample rate must be positive");
    }
}

void FeatureExtractor::set_sample_rate(double rate) {
    if (rate <= 0) {
        throw std::invalid_argument("Sample rate must be positive");
    }
    sample_rate_ = rate;
}

double FeatureExtractor::get_sample_rate() const {
    return sample_rate_;
}

double FeatureExtractor::compute_rms(const std::vector<double>& signal) const {
    if (signal.empty()) {
        return 0.0;
    }

    double sum_sq = 0.0;
    for (const auto& s : signal) {
        sum_sq += s * s;
    }
    return std::sqrt(sum_sq / static_cast<double>(signal.size()));
}

double FeatureExtractor::compute_peak(const std::vector<double>& signal) const {
    if (signal.empty()) {
        return 0.0;
    }

    double max_abs = 0.0;
    for (const auto& s : signal) {
        max_abs = std::max(max_abs, std::abs(s));
    }
    return max_abs;
}

double FeatureExtractor::compute_crest_factor(const std::vector<double>& signal) const {
    double rms = compute_rms(signal);
    if (rms < 1e-10) {
        return 0.0;
    }
    return compute_peak(signal) / rms;
}

double FeatureExtractor::compute_kurtosis(const std::vector<double>& signal) const {
    if (signal.size() < 4) {
        return 0.0;
    }

    const size_t n = signal.size();

    // Compute mean
    double mean = 0.0;
    for (const auto& s : signal) {
        mean += s;
    }
    mean /= static_cast<double>(n);

    // Compute variance and fourth moment
    double m2 = 0.0;  // Second central moment
    double m4 = 0.0;  // Fourth central moment

    for (const auto& s : signal) {
        double diff = s - mean;
        double diff2 = diff * diff;
        m2 += diff2;
        m4 += diff2 * diff2;
    }

    m2 /= static_cast<double>(n);
    m4 /= static_cast<double>(n);

    if (m2 < 1e-10) {
        return 0.0;
    }

    // Fisher's excess kurtosis (normal distribution = 0)
    return (m4 / (m2 * m2)) - 3.0;
}

double FeatureExtractor::compute_skewness(const std::vector<double>& signal) const {
    if (signal.size() < 3) {
        return 0.0;
    }

    const size_t n = signal.size();

    // Compute mean
    double mean = 0.0;
    for (const auto& s : signal) {
        mean += s;
    }
    mean /= static_cast<double>(n);

    // Compute variance and third moment
    double m2 = 0.0;
    double m3 = 0.0;

    for (const auto& s : signal) {
        double diff = s - mean;
        double diff2 = diff * diff;
        m2 += diff2;
        m3 += diff2 * diff;
    }

    m2 /= static_cast<double>(n);
    m3 /= static_cast<double>(n);

    double std_dev = std::sqrt(m2);
    if (std_dev < 1e-10) {
        return 0.0;
    }

    return m3 / (std_dev * std_dev * std_dev);
}

size_t FeatureExtractor::next_power_of_2(size_t n) {
    size_t p = 1;
    while (p < n) {
        p <<= 1;
    }
    return p;
}

size_t FeatureExtractor::bit_reverse(size_t n, size_t bits) {
    size_t result = 0;
    for (size_t i = 0; i < bits; ++i) {
        result = (result << 1) | (n & 1);
        n >>= 1;
    }
    return result;
}

void FeatureExtractor::fft_recursive(std::vector<std::complex<double>>& x) const {
    const size_t n = x.size();
    if (n <= 1) return;

    // Bit-reversal permutation
    size_t bits = 0;
    for (size_t temp = n; temp > 1; temp >>= 1) {
        ++bits;
    }

    for (size_t i = 0; i < n; ++i) {
        size_t j = bit_reverse(i, bits);
        if (i < j) {
            std::swap(x[i], x[j]);
        }
    }

    // Cooley-Tukey iterative FFT
    for (size_t len = 2; len <= n; len <<= 1) {
        double angle = -2.0 * PI / static_cast<double>(len);
        std::complex<double> wlen(std::cos(angle), std::sin(angle));

        for (size_t i = 0; i < n; i += len) {
            std::complex<double> w(1.0, 0.0);
            for (size_t j = 0; j < len / 2; ++j) {
                std::complex<double> u = x[i + j];
                std::complex<double> t = w * x[i + j + len / 2];
                x[i + j] = u + t;
                x[i + j + len / 2] = u - t;
                w *= wlen;
            }
        }
    }
}

std::pair<std::vector<double>, std::vector<double>>
FeatureExtractor::compute_fft(const std::vector<double>& signal) const {
    if (signal.empty()) {
        return {{}, {}};
    }

    // Pad to next power of 2
    size_t n = next_power_of_2(signal.size());
    std::vector<std::complex<double>> x(n, {0.0, 0.0});

    // Copy signal to complex array
    for (size_t i = 0; i < signal.size(); ++i) {
        x[i] = std::complex<double>(signal[i], 0.0);
    }

    // Compute FFT
    fft_recursive(x);

    // Extract magnitude spectrum (positive frequencies only)
    size_t half_n = n / 2;
    std::vector<double> magnitudes(half_n);
    std::vector<double> frequencies(half_n);

    double freq_resolution = sample_rate_ / static_cast<double>(n);

    for (size_t i = 0; i < half_n; ++i) {
        magnitudes[i] = std::abs(x[i]) * 2.0 / static_cast<double>(n);
        frequencies[i] = static_cast<double>(i) * freq_resolution;
    }

    // DC component doesn't need doubling
    if (!magnitudes.empty()) {
        magnitudes[0] /= 2.0;
    }

    return {magnitudes, frequencies};
}

double FeatureExtractor::compute_spectral_centroid(
    const std::vector<double>& magnitudes,
    const std::vector<double>& frequencies) const {

    if (magnitudes.empty() || frequencies.empty()) {
        return 0.0;
    }

    double weighted_sum = 0.0;
    double total_power = 0.0;

    for (size_t i = 0; i < magnitudes.size() && i < frequencies.size(); ++i) {
        double power = magnitudes[i] * magnitudes[i];
        weighted_sum += frequencies[i] * power;
        total_power += power;
    }

    if (total_power < 1e-10) {
        return 0.0;
    }

    return weighted_sum / total_power;
}

double FeatureExtractor::compute_spectral_spread(
    const std::vector<double>& magnitudes,
    const std::vector<double>& frequencies,
    double centroid) const {

    if (magnitudes.empty() || frequencies.empty()) {
        return 0.0;
    }

    double weighted_var = 0.0;
    double total_power = 0.0;

    for (size_t i = 0; i < magnitudes.size() && i < frequencies.size(); ++i) {
        double power = magnitudes[i] * magnitudes[i];
        double diff = frequencies[i] - centroid;
        weighted_var += diff * diff * power;
        total_power += power;
    }

    if (total_power < 1e-10) {
        return 0.0;
    }

    return std::sqrt(weighted_var / total_power);
}

std::vector<double> FeatureExtractor::compute_bandpower(
    const std::vector<double>& magnitudes,
    const std::vector<double>& frequencies) const {

    std::vector<double> bandpowers(FREQ_BANDS.size(), 0.0);

    if (magnitudes.empty() || frequencies.empty()) {
        return bandpowers;
    }

    for (size_t i = 0; i < magnitudes.size() && i < frequencies.size(); ++i) {
        double freq = frequencies[i];
        double power = magnitudes[i] * magnitudes[i];

        for (size_t b = 0; b < FREQ_BANDS.size(); ++b) {
            if (freq >= FREQ_BANDS[b].first && freq < FREQ_BANDS[b].second) {
                bandpowers[b] += power;
                break;
            }
        }
    }

    return bandpowers;
}

std::vector<std::string> FeatureExtractor::get_band_names() const {
    return {
        "0-100 Hz",
        "100-500 Hz",
        "500-1000 Hz",
        "1000-2000 Hz",
        "2000+ Hz"
    };
}

SignalFeatures FeatureExtractor::extract_all(const std::vector<double>& signal) const {
    SignalFeatures features;

    // Time-domain features
    features.rms = compute_rms(signal);
    features.peak = compute_peak(signal);
    features.crest_factor = compute_crest_factor(signal);
    features.kurtosis = compute_kurtosis(signal);
    features.skewness = compute_skewness(signal);

    // Frequency-domain features
    auto [magnitudes, frequencies] = compute_fft(signal);
    features.fft_magnitude = magnitudes;
    features.fft_frequencies = frequencies;

    features.spectral_centroid = compute_spectral_centroid(magnitudes, frequencies);
    features.spectral_spread = compute_spectral_spread(magnitudes, frequencies, features.spectral_centroid);
    features.bandpowers = compute_bandpower(magnitudes, frequencies);
    features.band_names = get_band_names();

    return features;
}

} // namespace cpm
