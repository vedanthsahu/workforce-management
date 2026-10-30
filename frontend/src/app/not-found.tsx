import { ErrorScreen } from "@/components/layout/ErrorScreen";

// Shown for any URL that doesn't match a page, in place of Next.js's default 404.
export default function NotFound() {
  return (
    <ErrorScreen
      title="We couldn't find that page."
      description="The page you're looking for doesn't exist or may have moved. You can return to the home page."
    />
  );
}
