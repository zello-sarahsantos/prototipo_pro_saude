import { createFileRoute } from "@tanstack/react-router";
import { ServidorLayout } from "@/components/ServidorLayout";

export const Route = createFileRoute("/servidor")({
  component: ServidorLayout,
});
