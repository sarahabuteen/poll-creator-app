import { redirect } from "next/navigation";

// No landing page or dashboard yet: start on the live results concept screen.
export default function Home() {
  redirect("/polls/pizza-night");
}
