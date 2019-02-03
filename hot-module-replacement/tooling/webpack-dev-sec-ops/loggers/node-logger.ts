export class Logger {

    private static COLOR_OPENINGS = {
        bold: "\u001b[1m",
        yellow: "\u001b[1m\u001b[33m",
        red: "\u001b[1m\u001b[31m",
        green: "\u001b[1m\u001b[32m",
        cyan: "\u001b[1m\u001b[36m",
        magenta: "\u001b[1m\u001b[35m"
    };
    private static COLOR_ENDING = "\u001b[39m\u001b[22m";

    private static logWithColor(message: string, colorOpening: string) {
        this.log(colorOpening + message + this.COLOR_ENDING);
    }

    public static bold(message: string) { this.logWithColor(message, this.COLOR_OPENINGS.bold); }
    public static yellow(message: string) { this.logWithColor(message, this.COLOR_OPENINGS.yellow); }
    public static red(message: string) { this.logWithColor(message, this.COLOR_OPENINGS.red); }
    public static green(message: string) { this.logWithColor(message, this.COLOR_OPENINGS.green); }
    public static cyan(message: string) { this.logWithColor(message, this.COLOR_OPENINGS.cyan); }
    public static magenta(message: string) { this.logWithColor(message, this.COLOR_OPENINGS.magenta); }

    public static log(message: string) {
        console.log(message);
    }

}