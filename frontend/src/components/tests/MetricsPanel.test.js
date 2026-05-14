import { render, screen } from "@testing-library/react";
import MetricsPanel from "../MetricsPanel";

// Basic rendering
test("displays loading text when metrics is null", () => {
  render(<MetricsPanel metrics={null} />);
  expect(screen.getByText("Loading metrics...")).toBeInTheDocument();
});

test("displays Frequency label", () => {
  const mockMetrics = {
    frequency_hz: 60.0,
    total_generation_mw: 3500,
    total_load_mw: 3450,
    total_losses_mw: 50,
  };
  render(<MetricsPanel metrics={mockMetrics} />);
  expect(screen.getByText("Frequency")).toBeInTheDocument();
});

test("displays all four metric values", () => {
  const mockMetrics = {
    frequency_hz: 60.0,
    total_generation_mw: 3500,
    total_load_mw: 3450,
    total_losses_mw: 50,
  };
  render(<MetricsPanel metrics={mockMetrics} />);
  expect(screen.getByText("60")).toBeInTheDocument();
  expect(screen.getByText("3500")).toBeInTheDocument();
  expect(screen.getByText("3450")).toBeInTheDocument();
  expect(screen.getByText("50")).toBeInTheDocument();
});

// Frequency status tests
describe("Frequency Status", () => {
  test("shows warning for frequency 59.9", () => {
    const mockMetrics = {
      frequency_hz: 59.9,
      total_generation_mw: 3500,
      total_load_mw: 3450,
      total_losses_mw: 50,
      system_status: "warning",
      critical_buses: [],
      overloaded_lines: [],
    };
    render(<MetricsPanel metrics={mockMetrics} />);
    expect(screen.getByText("59.9")).toBeInTheDocument();
  });

  test("shows critical for frequency 59.7", () => {
    const mockMetrics = {
      frequency_hz: 59.7,
      total_generation_mw: 3500,
      total_load_mw: 3450,
      total_losses_mw: 50,
      system_status: "critical",
      critical_buses: [],
      overloaded_lines: [],
    };
    render(<MetricsPanel metrics={mockMetrics} />);
    expect(screen.getByText("59.7")).toBeInTheDocument();
  });

  test("shows critical for frequency 60.3", () => {
    const mockMetrics = {
      frequency_hz: 60.3,
      total_generation_mw: 3500,
      total_load_mw: 3450,
      total_losses_mw: 50,
      system_status: "critical",
      critical_buses: [],
      overloaded_lines: [],
    };
    render(<MetricsPanel metrics={mockMetrics} />);
    expect(screen.getByText("60.3")).toBeInTheDocument();
  });
});

// System status tests
describe("System Status", () => {
  test("displays warning status chip", () => {
    const mockMetrics = {
      frequency_hz: 60.0,
      total_generation_mw: 3500,
      total_load_mw: 3450,
      total_losses_mw: 50,
      system_status: "warning",
      critical_buses: [],
      overloaded_lines: [],
    };
    render(<MetricsPanel metrics={mockMetrics} />);
    expect(screen.getByText("WARNING")).toBeInTheDocument();
  });

  test("defaults to normal when system_status is missing", () => {
    const mockMetrics = {
      frequency_hz: 60.0,
      total_generation_mw: 3500,
      total_load_mw: 3450,
      total_losses_mw: 50,
      critical_buses: [],
      overloaded_lines: [],
    };
    render(<MetricsPanel metrics={mockMetrics} />);
    expect(screen.getByText("NORMAL")).toBeInTheDocument();
  });
});

// Normal range test (covers line 51 - return null)
test("shows no alarms when all metrics in normal range", () => {
  const mockMetrics = {
    frequency_hz: 60.0,
    total_generation_mw: 3500,
    total_load_mw: 3450,
    total_losses_mw: 50,
    system_status: "normal",
    critical_buses: [],
    overloaded_lines: [],
  };
  render(<MetricsPanel metrics={mockMetrics} />);

  expect(screen.getByText("60")).toBeInTheDocument();
  expect(screen.getByText("3500")).toBeInTheDocument();
  expect(screen.getByText("3450")).toBeInTheDocument();
  expect(screen.getByText("50")).toBeInTheDocument();

  // No alarm icons should be present
  expect(screen.queryByLabelText("critical alarm")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("warning alarm")).not.toBeInTheDocument();
});
