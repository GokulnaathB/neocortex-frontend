import { Show } from "@clerk/nextjs";
import Main from "./components/main";
import LandingPage from "./components/landing-page";

export default function Home() {
  return (
    <div>
      <Show when="signed-in">
        <Main />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </div>
  );
}
