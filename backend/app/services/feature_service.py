"""
Feature extraction service.

Provides Python-native feature extraction that mirrors the C++ implementation.
Used as fallback when C++ module is not available.
"""
import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class SignalFeatures:
    """Extracted features from a vibration signal."""
    rms: float
    peak: float
    crest_factor: float
    kurtosis: float
    skewness: float
    spectral_centroid: float
    spectral_spread: float
    fft_magnitude: np.ndarray
    fft_frequencies: np.ndarray
    bandpowers: dict[str, float]


class FeatureExtractor:
    """Python feature extractor (mirrors C++ implementation)."""

    FREQ_BANDS = [
        ("0-100 Hz", 0, 100),
        ("100-500 Hz", 100, 500),
        ("500-1000 Hz", 500, 1000),
        ("1000-2000 Hz", 1000, 2000),
        ("2000+ Hz", 2000, 10000),
    ]

    def __init__(self, sample_rate: float = 5000.0):
        self.sample_rate = sample_rate

    def extract_all(self, signal: np.ndarray) -> SignalFeatures:
        """Extract all features from a signal."""
        if len(signal) == 0:
            return self._empty_features()

        # Time-domain features
        rms = self.compute_rms(signal)
        peak = self.compute_peak(signal)
        crest_factor = peak / rms if rms > 1e-10 else 0
        kurtosis = self.compute_kurtosis(signal)
        skewness = self.compute_skewness(signal)

        # Frequency-domain features
        magnitudes, frequencies = self.compute_fft(signal)
        spectral_centroid = self.compute_spectral_centroid(magnitudes, frequencies)
        spectral_spread = self.compute_spectral_spread(magnitudes, frequencies, spectral_centroid)
        bandpowers = self.compute_bandpower(magnitudes, frequencies)

        return SignalFeatures(
            rms=rms,
            peak=peak,
            crest_factor=crest_factor,
            kurtosis=kurtosis,
            skewness=skewness,
            spectral_centroid=spectral_centroid,
            spectral_spread=spectral_spread,
            fft_magnitude=magnitudes,
            fft_frequencies=frequencies,
            bandpowers=bandpowers
        )

    def compute_rms(self, signal: np.ndarray) -> float:
        """Compute Root Mean Square."""
        return float(np.sqrt(np.mean(signal ** 2)))

    def compute_peak(self, signal: np.ndarray) -> float:
        """Compute peak (max absolute value)."""
        return float(np.max(np.abs(signal)))

    def compute_kurtosis(self, signal: np.ndarray) -> float:
        """Compute excess kurtosis."""
        if len(signal) < 4:
            return 0.0

        mean = np.mean(signal)
        diff = signal - mean
        m2 = np.mean(diff ** 2)
        m4 = np.mean(diff ** 4)

        if m2 < 1e-10:
            return 0.0

        return float(m4 / (m2 ** 2) - 3.0)

    def compute_skewness(self, signal: np.ndarray) -> float:
        """Compute skewness."""
        if len(signal) < 3:
            return 0.0

        mean = np.mean(signal)
        diff = signal - mean
        m2 = np.mean(diff ** 2)
        m3 = np.mean(diff ** 3)

        std = np.sqrt(m2)
        if std < 1e-10:
            return 0.0

        return float(m3 / (std ** 3))

    def compute_fft(self, signal: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Compute FFT and return magnitude spectrum."""
        n = len(signal)
        if n == 0:
            return np.array([]), np.array([])

        # Compute FFT
        fft_result = np.fft.fft(signal)
        half_n = n // 2

        # Magnitude spectrum (normalized)
        magnitudes = np.abs(fft_result[:half_n]) * 2 / n
        magnitudes[0] /= 2  # DC component

        # Frequency bins
        frequencies = np.fft.fftfreq(n, 1 / self.sample_rate)[:half_n]

        return magnitudes, frequencies

    def compute_spectral_centroid(
        self,
        magnitudes: np.ndarray,
        frequencies: np.ndarray
    ) -> float:
        """Compute spectral centroid (weighted mean frequency)."""
        if len(magnitudes) == 0:
            return 0.0

        power = magnitudes ** 2
        total_power = np.sum(power)

        if total_power < 1e-10:
            return 0.0

        return float(np.sum(frequencies * power) / total_power)

    def compute_spectral_spread(
        self,
        magnitudes: np.ndarray,
        frequencies: np.ndarray,
        centroid: float
    ) -> float:
        """Compute spectral spread (std around centroid)."""
        if len(magnitudes) == 0:
            return 0.0

        power = magnitudes ** 2
        total_power = np.sum(power)

        if total_power < 1e-10:
            return 0.0

        variance = np.sum(((frequencies - centroid) ** 2) * power) / total_power
        return float(np.sqrt(variance))

    def compute_bandpower(
        self,
        magnitudes: np.ndarray,
        frequencies: np.ndarray
    ) -> dict[str, float]:
        """Compute power in frequency bands."""
        bandpowers = {}

        for name, low, high in self.FREQ_BANDS:
            mask = (frequencies >= low) & (frequencies < high)
            power = np.sum(magnitudes[mask] ** 2) if mask.any() else 0.0
            bandpowers[name] = float(power)

        return bandpowers

    def _empty_features(self) -> SignalFeatures:
        """Return empty features for empty signal."""
        return SignalFeatures(
            rms=0.0,
            peak=0.0,
            crest_factor=0.0,
            kurtosis=0.0,
            skewness=0.0,
            spectral_centroid=0.0,
            spectral_spread=0.0,
            fft_magnitude=np.array([]),
            fft_frequencies=np.array([]),
            bandpowers={name: 0.0 for name, _, _ in self.FREQ_BANDS}
        )


# Try to import C++ module, fall back to Python
try:
    import cpm_features as cpp_extractor
    _USE_CPP = True
except ImportError:
    _USE_CPP = False


def get_extractor(sample_rate: float = 5000.0):
    """Get feature extractor (C++ if available, else Python)."""
    if _USE_CPP:
        return cpp_extractor.FeatureExtractor(sample_rate)
    else:
        return FeatureExtractor(sample_rate)


def extract_features(signal: np.ndarray, sample_rate: float = 5000.0) -> SignalFeatures:
    """Extract features from signal using best available implementation."""
    extractor = get_extractor(sample_rate)

    if _USE_CPP:
        result = extractor.extract_all(signal)
        return SignalFeatures(
            rms=result.rms,
            peak=result.peak,
            crest_factor=result.crest_factor,
            kurtosis=result.kurtosis,
            skewness=result.skewness,
            spectral_centroid=result.spectral_centroid,
            spectral_spread=result.spectral_spread,
            fft_magnitude=np.array(result.fft_magnitude),
            fft_frequencies=np.array(result.fft_frequencies),
            bandpowers=dict(zip(result.band_names, result.bandpowers))
        )
    else:
        return extractor.extract_all(signal)
