/**
 * durimealbot-server
 */

const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const { combine, timestamp, printf, colorize, simple } = winston.format;
const express = require('express');
const parser = require('./meal-paresr');

///
/// Logger
///
const logger = winston.createLogger({
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new winstonDaily({
            level: 'info',
            datePattern: 'YYYY-MM-DD',
            dirname: 'logs',
            filename: '%DATE%.log',
            maxFiles: 30,
            zippedArchive: true
        }),
        new winstonDaily({
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: 'logs',
            filename: '%DATE%.error.log',
            maxFiles: 30,
            zippedArchive: true
        })
    ]
})

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            simple(),
        )
    }));
}

///
/// API Body
///
const router = express.Router();
router.get('/today', async (req, res) => {
    const origin = req.get('origin');
    if (origin === undefined)
        logger.info(`Successful response`);
    else
        logger.info(`Successful response to ${origin}`);

    const mealData = await parser.fetchThisWeek();
    const currentWeekdayIdx = new Date().getDay(); // 0: Sunday ~ 6: Saturday
    if (1 <= currentWeekdayIdx <= 5) {
        res.json({
            error: false,
            data: mealData
        });   
    } else {
        res.json({
            error: "current_weekday_is_weekend",
            data: []
        });   
    }
    res.send();
});

const app = express();
app.use(router);
app.use((req, res, next) => {
    logger.error(`Invalid request: trying to access non-existant path '${req.url}'`);
    res.status(500).json({
        error: "invalid_request",
        data: []
    });
    res.send();
});
app.listen(8080, () => {
    logger.info("Starting durimealbot server @8080")
});