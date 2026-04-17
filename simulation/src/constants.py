"""
Static IEEE 14-bus system configuration.
These values define the network topology and are used to initialize the grid model.

TODO (simulation engineer): These constants can serve as the pandapower network
definition. Use them in a create_network() function to build the pp.create_empty_network()
object with the correct buses, lines, generators, and loads.
"""

# 14 buses — types: slack (swing/reference), pv (voltage-controlled), pq (load bus)
BUS_CONFIG = [
    {"id": 1,  "type": "slack", "nominal_kv": 138.0, "base_voltage_pu": 1.060},
    {"id": 2,  "type": "pv",    "nominal_kv": 138.0, "base_voltage_pu": 1.045},
    {"id": 3,  "type": "pv",    "nominal_kv": 138.0, "base_voltage_pu": 1.010},
    {"id": 4,  "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.019},
    {"id": 5,  "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.020},
    {"id": 6,  "type": "pv",    "nominal_kv": 138.0, "base_voltage_pu": 1.070},
    {"id": 7,  "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.062},
    {"id": 8,  "type": "pv",    "nominal_kv": 138.0, "base_voltage_pu": 1.090},
    {"id": 9,  "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.056},
    {"id": 10, "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.051},
    {"id": 11, "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.057},
    {"id": 12, "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.055},
    {"id": 13, "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.050},
    {"id": 14, "type": "pq",    "nominal_kv": 138.0, "base_voltage_pu": 1.036},
]

# 5 generators at buses 1, 2, 3, 6, 8 (IDs 0–4)
GENERATOR_CONFIG = [
    {"id": 0, "bus": 1, "base_output_mw": 232.4, "capacity_mw": 250.0},
    {"id": 1, "bus": 2, "base_output_mw": 40.0,  "capacity_mw": 60.0},
    {"id": 2, "bus": 3, "base_output_mw": 0.0,   "capacity_mw": 40.0},
    {"id": 3, "bus": 6, "base_output_mw": 0.0,   "capacity_mw": 25.0},
    {"id": 4, "bus": 8, "base_output_mw": 0.0,   "capacity_mw": 25.0},
]

# 20 transmission lines (IDs 0–19)
LINE_CONFIG = [
    {"id": 0,  "from_bus": 1,  "to_bus": 2,  "rated_mw": 175.0, "base_power_mw": 152.4, "base_loading": 87.1},
    {"id": 1,  "from_bus": 1,  "to_bus": 5,  "rated_mw": 175.0, "base_power_mw": 75.5,  "base_loading": 43.1},
    {"id": 2,  "from_bus": 2,  "to_bus": 3,  "rated_mw": 130.0, "base_power_mw": 71.8,  "base_loading": 55.2},
    {"id": 3,  "from_bus": 2,  "to_bus": 4,  "rated_mw": 130.0, "base_power_mw": 56.3,  "base_loading": 43.3},
    {"id": 4,  "from_bus": 2,  "to_bus": 5,  "rated_mw": 130.0, "base_power_mw": 41.5,  "base_loading": 31.9},
    {"id": 5,  "from_bus": 3,  "to_bus": 4,  "rated_mw": 130.0, "base_power_mw": 23.4,  "base_loading": 18.0},
    {"id": 6,  "from_bus": 4,  "to_bus": 5,  "rated_mw": 130.0, "base_power_mw": 61.7,  "base_loading": 47.5},
    {"id": 7,  "from_bus": 4,  "to_bus": 7,  "rated_mw": 100.0, "base_power_mw": 27.4,  "base_loading": 27.4},
    {"id": 8,  "from_bus": 4,  "to_bus": 9,  "rated_mw": 100.0, "base_power_mw": 16.0,  "base_loading": 16.0},
    {"id": 9,  "from_bus": 5,  "to_bus": 6,  "rated_mw": 100.0, "base_power_mw": 44.0,  "base_loading": 44.0},
    {"id": 10, "from_bus": 6,  "to_bus": 11, "rated_mw": 65.0,  "base_power_mw": 7.2,   "base_loading": 11.1},
    {"id": 11, "from_bus": 6,  "to_bus": 12, "rated_mw": 65.0,  "base_power_mw": 7.9,   "base_loading": 12.2},
    {"id": 12, "from_bus": 6,  "to_bus": 13, "rated_mw": 65.0,  "base_power_mw": 17.5,  "base_loading": 26.9},
    {"id": 13, "from_bus": 7,  "to_bus": 8,  "rated_mw": 100.0, "base_power_mw": 0.0,   "base_loading": 0.0},
    {"id": 14, "from_bus": 7,  "to_bus": 9,  "rated_mw": 100.0, "base_power_mw": 27.4,  "base_loading": 27.4},
    {"id": 15, "from_bus": 9,  "to_bus": 10, "rated_mw": 65.0,  "base_power_mw": 5.8,   "base_loading": 8.9},
    {"id": 16, "from_bus": 9,  "to_bus": 14, "rated_mw": 65.0,  "base_power_mw": 9.2,   "base_loading": 14.2},
    {"id": 17, "from_bus": 10, "to_bus": 11, "rated_mw": 65.0,  "base_power_mw": 3.5,   "base_loading": 5.4},
    {"id": 18, "from_bus": 12, "to_bus": 13, "rated_mw": 65.0,  "base_power_mw": 1.6,   "base_loading": 2.5},
    {"id": 19, "from_bus": 13, "to_bus": 14, "rated_mw": 65.0,  "base_power_mw": 5.6,   "base_loading": 8.6},
]

# 11 load points
LOAD_CONFIG = [
    {"id": 0,  "bus": 2,  "base_demand_mw": 21.7, "base_demand_mvar": 12.7},
    {"id": 1,  "bus": 3,  "base_demand_mw": 94.2, "base_demand_mvar": 19.0},
    {"id": 2,  "bus": 4,  "base_demand_mw": 47.8, "base_demand_mvar": -3.9},
    {"id": 3,  "bus": 5,  "base_demand_mw": 7.6,  "base_demand_mvar": 1.6},
    {"id": 4,  "bus": 6,  "base_demand_mw": 11.2, "base_demand_mvar": 7.5},
    {"id": 5,  "bus": 9,  "base_demand_mw": 29.5, "base_demand_mvar": 16.6},
    {"id": 6,  "bus": 10, "base_demand_mw": 9.0,  "base_demand_mvar": 5.8},
    {"id": 7,  "bus": 11, "base_demand_mw": 3.5,  "base_demand_mvar": 1.8},
    {"id": 8,  "bus": 12, "base_demand_mw": 6.1,  "base_demand_mvar": 1.6},
    {"id": 9,  "bus": 13, "base_demand_mw": 13.5, "base_demand_mvar": 5.8},
    {"id": 10, "bus": 14, "base_demand_mw": 14.9, "base_demand_mvar": 5.0},
]
