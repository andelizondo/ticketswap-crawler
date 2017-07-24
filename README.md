# Ticketswap-Crawler
ORIGINAL CREDITS TO: ducdigital

Do you want to go to an amazing festival but the tickets are sold out?
Are you tired to check TicketSwap every minute (or even every few seconds) for a new ticket?

The TicketSwap Crawler does exactly this for you (and it never gets tired)!

This smart bot opens your default browser window as soon as there is a new ticket available!

Note: The bot only opens the page with the available ticket, and you have to reserve the ticket yourself!
...or get a macro player such as 'Keyboard Maestro' and execute this little javascript code when the browser get activated... 

$('.btn-buy:not(loading)')[0].click();

# How to use

- Install node.js
- Get the required modules/packages.
- Run `node app.js`
- Optional: Set up a macro to reserve the ticket.
- Enjoy your event!

# Settings:

The most important change from the original script, is that this bot runs only one instance at the time, in order to avoid multiple calls and avoid to get captcha check. (My personal testing found that checking 2 every seconds works fine, less than that makes it more probable to get banned).

* Times are in seconds

- CHECK_INTERVAL: Time used to check for new tickets.
- FOUND_INTERVAL: Little pause when a ticket is found (to give time to the macro to reserve the ticket).
- ROBOT_INTERVAL: Time to sleep/wait when captcha is needed (as it gets disabled after a while).
- ERROR_INTERVAL: Time to sleep/wait when there's an error.
- URLMAX_TIMEOUT: Max time used for the request (in order to avoid pending/stuck requests).
- HOST: ie. 'https://www.ticketswap.nl' you can change this for .com, .de, etc.
- EVENT_URL = You can get this URL from the event page that you want to look for. 

# Contribution:

First of all thank the original author: 'ducdigital'

Improve the code as you want!

SHARE!
