// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

export default function Client() {
  mount(() => <StartClient />, document.getElementById("app")!);
}
