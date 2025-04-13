import xml.etree.ElementTree as ET
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks
import matplotlib.pyplot as plt
import json

# Parse the XML configuration file to get the number of channels and sampling rate
def parse_xml_config(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    # Represents the number of individual electrodes or recording sites used simultaneously to collect neural data
    n_channels = int(root.findtext('acquisitionSystem/nChannels'))

    # Measured in Hertz (Hz), represents how many data points are collected per second
    sampling_rate = float(root.findtext('acquisitionSystem/samplingRate'))

    return {
        "n_channels": n_channels,
        "sampling_rate": sampling_rate
    }

# Load the .dat file into a numpy array
# This creates a structure where:
# Each row represents a single time point in the recording
# Each column represents a different recording channel
# [
#   [ch1_t1, ch2_t1, ch3_t1, ch4_t1],  # Time point 1
#   [ch1_t2, ch2_t2, ch3_t2, ch4_t2],  # Time point 2
#   ...
# ]

def load_dat_file(dat_path, n_channels):
    raw_data = np.fromfile(dat_path, dtype=np.int16)
    raw_data = raw_data.reshape((-1, n_channels))
    return raw_data


def bandpass_filter(signal, lowcut, highcut, fs, order=3):
    nyq = 0.5 * fs

    # Get coefficients for the Butterworth filter
    # Helps remove noise and artifacts (e.g., 50/60 Hz line noise)
    b, a = butter(order, [lowcut / nyq, highcut / nyq], btype='band')

    # Apply the filter to the signal
    # Without filtfilt() (standard filtering):
    # A spike at t=10ms might appear at t=10.2ms in the filtered signal
    # Waveform shapes can be distorted
    # With filtfilt():
    # A spike at t=10ms remains at exactly t=10ms in the filtered signal
    # Waveform shapes are preserved
    return filtfilt(b, a, signal)

# Alternative method for spike detection. Previous version.
# def detect_spikes(signal, threshold=-200):
#     spikes = np.where(signal < threshold)[0]
#     return spikes

def detect_spikes(signal):
    # Find positive peaks in the filtered intracellular signal
    peaks, _ = find_peaks(signal, height=200, distance=int(0.001*config["sampling_rate"]))
    return peaks

def plot_spikes(signal, spike_indices, fs):
    times = np.arange(len(signal)) / fs
    plt.plot(times, signal)
    plt.scatter(times[spike_indices], signal[spike_indices], color='red')
    plt.title("Intracellular Signal with Detected Spikes")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.show()

def export_spike_times(spike_indices, sampling_rate, out_path):
    spike_times = spike_indices / sampling_rate
    json_data = [{"neuronId": "channel_01", "spikeTime": float(t)} for t in spike_times]
    with open(out_path, "w") as f:
        json.dump(json_data, f, indent=2)

xml_file = "data/d11221/d11221.001.xml"
dat_file = "data/d11221/d11221.001.dat"

config = parse_xml_config(xml_file)
signal_data = load_dat_file(dat_file, config["n_channels"])

intracellular_channel = config["n_channels"] - 2  # Second-to-last channel
intracellular = signal_data[:, intracellular_channel]

# The 300-3000 Hz range is a standard choice for spike detection.
filtered = bandpass_filter(intracellular, 300, 3000, config["sampling_rate"])
spike_indices = detect_spikes(filtered)

plot_spikes(filtered, spike_indices, config["sampling_rate"])
export_spike_times(spike_indices, config["sampling_rate"], "spike_times.json")
