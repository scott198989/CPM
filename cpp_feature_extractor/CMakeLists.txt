cmake_minimum_required(VERSION 3.16)
project(feature_extractor VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Options
option(BUILD_PYTHON_MODULE "Build Python module with pybind11" ON)
option(BUILD_CLI "Build command-line interface" ON)
option(BUILD_TESTS "Build unit tests" ON)

# Core library sources
set(LIB_SOURCES
    src/feature_extractor.cpp
)

# Create static library
add_library(feature_extractor_lib STATIC ${LIB_SOURCES})
target_include_directories(feature_extractor_lib PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# CLI executable
if(BUILD_CLI)
    add_executable(feature_extractor_cli src/main.cpp)
    target_link_libraries(feature_extractor_cli PRIVATE feature_extractor_lib)
    set_target_properties(feature_extractor_cli PROPERTIES OUTPUT_NAME "feature_extractor")
endif()

# Python module with pybind11
if(BUILD_PYTHON_MODULE)
    find_package(Python3 COMPONENTS Interpreter Development REQUIRED)

    # Try to find pybind11 via pip install location or system
    execute_process(
        COMMAND ${Python3_EXECUTABLE} -c "import pybind11; print(pybind11.get_cmake_dir())"
        OUTPUT_VARIABLE PYBIND11_CMAKE_DIR
        OUTPUT_STRIP_TRAILING_WHITESPACE
        RESULT_VARIABLE PYBIND11_RESULT
    )

    if(PYBIND11_RESULT EQUAL 0)
        list(APPEND CMAKE_PREFIX_PATH "${PYBIND11_CMAKE_DIR}")
        find_package(pybind11 CONFIG REQUIRED)

        pybind11_add_module(cpm_features bindings/pybind_module.cpp)
        target_link_libraries(cpm_features PRIVATE feature_extractor_lib)

        # Install to Python site-packages
        install(TARGETS cpm_features DESTINATION .)
    else()
        message(WARNING "pybind11 not found. Install with: pip install pybind11")
        set(BUILD_PYTHON_MODULE OFF)
    endif()
endif()

# Unit tests
if(BUILD_TESTS)
    enable_testing()
    add_executable(test_features tests/test_features.cpp)
    target_link_libraries(test_features PRIVATE feature_extractor_lib)
    add_test(NAME FeatureTests COMMAND test_features)
endif()

# Installation
install(TARGETS feature_extractor_lib ARCHIVE DESTINATION lib)
install(DIRECTORY include/ DESTINATION include)
if(BUILD_CLI)
    install(TARGETS feature_extractor_cli RUNTIME DESTINATION bin)
endif()
