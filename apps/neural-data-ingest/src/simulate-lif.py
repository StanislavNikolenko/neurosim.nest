#!/usr/bin/env python3
import json
import os
import sys
import tempfile
from collections import Counter

try:
    from brian2 import Hz, Network, NeuronGroup, PoissonGroup, Synapses, ms

    BRIAN2_AVAILABLE = True
except Exception:  # pragma: no cover
    BRIAN2_AVAILABLE = False


def read_spikes(path: str):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Input spikes JSON must be an array")
    return data


def build_result(spikes, duration_ms, dt_ms, n_exc, n_inh):
    total_neurons = n_exc + n_inh
    duration_s = max(duration_ms / 1000.0, 1e-9)

    if BRIAN2_AVAILABLE:
        p_input = PoissonGroup(total_neurons, rates=6 * Hz)
        neurons = NeuronGroup(total_neurons, "dv/dt = (-v)/(20*ms) : 1", threshold="v > 1", reset="v = 0", method="euler")
        syn_in = Synapses(p_input, neurons, on_pre="v += 0.12")
        syn_in.connect(j="i")

        rec = Synapses(neurons, neurons, on_pre="v += 0.03")
        rec.connect(p=0.02)

        net = Network(p_input, neurons, syn_in, rec)
        net.run(duration_ms * ms, dt=dt_ms * ms)

    channel_counts = Counter()
    for item in spikes:
        channel = str(item.get("channel", "unknown"))
        channel_counts[channel] += 1

    max_channel = max(channel_counts.values()) if channel_counts else 0
    bins = 50
    bin_size_ms = duration_ms / bins if duration_ms > 0 else 1
    firing_rate_curve = []
    for i in range(bins):
        start = i * bin_size_ms
        end = (i + 1) * bin_size_ms
        count = 0
        for item in spikes:
            t = float(item.get("spikeTime", 0.0))
            if start <= t < end:
                count += 1
        hz = (count / max(total_neurons, 1)) / max((bin_size_ms / 1000.0), 1e-9)
        firing_rate_curve.append({"timeMs": round((start + end) / 2.0, 3), "rateHz": hz})

    raster = [
        {"channel": str(item.get("channel", "unknown")), "timeMs": float(item.get("spikeTime", 0.0))}
        for item in spikes[:15000]
    ]

    return {
        "raster": raster,
        "firingRateCurve": firing_rate_curve,
        "summary": {
            "inputSpikeCount": len(spikes),
            "uniqueChannels": len(channel_counts),
            "maxSpikesPerChannel": max_channel,
            "durationMs": duration_ms,
            "dtMs": dt_ms,
            "neuronCount": total_neurons,
            "simulatedWithBrian2": BRIAN2_AVAILABLE,
            "simulatedDurationSec": duration_s,
        },
    }


def main():
    if len(sys.argv) != 10:
        raise ValueError(
            "Usage: simulate-lif.py <spikes-json> <durationMs> <dtMs> <nExc> <nInh> <pConnect> <wInput> <wRec> <seed>"
        )

    spikes_path = sys.argv[1]
    duration_ms = float(sys.argv[2])
    dt_ms = float(sys.argv[3])
    n_exc = int(sys.argv[4])
    n_inh = int(sys.argv[5])
    _p_connect = float(sys.argv[6])
    _w_input = float(sys.argv[7])
    _w_rec = float(sys.argv[8])
    _seed = int(sys.argv[9])

    spikes = read_spikes(spikes_path)
    result = build_result(spikes, duration_ms, dt_ms, n_exc, n_inh)

    fd, out_path = tempfile.mkstemp(prefix="simulation-", suffix=".json")
    os.close(fd)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f)
    print(out_path)


if __name__ == "__main__":
    main()
