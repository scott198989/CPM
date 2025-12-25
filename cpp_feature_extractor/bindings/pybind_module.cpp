#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/numpy.h>
#include "feature_extractor.hpp"

namespace py = pybind11;

PYBIND11_MODULE(cpm_features, m) {
    m.doc() = "CPM Feature Extractor - C++ signal processing for predictive maintenance";

    // SignalFeatures struct
    py::class_<cpm::SignalFeatures>(m, "SignalFeatures")
        .def(py::init<>())
        .def_readwrite("rms", &cpm::SignalFeatures::rms)
        .def_readwrite("peak", &cpm::SignalFeatures::peak)
        .def_readwrite("crest_factor", &cpm::SignalFeatures::crest_factor)
        .def_readwrite("kurtosis", &cpm::SignalFeatures::kurtosis)
        .def_readwrite("skewness", &cpm::SignalFeatures::skewness)
        .def_readwrite("spectral_centroid", &cpm::SignalFeatures::spectral_centroid)
        .def_readwrite("spectral_spread", &cpm::SignalFeatures::spectral_spread)
        .def_readwrite("fft_magnitude", &cpm::SignalFeatures::fft_magnitude)
        .def_readwrite("fft_frequencies", &cpm::SignalFeatures::fft_frequencies)
        .def_readwrite("bandpowers", &cpm::SignalFeatures::bandpowers)
        .def_readwrite("band_names", &cpm::SignalFeatures::band_names)
        .def("to_dict", [](const cpm::SignalFeatures& f) {
            py::dict d;
            d["rms"] = f.rms;
            d["peak"] = f.peak;
            d["crest_factor"] = f.crest_factor;
            d["kurtosis"] = f.kurtosis;
            d["skewness"] = f.skewness;
            d["spectral_centroid"] = f.spectral_centroid;
            d["spectral_spread"] = f.spectral_spread;
            d["fft_magnitude"] = f.fft_magnitude;
            d["fft_frequencies"] = f.fft_frequencies;

            py::dict bp;
            for (size_t i = 0; i < f.bandpowers.size() && i < f.band_names.size(); ++i) {
                bp[py::cast(f.band_names[i])] = f.bandpowers[i];
            }
            d["bandpowers"] = bp;

            return d;
        });

    // FeatureExtractor class
    py::class_<cpm::FeatureExtractor>(m, "FeatureExtractor")
        .def(py::init<double>(), py::arg("sample_rate") = 5000.0,
             "Create a feature extractor with the given sample rate (Hz)")

        .def("extract_all", [](const cpm::FeatureExtractor& fe, py::array_t<double> signal) {
            py::buffer_info buf = signal.request();
            if (buf.ndim != 1) {
                throw std::runtime_error("Signal must be a 1D array");
            }
            std::vector<double> vec(static_cast<double*>(buf.ptr),
                                   static_cast<double*>(buf.ptr) + buf.shape[0]);
            return fe.extract_all(vec);
        }, py::arg("signal"), "Extract all features from a signal array")

        .def("compute_rms", [](const cpm::FeatureExtractor& fe, py::array_t<double> signal) {
            py::buffer_info buf = signal.request();
            std::vector<double> vec(static_cast<double*>(buf.ptr),
                                   static_cast<double*>(buf.ptr) + buf.shape[0]);
            return fe.compute_rms(vec);
        }, py::arg("signal"), "Compute Root Mean Square")

        .def("compute_peak", [](const cpm::FeatureExtractor& fe, py::array_t<double> signal) {
            py::buffer_info buf = signal.request();
            std::vector<double> vec(static_cast<double*>(buf.ptr),
                                   static_cast<double*>(buf.ptr) + buf.shape[0]);
            return fe.compute_peak(vec);
        }, py::arg("signal"), "Compute peak (max absolute value)")

        .def("compute_crest_factor", [](const cpm::FeatureExtractor& fe, py::array_t<double> signal) {
            py::buffer_info buf = signal.request();
            std::vector<double> vec(static_cast<double*>(buf.ptr),
                                   static_cast<double*>(buf.ptr) + buf.shape[0]);
            return fe.compute_crest_factor(vec);
        }, py::arg("signal"), "Compute Crest Factor (peak/RMS)")

        .def("compute_kurtosis", [](const cpm::FeatureExtractor& fe, py::array_t<double> signal) {
            py::buffer_info buf = signal.request();
            std::vector<double> vec(static_cast<double*>(buf.ptr),
                                   static_cast<double*>(buf.ptr) + buf.shape[0]);
            return fe.compute_kurtosis(vec);
        }, py::arg("signal"), "Compute excess kurtosis")

        .def("compute_skewness", [](const cpm::FeatureExtractor& fe, py::array_t<double> signal) {
            py::buffer_info buf = signal.request();
            std::vector<double> vec(static_cast<double*>(buf.ptr),
                                   static_cast<double*>(buf.ptr) + buf.shape[0]);
            return fe.compute_skewness(vec);
        }, py::arg("signal"), "Compute skewness")

        .def("compute_fft", [](const cpm::FeatureExtractor& fe, py::array_t<double> signal) {
            py::buffer_info buf = signal.request();
            std::vector<double> vec(static_cast<double*>(buf.ptr),
                                   static_cast<double*>(buf.ptr) + buf.shape[0]);
            auto [mags, freqs] = fe.compute_fft(vec);
            return py::make_tuple(
                py::array_t<double>(mags.size(), mags.data()),
                py::array_t<double>(freqs.size(), freqs.data())
            );
        }, py::arg("signal"), "Compute FFT, returns (magnitudes, frequencies)")

        .def_property("sample_rate",
            &cpm::FeatureExtractor::get_sample_rate,
            &cpm::FeatureExtractor::set_sample_rate,
            "Sample rate in Hz")

        .def("get_band_names", &cpm::FeatureExtractor::get_band_names,
             "Get names of frequency bands");

    // Convenience function
    m.def("extract_features", [](py::array_t<double> signal, double sample_rate) {
        cpm::FeatureExtractor fe(sample_rate);
        py::buffer_info buf = signal.request();
        if (buf.ndim != 1) {
            throw std::runtime_error("Signal must be a 1D array");
        }
        std::vector<double> vec(static_cast<double*>(buf.ptr),
                               static_cast<double*>(buf.ptr) + buf.shape[0]);
        return fe.extract_all(vec);
    }, py::arg("signal"), py::arg("sample_rate") = 5000.0,
       "Extract all features from a signal (convenience function)");

    // Version info
    m.attr("__version__") = "1.0.0";
}
