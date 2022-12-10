export default function log(
  header: string,
  color:
    | "red"
    | "green"
    | "orange"
    | "blue"
    | "magenta"
    | "cyan"
    | "gray"
    | "background-red"
    | "background-green"
    | "background-orange"
    | "background-blue"
    | "background-magenta"
    | "background-cyan"
    | "background-white",
  message?: string
) {
  switch (color) {
    case "gray":
      console.log("\x1b[30;1m%s\x1b[0m %s", header.padStart(10), message); // red
      break;
    case "red":
      console.log("\x1b[31;1m%s\x1b[0m %s", header.padStart(10), message); // red
      break;
    case "green":
      console.log("\x1b[32;1m%s\x1b[0m %s", header.padStart(10), message); // green
      break;
    case "orange":
      console.log("\x1b[33;1m%s\x1b[0m %s", header.padStart(10), message); // orange
      break;
    case "blue":
      console.log("\x1b[34;1m%s\x1b[0m %s", header.padStart(10), message); // blue
      break;
    case "magenta":
      console.log("\x1b[35;1m%s\x1b[0m %s", header.padStart(10), message); // magenta
      break;
    case "cyan":
      console.log("\x1b[36;1m%s\x1b[0m %s", header.padStart(10), message); // cyan
      break;
    case "background-red":
      console.log("\x1b[41m%s\x1b[0m %s", header.padStart(10), message); // red
      break;
    case "background-green":
      console.log("\x1b[42m%s\x1b[0m %s", header.padStart(10), message); // green
      break;
    case "background-orange":
      console.log("\x1b[43m%s\x1b[0m %s", header.padStart(10), message); // orange
      break;
    case "background-blue":
      console.log("\x1b[44m%s\x1b[0m %s", header.padStart(10), message); // blue
      break;
    case "background-magenta":
      console.log("\x1b[45m%s\x1b[0m %s", header.padStart(10), message); // magenta
      break;
    case "background-cyan":
      console.log("\x1b[46m%s\x1b[0m %s", header.padStart(10), message); // cyan
      break;
    case "background-white":
      console.log("\x1b[47m%s\x1b[0m %s", header.padStart(10), message); // cyan
      break;
    default:
      console.log("%s %s", header.padStart(10), message);
      break;
  }
}
