import { render, screen } from "@testing-library/react";
import MetricCard from "../MetricCard";

describe("MetricCard Component", () => {
  // Basic Rendering Tests
  describe("Basic Rendering", () => {
    test("renders label correctly", () => {
      render(<MetricCard label="Frequency" value={49.8} unit="Hz" />);
      expect(screen.getByText("Frequency")).toBeInTheDocument();
    });

    test("renders value with unit", () => {
      render(<MetricCard label="Frequency" value={49.8} unit="Hz" />);
      expect(screen.getByText("49.8")).toBeInTheDocument();
      expect(screen.getByText("Hz")).toBeInTheDocument();
    });

    test("shows placeholder for null value", () => {
      render(<MetricCard label="Power" value={null} unit="MW" />);
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.getByText("MW")).toBeInTheDocument();
    });

    test("shows zero correctly (not placeholder)", () => {
      render(<MetricCard label="Power" value={0} unit="MW" />);
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });

    test("handles negative values", () => {
      render(<MetricCard label="Power Flow" value={-5.2} unit="MW" />);
      expect(screen.getByText("-5.2")).toBeInTheDocument();
    });

    test("handles large values", () => {
      render(<MetricCard label="Generation" value={1234.56} unit="MW" />);
      expect(screen.getByText("1234.56")).toBeInTheDocument();
    });
  });

  // Alarm Visual States
  describe("Alarm Visual States", () => {
    test("no alarm styling by default", () => {
      render(<MetricCard label="Frequency" value={49.8} unit="Hz" />);
      expect(screen.getByText("Frequency")).toBeInTheDocument();
      expect(screen.getByText("49.8")).toBeInTheDocument();
    });

    test("shows critical alarm styling with MUI icon", () => {
      render(
        <MetricCard
          label="City B Load"
          value={0}
          unit="MW"
          inAlarm={true}
          severity="critical"
        />,
      );
      expect(screen.getByLabelText("critical alarm")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    test("shows warning alarm styling with MUI icon", () => {
      render(
        <MetricCard
          label="Bus Voltage"
          value={135.2}
          unit="kV"
          inAlarm={true}
          severity="warning"
        />,
      );
      expect(screen.getByLabelText("warning alarm")).toBeInTheDocument();
      expect(screen.getByText("135.2")).toBeInTheDocument();
    });

    test("shows advisory alarm styling with MUI icon", () => {
      render(
        <MetricCard
          label="System Health"
          value={99.5}
          unit="%"
          inAlarm={true}
          severity="advisory"
        />,
      );
      expect(screen.getByLabelText("advisory alarm")).toBeInTheDocument();
      expect(screen.getByText("99.5")).toBeInTheDocument();
    });

    test("alarm icon has correct aria-label for advisory", () => {
      render(
        <MetricCard
          label="Test"
          value={100}
          unit="Hz"
          inAlarm={true}
          severity="advisory"
        />,
      );
      const alarmIcon = screen.getByLabelText("advisory alarm");
      expect(alarmIcon).toBeInTheDocument();
    });
  });

  // Edge Cases
  describe("Edge Cases", () => {
    test("shows null value with alarm styling when in alarm", () => {
      render(
        <MetricCard
          label="Sensor"
          value={null}
          unit="PSI"
          inAlarm={true}
          severity="warning"
        />,
      );
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.getByLabelText("warning alarm")).toBeInTheDocument();
    });

    test("defaults to critical when inAlarm true but no severity provided", () => {
      render(<MetricCard label="Test" value={100} unit="Hz" inAlarm={true} />);
      expect(screen.getByLabelText("critical alarm")).toBeInTheDocument();
    });

    test("handles empty string label gracefully", () => {
      render(<MetricCard label="" value={100} unit="Hz" />);
      expect(screen.getByText("100")).toBeInTheDocument();
    });
  });
});
