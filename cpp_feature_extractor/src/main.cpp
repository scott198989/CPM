#include "feature_extractor.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>

void print_usage(const char* program) {
    std::cerr << "Usage: " << program << " [OPTIONS] <input_file>\n"
              << "\n"
              << "Extract vibration signal features from a CSV file.\n"
              << "\n"
              << "Options:\n"
              << "  -r, --rate <Hz>     Sample rate in Hz (default: 5000)\n"
              << "  -o, --output <file> Output file (default: stdout)\n"
              << "  -j, --json          Output in JSON format\n"
              << "  -h, --help          Show this help message\n"
              << "\n"
              << "Input format: CSV with one sample per line, or comma-separated values.\n"
              << "\n"
              << "Example:\n"
              << "  " << program << " -r 5000 --json vibration_data.csv\n";
}

std::vector<double> read_signal(const std::string& filename) {
    std::vector<double> signal;
    std::ifstream file(filename);

    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filename);
    }

    std::string line;
    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string value;

        while (std::getline(ss, value, ',')) {
            // Trim whitespace
            size_t start = value.find_first_not_of(" \t\r\n");
            size_t end = value.find_last_not_of(" \t\r\n");

            if (start != std::string::npos && end != std::string::npos) {
                std::string trimmed = value.substr(start, end - start + 1);
                if (!trimmed.empty()) {
                    try {
                        signal.push_back(std::stod(trimmed));
                    } catch (...) {
                        // Skip non-numeric values (headers, etc.)
                    }
                }
            }
        }
    }

    return signal;
}

void output_text(const cpm::SignalFeatures& features, std::ostream& out) {
    out << std::fixed << std::setprecision(6);

    out << "=== Time-Domain Features ===\n"
        << "RMS:           " << features.rms << "\n"
        << "Peak:          " << features.peak << "\n"
        << "Crest Factor:  " << features.crest_factor << "\n"
        << "Kurtosis:      " << features.kurtosis << "\n"
        << "Skewness:      " << features.skewness << "\n"
        << "\n"
        << "=== Frequency-Domain Features ===\n"
        << "Spectral Centroid: " << features.spectral_centroid << " Hz\n"
        << "Spectral Spread:   " << features.spectral_spread << " Hz\n"
        << "\n"
        << "=== Band Power ===\n";

    for (size_t i = 0; i < features.bandpowers.size(); ++i) {
        out << "  " << features.band_names[i] << ": " << features.bandpowers[i] << "\n";
    }

    out << "\n"
        << "FFT Spectrum: " << features.fft_magnitude.size() << " frequency bins\n";
}

void output_json(const cpm::SignalFeatures& features, std::ostream& out) {
    out << std::fixed << std::setprecision(6);

    out << "{\n"
        << "  \"rms\": " << features.rms << ",\n"
        << "  \"peak\": " << features.peak << ",\n"
        << "  \"crest_factor\": " << features.crest_factor << ",\n"
        << "  \"kurtosis\": " << features.kurtosis << ",\n"
        << "  \"skewness\": " << features.skewness << ",\n"
        << "  \"spectral_centroid\": " << features.spectral_centroid << ",\n"
        << "  \"spectral_spread\": " << features.spectral_spread << ",\n"
        << "  \"bandpowers\": {\n";

    for (size_t i = 0; i < features.bandpowers.size(); ++i) {
        out << "    \"" << features.band_names[i] << "\": " << features.bandpowers[i];
        if (i < features.bandpowers.size() - 1) out << ",";
        out << "\n";
    }

    out << "  },\n"
        << "  \"fft_magnitude\": [";

    for (size_t i = 0; i < features.fft_magnitude.size(); ++i) {
        if (i > 0) out << ", ";
        out << features.fft_magnitude[i];
    }

    out << "],\n"
        << "  \"fft_frequencies\": [";

    for (size_t i = 0; i < features.fft_frequencies.size(); ++i) {
        if (i > 0) out << ", ";
        out << features.fft_frequencies[i];
    }

    out << "]\n"
        << "}\n";
}

int main(int argc, char* argv[]) {
    double sample_rate = 5000.0;
    std::string input_file;
    std::string output_file;
    bool json_output = false;

    // Parse arguments
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            return 0;
        } else if (arg == "-r" || arg == "--rate") {
            if (i + 1 >= argc) {
                std::cerr << "Error: --rate requires a value\n";
                return 1;
            }
            sample_rate = std::stod(argv[++i]);
        } else if (arg == "-o" || arg == "--output") {
            if (i + 1 >= argc) {
                std::cerr << "Error: --output requires a filename\n";
                return 1;
            }
            output_file = argv[++i];
        } else if (arg == "-j" || arg == "--json") {
            json_output = true;
        } else if (arg[0] == '-') {
            std::cerr << "Unknown option: " << arg << "\n";
            print_usage(argv[0]);
            return 1;
        } else {
            input_file = arg;
        }
    }

    if (input_file.empty()) {
        std::cerr << "Error: No input file specified\n";
        print_usage(argv[0]);
        return 1;
    }

    try {
        // Read signal
        std::vector<double> signal = read_signal(input_file);

        if (signal.empty()) {
            std::cerr << "Error: No valid samples found in input file\n";
            return 1;
        }

        std::cerr << "Read " << signal.size() << " samples\n";

        // Extract features
        cpm::FeatureExtractor extractor(sample_rate);
        cpm::SignalFeatures features = extractor.extract_all(signal);

        // Output
        if (output_file.empty()) {
            if (json_output) {
                output_json(features, std::cout);
            } else {
                output_text(features, std::cout);
            }
        } else {
            std::ofstream out(output_file);
            if (!out.is_open()) {
                std::cerr << "Error: Cannot open output file: " << output_file << "\n";
                return 1;
            }
            if (json_output) {
                output_json(features, out);
            } else {
                output_text(features, out);
            }
        }

        return 0;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
}
