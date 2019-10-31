'use strict';

// Requires
const co = require('co');
const request = require('co-request');
const cheerio = require('cheerio');
const _ = require('lodash');
const exec = require('child_process').exec;
const clc = require('cli-color');

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

const TRANSLATION_DEFAULTS = {
    sold: 'Sold',
    soldOut: 'Currently no tickets available',
    available: 'Available',
    ticket: '1 ticket',
    tickets: '{{count}} tickets',
    reserved: 'reserved'
};

// APP VARIABLES
let sleepTime;
let soldListings;

// MAIN APP
const ticketCrawler = () => {
    return co(function* () {
        sleepTime = CHECK_INTERVAL;
        const result = yield buildRequest(HOST + EVENT_URL, 'GET');
        const $ = cheerio.load(result.body);

        const translations = getTranslations($);
        let availableListings = [];

        if ($('[data-testid="available-h2"]').length > 0) {
            availableListings = $('#tickets div:first-of-type ul a')
        }
      
        if (availableListings.length > 0) {
            const ammountTranslation = availableListings.length > 1 ? translations.tickets.replace('{{count}}', availableListings.length) : translations.ticket;

            print(clc.green.bold(`\n    ********************* ${ammountTranslation} ${translations.available}! *******************`.toUpperCase()));

            const linksFn = {};

            availableListings.each((index, listing) => {
                const fetchUrl = HOST + _.get(listing, 'attribs.href');

                if (fetchUrl.includes('listing')) {
                    linksFn[fetchUrl] = fetchResult(fetchUrl);
                }
            });

            const linksResults = yield linksFn;

            _.each(linksResults, ($query, url) => {
                const amount = $query('#ticket-dropdown > option').length;
                const ammountTranslation = amount > 1 ? translations.tickets.replace('{{count}}', amount) : translations.ticket;

                if (parseInt(amount) > 0) {
                    botAction.availableTicket(url, ammountTranslation, translations.available);
                } else {
                    botAction.reservedTicket(url, translations.ticket, translations.reserved);
                }
            });
        }
        else {
            const updatedSoldListings = $(`span:contains(${translations.sold})`).prev('h2').text();

            if ($('#recaptcha').length > 0) {
                botAction.robotCheck(HOST + EVENT_URL);
            } else if (parseInt(updatedSoldListings) >= 0) {
                botAction.noTickets(updatedSoldListings, translations.sold, translations.soldOut, translations.tickets, translations.ticket);
            } else {
                botAction.invalidURL(HOST + EVENT_URL);
            }
        }
        // Using 'sleep' keeps the execution in one single instance.
        sleep(sleepTime);
    }).catch(ex => {
        print('Exception: ' + ex);
        sleep(sleepTime);
    });
};

// BOT FUNCTIONS
const botAction = {
    availableTicket: (url, ammountTranslation, availableTranslation) => {
        exec(`open ${url}`);
        sleepTime = FOUND_INTERVAL;

        const msg = `${ammountTranslation} ${availableTranslation}!:`.toUpperCase();

        print(clc.green(`${msg} \n${url}`));
        return false; // STOPS 'EACH 'LOOP
    },
    reservedTicket: (url, ticketTranslation, reservedTranslation) => {
        const msg = `${ticketTranslation} ${reservedTranslation}:`.toUpperCase();

        print(clc.yellow(`${msg} \n${url}`));
    },
    noTickets: (updatedSoldListings, soldTranslation, soldOutTranslation, ticketsTranslation, ticketTranslation) => {
        let newListings = ''

        if (soldListings && updatedSoldListings !== soldListings) {
            const recentlySoldAmmount = updatedSoldListings - soldListings;
            const ammountTranslation = recentlySoldAmmount > 1 ? ticketsTranslation.replace('{{count}}', recentlySoldAmmount) : ticketTranslation;

            newListings = `${ammountTranslation} ${soldTranslation}`.toLowerCase();
        }
        print(clc.red(`${soldOutTranslation}... ${updatedSoldListings} ${soldTranslation.toLowerCase()}. ${newListings}`));
        soldListings = updatedSoldListings;
    },
    robotCheck: (url) => {
        sleepTime = ROBOT_INTERVAL;
        print(`Need to check captcha: \n${url}`);
    },
    invalidURL: (url) => {
        sleepTime = ERROR_INTERVAL;
        print(`Invalid URL: \n${url}`);
    },
};

// REQUEST FUNCTIONS
const cookieJar = request.jar();

const buildRequest = (uri, method) => {
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

const fetchResult = (link) => {
    return co(function *() {
        const result = yield buildRequest(link, 'GET');
        return cheerio.load(result.body);
    });
};

// EXECUTION FUNCTIONS
const sleep = (seconds) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000)).then(() => { ticketCrawler(); });
};

const print = (toPrint) => {
    console.log(`${new Date(Date.now()).toLocaleTimeString()} - ${toPrint}`);
};
 
const getTranslations = ($) => {
    const settings = JSON.parse($('#__NEXT_DATA__').html());

    if (!_.get(settings, 'props')) {
        return TRANSLATION_DEFAULTS;
    }

    const language = settings.props.initialLanguage;
    const { event, common} = settings.props.initialI18nStore[language];

    const translations = {
        sold: event.listings.sold,
        soldOut: event.listings.soldOut.title,
        available: event.listings.available,
        ticket: common.tickets.amount,
        tickets: common.tickets.amount_plural,
        reserved: event.listings.reserved
    }

    return { ...TRANSLATION_DEFAULTS, ...translations };
}

// INITIALIZE
print(
    clc.cyan(`\n
    ************************************************************************
    Welcome to TicketSwap crawler!
    Searching for tickets for: ${EVENT_URL.split('/')[2].replace(/-/g, ' ').toUpperCase()}
    ************************************************************************\n`)
    );
ticketCrawler();
