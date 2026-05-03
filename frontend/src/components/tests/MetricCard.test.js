import { render, screen } from "@testing-library/react";
import MetricCard from "../MetricCard";

test("renders without crashing", () => {
  render(<MetricCard label="Test" value={100} unit="Hz" />);
});

test("renders the label", () => {
  render(<MetricCard label="Frequency" value={49.8} unit="Hz" />);
  const labelElement = screen.getByText("Frequency");
  expect(labelElement).toBeInTheDocument();
});

test("renders the value", () => {
  render(<MetricCard label="Frequency" value={49.8} unit="Hz" />);
  const valueElement = screen.getByText("49.8");
  expect(valueElement).toBeInTheDocument();
});

test("renders the unit", () => {
  render(<MetricCard label="Frequency" value={49.8} unit="Hz" />);
  const unitElement = screen.getByText("Hz");
  expect(unitElement).toBeInTheDocument();
});
