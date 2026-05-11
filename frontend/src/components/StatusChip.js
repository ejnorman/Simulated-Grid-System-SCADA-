/**
 * StatusChip — displays system or component status as a colorful badge.
 *
 * Props:
 *   status — string: "normal" | "advisory" | "warning" | "critical"
 *            defaults to "normal" for invalid or missing values
 *
 * Visual Mapping:
 *   normal   → green success chip with checkmark icon
 *   advisory → blue info chip with info icon
 *   warning  → yellow/orange warning chip with warning icon
 *   critical → red error chip with error icon
 *   invalid  → "INVALID" label with normal styling
 *
 * See docs/reference/frontend/src/components/StatusChip.js for a reference implementation.
 */

import { Chip } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const STATUS_MAP = {
  normal: {
    color: "success",
    icon: <CheckCircleOutlineIcon fontSize="small" />,
  },
  advisory: { color: "info", icon: <InfoOutlinedIcon fontSize="small" /> },
  warning: { color: "warning", icon: <WarningAmberIcon fontSize="small" /> },
  critical: { color: "error", icon: <ErrorOutlineIcon fontSize="small" /> },
};

export default function StatusChip({ status }) {
  const { color, icon } = STATUS_MAP[status] ?? STATUS_MAP.normal;
  return (
    <Chip
      label={status?.toUpperCase() ?? "UNKNOWN"}
      color={color}
      icon={icon}
      size="small"
    />
  );
}
