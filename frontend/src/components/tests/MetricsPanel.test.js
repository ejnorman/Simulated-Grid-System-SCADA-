import { render, screen } from "@testing-library/react";
import MetricsPanel from "../MetricsPanel";

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
