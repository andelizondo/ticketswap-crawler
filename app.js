'use strict';

// Requires
const co = require('co');
const request = require('co-request');
const cheerio = require('cheerio');
const _ = require('lodash');
const exec = require('child_process').exec;

// APP SETTINGS
const CHECK_INTERVAL = 2;
const FOUND_INTERVAL = 21;
const ROBOT_INTERVAL = 1212;
const ERROR_INTERVAL = 2121;
const URLMAX_TIMEOUT = 2112;
const HOST = 'https://www.ticketswap.nl';
//const EVENT_URL = '/event/fiesta-macumba/0f4bf5d9-a5b5-46b2-8f15-0942ef96d1e1';
const EVENT_URL = '/event/milkshake-festival-2017/sunday/68fc1cc6-6b98-4c4c-b828-2c7fa712c579/128371';
//const EVENT_URL = '/event/a-campingflight-to-lowlands-paradise/regular/fcc6c783-6b32-4abd-8fe6-e9d0369c14df/20635';

// APP VARIABLES
let sleepTime;
let soldListings;

// MAIN APP
let ticketCrawler = function () {
    return co(function* () {
        sleepTime = CHECK_INTERVAL;
        let result = yield buildRequest(HOST + EVENT_URL, 'GET');
        let $ = cheerio.load(result.body);

        let availableListings = $('.listings-item:not(.listings-item--not-for-sale) a');
        if (availableListings.length > 0) {
            print(`\n    ********************* Found ${availableListings.length} available listing(s)! *******************`);

            let linksFn = {};
            availableListings.each((index, listing) => {
                let fetchUrl = HOST + _.get(listing, 'attribs.href');
                if (fetchUrl.includes('listing'))
                    linksFn[fetchUrl] = fetchResult(fetchUrl);
            });

            let linksResults = yield linksFn;
            _.each(linksResults, function ($query, url) {
                let amount = $query('#listing-show-amount > option').length;
                if (parseInt(amount) > 0)
                    return botAction.availableTicket(url, amount);
                else
                    botAction.reservedTicket(url);
            });
        }
        else {
            let updatedSoldListings = $('.counter-sold .counter-value').text();
            if ($('#recaptcha').length > 0)
                botAction.robotCheck(HOST + EVENT_URL);
            else if (parseInt(updatedSoldListings) >= 0)
                botAction.noTickets(updatedSoldListings);
            else
                botAction.invalidURL(HOST + EVENT_URL);
        }
        // Using 'sleep' keeps the execution in one single instance.
        sleep(sleepTime);
    }).catch(ex => {
        print('Exception: ' + ex);
        sleep(sleepTime);
    });
};

// BOT FUNCTIONS
let botAction = {
    availableTicket: function (url, amount) {
        exec(`open ${url}`);
        sleepTime = FOUND_INTERVAL;
        print(`${amount} TICKET(S) AVAILABLE!: \n${url}`);
        return false; // STOPS 'EACH 'LOOP
    },
    reservedTicket: function (url) {
        print(`TICKET RESERVED: \n${url}`);
    },
    noTickets: function (updatedSoldListings) {
        if (soldListings && updatedSoldListings != soldListings)
            var newListings = `${updatedSoldListings - soldListings} Ticket(s) recently sold.`;
        print(`No new tickets found... ${updatedSoldListings} Sold. ${newListings || ''}`);
        soldListings = updatedSoldListings;
    },
    robotCheck: function (url) {
        sleepTime = ROBOT_INTERVAL;
        print(`Need to check captcha: \n${url}`);
    },
    invalidURL: function (url) {
        sleepTime = ERROR_INTERVAL;
        print(`Invalid URL: \n${url}`);
    },
};

// REQUEST FUNCTIONS
let cookieJar = request.jar();
let buildRequest = function (uri, method) {
    return request({
        uri: uri,
        method: method,
        jar: cookieJar,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36',
            'Cache-Control': 'max-age=0'
        },
        timeout: URLMAX_TIMEOUT
    });
};
let fetchResult = function (link) {
    return co(function *() {
        let result = yield buildRequest(link, 'GET');
        return cheerio.load(result.body);
    });
};

// EXECUTION FUNCTIONS
let sleep = function (seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000)).then(() => { ticketCrawler(); });
};
let print = function (toPrint) {
    console.log(`${new Date(Date.now()).toLocaleTimeString()}> ${toPrint}`);
};

// INITIALIZE
print(`\n
    ************************************************************************
    Welcome to TicketSwap crawler!
    Searching for tickets for: ${EVENT_URL.split('/')[2].replace(/-/g, ' ').toUpperCase()}
    ************************************************************************\n`);
ticketCrawler();
