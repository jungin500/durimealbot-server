const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite')
const moment = require('moment');

const BASE_URL = 'http://www.knucoop.or.kr/weekly_menu_02.asp';

async function _fetchData(baseUrl) {
    // return (await axios.request(baseUrl)).data;
    const body = (await axios.request(baseUrl, { responseEncoding: 'binary' })).data;
    return iconv.decode(body, 'euc-kr');
}

function _parseData(rawData) {
    const $ = cheerio.load(rawData);
    const delimeter_td = $('*').filter((idx, node) => 
        node.children[0] && node.children[0].data &&
        node.children[0].data.trim().toLowerCase() === '구분/날짜'
    );
    
    // Assert data
    if (delimeter_td.length !== 1)
        throw Error('INVDATA');

    var tableBodyNode = delimeter_td.parent();
    while (tableBodyNode[0].name != 'tbody' && tableBodyNode.length !== 0)
         tableBodyNode = tableBodyNode.parent();

    // Assert Body
    if (tableBodyNode.length == 0)
        throw Error('INVTABL');

    const textMapper = (idx, node) => {
        const itemList = [];
        for(paragraph_node of node.children) {
            if (!paragraph_node.children) continue;

            const text_node = paragraph_node.children[0];
            itemList.push(text_node.data.trim());
        }
        return itemList;
    }

    const beginDateStr = $(`tr:nth-child(1) > td:nth-child(2) > div > strong`, tableBodyNode)[0].children[0].data.trim();
    const regexMatchDateStr = beginDateStr.match('([0-9])+-([0-9])+')[0].split('-').map(item => parseInt(item));

    const beginDate = new Date();
    beginDate.setMonth(regexMatchDateStr[0] - 1);
    beginDate.setDate(regexMatchDateStr[1]);
    beginDate.setHours(0, 0, 0, 0);

    const beginMoment = moment(beginDate);
    // const endDate = moment(beginDate).add(6, 'days');

    // Table 3 to 7 is appropriate for now...
    const menuListPerWeekday = [];
    for (var i = 3; i <= 7; i++)
    {
        const weekdayItems = $(`tr:nth-child(4) > td:nth-child(${i})`, tableBodyNode).map(textMapper).toArray();
        // Assert Table Contents
        if (weekdayItems.length == 0)
            throw Error('IVDTBCT');
        
        menuListPerWeekday.push({
            date: moment(beginMoment).add(i - 3, 'days').format('YYYY-MM-DD'),
            menulist: weekdayItems
        });
    }

    return menuListPerWeekday;
}

async function fetchThisWeek() {
    const rawData = await _fetchData(BASE_URL);
    const parsedData = _parseData(rawData);
    return parsedData;
}

module.exports = {
    fetchThisWeek: fetchThisWeek
}