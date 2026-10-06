import { register } from "./full-blast.js";
import { registerPneuma } from "./pneuma.js";

Hooks.once("init", () => {
  register();
  registerPneuma(); // no-op unless Pneuma's Combat Tools is active
});
