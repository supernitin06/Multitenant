const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const env = process.env.NODE_ENV || "development";
const currentLevel = process.env.LOG_LEVEL || (env === "production" ? "info" : "debug");

function shouldLog(level) {
	return levels[level] <= levels[currentLevel];
}

function format(level, message, meta) {
	const ts = new Date().toISOString();
	let out = `${ts} [${level.toUpperCase()}] ${message}`;
	if (meta !== undefined) {
		try {
			out += " " + (typeof meta === "string" ? meta : JSON.stringify(meta));
		} catch (e) {
			out += " [meta-serialize-error]";
		}
	}
	return out;
}

const logger = {
	info: (msg, meta) => {
		if (shouldLog("info")) console.log(format("info", msg, meta));
	},
	warn: (msg, meta) => {
		if (shouldLog("warn")) console.warn(format("warn", msg, meta));
	},
	debug: (msg, meta) => {
		if (shouldLog("debug")) console.debug(format("debug", msg, meta));
	},
	error: (msg, meta) => {
		if (shouldLog("error")) console.error(format("error", msg, meta));
	},
	child: (label) => ({
		info: (m, meta) => logger.info(`${label} ${m}`, meta),
		warn: (m, meta) => logger.warn(`${label} ${m}`, meta),
		debug: (m, meta) => logger.debug(`${label} ${m}`, meta),
		error: (m, meta) => logger.error(`${label} ${m}`, meta),
	}),
};

export default logger;

