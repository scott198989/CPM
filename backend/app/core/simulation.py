"""
Causal simulation for predictive maintenance data.

Causal DAG:
    Load ──┬──→ Vibration ──→ Heat ──┬──→ Wear ──→ Failure_Risk
    Speed ─┘                         │
                        Lubrication ─┘
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional
from .config import get_settings


@dataclass
class Asset:
    """Simulated industrial asset (e.g., motor, pump, compressor)."""
    id: str
    name: str
    asset_type: str
    install_date: str
    location: str
    criticality: str  # "high", "medium", "low"


@dataclass
class SimulationResult:
    """Result of running a simulation."""
    assets: list[Asset]
    timeseries: dict[str, pd.DataFrame]  # asset_id -> DataFrame
    waveforms: dict[str, np.ndarray]  # asset_id -> (timesteps, samples) array


class CausalSimulator:
    """
    Simulates sensor data with embedded causal structure.

    The causal relationships are:
    1. Load and Speed → Vibration magnitude
    2. Vibration → Heat generation
    3. Heat + Lubrication interval → Wear rate
    4. Wear level → Failure Risk
    """

    ASSET_TYPES = ["Motor", "Pump", "Compressor", "Gearbox", "Fan"]
    LOCATIONS = ["Plant A - Line 1", "Plant A - Line 2", "Plant B - Line 1", "Plant B - Line 2", "Plant C"]
    CRITICALITIES = ["high", "medium", "low"]

    def __init__(self, seed: Optional[int] = None):
        settings = get_settings()
        self.seed = seed or settings.random_seed
        self.rng = np.random.default_rng(self.seed)
        self.num_assets = settings.num_assets
        self.timesteps = settings.timesteps_per_asset
        self.sample_rate = settings.sample_rate
        self.samples_per_waveform = settings.samples_per_waveform

    def generate(self) -> SimulationResult:
        """Generate complete simulation dataset."""
        assets = self._generate_assets()
        timeseries = {}
        waveforms = {}

        for asset in assets:
            ts, wf = self._simulate_asset(asset)
            timeseries[asset.id] = ts
            waveforms[asset.id] = wf

        return SimulationResult(
            assets=assets,
            timeseries=timeseries,
            waveforms=waveforms
        )

    def _generate_assets(self) -> list[Asset]:
        """Generate asset metadata."""
        assets = []
        for i in range(self.num_assets):
            asset_type = self.rng.choice(self.ASSET_TYPES)
            assets.append(Asset(
                id=f"ASSET-{i+1:04d}",
                name=f"{asset_type}-{i+1:03d}",
                asset_type=asset_type,
                install_date=f"202{self.rng.integers(0, 4)}-{self.rng.integers(1, 13):02d}-{self.rng.integers(1, 29):02d}",
                location=self.rng.choice(self.LOCATIONS),
                criticality=self.rng.choice(self.CRITICALITIES, p=[0.2, 0.5, 0.3])
            ))
        return assets

    def _simulate_asset(self, asset: Asset) -> tuple[pd.DataFrame, np.ndarray]:
        """
        Simulate sensor timeseries for one asset with causal relationships.

        Returns:
            - DataFrame with scalar sensor readings
            - ndarray of shape (timesteps, samples) with vibration waveforms
        """
        T = self.timesteps

        # Initialize arrays
        timestamps = pd.date_range(start="2024-01-01", periods=T, freq="h")

        # Exogenous variables with realistic patterns
        # Load: industrial load pattern with daily/weekly cycles
        hour_of_day = np.arange(T) % 24
        day_of_week = (np.arange(T) // 24) % 7

        base_load = 60 + 20 * np.sin(2 * np.pi * hour_of_day / 24)  # Daily cycle
        weekend_effect = np.where(day_of_week >= 5, -15, 0)  # Lower on weekends
        load_noise = self.rng.normal(0, 5, T)
        load = np.clip(base_load + weekend_effect + load_noise, 20, 100)

        # Speed: correlated with load
        speed_base = 1000 + 500 * (load / 100)
        speed_noise = self.rng.normal(0, 50, T)
        speed = np.clip(speed_base + speed_noise, 500, 2000)

        # Lubrication: periodic maintenance (every ~168 hours = 1 week)
        # Higher values = longer since last lubrication
        lubrication_interval = np.zeros(T)
        last_lub = 0
        for t in range(T):
            lubrication_interval[t] = t - last_lub
            # Periodic maintenance with some randomness
            if (t - last_lub) > 150 + self.rng.integers(-20, 20):
                last_lub = t

        # Ambient temperature: seasonal + daily pattern
        ambient_base = 22 + 8 * np.sin(2 * np.pi * np.arange(T) / (24 * 365))
        ambient_daily = 5 * np.sin(2 * np.pi * hour_of_day / 24 - np.pi/2)
        ambient_noise = self.rng.normal(0, 2, T)
        ambient = ambient_base + ambient_daily + ambient_noise

        # === Causal relationships ===

        # 1. Load + Speed → Vibration base level
        # Higher load and speed increase vibration
        vib_from_load = 0.015 * load
        vib_from_speed = 0.001 * speed
        vibration_base = vib_from_load + vib_from_speed

        # Add degradation trend (wear accumulation)
        # Different assets have different degradation rates
        degradation_rate = self.rng.uniform(0.0001, 0.0005)
        degradation_trend = degradation_rate * np.arange(T)

        # 2. Vibration → Heat
        # Friction from vibration generates heat
        vibration_level = vibration_base + degradation_trend + self.rng.normal(0, 0.3, T)
        vibration_level = np.clip(vibration_level, 0.5, 15)

        heat_from_vibration = 0.8 * vibration_level
        heat_from_load = 0.1 * load
        temp_base = ambient + heat_from_vibration + heat_from_load
        temp_noise = self.rng.normal(0, 2, T)
        temperature = np.clip(temp_base + temp_noise, 20, 120)

        # 3. Heat + Lubrication → Wear
        # Higher temp and longer since lubrication = faster wear
        wear = np.zeros(T)
        cumulative_wear = 0
        for t in range(T):
            heat_factor = max(0, (temperature[t] - 40) / 80)  # Normalized 0-1
            lub_factor = min(1, lubrication_interval[t] / 200)  # Normalized 0-1
            wear_rate = 0.001 * (1 + heat_factor + lub_factor)
            cumulative_wear += wear_rate
            wear[t] = cumulative_wear

        # Normalize wear to 0-100 scale
        wear = 100 * wear / (wear.max() + 1e-6)

        # 4. Wear → Failure Risk
        # Sigmoid transformation of wear
        failure_risk = 100 / (1 + np.exp(-0.1 * (wear - 50)))

        # Current (electrical): correlates with load
        current = 10 + 0.15 * load + self.rng.normal(0, 1, T)
        current = np.clip(current, 5, 35)

        # Add occasional anomalies/spikes
        spike_mask = self.rng.random(T) < 0.02  # 2% chance of spike
        vibration_level[spike_mask] *= self.rng.uniform(1.5, 3.0, spike_mask.sum())

        # Add occasional missing values
        missing_mask = self.rng.random(T) < 0.01  # 1% missing
        temp_with_missing = temperature.copy()
        temp_with_missing[missing_mask] = np.nan

        # Create DataFrame
        df = pd.DataFrame({
            "timestamp": timestamps,
            "load": load,
            "speed": speed,
            "vibration_level": vibration_level,
            "temperature": temp_with_missing,
            "current": current,
            "ambient_temp": ambient,
            "lubrication_interval": lubrication_interval,
            "wear": wear,
            "failure_risk": failure_risk
        })

        # Generate vibration waveforms
        waveforms = self._generate_waveforms(vibration_level, speed, wear)

        return df, waveforms

    def _generate_waveforms(
        self,
        vibration_levels: np.ndarray,
        speeds: np.ndarray,
        wear_levels: np.ndarray
    ) -> np.ndarray:
        """
        Generate realistic vibration waveforms.

        Each waveform contains:
        - Fundamental frequency (based on speed)
        - Harmonics (increase with wear)
        - Random noise
        - Occasional transients
        """
        T = len(vibration_levels)
        N = self.samples_per_waveform
        sr = self.sample_rate

        waveforms = np.zeros((T, N))
        t = np.arange(N) / sr  # Time vector for one waveform

        for i in range(T):
            # Fundamental frequency based on speed (RPM to Hz)
            f0 = speeds[i] / 60

            # Amplitude based on vibration level
            amp = vibration_levels[i] / 10

            # Generate waveform with harmonics
            signal = amp * np.sin(2 * np.pi * f0 * t)

            # Add harmonics (more prominent with higher wear)
            wear_factor = wear_levels[i] / 100
            for h in range(2, 6):
                harmonic_amp = amp * wear_factor * (0.5 ** h) * self.rng.uniform(0.5, 1.5)
                phase = self.rng.uniform(0, 2 * np.pi)
                signal += harmonic_amp * np.sin(2 * np.pi * h * f0 * t + phase)

            # Add bearing defect frequency (if wear is high)
            if wear_factor > 0.3:
                bpfo = f0 * 3.5  # Ball pass frequency outer race
                defect_amp = amp * wear_factor * 0.3
                signal += defect_amp * np.sin(2 * np.pi * bpfo * t)

            # Add random noise
            noise_level = 0.1 + 0.2 * wear_factor
            signal += self.rng.normal(0, noise_level * amp, N)

            # Occasional transient (impact)
            if self.rng.random() < 0.05:
                impact_pos = self.rng.integers(N // 4, 3 * N // 4)
                impact = np.zeros(N)
                impact[impact_pos:impact_pos + 50] = amp * 2 * np.exp(-np.arange(50) / 10)
                signal += impact

            waveforms[i] = signal

        return waveforms


# Global simulator instance
_simulator: Optional[CausalSimulator] = None
_simulation_result: Optional[SimulationResult] = None


def get_simulation() -> SimulationResult:
    """Get or create simulation result (cached)."""
    global _simulator, _simulation_result

    if _simulation_result is None:
        _simulator = CausalSimulator()
        _simulation_result = _simulator.generate()

    return _simulation_result


def reset_simulation(seed: Optional[int] = None) -> SimulationResult:
    """Reset simulation with new seed."""
    global _simulator, _simulation_result

    _simulator = CausalSimulator(seed=seed)
    _simulation_result = _simulator.generate()

    return _simulation_result
