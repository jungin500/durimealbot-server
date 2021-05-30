/**
 * durimealbot-server
 */

const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const { combine, timestamp, printf, colorize, simple } = winston.format;
const express = require('express');
const parser = require('./meal-paresr');
const { val } = require('cheerio/lib/api/attributes');

const debug_flag = true;

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
const weekDayEnum = ['월', '화', '수', '목', '금'];

async function handler(req, res, next) {
    const origin = req.get('origin');
    if (origin === undefined)
        logger.info(`Successful response`);
    else
        logger.info(`Successful response to ${origin}`);

    const mealData = await parser.fetchThisWeek();
    // const currentWeekdayIdx = new Date().getDay(); // 0: Sunday ~ 6: Saturday
    currentWeekdayIdx = 3;
    
    if (debug_flag || 1 <= currentWeekdayIdx <= 5) {
        const weekdayIdx = currentWeekdayIdx - 1;
        const currentWeekdayMeal = mealData[weekdayIdx].menulist;
        const weekdayString = weekDayEnum[weekdayIdx]

        const descriptionInfo = [];
        const richMealInfo = [];
        for(const val of currentWeekdayMeal) {
            if (val.startsWith('(') && val.endsWith(')') ||
                val.startsWith('[') && val.endsWith(']') ||
                val.startsWith('<') && val.endsWith('>')) {
                descriptionInfo.push(val.replace(/\(|\[|<|\)|\]|>/ig, ''));
                continue;
            }
                
            const thumbnailUrl = await parser.fetchThumbnail(val);
            richMealInfo.push({
                title: val,
                // description: '맛있는 반찬',
                imageUrl: thumbnailUrl? thumbnailUrl : undefined,
                link: { web: parser.BASE_URL }
            });
        }

        return res.json({
            version: '2.0',
            template: {
                outputs: [{
                    listCard: {
                        header: { title: `${weekdayString}요일의 식단입니다.` + (descriptionInfo? ' (' + descriptionInfo.join(', ') + ')' : '') },
                        items: richMealInfo,
                        buttons: [{
                            label: '이번주 식단 전체보기',
                            action: 'webLink',
                            webLinkUrl: parser.BASE_URL
                        }]
                    }
                }]
            }
        });
    }
    return res.json({
        version: '2.0',
        template: {
            outputs: [{
                simpleText: {
                    'text': '주말에는 식단을 확인할 수 없어요.\n월요일 이후에 식단을 확인해주세요!'
                }
            }]
        }
    });
}

const router = express.Router();
router.post('/getTodayMeal', handler);

const app = express();
app.use(router);
app.use((req, res, next) => {
    logger.error(`Invalid request: trying to access non-existant path '${req.url}'`);
    return res.status(500).json({
        error: "invalid_request",
        data: []
    });
});

const listen_port = process.env.PORT || 8080;
app.listen(listen_port, () => {
    logger.info(`Starting durimealbot server @${listen_port}`)
});