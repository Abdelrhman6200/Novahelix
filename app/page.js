import { redirect } from "next/navigation";

// The sign-in page is the front door. Signed-in users are forwarded by /login.
export default function Home() {
  redirect("/login");
}
