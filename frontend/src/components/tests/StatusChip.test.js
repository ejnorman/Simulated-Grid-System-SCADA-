import { render, screen } from "@testing-library/react";
import StatusChip from "../StatusChip";

describe("StatusChip Component", () => {
  test("renders normal status correctly", () => {
    render(<StatusChip status="normal" />);
    expect(screen.getByText("NORMAL")).toBeInTheDocument();
  });

  test("renders advisory status correctly", () => {
    render(<StatusChip status="advisory" />);
    expect(screen.getByText("ADVISORY")).toBeInTheDocument();
  });

  test("renders warning status correctly", () => {
    render(<StatusChip status="warning" />);
    expect(screen.getByText("WARNING")).toBeInTheDocument();
  });

  test("renders critical status correctly", () => {
    render(<StatusChip status="critical" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  test("shows the status value as uppercase for any string", () => {
    render(<StatusChip status="invalid" />);
    expect(screen.getByText("INVALID")).toBeInTheDocument();
  });

  test("shows UNKNOWN when status is undefined", () => {
    render(<StatusChip status={undefined} />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });

  test("shows UNKNOWN when status is null", () => {
    render(<StatusChip status={null} />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });
});
