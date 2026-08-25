import DashboardApp from "../../components/dashboard/DashboardApp";

export const metadata = {
  title: "Aurakon",
};

/* Protected route entry point - a pure composition layer. The session
 * is bootstrapped inside DashboardApp (refresh-cookie recovery, then
 * profile / progress / habits); without a valid session it bounces
 * back to the sign-in screen. */
export default function DashboardPage() {
  return <DashboardApp />;
}
